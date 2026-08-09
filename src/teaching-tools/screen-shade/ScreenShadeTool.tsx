import React, { useState, useEffect } from 'react';
import { AppWindow, X } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { useWhiteboardStore } from '../../store';

export const ScreenShadeTool: React.FC = () => {
  const { toggleOverlayTool } = useWhiteboardStore();
  const [position, setPosition] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isDragging, setIsDragging] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      
      const { innerWidth, innerHeight } = window;
      if (isDragging === 'top') {
        setPosition(p => ({ ...p, top: Math.max(0, Math.min(e.clientY, innerHeight - p.bottom - 50)) }));
      } else if (isDragging === 'bottom') {
        setPosition(p => ({ ...p, bottom: Math.max(0, Math.min(innerHeight - e.clientY, innerHeight - p.top - 50)) }));
      } else if (isDragging === 'left') {
        setPosition(p => ({ ...p, left: Math.max(0, Math.min(e.clientX, innerWidth - p.right - 50)) }));
      } else if (isDragging === 'right') {
        setPosition(p => ({ ...p, right: Math.max(0, Math.min(innerWidth - e.clientX, innerWidth - p.left - 50)) }));
      }
    };

    const handlePointerUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <div style={{
      position: 'absolute',
      top: position.top,
      bottom: position.bottom,
      left: position.left,
      right: position.right,
      backgroundColor: '#94a3b8',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)'
    }}>
      {/* Top Handle */}
      <div 
        onPointerDown={(e) => { e.stopPropagation(); setIsDragging('top'); }}
        style={{ height: '20px', cursor: 'ns-resize', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <div style={{ width: '40px', height: '4px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Left Handle */}
        <div 
          onPointerDown={(e) => { e.stopPropagation(); setIsDragging('left'); }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', cursor: 'ew-resize', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div style={{ width: '4px', height: '40px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
        </div>
        
        {/* Center Content */}
        <div style={{ textAlign: 'center', color: '#f8fafc', padding: '20px' }}>
          <h2 style={{ margin: 0, marginBottom: '10px' }}>Screen Shade</h2>
          <button 
            onClick={() => toggleOverlayTool('screen-shade')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
          >
            <X size={16} /> Close Shade
          </button>
        </div>

        {/* Right Handle */}
        <div 
          onPointerDown={(e) => { e.stopPropagation(); setIsDragging('right'); }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', cursor: 'ew-resize', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div style={{ width: '4px', height: '40px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Bottom Handle */}
      <div 
        onPointerDown={(e) => { e.stopPropagation(); setIsDragging('bottom'); }}
        style={{ height: '20px', cursor: 'ns-resize', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <div style={{ width: '40px', height: '4px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
      </div>
    </div>
  );
};

export const registerScreenShadeTool = () => {
  TeachingToolRegistry.register({
    id: 'screen-shade',
    name: 'Screen Shade',
    icon: AppWindow,
    category: 'PRESENTATION',
    type: 'overlay-ui',
    description: 'Hide and reveal parts of the screen.',
    component: ScreenShadeTool,
  });
};
