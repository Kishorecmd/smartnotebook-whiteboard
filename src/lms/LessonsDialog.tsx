import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, Link2, Loader2, Play, RefreshCw } from 'lucide-react';
import { DashboardModal } from '../dashboard/dialogs';
import type { ClassroomData } from '../dashboard/data';
import { lmsHomeUrl } from './bridge';
import { connectLmsUrl, coursesForClass, findCourses, lessonMessage, lessonsByUnit, lmsCourse, lmsCourses, teachLessonUrl, type CourseLessons, type LessonCourse } from './classroomLessons';
import './lessons.css';

type Props = { data: ClassroomData; grade: string | null; message: string | null; close: () => void };
type Load<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'error'; code: string };
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'LMS_UNAVAILABLE');

/** Rail → Lessons: the signed-in teacher's LMS courses for this class, and their lesson boards. */
export function LessonsDialog({ data, grade, message, close }: Props) {
  const link = data.session?.lms;
  const [note, setNote] = useState(message && message !== 'connected' ? lessonMessage(message) : '');
  const connected = !!link?.connected;
  const title = connected && grade ? `${grade} lessons` : 'Lessons';
  const { refresh } = data;
  // Stable, so the course and lesson lists do not reload on every render.
  const ended = useCallback((code: string) => { setNote(lessonMessage(code)); refresh(); }, [refresh]);

  return <DashboardModal title={title} close={close}>
    {note && <p className="lms-lessons-note" role="alert">{note}</p>}
    {!data.session ? <NotSignedIn />
      : !link?.available ? <NotConfigured />
      : !connected ? <Connect mismatch={message === 'LMS_TEACHER_MISMATCH'} />
      : <Courses data={data} grade={grade} onEnded={ended} />}
  </DashboardModal>;
}

function NotSignedIn() {
  return <p className="live-muted">Sign in to the classroom with your ERP teacher account first. Your LMS lessons then open here.</p>;
}

function NotConfigured() {
  return <>
    <p className="live-muted">LMS lessons are not set up on this board yet. You can still open the LMS in a new tab.</p>
    <a className="live-button" href={lmsHomeUrl()} target="jaihind-lms" rel="noopener"><ExternalLink size={16} />Open LMS in a new tab</a>
  </>;
}

function Connect({ mismatch }: { mismatch: boolean }) {
  return <>
    <p>Connect this board to Jaihind LMS to choose a lesson and teach its board here.</p>
    <p className="live-muted">You will sign in to the LMS with the same ERP account as this classroom, then come straight back.</p>
    <div className="lms-lessons-actions">
      <button className="live-button live-primary" onClick={() => window.location.assign(connectLmsUrl())}><Link2 size={16} />Connect to LMS</button>
      {mismatch
        // Another person is signed in to the LMS and ERP in this browser; signing out lets the right teacher connect.
        ? <a className="live-button" href={`${lmsHomeUrl()}/auth/logout`} target="jaihind-lms" rel="noopener"><ExternalLink size={16} />Sign out of the LMS</a>
        : <a className="live-button" href={lmsHomeUrl()} target="jaihind-lms" rel="noopener"><ExternalLink size={16} />Open LMS in a new tab</a>}
    </div>
  </>;
}

