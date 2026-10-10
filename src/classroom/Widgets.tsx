import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Shuffle, VolumeX, Volume1, Users, UserRound, Pencil, Check, Plus, Minus, Sun, Moon } from 'lucide-react';
import { type ClassroomWidget, remainingSeconds, readNames, makeGroups, segmentAt, spinTo } from './model';
import { SoundMonitor } from '../sound/SoundMonitor';
import { AnalogClock } from '../clock/AnalogClock';
import { LiveNames, LiveTeams } from '../dashboard/LiveNames';
import { useLiveClass } from '../dashboard/data';

type Props = { widget: ClassroomWidget; update: (data: ClassroomWidget['data']) => void; now: number };
const str = (w: ClassroomWidget, key: string, fallback = '') => typeof w.data[key] === 'string' ? w.data[key] as string : fallback;
const num = (w: ClassroomWidget, key: string, fallback = 0) => typeof w.data[key] === 'number' ? w.data[key] as number : fallback;
const timeText = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

function TextWidget({ widget, update }: Props) {
  const [editing, setEditing] = useState(false);
  return <div className="cs-note">
    {editing ? <>
      <input aria-label="Instruction heading" value={str(widget, 'heading')} maxLength={120} onChange={e => update({ heading: e.target.value })} />
      <textarea aria-label="Instruction text" value={str(widget, 'text')} maxLength={10000} onChange={e => update({ text: e.target.value })} />
    </> : <><span className="cs-eyebrow">A little direction for a great day</span><h2>{str(widget, 'heading')}</h2><p>{str(widget, 'text')}</p></>}
    <button className="cs-subtle cs-note-edit" aria-label={editing ? 'Finish editing instructions' : 'Edit instructions'} onClick={() => setEditing(!editing)}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? 'Done' : 'Edit text'}</button>
  </div>;
}
function TimerWidget({ widget, update, now }: Props) {
  const remaining = remainingSeconds(widget.data, Math.max(now, Date.now()));
  const running = typeof widget.data.endAt === 'number' && remaining > 0;
  const finished = typeof widget.data.endAt === 'number' && remaining === 0;
  const duration = num(widget, 'duration', 600);
  const [announced, setAnnounced] = useState(false);
  useEffect(() => { if (!finished) setAnnounced(false); else setAnnounced(true); }, [finished]);
  const preset = (seconds: number) => update({ duration: seconds, remaining: seconds, endAt: null });
  return <div className={`cs-timer ${finished ? 'cs-finished' : ''}`}>
    <span className="cs-eyebrow">{finished ? 'Time to wrap up' : running ? 'Make every minute count' : 'Ready when you are'}</span>
    <div className="cs-timer-time" role="timer" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds`}>{timeText(remaining)}</div>
    <div className="cs-progress"><span style={{ width: `${Math.min(100, duration ? remaining / duration * 100 : 0)}%` }} /></div>
    <div className="cs-timer-actions"><button className="cs-primary" aria-label={running ? 'Pause timer' : 'Start timer'} onClick={() => update(running ? { remaining, endAt: null } : { endAt: Date.now() + (remaining || duration) * 1000 })}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pause' : 'Start'}</button><button className="cs-icon-button" aria-label="Reset timer" onClick={() => preset(duration)}><RotateCcw size={18} /></button></div>
    <div className="cs-presets">{[60, 300, 600, 900].map(s => <button key={s} aria-pressed={duration === s} onClick={() => preset(s)}>{s / 60} min</button>)}</div>
    <label className="cs-custom-time">Custom minutes <input aria-label="Timer duration in minutes" type="number" min="1" max="180" value={Math.round(duration / 60)} onChange={e => { const n = Number(e.target.value); if (n >= 1 && n <= 180) preset(Math.round(n) * 60); }} /></label>
    <span className="cs-sr-only" role="status">{announced ? 'Time is up!' : ''}</span>
  </div>;
}
const modes = [
  { id: 'quiet', title: 'Silent work', detail: 'A quiet moment to think.', Icon: VolumeX },
  { id: 'whisper', title: 'Whisper voices', detail: 'Keep your voices soft.', Icon: Volume1 },
  { id: 'pairs', title: 'Work in pairs', detail: 'Two minds, one great idea.', Icon: UserRound },
  { id: 'team', title: 'Teamwork', detail: 'Listen, share, and discover.', Icon: Users },
];
function SymbolsWidget({ widget, update }: Props) {
  const mode = modes.find(m => m.id === widget.data.mode) ?? modes[0];
  return <div className="cs-symbols"><div className={`cs-symbol-icon cs-symbol-${mode.id}`}><mode.Icon size={52} strokeWidth={1.4} /></div><h2>{mode.title}</h2><p>{mode.detail}</p><div className="cs-symbol-options">{modes.map(m => <button key={m.id} aria-label={m.title} title={m.title} aria-pressed={m.id === mode.id} onClick={() => update({ mode: m.id })}><m.Icon size={20} /></button>)}</div></div>;
}
function NamesWidget({ widget, update, classPending }: Props & { classPending?: boolean }) {
  const names = readNames(str(widget, 'names'));
  const [editing, setEditing] = useState(names.length === 0);
  const groupMode = widget.kind === 'groups';
  const result = str(widget, 'result');
  return <div className="cs-names">
    {classPending && <p className="cs-names-note">Your class list appears here when you are signed in. Until then, type names below.</p>}
    {editing ? <><label className="cs-field-label">Your class list · one name per line<textarea aria-label="Class names" placeholder={'Add your students…\nOne name per line'} value={str(widget, 'names')} maxLength={10000} onChange={e => update({ names: e.target.value, result: '' })} /></label><button className="cs-primary" disabled={!names.length} onClick={() => setEditing(false)}><Check size={16} />Use {names.length} names</button></> : <>
      <span className="cs-eyebrow">{groupMode ? 'A fresh mix of brilliant minds' : 'Everyone gets a moment'}</span>
      {groupMode ? <div className="cs-group-results">{result ? result.split('\n\n').map((g, i) => <div key={i}><b>Group {i + 1}</b><p>{g}</p></div>) : <p>Ready to make your teams?</p>}</div> : <div className="cs-picked" aria-live="polite">{result || 'Who’s next?'}</div>}
      {groupMode && <label className="cs-custom-time">Number of groups <input aria-label="Number of groups" type="number" min="1" max={Math.max(1, names.length)} value={num(widget, 'groupCount', 3)} onChange={e => update({ groupCount: Math.max(1, Math.min(names.length, Number(e.target.value) || 1)) })} /></label>}
      <button className="cs-primary" disabled={!names.length} onClick={() => update({ result: groupMode ? makeGroups(names, num(widget, 'groupCount', 3)).map(g => g.join(', ')).join('\n\n') : names[Math.floor(Math.random() * names.length)] })}><Shuffle size={17} />{groupMode ? 'Make groups' : 'Pick a name'}</button>
      <button className="cs-subtle" onClick={() => setEditing(true)}><Pencil size={14} />Edit {names.length} names</button>
    </>}
  </div>;
}
const SPINNER_COLOURS = ['#e85d75', '#3a86ff', '#f4a51c', '#2a9d8f', '#8f5bd9', '#ef6f2e', '#4cb944', '#d6457f'];
/** A wheel of up to 12 choices that spins and stops on a random one. */
function SpinnerWidget({ widget, update }: Props) {
  const options = readNames(str(widget, 'options')).slice(0, 12);
  const [editing, setEditing] = useState(options.length < 2);
  const [spinning, setSpinning] = useState(false);
  const turn = num(widget, 'turn');
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const spin = () => {
    if (spinning || options.length < 2) return;
    const index = Math.floor(Math.random() * options.length);
    const next = spinTo(index, options.length, turn);
    setSpinning(true); update({ turn: next, result: '' });
    window.setTimeout(() => { setSpinning(false); update({ turn: next, result: options[segmentAt(next, options.length)] }); }, reduced ? 50 : 3200);
  };
  if (editing) return <div className="cs-names">
    <label className="cs-field-label">Spinner choices · one per line, 2 to 12<textarea aria-label="Spinner choices" value={str(widget, 'options')} maxLength={2000} onChange={e => update({ options: e.target.value, result: '' })} /></label>
    <button className="cs-primary" disabled={options.length < 2} onClick={() => setEditing(false)}><Check size={16} />Use {options.length} choices</button>
  </div>;
  const slice = 360 / options.length;
  const point = (angle: number, r: number) => [50 + r * Math.sin(angle * Math.PI / 180), 50 - r * Math.cos(angle * Math.PI / 180)];
  return <div className="cs-spinner">
    <div className="cs-spinner-wheel-wrap">
      <span className="cs-spinner-pointer" aria-hidden="true" />
      <svg viewBox="0 0 100 100" className="cs-spinner-wheel" style={{ transform: `rotate(${turn}deg)`, transition: spinning && !reduced ? 'transform 3.1s cubic-bezier(.17,.67,.21,1)' : 'none' }} aria-hidden="true">
        {options.map((option, i) => {
          const [x1, y1] = point(i * slice, 48), [x2, y2] = point((i + 1) * slice, 48), [tx, ty] = point((i + 0.5) * slice, 30);
          return <g key={i}>
            <path d={`M50 50 L${x1} ${y1} A48 48 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={SPINNER_COLOURS[i % SPINNER_COLOURS.length]} stroke="#fff" strokeWidth="0.8" />
            <text x={tx} y={ty} transform={`rotate(${(i + 0.5) * slice} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" fontSize={options.length > 8 ? 4.5 : 6} fontWeight="700" fill="#fff">{option.length > 10 ? option.slice(0, 9) + '…' : option}</text>
          </g>;
        })}
        <circle cx="50" cy="50" r="6" fill="#fff" />
      </svg>
    </div>
    <div className="cs-picked" aria-live="polite">{spinning ? 'Spinning…' : str(widget, 'result') || 'Ready to spin!'}</div>
    <button className="cs-primary" disabled={spinning} onClick={spin}><Shuffle size={17} />Spin</button>
    <button className="cs-subtle" disabled={spinning} onClick={() => setEditing(true)}><Pencil size={14} />Edit {options.length} choices</button>
  </div>;
}
function ScoreWidget({ widget, update }: Props) {
  return <div className="cs-score">{(['A', 'B'] as const).map((team, i) => <div key={team} className={`cs-team cs-team-${team}`}>
    {i === 0 ? <Sun size={28} /> : <Moon size={28} />}<input aria-label={`Team ${team} name`} value={str(widget, `name${team}`)} maxLength={30} onChange={e => update({ [`name${team}`]: e.target.value })} />
    <strong aria-live="polite">{num(widget, `score${team}`)}</strong><div><button aria-label={`Subtract point from team ${team}`} onClick={() => update({ [`score${team}`]: Math.max(0, num(widget, `score${team}`) - 1) })}><Minus size={18} /></button><button aria-label={`Add point to team ${team}`} onClick={() => update({ [`score${team}`]: num(widget, `score${team}`) + 1 })}><Plus size={18} /></button></div>
  </div>)}</div>;
}
export function WidgetContent(props: Props) {
  const { widget, update, now } = props; const liveClass = useLiveClass();
  switch (widget.kind) {
    case 'sound': return <SoundMonitor settings={{ limit: num(widget, 'limit', 60), sensitivity: num(widget, 'sensitivity', 1), alert: widget.data.alert === true }} onSettingsChange={settings => update(settings)} />;
    case 'text': return <TextWidget {...props} />;
    case 'timer': return <TimerWidget {...props} />;
    case 'symbols': return <SymbolsWidget {...props} />;
    // The class list is used only once it has loaded. Signed out, ERP down or
    // still loading, the widgets keep working with typed names and plain teams.
    case 'random': case 'groups': return liveClass.mapping && liveClass.snapshot ? <LiveNames key={liveClass.mapping.classId + liveClass.mapping.sectionId + widget.kind} groups={widget.kind === 'groups'}/> : <NamesWidget {...props} classPending={!!liveClass.mapping} />;
    case 'spinner': return <SpinnerWidget {...props} />;
    case 'score': return liveClass.mapping && liveClass.snapshot ? <LiveTeams key={liveClass.mapping.classId + liveClass.mapping.sectionId}/> : <ScoreWidget {...props} />;
    case 'clock': return <AnalogClock time={new Date(now)} timeZone={liveClass.mapping?.timezone} />;
    case 'traffic': return <div className="cs-traffic"><div className="cs-lights">{['red', 'amber', 'green'].map(light => <button key={light} className={`cs-light cs-${light} ${widget.data.light === light ? 'is-lit' : ''}`} aria-label={`${light} light`} aria-pressed={widget.data.light === light} onClick={() => update({ light })} />)}</div><h2>{widget.data.light === 'red' ? 'Pause & listen' : widget.data.light === 'amber' ? 'Get ready' : 'Let’s get started'}</h2><p>Tap a light to guide the room.</p></div>;
    case 'dice': return <div className="cs-dice"><div className="cs-dice-faces" aria-live="polite" aria-label={`Dice result ${str(widget, 'result', '1')}`}>{str(widget, 'result', '1').split(',').map((n, i) => <span key={i}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][Math.max(0, Math.min(5, Number(n) - 1))]}</span>)}</div><div className="cs-presets">{[1, 2, 3].map(n => <button key={n} aria-pressed={num(widget, 'count', 1) === n} onClick={() => update({ count: n, result: Array(n).fill('1').join(',') })}>{n} {n === 1 ? 'die' : 'dice'}</button>)}</div><button className="cs-primary" onClick={() => update({ result: Array.from({ length: Math.max(1, Math.min(3, num(widget, 'count', 1))) }, () => Math.ceil(Math.random() * 6) || 1).join(',') })}><Shuffle size={17} />Roll the dice</button></div>;
  }
}
