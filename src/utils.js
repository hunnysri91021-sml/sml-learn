/**
 * Pure utility functions extracted from index.html and admin.html for testability.
 *
 * These mirror logic that lives in the inline <script> blocks of both HTML files.
 * Once a module bundler is added, the HTML files should import from here instead
 * of duplicating the logic.
 */

// ─── Deadline helpers (index.html) ───────────────────────────────────────────

/**
 * Parses a deadline string into a Date, or null if no deadline.
 * Supports ISO "YYYY-MM-DD" and "mm/dd/yyyy" formats.
 * Returns null for empty, "ไม่มีกำหนด", or "undefined".
 */
export function parseDL(dl) {
  if (!dl || dl === 'ไม่มีกำหนด' || dl === '' || dl === 'undefined') return null
  if (/^\d{4}-\d{2}-\d{2}/.test(dl)) return new Date(dl)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dl)) {
    const p = dl.split('/')
    return new Date(p[2], p[0] - 1, p[1])
  }
  return null
}

/**
 * Returns the number of days until a deadline (negative = overdue, 0 = today).
 * Accepts an optional `today` parameter for testability.
 */
export function dlDiffDays(dl, today = new Date()) {
  const d = parseDL(dl)
  if (!d || isNaN(d)) return null
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

// ─── Video helpers (index.html) ──────────────────────────────────────────────

/**
 * Converts a "mm:ss" timestamp string to total seconds.
 * Returns 0 for null, empty, or unparseable input.
 */
export function tsToSec(ts) {
  if (!ts) return 0
  const p = ts.split(':')
  if (p.length === 2) return parseInt(p[0] || 0) * 60 + parseInt(p[1] || 0)
  return parseInt(ts) || 0
}

/**
 * Builds an embeddable video URL from a raw URL and timing parameters.
 * Supports YouTube (watch + short URLs), Google Drive, and generic URLs.
 * The effective start time is max(resumeSec, startSec).
 */
export function buildEmbedUrl(rawUrl, startSec, endSec, resumeSec) {
  const start = Math.max(resumeSec || 0, startSec || 0)

  const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) {
    let params = `enablejsapi=1&rel=0&autoplay=1&start=${start}`
    if (endSec > 0) params += `&end=${endSec}`
    return `https://www.youtube.com/embed/${ytMatch[1]}?${params}`
  }

  const gdMatch = rawUrl.match(/\/d\/([^/]+)\//)
  if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview#t=${start}`

  return rawUrl + (rawUrl.includes('?') ? '&' : '?') + 't=' + start
}

// ─── HTML escaping (admin.html) ───────────────────────────────────────────────

export function escH(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Record normalization (admin.html) ───────────────────────────────────────

/**
 * Normalises a training record so both the legacy key and its alias are set.
 * Dual keys: empId↔id, courseId↔cid, status↔pass, ts↔date.
 * Mutates the record in place and returns it.
 */
export function normalizeRec(r) {
  const empid = r.empId || r.id || ''
  const cid = r.courseId || r.cid || ''
  const passVal = r.status || r.pass || ''
  const ts = r.ts || r.date || ''
  r.id = empid; r.empId = empid
  r.cid = cid; r.courseId = cid
  r.pass = passVal; r.status = passVal
  r.ts = ts; r.date = ts
  return r
}

export function normalizeRecs(arr) {
  return (arr || []).map(normalizeRec)
}

// ─── Authentication (admin.html) ─────────────────────────────────────────────

/**
 * Returns a matching active admin from the provided list, or null.
 * Pure extraction of the credential-check logic from checkAdminLogin().
 */
export function findAdmin(id, pass, admins) {
  return admins.find(a => a.id === id && a.pass === pass && a.status === 'active') || null
}

/**
 * Returns true if a session older than 8 hours should be considered expired.
 * Accepts an optional `now` timestamp for testability.
 */
export function sessionIsExpired(loginTime, now = Date.now()) {
  const sessionAge = now - (loginTime || 0)
  return sessionAge > 8 * 60 * 60 * 1000
}

// ─── Role-based navigation (admin.html) ──────────────────────────────────────

const ROLE_HIDDEN_NAV = {
  Viewer: ['nav-courses', 'nav-quiz', 'nav-export', 'nav-import-courses'],
  'Dept Admin': ['nav-settings', 'nav-import-courses'],
}

/**
 * Returns the list of nav element IDs that should be hidden for the given role.
 * Super Admin and HR Admin receive an empty list (full access).
 */
export function getHiddenNavIds(role) {
  return ROLE_HIDDEN_NAV[role] || []
}

// ─── Course progress (index.html) ────────────────────────────────────────────

export function isModuleDone(cid, mid, progress, userId) {
  const userProg = progress[userId] || {}
  const courseProg = userProg[cid] || {}
  const moduleProg = courseProg[mid] || {}
  return moduleProg.done === true
}

export function isModuleUnlocked(course, i, progress, userId) {
  if (i === 0) return true
  return isModuleDone(course.id, course.modules[i - 1].id, progress, userId)
}

export function computeCoursePct(course, progress, userId) {
  if (!course.modules || !course.modules.length) return 0
  let done = 0
  course.modules.forEach(m => {
    if (isModuleDone(course.id, m.id, progress, userId)) done++
  })
  return Math.round(done / course.modules.length * 100)
}

// ─── Quiz scoring (index.html) ───────────────────────────────────────────────

export function computeQuizScore(correctCount, total) {
  if (!total) return 0
  return Math.round(correctCount / total * 100)
}

/**
 * Determines pass/fail for a quiz score.
 *
 * NOTE: The source file (showResult in index.html) hardcodes the pass threshold
 * at 80 instead of reading the per-course `.pass` property. This function
 * exposes passThreshold as a parameter — the correct behaviour.
 */
export function isQuizPassing(pct, passThreshold = 80) {
  return pct >= passThreshold
}

// ─── Employee import (admin.html) ────────────────────────────────────────────

export const EMP_FIELD_MAP = {
  'รหัสพนักงาน': 'id', employee_id: 'id', id: 'id',
  'ชื่อ-นามสกุล': 'name', 'ชื่อนามสกุล': 'name', name: 'name',
  'แผนก': 'dept', department: 'dept',
  'ตำแหน่ง': 'pos', position: 'pos',
  role: 'role', Role: 'role',
  'รหัสผ่าน app': 'pass', 'รหัสผ่านapp': 'pass', password: 'pass', pass: 'pass',
  'วันที่เริ่มงาน': 'startDate', start_date: 'startDate',
  'อีเมล': 'email', email: 'email',
  'สถานะ': 'status', status: 'status',
}

/**
 * Maps raw Excel/spreadsheet rows to normalised employee objects.
 * Skips rows with no id AND no name.
 * Status comparison is case-insensitive; anything other than 'inactive' becomes 'active'.
 */
export function parseEmpRows(rows) {
  return rows.map(row => {
    const emp = {
      id: '', name: '', dept: '', pos: 'พนักงาน', role: 'พนักงาน',
      pass: '', startDate: '', email: '', status: 'active', lastLogin: 'ยังไม่เข้าใช้',
    }
    Object.keys(row).forEach(k => {
      const fk = EMP_FIELD_MAP[k] || EMP_FIELD_MAP[k.toLowerCase()]
      if (fk) emp[fk] = (row[k] || '').toString().trim()
    })
    emp.status = (emp.status && emp.status.toLowerCase() === 'inactive') ? 'inactive' : 'active'
    return emp
  }).filter(e => e.id || e.name)
}

// ─── Course loading (index.html) ─────────────────────────────────────────────

/**
 * Pure version of loadCoursesFromStorage().
 * Merges stored courses with the defaults array, using stored modules as the
 * source of truth when present and falling back to defaults otherwise.
 */
export function loadCoursesFromData(stored, defaults) {
  if (!stored || !stored.length) return defaults
  return stored.map(sc => {
    const def = defaults.find(d => d.id === sc.id)
    let modules
    if (sc.modules && sc.modules.length) {
      modules = sc.modules
    } else if (def && def.modules && def.modules.length) {
      modules = def.modules
    } else {
      modules = [{
        id: 'm1',
        title: sc.title || '',
        type: 'content',
        slides: [{ title: sc.title || 'หลักสูตรใหม่', body: 'HR กำลังเพิ่มเนื้อหา กรุณารอหรือติดต่อ HR', media: null }],
      }]
    }
    return {
      id: sc.id,
      title: sc.title || (def && def.title) || 'หลักสูตรใหม่',
      icon: sc.icon || (def && def.icon) || 'ti-book',
      color: sc.color || (def && def.color) || '#5B3FC8',
      hours: sc.hours || (def && def.hours) || 2,
      dept: sc.dept || (def && def.dept) || 'ทุกแผนก',
      deadline: sc.deadline || (def && def.deadline) || '',
      pass: sc.pass || (def && def.pass) || 80,
      modules,
    }
  })
}