function Courses({ data, grade, onEnded }: { data: ClassroomData; grade: string | null; onEnded: (code: string) => void }) {
  const [courses, setCourses] = useState<Load<LessonCourse[]>>({ state: 'loading' });
  const [scope, setScope] = useState<'class' | 'all'>('class');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<LessonCourse | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setCourses({ state: 'loading' });
    lmsCourses(abort.signal).then(r => setCourses({ state: 'ready', value: r.courses })).catch(e => {
      if (abort.signal.aborted) return;
      const code = codeOf(e);
      if (code === 'LMS_LINK_REQUIRED' || code === 'SIGN_IN_REQUIRED') onEnded(code);
      else setCourses({ state: 'error', code });
    });
    return () => abort.abort();
  }, [attempt, onEnded]);

  if (open) return <Lessons course={open} back={() => setOpen(null)} onEnded={onEnded} />;
  if (courses.state === 'loading') return <p className="lms-lessons-status" role="status"><Loader2 className="lms-spin" size={18} />Loading your courses…</p>;
  if (courses.state === 'error') return <Retry code={courses.code} retry={() => setAttempt(a => a + 1)} />;

  const mine = coursesForClass(courses.value, grade);
  const showing = scope === 'class' && mine.length ? mine : courses.value;
  const list = findCourses(showing, query);
  return <>
    <p className="live-muted lms-lessons-who">Signed in to the LMS as {data.session?.lms?.name}</p>
    {mine.length > 0 && mine.length < courses.value.length && <div className="lms-lessons-tabs" role="group" aria-label="Which courses">
      <button aria-pressed={scope === 'class'} onClick={() => setScope('class')}>{grade} ({mine.length})</button>
      <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All my courses ({courses.value.length})</button>
    </div>}
    {grade && !mine.length && courses.value.length > 0 && <p className="live-muted">No LMS course is set for {grade} yet, so all your courses are shown.</p>}
    {courses.value.length > 4 && <label>Find a course<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Course or subject" /></label>}
    <div className="lms-lessons-list">
      {list.map(c => <button key={c.id} onClick={() => setOpen(c)}>
        <BookOpen size={22} />
        <span><b>{c.title}</b><small>{[c.subject, c.className, `${c.lessons} ${c.lessons === 1 ? 'lesson' : 'lessons'}`, `${c.boards} with a board`].filter(Boolean).join(' · ')}</small></span>
      </button>)}
      {!list.length && <p className="live-muted">{courses.value.length ? `No course matches “${query}”.` : 'You have no LMS courses yet. Courses you create or teach in the LMS appear here.'}</p>}
    </div>
  </>;
}

function Lessons({ course, back, onEnded }: { course: LessonCourse; back: () => void; onEnded: (code: string) => void }) {
  const [detail, setDetail] = useState<Load<CourseLessons>>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setDetail({ state: 'loading' });
    lmsCourse(course.id, abort.signal).then(value => setDetail({ state: 'ready', value })).catch(e => {
      if (abort.signal.aborted) return;
      const code = codeOf(e);
      if (code === 'LMS_LINK_REQUIRED' || code === 'SIGN_IN_REQUIRED') onEnded(code);
      else setDetail({ state: 'error', code });
    });
    return () => abort.abort();
  }, [course.id, attempt, onEnded]);

  return <>
    <button className="lms-lessons-back" onClick={back}><ArrowLeft size={16} />All courses</button>
    <h3 className="lms-lessons-course">{course.title}</h3>
    {detail.state === 'loading' && <p className="lms-lessons-status" role="status"><Loader2 className="lms-spin" size={18} />Loading lessons…</p>}
    {detail.state === 'error' && <Retry code={detail.code} retry={() => setAttempt(a => a + 1)} />}
    {detail.state === 'ready' && <div className="lms-lessons-units">
      {lessonsByUnit(detail.value).map((group, i) => <section key={group.title ?? i}>
        {group.title && <h4>{group.title}</h4>}
        <ol>{group.lessons.map(l => <li key={l.id}>
          <span><b>{l.title}</b><small>{[l.minutes ? `${l.minutes} min` : '', l.board ? `${l.board.pages} ${l.board.pages === 1 ? 'page' : 'pages'}` : 'No board yet', l.status !== 'published' ? 'Draft' : ''].filter(Boolean).join(' · ')}</small></span>
          {l.board
            ? <a className="live-button live-primary" href={teachLessonUrl(l.id)}><Play size={15} />Teach</a>
            : <a className="live-button" href={`${lmsHomeUrl()}/lessons/${l.id}?mode=edit`} target="jaihind-lms" rel="noopener" title="Create this lesson's board in the LMS"><ExternalLink size={15} />Create in LMS</a>}
        </li>)}</ol>
      </section>)}
      {!detail.value.lessons.length && <p className="live-muted">This course has no lessons yet.</p>}
    </div>}
  </>;
}

function Retry({ code, retry }: { code: string; retry: () => void }) {
  return <div className="lms-lessons-status" role="alert"><span>{lessonMessage(code)}</span><button className="live-button" onClick={retry}><RefreshCw size={15} />Try again</button></div>;
}
