import { randomBytes } from 'node:crypto';
import express from 'express';
import { erpBase, clean, classesFromTeacher, minimalStudents, attendanceFromERP, teacherLessons, dayParts, photoUrl, ATTENDANCE_STATUSES, statusToERP } from './classroom-adapter.mjs';

const COOKIE = 'jhw_class_teacher';
const IDLE = 30 * 60_000;
const MAX_AGE = 8 * 60 * 60_000;
const routes = new Set(['login', 'logout', 'profile', 'diary/sections', 'students', 'attendance', 'attendance/save', 'timetable', 'homework', 'notices']);
const failure = (status, code) => Object.assign(new Error(code), { status, code });
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHOTO_MAX_BYTES = 3_000_000;

// Tokens and private classroom responses never go into persistent storage.
export function classroomRouter({ fetchImpl = fetch, now = Date.now, base = erpBase() } = {}) {
  const router = express.Router();
  const sessions = new Map();
  const attempts = new Map();
  const cookieOptions = req => ({ httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/api/classroom' });
  const sessionId = req => /(?:^|;\s*)jhw_class_teacher=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];

  async function erp(route, token, query, body) {
    if (!routes.has(route)) throw failure(503, 'ERP_UNAVAILABLE');
    const url = new URL(base);
    url.searchParams.set('url', `teacher-app/${route}`);
    for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
    let response;
    try {
      response = await fetchImpl(url, { method: body ? 'POST' : 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status === 401) throw failure(401, 'SIGN_IN_REQUIRED');
      if (response.status === 403) throw failure(403, 'CLASS_ACCESS_DENIED');
      if (!response.ok) throw failure(503, 'ERP_UNAVAILABLE');
      const data = await response.json();
      if (data.status !== 'success') throw failure(503, 'ERP_UNAVAILABLE');
      return data;
    } catch (error) { throw Number.isInteger(error.status) && typeof error.code === 'string' ? error : failure(503, 'ERP_UNAVAILABLE'); }
  }
  const revoke = token => erp('logout', token, null, {}).catch(() => {});
  const discard = id => { const s = sessions.get(id); sessions.delete(id); if (s) void revoke(s.token); };
  const valid = s => s && now() - s.created < MAX_AGE && now() - s.lastSeen < IDLE;
  const sweep = () => {
    for (const [id, s] of sessions) if (!valid(s)) discard(id);
    for (const [ip, bucket] of attempts) if (bucket.until <= now()) attempts.delete(ip);
  };
  const timer = setInterval(sweep, 60_000);
  timer.unref();
  router.close = () => { clearInterval(timer); sessions.clear(); attempts.clear(); };

  router.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store, private', Pragma: 'no-cache', 'Cross-Origin-Resource-Policy': 'same-origin' });
    res.removeHeader('Access-Control-Allow-Origin');
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && ['127.0.0.1', 'localhost', '[::1]'].includes(req.hostname);
    if (!req.secure && !local) return res.status(403).json({ code: 'HTTPS_REQUIRED' });
    const expected = local && !req.secure ? `http://${req.get('host')}` : 'https://whiteboard.jaihind.school';
    if ((req.get('origin') && req.get('origin') !== expected) || (req.method !== 'GET' && req.get('origin') !== expected) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ code: 'ORIGIN_DENIED' });
    if (req.method === 'POST' && !req.is('application/json')) return res.status(415).json({ code: 'JSON_REQUIRED' });
    sweep();
    next();
  });

  async function scope(s) {
    // Ordinary teaching assignments include subject teachers. Only the diary
    // class-teacher endpoint is authoritative for classroom authorization.
    const result = await erp('diary/sections', s.token);
    if (!Array.isArray(result.data)) throw failure(503, 'ERP_UNAVAILABLE');
    const classes = classesFromTeacher(result.data);
    if (!classes.length) throw failure(403, 'CLASS_TEACHER_REQUIRED');
    return classes;
  }
  function active(req) {
    const id = sessionId(req), s = sessions.get(id);
    if (!valid(s)) { discard(id); throw failure(401, 'SIGN_IN_REQUIRED'); }
    s.lastSeen = now();
    return s;
  }
  function stillActive(req, s) {
    if (sessions.get(sessionId(req)) !== s || !valid(s)) throw failure(401, 'SIGN_IN_REQUIRED');
  }
  // Photos reach the browser as random per-session addresses, never ERP URLs,
  // so they stop working at sign-out and nothing about the ERP is exposed.
  function photoRef(s, url) {
    if (!url) return null;
    let id = s.photoIds.get(url);
    if (!id) {
      if (s.photos.size >= 2000) return null;
      id = randomBytes(16).toString('hex');
      s.photoIds.set(url, id); s.photos.set(id, url);
    }
    return `/api/classroom/photo/${id}`;
  }
  function mappingFrom(body, classes) {
    const selected = classes.find(c => c.classId === body?.classId && c.sectionId === body?.sectionId);
    if (!selected) throw failure(403, 'CLASS_ACCESS_DENIED');
    const timezone = clean(body.timezone || 'Asia/Kolkata', 80);
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw failure(400, 'INVALID_TIMEZONE'); }
    return { ...selected, timezone, device: clean(body.device, 80).trim() || `${selected.grade} · ${selected.section}` };
  }

  router.post('/login', async (req, res, next) => {
    let token;
    try {
      const key = req.ip;
      const bucket = attempts.get(key) || { count: 0, until: now() + 5 * 60_000 };
      if (bucket.count >= 5 || (!attempts.has(key) && attempts.size >= 1000) || sessions.size >= 500) throw failure(429, 'TRY_LATER');
      bucket.count++; attempts.set(key, bucket);
      const credential = clean(req.body?.credential, 254).trim();
      const password = req.body?.password;
      if (!credential || typeof password !== 'string' || !password || password.length > 1024 || (req.body.role && req.body.role !== 'teacher')) throw failure(400, 'INVALID_LOGIN');
      const result = await erp('login', null, null, { username: credential, password, device_info: 'Jaihind Smart Classroom' });
      token = result.api_token;
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw failure(503, 'ERP_UNAVAILABLE');
      const s = { token, credential, name: clean(result.teacher_name), created: now(), lastSeen: now(), photos: new Map(), photoIds: new Map() };
      const classes = await scope(s);
      discard(sessionId(req));
      const id = randomBytes(32).toString('hex');
      sessions.set(id, s);
      res.cookie(COOKIE, id, cookieOptions(req));
      res.json({ role: 'teacher', name: s.name, classes });
    } catch (error) { if (token) await revoke(token); next(error); }
  });
  // Leaving Student Mode needs the teacher: the signed-in teacher's ERP password
  // is checked with a fresh login whose token is revoked at once. A wrong
  // password is an ordinary answer here and must not end the session.
  router.post('/confirm', async (req, res, next) => {
    try {
      const s = active(req);
      const key = `confirm:${req.ip}`;
      const bucket = attempts.get(key) || { count: 0, until: now() + 5 * 60_000 };
      if (bucket.count >= 5 || (!attempts.has(key) && attempts.size >= 1000)) throw failure(429, 'TRY_LATER');
      const password = req.body?.password;
      if (typeof password !== 'string' || !password || password.length > 1024) throw failure(400, 'PASSWORD_REQUIRED');
      bucket.count++; attempts.set(key, bucket);
      let result;
      try { result = await erp('login', null, null, { username: s.credential, password, device_info: 'Jaihind Smart Classroom unlock' }); }
      catch (error) { if ([401, 403].includes(error.status)) return res.status(400).json({ code: 'PASSWORD_INCORRECT' }); throw error; }
      if (typeof result.api_token === 'string') await revoke(result.api_token);
      stillActive(req, s);
      attempts.delete(key);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  router.post('/logout', async (req, res) => {
    const id = sessionId(req), s = sessions.get(id);
    sessions.delete(id);
    res.clearCookie(COOKIE, cookieOptions(req));
    if (s) await revoke(s.token);
    res.json({ ok: true });
  });
  router.get('/session', async (req, res, next) => {
    try { const s = active(req); const classes = await scope(s); stillActive(req, s); res.json({ role: 'teacher', name: s.name, classes }); } catch (e) { next(e); }
  });
  router.get('/classes', async (req, res, next) => {
    try { const s = active(req); const classes = await scope(s); stillActive(req, s); res.json({ classes }); } catch (e) { next(e); }
  });
  router.post('/mapping', async (req, res, next) => {
    try { const s = active(req); const mapping = mappingFrom(req.body, await scope(s)); stillActive(req, s); res.json({ mapping }); } catch (e) { next(e); }
  });
  router.post('/snapshot', async (req, res, next) => {
    try {
      const s = active(req);
      const mapping = mappingFrom(req.body?.mapping, await scope(s));
      const { date, weekday } = dayParts(new Date(now()), mapping.timezone);
      const query = { class_id: mapping.classId, section_id: mapping.sectionId };
      const results = await Promise.allSettled([
        erp('profile', s.token), erp('students', s.token, query), erp('attendance', s.token, { ...query, date }),
        erp('timetable', s.token), erp('homework', s.token, { limit: 100 }), erp('notices', s.token, { limit: 20 }),
      ]);
      // An expired token or denied access must not become an optional feed error.
      for (const r of results) if (r.status === 'rejected' && [401, 403].includes(r.reason.status)) throw r.reason;
      for (const r of results.slice(0, 3)) if (r.status === 'rejected') throw r.reason;
      const [profile, students, attendance, timetable, homework, notices] = results.map(r => r.status === 'fulfilled' ? r.value : null);
      if (!Array.isArray(students.data) || !Array.isArray(attendance.data) || attendance.date !== date || typeof attendance.already_saved !== 'boolean' || !profile.data?.year_id) throw failure(503, 'ERP_UNAVAILABLE');
      stillActive(req, s);
      const totals = attendanceFromERP(attendance, base);
      totals.students = totals.students.map(student => ({ ...student, photo: photoRef(s, student.photo) }));
      res.json({ date, updatedAt: now(), academicYearId: String(profile.data.year_id), teacher: s.name, teacherPhoto: photoRef(s, photoUrl(profile.data.photo, base)), attendance: totals,
        students: minimalStudents(students.data, date.slice(5), base).map(student => ({ ...student, photo: photoRef(s, student.photo) })),
        timetable: { complete: false, periods: timetable ? teacherLessons(timetable, mapping, weekday, s.name) : [] },
        homework: (Array.isArray(homework?.data) ? homework.data : []).filter(h => h.class_name === mapping.grade && h.section_name === mapping.section && h.assigned_date === date).map(h => ({ title: clean(h.title), text: clean(h.description, 4000), subject: clean(h.subject_name) })),
        notices: (Array.isArray(notices?.data) ? notices.data : []).map(n => ({ title: clean(n.title), text: clean(n.message, 4000), public: n.target_scope === 'all' })),
      });
    } catch (e) { next(e); }
  });
  // Marks today's register for the teacher's own class. The server picks the
  // date, and a save must cover exactly the students the ERP lists today.
  // Saving tells the ERP, which alerts the parents of newly absent students.
  router.post('/attendance', async (req, res, next) => {
    try {
      const s = active(req);
      const mapping = mappingFrom(req.body?.mapping, await scope(s));
      const { date } = dayParts(new Date(now()), mapping.timezone);
      const query = { class_id: mapping.classId, section_id: mapping.sectionId };
      const register = await erp('attendance', s.token, { ...query, date });
      if (!Array.isArray(register.data) || register.date !== date) throw failure(503, 'ERP_UNAVAILABLE');
      const roster = new Map(register.data.map(r => [String(r.student_id), r]));
      const records = req.body?.records;
      if (!Array.isArray(records) || records.length !== roster.size || !roster.size) throw failure(400, 'ATTENDANCE_INCOMPLETE');
      const seen = new Set();
      for (const r of records) {
        if (!roster.has(r?.id) || seen.has(r.id) || !ATTENDANCE_STATUSES.includes(r.status)) throw failure(400, 'ATTENDANCE_INCOMPLETE');
        seen.add(r.id);
      }
      const before = attendanceFromERP(register).students;
      const newlyAbsent = records.filter(r => r.status === 'absent' && before.find(b => b.id === r.id)?.status !== 'absent').length;
      stillActive(req, s);
      // The ERP replaces remarks on save, so keep each student's existing one.
      const result = await erp('attendance/save', s.token, null, { ...query, date, records: records.map(r => ({ student_id: Number(r.id), status: statusToERP(r.status), remarks: roster.get(r.id).remarks ?? null })) });
      res.json({ date, saved: Number(result.saved) || records.length, newlyAbsent });
    } catch (e) { next(e); }
  });
  // Streams one photo from this session's snapshot to the signed-in teacher.
  // The router's no-store headers keep it out of the shared board's cache.
  router.get('/photo/:id', async (req, res, next) => {
    try {
      const s = active(req);
      const url = /^[a-f0-9]{32}$/.test(req.params.id) ? s.photos.get(req.params.id) : undefined;
      if (!url) return res.status(404).json({ code: 'PHOTO_NOT_FOUND' });
      const upstream = await fetchImpl(new URL(url), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
      const type = upstream?.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!upstream?.ok || !PHOTO_TYPES.includes(type) || Number(upstream.headers.get('content-length')) > PHOTO_MAX_BYTES) return res.status(404).json({ code: 'PHOTO_NOT_FOUND' });
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.length > PHOTO_MAX_BYTES) return res.status(404).json({ code: 'PHOTO_NOT_FOUND' });
      stillActive(req, s);
      res.set({ 'Content-Type': type, 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' }).send(bytes);
    } catch (e) { next(e); }
  });
  router.use((error, req, res, _next) => {
    if ([401, 403].includes(error.status)) { discard(sessionId(req)); res.clearCookie(COOKIE, cookieOptions(req)); }
    res.status(error.status || 503).json({ code: error.code || 'ERP_UNAVAILABLE' });
  });
  return router;
}
