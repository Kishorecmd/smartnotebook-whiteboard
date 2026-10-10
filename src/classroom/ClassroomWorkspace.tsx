import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Type, Timer, Clock3, Shuffle, Users, VolumeX, TrafficCone, Dices, Trophy, Image, Plus, X, GripHorizontal, Copy, MonitorSmartphone, Lock, LayoutTemplate, Download, Upload, Check, Sparkles, ArrowUpRight, Undo2 } from 'lucide-react';
import { backgrounds, initialWorkspace, labels, makeScreen, makeWidget, parseWorkspace, restoreWidget, STORAGE_KEY, widgetKinds, type ClassroomWidget, type ClassroomWorkspace as Workspace, type WidgetKind } from './model';
import { WidgetContent } from './Widgets';
import './classroom.css';
import { AudioLines, Settings, LoaderPinwheel, Eraser, Shapes, Ruler, Triangle, DraftingCompass, StickyNote, PenTool } from 'lucide-react';
import { openOnBoard, type BoardAction } from '../teaching-tools/launch';
import { lmsHomeUrl } from '../lms/bridge';

// Whiteboard tools in the dock open the board with the tool ready.
const boardTools: [string, typeof PenTool, BoardAction, string][] = [
  ['Pen', PenTool, { tool: 'pen' }, 'draw'], ['Eraser', Eraser, { tool: 'eraser' }, 'eraser'], ['Shapes', Shapes, { tool: 'shape' }, 'shapes'],
  ['Ruler', Ruler, { teachingTool: 'ruler' }, 'ruler'], ['Protractor', Triangle, { teachingTool: 'protractor' }, 'protractor'],
  ['Compass', DraftingCompass, { teachingTool: 'compass' }, 'compass'], ['Sticky notes', StickyNote, { teachingTool: 'sticky-notes' }, 'sticky'],
];
import { ConnectionDialog } from '../dashboard/dialogs';
import { TakeAttendance } from '../dashboard/TakeAttendance';
import { LiveClassContext, useClassroomData } from '../dashboard/data';
import type { Mapping, Snapshot, Weather } from '../dashboard/model';
import { HomeScreen } from '../home/HomeScreen';
import { ClassSwitcher, MoreDialog, NavRail, SettingsDialog, StudentModeUnlock, StudentsDialog, SyncIndicator, WeatherChip, type RailTarget } from '../home/chrome';
import { syncStatus, weatherStatus } from '../home/homeModel';
import { readStudentMode, writeStudentMode } from '../home/studentMode';
import { levelForGrade, type Level } from '../games/logic';
import type { GameId } from '../games/catalog';

// The games load the first time they are opened, so the classroom starts as fast as before.
const GamesLibrary = lazy(() => import('../games/GamesLibrary').then(m => ({ default: m.GamesLibrary })));
const GameShell = lazy(() => import('../games/GamesLibrary').then(m => ({ default: m.GameShell })));
import { useWhiteboardStore } from '../store';

const icons = { text: Type, timer: Timer, clock: Clock3, sound: AudioLines, random: Shuffle, groups: Users, symbols: VolumeX, traffic: TrafficCone, dice: Dices, score: Trophy, spinner: LoaderPinwheel };
const backgroundNames = { meadow: 'Quiet meadow', sunrise: 'Golden hour', lavender: 'Lavender skies', paper: 'Clean paper', midnight: 'Night class' };
const uid = () => crypto.randomUUID();
const load = (): Workspace => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? parseWorkspace(raw) : initialWorkspace(); } catch { return initialWorkspace(); } };

