import { describe, it, expect } from 'vitest'
import { isModuleDone, isModuleUnlocked, computeCoursePct } from '../../src/utils.js'

const COURSE = {
  id: 'ORI-001',
  modules: [
    { id: 'm1', type: 'content' },
    { id: 'm2', type: 'content' },
    { id: 'm3', type: 'quiz' },
  ],
}

const USER = 'SML-001'
const OTHER_USER = 'SML-002'

const PROGRESS_NONE = {}
const PROGRESS_M1 = { [USER]: { 'ORI-001': { m1: { done: true } } } }
const PROGRESS_M1_M2 = { [USER]: { 'ORI-001': { m1: { done: true }, m2: { done: true } } } }
const PROGRESS_ALL = { [USER]: { 'ORI-001': { m1: { done: true }, m2: { done: true }, m3: { done: true } } } }

describe('isModuleDone', () => {
  it('returns false when no progress exists', () => {
    expect(isModuleDone('ORI-001', 'm1', PROGRESS_NONE, USER)).toBe(false)
  })

  it('returns true when the module is marked done', () => {
    expect(isModuleDone('ORI-001', 'm1', PROGRESS_M1, USER)).toBe(true)
  })

  it('returns false for a module not yet done', () => {
    expect(isModuleDone('ORI-001', 'm2', PROGRESS_M1, USER)).toBe(false)
  })

  it('returns false for a different user', () => {
    expect(isModuleDone('ORI-001', 'm1', PROGRESS_M1, OTHER_USER)).toBe(false)
  })

  it('returns false for a different course', () => {
    expect(isModuleDone('ISO-001', 'm1', PROGRESS_M1, USER)).toBe(false)
  })
})

describe('isModuleUnlocked', () => {
  it('always unlocks the first module (index 0)', () => {
    expect(isModuleUnlocked(COURSE, 0, PROGRESS_NONE, USER)).toBe(true)
  })

  it('locks the second module when the first is not done', () => {
    expect(isModuleUnlocked(COURSE, 1, PROGRESS_NONE, USER)).toBe(false)
  })

  it('unlocks the second module once the first is done', () => {
    expect(isModuleUnlocked(COURSE, 1, PROGRESS_M1, USER)).toBe(true)
  })

  it('locks the third module when the second is not done', () => {
    expect(isModuleUnlocked(COURSE, 2, PROGRESS_M1, USER)).toBe(false)
  })

  it('unlocks the third module once the second is done', () => {
    expect(isModuleUnlocked(COURSE, 2, PROGRESS_M1_M2, USER)).toBe(true)
  })
})

describe('computeCoursePct', () => {
  it('returns 0 with no progress', () => {
    expect(computeCoursePct(COURSE, PROGRESS_NONE, USER)).toBe(0)
  })

  it('returns 33 with 1 of 3 modules done', () => {
    expect(computeCoursePct(COURSE, PROGRESS_M1, USER)).toBe(33)
  })

  it('returns 67 with 2 of 3 modules done', () => {
    expect(computeCoursePct(COURSE, PROGRESS_M1_M2, USER)).toBe(67)
  })

  it('returns 100 with all modules done', () => {
    expect(computeCoursePct(COURSE, PROGRESS_ALL, USER)).toBe(100)
  })

  it('returns 0 for a course with no modules (no divide-by-zero)', () => {
    const empty = { id: 'EMPTY', modules: [] }
    expect(computeCoursePct(empty, PROGRESS_NONE, USER)).toBe(0)
  })

  it('returns 0 for a different user on the same progress object', () => {
    expect(computeCoursePct(COURSE, PROGRESS_ALL, OTHER_USER)).toBe(0)
  })
})
