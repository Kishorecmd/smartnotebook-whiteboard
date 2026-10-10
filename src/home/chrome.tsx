import { useState } from 'react';
import { ChevronDown, Settings, Users, Cake, Volume2, VolumeX, House, PenLine, LayoutGrid, ClipboardCheck, LibraryBig, Gamepad2, MoreHorizontal, LogIn, Sun, CloudSun, CloudRain, CircleAlert, Wifi, WifiOff, RefreshCw, QrCode, Globe, MonitorPlay, Settings2, LogOut, Lock } from 'lucide-react';
import { weatherCondition, type Snapshot } from '../dashboard/model';
import { Avatar } from '../dashboard/Avatar';
import { setSoundOn, soundOn } from '../games/feedback';
import { classroomRequest, type ClassroomData } from '../dashboard/data';
import { DashboardModal, QrDialog } from '../dashboard/dialogs';
import type { SyncStatus, WeatherStatus } from './homeModel';

export type RailTarget = 'home' | 'board' | 'screens' | 'attendance' | 'students' | 'library' | 'games' | 'more' | 'settings';

type RailProps = { active: 'home' | 'screens'; attendanceReady: boolean; signedIn: boolean; onNavigate: (target: RailTarget) => void; onSignIn: () => void };

/** The left navigation rail: two-tap access to every classroom area. */
export function NavRail({ active, attendanceReady, signedIn, onNavigate, onSignIn }: RailProps) {
  const items: [RailTarget, string, typeof House][] = [['home', 'Home', House], ['board', 'Board', PenLine], ['screens', 'Screens', LayoutGrid], ['attendance', 'Attendance', ClipboardCheck], ['students', 'Students', Users], ['library', 'Library', LibraryBig], ['games', 'Games', Gamepad2], ['more', 'More', MoreHorizontal], ['settings', 'Settings', Settings]];
  return <nav className="sc-rail" aria-label="Classroom">
    {items.map(([target, label, Icon]) => <button key={target} onClick={() => onNavigate(target)} aria-current={target === active ? 'page' : undefined}
      disabled={(target === 'attendance' || target === 'students') && !attendanceReady} title={(target === 'attendance' || target === 'students') && !attendanceReady ? 'Sign in and choose your class first' : undefined}>
      <Icon size={24} aria-hidden="true" /><span>{label}</span>
    </button>)}
    {!signedIn && <button className="sc-rail-signin" onClick={onSignIn}><LogIn size={24} aria-hidden="true" /><span>Sign in</span></button>}
  </nav>;
}

const syncIcons = { connected: Wifi, syncing: RefreshCw, error: CircleAlert, offline: WifiOff, local: LogIn, sample: CircleAlert };

export function SyncIndicator({ status, onClick }: { status: SyncStatus; onClick: () => void }) {
  const Icon = syncIcons[status.kind];
  return <button className={`sc-sync sc-sync-${status.kind}`} onClick={onClick} aria-label={`${status.label}${status.detail ? `, ${status.detail}` : ''}. Classroom connection settings`}>
    <Icon size={16} aria-hidden="true" /><span><b>{status.label}</b>{status.detail && <small>{status.detail}</small>}</span>
  </button>;
}

export function WeatherChip({ status, sample }: { status: WeatherStatus; sample: boolean }) {
  const [open, setOpen] = useState(false);
  if (status.kind === 'unavailable') return <span className="sc-weather sc-weather-none">Weather unavailable</span>;
  const { weather } = status;
  const Icon = weather.code === 0 ? Sun : weather.code <= 3 ? CloudSun : CloudRain;
  return <>
    <button className={`sc-weather ${status.kind === 'stale' ? 'sc-weather-stale' : ''}`} onClick={() => setOpen(true)} aria-label={`${Math.round(weather.temperature)} degrees, ${weatherCondition(weather.code)}. Weather details`}>
      <Icon size={20} aria-hidden="true" /><b>{Math.round(weather.temperature)}°C</b><span>{weatherCondition(weather.code)}</span>
    </button>
    {open && <DashboardModal title={`Weather · ${weather.city}`} close={() => setOpen(false)}>
      <p className="sc-weather-big"><Icon size={40} aria-hidden="true" />{Math.round(weather.temperature)}°C · {weatherCondition(weather.code)}</p>
      <p>Feels like {Math.round(weather.feelsLike)}° · High {Math.round(weather.high)}° · Low {Math.round(weather.low)}° · Rain {weather.rain}%</p>
      <p className="live-muted">{sample ? 'Sample weather.' : `Updated ${status.age}. Weather by `}{!sample && <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>}</p>
    </DashboardModal>}
  </>;
}

