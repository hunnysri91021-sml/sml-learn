import { describe, it, expect } from 'vitest'
import { parseDL, dlDiffDays } from '../../src/utils.js'

// Fixed "today" so tests are not affected by the actual current date.
const TODAY = new Date('2026-06-11')

describe('parseDL — returns null for no-deadline values', () => {
  it('null input', () => expect(parseDL(null)).toBeNull())
  it('undefined input', () => expect(parseDL(undefined)).toBeNull())
  it('empty string', () => expect(parseDL('')).toBeNull())
  it('the string "undefined"', () => expect(parseDL('undefined')).toBeNull())
  it('"ไม่มีกำหนด"', () => expect(parseDL('ไม่มีกำหนด')).toBeNull())
})

describe('parseDL — ISO YYYY-MM-DD', () => {
  it('parses a valid ISO date', () => {
    const d = parseDL('2026-06-30')
    expect(d).toBeInstanceOf(Date)
    expect(isNaN(d)).toBe(false)
  })

  it('year/month/day are correct', () => {
    const d = parseDL('2026-06-30')
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(5)  // June → 0-based month 5
    expect(d.getUTCDate()).toBe(30)
  })
})

describe('parseDL — mm/dd/yyyy', () => {
  it('parses a valid mm/dd/yyyy date', () => {
    const d = parseDL('06/30/2026')
    expect(d).toBeInstanceOf(Date)
    expect(isNaN(d)).toBe(false)
  })

  it('year/month/day are correct', () => {
    const d = parseDL('06/30/2026')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(30)
  })
})

describe('parseDL — unrecognised formats', () => {
  it('Thai string "30 มิ.ย. 2569" returns null', () => {
    expect(parseDL('30 มิ.ย. 2569')).toBeNull()
  })

  it('plain year "2026" returns null', () => {
    expect(parseDL('2026')).toBeNull()
  })
})

describe('dlDiffDays', () => {
  it('returns null for "ไม่มีกำหนด"', () => {
    expect(dlDiffDays('ไม่มีกำหนด', TODAY)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(dlDiffDays('', TODAY)).toBeNull()
  })

  it('returns 7 for a deadline 7 days in the future', () => {
    expect(dlDiffDays('2026-06-18', TODAY)).toBe(7)
  })

  it('returns 1 for a deadline tomorrow', () => {
    expect(dlDiffDays('2026-06-12', TODAY)).toBe(1)
  })

  it('returns 0 for a deadline today', () => {
    expect(dlDiffDays('2026-06-11', TODAY)).toBe(0)
  })

  it('returns -7 for a deadline that passed 7 days ago', () => {
    expect(dlDiffDays('2026-06-04', TODAY)).toBe(-7)
  })
})
