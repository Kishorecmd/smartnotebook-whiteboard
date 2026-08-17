import React, { useEffect, useState } from 'react';
import { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { PointerState } from '../input/PointerState';
import { loadInputSettings } from '../input/InputSettings';

interface MultitouchDebugOverlayProps {
  engine: WhiteboardEngine;
}

export const MultitouchDebugOverlay: React.FC<MultitouchDebugOverlayProps> = ({ engine }) => {
  const [pointers, setPointers] = useState<PointerState[]>([]);
  const [gestureState, setGestureState] = useState<string>('IDLE');
  const [enabled, setEnabled] = useState(() => import.meta.env.DEV && loadInputSettings().debugOverlay);

  useEffect(() => {
    const updateSetting = () => setEnabled(import.meta.env.DEV && loadInputSettings().debugOverlay);
    window.addEventListener('jhw-input-settings-change', updateSetting);
    return () => window.removeEventListener('jhw-input-settings-change', updateSetting);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timerId: number;
    
    const update = () => {
      if (engine.getPointerManager()) {
        setPointers([...engine.getPointerManager().getActivePointers()]);
      }
      if (engine.getInputRouter()) {
        setGestureState(engine.getInputRouter().getCurrentState());
      }
      timerId = window.setTimeout(update, 100);
    };

    update();
    
    return () => window.clearTimeout(timerId);
  }, [enabled, engine]);

  if (!enabled || (pointers.length === 0 && gestureState === 'IDLE')) return null;

  return (
    <div className="absolute top-16 left-4 bg-black/80 text-green-400 font-mono text-xs p-4 rounded shadow-lg pointer-events-none z-50 min-w-[250px]">
      <div className="border-b border-green-700 pb-2 mb-2">
        <strong>MULTI-TOUCH DEBUGGER</strong>
      </div>
      <div className="mb-2">
        <span className="text-white">Gesture State:</span> <span className="font-bold text-yellow-400">{gestureState}</span>
      </div>
      <div>
        <span className="text-white">Active Pointers ({pointers.length}):</span>
        <ul className="mt-1 space-y-1">
          {pointers.map(p => (
            <li key={p.pointerId} className="bg-gray-800 p-1 rounded">
              ID: {p.pointerId} | Type: <span className="text-blue-300">{p.pointerType}</span><br/>
              Class: <span className="text-violet-300">{p.classification}</span> | Action: <span className="text-amber-300">{p.action}</span><br/>
              Pos: {Math.round(p.x)}, {Math.round(p.y)}<br/>
              Contact: {Math.round(p.width)}×{Math.round(p.height)} | Pressure: {p.pressure.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
