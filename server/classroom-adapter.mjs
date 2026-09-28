/** Verified ERP response adapters. */
export const ERP_BASE = 'https://erp.jaihind.school/public/index.php';
export const clean = (v, max = 200) => typeof v === 'string' ? v.slice(0, max) : '';
export function classesFromTeacher(rows = []) {
  return rows.map(r => ({ classId: String(r.class_id), sectionId: String(r.section_id), grade: clean(r.class_name), section: clean(r.section_name) })).filter(r => /^\d+$/.test(r.classId) && /^\d+$/.test(r.sectionId));
}
export function classesFromAdmin(rows = []) {
  return rows.flatMap(c => (c.sections || []).map(s => ({ classId: String(c.id), sectionId: String(s.id), grade: clean(c.name), section: clean(s.name) })));
}
export function photoUrl(value) {
  if (!value) return null;
  try { const url = new URL(value, 'https://erp.jaihind.school/'); return url.origin === 'https://erp.jaihind.school' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function minimalStudents(rows, monthDay) {
  return rows.map(s => ({ id: String(s.id), name: clean(s.full_name), photo: photoUrl(s.photo), birthday: typeof s.date_of_birth === 'string' && s.date_of_birth.slice(5, 10) === monthDay }));
}
export function attendanceFromERP(payload) {
  const students = (payload.data || []).map(s => ({ id: String(s.student_id), name: clean(s.full_name), photo: photoUrl(s.photo), status: ['present', 'absent', 'late', 'half_day', 'leave'].includes(s.status?.toLowerCase()) ? s.status.toLowerCase() : 'unmarked' }));
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
