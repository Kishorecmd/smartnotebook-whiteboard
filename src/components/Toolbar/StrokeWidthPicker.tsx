import React from 'react';
import { ToolType, EraserMode } from '../../types';

interface StrokeWidthPickerProps {
  tool: ToolType;
  penWidth: number;
  markerWidth: number;
  eraserWidth: number;
  eraserMode: EraserMode;
  currentColor: string;
  onChangeWidth: (width: number) => void;
  onChangeEraserMode?: (mode: EraserMode) => void;
}

export const StrokeWidthPicker: React.FC<StrokeWidthPickerProps> = ({
  tool,
  penWidth,
  markerWidth,
  eraserWidth,
  eraserMode,
  currentColor,
  onChangeWidth,
  onChangeEraserMode,
}) => {
  const isMarker = tool === 'marker';
  const isEraser = tool === 'eraser';

  let currentWidth = penWidth;
  let min = 1;
  let max = 30;
  let step = 1;
  let presets: number[] = [2, 4, 8, 14, 24];

  if (isMarker) {
    currentWidth = markerWidth;
    min = 8;
    max = 60;
    step = 2;
    presets = [12, 20, 32, 48];
  } else if (isEraser) {
    currentWidth = eraserWidth;
    min = 10;
    max = 80;
    step = 2;
    presets = [16, 28, 48, 64];
  }

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl animate-fade-in min-w-[240px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isEraser ? 'Eraser Size' : isMarker ? 'Highlighter Thickness' : 'Pen Thickness'}
        </span>
        <span className="text-xs font-mono font-bold text-primary-400">
          {currentWidth}px
        </span>
      </div>

      {/* Eraser Mode Selection */}
      {isEraser && onChangeEraserMode && (
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
          <button
            type="button"
            onClick={() => onChangeEraserMode('stroke')}
            className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
              eraserMode === 'stroke'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Whole Stroke
          </button>
          <button
            type="button"
            onClick={() => onChangeEraserMode('area')}
            className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
              eraserMode === 'area'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Area Eraser
          </button>
        </div>
      )}

      {/* Visual Live Preview */}
      <div className="h-12 flex items-center justify-center bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden">
        {isEraser ? (
          <div
            className="rounded-full border-2 border-dashed border-rose-400 bg-rose-500/20 transition-all duration-100"
            style={{
              width: `${Math.min(currentWidth, 42)}px`,
              height: `${Math.min(currentWidth, 42)}px`,
            }}
          />
        ) : (
          <div
            className="rounded-full transition-all duration-100"
            style={{
              width: `${Math.min(currentWidth, 44)}px`,
              height: `${Math.min(currentWidth, 44)}px`,
              backgroundColor: currentColor,
              opacity: isMarker ? 0.5 : 1.0,
            }}
          />
        )}
      </div>

      {/* Presets */}
      <div className="flex items-center justify-between gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChangeWidth(preset)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              currentWidth === preset
                ? 'bg-primary-600 border-primary-500 text-white'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Precision Slider */}
      <div className="px-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentWidth}
          onChange={(e) => onChangeWidth(Number(e.target.value))}
          className="w-full accent-primary-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />
      </div>
    </div>
  );
};
