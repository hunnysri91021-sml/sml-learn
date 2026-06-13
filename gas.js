// ============================================================
// SML Learn — Google Apps Script (GAS) Backend
// v2.1 — Multi-user safe: LockService + Google Sheets as center
// ============================================================
// วิธี Deploy:
// 1. เปิด Google Sheets → Extensions → Apps Script
// 2. วาง code นี้ทั้งหมด (แทน code เดิม)
// 3. Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy URL ไปใส่ใน Admin Portal (Settings → GAS URL)
// ============================================================

// ใช้ Sheet ID ตรง ๆ เพื่อให้ deploy ได้ทั้งแบบ bound script และ standalone script
var SHEET_ID = '1srt8VJhsDMfnqX_EMvlfV_EvwrYA3ZlGZWVgEBiTKNM';
var API_SECRET = 'sml-secret-2026';

var SHEETS = {
  employees:        'Employees',
  admins:           'Admins',
  courses:          'Courses',
  assignments:      'Assignments',
  optional:         'OptionalCourses',
  enrollments:      'Enrollments',
  progress:         'Progress',
  records:          'Records',
  training_records: 'Training_Records',
  activity_log:     'Activity_Log',
  settings:         'Settings'
};

// ============================================================
// CORE HELPERS — Spreadsheet / Response / Lock
// ============================================================
function getSS() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('ไม่พบ Spreadsheet: กรุณาตั้งค่า SHEET_ID');
  return active;
}

function ok(data, extra) {
  var res = { status: 'ok' };
  if (data !== undefined) res.data = data;
  if (extra) Object.keys(extra).forEach(function(k) { res[k] = extra[k]; });
  return res;
}

function fail(message, extra) {
  var res = { status: 'error', message: String(message || 'unknown error') };
  if (extra) Object.keys(extra).forEach(function(k) { res[k] = extra[k]; });
  return res;
}

function sanitizeCallbackName(name) {
  name = String(name || '');
  return /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(name) ? name : '';
}

function respond(result, callback) {
  var json = JSON.stringify(result || ok());
  callback = sanitizeCallbackName(callback);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function checkSecret(body) {
  return body.apiSecret === API_SECRET;
}

function hashPassword(plain) {
  if (!plain) return '';
  if (/^[0-9a-f]{64}$/.test(String(plain))) return String(plain);
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain), Utilities.Charset.UTF_8);
  return bytes.map(function(b){ return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join('');
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // GAS cold start / concurrent write เผื่อไว้มากขึ้น
    return fn();
  } catch (e) {
    return fail('ระบบยุ่งอยู่ กรุณาลองใหม่ (' + e.toString() + ')', { retryable: true });
  } finally {
    try { lock.releaseLock(); } catch(e2) {}
  }
}

// ============================================================
// GET — รองรับ JSONP (callback parameter) + JSON ธรรมดา
// ============================================================
function doGet(e) {
  var params = e.parameter || {};
  var callback = params.callback || '';
  var type     = params.type    || 'all';
  var empId    = params.empId   || '';

  var result;
  try {
    if      (type === 'health')    result = ok({ version: '2.1', time: new Date().toISOString() });
    else if (type === 'employees') result = getEmployees(params);
    else if (type === 'courses')   result = getCourses();
    else if (type === 'records')   result = getRecords(params);
    else if (type === 'summary')   result = getSummary(params);
    else if (type === 'admins')    result = getAdmins();
    else if (type === 'all')       result = getAll(empId, params);
    else result = fail('unknown type: ' + type);
  } catch (err) {
    result = fail(err.toString());
  }

  return respond(result, callback);
}

