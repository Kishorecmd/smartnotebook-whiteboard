import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { classroomRequest, erpLink, type ClassroomData } from './data';
import { Avatar } from './Avatar';
import './dashboard.css';

export function DashboardModal({ title, close, children }: {title: string; close: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; const previous = document.activeElement as HTMLElement | null; d?.showModal(); return () => { d?.close(); previous?.focus(); }; }, []);
  return <dialog className="live-dialog" ref={ref} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-label={title}><header><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={close}><X size={22} /></button></header>{children}</dialog>;
}
export function ConnectionDialog({ data, close }: {data: ClassroomData; close: () => void}) {
  const [credential, setCredential] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [chosen, setChosen] = useState(''), [device, setDevice] = useState(data.mapping?.device || ''), [timezone, setTimezone] = useState(data.mapping?.timezone || 'Asia/Kolkata');
  const classes = data.session?.classes || [];
  const previous = classes.find(c => c.classId === data.mapping?.classId && c.sectionId === data.mapping?.sectionId);
  const selected = classes.some(c => `${c.classId}/${c.sectionId}` === chosen) ? chosen : previous ? `${previous.classId}/${previous.sectionId}` : classes.length === 1 ? `${classes[0].classId}/${classes[0].sectionId}` : '';
  const connectionError = (e: unknown) => {
    const code = e instanceof Error ? e.message : '';
    return code === 'CLASS_TEACHER_REQUIRED' ? 'This account has no class teacher assignment. Ask the school office to update your class and section in ERP.' : code === 'CLASS_ACCESS_DENIED' ? 'Your account is not authorized for this classroom. Sign in with its class teacher account.' : code === 'TRY_LATER' ? 'Too many sign-in attempts. Please wait five minutes and try again.' : code === 'SIGN_IN_REQUIRED' ? 'Please check your ERP username and password, then sign in again.' : 'The school ERP could not be reached. Please try again shortly.';
  };
  return <DashboardModal title="Classroom connection" close={close}>
    {!data.checked ? <p role="status">Connecting to the school ERP…</p> : !data.ready ? <><p>The classroom connection service is unavailable. Your whiteboard and classroom tools are ready to use.</p><p>When connected, sign in with your existing class teacher ERP account to open your assigned classroom.</p><button className="live-button" onClick={data.refresh}>Retry connection</button><a className="live-button" href={erpLink(data.erpBase, 'teacher-portal/login')} target="_blank" rel="noopener noreferrer">Open school ERP <ArrowUpRight size={17}/></a></> : !data.session ? <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const s = await classroomRequest('login', { credential, password }); setPassword(''); data.setSession(s); } catch (e) { setPassword(''); setError(connectionError(e)); } finally { setBusy(false); } }}>
      <p>Sign in with your existing class teacher ERP account. Only the class and section assigned to you as class teacher will be available.</p>
      <label>Email or username<input autoComplete="username" required value={credential} onChange={e => setCredential(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="live-button live-primary" disabled={busy}>{busy ? 'Signing in…' : 'Class teacher sign in'}</button>
    </form> : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const c = classes.find(c => `${c.classId}/${c.sectionId}` === selected); if(!c) return; const result = await classroomRequest('mapping', { ...c, device, timezone }); data.saveMapping(result.mapping); close(); } catch (e) { setError(connectionError(e)); } finally { setBusy(false); } }}>
      <p><span className="live-teacher"><Avatar name={data.session.name || 'T'} photo={data.snapshot?.teacherPhoto}/>Signed in as <strong>{data.session.name || 'class teacher'}</strong></span>. Choose your classroom to connect this smartboard.</p><label>Your class and section<select required value={selected} onChange={e => setChosen(e.target.value)}><option value="">Choose your classroom</option>{classes.map(c => <option key={`${c.classId}/${c.sectionId}`} value={`${c.classId}/${c.sectionId}`}>{c.grade} · {c.section}</option>)}</select></label><label>Smartboard name<input maxLength={80} value={device} onChange={e => setDevice(e.target.value)} placeholder="Classroom smartboard" /></label><label>Timezone<input required value={timezone} onChange={e => setTimezone(e.target.value)} /></label><button disabled={busy || !selected} className="live-button live-primary">{busy ? 'Connecting…' : 'Open my classroom'}</button><button type="button" disabled={busy} className="live-button" onClick={() => { setError(''); void data.logout(); }}>Sign out</button>
    </form>}
    <p className="live-muted">Student lists stay in memory for this session. Only the classroom choice is saved on this device.</p>
    {error && <p role="alert">{error}</p>}
  </DashboardModal>;
}

export function QrDialog({close}:{close:()=>void}) {
  const [url,setUrl] = useState('https://whiteboard.jaihind.school/'), [image,setImage] = useState(''), [error,setError] = useState('');
  useEffect(()=> { let active = true; setImage(''); setError(''); const timer = setTimeout(async()=> { try { const parsed = new URL(url); if(!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid URL'); const qr = await import('qrcode'); const data = await qr.toDataURL(parsed.href,{width:300,margin:2}); if(active) setImage(data); } catch { if(active) setError('Enter a full website address starting with https://'); } },200); return()=>{active=false;clearTimeout(timer);}; },[url]);
  return <DashboardModal title="Share a website" close={close}><label>Website address<input type="url" maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)}/></label>{image && <img className="live-qr" src={image} alt="QR code for the website address above"/>}{error && <p role="alert">{error}</p>}<p className="live-muted">Created on this device. No link is sent to a QR service.</p></DashboardModal>;
}
