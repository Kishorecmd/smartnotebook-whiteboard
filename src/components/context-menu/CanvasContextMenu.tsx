import React, { useRef, useLayoutEffect, useState } from 'react';
import { ObjectManager } from '../../objects/ObjectManager';
import { ContextMenuPosition } from './ObjectContextMenu';

export interface CanvasContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  objectManager: ObjectManager;
  onSelectAll: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ position, onClose, objectManager, onSelectAll }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<ContextMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!position || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newX = position.x;
      let newY = position.y;

      if (newX + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 8;
      }
      if (newY + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 8;
      }
      
      setAdjustedPos({ x: Math.max(8, newX), y: Math.max(8, newY) });
    });
  }, [position]);

  if (!position) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const displayPos = adjustedPos || position;

  return (
    <div
      ref={containerRef}
      className="absolute bg-white shadow-lg rounded-lg border border-slate-200 py-1 z-[9999]"
      style={{ 
        left: displayPos.x, 
        top: displayPos.y, 
        minWidth: '160px',
        opacity: adjustedPos ? 1 : 0,
        pointerEvents: adjustedPos ? 'auto' : 'none'
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.paste())}
      >
        Paste
      </button>
      <hr className="my-1 border-slate-200" />
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(onSelectAll)}
      >
        Select All
      </button>
    </div>
  );
};