// ============================================================
// POST — รับข้อมูลจาก Admin Portal / Employee App
// ============================================================
function doPost(e) {
  var result;
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || '{}');
    var eventType = body.eventType || '';

    if (!checkSecret(body)) return respond(fail('unauthorized'));

    if      (eventType === 'push_all')        result = withLock(function(){ return pushAll(body); });
    else if (eventType === 'save_employee')   result = withLock(function(){ return saveEmployee(body); });
    else if (eventType === 'delete_employee') result = withLock(function(){ return deleteEmployee(body); });
    else if (eventType === 'bulk_employees')  result = withLock(function(){ return bulkEmployees(body); });
    else if (eventType === 'save_course')     result = withLock(function(){ return saveCourse(body); });
    else if (eventType === 'delete_course')   result = withLock(function(){ return deleteCourse(body); });
    else if (eventType === 'save_assign')     result = withLock(function(){ return saveAssignment(body); });
    else if (eventType === 'save_optional')   result = withLock(function(){ return saveOptional(body); });
    else if (eventType === 'save_progress')   result = withLock(function(){ return saveProgress(body); });
    else if (eventType === 'add_record')      result = withLock(function(){ return addRecord(body); });
    else if (eventType === 'save_enrollment') result = withLock(function(){ return saveEnrollment(body); });
    else if (eventType === 'login')           result = withLock(function(){ return logActivity(body, 'login'); });
    else if (eventType === 'module_start')    result = withLock(function(){ return logActivity(body, 'module_start'); });
    else if (eventType === 'add_admin')       result = withLock(function(){ return saveAdmin(body, false); });
    else if (eventType === 'edit_admin')      result = withLock(function(){ return saveAdmin(body, true); });
    else if (eventType === 'delete_admin')    result = withLock(function(){ return deleteAdmin(body); });
    else if (eventType === 'change_password') result = withLock(function(){ return changePassword(body); });
    else if (eventType === 'reset_password')  result = withLock(function(){ return resetPassword(body); });
    else if (eventType === 'send_deadline_reminders') result = sendDeadlineReminders(body);
    else if (eventType === 'send_monthly_report')     result = sendMonthlyReport(body);
    else result = fail('unknown eventType: ' + eventType);
  } catch (err) {
    result = fail(err.toString());
  }

  return respond(result);
}

// ============================================================
// GET HELPERS
// ============================================================

function getSheetData(sheetName) {
  var ss = getSS();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] === '' ? null : row[i]; });
    return obj;
  });
}

function getEmployees(params) {
  params = params || {};
  var rows = getSheetData(SHEETS.employees);
  var active = rows.filter(function(r) {
    var s = String(r.Status || '').toLowerCase();
    return s !== 'deleted' && s !== 'inactive';
  });
  var limit = parseInt(params.limit) || active.length;
  var page  = parseInt(params.page)  || 1;
  var start = (page - 1) * limit;
  var items = active.slice(start, start + limit);
  return { status: 'ok', data: { items: items, total: active.length, page: page } };
}

function getCourses() {
  var rows = getSheetData(SHEETS.courses);
  rows = rows.map(function(r) {
    if (r.Modules && typeof r.Modules === 'string') {
      try { r.modules = JSON.parse(r.Modules); } catch(e) { r.modules = []; }
    } else { r.modules = []; }
    return r;
  });
  return { status: 'ok', data: rows };
}

function getAdmins() {
  var rows = getSheetData(SHEETS.admins);
  return { status: 'ok', data: rows };
}

function getRecords(params) {
  params = params || {};
  var rows = getSheetData(SHEETS.training_records);
  rows = filterRecords(rows, params);

  // Backward compatible: admin.html เดิมเรียก ?type=records และคาดว่า data เป็น array
  if (!params.limit && !params.page && !hasRecordFilter(params)) {
    return ok(rows);
  }

  var limit = Math.max(1, Math.min(parseInt(params.limit, 10) || 100, 500));
  var page = Math.max(1, parseInt(params.page, 10) || 1);
  var total = rows.length;
  var start = (page - 1) * limit;
  return ok({ items: rows.slice(start, start + limit), total: total, page: page, limit: limit });
}

function hasRecordFilter(params) {
  return !!(params.employeeId || params.empId || params.courseId || params.dept ||
            params.department || params.typeFilter || params.recordType ||
            params.passFail || params.status || params.dateFrom || params.dateTo);
}

