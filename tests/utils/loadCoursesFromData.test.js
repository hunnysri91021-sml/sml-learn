import { describe, it, expect } from 'vitest'
import { loadCoursesFromData } from '../../src/utils.js'

const DEFAULTS = [
  {
    id: 'ORI-001', title: 'ปฐมนิเทศพนักงานใหม่', icon: 'ti-users', color: '#5C6BC0',
    hours: 3, dept: 'ทุกแผนก', deadline: '', pass: 80,
    modules: [
      { id: 'm1', type: 'content', slides: [{ title: 'Welcome', body: 'Hello', media: null }] },
      { id: 'm2', type: 'quiz', questions: [{ q: 'Q?', opts: ['A', 'B'], ans: 0 }] },
    ],
  },
  {
    id: 'OJT-PDI-001', title: 'OJT PDI', icon: 'ti-tool', color: '#5B3FC8',
    hours: 6, dept: 'ปฏิบัติการ PDI', deadline: '2026-06-30', pass: 80,
    modules: [{ id: 'm1', type: 'quiz', questions: [] }],
  },
]

describe('loadCoursesFromData — empty / null stored', () => {
  it('returns defaults when stored is null', () => {
    expect(loadCoursesFromData(null, DEFAULTS)).toEqual(DEFAULTS)
  })

  it('returns defaults when stored is an empty array', () => {
    expect(loadCoursesFromData([], DEFAULTS)).toEqual(DEFAULTS)
  })
})

describe('loadCoursesFromData — stored modules take priority', () => {
  it('uses stored modules when they are non-empty', () => {
    const customModules = [{ id: 'm1', type: 'quiz', questions: [{ q: 'Custom?', opts: ['X'], ans: 0 }] }]
    const stored = [{ ...DEFAULTS[0], modules: customModules }]
    const result = loadCoursesFromData(stored, DEFAULTS)
    expect(result[0].modules).toEqual(customModules)
  })
})

describe('loadCoursesFromData — fallback to default modules', () => {
  it('falls back to default modules when stored has none', () => {
    const stored = [{ id: 'ORI-001', title: 'ปฐมนิเทศ', modules: [] }]
    const result = loadCoursesFromData(stored, DEFAULTS)
    expect(result[0].modules).toEqual(DEFAULTS[0].modules)
  })
})

describe('loadCoursesFromData — placeholder for unknown courses', () => {
  it('creates a placeholder module for a course not in defaults with no stored modules', () => {
    const stored = [{ id: 'NEW-001', title: 'หลักสูตรใหม่', modules: [] }]
    const result = loadCoursesFromData(stored, DEFAULTS)
    expect(result[0].modules).toHaveLength(1)
    expect(result[0].modules[0].type).toBe('content')
    expect(result[0].modules[0].id).toBe('m1')
  })
})

describe('loadCoursesFromData — field merging', () => {
  it('uses stored title over default', () => {
    const stored = [{ id: 'ORI-001', title: 'Custom Title', modules: [] }]
    const result = loadCoursesFromData(stored, DEFAULTS)
    expect(result[0].title).toBe('Custom Title')
  })

  it('falls back to default icon when stored has none', () => {
    const stored = [{ id: 'ORI-001', title: 'T', modules: [] }]
    expect(loadCoursesFromData(stored, DEFAULTS)[0].icon).toBe('ti-users')
  })

  it('falls back to default color when stored has none', () => {
    const stored = [{ id: 'ORI-001', title: 'T', modules: [] }]
    expect(loadCoursesFromData(stored, DEFAULTS)[0].color).toBe('#5C6BC0')
  })

  it('falls back to default pass score when stored has none', () => {
    const stored = [{ id: 'ORI-001', title: 'T', modules: [] }]
    expect(loadCoursesFromData(stored, DEFAULTS)[0].pass).toBe(80)
  })

  it('uses generic defaults when course is not in defaults at all', () => {
    const stored = [{ id: 'UNKNOWN', title: '', modules: [] }]
    const result = loadCoursesFromData(stored, DEFAULTS)
    expect(result[0].icon).toBe('ti-book')
    expect(result[0].color).toBe('#5B3FC8')
    expect(result[0].title).toBe('หลักสูตรใหม่')
  })
})
