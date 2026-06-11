import { describe, it, expect } from 'vitest'
import { escH } from '../../src/utils.js'

describe('escH', () => {
  it('escapes &', () => expect(escH('a & b')).toBe('a &amp; b'))
  it('escapes <', () => expect(escH('<div>')).toBe('&lt;div&gt;'))
  it('escapes >', () => expect(escH('x > y')).toBe('x &gt; y'))
  it('escapes "', () => expect(escH('"quoted"')).toBe('&quot;quoted&quot;'))
  it('escapes all characters in a combined string', () => {
    expect(escH('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })
  it('returns empty string for null', () => expect(escH(null)).toBe(''))
  it('returns empty string for undefined', () => expect(escH(undefined)).toBe(''))
  it('returns empty string for empty input', () => expect(escH('')).toBe(''))
  it('leaves safe strings unchanged', () => expect(escH('Hello World')).toBe('Hello World'))
})