type MoreProps = { snapshot: Snapshot | null; data: ClassroomData; close: () => void; onConnection: () => void; onOpenWhiteboard: (dialog: 'website' | 'youtube') => void };

/** Secondary information and tools, kept off the home screen to keep it calm. */
export function MoreDialog({ snapshot, data, close, onConnection, onOpenWhiteboard }: MoreProps) {
  const [qr, setQr] = useState(false);
  const birthdays = snapshot?.students.filter(s => s.birthday) ?? [];
  if (qr) return <QrDialog close={() => setQr(false)} />;
  return <DashboardModal title="More for today" close={close}>
    <div className="sc-more-tools">
      <button onClick={() => setQr(true)}><QrCode size={22} />Show QR code</button>
      <button onClick={() => { close(); onOpenWhiteboard('website'); }}><Globe size={22} />Open website</button>
      <button onClick={() => { close(); onOpenWhiteboard('youtube'); }}><MonitorPlay size={22} />Play YouTube</button>
      <button onClick={() => { close(); onConnection(); }}><Settings2 size={22} />Smartboard setup</button>
      {data.session && <button onClick={() => { close(); void data.logout(); }}><LogOut size={22} />Sign out</button>}
    </div>
    {birthdays.length > 0 && <section><h3>Birthday today</h3><p>{birthdays.map(s => s.name).join(', ')}</p></section>}
    {snapshot?.homework.map((n, i) => <section key={`hw-${i}`}><h3>{n.subject ? `${n.subject} · ` : ''}{n.title}</h3><p>{n.text}</p></section>)}
    {snapshot?.notices.map((n, i) => <section key={`notice-${i}`}><h3>{n.title}</h3><p>{n.text}</p><small>{n.public ? 'School announcement' : 'Teachers only'}</small></section>)}
    {snapshot && !birthdays.length && !snapshot.homework.length && !snapshot.notices.length && <p className="live-muted">No notices, homework or birthdays today.</p>}
  </DashboardModal>;
}

/** Leaving Student Mode needs the signed-in teacher's ERP password. */
export function StudentModeUnlock({ data, close, onUnlocked }: { data: ClassroomData; close: () => void; onUnlocked: () => void }) {
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <DashboardModal title="Return to teacher mode" close={close}>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try { await classroomRequest('confirm', { password }); onUnlocked(); }
      catch (err) {
        const code = err instanceof Error ? err.message : '';
        setError(code === 'PASSWORD_INCORRECT' ? 'That password is not right. Try again.' : code === 'TRY_LATER' ? 'Too many attempts. Wait five minutes, then try again.' : code === 'SIGN_IN_REQUIRED' ? 'Your sign-in has ended, so teacher mode is open again.' : 'The ERP could not check the password. Try again shortly.');
        // An ended session clears the class data before teacher mode reopens.
        if (code === 'SIGN_IN_REQUIRED') { data.setSession(null); onUnlocked(); }
      } finally { setPassword(''); setBusy(false); }
    }}>
      <p><Lock size={16} aria-hidden="true" /> Enter your ERP password to show attendance and teacher controls again.</p>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus /></label>
      <button className="live-button live-primary" disabled={busy}>{busy ? 'Checking…' : 'Unlock teacher mode'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </DashboardModal>;
}

