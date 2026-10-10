import { useState } from 'react';
import { House, PenLine, LayoutGrid, ClipboardCheck, LibraryBig, MoreHorizontal, LogIn, Sun, CloudSun, CloudRain, CircleAlert, Wifi, WifiOff, RefreshCw, QrCode, Globe, MonitorPlay, Settings2, LogOut, Lock } from 'lucide-react';
import { weatherCondition, type Snapshot } from '../dashboard/model';
import { classroomRequest, type ClassroomData } from '../dashboard/data';
import { DashboardModal, QrDialog } from '../dashboard/dialogs';
import type { SyncStatus, WeatherStatus } from './homeModel';

export type RailTarget = 'home' | 'board' | 'screens' | 'attendance' | 'library' | 'more';

type RailProps = { active: 'home' | 'screens'; attendanceReady: boolean; signedIn: boolean; onNavigate: (target: RailTarget) => void; onSignIn: () => void };

/** The left navigation rail: two-tap access to every classroom area. */
export function NavRail({ active, attendanceReady, signedIn, onNavigate, onSignIn }: RailProps) {
  const items: [RailTarget, string, typeof House][] = [['home', 'Home', House], ['board', 'Board', PenLine], ['screens', 'Screens', LayoutGrid], ['attendance', 'Attendance', ClipboardCheck], ['library', 'Library', LibraryBig], ['more', 'More', MoreHorizontal]];
  return <nav className="sc-rail" aria-label="Classroom">
    {items.map(([target, label, Icon]) => <button key={target} onClick={() => onNavigate(target)} aria-current={target === active ? 'page' : undefined}
      disabled={target === 'attendance' && !attendanceReady} title={target === 'attendance' && !attendanceReady ? 'Sign in and choose your class to take attendance' : undefined}>
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
