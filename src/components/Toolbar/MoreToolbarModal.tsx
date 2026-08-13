import React from 'react';
import {
  X, Hand, Shapes, Type, Image as ImageIcon,
  Sliders, Undo2, Redo2, Trash2, GraduationCap
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { ToolButton } from './ToolButton';
import { PopoverType } from './ContextToolbar';

interface MoreToolbarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPopover: (type: PopoverType) => void;
}

export const MoreToolbarModal: React.FC<MoreToolbarModalProps> = ({
  isOpen,
  onClose,
  onSelectPopover,
}) => {
  const { toolSettings, setTool, history, undo, redo, setClearDialogOpen, setTeachingPanelOpen } = useWhiteboardStore();

  if (!isOpen) return null;

  const handleTool = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal / Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 z-50 rounded-t-3xl animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">More Tools</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-8">
          <ToolButton
            icon={<Hand className="w-6 h-6" />}
            label="Pan"
            showLabel
            isActive={toolSettings.tool === 'pan'}
            onClick={() => handleTool(() => setTool('pan'))}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<Shapes className="w-6 h-6" />}
            label="Shapes"
            showLabel
            isActive={toolSettings.tool === 'shape'}
            onClick={() => handleTool(() => { setTool('shape'); onSelectPopover('shape'); })}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<Type className="w-6 h-6" />}
            label="Text"
            showLabel
            isActive={toolSettings.tool === 'text'}
            onClick={() => handleTool(() => { setTool('text'); onSelectPopover('text'); })}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<ImageIcon className="w-6 h-6" />}
            label="Media"
            showLabel
            onClick={() => handleTool(() => onSelectPopover('media'))}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<GraduationCap className="w-6 h-6" />}
            label="Teaching"
            showLabel
            onClick={() => handleTool(() => setTeachingPanelOpen(true))}
            className="w-full flex-1"
          />
          
          {/* Properties / Color */}
          <button
            className="flex flex-col items-center justify-center rounded-2xl transition-all hover:bg-slate-800 p-2 gap-1 w-full"
            onClick={() => handleTool(() => onSelectPopover('color'))}
          >
            <div 
              className="w-6 h-6 rounded-full border-2 border-slate-600 shadow-inner"
              style={{ backgroundColor: toolSettings.color }}
            />
            <span className="text-[10px] font-medium text-slate-300">Color</span>
          </button>
          
          <ToolButton
            icon={<Sliders className="w-6 h-6" />}
            label="Props"
            showLabel
            onClick={() => alert('Properties coming soon')}
            className="w-full flex-1"
          />

          {/* History / Actions */}
          <ToolButton
            icon={<Undo2 className="w-6 h-6" />}
            label="Undo"
            showLabel
            isDisabled={!history.canUndo}
            onClick={() => handleTool(undo)}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<Redo2 className="w-6 h-6" />}
            label="Redo"
            showLabel
            isDisabled={!history.canRedo}
            onClick={() => handleTool(redo)}
            className="w-full flex-1"
          />
          <ToolButton
            icon={<Trash2 className="w-6 h-6" />}
            label="Clear"
            showLabel
            variant="danger"
            onClick={() => handleTool(() => setClearDialogOpen(true))}
            className="w-full flex-1"
          />
        </div>
      </div>
    </>
  );
};
