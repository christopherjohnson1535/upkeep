import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { Dialog, Field, FormError } from './components/Dialog'
import { Turnstile } from './components/Turnstile'

interface Props {
  onSignedIn: (recoveryCode?: string) => void
}

// What a subscribed calendar ends up looking like. Two groups, two calendars.
const SAMPLE = [
  { day: 'Tue', date: 'Nov 3', name: 'Change oil', calendar: 'Civic', color: 'var(--color-cal-b)' },
  { day: 'Sat', date: 'Nov 14', name: 'Replace HVAC filter', calendar: 'Elm St house', color: 'var(--color-cal-a)' },
  { day: 'Fri', date: 'Nov 20', name: 'Test smoke and CO detectors', calendar: 'Elm St house', color: 'var(--color-cal-a)' },
  { day: 'Sat', date: 'Nov 28', name: 'Flush water heater', calendar: 'Elm St house', color: 'var(--color-cal-a)' },
]

export function Landing({ onSignedIn }: Props) {
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [turnstile, setTurnstile] = useState<string | null>(null)
  const [busy, setBusy] = useState<'up' | 'in' | null>(null)
  const [error, setError] = useState('')
  const [recovering, setRecovering] = useState(false)
  const supported = browserSupportsWebAuthn()
  const onToken = useCallback((token: string | null) => setTurnstile(token), [])

  useEffect(() => {
    api.config().then((c) => setSiteKey(c.turnstileSiteKey), () => {})
  }, [])

  async function run(kind: 'up' | 'in') {
    setBusy(kind)
    setError('')
    try {
      if (kind === 'up') onSignedIn((await api.signUp(turnstile)).recoveryCode)
      else {
        await api.signIn()
        onSignedIn()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const waitingForCheck = siteKey != null && !turnstile

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-5">
        <h1 className="max-w-lg text-[34px] leading-[1.08] font-medium tracking-[-0.035em] text-balance sm:text-[46px]">
          Home and car upkeep that lives in your calendar.
        </h1>
        <p className="max-w-md text-[17px] text-pretty text-muted">
          List the jobs that come around every few months, like furnace filters, gutters and oil changes. upkeep turns
          them into a calendar you subscribe to once, and the reminders take care of themselves.
        </p>

        {supported ? (
          <div className="flex flex-col items-start gap-3 pt-2">
            {siteKey && <Turnstile siteKey={siteKey} onToken={onToken} />}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => run('up')} disabled={busy != null || waitingForCheck} className="button-primary">
                {busy === 'up' ? 'Waiting for your passkey…' : 'Create account'}
              </button>
              <button onClick={() => run('in')} disabled={busy != null} className="button-secondary">
                {busy === 'in' ? 'Waiting for your passkey…' : 'Sign in'}
              </button>
            </div>
            <FormError message={error} />
          </div>
        ) : (
          <p className="rounded-xl border border-rule bg-card p-4 text-pretty">
            This browser can't use passkeys, which upkeep uses instead of passwords. Try Safari, Chrome or Edge on a
            recent phone or computer.
          </p>
        )}
      </section>

      <figure className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border border-rule bg-card">
          {SAMPLE.map((e, i) => (
            <motion.div
              key={e.name}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0 sm:px-5"
            >
              <span className="w-14 shrink-0 text-sm leading-tight nums">
                <span className="block text-faint">{e.day}</span>
                <span className="block font-medium">{e.date}</span>
              </span>
              <span className="w-1 self-stretch rounded-full" style={{ background: e.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{e.name}</span>
                <span className="block text-[13px] text-muted">All day, {e.calendar}</span>
              </span>
            </motion.div>
          ))}
        </div>
        <figcaption className="text-[13px] text-faint">
          How it looks in your calendar app, with a house and a car as separate calendars.
        </figcaption>
      </figure>

      <section className="flex flex-col gap-4" aria-label="How it works">
        <h2 className="font-medium">How it works</h2>
        <ol className="flex flex-col gap-3 text-pretty text-muted">
          <li className="flex gap-3">
            <span className="w-4 shrink-0 text-ink nums">1</span>Make a group for each house or car.
          </li>
          <li className="flex gap-3">
            <span className="w-4 shrink-0 text-ink nums">2</span>Add its tasks, or pick from common ones, with the next
            date for each.
          </li>
          <li className="flex gap-3">
            <span className="w-4 shrink-0 text-ink nums">3</span>Subscribe from Apple or Google Calendar. When you move,
            copy the group and archive the old one.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-2 border-t border-rule pt-6 text-[13px] text-pretty text-muted">
        <p>
          There's no email or password. Your account is a passkey on your phone or computer, kept in sync by iCloud
          Keychain or Google Password Manager. upkeep stores your groups, your tasks and your passkey's public key, and
          nothing else. No tracking, no ads.
        </p>
        <button
          type="button"
          onClick={() => setRecovering(true)}
          className="self-start rounded text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          Lost your passkey? Use a recovery code
        </button>
      </section>

      <RecoverDialog open={recovering} onClose={() => setRecovering(false)} onDone={() => onSignedIn()} />
    </div>
  )
}

function RecoverDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  return (
    <Dialog
      open={open}
      title="Use a recovery code"
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        try {
          await api.recover(code)
          onClose()
          onDone()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'That code did not work.')
        }
      }}
    >
      <Field label="Recovery code" htmlFor="r-code">
        <input
          id="r-code"
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-EFGH-JKMN-PQRS"
          className="tracking-wider uppercase nums"
        />
      </Field>
      <p className="-mt-2 text-sm text-pretty text-muted">
        After you're in, add a new passkey from Account. The code stops working once it's used.
      </p>
      <FormError message={error} />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="button-primary">
          Sign in
        </button>
        <button type="button" onClick={onClose} className="button-quiet">
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