function filterRecords(rows, params) {
  var employeeId = String(params.employeeId || params.empId || '');
  var courseId   = String(params.courseId || '');
  var dept       = String(params.dept || params.department || '');
  var recType    = String(params.typeFilter || params.recordType || '');
  var passFail   = String(params.passFail || params.status || '');
  var dateFrom   = params.dateFrom ? new Date(params.dateFrom) : null;
  var dateTo     = params.dateTo ? new Date(params.dateTo) : null;
  if (dateTo && !isNaN(dateTo.getTime())) dateTo.setHours(23, 59, 59, 999);

  return rows.filter(function(r) {
    if (employeeId && String(r.EmployeeID || r.empId || r.id || '') !== employeeId) return false;
    if (courseId && String(r.CourseID || r.courseId || r.cid || '') !== courseId) return false;
    if (dept && String(r.Department || r.dept || '') !== dept) return false;
    if (recType && String(r.Type || r.type || '') !== recType) return false;
    if (passFail && String(r.PassFail || r.pass || r.status || '') !== passFail) return false;
    if (dateFrom || dateTo) {
      var d = new Date(r.Timestamp || r.ts || r.date || '');
      if (isNaN(d.getTime())) return false;
      if (dateFrom && !isNaN(dateFrom.getTime()) && d < dateFrom) return false;
      if (dateTo && !isNaN(dateTo.getTime()) && d > dateTo) return false;
    }
    return true;
  });
}

function getSummary(params) {
  params = params || {};
  var employees = getEmployees({ limit: 999999 }).data.items || [];
  var courses = getCourses().data || [];
  var records = filterRecords(getSheetData(SHEETS.training_records), params);
  var pass = 0, fail = 0, quiz = 0, content = 0;
  var empSet = {};
  records.forEach(function(r) {
    var pf = String(r.PassFail || r.pass || r.status || '');
    var t = String(r.Type || r.type || '');
    if (pf === 'ผ่าน') pass++;
    if (pf === 'ไม่ผ่าน') fail++;
    if (t === 'Quiz') quiz++;
    if (t === 'Content') content++;
    var eid = String(r.EmployeeID || r.empId || r.id || '');
    if (eid) empSet[eid] = true;
  });
  return ok({
    employees: employees.length,
    courses: courses.length,
    records: records.length,
    activeLearners: Object.keys(empSet).length,
    pass: pass,
    fail: fail,
    quiz: quiz,
    content: content
  });
}

function getAssignments() {
  var rows = getSheetData(SHEETS.assignments);
  var map = {};
  rows.forEach(function(r) {
    var empId = String(r.EmployeeID || '');
    var req = [];
    var dl  = {};
    try { req = JSON.parse(r.Required  || '[]'); } catch(e) {}
    try { dl  = JSON.parse(r.Deadlines || '{}'); } catch(e) {}
    map[empId] = { required: req, deadlines: dl };
  });
  return map;
}

function getOptional() {
  var rows = getSheetData(SHEETS.optional);
  return rows.map(function(r) { return String(r.CourseID || ''); }).filter(Boolean);
}

// ── ดึง Enrolled optional courses รายพนักงาน ──
function getEnrollments(empId) {
  var rows = getSheetData(SHEETS.enrollments);
  if (empId) {
    rows = rows.filter(function(r) { return String(r.EmployeeID || '') === String(empId); });
  }
  return rows.map(function(r) { return String(r.CourseID || ''); }).filter(Boolean);
}

function getProgress(empId) {
  var rows = getSheetData(SHEETS.progress);
  if (empId) rows = rows.filter(function(r) { return String(r.EmployeeID) === String(empId); });
  var map = {};
  rows.forEach(function(r) {
    var cid = String(r.CourseID  || '');
    var mid = String(r.ModuleID  || '');
    if (!map[cid]) map[cid] = {};
    map[cid][mid] = {
      done:     r.Done === true || r.Done === 'TRUE',
      slideIdx: parseInt(r.SlideIdx) || 0,
      score:    r.Score || '',
      videoTimes: parseJsonSafe(r.VideoTimes, {})
    };
  });
  return map;
}

