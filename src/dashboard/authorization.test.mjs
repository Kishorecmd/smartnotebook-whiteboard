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
  'attendance/save': { saved: 1 },
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

const saves = () => upstream.mock.calls.filter(([u]) => u.searchParams.get('url') === 'teacher-app/attendance/save');
it("saves today's register for the assigned class, keeping ERP remarks out of the browser", async () => {
  const cookie = await login();
  const response = await request('attendance', { mapping, records: [{ id: '1', status: 'absent' }] }, cookie);
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result).toEqual({ date: '2026-09-28', saved: 1, newlyAbsent: 1 });
  expect(JSON.stringify(result)).not.toContain('private remarks');
  const [[url, options]] = saves();
  expect(options.method).toBe('POST'); expect(url.searchParams.get('date')).toBeNull();
  expect(JSON.parse(options.body)).toEqual({ class_id: '3', section_id: '7', date: '2026-09-28', records: [{ student_id: 1, status: 'absent', remarks: 'private remarks' }] });
});
it('sends half day in the ERP spelling and counts only newly absent students', async () => {
  const cookie = await login();
  overrides.attendance = () => ok({ ...fixtures.attendance, already_saved: true, data: [{ ...fixtures.attendance.data[0], status: 'absent' }, { student_id: 2, full_name: 'Second', status: 'present' }] });
  const response = await request('attendance', { mapping, records: [{ id: '1', status: 'absent' }, { id: '2', status: 'half_day' }] }, cookie);
  expect(await response.json()).toMatchObject({ newlyAbsent: 0 });
  expect(JSON.parse(saves()[0][1].body).records.map(r => r.status)).toEqual(['absent', 'half day']);
});
it('rejects incomplete, unknown, duplicate or invalid registers before saving anything', async () => {
  const cookie = await login();
  overrides.attendance = () => ok({ ...fixtures.attendance, data: [...fixtures.attendance.data, { student_id: 2, full_name: 'Second', status: null }] });
  for (const records of [[], [{ id: '1', status: 'present' }], [{ id: '1', status: 'present' }, { id: '99', status: 'present' }], [{ id: '1', status: 'present' }, { id: '1', status: 'absent' }], [{ id: '1', status: 'present' }, { id: '2', status: 'excused' }], 'all present']) {
    const response = await request('attendance', { mapping, records }, cookie);
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ code: 'ATTENDANCE_INCOMPLETE' });
  }
  expect(saves()).toHaveLength(0);
});
it('refuses to save another class or without a class teacher session', async () => {
  expect((await request('attendance', { mapping, records: [{ id: '1', status: 'present' }] })).status).toBe(401);
  const cookie = await login();
  const response = await request('attendance', { mapping: { ...mapping, classId: '99' }, records: [{ id: '1', status: 'present' }] }, cookie);
  expect(response.status).toBe(403);
  expect(upstream.mock.calls.some(([u]) => /attendance/.test(u.searchParams.get('url')))).toBe(false);
});
it('does not save when the ERP register is for a different day', async () => {
  const cookie = await login();
  overrides.attendance = () => ok({ ...fixtures.attendance, date: '2026-09-27' });
  expect((await request('attendance', { mapping, records: [{ id: '1', status: 'present' }] }, cookie)).status).toBe(503);
  expect(saves()).toHaveLength(0);
});
