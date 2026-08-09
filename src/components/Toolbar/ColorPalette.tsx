import React, { useRef } from 'react';
import { Pipette, Check } from 'lucide-react';

interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const PALETTE = [
  '#0f172a', // Slate/Ink Black
  '#475569', // Slate Gray
  '#dc2626', // Crimson Red
  '#ea580c', // Tangerine Orange
  '#eab308', // Sunny Yellow
  '#16a34a', // Emerald Green
  '#06b6d4', // Cyan
  '#2563eb', // Royal Blue
  '#7c3aed', // Violet Purple
  '#db2777', // Magenta Pink
  '#854d0e', // Earth Brown
  '#ffffff', // Chalk White
];

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  const customColorInputRef = useRef<HTMLInputElement | null>(null);

  const isCustom = !PALETTE.some(
    (c) => c.toLowerCase() === selectedColor.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl animate-fade-in min-w-[240px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Color Palette
        </span>
        <div
          className="w-4 h-4 rounded-full border border-slate-600 shadow-inner"
          style={{ backgroundColor: selectedColor }}
        />
      </div>

      <div className="grid grid-cols-6 gap-2">
        {PALETTE.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onSelectColor(color)}
              className="relative w-8 h-8 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 focus:outline-none flex items-center justify-center border border-slate-700/50 shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`Select color ${color}`}
            >
              {isSelected && (
                <Check
                  className={`w-4 h-4 stroke-[3] ${
                    color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#eab308'
                      ? 'text-slate-900'
                      : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">Custom Hue</span>
        <button
          type="button"
          onClick={() => customColorInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            isCustom
              ? 'bg-primary-600/30 border-primary-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Pipette className="w-3.5 h-3.5" />
          <span>Pick</span>
          <input
            ref={customColorInputRef}
            type="color"
            value={selectedColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="sr-only"
          />
        </button>
      </div>
    </div>
  );
};
