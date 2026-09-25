import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

interface DraggableOverlayProps {
  toolId: string;
  title: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
}

export const DraggableOverlay: React.FC<DraggableOverlayProps> = ({ toolId, title, children, defaultPosition }) => {
  const { toggleOverlayTool } = useWhiteboardStore();
  const [position, setPosition] = useState(defaultPosition || { x: Math.max(8, window.innerWidth / 2 - 200), y: Math.max(84, window.innerHeight / 2 - 220) });
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const constrain = useCallback((point: { x: number; y: number }) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(point.x, window.innerWidth - (rect?.width || 300) - 8)),
      y: Math.max(84, Math.min(point.y, window.innerHeight - (rect?.height || 200) - 8)),
    };
  }, []);
  useEffect(() => {
    const fit = () => setPosition(previous => {
      const next = constrain(previous);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    });
    const observer = new ResizeObserver(fit);
    if (overlayRef.current) observer.observe(overlayRef.current);
    window.addEventListener('resize', fit);
    fit();
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); };
  }, [constrain]);

  return (
    <div ref={overlayRef} className="wb-ui tt-overlay" role="region" aria-label={title}
      style={{ left: position.x, top: position.y }} onKeyDown={event => event.stopPropagation()}>
      <header className="tt-overlay-header">
        <button className="tt-overlay-handle" aria-label={'Move ' + title} title="Drag to move · Arrow keys to reposition"
          onPointerDown={event => {
            if (event.button !== 0) return;
            dragRef.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const start = dragRef.current;
            if (start) setPosition(constrain({ x: start.left + event.clientX - start.x, y: start.top + event.clientY - start.y }));
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onLostPointerCapture={() => { dragRef.current = null; }}
          onKeyDown={event => {
            const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (!direction) return;
            event.preventDefault();
            setPosition(previous => constrain({ x: previous.x + direction[0] * 20, y: previous.y + direction[1] * 20 }));
          }}>
          <GripHorizontal size={18} /><span>{title}</span>
        </button>
        <button className="tt-overlay-close" aria-label={'Close ' + title} onClick={() => toggleOverlayTool(toolId)}><X size={20} /></button>
      </header>
      <div className="tt-overlay-content">{children}</div>
    </div>
  );
};