function parseJsonSafe(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch(e) { return fallback; }
}

// type=all — ส่งทุกอย่างพร้อมกัน (พนักงาน + courses + assign + optional + progress + enrollments)
function getAll(empId, params) {
  var empResult  = getEmployees(params);
  var crsResult  = getCourses();
  var assigns    = getAssignments();
  var optional   = getOptional();
  var progress   = empId ? getProgress(empId) : {};
  var enrollments = empId ? getEnrollments(empId) : [];

  return {
    status: 'ok',
    data: {
      employees:   empResult.data.items,
      courses:     crsResult.data,
      assignments: assigns,
      optional:    optional,
      progress:    progress,
      enrollments: enrollments
    }
  };
}

// ============================================================
// POST HELPERS
// ============================================================

function getSheet(name) {
  var ss = getSS();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  return sh;
}

function ensureHeader(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var current = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var needsUpdate = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(current[i] || '') !== String(headers[i])) {
      needsUpdate = true;
      break;
    }
  }
  if (needsUpdate) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function findRowById(sh, colIndex, id) {
  if (id === undefined || id === null || id === '') return -1;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var finder = sh.getRange(2, colIndex, lastRow - 1, 1)
    .createTextFinder(String(id))
    .matchEntireCell(true);
  var found = finder.findNext();
  return found ? found.getRow() : -1;
}

// ── Push All ──
function pushAll(body) {
  if (body.employees) overwriteSheet(SHEETS.employees, body.employees, [
    'EmployeeID','EmployeeName','Department','Position','Role','Password','StartDate','Email','Status','LastLogin'
  ], function(e) {
    return [e.employeeId||'', e.employeeName||'', e.department||'', e.position||'พนักงาน',
            e.role||'พนักงาน', hashPassword(e.password||''), e.startDate||'', e.email||'',
            e.status||'active', e.lastLogin||''];
  });

  if (body.courses) overwriteSheet(SHEETS.courses, body.courses, [
    'CourseID','Title','Type','Hours','Department','PassScore','Deadline','Color','Icon','Modules'
  ], function(c) {
    return [String(c.id||''), c.title||'', c.type||'', c.hours||2, c.dept||'ทุกแผนก',
            c.pass||80, c.deadline||'', c.color||'', c.icon||'',
            typeof c.modules === 'string' ? c.modules : JSON.stringify(c.modules||[])];
  });

  if (body.admins) overwriteSheet(SHEETS.admins, body.admins, [
    'AdminID','AdminName','Role','Department','Password','Status'
  ], function(a) {
    return [a.adminId||'', a.adminName||'', a.role||'', a.department||'ทุกแผนก', hashPassword(a.password||''), a.status||'active'];
  });

  logActivity({ eventType:'push_all', employeeId:'ADMIN', employeeName:'Admin', department:'-' }, 'push_all');
  return ok(null, { message: 'Push สำเร็จ' });
}

