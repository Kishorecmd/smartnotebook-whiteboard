import express from 'express';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { classroomRouter } from '../../server/classroom.mjs';
import { SnapshotSchema } from './model';

const token = 'a'.repeat(64);
const classroom = { class_id: 3, section_id: 7, class_name: 'Grade 3', section_name: 'A' };
const mapping = { classId: '3', sectionId: '7', timezone: 'Asia/Kolkata', device: 'Board' };
let server, router, base, upstream, time, overrides;
const ok = data => ({ status: 200, ok: true, json: async () => ({ status: 'success', ...data }) });
const fixtures = {
  login: { api_token: token, teacher_name: 'Sample Teacher', email: 'private@example.test', classes: [{ class_id: 99, section_id: 99 }] },
  logout: {},
  'diary/sections': { data: [classroom], stats: { private: true } },
  profile: { data: { year_id: 12, full_name: 'Sample Teacher', phone: 'private phone' } },
  students: { data: [{ id: 1, full_name: 'Sample Student', photo: '/student.jpg', date_of_birth: '2018-09-28', father_phone: 'private phone', admission_number: 'private number' }] },
  attendance: { date: '2026-09-28', already_saved: false, data: [{ student_id: 1, full_name: 'Sample Student', status: null, remarks: 'private remarks', photo: '/student.jpg' }] },
  timetable: { data: { Monday: [{ class_id: 3, section_id: 7, period: 1, subject_name: 'Maths', start_time: '09:00:00', end_time: '09:40:00' }, { class_id: 9, section_id: 9, period: 2, subject_name: 'Other class lesson' }] } },
  homework: { data: [{ class_name: 'Grade 3', section_name: 'A', assigned_date: '2026-09-28', title: 'Read', description: 'Read a story' }, { class_name: 'Grade 4', section_name: 'A', assigned_date: '2026-09-28', title: 'Other class homework' }] },
  notices: { data: [{ title: 'Staff', message: 'Teacher reminder', target_scope: 'teachers' }, { title: 'School', message: 'Reading day', target_scope: 'all' }] },
};
beforeEach(async () => {
  time = Date.parse('2026-09-28T04:00:00Z'); overrides = {};
  upstream = vi.fn(async (url, options) => {
    expect(url.origin).toBe('https://erp.jaihind.school');
    expect(options.redirect).toBe('error');
    const route = url.searchParams.get('url').replace('teacher-app/', '');
    if (overrides[route]) return overrides[route](url, options);
    if (!fixtures[route]) throw new Error(`Unexpected route ${route}`);
    if (route !== 'login') expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    return ok(fixtures[route]);
  });
  router = classroomRouter({ fetchImpl: upstream, now: () => time });
  const app = express(); app.set('trust proxy', 'loopback'); app.use(express.json()); app.use('/api/classroom', router);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { router.close(); await new Promise(resolve => server.close(resolve)); });
const request = (path, body, cookie = '', extra = {}) => fetch(`${base}/api/classroom/${path}`, { method: body ? 'POST' : 'GET', headers: { Origin: base, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
const login = async () => { const response = await request('login', { credential: 'class.teacher', password: 'sample-only' }); expect(response.status).toBe(200); return response.headers.get('set-cookie').split(';')[0]; };

it('uses ERP class teacher assignments and keeps its token out of browser responses', async () => {
  const response = await request('login', { credential: 'class.teacher', password: 'sample-only' });
  expect(await response.json()).toEqual({ role: 'teacher', name: 'Sample Teacher', classes: [{ classId: '3', sectionId: '7', grade: 'Grade 3', section: 'A' }] });
  const cookie = response.headers.get('set-cookie'); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict'); expect(cookie).not.toContain(token);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(upstream.mock.calls[0][1].body).toBe(JSON.stringify({ username: 'class.teacher', password: 'sample-only', device_info: 'Jaihind Smart Classroom' }));
  expect(upstream.mock.calls.map(([u]) => u.searchParams.get('url'))).toEqual(['teacher-app/login', 'teacher-app/diary/sections']);
});
it('rejects subject teachers with no class teacher assignment and revokes the token', async () => {
  overrides['diary/sections'] = () => ok({ data: [] });
  const response = await request('login', { credential: 'subject.teacher', password: 'sample-only' });
  expect(response.status).toBe(403); expect(await response.json()).toEqual({ code: 'CLASS_TEACHER_REQUIRED' });
  expect(upstream.mock.calls.some(([u]) => u.searchParams.get('url') === 'teacher-app/logout')).toBe(true);
});
it('rejects invalid credentials without leaking ERP error details', async () => {
  overrides.login = () => ({ status: 401, ok: false });
  const response = await request('login', { credential: 'teacher', password: 'wrong' });
  expect(response.status).toBe(401); expect(await response.json()).toEqual({ code: 'SIGN_IN_REQUIRED' });
});
it('does not accept administrator login', async () => {
  const response = await request('login', { role: 'administrator', credential: 'admin', password: 'sample-only' });
  expect(response.status).toBe(400); expect(upstream).not.toHaveBeenCalled();
});
it('uses server class labels and verifies assignments when saving the board choice', async () => {
  const cookie = await login();
  const response = await request('mapping', { ...mapping, grade: 'Forged grade', section: 'Forged section', proof: 'forged' }, cookie);
  expect(await response.json()).toEqual({ mapping: { ...mapping, grade: 'Grade 3', section: 'A' } });
});
it('denies a modified class ID before reading any student records', async () => {
  const cookie = await login(); upstream.mockClear();
  const response = await request('snapshot', { mapping: { ...mapping, classId: '99' } }, cookie);
  expect(response.status).toBe(403);
  expect(upstream.mock.calls.some(([u]) => /students|attendance/.test(u.searchParams.get('url')))).toBe(false);
});
it('rechecks class teacher assignments after login', async () => {
  const cookie = await login(); overrides['diary/sections'] = () => ok({ data: [] });
  const response = await request('snapshot', { mapping }, cookie);
  expect(response.status).toBe(403);
  expect((await request('session', undefined, cookie)).status).toBe(401);
});
it('returns minimal class data with unmarked attendance and no persistent photo URLs', async () => {
  const cookie = await login(); const response = await request('snapshot', { mapping }, cookie);
  expect(response.status).toBe(200); const result = await response.json(); expect(SnapshotSchema.safeParse(result).success).toBe(true);
  expect(result.attendance).toMatchObject({ marked: false, total: 1, absent: 0, unmarked: 1 });
  expect(result.students).toEqual([{ id: '1', name: 'Sample Student', photo: null, birthday: true }]);
  expect(result.timetable.complete).toBe(false); expect(result.timetable.periods).toHaveLength(1); expect(result.homework).toHaveLength(1);
  expect(result.notices.map(n => n.public)).toEqual([false, true]);
  expect(JSON.stringify(result)).not.toMatch(/private phone|private number|private remarks|2018-09-28|Other class/);
});
it('keeps attendance usable if an optional feed fails, but rejects expired tokens', async () => {
  const cookie = await login(); overrides.timetable = () => { throw new Error('offline'); };
  expect((await request('snapshot', { mapping }, cookie)).status).toBe(200);
  overrides.notices = () => ({ status: 401, ok: false });
  expect((await request('snapshot', { mapping }, cookie)).status).toBe(401);
  expect((await request('session', undefined, cookie)).status).toBe(401);
});
it('rejects cross-origin and missing-origin sign-ins before forwarding credentials', async () => {
  for (const origin of ['https://other.example', '']) expect((await request('login', { credential: 'teacher', password: 'sample-only' }, '', { Origin: origin })).status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});
it('sets secure session cookies behind the trusted production HTTPS proxy', async () => {
  const response = await request('login', { credential: 'teacher', password: 'sample-only' }, '', { Origin: 'https://whiteboard.jaihind.school', 'X-Forwarded-Proto': 'https' });
  expect(response.status).toBe(200); expect(response.headers.get('set-cookie')).toContain('Secure');
});
it('expires idle sessions and ignores forged session IDs', async () => {
  const cookie = await login(); time += 31 * 60_000;
  expect((await request('session', undefined, cookie)).status).toBe(401);
  expect((await request('session', undefined, `jhw_class_teacher=${'f'.repeat(64)}`)).status).toBe(401);
});
it('enforces the absolute session limit even with recent activity', async () => {
  const cookie = await login();
  for (let i = 0; i < 16; i++) { time += 29 * 60_000; expect((await request('session', undefined, cookie)).status).toBe(200); }
  time += 17 * 60_000; expect((await request('session', undefined, cookie)).status).toBe(401);
});
it('invalidates the local session on sign-out even when ERP logout is unavailable', async () => {
  const cookie = await login(); overrides.logout = () => { throw new Error('offline'); };
  const response = await request('logout', {}, cookie); expect(response.status).toBe(200); expect(response.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
  expect((await request('snapshot', { mapping }, cookie)).status).toBe(401);
});
it('limits repeated sign-in attempts', async () => {
  overrides.login = () => ({ status: 401, ok: false });
  for (let i = 0; i < 5; i++) expect((await request('login', { credential: 'teacher', password: 'wrong' })).status).toBe(401);
  expect((await request('login', { credential: 'teacher', password: 'wrong' })).status).toBe(429);
});
const classDay = (extra = {}) => ok({ date: '2026-09-28', day: 'Monday', year_id: 12, year_label: '2026-2027', class_id: 3, section_id: 7, holiday: null,
  timeline: [{ period_number: 1, label: 'Assembly', start_time: '08:30', end_time: '08:45', is_break: true, subject_name: null, teacher_name: null }, { period_number: 2, label: 'Period 1', start_time: '08:45', end_time: '09:30', is_break: false, subject_name: 'English', teacher_name: 'Other Teacher' }, { period_number: 7, label: 'Lunch Break', start_time: '12:00', end_time: '12:45', is_break: true }],
  homework: [{ id: 5, class_id: 3, section_id: 7, title: 'Spellings', description: 'Learn ten words', subject_name: 'English', assigned_date: '2026-09-28' }, { id: 6, class_id: 4, section_id: 7, title: 'Other class homework', assigned_date: '2026-09-28' }], ...extra });
it('shows the whole section day from the ERP classroom feed when it is available', async () => {
  const cookie = await login(); overrides['classroom/day'] = url => { expect(url.searchParams.get('class_id')).toBe('3'); expect(url.searchParams.get('date')).toBe('2026-09-28'); return classDay(); };
  const result = await (await request('snapshot', { mapping }, cookie)).json();
  expect(SnapshotSchema.safeParse(result).success).toBe(true);
  expect(result.academicYear).toBe('2026-2027');
  expect(result.timetable.complete).toBe(true);
  expect(result.timetable.periods.map(p => [p.subject, p.kind, p.teacher])).toEqual([['Assembly', 'break', ''], ['English', 'lesson', 'Other Teacher'], ['Lunch Break', 'lunch', '']]);
  expect(result.homework).toEqual([{ title: 'Spellings', text: 'Learn ten words', subject: 'English' }]);
  expect(JSON.stringify(result)).not.toMatch(/Other class/);
});
it('reports an ERP holiday instead of a timetable', async () => {
  const cookie = await login(); overrides['classroom/day'] = () => classDay({ holiday: { name: 'Gandhi Jayanti', scope: 'whole_school' } });
  const result = await (await request('snapshot', { mapping }, cookie)).json();
  expect(result.timetable).toEqual({ complete: true, holiday: 'Gandhi Jayanti', periods: [] });
});
it('falls back to the teacher’s own lessons when the classroom feed is for another class or date', async () => {
  const cookie = await login(); overrides['classroom/day'] = () => classDay({ date: '2026-09-27' });
  let result = await (await request('snapshot', { mapping }, cookie)).json();
  expect(result.timetable.complete).toBe(false); expect(result.academicYear).toBeUndefined();
  overrides['classroom/day'] = () => classDay({ section_id: 8 });
  result = await (await request('snapshot', { mapping }, cookie)).json();
  expect(result.timetable.complete).toBe(false);
});
it('treats a refused classroom feed as lost access', async () => {
  const cookie = await login(); overrides['classroom/day'] = () => ({ status: 403, ok: false });
  expect((await request('snapshot', { mapping }, cookie)).status).toBe(403);
  expect((await request('session', undefined, cookie)).status).toBe(401);
});
