import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../dashboard/model';
import { ago, attendanceStatus, displayTime, greetingFor, lessonStatus, syncStatus, timetableItems, weatherStatus } from './homeModel';

const tz = 'Asia/Kolkata';
// 10:15 IST on a school day.
const at = (hhmm: string) => Date.parse(`2026-10-12T${hhmm}:00+05:30`);
const period = (id: string, subject: string, start: string, end: string) => ({ id, subject, start, end, teacher: 'Teacher', kind: 'lesson' as const });
const snapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  date: '2026-10-12', updatedAt: at('10:00'), academicYearId: '12', teacher: 'Teacher',
  attendance: { date: '2026-10-12', marked: true, total: 24, present: 21, absent: 2, late: 1, unmarked: 0, other: 1, percentage: 87.5, students: [] },
  students: [], homework: [], notices: [],
  timetable: { complete: false, periods: [period('3', 'Numbers', '10:45', '11:25'), period('2', 'Phonics', '10:00', '10:40'), period('1', 'Circle time', '09:00', '09:40')] },
  ...overrides,
} as Snapshot);

describe('lessonStatus', () => {
  it('reports the current lesson with time left, progress and the next lesson', () => {
    const s = lessonStatus(snapshot(), at('10:10'), tz);
    expect(s).toMatchObject({ kind: 'now', current: { subject: 'Phonics' }, next: { subject: 'Numbers' }, remaining: 30, progress: 0.25 });
  });
  it('reports a gap before the next lesson', () => {
    expect(lessonStatus(snapshot(), at('10:42'), tz)).toMatchObject({ kind: 'between', next: { subject: 'Numbers' }, startsIn: 3 });
  });
  it('reports the day as done after the last lesson', () => {
    expect(lessonStatus(snapshot(), at('13:00'), tz)).toEqual({ kind: 'done' });
  });
  it('puts a holiday ahead of any periods', () => {
    expect(lessonStatus(snapshot({ timetable: { complete: true, holiday: 'Diwali', periods: [period('1', 'Maths', '09:00', '09:40')] } }), at('09:10'), tz)).toEqual({ kind: 'holiday', name: 'Diwali' });
  });
  it('distinguishes no lessons today from no timetable loaded', () => {
    expect(lessonStatus(snapshot({ timetable: { complete: false, periods: [] } }), at('09:10'), tz)).toEqual({ kind: 'empty' });
    expect(lessonStatus(null, at('09:10'), tz)).toEqual({ kind: 'unknown' });
  });
  it('ignores periods without valid times', () => {
    const s = snapshot({ timetable: { complete: false, periods: [{ ...period('9', 'Library', '', ''), start: null, end: null }] } });
    expect(lessonStatus(s, at('09:10'), tz)).toEqual({ kind: 'empty' });
  });
});

describe('timetableItems', () => {
  it('orders periods by time and marks done, now and upcoming', () => {
    expect(timetableItems(snapshot(), at('10:10'), tz).map(i => `${i.period.subject}:${i.state}`)).toEqual(['Circle time:done', 'Phonics:now', 'Numbers:upcoming']);
  });
  it('shows nothing on a holiday', () => {
    expect(timetableItems(snapshot({ timetable: { complete: true, holiday: 'Holiday', periods: [period('1', 'A', '09:00', '09:40')] } }), at('09:10'), tz)).toEqual([]);
  });
});

describe('attendanceStatus', () => {
  const base = { loading: false, error: '', signedIn: true, hasClass: true, preview: false };
  it('gives marked totals including late and other statuses', () => {
    expect(attendanceStatus({ ...base, snapshot: snapshot() })).toMatchObject({ kind: 'marked', present: 21, absent: 2, late: 1, other: 1 });
  });
  it('separates unmarked attendance from absence', () => {
    const s = snapshot(); s.attendance = { ...s.attendance, marked: false };
    expect(attendanceStatus({ ...base, snapshot: s })).toEqual({ kind: 'unmarked', total: 24 });
  });
  it('asks for sign-in before anything else when signed out', () => {
    expect(attendanceStatus({ ...base, signedIn: false, snapshot: null })).toEqual({ kind: 'signed-out' });
  });
  it('treats a signed-in class without a snapshot yet as loading, not unavailable', () => {
    expect(attendanceStatus({ ...base, loading: false, snapshot: null })).toEqual({ kind: 'loading' });
    expect(attendanceStatus({ ...base, loading: true, error: 'ERP_UNAVAILABLE', snapshot: null })).toEqual({ kind: 'unavailable' });
  });
  it('asks a signed-in teacher to choose a class first', () => {
    expect(attendanceStatus({ ...base, hasClass: false, snapshot: null })).toEqual({ kind: 'no-class' });
  });
});

describe('syncStatus', () => {
  const base = { preview: false, ready: true, signedIn: true, hasClass: true, error: '', snapshot: snapshot(), now: at('10:05') };
  it('labels sample data, offline service, signed out, errors and syncing distinctly', () => {
    expect(syncStatus({ ...base, preview: true }).kind).toBe('sample');
    expect(syncStatus({ ...base, ready: false }).kind).toBe('offline');
    expect(syncStatus({ ...base, signedIn: false }).kind).toBe('local');
    expect(syncStatus({ ...base, error: 'ERP_UNAVAILABLE' }).kind).toBe('error');
    expect(syncStatus({ ...base, snapshot: null })).toMatchObject({ kind: 'syncing', label: 'Syncing…' });
    expect(syncStatus({ ...base, hasClass: false, snapshot: null })).toMatchObject({ kind: 'local', label: 'Choose a class' });
  });
  it('reports the age of the last successful sync', () => {
    expect(syncStatus(base)).toEqual({ kind: 'connected', label: 'ERP connected', detail: '5 min ago' });
  });
});

describe('weather and time helpers', () => {
  const weather = { city: 'Trichy', temperature: 29, feelsLike: 31, code: 61, high: 32, low: 24, rain: 70, updatedAt: at('09:00') };
  it('marks weather older than 45 minutes as stale', () => {
    expect(weatherStatus(weather, at('09:30')).kind).toBe('current');
    expect(weatherStatus(weather, at('09:50'))).toMatchObject({ kind: 'stale', age: '50 min ago' });
    expect(weatherStatus(null, at('09:50'))).toEqual({ kind: 'unavailable' });
  });
  it('formats ages and 12-hour times', () => {
    expect(ago(20_000)).toBe('just now');
    expect(ago(2 * 3600_000 + 60_000)).toBe('2 h ago');
    expect(displayTime('13:05')).toBe('1:05 PM');
    expect(displayTime('00:10')).toBe('12:10 AM');
    expect(displayTime(null)).toBe('Time pending');
  });
  it('greets by time of day', () => {
    expect([greetingFor(9 * 60), greetingFor(13 * 60), greetingFor(18 * 60)]).toEqual(['Good morning', 'Good afternoon', 'Good evening']);
  });
});
