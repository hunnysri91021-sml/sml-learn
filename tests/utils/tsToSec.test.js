import { describe, it, expect } from 'vitest'
import { tsToSec } from '../../src/utils.js'

describe('tsToSec', () => {
  it('returns 0 for null', () => expect(tsToSec(null)).toBe(0))
  it('returns 0 for undefined', () => expect(tsToSec(undefined)).toBe(0))
  it('returns 0 for empty string', () => expect(tsToSec('')).toBe(0))
  it('returns 0 for "00:00"', () => expect(tsToSec('00:00')).toBe(0))
  it('converts "00:45" → 45', () => expect(tsToSec('00:45')).toBe(45))
  it('converts "01:00" → 60', () => expect(tsToSec('01:00')).toBe(60))
  it('converts "01:30" → 90', () => expect(tsToSec('01:30')).toBe(90))
  it('converts "10:00" → 600', () => expect(tsToSec('10:00')).toBe(600))
  it('converts "59:59" → 3599', () => expect(tsToSec('59:59')).toBe(3599))
  it('handles plain number string "90" → 90', () => expect(tsToSec('90')).toBe(90))
  it('handles plain number string "0" → 0', () => expect(tsToSec('0')).toBe(0))
})
