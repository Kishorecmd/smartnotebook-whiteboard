import React, { useEffect, useState } from 'react';
import { Settings2, X } from 'lucide-react';
import {
  calibratePalmThreshold,
  loadInputSettings,
  saveInputSettings,
  shouldFingerDraw,
  type FingerDrawMode,
  type InputSettings,
  type PalmSensitivity,
} from '../../input/InputSettings';

type CalibrationStep = 'idle' | 'finger' | 'palm';

export const InputSettingsModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<InputSettings>(loadInputSettings);
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('idle');
  const [fingerSamples, setFingerSamples] = useState<number[]>([]);
  const [palmSamples, setPalmSamples] = useState<number[]>([]);

  useEffect(() => {
    const show = () => { setSettings(loadInputSettings()); setOpen(true); };
    window.addEventListener('jhw-open-input-settings', show);
    return () => window.removeEventListener('jhw-open-input-settings', show);
  }, []);

  if (!open) return null;
  const update = <K extends keyof InputSettings>(key: K, value: InputSettings[K]) => {
    const next = saveInputSettings({ [key]: value });
    setSettings(next);
  };
  const collect = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    const size = Math.max(event.width || 1, event.height || 1);
    if (calibrationStep === 'finger') setFingerSamples((samples) => [...samples.slice(-7), size]);
    if (calibrationStep === 'palm') setPalmSamples((samples) => [...samples.slice(-7), size]);
  };
  const finishCalibration = () => {
    const threshold = calibratePalmThreshold(fingerSamples, palmSamples);
    setSettings(saveInputSettings({ palmContactThreshold: threshold, palmSensitivity: 'automatic' }));
    setCalibrationStep('idle');
  };

  const fingerDraws = shouldFingerDraw(settings);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onPointerDown={(event) => event.stopPropagation()}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-4">
          <div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-violet-400" /><div><h2 className="font-semibold">Input & Gestures</h2><p className="text-xs text-slate-400">Saved only on this device and browser</p></div></div>
          <button type="button" aria-label="Close input settings" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Automatic routing</h3>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {['Stylus → Write', fingerDraws ? 'Finger → Write' : 'Finger → Select / Move', 'Two fingers → Pan / Zoom', 'Moving palm → Erase ink'].map((label) => <div key={label} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-slate-300">{label}</div>)}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Draw with finger
              <select value={settings.fingerDraw} onChange={(event) => update('fingerDraw', event.target.value as FingerDrawMode)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2">
                <option value="auto">Automatic (on without a stylus)</option><option value="on">Always</option><option value="off">Never</option>
              </select>
              <span className="mt-1 block text-xs text-slate-400">{fingerDraws ? 'A finger writes with the selected tool on this device. Use two fingers to pan and zoom, or pick Select to move objects.' : 'A finger selects and moves on this device. The stylus writes.'}</span>
            </label>
            <label className="text-sm">Palm detection
              <select value={settings.palmSensitivity} onChange={(event) => update('palmSensitivity', event.target.value as PalmSensitivity)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2">
                <option value="automatic">Automatic</option><option value="low">Low sensitivity</option><option value="medium">Medium sensitivity</option><option value="high">High sensitivity</option><option value="off">Off</option>
              </select>
            </label>
            <label className="text-sm">Palm eraser size
              <select value={settings.palmEraserSize} onChange={(event) => update('palmEraserSize', event.target.value as InputSettings['palmEraserSize'])} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2">
                <option value="auto">Auto (contact size)</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
              </select>
            </label>
            <label className="text-sm">Palm erases
              <select value={settings.palmEraserTarget} onChange={(event) => update('palmEraserTarget', event.target.value as InputSettings['palmEraserTarget'])} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2">
                <option value="ink">Ink only (recommended)</option><option value="ink-shapes">Ink + shapes</option><option value="all">All unlocked objects</option>
              </select>
            </label>
            <div className="text-sm"><span className="block">Contact threshold</span><div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300">{settings.palmContactThreshold} CSS px</div></div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Palm calibration</h3><p className="text-xs text-slate-400">Measure this Smartboard’s reported contact sizes.</p></div><button type="button" onClick={() => { setFingerSamples([]); setPalmSamples([]); setCalibrationStep('finger'); }} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold hover:bg-violet-500">Calibrate Palm</button></div>
            {calibrationStep !== 'idle' && <div className="mt-4">
              <div onPointerDown={collect} onPointerMove={(event) => { if (event.buttons) collect(event); }} className="flex h-32 touch-none items-center justify-center rounded-xl border-2 border-dashed border-violet-500 bg-slate-950 text-center text-sm">
                {calibrationStep === 'finger' ? <>Place and lightly move your normal fingertip here.<br />Samples: {fingerSamples.length}/5</> : <>Place and move the folded/side palm used for erasing.<br />Samples: {palmSamples.length}/5</>}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setCalibrationStep('idle')} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-700">Cancel</button>
                {calibrationStep === 'finger' ? <button type="button" disabled={fingerSamples.length < 3} onClick={() => setCalibrationStep('palm')} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next: Palm</button> : <button type="button" disabled={palmSamples.length < 3} onClick={finishCalibration} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">Save calibration</button>}
              </div>
            </div>}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Gesture shortcuts</h3>
            {[
              ['advancedGestures', 'Enable advanced gestures'],
              ['threeFingerSwipe', 'Three-finger swipe: Undo / Redo'],
              ['fourFingerFocus', 'Four-finger tap: Focus Mode'],
              ['twoFingerDoubleTapFit', 'Two-finger double tap: Fit view'],
            ].map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"><span>{label}</span><input type="checkbox" checked={Boolean(settings[key as keyof InputSettings])} onChange={(event) => update(key as keyof InputSettings, event.target.checked as never)} /></label>)}
            {import.meta.env.DEV && <label className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"><span>Pointer debug overlay</span><input type="checkbox" checked={settings.debugOverlay} onChange={(event) => update('debugOverlay', event.target.checked)} /></label>}
          </section>
        </div>
      </div>
    </div>
  );
};