/** The class shown on this board; one tap to switch between the teacher's classes. */
export function ClassSwitcher({ data, onSetup }: { data: ClassroomData; onSetup: () => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const mapping = data.mapping, classes = data.session?.classes ?? [];
  const label = mapping ? `${mapping.grade} · ${mapping.section}` : 'Choose class';
  const choose = async (c: typeof classes[number]) => {
    setBusy(true); setError('');
    try { const result = await classroomRequest('mapping', { ...c, device: mapping?.device ?? '', timezone: mapping?.timezone ?? 'Asia/Kolkata' }); data.saveMapping(result.mapping); setOpen(false); }
    catch { setError('That class could not be opened. Check your sign-in and try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <button className="sc-class-switch" aria-label={`Class: ${label}. Change class`} onClick={() => (data.session ? setOpen(true) : onSetup())}><b>{label}</b><ChevronDown size={18} aria-hidden="true" /></button>
    {open && <DashboardModal title="Your classes" close={() => setOpen(false)}>
      <div className="sc-class-list">{classes.map(c => { const current = c.classId === mapping?.classId && c.sectionId === mapping?.sectionId; return <button key={`${c.classId}/${c.sectionId}`} disabled={busy} aria-current={current ? 'true' : undefined} onClick={() => (current ? setOpen(false) : void choose(c))}>{c.grade} · {c.section}{current && <small>On this board</small>}</button>; })}</div>
      {classes.length <= 1 && <p className="live-muted">You are class teacher of one class.</p>}
      <button className="live-button" onClick={() => { setOpen(false); onSetup(); }}><Settings2 size={18} />Smartboard setup</button>
      {error && <p role="alert">{error}</p>}
    </DashboardModal>}
  </>;
}

/** Board settings in one place. */
export function SettingsDialog({ data, close, onSetup }: { data: ClassroomData; close: () => void; onSetup: () => void }) {
  const [sound, setSound] = useState(soundOn);
  return <DashboardModal title="Settings" close={close}>
    <div className="sc-more-tools">
      <button onClick={() => { close(); onSetup(); }}><Settings2 size={22} />Class and smartboard</button>
      <button aria-pressed={sound} onClick={() => { setSoundOn(!sound); setSound(!sound); }}>{sound ? <Volume2 size={22} /> : <VolumeX size={22} />}Game sounds: {sound ? 'on' : 'off'}</button>
      {data.session && <button onClick={() => { close(); void data.logout(); }}><LogOut size={22} />Sign out</button>}
    </div>
    <p className="live-muted">Student Mode hides attendance and student names. Leaving it asks for the signed-in teacher’s ERP password.</p>
  </DashboardModal>;
}

const STATUS_LABEL: Record<string, string> = { present: 'Present', absent: 'Absent', late: 'Late', leave: 'Leave', half_day: 'Half day', unmarked: 'Not marked' };

/** The class list with photos, today's attendance and birthdays, searchable by name. */
export function StudentsDialog({ snapshot, close }: { snapshot: Snapshot; close: () => void }) {
  const [query, setQuery] = useState('');
  const status = new Map(snapshot.attendance.students.map(s => [s.id, s.status ?? 'unmarked']));
  const list = snapshot.students.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <DashboardModal title={`Students (${snapshot.students.length})`} close={close}>
    <label>Find a student<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a name" autoFocus /></label>
    <div className="live-student-list">
      {list.map(s => { const st = status.get(s.id) ?? 'unmarked'; return <div key={s.id}><Avatar name={s.name} photo={s.photo} className="" /><b>{s.name}</b>{s.birthday && <Cake size={18} aria-label="Birthday today" />}<small className={`sc-status-${st}`}>{STATUS_LABEL[st]}</small></div>; })}
      {!list.length && <p className="live-muted">No student matches “{query}”.</p>}
    </div>
  </DashboardModal>;
}
