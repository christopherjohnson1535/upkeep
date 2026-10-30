import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { Context, MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { fromBase64Url, normalizeRecoveryCode, randomBytes, randomToken, recoveryCode, sha256, toBase64Url } from './crypto'

export type AppEnv = { Bindings: Env; Variables: { userId: number } }

const SESSION_DAYS = 365
const SIGNUPS_PER_DAY = 500

const site = (c: Context) => {
  const url = new URL(c.req.url)
  return { rpID: url.hostname, origin: url.origin, secure: url.protocol === 'https:' }
}

const cookieOptions = (c: Context, maxAge: number) => ({
  httpOnly: true,
  secure: site(c).secure,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge,
})

// Sessions

async function startSession(c: Context<AppEnv>, userId: number) {
  const token = randomToken()
  await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`)
    .bind(await sha256(token), userId)
    .run()
  setCookie(c, 'session', token, cookieOptions(c, SESSION_DAYS * 86400))
}

export async function sessionUser(c: Context<AppEnv>) {
  const token = getCookie(c, 'session')
  if (!token) return null
  const row = await c.env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')`)
    .bind(await sha256(token))
    .first<{ user_id: number }>()
  return row?.user_id ?? null
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = await sessionUser(c)
  if (!userId) return c.json({ error: 'Sign in to continue.' }, 401)
  c.set('userId', userId)
  return next()
}

// Challenges live for five minutes and are used once.

async function saveChallenge(c: Context<AppEnv>, value: string) {
  const id = randomToken(16)
  await c.env.DB.prepare(`INSERT INTO challenges (id, value, expires_at) VALUES (?, ?, datetime('now', '+5 minutes'))`)
    .bind(id, value)
    .run()
  setCookie(c, 'challenge', id, cookieOptions(c, 300))
}

async function takeChallenge(c: Context<AppEnv>) {
  const id = getCookie(c, 'challenge')
  deleteCookie(c, 'challenge', { path: '/' })
  if (!id) return null
  const row = await c.env.DB.prepare(`DELETE FROM challenges WHERE id = ? AND expires_at > datetime('now') RETURNING value`)
    .bind(id)
    .first<{ value: string }>()
  return row?.value ?? null
}

async function newRecoveryCode(db: D1Database, userId: number) {
  const code = recoveryCode()
  await db.prepare('UPDATE users SET recovery_hash = ? WHERE id = ?').bind(await sha256(normalizeRecoveryCode(code)), userId).run()
  return code
}

// Turnstile is optional: with no secret configured, sign-up isn't checked.
async function humanCheck(c: Context<AppEnv>, token: unknown) {
  const secret = c.env.TURNSTILE_SECRET
  if (!secret) return true
  if (typeof token !== 'string' || !token) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  const result = (await res.json()) as { success: boolean }
  return result.success
}

interface PasskeyRow {
  id: string
  user_id: number
  public_key: string
  counter: number
  transports: string | null
  created_at: string
  last_used_at: string | null
}

const transportsOf = (row: { transports: string | null }) => (row.transports ? JSON.parse(row.transports) : undefined)

function registrationOptions(c: Context<AppEnv>, handle: string, created: string, exclude: PasskeyRow[]) {
  return generateRegistrationOptions({
    rpName: 'upkeep',
    rpID: site(c).rpID,
    userID: fromBase64Url(handle),
    userName: `upkeep (since ${created})`,
    userDisplayName: 'upkeep',
    attestationType: 'none',
    excludeCredentials: exclude.map((p) => ({ id: p.id, transports: transportsOf(p) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  })
}

async function verifyNewPasskey(c: Context<AppEnv>, response: any) {
  const challenge = await takeChallenge(c)
  if (!challenge || !response) return null
  try {
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: site(c).origin,
      expectedRPID: site(c).rpID,
    })
    return result.verified ? result.registrationInfo.credential : null
  } catch {
    return null
  }
}

async function savePasskey(db: D1Database, userId: number, credential: NonNullable<Awaited<ReturnType<typeof verifyNewPasskey>>>) {
  await db
    .prepare('INSERT INTO passkeys (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)')
    .bind(
      credential.id,
      userId,
      toBase64Url(credential.publicKey),
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null,
    )
    .run()
}

const today = () => new Date().toISOString().slice(0, 10)

export const auth = new Hono<AppEnv>()

auth.get('/me', async (c) => {
  const userId = await sessionUser(c)
  if (!userId) return c.json({ signedIn: false })
  const [passkeys, user] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT id, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at').bind(userId),
    c.env.DB.prepare('SELECT recovery_hash IS NOT NULL AS has_code FROM users WHERE id = ?').bind(userId),
  ])
  const rows = passkeys.results as { id: string; created_at: string; last_used_at: string | null }[]
  return c.json({
    signedIn: true,
    hasRecoveryCode: Boolean((user.results[0] as { has_code: number } | undefined)?.has_code),
    passkeys: rows.map((p) => ({ id: p.id, createdAt: p.created_at, lastUsedAt: p.last_used_at })),
  })
})

