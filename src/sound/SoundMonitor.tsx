import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Mic, MicOff, RotateCcw } from 'lucide-react';
import { MicrophoneSession } from './MicrophoneSession';
import { NoiseLimit, soundLevel } from './soundLevel';
import './sound-monitor.css';

type Settings = { limit: number; sensitivity: number; alert: boolean };
type Props = { settings?: Partial<Settings>; onSettingsChange?: (settings: Settings) => void };
export function SoundMonitor({ settings, onSettingsChange }: Props) {
  const [local, setLocal] = useState<Settings>({ limit: 60, sensitivity: 1, alert: false });
  const options: Settings = {
    limit: Math.max(10, Math.min(95, Number(settings?.limit ?? local.limit) || 60)),
    sensitivity: Math.max(0.5, Math.min(2, Number(settings?.sensitivity ?? local.sensitivity) || 1)),
    alert: settings?.alert ?? local.alert,
  };
  const current = useRef(options); current.current = options;
  const session = useRef<MicrophoneSession | null>(null);
  const detector = useRef(new NoiseLimit());
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'error'>('idle');
  const [message, setMessage] = useState('Start to check the room’s sound level.');
  const [level, setLevel] = useState(0);
  const [count, setCount] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const stop = () => { session.current?.stop(); setStatus('idle'); setLevel(0); setMessage('Microphone stopped. Start when you are ready.'); };
    window.addEventListener('pagehide', stop);
    return () => { mounted.current = false; session.current?.stop(); window.removeEventListener('pagehide', stop); };
  }, []);
  const change = (patch: Partial<Settings>) => {
    const next = { ...options, ...patch };
    setLocal(next); onSettingsChange?.(next); detector.current = new NoiseLimit();
  };
  const stop = () => {
    session.current?.stop(); setStatus('idle'); setLevel(0);
    setMessage('Microphone stopped. Start when you are ready.');
  };
  const start = async () => {
    if (status === 'starting' || status === 'listening') return;
    const policyDocument = document as Document & { permissionsPolicy?: { allowsFeature(feature: string): boolean }; featurePolicy?: { allowsFeature(feature: string): boolean } };
    const policy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
    if (policy && !policy.allowsFeature('microphone')) {
      setStatus('error'); setMessage('This site’s hosting settings block the microphone. The site administrator needs to enable it.'); return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setStatus('error'); setMessage('Microphone access needs HTTPS and a supported browser.'); return;
    }
    const microphone = new MicrophoneSession(); session.current = microphone;
    detector.current = new NoiseLimit();
    setStatus('starting'); setMessage('Allow microphone access in your browser.');
    let smoothed = 0;
    try {
      const started = await microphone.start(samples => {
        const value = soundLevel(samples, current.current.sensitivity);
        smoothed += (value - smoothed) * (value > smoothed ? 0.5 : 0.2);
        setLevel(Math.round(smoothed));
        if (detector.current.update(smoothed, current.current.limit, performance.now())) {
          setCount(previous => previous + 1);
          if (current.current.alert) microphone.chime();
        }
      }, () => { if (mounted.current) { setStatus('error'); setLevel(0); setMessage('Microphone interrupted. Check your device, then start again.'); } });
      if (started && mounted.current) { setStatus('listening'); setMessage('Microphone on'); }
    } catch (error) {
      if (!mounted.current) return;
      const name = error instanceof Error ? error.name : '';
      setStatus('error');
      setMessage(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.'
        : name === 'NotFoundError' ? 'No microphone found. Connect one, then try again.'
        : 'Microphone unavailable. Check that it is connected and not in use, then try again.');
    }
  };
  const listening = status === 'listening';
  const loud = listening && level >= options.limit;
  const stateText = !listening ? 'Microphone off' : loud ? 'Too loud · lower your voices' : level >= options.limit * 0.8 ? 'Getting louder' : 'Comfortable level';
  return <div className={`sound-monitor ${loud ? 'sound-monitor-loud' : ''}`}>
    <div className="sound-monitor-gauge" role="meter" aria-label="Classroom sound level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-valuetext={listening ? `${level} out of 100. ${stateText}` : 'Microphone off'}>
      <svg viewBox="0 -8 300 163" aria-hidden="true">
        <path d="M 30 130 A 120 120 0 0 1 270 130" fill="none" stroke="#e5ecdf" strokeWidth="32" />
        <path d="M 30 130 A 120 120 0 0 1 270 130" pathLength="100" fill="none" stroke="#f4d6d6" strokeWidth="32" strokeDasharray={`${100 - options.limit} 100`} strokeDashoffset={-options.limit} />
        <line x1="150" y1="4" x2="150" y2="30" stroke="#ad4545" strokeWidth="3" transform={`rotate(${-90 + options.limit * 1.8} 150 130)`} />
        <g transform={`rotate(${-90 + level * 1.8} 150 130)`}><line x1="150" y1="130" x2="150" y2="39" stroke={loud ? '#bc4444' : '#54764c'} strokeWidth="5" strokeLinecap="round" /></g>
        <circle cx="150" cy="130" r="8" fill={loud ? '#bc4444' : '#54764c'} />
      </svg>
      <span className="sound-monitor-reading">{listening ? level : '—'}<small> / 100</small></span>
    </div>
    <strong className="sound-monitor-state" role="status">{stateText}</strong>
    <label className="sound-monitor-slider">Max. noise <output>{options.limit}</output><input aria-label="Maximum noise level" type="range" min="10" max="95" value={options.limit} onChange={event => change({ limit: Number(event.target.value) })} /></label>
    <div className="sound-monitor-controls">
      <button type="button" className="sound-monitor-alert" aria-label="Sound alert" aria-pressed={options.alert} onClick={() => change({ alert: !options.alert })}>{options.alert ? <Bell size={19} /> : <BellOff size={19} />}<span>Alert {options.alert ? 'on' : 'off'}</span></button>
      <span className="sound-monitor-count" title="Number of sustained noise-limit crossings"><Bell size={16} /> {count}<small>alerts</small></span>
      <button type="button" aria-label="Reset noise alert count" title="Reset alert count" disabled={!count} onClick={() => setCount(0)}><RotateCcw size={17} /></button>
    </div>
    <button type="button" className="sound-monitor-start" onClick={listening || status === 'starting' ? stop : () => void start()}>{listening ? <MicOff size={18} /> : <Mic size={18} />}{status === 'starting' ? 'Cancel microphone request' : listening ? 'Stop microphone' : 'Start microphone'}</button>
    <p className="sound-monitor-message" role={status === 'error' ? 'alert' : undefined}>{message}</p>
    <details><summary>Microphone sensitivity</summary><label className="sound-monitor-slider">Sensitivity <output>{options.sensitivity.toFixed(1)}×</output><input aria-label="Microphone sensitivity" type="range" min="0.5" max="2" step="0.1" value={options.sensitivity} onChange={event => change({ sensitivity: Number(event.target.value) })} /></label><p>Adjust for your microphone and room. The scale is relative, not a decibel measurement.</p></details>
    <p className="sound-monitor-privacy">Sound stays on this device. Nothing is recorded or uploaded.</p>
  </div>;
}
