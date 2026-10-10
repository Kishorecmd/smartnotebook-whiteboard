/** Verified ERP response adapters. */
export const ERP_BASE = 'https://erp.jaihind.school/public/index.php';
// Teacher passwords are forwarded to the ERP, so a non-default base must be
// HTTPS, or plain HTTP only to this machine (a local XAMPP Antigravity).
export function erpBase(value = ERP_BASE) {
  let url;
  try { url = new URL(value); } catch { throw new Error('CLASSROOM_ERP_BASE_URL is not a valid URL'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) throw new Error('CLASSROOM_ERP_BASE_URL must be https://…/index.php, or http:// on localhost');
  return url.href;
}
export const clean = (v, max = 200) => typeof v === 'string' ? v.slice(0, max) : '';
export function classesFromTeacher(rows = []) {
  return rows.map(r => ({ classId: String(r.class_id), sectionId: String(r.section_id), grade: clean(r.class_name), section: clean(r.section_name) })).filter(r => /^\d+$/.test(r.classId) && /^\d+$/.test(r.sectionId));
}
export function classesFromAdmin(rows = []) {
  return rows.flatMap(c => (c.sections || []).map(s => ({ classId: String(c.id), sectionId: String(s.id), grade: clean(c.name), section: clean(s.name) })));
}
/** An ERP photo as an absolute URL on the ERP's own site, or null. Student
 * photos are stored as 'uploads/photos/x.jpg' relative to the site root, which
 * is the folder above /public/index.php; a bare file name lives in that folder. */
export function photoUrl(value, base = ERP_BASE) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) return null;
  try {
    const root = new URL('../', base);
    const url = /^https?:\/\//i.test(v) ? new URL(v) : new URL((v.includes('/') ? v : `uploads/photos/${v}`).replace(/^\/+/, '').replace(/^public\//, ''), root);
    return url.origin === root.origin && !url.username && !url.password && /\.(jpe?g|png|webp|gif)$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
export function minimalStudents(rows, monthDay, base) {
  return rows.map(s => ({ id: String(s.id), name: clean(s.full_name), photo: photoUrl(s.photo, base), birthday: typeof s.date_of_birth === 'string' && s.date_of_birth.slice(5, 10) === monthDay }));
}
// The ERP stores 'Half Day' and reports it lowercased with a space.
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'leave'];
const statusFromERP = value => { const s = typeof value === 'string' ? value.trim().toLowerCase().replace(' ', '_') : ''; return ATTENDANCE_STATUSES.includes(s) ? s : 'unmarked'; };
export const statusToERP = status => status === 'half_day' ? 'half day' : status;
export function attendanceFromERP(payload, base) {
  const students = (payload.data || []).map(s => ({ id: String(s.student_id), name: clean(s.full_name), photo: photoUrl(s.photo, base), status: statusFromERP(s.status) }));
  const present = students.filter(s => s.status === 'present' || s.status === 'late').length;
  const absent = students.filter(s => s.status === 'absent').length;
  const late = students.filter(s => s.status === 'late').length;
  const unmarked = students.filter(s => s.status === 'unmarked').length;
  return { date: clean(payload.date, 10), marked: payload.already_saved === true, total: students.length, present, absent, late, unmarked, other: students.length - present - absent - unmarked, percentage: students.length ? Math.round(present / students.length * 1000) / 10 : null, students };
}
export function teacherLessons(payload, mapping, weekday, teacher) {
  return (payload.data?.[weekday] || []).filter(r => String(r.class_id) === mapping.classId && String(r.section_id) === mapping.sectionId).map(r => ({ id: String(r.period), subject: clean(r.subject_name || r.period_label || 'Lesson'), start: /^\d\d:\d\d/.test(r.start_time || '') ? r.start_time.slice(0, 5) : null, end: /^\d\d:\d\d/.test(r.end_time || '') ? r.end_time.slice(0, 5) : null, teacher, kind: 'lesson' }));
}
export function dayParts(now, timezone = 'Asia/Kolkata') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday };
}
