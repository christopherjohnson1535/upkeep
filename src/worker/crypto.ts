export function randomBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

export function randomToken(bytes = 32) {
  return toBase64Url(randomBytes(bytes))
}

export function randomHex(bytes: number) {
  return [...randomBytes(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// No 0/O or 1/I/L, so a code read off paper can't be mistyped.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function recoveryCode() {
  const chars = [...randomBytes(16)].map((b) => ALPHABET[b % ALPHABET.length])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

export function normalizeRecoveryCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
