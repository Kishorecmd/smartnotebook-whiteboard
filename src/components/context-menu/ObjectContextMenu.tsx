import React, { useRef, useLayoutEffect, useState } from 'react';
import { ObjectManager } from '../../objects/ObjectManager';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  selectedIds: string[];
  objectManager: ObjectManager;
}

export const ObjectContextMenu: React.FC<ContextMenuProps> = ({ position, onClose, selectedIds, objectManager }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<ContextMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!position || !containerRef.current) return;
    
    // Give DOM a frame to size itself naturally at top:0 left:0 invisibly, or just measure its current
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

  if (!position || selectedIds.length === 0) return null;

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
        opacity: adjustedPos ? 1 : 0, // hide until measured
        pointerEvents: adjustedPos ? 'auto' : 'none'
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.copy(selectedIds))}
      >
        Copy
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.cut(selectedIds))}
      >
        Cut
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.duplicate(selectedIds))}
      >
        Duplicate
      </button>
      <hr className="my-1 border-slate-200" />
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.groupObjects(selectedIds))}
        disabled={selectedIds.length < 2}
      >
        Group
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.ungroupObjects(selectedIds))}
      >
        Ungroup
      </button>
      <hr className="my-1 border-slate-200" />
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.reorderObjects(selectedIds, 'bringToFront'))}
      >
        Bring to Front
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.reorderObjects(selectedIds, 'sendToBack'))}
      >
        Send to Back
      </button>
      <hr className="my-1 border-slate-200" />
      <button 
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        onClick={() => handleAction(() => objectManager.lockObjects(selectedIds))}
      >
        Lock
      </button>
    </div>
  );
};
