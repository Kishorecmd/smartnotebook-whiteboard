import React from 'react';
import { Pen, Eraser, Pen as Crayon, Undo2, Redo2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store';
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
  const { toolSettings, setTool, updateToolSettings, undo, redo, history } = useWhiteboardStore();

  const handleSelectTool = (type: ToolType) => {
    setTool(type);
  };

  const activeColor = toolSettings.color;
  const activeTool = toolSettings.tool;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-3xl border-4 border-slate-200 rounded-[2.5rem] shadow-2xl pointer-events-auto">
      {/* Tools Section */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => handleSelectTool('pen')}
          className={`relative p-4 rounded-3xl transition-transform ${activeTool === 'pen' ? 'scale-110 bg-blue-100 border-4 border-blue-400' : 'bg-slate-50 border-2 border-slate-200 hover:scale-105'}`}
        >
          <Pen className={`w-8 h-8 ${activeTool === 'pen' ? 'text-blue-500' : 'text-slate-500'}`} />
        </button>

        <button
          onClick={() => handleSelectTool('crayon')}
          className={`relative p-4 rounded-3xl transition-transform ${activeTool === 'crayon' ? 'scale-110 bg-orange-100 border-4 border-orange-400' : 'bg-slate-50 border-2 border-slate-200 hover:scale-105'}`}
        >
          <Crayon className={`w-8 h-8 ${activeTool === 'crayon' ? 'text-orange-500' : 'text-slate-500'}`} />
        </button>

        <button
          onClick={() => handleSelectTool('eraser')}
          className={`relative p-4 rounded-3xl transition-transform ${activeTool === 'eraser' ? 'scale-110 bg-pink-100 border-4 border-pink-400' : 'bg-slate-50 border-2 border-slate-200 hover:scale-105'}`}
        >
          <Eraser className={`w-8 h-8 ${activeTool === 'eraser' ? 'text-pink-500' : 'text-slate-500'}`} />
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
