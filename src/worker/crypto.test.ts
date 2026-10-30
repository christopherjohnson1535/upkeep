import { describe, expect, it } from 'vitest'
import { fromBase64Url, normalizeRecoveryCode, recoveryCode, toBase64Url } from './crypto'

describe('recoveryCode', () => {
  it('is four groups of four with no look-alike characters', () => {
    for (let i = 0; i < 50; i++) expect(recoveryCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/)
  })

  it('accepts the code however it was typed back', () => {
    expect(normalizeRecoveryCode(' abcd-efgh jkmn-pqrs ')).toBe('ABCDEFGHJKMNPQRS')
  })
})

describe('base64url', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1])
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes)
    expect(toBase64Url(bytes)).not.toMatch(/[+/=]/)
  })
})
