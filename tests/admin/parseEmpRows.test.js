import { describe, it, expect } from 'vitest'
import { parseEmpRows } from '../../src/utils.js'

describe('parseEmpRows — Thai column headers', () => {
  it('maps Thai headers to internal fields', () => {
    const rows = [{ 'รหัสพนักงาน': 'SML-010', 'ชื่อ-นามสกุล': 'นาย ทดสอบ', 'แผนก': 'PDI', 'รหัสผ่าน app': 'pass001' }]
    const emp = parseEmpRows(rows)[0]
    expect(emp.id).toBe('SML-010')
    expect(emp.name).toBe('นาย ทดสอบ')
    expect(emp.dept).toBe('PDI')
    expect(emp.pass).toBe('pass001')
  })
})

describe('parseEmpRows — English column headers', () => {
  it('maps English headers to internal fields', () => {
    const rows = [{ id: 'SML-011', name: 'John Doe', department: 'HR', password: 'secret', role: 'HR Admin' }]
    const emp = parseEmpRows(rows)[0]
    expect(emp.id).toBe('SML-011')
    expect(emp.name).toBe('John Doe')
    expect(emp.dept).toBe('HR')
    expect(emp.pass).toBe('secret')
    expect(emp.role).toBe('HR Admin')
  })
})

describe('parseEmpRows — status normalisation', () => {
  it('sets status to "active" for the value "active"', () => {
    expect(parseEmpRows([{ id: 'SML-020', status: 'active' }])[0].status).toBe('active')
  })

  it('sets status to "inactive" for the value "inactive" (lowercase)', () => {
    expect(parseEmpRows([{ id: 'SML-021', status: 'inactive' }])[0].status).toBe('inactive')
  })

  it('sets status to "inactive" for "Inactive" (capital I — case-insensitive)', () => {
    expect(parseEmpRows([{ id: 'SML-022', status: 'Inactive' }])[0].status).toBe('inactive')
  })

  it('sets status to "inactive" for "INACTIVE" (all caps)', () => {
    expect(parseEmpRows([{ id: 'SML-023', status: 'INACTIVE' }])[0].status).toBe('inactive')
  })

  it('defaults status to "active" for unknown values', () => {
    expect(parseEmpRows([{ id: 'SML-024', status: 'suspended' }])[0].status).toBe('active')
  })

  it('defaults status to "active" when status field is absent', () => {
    expect(parseEmpRows([{ id: 'SML-025', name: 'Test' }])[0].status).toBe('active')
  })
})

describe('parseEmpRows — row filtering', () => {
  it('keeps rows that have only an id', () => {
    const rows = [{ id: 'SML-030' }]
    expect(parseEmpRows(rows)).toHaveLength(1)
  })

  it('keeps rows that have only a name', () => {
    const rows = [{ name: 'Only Name' }]
    expect(parseEmpRows(rows)).toHaveLength(1)
  })

  it('removes rows with both id and name empty', () => {
    const rows = [{ id: '', name: '' }, { id: 'SML-031', name: 'Valid' }]
    const result = parseEmpRows(rows)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SML-031')
  })
})

describe('parseEmpRows — whitespace trimming', () => {
  it('trims leading/trailing whitespace from all values', () => {
    const rows = [{ id: '  SML-040  ', name: '  Padded Name  ', department: '  HR  ' }]
    const emp = parseEmpRows(rows)[0]
    expect(emp.id).toBe('SML-040')
    expect(emp.name).toBe('Padded Name')
    expect(emp.dept).toBe('HR')
  })
})

describe('parseEmpRows — default field values', () => {
  it('applies sensible defaults for missing fields', () => {
    const emp = parseEmpRows([{ id: 'SML-050', name: 'Min' }])[0]
    expect(emp.pos).toBe('พนักงาน')
    expect(emp.role).toBe('พนักงาน')
    expect(emp.status).toBe('active')
    expect(emp.lastLogin).toBe('ยังไม่เข้าใช้')
    expect(emp.email).toBe('')
    expect(emp.startDate).toBe('')
    expect(emp.pass).toBe('')
  })
})

describe('parseEmpRows — edge cases', () => {
  it('returns [] for an empty input array', () => {
    expect(parseEmpRows([])).toEqual([])
  })

  it('ignores unknown column headers gracefully', () => {
    const rows = [{ id: 'SML-060', name: 'Test', unknownColumn: 'ignored' }]
    const emp = parseEmpRows(rows)[0]
    expect(emp.id).toBe('SML-060')
    expect(emp).not.toHaveProperty('unknownColumn')
  })
})
