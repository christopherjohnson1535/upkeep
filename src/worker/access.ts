import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { MiddlewareHandler } from 'hono'

// Cloudflare Access already blocks anyone who isn't signed in. This checks the
// token it forwards too, so the workers.dev URL can't be used to go around it.

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

export const requireAccess: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: aud } = c.env
  if (!team || !aud) return next()

  const token = c.req.header('cf-access-jwt-assertion')
  if (!token) return c.text('Unauthorized', 401)

  jwks ??= createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`))
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud })
  } catch {
    return c.text('Unauthorized', 401)
  }
  return next()
}
