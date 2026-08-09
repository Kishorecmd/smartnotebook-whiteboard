import React from 'react';
import { PenTool, Focus } from 'lucide-react';
import { ToolType } from '../../types';

interface TeachingToolsPickerProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const TeachingToolsPicker: React.FC<TeachingToolsPickerProps> = ({ currentTool, onSelectTool }) => {
  return (
    <div className="bg-slate-900/95 backdrop-blur-3xl border border-slate-700/60 rounded-3xl p-3 shadow-2xl ring-1 ring-white/10 flex gap-2">
      <button
        type="button"
        onClick={() => onSelectTool('laser')}
        className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
          currentTool === 'laser'
            ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500 shadow-inner'
            : 'hover:bg-slate-800 text-slate-300'
        }`}
        title="Laser Pointer"
      >
        <PenTool className="w-6 h-6" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Laser</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTool('spotlight')}
        className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
          currentTool === 'spotlight'
            ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500 shadow-inner'
            : 'hover:bg-slate-800 text-slate-300'
        }`}
        title="Spotlight"
      >
        <Focus className="w-6 h-6" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Spotlight</span>
      </button>
    </div>
  );
};
