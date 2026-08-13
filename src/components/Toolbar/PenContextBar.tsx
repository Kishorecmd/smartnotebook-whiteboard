import React from 'react';
import { useWhiteboardStore } from '../../store';
import { PenRegistry } from '../../drawing/pens';

const SIZE_PRESETS = [1, 2, 3, 5, 8, 12, 20, 30, 50];

/**
 * Contextual controls for the pen in hand: type, colour, size and opacity.
 * Advanced rows only appear when the active pen actually uses them, so the bar
 * stays short for a Fine Pen and grows for a highlighter or dashed pen.
 */
export const PenContextBar: React.FC = () => {
  const toolSettings = useWhiteboardStore((s) => s.toolSettings);
  const setPenSize = useWhiteboardStore((s) => s.setPenSize);
  const setPenOpacity = useWhiteboardStore((s) => s.setPenOpacity);
  const setPenColor = useWhiteboardStore((s) => s.setPenColor);
  const recentColors = useWhiteboardStore((s) => s.recentColors);
  const addRecentColor = useWhiteboardStore((s) => s.addRecentColor);

  const preset = PenRegistry.getOrDefault(toolSettings.activePenId);
  const size = toolSettings.penSizeOverride ?? preset.size;
  const opacity = toolSettings.penOpacityOverride ?? preset.opacity;
  const color = toolSettings.penColorOverride || preset.color || toolSettings.color;

  const sizes = preset.sizePresets && preset.sizePresets.length ? preset.sizePresets : SIZE_PRESETS;
  const swatches = preset.colorPresets && preset.colorPresets.length
    ? preset.colorPresets
    : ['#0f172a', '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', ...recentColors.slice(0, 3)];

  const applyColor = (next: string) => {
    setPenColor(next);
    addRecentColor(next);
  };

  return (
    <div className="flex w-[min(94vw,560px)] flex-col gap-2 rounded-3xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{preset.icon}</span>
        <span className="text-xs font-bold text-white">{preset.name}</span>
        <span className="ml-auto text-[11px] font-medium text-slate-400">
          {size}px · {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Colour */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from(new Set(swatches)).map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => applyColor(swatch)}
            title={swatch}
            aria-label={`Colour ${swatch}`}
            className={`h-9 w-9 rounded-full border-2 transition-transform ${
              color.toLowerCase() === swatch.toLowerCase()
                ? 'scale-110 border-white'
                : 'border-slate-600 hover:scale-105'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <label
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-600 text-[10px] font-bold text-slate-300"
          title="Custom colour"
        >
          +
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#000000'}
            onChange={(e) => applyColor(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>

      {/* Size */}
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[11px] font-semibold text-slate-400">Size</span>
        <div className="flex flex-wrap gap-1">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPenSize(s)}
              className={`min-w-[38px] rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                size === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={50}
        step={0.5}
        value={size}
        onChange={(e) => setPenSize(parseFloat(e.target.value))}
        className="w-full accent-indigo-500"
        aria-label="Pen size"
      />

      {/* Opacity — only where it is meaningful */}
      {preset.renderMode !== 'glow' && (
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] font-semibold text-slate-400">Opacity</span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setPenOpacity(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
            aria-label="Pen opacity"
          />
        </div>
      )}
    </div>
  );
};
