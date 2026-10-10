import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MappingSchema, SnapshotSchema, WeatherSchema, currentPeriod, dateKey, type Mapping, type Snapshot, type Weather } from './model';
export const MAPPING_KEY = 'jhw_classroom_mapping_v1';
export const DEFAULT_ERP_BASE = 'https://erp.jaihind.school/public/index.php';
/** An ERP web page on the server's configured ERP, or production if none is known. */
export function erpLink(base: unknown, route: string) {
  let url: URL;
  try { url = new URL(typeof base === 'string' ? base : DEFAULT_ERP_BASE); } catch { url = new URL(DEFAULT_ERP_BASE); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) url = new URL(DEFAULT_ERP_BASE);
  return `${url.href}?url=${route}`;
}
export const LiveClassContext = createContext<{ mapping: Mapping | null; snapshot: Snapshot | null; presenting: boolean }>({ mapping: null, snapshot: null, presenting: false });
export const useLiveClass = () => useContext(LiveClassContext);
export type ClassTeacherSession = { role: 'teacher'; name: string; classes: Pick<Mapping, 'classId'|'sectionId'|'grade'|'section'>[] };
export async function classroomRequest(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/classroom/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) { let code = 'ERP_UNAVAILABLE'; try { code = (await response.json()).code || code; } catch { /* Static-only hosts return HTML. */ } throw new Error(code); }
  return response.json();
}
// Node answers /api/health. PHP shared hosting has no such route, so fall back
// to classroom.php, which reports that the classroom connection is unavailable.
export async function classroomHealth(signal?: AbortSignal): Promise<{ classroomAPI?: boolean; classroomWeather?: boolean; erpBase?: string } | null> {
  for (const url of ['/api/health', '/api/classroom.php?action=health']) {
    try { const response = await fetch(url, { cache: 'no-store', signal }); if (response.ok) return await response.json(); }
    catch (error) { if (signal?.aborted) throw error; /* Not JSON or unreachable: try the next check. */ }
  }
  return null;
}
export function useClassroomData(now: number) {
  const [mapping, setMapping] = useState<Mapping | null>(() => { try { return MappingSchema.parse(JSON.parse(localStorage.getItem(MAPPING_KEY) || 'null')); } catch { return null; } });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [session, storeSession] = useState<ClassTeacherSession | null>(null);
  const authEpoch = useRef(0);
  const [ready, setReady] = useState(false);
  const [weatherReady, setWeatherReady] = useState(false);
  const [erpBase, setErpBase] = useState(DEFAULT_ERP_BASE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  const setSession = useCallback((value: ClassTeacherSession | null) => { authEpoch.current++; setSnapshot(null); storeSession(value); setError(''); refresh(); }, [refresh]);
  const boundary = useRef('');
  useEffect(() => {
    const abort = new AbortController(); const epoch = authEpoch.current;
    classroomHealth(abort.signal).then(async h => {
      if (abort.signal.aborted || epoch !== authEpoch.current) return;
      setWeatherReady(h?.classroomWeather === true);
      setErpBase(typeof h?.erpBase === 'string' ? h.erpBase : DEFAULT_ERP_BASE);
      if (!h?.classroomAPI) { setReady(false); storeSession(null); setSnapshot(null); return; }
      setReady(true);
      try { const s = await classroomRequest('session', undefined, abort.signal); if (!abort.signal.aborted && epoch === authEpoch.current) storeSession(s); } catch { if (!abort.signal.aborted && epoch === authEpoch.current) { storeSession(null); setSnapshot(null); } }
    }).catch(() => {});
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!ready || !mapping || session?.role !== 'teacher' || !session.classes.some(c => c.classId === mapping.classId && c.sectionId === mapping.sectionId)) { setSnapshot(null); setLoading(false); return; }
    const abort = new AbortController(); const epoch = authEpoch.current; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.hidden) { timer = setTimeout(poll, 90000); return; }
      setLoading(true);
      try { const data = SnapshotSchema.parse(await classroomRequest('snapshot', { mapping }, AbortSignal.any([abort.signal, AbortSignal.timeout(35000)]))); if (!abort.signal.aborted && epoch === authEpoch.current) { setSnapshot(data); setError(''); } }
      catch (e) { if (!abort.signal.aborted && epoch === authEpoch.current) { setSnapshot(null); setError(e instanceof Error ? e.message : 'ERP_UNAVAILABLE'); if (e instanceof Error && ['SIGN_IN_REQUIRED','CLASS_TEACHER_REQUIRED','CLASS_ACCESS_DENIED'].includes(e.message)) storeSession(null); } }
      finally { if (!abort.signal.aborted) { setLoading(false); timer = setTimeout(poll, 90000); } }
    };
    void poll();
    // A board switched on, or a tab brought back, refreshes at once rather than at the next 90-second poll.
    const visible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => { abort.abort(); clearTimeout(timer); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [ready, mapping, session, refresh, revision]);
  useEffect(() => {
    if (!weatherReady) return;
    const abort = new AbortController();
    const update = () => { void classroomRequest('weather', undefined, AbortSignal.any([abort.signal, AbortSignal.timeout(12000)])).then(w => { if (!abort.signal.aborted) setWeather(WeatherSchema.parse(w)); }).catch(() => { if (!abort.signal.aborted) setWeather(null); }); };
    update(); const timer = setInterval(update, 20 * 60000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [weatherReady]);
  useEffect(() => {
    if (!snapshot || !mapping) return;
    const state = currentPeriod(snapshot.timetable.periods, now, mapping.timezone, snapshot.timetable.holiday);
    const key = `${dateKey(now, mapping.timezone)}/${state.current?.id}/${state.next?.id}`;
    if (boundary.current && boundary.current !== key) refresh();
    boundary.current = key;
  }, [now, mapping, snapshot, refresh]);
  const saveMapping = (value: Mapping) => { const parsed = MappingSchema.parse(value); localStorage.setItem(MAPPING_KEY, JSON.stringify(parsed)); setSnapshot(null); setMapping(parsed); refresh(); };
  const logout = async () => { authEpoch.current++; setSnapshot(null); storeSession(null); try { await classroomRequest('logout', {}); setError(''); } catch { setError('SIGN_OUT_UNCONFIRMED'); } };
  return { mapping, snapshot: snapshot && mapping && snapshot.date === dateKey(now, mapping.timezone) ? snapshot : null, weather, session, ready, erpBase, error, loading, refresh, setSession, saveMapping, logout };
}
export type ClassroomData = ReturnType<typeof useClassroomData>;
