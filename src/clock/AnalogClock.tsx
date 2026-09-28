import type { PointerEventHandler } from 'react';
import './analog-clock.css';

type Props = {
  time: Date;
  timeZone?: string;
  onHourPointerDown?: PointerEventHandler<SVGGElement>;
  onMinutePointerDown?: PointerEventHandler<SVGGElement>;
};

/** Shared clock face for the classroom and interactive time-teaching tool. */
export function AnalogClock({ time, timeZone, onHourPointerDown, onMinutePointerDown }: Props) {
  const parts = timeZone ? Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone, hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(time).map(p => [p.type,p.value])) : null;
  const hours = parts ? Number(parts.hour) : time.getHours();
  const minutes = parts ? Number(parts.minute) : time.getMinutes();
  const seconds = parts ? Number(parts.second) : time.getSeconds();
  const digital = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
  return <div className="analog-clock">
    <svg className="analog-clock-face" viewBox="0 0 260 260" role="img" aria-label={`Analog clock showing ${digital}`}>
      <circle cx="130" cy="130" r="124" fill="white" stroke="#7064f5" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, tick) => <line key={tick} x1="130" y1="11" x2="130" y2={tick % 5 === 0 ? 21 : 16} stroke={tick % 5 === 0 ? '#7064f5' : '#aaa4fa'} strokeWidth={tick % 5 === 0 ? 2.2 : 1.5} transform={`rotate(${tick * 6} 130 130)`} />)}
      {Array.from({ length: 12 }, (_, index) => {
        const number = index + 1;
        const angle = number * Math.PI / 6;
        return <text key={number} x={130 + Math.sin(angle) * 96} y={130 - Math.cos(angle) * 96} textAnchor="middle" dominantBaseline="central" fill="#102132" fontSize="19">{number}</text>;
      })}
      <g className={onHourPointerDown ? 'analog-clock-hand-interactive' : undefined} transform={`rotate(${hours % 12 * 30 + minutes * 0.5 + seconds / 120} 130 130)`} onPointerDown={onHourPointerDown}>
        <line x1="130" y1="130" x2="130" y2="68" stroke="#222b38" strokeWidth="3.4" strokeLinecap="round" />
        {onHourPointerDown && <line x1="130" y1="126" x2="130" y2="68" stroke="transparent" strokeWidth="18" />}
      </g>
      <g className={onMinutePointerDown ? 'analog-clock-hand-interactive' : undefined} transform={`rotate(${minutes * 6 + seconds * 0.1} 130 130)`} onPointerDown={onMinutePointerDown}>
        <line x1="130" y1="130" x2="130" y2="47" stroke="#222b38" strokeWidth="2.8" strokeLinecap="round" />
        {onMinutePointerDown && <line x1="130" y1="126" x2="130" y2="47" stroke="transparent" strokeWidth="18" />}
      </g>
      <line x1="130" y1="148" x2="130" y2="31" stroke="#ef4c53" strokeWidth="1.6" transform={`rotate(${seconds * 6} 130 130)`} pointerEvents="none" />
      <circle cx="130" cy="130" r="3.5" fill="#222b38" pointerEvents="none" />
    </svg>
    <time className="analog-clock-digital" dateTime={`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}>{digital}</time>
  </div>;
}
