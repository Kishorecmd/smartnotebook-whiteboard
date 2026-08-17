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
  const updateToolSettings = useWhiteboardStore((s) => s.updateToolSettings);

  const preset = PenRegistry.getOrDefault(toolSettings.activePenId);
  const size = toolSettings.penSizeOverride ?? preset.size;
  const opacity = toolSettings.penOpacityOverride ?? preset.opacity;
  const color = toolSettings.penColorOverride || preset.color || toolSettings.color;
  const textureDensity = toolSettings.penTextureDensityOverride ?? preset.textureDensity ?? 0.65;

  const sizes = preset.sizePresets && preset.sizePresets.length ? preset.sizePresets : SIZE_PRESETS;
  const swatches = preset.colorPresets && preset.colorPresets.length
    ? preset.colorPresets
    : ['#0f172a', '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', ...recentColors.slice(0, 3)];

  const applyColor = (next: string) => {
    setPenColor(next);
    addRecentColor(next);
  };

  return (
    <div className="pen-context-bar flex flex-col gap-2 rounded-3xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{preset.icon}</span>
        <span className="text-xs font-bold text-white">{preset.name}</span>
        <span className="ml-auto text-[11px] font-medium text-slate-400">
          {size}px · {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Colour */}
      <div className="pen-swatch-row scrollbar-none flex items-center gap-1.5 overflow-x-auto py-0.5">
        {Array.from(new Set(swatches)).map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => applyColor(swatch)}
            title={swatch}
            aria-label={`Colour ${swatch}`}
            className={`pen-colour-swatch shrink-0 rounded-full border-2 transition-transform ${
              color.toLowerCase() === swatch.toLowerCase()
                ? 'scale-110 border-white'
                : 'border-slate-600 hover:scale-105'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <label
          className="pen-colour-swatch flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-slate-600 text-[10px] font-bold text-slate-300"
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
        <div className="pen-size-presets scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
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

      {/* Crayon specific presets */}
      {preset.renderMode === 'crayon' && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-800/50 p-2 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Texture Preset</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateToolSettings({ penTextureDensityOverride: 0.3, penRoughnessOverride: 0.8 })}
              className={`rounded border border-slate-700 py-1.5 text-[10px] font-bold transition-colors ${
                textureDensity <= 0.4 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Soft
            </button>
            <button
              onClick={() => updateToolSettings({ penTextureDensityOverride: 0.65, penRoughnessOverride: 0.5 })}
              className={`rounded border border-slate-700 py-1.5 text-[10px] font-bold transition-colors ${
                textureDensity > 0.4 && textureDensity < 0.8 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => updateToolSettings({ penTextureDensityOverride: 0.9, penRoughnessOverride: 0.2 })}
              className={`rounded border border-slate-700 py-1.5 text-[10px] font-bold transition-colors ${
                textureDensity >= 0.8 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Heavy
            </button>
          </div>
        </div>
      )}

      {/* Magic Pen specific presets */}
      {preset.id === 'magic' && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-800/50 p-2 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Mode</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {['ink', 'spotlight', 'magnifier', 'highlight'].map((mode) => (
              <button
                key={mode}
                onClick={() => updateToolSettings({ magicPenMode: mode as any })}
                className={`rounded border border-slate-700 py-1.5 text-[10px] font-bold capitalize transition-colors ${
                  toolSettings.magicPenMode === mode ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-semibold text-slate-400">Duration</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[1000, 2000, 3000, 5000, 0].map((duration) => (
              <button
                key={duration}
                onClick={() => updateToolSettings({ magicPenDuration: duration })}
                className={`rounded border border-slate-700 py-1.5 text-[10px] font-bold transition-colors ${
                  toolSettings.magicPenDuration === duration ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {duration === 0 ? 'Never' : `${duration / 1000}s`}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={toolSettings.magicPenPermanent || false} 
                onChange={(e) => updateToolSettings({ magicPenPermanent: e.target.checked })}
                className="w-3 h-3 accent-indigo-500 rounded bg-slate-800 border-slate-600"
              />
              <span className="text-[11px] font-semibold text-slate-300">Keep Ink Permanent</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
