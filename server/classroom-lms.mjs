import { createHmac, timingSafeEqual } from 'node:crypto';
import { clean } from './classroom-adapter.mjs';

// Stage 2 link to Jaihind LMS (docs/LMS_WHITEBOARD_STAGE2_PLAN.md). The LMS hands
// a signed, single-use assertion to POST /api/classroom/lms/callback; the link then
// lives inside the classroom session, so it ends when the teacher signs out.
export const LMS_AUDIENCE = 'whiteboard.jaihind.school';
const LMS_ISSUER = 'lms.jaihind.school';
export const BOARD_MAX_BYTES = 25 * 1024 * 1024;

/** Stage 2 settings from the environment, or null while any is missing. */
export function lmsConfig(env = process.env) {
  const secret = env.LMS_SSO_SECRET || '';
  const token = env.LMS_API_TOKEN || '';
  let base;
  try { base = new URL(env.LMS_BASE_URL || ''); } catch { return null; }
  const local = ['localhost', '127.0.0.1'].includes(base.hostname);
  if (secret.length < 32 || token.length < 32 || (base.protocol !== 'https:' && !local)) return null;
  return { secret, token, base: base.origin };
}

/**
 * The LMS user in a hand-off assertion, or an error code. `seen` remembers
 * nonces until they expire, so an assertion works once.
 */
export function verifyLmsAssertion(token, { secret, now, seen }) {
  if (typeof token !== 'string' || token.length > 4096) return { error: 'LMS_LINK_INVALID' };
  const [body, signature] = token.split('.');
  if (!body || !signature) return { error: 'LMS_LINK_INVALID' };
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('base64url'));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return { error: 'LMS_LINK_INVALID' };
  let assertion;
  try { assertion = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return { error: 'LMS_LINK_INVALID' }; }
  const seconds = Math.floor(now / 1000);
  if (assertion?.iss !== LMS_ISSUER || assertion.aud !== LMS_AUDIENCE) return { error: 'LMS_LINK_INVALID' };
  if (!Number.isInteger(assertion.iat) || !Number.isInteger(assertion.exp) || assertion.exp < seconds || assertion.iat > seconds + 30 || assertion.exp - assertion.iat > 180) return { error: 'LMS_LINK_EXPIRED' };
  if (typeof assertion.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(assertion.nonce)) return { error: 'LMS_LINK_INVALID' };
  if (seen.has(assertion.nonce)) return { error: 'LMS_LINK_EXPIRED' };
  const user = assertion.user;
  if (!Number.isInteger(user?.id) || !Number.isInteger(user.user_id) || user.user_id < 1 || typeof user.role !== 'string' || typeof user.name !== 'string') return { error: 'LMS_LINK_INVALID' };
  seen.set(assertion.nonce, assertion.exp * 1000);
  return { user: { id: user.id, user_id: user.user_id, role: clean(user.role, 40), name: clean(user.name, 150) } };
}

const failure = (status, code) => Object.assign(new Error(code), { status, code });

/** Lesson data from the LMS's /api/whiteboard/* routes, acting for the linked teacher. */
export function lmsClient({ base, token }, fetchImpl = fetch) {
  return async function request(path, user, { method = 'GET', body, timeout = 15_000 } = {}) {
    let response;
    try {
      response = await fetchImpl(new URL(path, base), {
        method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeout),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Whiteboard-Actor': Buffer.from(JSON.stringify(user)).toString('base64url'),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw failure(503, 'LMS_UNAVAILABLE'); }
    // Never 401/403 here: those statuses end the classroom sign-in, and an LMS refusal must not.
    if (Number(response.headers.get('content-length')) > BOARD_MAX_BYTES + 1_000_000) throw failure(413, 'LMS_TOO_LARGE');
    const text = await response.text().catch(() => '');
    if (text.length > BOARD_MAX_BYTES + 1_000_000) throw failure(413, 'LMS_TOO_LARGE');
    let payload = null;
    try { payload = JSON.parse(text); } catch { /* handled below */ }
    if (response.status === 409) throw failure(409, 'LMS_VERSION_CONFLICT');
    if (response.status === 413) throw failure(413, 'LMS_TOO_LARGE');
    if (response.status === 422) throw Object.assign(failure(422, 'LMS_BOARD_INVALID'), { detail: clean(payload?.message, 200) });
    if (response.status === 403 || response.status === 404) throw failure(404, 'LMS_NOT_FOUND');
    if (!response.ok || payload?.success !== true) throw failure(503, 'LMS_UNAVAILABLE');
    return payload.data ?? {};
  };
}

const id = value => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);

/** Only what the Lessons panel shows; course descriptions and progress stay in the LMS. */
export function lmsCourses(data) {
  return (Array.isArray(data?.courses) ? data.courses : []).filter(c => id(c?.id)).map(c => ({
    id: Number(c.id),
    title: clean(c.title, 200),
    subject: clean(c.subject_name, 120) || null,
    className: clean(c.class_name, 80) || null,
    status: clean(c.course_status, 30) || null,
    lessons: Number(c.lesson_count) || 0,
    boards: Number(c.whiteboard_count) || 0,
  }));
}

export function lmsCourse(data) {
  const course = data?.course || {};
  return {
    course: { id: Number(course.id), title: clean(course.title, 200), subject: clean(course.subject_name, 120) || null, className: clean(course.class_name, 80) || null },
    units: (Array.isArray(data?.units) ? data.units : []).filter(u => id(u?.id)).map(u => ({ id: Number(u.id), title: clean(u.title, 200) })),
    lessons: (Array.isArray(data?.lessons) ? data.lessons : []).filter(l => id(l?.id)).map(l => ({
      id: Number(l.id),
      title: clean(l.title, 200),
      unitId: id(l.unit_id),
      minutes: Number(l.duration_minutes) || 0,
      status: clean(l.status, 30) || 'draft',
      board: l.whiteboard ? { pages: Number(l.whiteboard.pages) || 0, version: Number(l.whiteboard.version) || 0 } : null,
    })),
    canEdit: data?.can_edit === true,
  };
}
