import { classroomRequest } from '../dashboard/data';
import { lmsHomeUrl } from './bridge';

/**
 * Jaihind LMS lessons inside the classroom (Stage 2). The classroom server holds the
 * LMS link inside the teacher's sign-in and fetches lessons for them; the browser
 * never sees an LMS token. Boards are kept in memory only, never on this device.
 */
export type LmsLinkState = { available: boolean; connected: boolean; name: string | null };
export type LessonCourse = { id: number; title: string; subject: string | null; className: string | null; status: string | null; lessons: number; boards: number };
export type LessonItem = { id: number; title: string; unitId: number | null; minutes: number; status: string; board: { pages: number; version: number } | null };
export type CourseLessons = { course: { id: number; title: string; subject: string | null; className: string | null }; units: { id: number; title: string }[]; lessons: LessonItem[]; canEdit: boolean };
export type LessonBoard = { lesson: { id: number; title: string; courseId: number | null; courseTitle: string | null }; version: number; package: string | null };

export const LESSON_MODE_PARAM = 'lesson';

export const lmsCourses = (signal?: AbortSignal) => classroomRequest('lms/courses', undefined, signal) as Promise<{ courses: LessonCourse[] }>;
export const lmsCourse = (id: number, signal?: AbortSignal) => classroomRequest(`lms/courses/${id}`, undefined, signal) as Promise<CourseLessons>;
export const lmsBoard = (id: number, signal?: AbortSignal) => classroomRequest(`lms/lessons/${id}/board`, undefined, signal) as Promise<LessonBoard>;
export const disconnectLms = () => classroomRequest('lms/disconnect', {});

/** Save to lesson. Throws LMS_VERSION_CONFLICT when someone saved after this board was opened. */
export async function saveLessonBoard(id: number, pkg: string, expectedVersion: number): Promise<{ version: number }> {
  const response = await fetch(`/api/classroom/lms/lessons/${id}/board`, { method: 'PUT', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: pkg, expectedVersion }) });
  if (!response.ok) { let code = 'LMS_UNAVAILABLE'; try { code = (await response.json()).code || code; } catch { /* Not JSON. */ } throw new Error(code); }
  return response.json();
}

/** The LMS page that signs the teacher in (if needed) and hands them back to this board. */
export const connectLmsUrl = () => `${lmsHomeUrl()}/auth/whiteboard`;

/** Where a lesson is taught: the whiteboard editor on this site, with its own session storage. */
export const teachLessonUrl = (lessonId: number) => `/?lms=${LESSON_MODE_PARAM}&id=${lessonId}`;

export function lessonIdFromLocation(search: string = window.location.search): number | null {
  const value = new URLSearchParams(search).get('id') || '';
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null;
}

const key = (name: string | null | undefined) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Courses for the class on this board ("LKG" matches "LKG", "lkg" and "L.K.G."). */
export function coursesForClass(courses: LessonCourse[], grade: string | null | undefined): LessonCourse[] {
  const wanted = key(grade);
  return wanted ? courses.filter(c => key(c.className) === wanted) : [];
}

export function findCourses(courses: LessonCourse[], query: string): LessonCourse[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return courses.filter(c => words.every(w => `${c.title} ${c.subject || ''} ${c.className || ''}`.toLowerCase().includes(w)));
}

/** Lessons in course order, grouped under their units; lessons without a unit come last. */
export function lessonsByUnit({ units, lessons }: Pick<CourseLessons, 'units' | 'lessons'>): { title: string | null; lessons: LessonItem[] }[] {
  const groups = units.map(u => ({ title: u.title as string | null, lessons: lessons.filter(l => l.unitId === u.id) }));
  const known = new Set(units.map(u => u.id));
  const loose = lessons.filter(l => l.unitId === null || !known.has(l.unitId));
  return [...groups, ...(loose.length ? [{ title: groups.length ? 'Other lessons' : null, lessons: loose }] : [])].filter(g => g.lessons.length);
}

const MESSAGES: Record<string, string> = {
  connected: 'Connected to Jaihind LMS.',
  LMS_TEACHER_MISMATCH: 'That LMS account is not the teacher signed in to this board. Sign out of the LMS, then connect again with your own ERP account.',
  LMS_LINK_EXPIRED: 'The connection took too long or was already used. Please connect again.',
  LMS_LINK_INVALID: 'The LMS connection could not be checked. Please connect again. If it keeps failing, tell the administrator.',
  LMS_NOT_CONFIGURED: 'LMS lessons are not set up on this board yet.',
  SIGN_IN_REQUIRED: 'Sign in to the classroom first, then connect the LMS.',
  TRY_LATER: 'Too many attempts. Wait a few minutes and try again.',
  LMS_LINK_REQUIRED: 'The LMS connection has ended. Connect again to see your lessons.',
  LMS_UNAVAILABLE: 'The LMS is not answering right now. Check the internet connection and try again.',
  LMS_NOT_FOUND: 'This course or lesson is no longer available to you.',
  LMS_VERSION_CONFLICT: 'Someone else saved this lesson after you opened it.',
  LMS_TOO_LARGE: 'This board is larger than 25 MB. Remove or shrink videos and try again.',
  LMS_BOARD_INVALID: 'The LMS could not accept this board.',
};
export const lessonMessage = (code: string) => MESSAGES[code] || MESSAGES.LMS_UNAVAILABLE;

/** The hand-off result the LMS round trip left in the address bar, removed so a reload does not repeat it. */
export function takeLinkResult(): string | null {
  const url = new URL(window.location.href);
  const result = url.searchParams.get('lmsLink');
  if (!result) return null;
  url.searchParams.delete('lmsLink');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return /^[A-Za-z_]{1,40}$/.test(result) ? result : null;
}
