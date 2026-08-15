import React from 'react';
import { ObjectManager } from '../../objects/ObjectManager';
import { ContextMenuPosition } from './ObjectContextMenu';

export interface CanvasContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  objectManager: ObjectManager;
  onSelectAll: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ position, onClose, objectManager, onSelectAll }) => {
  if (!position) return null;

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
