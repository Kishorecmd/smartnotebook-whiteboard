import { currentPeriod, minuteOfDay, timeMinutes, type Period, type Snapshot, type Weather } from '../dashboard/model';

/**
 * View state for the welcome dashboard, derived from classroom data.
 * Everything here is pure so each state in the specification's component
 * table can be tested without rendering.
 */

export function greetingFor(minute: number) {
  return minute < 12 * 60 ? 'Good morning' : minute < 17 * 60 ? 'Good afternoon' : 'Good evening';
}

export type LessonStatus =
  | { kind: 'unknown' }
  | { kind: 'holiday'; name: string }
  | { kind: 'empty' }
  | { kind: 'now'; current: Period; next?: Period; remaining: number; progress: number }
  | { kind: 'between'; next: Period; startsIn: number }
  | { kind: 'done' };

/** What the class is doing now. 'unknown' means no timetable is loaded. */
export function lessonStatus(snapshot: Snapshot | null, now: number, timezone: string): LessonStatus {
  if (!snapshot) return { kind: 'unknown' };
  const { holiday, periods } = snapshot.timetable;
  if (holiday) return { kind: 'holiday', name: holiday };
  const timed = periods.filter(p => timeMinutes(p.end) > timeMinutes(p.start));
  if (!timed.length) return { kind: 'empty' };
  const { current, next, remaining } = currentPeriod(timed, now, timezone);
  if (current) {
    const length = timeMinutes(current.end) - timeMinutes(current.start);
    return { kind: 'now', current, next, remaining, progress: Math.min(1, Math.max(0, 1 - remaining / length)) };
  }
  if (next) return { kind: 'between', next, startsIn: timeMinutes(next.start) - minuteOfDay(now, timezone) };
  return { kind: 'done' };
}

export type TimetableItem = { period: Period; state: 'done' | 'now' | 'upcoming' };

/** The day's periods in time order, each marked done, now or upcoming. */
export function timetableItems(snapshot: Snapshot | null, now: number, timezone: string): TimetableItem[] {
  if (!snapshot || snapshot.timetable.holiday) return [];
  const minute = minuteOfDay(now, timezone);
  return snapshot.timetable.periods
    .filter(p => timeMinutes(p.end) > timeMinutes(p.start))
    .sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start))
    .map(period => ({
      period,
      state: timeMinutes(period.end) <= minute ? 'done' : timeMinutes(period.start) <= minute ? 'now' : 'upcoming',
    }));
}

export type ClassDataState = 'ready' | 'signed-out' | 'no-class' | 'loading' | 'unavailable';

/**
 * Where the class data stands, shared by every card so they never disagree.
 * A sample preview without data stands for the ERP being down.
 */
export function classDataState(input: { snapshot: Snapshot | null; error: string; signedIn: boolean; hasClass: boolean; preview: boolean }): ClassDataState {
  const { snapshot, error, signedIn, hasClass, preview } = input;
  if (snapshot) return 'ready';
  if (preview) return 'unavailable';
  if (!signedIn) return 'signed-out';
  if (!hasClass) return 'no-class';
  return error ? 'unavailable' : 'loading';
}

/** What a card says when there is no class data. */
export const NO_DATA_TEXT: Record<Exclude<ClassDataState, 'ready'>, string> = {
  'signed-out': 'Sign in to see today’s lessons. The whiteboard and tools work now.',
  'no-class': 'Choose your class to see today’s lessons.',
  loading: 'Loading today’s lessons…',
  unavailable: 'Today’s lessons can’t be loaded right now. The whiteboard and tools still work.',
};

export type AttendanceStatus =
  | { kind: 'signed-out' }
  | { kind: 'no-class' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'unmarked'; total: number }
  | { kind: 'marked'; total: number; present: number; absent: number; late: number; other: number; unmarked: number; percentage: number | null };

export function attendanceStatus(snapshot: Snapshot | null, state: ClassDataState): AttendanceStatus {
  const attendance = snapshot?.attendance;
  if (attendance) {
    if (!attendance.marked) return { kind: 'unmarked', total: attendance.total };
    const { total, present, absent, late, other, unmarked, percentage } = attendance;
    return { kind: 'marked', total, present, absent, late, other, unmarked, percentage };
  }
  return { kind: state === 'ready' ? 'loading' : state };
}

export type SyncStatus = { kind: 'sample' | 'connected' | 'syncing' | 'error' | 'offline' | 'local'; label: string; detail?: string };

/** The ERP indicator in the header, with the time since the last good snapshot. */
export function syncStatus(input: { preview: boolean; ready: boolean; signedIn: boolean; hasClass: boolean; error: string; snapshot: Snapshot | null; now: number }): SyncStatus {
  const { preview, ready, signedIn, hasClass, error, snapshot, now } = input;
  if (preview) return { kind: 'sample', label: 'Sample data' };
  if (!ready) return { kind: 'offline', label: 'ERP offline', detail: 'Classroom tools still work' };
  if (!signedIn) return { kind: 'local', label: 'Not signed in' };
  if (error) return { kind: 'error', label: 'ERP unavailable', detail: 'Retrying shortly' };
  if (!hasClass) return { kind: 'local', label: 'Choose a class' };
  if (!snapshot) return { kind: 'syncing', label: 'Syncing…' };
  return { kind: 'connected', label: 'ERP connected', detail: ago(now - snapshot.updatedAt) };
}

export type WeatherStatus = { kind: 'unavailable' } | { kind: 'current' | 'stale'; weather: Weather; age: string };

/** Weather older than 45 minutes is still shown, but labelled with its age. */
export function weatherStatus(weather: Weather | null, now: number): WeatherStatus {
  if (!weather) return { kind: 'unavailable' };
  const minutes = (now - weather.updatedAt) / 60000;
  return { kind: minutes > 45 ? 'stale' : 'current', weather, age: ago(now - weather.updatedAt) };
}

export function ago(milliseconds: number) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}

/** 24-hour "13:05" as "1:05 PM" for classroom display. */
export function displayTime(time: string | null) {
  const minutes = timeMinutes(time);
  if (Number.isNaN(minutes)) return 'Time pending';
  const hour = Math.floor(minutes / 60), minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
