import { describe, it, expect } from 'vitest'
import { getHiddenNavIds } from '../../src/utils.js'

describe('getHiddenNavIds — Viewer', () => {
  it('hides nav-courses', () => expect(getHiddenNavIds('Viewer')).toContain('nav-courses'))
  it('hides nav-quiz', () => expect(getHiddenNavIds('Viewer')).toContain('nav-quiz'))
  it('hides nav-export', () => expect(getHiddenNavIds('Viewer')).toContain('nav-export'))
  it('hides nav-import-courses', () => expect(getHiddenNavIds('Viewer')).toContain('nav-import-courses'))
  it('does NOT hide nav-settings', () => expect(getHiddenNavIds('Viewer')).not.toContain('nav-settings'))
  it('hides exactly 4 items', () => expect(getHiddenNavIds('Viewer')).toHaveLength(4))
})

describe('getHiddenNavIds — Dept Admin', () => {
  it('hides nav-settings', () => expect(getHiddenNavIds('Dept Admin')).toContain('nav-settings'))
  it('hides nav-import-courses', () => expect(getHiddenNavIds('Dept Admin')).toContain('nav-import-courses'))
  it('does NOT hide nav-courses', () => expect(getHiddenNavIds('Dept Admin')).not.toContain('nav-courses'))
  it('does NOT hide nav-quiz', () => expect(getHiddenNavIds('Dept Admin')).not.toContain('nav-quiz'))
  it('does NOT hide nav-export', () => expect(getHiddenNavIds('Dept Admin')).not.toContain('nav-export'))
  it('hides exactly 2 items', () => expect(getHiddenNavIds('Dept Admin')).toHaveLength(2))
})

describe('getHiddenNavIds — full-access roles', () => {
  it('Super Admin sees everything', () => expect(getHiddenNavIds('Super Admin')).toEqual([]))
  it('HR Admin sees everything', () => expect(getHiddenNavIds('HR Admin')).toEqual([]))
})

describe('getHiddenNavIds — unknown role', () => {
  it('returns empty array for an unrecognised role', () => {
    expect(getHiddenNavIds('Mystery Role')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(getHiddenNavIds('')).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(getHiddenNavIds(undefined)).toEqual([])
  })
})
