import { describe, it, expect } from 'vitest'
import { normalizeRec, normalizeRecs } from '../../src/utils.js'

describe('normalizeRec — empId / id', () => {
  it('keeps empId and mirrors it to id', () => {
    const r = { empId: 'SML-001', courseId: 'ORI-001', status: 'ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.id).toBe('SML-001')
    expect(r.empId).toBe('SML-001')
  })

  it('falls back to id when empId is missing', () => {
    const r = { id: 'SML-002', cid: 'ORI-001', status: 'ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.empId).toBe('SML-002')
    expect(r.id).toBe('SML-002')
  })

  it('sets both to empty string when neither key exists', () => {
    const r = {}
    normalizeRec(r)
    expect(r.id).toBe('')
    expect(r.empId).toBe('')
  })
})

describe('normalizeRec — courseId / cid', () => {
  it('keeps courseId and mirrors it to cid', () => {
    const r = { id: 'SML-001', courseId: 'ISO-001', status: 'ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.cid).toBe('ISO-001')
    expect(r.courseId).toBe('ISO-001')
  })

  it('falls back to cid when courseId is missing', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', status: 'ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.courseId).toBe('ORI-001')
    expect(r.cid).toBe('ORI-001')
  })
})

describe('normalizeRec — status / pass', () => {
  it('keeps status and mirrors it to pass', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', status: 'ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.pass).toBe('ผ่าน')
    expect(r.status).toBe('ผ่าน')
  })

  it('falls back to pass when status is missing', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', pass: 'ไม่ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.status).toBe('ไม่ผ่าน')
    expect(r.pass).toBe('ไม่ผ่าน')
  })

  it('prefers status over pass when both exist', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', status: 'ผ่าน', pass: 'ไม่ผ่าน', ts: '2026-06-01' }
    normalizeRec(r)
    expect(r.pass).toBe('ผ่าน')
    expect(r.status).toBe('ผ่าน')
  })
})

describe('normalizeRec — ts / date', () => {
  it('keeps ts and mirrors it to date', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', ts: '2026-06-07T09:45', pass: 'ผ่าน' }
    normalizeRec(r)
    expect(r.date).toBe('2026-06-07T09:45')
    expect(r.ts).toBe('2026-06-07T09:45')
  })

  it('falls back to date when ts is missing', () => {
    const r = { id: 'SML-001', cid: 'ORI-001', date: '2026-06-07T09:45', pass: 'ผ่าน' }
    normalizeRec(r)
    expect(r.ts).toBe('2026-06-07T09:45')
    expect(r.date).toBe('2026-06-07T09:45')
  })
})

describe('normalizeRec — empty object', () => {
  it('handles completely empty record without throwing', () => {
    const r = {}
    expect(() => normalizeRec(r)).not.toThrow()
    expect(r.id).toBe('')
    expect(r.cid).toBe('')
    expect(r.pass).toBe('')
    expect(r.ts).toBe('')
  })
})

describe('normalizeRecs', () => {
  it('normalises every record in an array', () => {
    const recs = [
      { empId: 'SML-001', courseId: 'ORI-001', status: 'ผ่าน', ts: '2026-06-01' },
      { id: 'SML-002', cid: 'ISO-001', pass: 'ไม่ผ่าน', date: '2026-06-02' },
    ]
    const result = normalizeRecs(recs)
    expect(result[0].id).toBe('SML-001')
    expect(result[0].cid).toBe('ORI-001')
    expect(result[1].empId).toBe('SML-002')
    expect(result[1].courseId).toBe('ISO-001')
  })

  it('returns [] for null', () => expect(normalizeRecs(null)).toEqual([]))
  it('returns [] for undefined', () => expect(normalizeRecs(undefined)).toEqual([]))
  it('returns [] for empty array', () => expect(normalizeRecs([])).toEqual([]))
})
