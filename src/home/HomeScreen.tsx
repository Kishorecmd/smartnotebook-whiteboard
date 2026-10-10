import { useEffect, useState } from 'react';
import { dateKey, minuteOfDay, type Mapping, type Snapshot } from '../dashboard/model';
import type { ClassroomData } from '../dashboard/data';
import { DashboardModal } from '../dashboard/dialogs';
import { Avatar } from '../dashboard/Avatar';
import { AttendanceCard, LessonCard, NextCard } from './cards';
import { TimetableStrip } from './TimetableStrip';
import { attendanceStatus, classDataState, greetingFor, lessonStatus, NO_DATA_TEXT, parseObjectives, timetableItems, type Objective } from './homeModel';
import { BirthdayCard, ObjectivesCard, WordOfTheDay } from './extras';
import './home.css';

const SCENARIOS: [string, string][] = [['normal', 'Attendance marked'], ['unmarked', 'Not marked'], ['all', 'All present'], ['break', 'Break'], ['lunch', 'Lunch'], ['empty', 'No classes'], ['holiday', 'Holiday'], ['offline', 'ERP unavailable'], ['weather', 'Weather unavailable']];

type Props = {
  now: number;
  mapping: Mapping | null;
  snapshot: Snapshot | null;
  studentMode: boolean;
  data: ClassroomData;
  preview: boolean;
  onPreview: (enabled: boolean, grade?: string, scenario?: string) => void;
  onStartLesson: () => void;
  onConnection: () => void;
  onTakeAttendance: () => void;
};

/** The welcome dashboard: who is here, what is happening now, and one tap to start teaching. */
export function HomeScreen({ now, mapping, snapshot, studentMode, data, preview, onPreview, onStartLesson, onConnection, onTakeAttendance }: Props) {
  const [list, setList] = useState<'present' | 'absent' | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  // Objectives are kept for this session only, like the old single goal.
  const [objectives, setObjectives] = useState<Objective[] | null>(null);
  const [draft, setDraft] = useState('');
  const [scenario, setScenario] = useState('normal');
  useEffect(() => { if (studentMode) { setList(null); setEditingGoal(false); } }, [studentMode]);

  const timezone = mapping?.timezone || 'Asia/Kolkata';
  const signedIn = !!data.session;
  const lesson = lessonStatus(snapshot, now, timezone);
  const dataState = classDataState({ snapshot, error: data.error, signedIn, hasClass: !!mapping, preview });
  const attendance = attendanceStatus(snapshot, dataState);
  const goals = objectives ?? parseObjectives(snapshot?.learning ?? '');
  const birthdays = snapshot?.students.filter(s => s.birthday) ?? [];
  const openEditor = () => { setDraft(goals.map(o => o.text).join('\n')); setEditingGoal(true); };
  const date = new Intl.DateTimeFormat('en-IN', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const publicNotice = snapshot?.notices.find(n => n.public);
  const students = snapshot?.attendance.students.filter(s => list === 'present' ? s.status === 'present' || s.status === 'late' : s.status === 'absent') ?? [];

  return <div className={`sc-home ${studentMode ? 'sc-student-mode' : ''}`} aria-label="Classroom home">
    {preview && <div className="sc-preview" role="status">
      <b>Preview · sample data only</b>
      {!studentMode && <>
        <select aria-label="Preview classroom" value={mapping?.grade} onChange={e => onPreview(true, e.target.value, scenario)}>{['KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'].map(g => <option key={g}>{g}</option>)}</select>
        <select aria-label="Preview scenario" value={scenario} onChange={e => { setScenario(e.target.value); onPreview(true, mapping?.grade, e.target.value); }}>{SCENARIOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={() => onPreview(false)}>Exit preview</button>
      </>}
    </div>}

    <section className="sc-welcome">
      <h1>{greetingFor(minuteOfDay(now, timezone))}{mapping ? `, ${mapping.grade}` : ''}!</h1>
      <p>{date}{mapping ? ` · Section ${mapping.section}` : ''}</p>
      {!mapping && !preview && !studentMode && <button className="sc-link" onClick={() => onPreview(true)}>Preview the layout with sample data</button>}
    </section>

    <div className="sc-cards">
      {!studentMode && <AttendanceCard status={attendance} canTake={!!mapping && !preview && !!snapshot} onTake={onTakeAttendance} onList={setList} onSignIn={onConnection} onRetry={data.refresh} />}
      <LessonCard status={lesson} partial={!!snapshot && !snapshot.timetable.complete} dataState={dataState} studentMode={studentMode} onStart={onStartLesson} />
      <NextCard status={lesson} />
    </div>

    <TimetableStrip items={timetableItems(snapshot, now, timezone)} holiday={snapshot?.timetable.holiday} emptyText={dataState === 'ready' ? 'No lessons scheduled today.' : NO_DATA_TEXT[dataState]} />

    <div className="sc-extras">
      <ObjectivesCard objectives={goals} studentMode={studentMode} onEdit={openEditor}
        onToggle={i => setObjectives(goals.map((o, j) => (j === i ? { ...o, done: !o.done } : o)))} />
      <WordOfTheDay date={dateKey(now, timezone)} />
      {!studentMode && birthdays.length > 0 && <BirthdayCard students={birthdays} />}
    </div>

    {studentMode && publicNotice && <p className="sc-announcement" role="status">{publicNotice.text}</p>}

    {!studentMode && list && <DashboardModal title={list === 'present' ? 'Present students' : 'Absent students'} close={() => setList(null)}>
      <div className="live-student-list">{students.map(s => <div key={s.id}><Avatar name={s.name} photo={s.photo} className="" /><b>{s.name}</b><small>{s.status}</small></div>)}</div>
      {list === 'absent' && students.length === 0 && <p>Everyone is here today.</p>}
    </DashboardModal>}
    {!studentMode && editingGoal && <DashboardModal title="Today's learning objectives" close={() => setEditingGoal(false)}>
      <label>One objective per line, up to five<textarea maxLength={900} value={draft} onChange={e => setDraft(e.target.value)} placeholder={'Recognise the letter sound\nFind pictures that start with it\nWrite the letter'} /></label>
      <p className="live-muted">Shown in Student Mode. Tick them off as the lesson goes. Kept for this session only.</p>
      <button className="live-button live-primary" onClick={() => { setObjectives(parseObjectives(draft, goals)); setEditingGoal(false); }}>Save objectives</button>
    </DashboardModal>}
  </div>;
}