function overwriteSheet(sheetName, items, headers, rowFn) {
  var ss = getSS();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var rows = (items || []).map(function(item) { return rowFn(item); });
  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// ── Save/Update Employee ──
function saveEmployee(body) {
  var sh  = getSheet(SHEETS.employees);
  ensureHeader(sh, ['EmployeeID','EmployeeName','Department','Position','Role','Password','StartDate','Email','Status','LastLogin']);
  var row = findRowById(sh, 1, body.employeeId);
  var data = [
    body.employeeId||'', body.employeeName||'', body.department||'',
    body.position||'พนักงาน', body.role||'พนักงาน', hashPassword(body.password||''),
    body.startDate||'', body.email||'', body.status||'active',
    body.lastLogin||''
  ];
  if (row > 0) {
    sh.getRange(row, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  return ok({ employeeId: String(body.employeeId || '') });
}

// ── Delete Employee (mark deleted) ──
function deleteEmployee(body) {
  var sh  = getSheet(SHEETS.employees);
  var row = findRowById(sh, 1, body.employeeId);
  if (row > 0) sh.getRange(row, 9).setValue('deleted');
  return ok({ employeeId: String(body.employeeId || ''), deleted: row > 0 });
}

// ── Bulk Employees ──
function bulkEmployees(body) {
  if (body.employees) {
    body.employees.forEach(function(e) { saveEmployee(e); });
  }
  return ok({ count: (body.employees || []).length });
}

// ── Save/Update Course ──
function saveCourse(body) {
  var sh  = getSheet(SHEETS.courses);
  ensureHeader(sh, ['CourseID','Title','Type','Hours','Department','PassScore','Deadline','Color','Icon','Modules']);
  var row = findRowById(sh, 1, body.id);
  var modulesStr = typeof body.modules === 'string' ? body.modules : JSON.stringify(body.modules||[]);
  var courseId = String(body.id || '');
  var data = [
    courseId, body.title||'', body.type||'', body.hours||2,
    body.dept||'ทุกแผนก', body.pass||80, body.deadline||'',
    body.color||'', body.icon||'', modulesStr
  ];
  if (row > 0) {
    sh.getRange(row, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  return ok({ courseId: courseId });
}

// ── Delete Course ──
function deleteCourse(body) {
  var sh  = getSheet(SHEETS.courses);
  var row = findRowById(sh, 1, body.id);
  if (row > 0) sh.deleteRow(row);
  return ok({ courseId: String(body.id || ''), deleted: row > 0 });
}

// ── Save Assignment ──
function saveAssignment(body) {
  var sh  = getSheet(SHEETS.assignments);
  ensureHeader(sh, ['EmployeeID','Required','Deadlines','UpdatedAt']);
  var row = findRowById(sh, 1, body.employeeId);
  var data = [
    String(body.employeeId||''),
    JSON.stringify(body.required||[]),
    JSON.stringify(body.deadlines||{}),
    new Date().toISOString()
  ];
  if (row > 0) {
    sh.getRange(row, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  return ok({ employeeId: String(body.employeeId || '') });
}

// ── Save Optional Courses ──
function saveOptional(body) {
  var sh = getSheet(SHEETS.optional);
  sh.clearContents();
  var headers = ['CourseID','UpdatedAt'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var ts = new Date().toISOString();
  var rows = (body.optional || []).map(function(id) { return [String(id), ts]; });
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return ok({ count: rows.length });
}

// ── Save/Delete Enrollment (optional course per employee) ──
function saveEnrollment(body) {
  var sh = getSheet(SHEETS.enrollments);
  ensureHeader(sh, ['EmployeeID','CourseID','EnrolledAt']);

  var empId   = String(body.employeeId || '');
  var courseId = String(body.courseId  || '');
  var action  = body.action || 'enroll'; // 'enroll' | 'unenroll'

  // หาแถวที่มีอยู่แล้ว
  var lastRow = sh.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var vals = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === empId && String(vals[i][1]) === courseId) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (action === 'unenroll') {
    if (foundRow > 0) sh.deleteRow(foundRow);
  } else {
    var data = [empId, courseId, new Date().toISOString()];
    if (foundRow > 0) {
      sh.getRange(foundRow, 1, 1, data.length).setValues([data]);
    } else {
      sh.appendRow(data);
    }
  }
  return ok({ employeeId: empId, courseId: courseId, action: action });
}

// ── Save Progress — upsert ──
function saveProgress(body) {
  var sh = getSheet(SHEETS.progress);
  ensureHeader(sh, ['EmployeeID','CourseID','ModuleID','Done','SlideIdx','Score','UpdatedAt','VideoTimes']);
  var lastRow = sh.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var vals = sh.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === String(body.employeeId) &&
          String(vals[i][1]) === String(body.courseId) &&
          String(vals[i][2]) === String(body.moduleId)) {
        foundRow = i + 2;
        break;
      }
    }
  }
  var data = [
    String(body.employeeId||''), String(body.courseId||''), String(body.moduleId||''),
    body.done ? 'TRUE' : 'FALSE',
    body.slideIdx || 0,
    body.score || '',
    new Date().toISOString(),
    JSON.stringify(body.videoTimes || {})
  ];
  if (foundRow > 0) {
    sh.getRange(foundRow, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  return ok({ employeeId: String(body.employeeId || ''), courseId: String(body.courseId || ''), moduleId: String(body.moduleId || '') });
}

// ── Add Training Record — ป้องกัน duplicate ด้วย idempotency key ──
function addRecord(body) {
  var sh = getSheet(SHEETS.training_records);
  ensureHeader(sh, ['Timestamp','EmployeeID','EmployeeName','Department','CourseID','ModuleName','Type','Score','PassFail','IdempotencyKey']);

  // ตรวจ duplicate: ถ้า idempotencyKey ซ้ำ → skip
  var iKey = body.idempotencyKey || '';
  if (iKey) {
    var cache = CacheService.getScriptCache();
    if (cache.get('idem_' + iKey)) {
      return ok({ duplicate: true, idempotencyKey: iKey }, { message: 'duplicate skipped' });
    }
    if (findRowById(sh, 10, iKey) > 0) {
      cache.put('idem_' + iKey, '1', 21600);
      return ok({ duplicate: true, idempotencyKey: iKey }, { message: 'duplicate skipped' });
    }
  }

  var empId = String(body.employeeId || body.EmployeeID || '');
  var meta = (!body.employeeName || !body.department) ? getEmployeeMeta(empId) : {};
  var employeeName = body.employeeName || body.EmployeeName || meta.employeeName || '';
  var department = body.department || body.Department || meta.department || '';

  sh.appendRow([
    body.timestamp || new Date().toISOString(),
    empId, employeeName, department,
    String(body.courseId||body.CourseID||''), body.moduleName||body.ModuleName||'', body.type||body.Type||'',
    body.score||'', body.passFail||'',
    iKey
  ]);
  if (iKey) CacheService.getScriptCache().put('idem_' + iKey, '1', 21600);
  logActivity(Object.assign({}, body, {
    employeeId: empId,
    employeeName: employeeName,
    department: department
  }), body.eventType||'record');
  return ok({ idempotencyKey: iKey });
}

function getEmployeeMeta(employeeId) {
  if (!employeeId) return {};
  var rows = getSheetData(SHEETS.employees);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].EmployeeID || '') === String(employeeId)) {
      return {
        employeeName: rows[i].EmployeeName || '',
        department: rows[i].Department || ''
      };
    }
  }
  return {};
}

// ── Save Admin ──
function saveAdmin(body, isEdit) {
  var sh  = getSheet(SHEETS.admins);
  ensureHeader(sh, ['AdminID','AdminName','Role','Department','Password','Status']);
  var row = isEdit ? findRowById(sh, 1, body.adminId) : -1;
  var data = [
    body.adminId||'', body.adminName||'', body.role||'',
    body.department||'', hashPassword(body.password||''), body.status||'active'
  ];
  if (row > 0) {
    sh.getRange(row, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  return ok({ adminId: String(body.adminId || '') });
}

// ── Delete Admin ──
function deleteAdmin(body) {
  var sh  = getSheet(SHEETS.admins);
  var row = findRowById(sh, 1, body.adminId);
  if (row > 0) sh.deleteRow(row);
  logActivity(body, 'delete_admin');
  return ok({ adminId: String(body.adminId || ''), deleted: row > 0 });
}

// ── Change Password (self — must supply current password) ──
function changePassword(body) {
  var targetType = body.targetType || 'employee'; // 'employee' | 'admin'
  var userId     = String(body.userId || '');
  var currentPw  = hashPassword(body.currentPassword || '');
  var newPw      = hashPassword(body.newPassword || '');
  if (!userId || !body.currentPassword || !body.newPassword) return fail('missing fields');

  if (targetType === 'admin') {
    var sh  = getSheet(SHEETS.admins);
    var row = findRowById(sh, 1, userId);
    if (row < 1) return fail('ไม่พบ Admin');
    var stored = hashPassword(String(sh.getRange(row, 5).getValue() || ''));
    if (stored !== currentPw) return fail('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    sh.getRange(row, 5).setValue(newPw);
    return ok({ userId: userId });
  } else {
    var sh2  = getSheet(SHEETS.employees);
    ensureHeader(sh2, ['EmployeeID','EmployeeName','Department','Position','Role','Password','StartDate','Email','Status','LastLogin']);
    var row2 = findRowById(sh2, 1, userId);
    if (row2 < 1) return fail('ไม่พบพนักงาน');
    var stored2 = hashPassword(String(sh2.getRange(row2, 6).getValue() || ''));
    if (stored2 !== currentPw) return fail('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    sh2.getRange(row2, 6).setValue(newPw);
    return ok({ userId: userId });
  }
}

// ── Reset Password (Super Admin only — no current password needed) ──
function resetPassword(body) {
  var targetType = body.targetType || 'employee';
  var userId     = String(body.userId || '');
  var newPw      = hashPassword(body.newPassword || '');
  if (!userId || !body.newPassword) return fail('missing fields');

  if (targetType === 'admin') {
    var sh  = getSheet(SHEETS.admins);
    var row = findRowById(sh, 1, userId);
    if (row < 1) return fail('ไม่พบ Admin');
    sh.getRange(row, 5).setValue(newPw);
    return ok({ userId: userId });
  } else {
    var sh2  = getSheet(SHEETS.employees);
    ensureHeader(sh2, ['EmployeeID','EmployeeName','Department','Position','Role','Password','StartDate','Email','Status','LastLogin']);
    var row2 = findRowById(sh2, 1, userId);
    if (row2 < 1) return fail('ไม่พบพนักงาน');
    sh2.getRange(row2, 6).setValue(newPw);
    return ok({ userId: userId });
  }
}

// ── Activity Log ──
function logActivity(body, eventType) {
  var sh = getSheet(SHEETS.activity_log);
  ensureHeader(sh, ['Timestamp','EmployeeID','EmployeeName','Department','EventType']);
  sh.appendRow([
    new Date().toISOString(),
    String(body.employeeId||body.EmployeeID||''),
    String(body.employeeName||body.EmployeeName||''),
    String(body.department||body.Department||''),
    eventType || body.eventType || ''
  ]);
  return ok();
}

// ============================================================
// EMAIL HELPERS — Admin Portal
// ============================================================
function sendDeadlineReminders(body) {
  var maxSend = Math.max(1, Math.min(parseInt(body.maxSend, 10) || 80, 200));
  var employees = getEmployees({ limit: 999999 }).data.items || [];
  var courses = getCourses().data || [];
  var records = getSheetData(SHEETS.training_records);
  var passed = {};

  records.forEach(function(r) {
    if (String(r.PassFail || '') === 'ผ่าน') {
      passed[String(r.EmployeeID || '') + '|' + String(r.CourseID || '')] = true;
    }
  });

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var sent = 0, skipped = 0, matched = 0;

  courses.forEach(function(c) {
    if (sent >= maxSend) return;
    var deadlineRaw = c.Deadline || c.deadline || '';
    if (!deadlineRaw) return;
    var deadline = parseSheetDate(deadlineRaw);
    if (!deadline) return;
    var daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
    if (daysLeft > 30) return;

    var courseId = String(c.CourseID || c.id || '');
    var courseTitle = String(c.Title || c.title || courseId);
    var courseDept = String(c.Department || c.dept || 'ทุกแผนก');

    employees.forEach(function(emp) {
      if (sent >= maxSend) return;
      var empId = String(emp.EmployeeID || emp.id || '');
      var empDept = String(emp.Department || emp.dept || '');
      var email = String(emp.Email || emp.email || '');
      if (!email) { skipped++; return; }
      if (courseDept !== 'ทุกแผนก' && courseDept !== empDept) return;
      if (passed[empId + '|' + courseId]) return;
      matched++;

      var subject = '[SML Learn] Reminder: ' + courseTitle;
      var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">' +
        '<h2 style="margin:0 0 12px">SML Learn Training Reminder</h2>' +
        '<p>เรียนคุณ ' + htmlEscape(emp.EmployeeName || emp.name || empId) + '</p>' +
        '<p>หลักสูตร <strong>' + htmlEscape(courseTitle) + '</strong> ยังไม่พบสถานะผ่านในระบบ</p>' +
        '<p>กำหนดเสร็จ: <strong>' + htmlEscape(formatDateForEmail(deadline)) + '</strong>' +
        (daysLeft < 0 ? ' <span style="color:#dc2626">(เลยกำหนด)</span>' : '') + '</p>' +
        '<p>กรุณาเข้าเรียน/ทำแบบทดสอบใน SML Learn ให้เรียบร้อย</p>' +
        '<p style="color:#6b7280;font-size:12px">This is an automated reminder from SML Learn.</p>' +
      '</div>';

      try {
        MailApp.sendEmail({
          to: email,
          subject: subject,
          htmlBody: html,
          body: 'SML Learn reminder: ' + courseTitle + ' deadline ' + formatDateForEmail(deadline)
        });
        sent++;
      } catch (err) {
        skipped++;
      }
    });
  });

  logActivity({ employeeId: 'ADMIN', employeeName: 'Admin', department: '-' }, 'send_deadline_reminders');
  return ok({ sent: sent, skipped: skipped, matched: matched, maxSend: maxSend });
}

function sendMonthlyReport(body) {
  var email = String(body.email || '').trim();
  if (!email) return fail('missing email');
  var dept = String(body.dept || '').trim();
  var summary = getSummary({ dept: dept }).data || {};
  var title = 'SML Learn Monthly Report' + (dept ? ' - ' + dept : '');
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">' +
    '<h2 style="margin:0 0 12px">' + htmlEscape(title) + '</h2>' +
    '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb">' +
      reportRow('Employees', summary.employees) +
      reportRow('Courses', summary.courses) +
      reportRow('Training records', summary.records) +
      reportRow('Active learners', summary.activeLearners) +
      reportRow('Passed records', summary.pass) +
      reportRow('Failed records', summary.fail) +
      reportRow('Quiz records', summary.quiz) +
      reportRow('Content records', summary.content) +
    '</table>' +
    '<p style="color:#6b7280;font-size:12px;margin-top:14px">Generated ' + htmlEscape(new Date().toISOString()) + '</p>' +
  '</div>';

  MailApp.sendEmail({
    to: email,
    subject: title,
    htmlBody: html,
    body: title + '\nRecords: ' + summary.records + '\nPassed: ' + summary.pass + '\nFailed: ' + summary.fail
  });

  logActivity({ employeeId: 'ADMIN', employeeName: 'Admin', department: dept || '-' }, 'send_monthly_report');
  return ok({ sent: 1, email: email, dept: dept || null });
}

function reportRow(label, value) {
  return '<tr><td style="border:1px solid #e5e7eb;color:#6b7280">' + htmlEscape(label) +
    '</td><td style="border:1px solid #e5e7eb;font-weight:700;text-align:right">' + htmlEscape(value || 0) + '</td></tr>';
}

function parseSheetDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    var d1 = new Date(value.getTime());
    d1.setHours(0, 0, 0, 0);
    return d1;
  }
  var s = String(value || '').trim();
  if (!s) return null;
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    var year = parseInt(m[1], 10);
    if (year > 2400) year -= 543;
    var d2 = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(d2.getTime()) ? null : d2;
  }
  var d3 = new Date(s);
  if (isNaN(d3.getTime())) return null;
  d3.setHours(0, 0, 0, 0);
  return d3;
}

function formatDateForEmail(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
}

function htmlEscape(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
