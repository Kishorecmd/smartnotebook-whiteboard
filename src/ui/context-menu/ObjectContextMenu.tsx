import React, { useEffect } from 'react';
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
  if (!position || selectedIds.length === 0) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="absolute bg-white shadow-lg rounded-lg border border-slate-200 py-1 z-[9999]"
      style={{ left: position.x, top: position.y, minWidth: '160px' }}
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
