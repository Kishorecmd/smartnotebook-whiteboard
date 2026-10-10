import { Users, Clock3, BookOpen, CalendarClock, LogIn, RefreshCw, ArrowRight } from 'lucide-react';
import { displayTime, type AttendanceStatus, type LessonStatus } from './homeModel';

type AttendanceProps = {
  status: AttendanceStatus;
  canTake: boolean;
  onTake: () => void;
  onList: (which: 'present' | 'absent') => void;
  onSignIn: () => void;
  onRetry: () => void;
};

export function AttendanceCard({ status, canTake, onTake, onList, onSignIn, onRetry }: AttendanceProps) {
  return <section className="sc-card sc-attendance" aria-label="Today's attendance">
    <h2><Users size={18} aria-hidden="true" />Attendance</h2>
    {status.kind === 'signed-out' && <>
      <p className="sc-card-copy">Sign in to see today’s register.</p>
      <button className="sc-button" onClick={onSignIn}><LogIn size={18} />Teacher sign in</button>
    </>}
    {status.kind === 'no-class' && <>
      <p className="sc-card-copy">Choose your class to see today’s register.</p>
      <button className="sc-button" onClick={onSignIn}><LogIn size={18} />Choose class</button>
    </>}
    {status.kind === 'loading' && <div className="sc-skeleton" role="status" aria-label="Loading attendance" />}
    {status.kind === 'unavailable' && <>
      <p className="sc-card-copy">Attendance is unavailable right now.</p>
      <button className="sc-button" onClick={onRetry}><RefreshCw size={18} />Try again</button>
    </>}
    {status.kind === 'unmarked' && <>
      <p className="sc-figure"><b>{status.total}</b><span>students · not marked yet</span></p>
      {canTake && <button className="sc-button sc-button-primary" onClick={onTake}>Take attendance</button>}
    </>}
    {status.kind === 'marked' && <>
      <p className="sc-figure"><b>{status.present}<small>/{status.total}</small></b><span>present today</span></p>
      <div className="sc-counts">
        <button onClick={() => onList('present')} aria-label={`${status.present} present, show list`}><span className="sc-dot sc-dot-present" />{status.present} present</button>
        <button onClick={() => onList('absent')} aria-label={`${status.absent} absent, show list`}><span className="sc-dot sc-dot-absent" />{status.absent} absent</button>
        {status.late > 0 && <span><span className="sc-dot sc-dot-late" />{status.late} late</span>}
      </div>
      {(status.other > 0 || status.unmarked > 0) && <p className="sc-meta">{[status.other && `${status.other} on leave or half day`, status.unmarked && `${status.unmarked} not marked`].filter(Boolean).join(' · ')}</p>}
      {canTake && <button className="sc-link" onClick={onTake}>Edit attendance <ArrowRight size={16} /></button>}
    </>}
  </section>;
}

type LessonProps = { status: LessonStatus; partial: boolean; signedIn: boolean; hasClass: boolean; studentMode: boolean };

export function LessonCard({ status, partial, signedIn, hasClass, studentMode }: LessonProps) {
  const title = status.kind === 'now' ? status.current.subject
    : status.kind === 'holiday' ? status.name
    : status.kind === 'between' ? 'Short break'
    : status.kind === 'done' ? 'Lessons are done for today'
    : status.kind === 'empty' ? 'No lessons scheduled'
    : 'Ready to teach';
  const label = status.kind === 'now' ? 'Now' : status.kind === 'holiday' ? 'Today' : 'Current lesson';
  return <section className="sc-card sc-lesson" aria-label="Current lesson">
    <h2><BookOpen size={18} aria-hidden="true" />{label}</h2>
    <p className="sc-lesson-title">{title}</p>
    {status.kind === 'now' && <>
      <p className="sc-lesson-time">{displayTime(status.current.start)} – {displayTime(status.current.end)}</p>
      <div className="sc-progress" role="progressbar" aria-label="Lesson time used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.progress * 100)}><span style={{ width: `${status.progress * 100}%` }} /></div>
      <p className="sc-meta"><Clock3 size={15} aria-hidden="true" />{status.remaining} min left</p>
    </>}
    {status.kind === 'between' && <p className="sc-meta">Next lesson starts in {status.startsIn} min</p>}
    {status.kind === 'holiday' && <p className="sc-meta">Enjoy the break. Classroom tools are still here.</p>}
    {status.kind === 'unknown' && <p className="sc-meta">{!signedIn ? 'Sign in to load today’s lessons. The whiteboard and tools work now.' : hasClass ? 'Loading today’s lessons…' : 'Choose your class to load today’s lessons.'}</p>}
    {partial && !studentMode && ['now', 'between', 'done'].includes(status.kind) && <p className="sc-note">Your own lessons only. The full class timetable is not in the ERP yet.</p>}
  </section>;
}

export function NextCard({ status }: { status: LessonStatus }) {
  const next = status.kind === 'now' ? status.next : status.kind === 'between' ? status.next : undefined;
  return <section className="sc-card sc-next" aria-label="Next period">
    <h2><CalendarClock size={18} aria-hidden="true" />Next period</h2>
    {next ? <>
      <p className="sc-next-title">{next.subject}</p>
      <p className="sc-next-time">{displayTime(next.start)}</p>
    </> : <p className="sc-card-copy">{status.kind === 'unknown' ? 'No timetable loaded' : 'Nothing else today'}</p>}
  </section>;
}
