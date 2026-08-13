import React from 'react';
import { Eraser, Undo2, Redo2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { PenRegistry } from '../../drawing/pens';
import { ToolType } from '../../types';

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#000000', // Black
];

export const ChildFriendlyToolbar: React.FC = () => {
  const { toolSettings, setTool, updateToolSettings, undo, redo, history, setActivePen } =
    useWhiteboardStore();

  // Child mode offers the gentler pens only, chosen through the same registry
  // the teacher selector uses.
  const childPens = PenRegistry.getForMode(true);

  const handleSelectTool = (type: ToolType) => {
    setTool(type);
  };

  const activeColor = toolSettings.color;
  const activeTool = toolSettings.tool;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-3xl border-4 border-slate-200 rounded-[2.5rem] shadow-2xl pointer-events-auto">
      {/* Pens — big targets, simple names, gentle pens only */}
      <div className="flex flex-wrap justify-center gap-3 max-w-[320px]">
        {childPens.map((pen) => {
          const isActive = activeTool === 'pen' && toolSettings.activePenId === pen.id;
          return (
            <button
              key={pen.id}
              onClick={() => setActivePen(pen.id)}
              title={pen.name}
              aria-label={pen.name}
              className={`relative flex min-h-[72px] min-w-[72px] flex-col items-center justify-center gap-1 rounded-3xl transition-transform ${
                isActive
                  ? 'scale-110 bg-blue-100 border-4 border-blue-400'
                  : 'bg-slate-50 border-2 border-slate-200 hover:scale-105'
              }`}
            >
              <span className="text-3xl leading-none">{pen.icon}</span>
              <span className="text-[10px] font-bold text-slate-600">{pen.name}</span>
            </button>
          );
        })}

        <button
          onClick={() => handleSelectTool('eraser')}
          className={`relative flex min-h-[72px] min-w-[72px] flex-col items-center justify-center gap-1 rounded-3xl transition-transform ${activeTool === 'eraser' ? 'scale-110 bg-pink-100 border-4 border-pink-400' : 'bg-slate-50 border-2 border-slate-200 hover:scale-105'}`}
        >
          <Eraser className={`w-8 h-8 ${activeTool === 'eraser' ? 'text-pink-500' : 'text-slate-500'}`} />
          <span className="text-[10px] font-bold text-slate-600">Eraser</span>
        </button>
      </div>

      <div className="w-full h-1 bg-slate-200 rounded-full" />

      {/* Colors Section */}
      <div className="flex justify-center flex-wrap gap-3 max-w-[300px]">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => updateToolSettings({ color })}
            className={`w-12 h-12 rounded-full border-4 transition-transform shadow-md ${activeColor === color ? 'scale-125 border-slate-900' : 'border-white hover:scale-110'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-full h-1 bg-slate-200 rounded-full" />

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <button
          onClick={undo}
          disabled={!history.canUndo}
          className="p-4 bg-slate-100 rounded-3xl disabled:opacity-50 border-2 border-slate-200 active:scale-95 transition-transform"
        >
          <Undo2 className="w-8 h-8 text-slate-700" />
        </button>
        <button
          onClick={redo}
          disabled={!history.canRedo}
          className="p-4 bg-slate-100 rounded-3xl disabled:opacity-50 border-2 border-slate-200 active:scale-95 transition-transform"
        >
          <Redo2 className="w-8 h-8 text-slate-700" />
        </button>
      </div>
    </div>
  );
};
