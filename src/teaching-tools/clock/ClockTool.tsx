import { useState, useEffect, useRef, type PointerEvent } from 'react';
import { Clock as ClockIcon, Play, Pause } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { AnalogClock } from '../../clock/AnalogClock';

export function ClockTool() {
  const [time, setTime] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  const dragCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanup.current?.(), []);
  useEffect(() => {
    if (!isRealtime) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isRealtime]);

  const setManualTime = (hours: number, minutes: number) => {
    setTime(previous => {
      const next = new Date(previous);
      next.setHours(hours, minutes, 0, 0);
      return next;
    });
  };
  const handlePointerDown = (event: PointerEvent<SVGGElement>, hand: 'hour' | 'minute') => {
    if (isRealtime || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragCleanup.current?.();
    const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const onMove = (move: globalThis.PointerEvent) => {
      const angle = (Math.atan2(move.clientY - rect.top - rect.height / 2, move.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 450) % 360;
      if (hand === 'minute') setManualTime(time.getHours(), Math.round(angle / 6) % 60);
      else setManualTime(Math.round(angle / 30) % 12 + (time.getHours() >= 12 ? 12 : 0), time.getMinutes());
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragCleanup.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    dragCleanup.current = onUp;
  };
  return <DraggableOverlay toolId="clock" title="Clock">
    <div className="clock-teaching-tool">
      <AnalogClock time={time} onHourPointerDown={isRealtime ? undefined : event => handlePointerDown(event, 'hour')} onMinutePointerDown={isRealtime ? undefined : event => handlePointerDown(event, 'minute')} />
      <div className="clock-teaching-controls">
        <button onClick={() => {
          dragCleanup.current?.();
          if (!isRealtime) setTime(new Date());
          else setManualTime(time.getHours(), time.getMinutes());
          setIsRealtime(!isRealtime);
        }}>{isRealtime ? <Pause size={16} /> : <Play size={16} />}{isRealtime ? 'Practice time' : 'Show current time'}</button>
        {!isRealtime && <>
          <p className="clock-teaching-hint">Drag the hands or enter a time. Hours use 0–23.</p>
          <label>Hours <input aria-label="Clock hours" type="number" min={0} max={23} value={time.getHours()} onChange={event => setManualTime(Math.max(0, Math.min(23, Math.trunc(Number(event.target.value)))), time.getMinutes())} /></label>
          <label>Minutes <input aria-label="Clock minutes" type="number" min={0} max={59} value={time.getMinutes()} onChange={event => setManualTime(time.getHours(), Math.max(0, Math.min(59, Math.trunc(Number(event.target.value)))))} /></label>
        </>}
      </div>
    </div>
  </DraggableOverlay>;
}

export const registerClockTool = () => {
  TeachingToolRegistry.register({ id: 'clock', name: 'Clock', icon: ClockIcon, category: 'MATHEMATICS', type: 'overlay-ui', description: 'Analog and digital clock for teaching time.', component: ClockTool });
};
