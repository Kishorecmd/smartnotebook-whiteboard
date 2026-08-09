import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Play, Pause } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';

export const ClockTool: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  
  useEffect(() => {
    if (isRealtime) {
      const interval = setInterval(() => {
        setTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRealtime]);

  const setManualTime = (hours: number, minutes: number) => {
    const newTime = new Date(time);
    newTime.setHours(hours);
    newTime.setMinutes(minutes);
    setTime(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'hour' | 'minute') => {
    if (isRealtime) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.parentElement!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - cx;
      const dy = moveEvent.clientY - cy;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      
      if (type === 'minute') {
        const minutes = Math.floor(angle / 6);
        setManualTime(time.getHours(), minutes);
      } else {
        const hours = Math.floor(angle / 30);
        setManualTime(hours, time.getMinutes());
      }
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  return (
    <DraggableOverlay toolId="clock" title="Clock">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
        
        {/* Clock Face */}
        <div style={{
          position: 'relative',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: '8px solid #333',
          backgroundColor: '#fff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          {/* Numbers */}
          {[...Array(12)].map((_, i) => {
            const num = i + 1;
            const angle = (num * 30 - 90) * (Math.PI / 180);
            const x = 100 + Math.cos(angle) * 80;
            const y = 100 + Math.sin(angle) * 80;
            return (
              <div key={num} style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333',
                userSelect: 'none'
              }}>
                {num}
              </div>
            );
          })}
          
          {/* Hour Hand */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'hour')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '8px',
              height: '60px',
              backgroundColor: '#333',
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
              borderRadius: '4px',
              cursor: isRealtime ? 'default' : 'pointer'
            }}
          />
          
          {/* Minute Hand */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'minute')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '4px',
              height: '80px',
              backgroundColor: '#666',
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
              borderRadius: '2px',
              cursor: isRealtime ? 'default' : 'pointer'
            }}
          />
          
          {/* Second Hand */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '2px',
              height: '90px',
              backgroundColor: '#ef4444',
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`
            }}
          />
          
          {/* Center Dot */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '12px',
            height: '12px',
            backgroundColor: '#ef4444',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%'
          }} />
        </div>

        {/* Controls */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace', width: '120px', textAlign: 'center' }}>
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
          <button
            onClick={() => setIsRealtime(!isRealtime)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: isRealtime ? '#3b82f6' : '#e2e8f0',
              color: isRealtime ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isRealtime ? <Pause size={16} /> : <Play size={16} />}
            {isRealtime ? 'Realtime' : 'Interactive'}
          </button>
        </div>
      </div>
    </DraggableOverlay>
  );
};

export const registerClockTool = () => {
  TeachingToolRegistry.register({
    id: 'clock',
    name: 'Clock',
    icon: ClockIcon,
    category: 'MATHEMATICS',
    type: 'overlay-ui',
    description: 'Analog and digital clock for teaching time.',
    component: ClockTool,
  });
};
