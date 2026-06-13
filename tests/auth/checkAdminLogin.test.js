import { describe, it, expect } from 'vitest'
import { findAdmin } from '../../src/utils.js'

const ADMINS = [
  { id: 'ADMIN-001', name: 'Super Admin', role: 'Super Admin', dept: 'ทุกแผนก', pass: 'admin2569', status: 'active' },
  { id: 'ADMIN-002', name: 'HR Admin', role: 'HR Admin', dept: 'ทุกแผนก', pass: 'hr2569', status: 'active' },
  { id: 'ADMIN-003', name: 'Inactive User', role: 'Viewer', dept: 'Safety', pass: 'view001', status: 'inactive' },
]

describe('findAdmin — successful login', () => {
  it('returns the admin object for correct credentials', () => {
    const result = findAdmin('ADMIN-001', 'admin2569', ADMINS)
    expect(result).not.toBeNull()
    expect(result.id).toBe('ADMIN-001')
    expect(result.role).toBe('Super Admin')
  })

  it('works for a second valid account', () => {
    const result = findAdmin('ADMIN-002', 'hr2569', ADMINS)
    expect(result).not.toBeNull()
    expect(result.id).toBe('ADMIN-002')
  })
})

describe('findAdmin — failed login', () => {
  it('returns null for a wrong password', () => {
    expect(findAdmin('ADMIN-001', 'wrong', ADMINS)).toBeNull()
  })

  it('returns null for a wrong ID', () => {
    expect(findAdmin('ADMIN-999', 'admin2569', ADMINS)).toBeNull()
  })

  it('returns null for an inactive admin even with correct credentials', () => {
    expect(findAdmin('ADMIN-003', 'view001', ADMINS)).toBeNull()
  })

  it('returns null for empty credentials', () => {
    expect(findAdmin('', '', ADMINS)).toBeNull()
  })

  it('is case-sensitive for password', () => {
    expect(findAdmin('ADMIN-001', 'Admin2569', ADMINS)).toBeNull()
    expect(findAdmin('ADMIN-001', 'ADMIN2569', ADMINS)).toBeNull()
  })

  it('is case-sensitive for ID', () => {
    expect(findAdmin('admin-001', 'admin2569', ADMINS)).toBeNull()
  })
})

describe('findAdmin — empty admin list', () => {
  it('returns null when the admins array is empty', () => {
    expect(findAdmin('ADMIN-001', 'admin2569', [])).toBeNull()
  })
})