type Props = { onWhiteboard: () => void };
export const ClassroomWorkspace: React.FC<Props> = ({ onWhiteboard }) => {
  const [workspace, setWorkspace] = useState(load);
  const [home, setHome] = useState(true);
  const [connection, setConnection] = useState(false);
  const [preview, setPreview] = useState<{mapping:Mapping;snapshot:Snapshot|null;weather:Weather|null}|null>(null);
  const [panel, setPanel] = useState<'none' | 'backgrounds' | 'templates' | 'screens'>('none');
  // Student Mode hides attendance, student lists and teacher controls. It is
  // remembered on the device so reloading the page does not leave it.
  const [presenting, setPresenting] = useState(readStudentMode);
  useEffect(() => { writeStudentMode(presenting); }, [presenting]);
  const [unlocking, setUnlocking] = useState(false);
  const [more, setMore] = useState(false);
  const [taking, setTaking] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playing, setPlaying] = useState<{ id: Exclude<GameId, 'drawing'>; level: Level; withClass: boolean } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [removed, setRemoved] = useState<{ screenId: string; widget: ClassroomWidget } | null>(null);
  const [now, setNow] = useState(Date.now());
  const live = useClassroomData(now);
  const mapping = preview?.mapping || live.mapping;
  const snapshot = preview ? preview.snapshot : live.snapshot;
  const weather = preview ? preview.weather : live.weather;
  const showPreview = async (enabled: boolean, grade = 'Grade 3', scenario = 'normal') => {
    if (!enabled) { setPreview(null); return; }
    const { previewData } = await import('../dashboard/preview');
    const sample = previewData(grade, scenario);
    setPreview({...sample, snapshot:scenario === 'offline' ? null : sample.snapshot, weather:scenario === 'weather' ? null : sample.weather});
  };
  const [size, setSize] = useState({ width: 1200, height: 600 });
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; pointerId: number; x: number; y: number; left: number; top: number; width: number; height: number; resize: boolean } | null>(null);
  const screen = workspace.screens.find(s => s.id === workspace.activeId) ?? workspace.screens[0];
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); setSaveError(false); } catch { setSaveError(true); } }, [workspace]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current); return () => observer.disconnect();
  }, []);
  // A signed-in teacher's data stays hidden until the teacher confirms their password.
  const locked = !!live.session && !preview;
  const enterStudentMode = () => { setPresenting(true); setPanel('none'); setConnection(false); setMore(false); setTaking(false); setRosterOpen(false); setSettingsOpen(false); };
  const leaveStudentMode = () => { if (locked) setUnlocking(true); else setPresenting(false); };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPanel('none');
      if (presenting && !unlocking) { if (locked) setUnlocking(true); else setPresenting(false); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [presenting, unlocking, locked]);
  const openInWhiteboard = (target: 'library' | 'website' | 'youtube') => {
    onWhiteboard();
    const store = useWhiteboardStore.getState();
    if (target === 'library') store.openLibrary('templates');
    else if (target === 'website') store.setWebAppDialogOpen(true);
    else store.setYouTubeDialogOpen(true);
  };
  const attendanceReady = !!mapping && !!snapshot && !preview;
  const navigate = (target: RailTarget) => {
    if (target === 'home') setHome(true);
    else if (target === 'board') onWhiteboard();
    else if (target === 'screens') { if (home) setHome(false); else setPanel(panel === 'screens' ? 'none' : 'screens'); }
    else if (target === 'attendance') { if (attendanceReady) setTaking(true); }
    else if (target === 'library') openInWhiteboard('library');
    // LMS lessons open in their own tab, so this classroom screen stays as it is.
    else if (target === 'lessons') window.open(lmsHomeUrl(), 'jaihind-lms', 'noopener');
    else if (target === 'games') setGamesOpen(true);
    else if (target === 'students') { if (attendanceReady) setRosterOpen(true); }
    else if (target === 'settings') setSettingsOpen(true);
    else setMore(true);
  };
  const sync = syncStatus({ preview: !!preview, checked: live.checked, ready: live.ready, signedIn: !!live.session, hasClass: !!mapping, error: live.error, snapshot, now });
  const timezone = mapping?.timezone || 'Asia/Kolkata';
  useEffect(() => {
    if (panel === 'none' || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const buttons = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = buttons(), first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element.addEventListener('keydown', trap);
    return () => { element.removeEventListener('keydown', trap); previous?.focus(); };
  }, [panel]);
  const editScreen = (change: Partial<typeof screen>) => setWorkspace(w => ({ ...w, screens: w.screens.map(s => s.id === screen.id ? { ...s, ...change } : s) }));
  const editWidget = (id: string, change: Partial<ClassroomWidget>) => setWorkspace(w => ({ ...w, screens: w.screens.map(s => s.id === screen.id ? { ...s, widgets: s.widgets.map(widget => widget.id === id ? { ...widget, ...change } : widget) } : s) }));
  const updateData = (id: string, data: ClassroomWidget['data']) => setWorkspace(w => ({ ...w, screens: w.screens.map(s => s.id === screen.id ? { ...s, widgets: s.widgets.map(widget => widget.id === id ? { ...widget, data: { ...widget.data, ...data } } : widget) } : s) }));
  const addWidget = (kind: WidgetKind) => {
    if (screen.widgets.length >= 60) { setNotice('This screen has 60 widgets. Start a new screen for more space.'); return; }
    setHome(false); const widget = makeWidget(kind, screen.widgets.length);
    editScreen({ widgets: [...screen.widgets, widget] }); setSelected(widget.id); setPanel('none');
  };
  const addScreen = (template: 'welcome' | 'focus' | 'teams' | 'blank') => {
    if (workspace.screens.length >= 50) { setNotice('You have 50 screens. Download a backup before starting a new workspace.'); return; }
    setHome(false); const next = makeScreen(template);
    setWorkspace(w => ({ ...w, activeId: next.id, screens: [...w.screens, next] })); setPanel('none'); setSelected(null);
  };
  const duplicate = (widget: ClassroomWidget) => {
    if (screen.widgets.length >= 60) return;
    const next = { ...structuredClone(widget), id: uid(), x: Math.min(0.7, widget.x + 0.04), y: Math.min(0.6, widget.y + 0.06) };
    editScreen({ widgets: [...screen.widgets, next] }); setSelected(next.id);
  };
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, widget: ClassroomWidget, resize = false) => {
    if (e.button !== 0 || window.matchMedia('(max-width: 1000px)').matches) return;
    e.currentTarget.setPointerCapture(e.pointerId); setSelected(widget.id);
    drag.current = { id: widget.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: Math.min(widget.x, Math.max(0, 1 - widget.width / size.width)), top: Math.min(widget.y, Math.max(0, 1 - widget.height / size.height)), width: widget.width, height: widget.height, resize };
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (d.resize) editWidget(d.id, { width: Math.max(220, Math.min(900, size.width * (1 - d.left), d.width + dx)), height: Math.max(180, Math.min(800, size.height * (1 - d.top), d.height + dy)) });
    else editWidget(d.id, { x: Math.max(0, Math.min(Math.max(0, 1 - d.width / size.width), d.left + dx / size.width)), y: Math.max(0, Math.min(Math.max(0, 1 - d.height / size.height), d.top + dy / size.height)) });
  };
  const finishDrag = () => { drag.current = null; };
  const exportScreens = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'smartnotebook-screens.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importScreens = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large');
      const imported = parseWorkspace(await file.text());
      if (workspace.screens.length + imported.screens.length > 50) throw new Error('Too many screens');
      const copies = imported.screens.map(s => ({ ...s, id: uid(), widgets: s.widgets.map(w => ({ ...w, id: uid() })) }));
      setWorkspace(w => ({ ...w, activeId: copies[0].id, screens: [...w.screens, ...copies] })); setNotice('Your screens have been imported.'); setPanel('none');
    } catch { setNotice('That file could not be imported. Choose a Smartnotebook screens backup, up to 5 MB and 50 total screens.'); }
    if (upload.current) upload.current.value = '';
  };
  return <div className={`cs-workspace cs-bg-${screen.background} ${presenting ? 'cs-presenting' : ''}`}>
    <div className="cs-landscape" aria-hidden="true"><div className="cs-sun" /><div className="cs-hill cs-hill-back" /><div className="cs-hill cs-hill-front" /></div>
    <header className="cs-header sc-header" inert={panel !== 'none'}>
      <div className="cs-school-brand"><img src="/jaihind-school-logo.webp" alt="Jaihind International School logo"/><div><b>Jaihind International School</b><small>SMART CLASSROOM</small></div></div>
      {presenting ? mapping && <span className="sc-class-switch sc-class-static"><b>{mapping.grade} · {mapping.section}</b></span> : <ClassSwitcher data={live} onSetup={() => setConnection(true)} />}
      {!presenting && <SyncIndicator status={sync} onClick={() => setConnection(true)} />}
      <WeatherChip status={weatherStatus(weather, now)} sample={!!preview} />
      <div className="sc-clock"><strong>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,hour:'numeric',minute:'2-digit',hour12:true}).format(now)}</strong><span>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,weekday:'short',day:'numeric',month:'short'}).format(now)}</span></div>
      {!presenting && <button className="sc-icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={22} /></button>}
      {presenting
        ? <button className="sc-mode-button sc-mode-locked" onClick={leaveStudentMode}><Lock size={18}/><span>Teacher mode</span></button>
        : <button className="sc-mode-button" onClick={enterStudentMode}><MonitorSmartphone size={18}/><span>Student mode</span></button>}
    </header>
    {!presenting && <NavRail active={home ? 'home' : 'screens'} attendanceReady={attendanceReady} signedIn={!!live.session} onNavigate={navigate} onSignIn={() => setConnection(true)} />}
    <LiveClassContext.Provider value={{mapping,snapshot,presenting}}>
    {home && <HomeScreen now={now} mapping={mapping} snapshot={snapshot} studentMode={presenting} data={live} preview={!!preview} onPreview={(...args)=>void showPreview(...args)} onStartLesson={onWhiteboard} onConnection={()=>setConnection(true)} onTakeAttendance={()=>setTaking(true)}/>}
    {!home && !presenting && <div className="sc-screens-bar"><button className="cs-screen-switch" onClick={() => setPanel(panel === 'screens' ? 'none' : 'screens')}><span className="cs-screen-number">{workspace.screens.findIndex(s => s.id === screen.id) + 1}</span><span>{screen.title || 'Untitled screen'}</span><small>{workspace.screens.length} {workspace.screens.length === 1 ? 'screen' : 'screens'}</small></button><div className="sc-screens-actions"><button className="cs-template-link" onClick={() => setPanel(panel === 'backgrounds' ? 'none' : 'backgrounds')}><Image size={16} />Background</button><button className="cs-template-link" onClick={() => setPanel(panel === 'templates' ? 'none' : 'templates')}><LayoutTemplate size={16} />Templates<ArrowUpRight size={14} /></button></div></div>}
    <main className={`cs-stage ${home ? 'cs-widget-stage-hidden' : ''}`} ref={stage} aria-label="Classroom screen" inert={panel !== 'none'}>
      {screen.widgets.length === 0 && <div className="cs-empty"><Sparkles size={40} strokeWidth={1} /><h1>A little space.<br />A world of possibilities.</h1><p>Add a widget below, or start with a ready-made screen.</p><button className="cs-primary" onClick={() => setPanel('templates')}><LayoutTemplate size={17} />Explore templates</button></div>}
      {screen.widgets.map(widget => {
        if (presenting && ['random','groups','score'].includes(widget.kind)) return null;
        const Icon = icons[widget.kind];
        const width = Math.min(widget.width, Math.max(220, size.width));
        const height = Math.min(widget.height, Math.max(180, size.height));
        const left = Math.max(0, Math.min(widget.x * size.width, size.width - width));
        const top = Math.max(0, Math.min(widget.y * size.height, size.height - height));
        return <section key={widget.id} aria-label={`${labels[widget.kind]} widget`} className={`cs-widget ${presenting && ['random','groups','score'].includes(widget.kind) ? 'cs-private-widget' : ''} cs-widget-${widget.kind} ${selected === widget.id ? 'cs-selected' : ''}`} style={{ left, top, width, height, zIndex: selected === widget.id ? 2 : 1 }} onFocus={() => setSelected(widget.id)}>
          <div className="cs-widget-header"><button className="cs-widget-handle" aria-label={`Move ${labels[widget.kind]} widget`} title="Drag to move. Arrow keys also move the widget."
            onPointerDown={e => startDrag(e, widget)} onPointerMove={move} onPointerUp={finishDrag} onPointerCancel={finishDrag}
            onKeyDown={e => { const steps: Record<string, [number, number]> = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }; const step = steps[e.key]; if (step) { e.preventDefault(); editWidget(widget.id, { x: Math.max(0, Math.min(1, widget.x + step[0])), y: Math.max(0, Math.min(1, widget.y + step[1])) }); } }}><Icon size={15} /><span>{labels[widget.kind]}</span><GripHorizontal size={15} /></button>
            <button className="cs-widget-action" aria-label={`Duplicate ${labels[widget.kind]} widget`} onClick={() => duplicate(widget)}><Copy size={13} /></button>
            <button className="cs-widget-action" aria-label={`Remove ${labels[widget.kind]} widget`} onClick={() => { setRemoved({ screenId: screen.id, widget }); editScreen({ widgets: screen.widgets.filter(w => w.id !== widget.id) }); }}><X size={16} /></button>
          </div>
          <div className="cs-widget-body"><WidgetContent widget={widget} now={now} update={data => updateData(widget.id, data)} /></div>
          <button className="cs-resize" aria-label={`Resize ${labels[widget.kind]} widget`} onPointerDown={e => startDrag(e, widget, true)} onPointerMove={move} onPointerUp={finishDrag} onPointerCancel={finishDrag}><span /></button>
        </section>;
      })}
    </main></LiveClassContext.Provider>
    <footer className="cs-footer sc-dock-bar" inert={panel !== 'none'}>
      <nav className="cs-dock" aria-label="Classroom tools">{boardTools.map(([label, Icon, action, colour]) => <button key={label} aria-label={`Open the whiteboard with ${label.toLowerCase()}`} onClick={() => { onWhiteboard(); openOnBoard(action); }}><span className={`cs-dock-icon cs-color-${colour}`}><Icon size={24} /></span><span>{label}</span></button>)}<i />{widgetKinds.map(kind => { const Icon = icons[kind]; return <button key={kind} onClick={() => addWidget(kind)} aria-label={`Add ${labels[kind]} widget`}><span className={`cs-dock-icon cs-color-${kind}`}><Icon size={24} /></span><span>{labels[kind]}</span></button>; })}</nav>
    </footer>
    {panel !== 'none' && <div className="cs-panel-shade" onClick={() => setPanel('none')}><section ref={dialog} className="cs-panel" role="dialog" aria-modal="true" aria-label={panel === 'backgrounds' ? 'Choose a background' : panel === 'templates' ? 'Classroom templates' : 'Your screens'} onClick={e => e.stopPropagation()}>
      <header><div><span className="cs-eyebrow">MAKE IT YOURS</span><h2>{panel === 'backgrounds' ? 'Set the mood.' : panel === 'templates' ? 'A little inspiration.' : 'Your classroom screens.'}</h2></div><button className="cs-icon-button" aria-label="Close classroom panel" onClick={() => setPanel('none')}><X size={20} /></button></header>
      {panel === 'backgrounds' && <div className="cs-background-grid">{backgrounds.map(bg => <button key={bg} aria-pressed={screen.background === bg} onClick={() => { editScreen({ background: bg }); setPanel('none'); }}><span className={`cs-background-sample cs-bg-${bg}`} /><b>{backgroundNames[bg]}</b>{screen.background === bg && <Check size={16} />}</button>)}</div>}
      {panel === 'templates' && <><p>Start a new screen with a few classroom essentials.</p><div className="cs-template-grid">{([['welcome', 'Morning welcome', 'A gentle start to a bright day.', '✦'], ['focus', 'Quiet focus', 'Space to think. Time to discover.', '◉'], ['teams', 'Team challenge', 'A shared challenge, a little friendly fun.', '☀'], ['blank', 'Blank canvas', 'Your lesson, your way.', '+']] as const).map(([id, name, desc, symbol]) => <button key={id} onClick={() => addScreen(id)} className={`cs-template-card cs-template-${id}`}><span>{symbol}</span><h3>{name}</h3><p>{desc}</p><small>Create screen <ArrowUpRight size={14} /></small></button>)}</div></>}
      {panel === 'screens' && <><div className="cs-screen-list">{workspace.screens.map((s, i) => <button key={s.id} aria-current={s.id === screen.id ? 'page' : undefined} onClick={() => { setHome(false); setWorkspace(w => ({ ...w, activeId: s.id })); setPanel('none'); setSelected(null); }}><span className={`cs-screen-thumb cs-bg-${s.background}`}>{i + 1}</span><span><b>{s.title || 'Untitled screen'}</b><small>{s.widgets.length} widgets</small></span>{s.id === screen.id && <Check size={18} />}</button>)}</div><div className="cs-screen-actions"><button className="cs-primary" onClick={() => addScreen('blank')}><Plus size={16} />New screen</button><button className="cs-subtle" onClick={exportScreens}><Download size={16} />Download backup</button><button className="cs-subtle" onClick={() => upload.current?.click()}><Upload size={16} />Import screens</button></div><p className="cs-storage-note">Saved in this browser. Download a backup to move your screens to another device.</p></>}
    </section></div>}
    {connection && !presenting && <ConnectionDialog data={live} close={()=>setConnection(false)}/>}
    {rosterOpen && !presenting && snapshot && <StudentsDialog snapshot={snapshot} close={() => setRosterOpen(false)} />}
    {settingsOpen && !presenting && <SettingsDialog data={live} close={() => setSettingsOpen(false)} onSetup={() => setConnection(true)} />}
    {more && !presenting && <MoreDialog snapshot={snapshot} data={live} close={() => setMore(false)} onConnection={() => setConnection(true)} onOpenWhiteboard={openInWhiteboard} />}
    {taking && !presenting && attendanceReady && snapshot && mapping && <TakeAttendance data={live} mapping={mapping} attendance={snapshot.attendance} close={() => setTaking(false)} />}
    <Suspense fallback={null}>
      {gamesOpen && !playing && <GamesLibrary defaultLevel={levelForGrade(mapping?.grade)} close={() => setGamesOpen(false)}
        onPlay={(id, level, withClass) => { if (id === 'drawing') return; if (withClass) enterStudentMode(); setPlaying({ id, level, withClass }); }}
        onDraw={() => { setGamesOpen(false); onWhiteboard(); openOnBoard({ tool: 'crayon' }); }} />}
      {playing && <GameShell id={playing.id} level={playing.level} withClass={playing.withClass}
        close={() => { setPlaying(null); setGamesOpen(false); }}
        backToLibrary={() => { setPlaying(null); setGamesOpen(!presenting); }} />}
    </Suspense>
    {unlocking && presenting && <StudentModeUnlock data={live} close={() => setUnlocking(false)} onUnlocked={() => { setUnlocking(false); setPresenting(false); }} />}
    <input ref={upload} type="file" accept="application/json,.json" hidden onChange={e => void importScreens(e.target.files?.[0])} />
    {(removed || notice || saveError) && <div className="cs-notice" role="status"><span>{notice || (saveError ? 'Could not save locally. Download a backup of your screens.' : 'Widget removed.')}</span>{removed && <button onClick={() => { if (workspace.screens.find(s => s.id === removed.screenId)?.widgets.length === 60) { setNotice('This screen is full. Remove a widget to make room before restoring.'); return; } setWorkspace(w => restoreWidget(w, removed.screenId, removed.widget)); setRemoved(null); setNotice(''); }}><Undo2 size={14} />Undo</button>}{saveError && <button onClick={exportScreens}>Download</button>}<button aria-label="Dismiss message" onClick={() => { setRemoved(null); setNotice(''); }}><X size={14} /></button></div>}
  </div>;
};
