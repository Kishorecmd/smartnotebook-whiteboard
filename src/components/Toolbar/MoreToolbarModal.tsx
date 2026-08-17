import React from 'react';
import {
  X, MousePointer, Hand, Pen, Highlighter, Eraser, Shapes, Type, Image as ImageIcon,
  Undo2, Redo2, Trash2, GraduationCap
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { ToolButton } from './ToolButton';
import { PopoverType } from './ContextToolbar';
import { LayoutMode } from '../../core/responsive';
import { PenRegistry } from '../../drawing/pens';

interface MoreToolbarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPopover: (type: PopoverType) => void;
  hiddenItemIds: string[];
}

export const MoreToolbarModal: React.FC<MoreToolbarModalProps> = ({
  isOpen,
  onClose,
  onSelectPopover,
  hiddenItemIds,
}) => {
  const { toolSettings, setTool, history, undo, redo, setClearDialogOpen, setTeachingPanelOpen, responsiveState, activateLastPen } = useWhiteboardStore();

  if (!isOpen || hiddenItemIds.length === 0) return null;

  const handleTool = (action: () => void) => {
    action();
    onClose();
  };

  const activePen = PenRegistry.getOrDefault(toolSettings.activePenId);

  const renderItem = (id: string) => {
    switch (id) {
      case 'select':
        return <ToolButton key={id} showLabel icon={<MousePointer className="w-6 h-6" />} label="Select" isActive={toolSettings.tool === 'select'} onClick={() => handleTool(() => setTool('select'))} className="w-full flex-1" />;
      case 'pan':
        return <ToolButton key={id} showLabel icon={<Hand className="w-6 h-6" />} label="Pan" isActive={toolSettings.tool === 'pan'} onClick={() => handleTool(() => setTool('pan'))} className="w-full flex-1" />;
      case 'pen':
        return <ToolButton key={id} showLabel icon={<Pen className="w-6 h-6" />} label={activePen.name} isActive={toolSettings.tool === 'pen'} onClick={() => handleTool(() => { activateLastPen(); onSelectPopover('pens'); })} className="w-full flex-1" />;
      case 'marker':
        return <ToolButton key={id} showLabel icon={<Highlighter className="w-6 h-6" />} label="Marker" isActive={toolSettings.tool === 'marker'} onClick={() => handleTool(() => { setTool('marker'); onSelectPopover('width'); })} className="w-full flex-1" />;
      case 'eraser':
        return <ToolButton key={id} showLabel icon={<Eraser className="w-6 h-6" />} label="Eraser" isActive={toolSettings.tool === 'eraser'} onClick={() => handleTool(() => { setTool('eraser'); onSelectPopover('eraser'); })} className="w-full flex-1" />;
      case 'shape':
        return <ToolButton key={id} showLabel icon={<Shapes className="w-6 h-6" />} label="Shapes" isActive={toolSettings.tool === 'shape'} onClick={() => handleTool(() => { setTool('shape'); onSelectPopover('shape'); })} className="w-full flex-1" />;
      case 'text':
        return <ToolButton key={id} showLabel icon={<Type className="w-6 h-6" />} label="Text" isActive={toolSettings.tool === 'text'} onClick={() => handleTool(() => { setTool('text'); onSelectPopover('text'); })} className="w-full flex-1" />;
      case 'media':
        return <ToolButton key={id} showLabel icon={<ImageIcon className="w-6 h-6" />} label="Media" onClick={() => handleTool(() => onSelectPopover('media'))} className="w-full flex-1" />;
      case 'teaching':
        return <ToolButton key={id} showLabel icon={<GraduationCap className="w-6 h-6" />} label="Teaching" onClick={() => handleTool(() => setTeachingPanelOpen(true))} className="w-full flex-1" />;
      case 'color':
        return (
          <button key={id} className="flex flex-col items-center justify-center rounded-2xl transition-all hover:bg-slate-800 p-2 gap-1 w-full" onClick={() => handleTool(() => onSelectPopover('color'))}>
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 shadow-inner" style={{ backgroundColor: toolSettings.color }} />
            <span className="text-[10px] font-medium text-slate-300">Color</span>
          </button>
        );
      case 'undo':
        return <ToolButton key={id} showLabel icon={<Undo2 className="w-6 h-6" />} label="Undo" onClick={() => handleTool(undo)} isDisabled={!history.canUndo} className="w-full flex-1" />;
      case 'redo':
        return <ToolButton key={id} showLabel icon={<Redo2 className="w-6 h-6" />} label="Redo" onClick={() => handleTool(redo)} isDisabled={!history.canRedo} className="w-full flex-1" />;
      case 'delete':
        return <ToolButton key={id} showLabel icon={<Trash2 className="w-6 h-6" />} label="Delete" onClick={() => handleTool(() => setClearDialogOpen(true))} variant="danger" className="w-full flex-1" />;
      default:
        return null;
    }
  };

  const isMobileOrTablet = responsiveState?.mode === LayoutMode.MOBILE || responsiveState?.mode === LayoutMode.TABLET;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal / Bottom Sheet */}
      <div className={`fixed z-50 bg-slate-900 border-slate-700 p-4 shadow-2xl overflow-y-auto ${
        isMobileOrTablet 
          ? 'bottom-0 left-0 right-0 border-t rounded-t-3xl animate-slide-up max-h-[80vh] pb-8' 
          : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border rounded-3xl w-[400px] max-w-[90vw]'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">More Tools</h2>
          <button 
            type="button"
            aria-label="Close more tools"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {hiddenItemIds.map(renderItem)}
        </div>
      </div>
    </>
  );
};
