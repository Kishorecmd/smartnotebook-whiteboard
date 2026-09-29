import { z } from 'zod';
export const MappingSchema = z.object({ classId: z.string(), sectionId: z.string(), grade: z.string().max(80), section: z.string().max(30), timezone: z.string().refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }), device: z.string().max(80), proof: z.string().optional() });
export type Mapping = z.infer<typeof MappingSchema>;
const StudentSchema = z.object({ id: z.string(), name: z.string().max(200), photo: z.string().url().nullable().refine(v => !v || new URL(v).origin === 'https://erp.jaihind.school'), birthday: z.boolean().optional(), status: z.enum(['present', 'absent', 'late', 'half_day', 'leave', 'unmarked']).optional() });
export type Student = z.infer<typeof StudentSchema>;
const PeriodSchema = z.object({ id: z.string(), subject: z.string(), start: z.string().nullable(), end: z.string().nullable(), teacher: z.string(), kind: z.enum(['lesson', 'break', 'lunch', 'eca', 'free']) });
export type Period = z.infer<typeof PeriodSchema>;
const ItemSchema = z.object({ title: z.string(), text: z.string(), public: z.boolean().optional(), subject: z.string().optional() });
export const SnapshotSchema = z.object({ date: z.string(), updatedAt: z.number(), academicYearId: z.string(), academicYear: z.string().max(20).optional(), teacher: z.string(), attendance: z.object({ date: z.string(), marked: z.boolean(), total: z.number(), present: z.number(), absent: z.number(), late: z.number(), unmarked: z.number(), other: z.number(), percentage: z.number().nullable(), students: z.array(StudentSchema) }), students: z.array(StudentSchema), timetable: z.object({ complete: z.boolean(), holiday: z.string().optional(), periods: z.array(PeriodSchema) }), homework: z.array(ItemSchema), notices: z.array(ItemSchema), events: z.array(ItemSchema).optional(), learning: z.string().optional() });
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const WeatherSchema = z.object({ city: z.string(), temperature: z.number(), feelsLike: z.number(), code: z.number(), high: z.number(), low: z.number(), rain: z.number(), updatedAt: z.number() });
export type Weather = z.infer<typeof WeatherSchema>;
export function dateKey(now: number, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function minuteOfDay(now: number, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return Number(p.hour) * 60 + Number(p.minute);
}
export function timeMinutes(time: string | null): number {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
export function currentPeriod(periods: Period[], now: number, timezone: string, holiday?: string) {
  if (holiday) return { current: undefined, next: undefined, remaining: 0 };
  const minute = minuteOfDay(now, timezone);
  const ordered = periods.filter(p => timeMinutes(p.end) > timeMinutes(p.start)).sort((a,b) => timeMinutes(a.start) - timeMinutes(b.start));
  const current = ordered.find(p => minute >= timeMinutes(p.start) && minute < timeMinutes(p.end));
  return { current, next: ordered.find(p => timeMinutes(p.start) > minute), remaining: current ? timeMinutes(current.end) - minute : 0 };
}
export function classStudents(snapshot: Snapshot | null, presentOnly: boolean) {
  if (!snapshot) return [];
  if (!presentOnly) return snapshot.students;
  return snapshot.attendance.marked ? snapshot.attendance.students.filter(s => s.status === 'present' || s.status === 'late') : [];
}
export function weatherCondition(code: number) {
  if (code === 0) return 'Clear skies';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67 || code >= 80 && code <= 82) return 'Rainy';
  if (code >= 95) return 'Thunderstorms';
  return 'Cloudy';
}
