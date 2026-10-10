import { useState } from 'react';
import { DashboardModal } from './dialogs';
import { classroomRequest, type ClassroomData } from './data';
import type { Mapping, Snapshot } from './model';
import { Avatar } from './Avatar';

type Status = 'present' | 'absent' | 'late' | 'leave' | 'half_day';
const STATUSES: [Status, string][] = [['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['leave', 'Leave'], ['half_day', 'Half day']];

function attendanceError(code: string) {
  return code === 'ATTENDANCE_INCOMPLETE' ? 'The class list has changed since this register opened. Close it and open attendance again.'
    : code === 'SIGN_IN_REQUIRED' ? 'Your sign-in has expired. Sign in again, then save attendance.'
    : code === 'CLASS_TEACHER_REQUIRED' || code === 'CLASS_ACCESS_DENIED' ? 'Only the class teacher of this class can save its attendance.'
    : 'The school ERP could not be reached, so attendance may not have been saved. Please try again. Saving again will not send duplicate absence alerts.';
}

/** Today's register for the connected class. Unmarked students start as present. */
export function TakeAttendance({ data, mapping, attendance, close }: { data: ClassroomData; mapping: Mapping; attendance: Snapshot['attendance']; close: () => void }) {
  const original = Object.fromEntries(attendance.students.map(s => [s.id, s.status]));
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => Object.fromEntries(attendance.students.map(s => [s.id, s.status && s.status !== 'unmarked' ? s.status : 'present'])));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState<number | null>(null);
  const count = (status: Status) => Object.values(statuses).filter(s => s === status).length;
  const newlyAbsent = attendance.students.filter(s => statuses[s.id] === 'absent' && original[s.id] !== 'absent').length;
  const save = async () => {
    setBusy(true); setError('');
    try {
      const result = await classroomRequest('attendance', { mapping, records: attendance.students.map(s => ({ id: s.id, status: statuses[s.id] })) });
      setSaved(result.saved); data.refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(attendanceError(code));
      if (['SIGN_IN_REQUIRED', 'CLASS_TEACHER_REQUIRED', 'CLASS_ACCESS_DENIED'].includes(code)) data.refresh();
    } finally { setBusy(false); }
  };
  if (saved !== null) return <DashboardModal title="Attendance saved" close={close}>
    <p role="status">Attendance for {mapping.grade} · {mapping.section} is saved in the school ERP for {saved} student{saved === 1 ? '' : 's'}.</p>
    <button className="live-button live-primary" onClick={close}>Done</button>
  </DashboardModal>;
  return <DashboardModal title={attendance.marked ? 'Update attendance' : 'Take attendance'} close={close}>
    <p>{mapping.grade} · {mapping.section} · today. {attendance.marked ? 'Change any student, then save.' : 'Everyone starts as present. Tap the students who are not.'}</p>
    <div className="live-register-tools"><button type="button" className="live-button" disabled={busy} onClick={() => setStatuses(Object.fromEntries(attendance.students.map(s => [s.id, 'present'])))}>Mark everyone present</button><span>{count('present')} present · {count('absent')} absent{count('late') ? ` · ${count('late')} late` : ''}{count('leave') + count('half_day') ? ` · ${count('leave') + count('half_day')} other` : ''}</span></div>
    <ul className="live-register">{attendance.students.map(s => <li key={s.id}><span className="live-register-name"><Avatar name={s.name} photo={s.photo}/><b>{s.name}</b></span><div role="group" aria-label={`Attendance for ${s.name}`}>{STATUSES.map(([value, label]) => <button key={value} type="button" disabled={busy} className={`is-${value}`} aria-pressed={statuses[s.id] === value} onClick={() => setStatuses(current => ({ ...current, [s.id]: value }))}>{label}</button>)}</div></li>)}</ul>
    {newlyAbsent > 0 && <p className="live-register-note">Saving sends the school’s absence alert to the families of the {newlyAbsent} student{newlyAbsent === 1 ? '' : 's'} newly marked absent.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="live-button live-primary" disabled={busy || !attendance.students.length} onClick={() => void save()}>{busy ? 'Saving…' : attendance.marked ? 'Save changes' : 'Save attendance'}</button>
  </DashboardModal>;
}