auth.post('/register/options', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!(await humanCheck(c, body?.turnstile))) return c.json({ error: 'The human check failed. Reload the page and try again.' }, 400)

  const signups = await c.env.DB.prepare(`SELECT count(*) AS n FROM users WHERE created_at > datetime('now', '-1 day')`).first<{ n: number }>()
  if ((signups?.n ?? 0) >= SIGNUPS_PER_DAY) return c.json({ error: 'Sign-ups are full for today. Try again tomorrow.' }, 429)

  const handle = toBase64Url(randomBytes(16))
  const options = await registrationOptions(c, handle, today(), [])
  await saveChallenge(c, options.challenge)
  return c.json({ options, handle })
})

auth.post('/register/verify', async (c) => {
  const body = await c.req.json().catch(() => null)
  const handle = typeof body?.handle === 'string' ? body.handle : ''
  const credential = await verifyNewPasskey(c, body?.response)
  if (!credential || !handle) return c.json({ error: "That passkey couldn't be set up. Try again." }, 400)

  const user = await c.env.DB.prepare('INSERT INTO users (handle) VALUES (?) RETURNING id').bind(handle).first<{ id: number }>()
  await savePasskey(c.env.DB, user!.id, credential)
  await startSession(c, user!.id)
  return c.json({ recoveryCode: await newRecoveryCode(c.env.DB, user!.id) }, 201)
})

auth.post('/login/options', async (c) => {
  const options = await generateAuthenticationOptions({ rpID: site(c).rpID, userVerification: 'preferred' })
  await saveChallenge(c, options.challenge)
  return c.json({ options })
})

auth.post('/login/verify', async (c) => {
  const body = await c.req.json().catch(() => null)
  const challenge = await takeChallenge(c)
  const id = body?.response?.id
  const failed = () => c.json({ error: "That passkey isn't linked to an account here." }, 400)
  if (!challenge || typeof id !== 'string') return failed()

  const passkey = await c.env.DB.prepare('SELECT * FROM passkeys WHERE id = ?').bind(id).first<PasskeyRow>()
  if (!passkey) return failed()

  try {
    const result = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: site(c).origin,
      expectedRPID: site(c).rpID,
      credential: {
        id: passkey.id,
        publicKey: fromBase64Url(passkey.public_key),
        counter: passkey.counter,
        transports: transportsOf(passkey),
      },
    })
    if (!result.verified) return failed()
    await c.env.DB.prepare(`UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?`)
      .bind(result.authenticationInfo.newCounter, passkey.id)
      .run()
  } catch {
    return failed()
  }

  await startSession(c, passkey.user_id)
  return c.json({ ok: true })
})

// A recovery code works once. After using it, the account page offers a new one.
auth.post('/recover', async (c) => {
  const body = await c.req.json().catch(() => null)
  const code = normalizeRecoveryCode(String(body?.code ?? ''))
  const user = code
    ? await c.env.DB.prepare('UPDATE users SET recovery_hash = NULL WHERE recovery_hash = ? RETURNING id')
        .bind(await sha256(code))
        .first<{ id: number }>()
    : null
  if (!user) return c.json({ error: "That recovery code doesn't match an account, or it was already used." }, 400)
  await startSession(c, user.id)
  return c.json({ ok: true })
})

auth.post('/logout', async (c) => {
  const token = getCookie(c, 'session')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run()
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

auth.post('/passkeys/options', requireUser, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT handle, created_at FROM users WHERE id = ?').bind(userId).first<{ handle: string; created_at: string }>()
  const { results } = await c.env.DB.prepare('SELECT * FROM passkeys WHERE user_id = ?').bind(userId).all<PasskeyRow>()
  const options = await registrationOptions(c, user!.handle, user!.created_at.slice(0, 10), results)
  await saveChallenge(c, options.challenge)
  return c.json({ options })
})

auth.post('/passkeys/verify', requireUser, async (c) => {
  const body = await c.req.json().catch(() => null)
  const credential = await verifyNewPasskey(c, body?.response)
  if (!credential) return c.json({ error: "That passkey couldn't be added. Try again." }, 400)
  await savePasskey(c.env.DB, c.get('userId'), credential)
  return c.json({ ok: true }, 201)
})

auth.delete('/passkeys/:id', requireUser, async (c) => {
  const userId = c.get('userId')
  const count = await c.env.DB.prepare('SELECT count(*) AS n FROM passkeys WHERE user_id = ?').bind(userId).first<{ n: number }>()
  if ((count?.n ?? 0) <= 1) return c.json({ error: "You can't remove your only passkey." }, 400)
  await c.env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run()
  return c.body(null, 204)
})

auth.post('/recovery-code', requireUser, async (c) => {
  return c.json({ recoveryCode: await newRecoveryCode(c.env.DB, c.get('userId')) })
})

export async function deleteAccount(c: Context<AppEnv>) {
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.get('userId')).run()
  deleteCookie(c, 'session', { path: '/' })
}
