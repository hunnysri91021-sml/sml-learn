import { describe, it, expect } from 'vitest'
import { sessionIsExpired } from '../../src/utils.js'

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

describe('sessionIsExpired', () => {
  it('returns false for a freshly created session', () => {
    const now = Date.now()
    expect(sessionIsExpired(now - 1000, now)).toBe(false)
  })

  it('returns false for a session just under 8 hours old', () => {
    const now = Date.now()
    expect(sessionIsExpired(now - (EIGHT_HOURS_MS - 1), now)).toBe(false)
  })

  it('returns false when the session is exactly 8 hours old (boundary: > not >=)', () => {
    const now = Date.now()
    expect(sessionIsExpired(now - EIGHT_HOURS_MS, now)).toBe(false)
  })

  it('returns true for a session older than 8 hours', () => {
    const now = Date.now()
    expect(sessionIsExpired(now - (EIGHT_HOURS_MS + 60_000), now)).toBe(true)
  })

  it('returns true when loginTime is 0 (missing _loginTime field)', () => {
    expect(sessionIsExpired(0, Date.now())).toBe(true)
  })

  it('returns true when loginTime is undefined', () => {
    expect(sessionIsExpired(undefined, Date.now())).toBe(true)
  })

  it('returns true when loginTime is null', () => {
    expect(sessionIsExpired(null, Date.now())).toBe(true)
  })
})
