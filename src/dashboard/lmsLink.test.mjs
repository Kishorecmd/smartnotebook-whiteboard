import { createHmac, randomBytes } from 'node:crypto';
import express from 'express';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { classroomRouter } from '../../server/classroom.mjs';
import { lmsConfig, verifyLmsAssertion } from '../../server/classroom-lms.mjs';

const token = 'a'.repeat(64);
const lms = { secret: 's'.repeat(40), token: 't'.repeat(40), base: 'https://lms.jaihind.school' };
const classroom = { class_id: 3, section_id: 7, class_name: 'LKG', section_name: 'A' };
let server, router, base, upstream, time, lmsRoutes, loginUserId;
const ok = data => ({ status: 200, ok: true, json: async () => ({ status: 'success', ...data }) });
const lmsReply = (status, body) => ({ status, ok: status < 300, headers: new Headers({ 'content-type': 'application/json' }), text: async () => JSON.stringify(body) });

beforeEach(async () => {
  time = Date.parse('2026-10-10T04:00:00Z'); loginUserId = 41;
  lmsRoutes = {
    'GET /api/whiteboard/courses': () => lmsReply(200, { success: true, data: { courses: [{ id: 5, title: 'Phonics', subject_name: 'English', class_name: 'LKG', course_status: 'published', lesson_count: 12, whiteboard_count: 4, short_description: 'private notes' }] } }),
    'GET /api/whiteboard/courses/5': () => lmsReply(200, { success: true, data: { course: { id: 5, title: 'Phonics', class_name: 'LKG' }, units: [{ id: 1, title: 'Unit 1' }], lessons: [{ id: 9, title: 'Letter A', unit_id: 1, duration_minutes: 30, status: 'published', whiteboard: { pages: 3, version: 2 } }], can_edit: true, resources: [{ url: 'private' }] } }),
    'GET /api/whiteboard/lessons/9/board': () => lmsReply(200, { success: true, data: { lesson: { id: 9, title: 'Letter A', course_id: 5, course_title: 'Phonics' }, version: 2, teacher_notes: 'private', package: '{"format":"jaihind-whiteboard-package"}' } }),
    'PUT /api/whiteboard/lessons/9/board': () => lmsReply(200, { success: true, data: { version: 3, pages: 3 } }),
  };
  upstream = vi.fn(async (url, options) => {
    expect(options.redirect).toBe('error');
    if (url.origin === lms.base) {
      expect(options.headers.Authorization).toBe(`Bearer ${lms.token}`);
      const reply = lmsRoutes[`${options.method} ${url.pathname}`];
      if (!reply) throw new Error(`Unexpected LMS route ${options.method} ${url.pathname}`);
      return reply(url, options);
    }
    const route = url.searchParams.get('url').replace('teacher-app/', '');
    if (route === 'login') return ok({ api_token: token, user_id: loginUserId, teacher_name: 'Sample Teacher' });
    if (route === 'logout') return ok({});
    if (route === 'diary/sections') return ok({ data: [classroom] });
    throw new Error(`Unexpected ERP route ${route}`);
  });
  router = classroomRouter({ fetchImpl: upstream, now: () => time, lms });
  const app = express(); app.set('trust proxy', 'loopback'); app.use(express.json()); app.use('/api/classroom', router);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { router.close(); await new Promise(resolve => server.close(resolve)); });

const request = (path, { method, body, cookie } = {}) => fetch(`${base}/api/classroom/${path}`, { method: method || (body ? 'POST' : 'GET'), headers: { Origin: base, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const login = async () => { const response = await request('login', { body: { credential: 'class.teacher', password: 'sample-only' } }); expect(response.status).toBe(200); return response.headers.get('set-cookie').split(';')[0]; };
const assertion = (changes = {}, secret = lms.secret) => {
  const iat = Math.floor(time / 1000);
  const body = Buffer.from(JSON.stringify({ iss: 'lms.jaihind.school', aud: 'whiteboard.jaihind.school', iat, exp: iat + 120, nonce: randomBytes(16).toString('hex'), user: { id: 41, user_id: 41, role: 'teacher', name: 'Sample Teacher' }, ...changes })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
const callback = (value, cookie, origin = lms.base) => fetch(`${base}/api/classroom/lms/callback`, { method: 'POST', redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) }, body: new URLSearchParams({ assertion: value }) });
const outcome = response => new URL(response.headers.get('location'), base).searchParams.get('lmsLink');
const session = async cookie => (await (await request('session', { cookie })).json()).lms;

it('links the LMS when it is the teacher signed in to the board, and forwards only that teacher', async () => {
  const cookie = await login();
  expect(await session(cookie)).toEqual({ available: true, connected: false, name: null });
  const response = await callback(assertion(), cookie);
  expect(response.status).toBe(303); expect(outcome(response)).toBe('connected');
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(await session(cookie)).toEqual({ available: true, connected: true, name: 'Sample Teacher' });

  const courses = await request('lms/courses', { cookie });
  expect(courses.headers.get('cache-control')).toContain('no-store');
  expect(await courses.json()).toEqual({ courses: [{ id: 5, title: 'Phonics', subject: 'English', className: 'LKG', status: 'published', lessons: 12, boards: 4 }] });
  const [, options] = upstream.mock.calls.find(([url]) => url.pathname === '/api/whiteboard/courses');
  expect(JSON.parse(Buffer.from(options.headers['X-Whiteboard-Actor'], 'base64url').toString())).toEqual({ id: 41, user_id: 41, role: 'teacher', name: 'Sample Teacher' });
  expect(options.headers.Authorization).not.toContain(token);

  const course = await (await request('lms/courses/5', { cookie })).json();
  expect(course).toEqual({ course: { id: 5, title: 'Phonics', subject: null, className: 'LKG' }, units: [{ id: 1, title: 'Unit 1' }], lessons: [{ id: 9, title: 'Letter A', unitId: 1, minutes: 30, status: 'published', board: { pages: 3, version: 2 } }], canEdit: true });
  const board = await (await request('lms/lessons/9/board', { cookie })).json();
  expect(board).toEqual({ lesson: { id: 9, title: 'Letter A', courseId: 5, courseTitle: 'Phonics' }, version: 2, package: '{"format":"jaihind-whiteboard-package"}' });
});

it('refuses an LMS account that is not the signed-in teacher', async () => {
  loginUserId = 77;
  const cookie = await login();
  expect(outcome(await callback(assertion(), cookie))).toBe('LMS_TEACHER_MISMATCH');
  expect((await session(cookie)).connected).toBe(false);
  expect(await (await request('lms/courses', { cookie })).json()).toEqual({ code: 'LMS_LINK_REQUIRED' });
});

it('refuses a link before the ERP reports the teacher user id', async () => {
  loginUserId = undefined;
  const cookie = await login();
  expect(outcome(await callback(assertion(), cookie))).toBe('LMS_TEACHER_MISMATCH');
});

it('accepts each hand-off once and rejects forged, expired or misdirected ones', async () => {
  const cookie = await login();
  const once = assertion();
  expect(outcome(await callback(once, cookie))).toBe('connected');
  expect(outcome(await callback(once, cookie))).toBe('LMS_LINK_EXPIRED');
  const seen = new Map();
  const check = value => verifyLmsAssertion(value, { secret: lms.secret, now: time, seen }).error;
  expect(check(assertion({}, 'x'.repeat(40)))).toBe('LMS_LINK_INVALID');
  expect(check(assertion({ aud: 'lms.jaihind.school' }))).toBe('LMS_LINK_INVALID');
  expect(check(assertion({ exp: Math.floor(time / 1000) - 1 }))).toBe('LMS_LINK_EXPIRED');
  expect(check(assertion({ iat: Math.floor(time / 1000) + 120, exp: Math.floor(time / 1000) + 240 }))).toBe('LMS_LINK_EXPIRED');
  expect(check(assertion({ exp: Math.floor(time / 1000) + 600 }))).toBe('LMS_LINK_EXPIRED');
  expect(check('not-an-assertion')).toBe('LMS_LINK_INVALID');
});

it('takes the hand-off only from the LMS, and only with a classroom sign-in', async () => {
  const cookie = await login();
  expect((await callback(assertion(), cookie, 'https://evil.example')).status).toBe(403);
  expect(outcome(await callback(assertion()))).toBe('SIGN_IN_REQUIRED');
  expect((await session(cookie)).connected).toBe(false);
});

it('limits hand-off attempts', async () => {
  const cookie = await login();
  for (let i = 0; i < 5; i++) await callback('bad', cookie);
  expect(outcome(await callback(assertion(), cookie))).toBe('TRY_LATER');
});

it('ends the link with the classroom sign-in and on Disconnect', async () => {
  let cookie = await login();
  await callback(assertion(), cookie);
  expect((await request('lms/disconnect', { body: {}, cookie })).status).toBe(200);
  expect((await session(cookie)).connected).toBe(false);
  await callback(assertion(), cookie);
  await request('logout', { body: {}, cookie });
  cookie = await login();
  expect((await session(cookie)).connected).toBe(false);
  time += 31 * 60_000;
  expect((await request('lms/courses', { cookie })).status).toBe(401);
});

it('keeps the classroom sign-in when the LMS refuses a lesson', async () => {
  const cookie = await login();
  await callback(assertion(), cookie);
  lmsRoutes['GET /api/whiteboard/courses/5'] = () => lmsReply(403, { success: false, message: 'You do not have access to this course' });
  const refused = await request('lms/courses/5', { cookie });
  expect(refused.status).toBe(404); expect(await refused.json()).toEqual({ code: 'LMS_NOT_FOUND' });
  lmsRoutes['GET /api/whiteboard/courses'] = () => lmsReply(401, { success: false });
  expect(await (await request('lms/courses', { cookie })).json()).toEqual({ code: 'LMS_UNAVAILABLE' });
  expect((await request('session', { cookie })).status).toBe(200);
  expect((await request('lms/courses/abc', { cookie })).status).toBe(404);
});

it('saves to the lesson with the version it was opened at and reports conflicts', async () => {
  const cookie = await login();
  await callback(assertion(), cookie);
  const save = (body, origin = base) => fetch(`${base}/api/classroom/lms/lessons/9/board`, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
  const saved = await save({ package: '{"pages":[]}', expectedVersion: 2 });
  expect(await saved.json()).toEqual({ version: 3 });
  const [, options] = upstream.mock.calls.find(([url, o]) => o.method === 'PUT');
  expect(JSON.parse(options.body)).toEqual({ package: '{"pages":[]}', expected_version: 2 });
  lmsRoutes['PUT /api/whiteboard/lessons/9/board'] = () => lmsReply(409, { success: false, message: 'Someone else saved this whiteboard after you opened it.' });
  const conflict = await save({ package: '{"pages":[]}', expectedVersion: 2 });
  expect(conflict.status).toBe(409); expect(await conflict.json()).toEqual({ code: 'LMS_VERSION_CONFLICT' });
  expect((await save({ package: '', expectedVersion: 2 })).status).toBe(400);
  expect((await save({ package: '{}', expectedVersion: 2 }, 'https://evil.example')).status).toBe(403);
  expect((await request('session', { cookie })).status).toBe(200);
});

it('stays off until all three settings are present', async () => {
  expect(lmsConfig({})).toBeNull();
  expect(lmsConfig({ LMS_SSO_SECRET: 's'.repeat(40), LMS_API_TOKEN: 't'.repeat(40), LMS_BASE_URL: 'http://lms.jaihind.school' })).toBeNull();
  expect(lmsConfig({ LMS_SSO_SECRET: 'short', LMS_API_TOKEN: 't'.repeat(40), LMS_BASE_URL: 'https://lms.jaihind.school' })).toBeNull();
  expect(lmsConfig({ LMS_SSO_SECRET: 's'.repeat(40), LMS_API_TOKEN: 't'.repeat(40), LMS_BASE_URL: 'https://lms.jaihind.school/' })).toEqual(lms);

  router.close(); await new Promise(resolve => server.close(resolve));
  router = classroomRouter({ fetchImpl: upstream, now: () => time, lms: null });
  const app = express(); app.use(express.json()); app.use('/api/classroom', router);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const cookie = await login();
  expect(await session(cookie)).toEqual({ available: false, connected: false, name: null });
  expect(outcome(await callback(assertion(), cookie))).toBe('LMS_NOT_CONFIGURED');
});
