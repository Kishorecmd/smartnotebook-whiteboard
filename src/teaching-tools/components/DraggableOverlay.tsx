import React, { useState, useRef, useEffect } from 'react';
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
  const [position, setPosition] = useState(defaultPosition || { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <div
      className="absolute bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 300,
        zIndex: 40, // Above canvas, below modals
      }}
    >
      <div
        className="flex items-center justify-between p-3 bg-slate-800/80 cursor-grab active:cursor-grabbing border-b border-slate-700"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2 text-slate-300">
          <GripHorizontal className="w-5 h-5 text-slate-500" />
          <span className="font-medium">{title}</span>
        </div>
        <button
          type="button"
          className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          onClick={() => toggleOverlayTool(toolId)}
          onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking close
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 flex-1">
        {children}
      </div>
    </div>
  );
};
