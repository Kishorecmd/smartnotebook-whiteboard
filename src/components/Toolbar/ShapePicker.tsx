import React from 'react';
import {
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Star,
  Diamond,
  Ban,
  RectangleHorizontal,
} from 'lucide-react';
import { ShapeType, StrokeStyle } from '../../types';

interface ShapePickerProps {
  currentShape: ShapeType;
  currentColor: string;
  fillColor: string;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  onSelectShape: (shape: ShapeType) => void;
  onSelectStrokeColor: (color: string) => void;
  onSelectFillColor: (color: string) => void;
  onSelectStrokeStyle: (style: StrokeStyle) => void;
  onSelectStrokeWidth: (width: number) => void;
}

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  { type: 'rectangle', label: 'Rectangle', icon: <Square className="w-5 h-5" /> },
  { type: 'rounded-rectangle', label: 'Rounded Rect', icon: <RectangleHorizontal className="w-5 h-5" /> },
  { type: 'circle', label: 'Circle', icon: <Circle className="w-5 h-5" /> },
  { type: 'ellipse', label: 'Oval', icon: <Circle className="w-5 h-5" /> },
  { type: 'triangle', label: 'Triangle', icon: <Triangle className="w-5 h-5" /> },
  { type: 'line', label: 'Line', icon: <Minus className="w-5 h-5" /> },
  { type: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-5 h-5" /> },
  { type: 'star', label: '5-Point Star', icon: <Star className="w-5 h-5" /> },
  { type: 'diamond', label: 'Diamond / Rhombus', icon: <Diamond className="w-5 h-5" /> },
];

const FILL_PALETTE = [
  { name: 'None', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Light Slate', value: '#f1f5f9' },
  { name: 'Sky Blue', value: '#bae6fd' },
  { name: 'Emerald Green', value: '#a7f3d0' },
  { name: 'Amber Yellow', value: '#fde68a' },
  { name: 'Rose Pink', value: '#fecdd3' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Dark Slate', value: '#1e293b' },
];

const STROKE_WIDTHS = [2, 3, 5, 8, 12];

const STROKE_STYLES: { type: StrokeStyle; label: string; dashClass: string }[] = [
  { type: 'solid', label: 'Solid', dashClass: 'border-solid' },
  { type: 'dashed', label: 'Dashed', dashClass: 'border-dashed' },
  { type: 'dotted', label: 'Dotted', dashClass: 'border-dotted' },
];

export const ShapePicker: React.FC<ShapePickerProps> = ({
  currentShape,
  fillColor,
  strokeStyle,
  strokeWidth,
  onSelectShape,
  onSelectFillColor,
  onSelectStrokeStyle,
  onSelectStrokeWidth,
}) => {
  return (
    <div
      className="p-4 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl ring-1 ring-white/10 w-80 select-none animate-scale-up space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Shape Selection */}
      <div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-2">
          Geometric Shape
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {SHAPES.map((item) => {
            const isSelected = currentShape === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectShape(item.type)}
                title={item.label}
                className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-[9px] mt-1 font-medium truncate max-w-full">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Fill Color */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Shape Fill
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {fillColor === 'transparent' ? 'No fill' : fillColor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILL_PALETTE.map((c) => {
            const isSelected = fillColor === c.value;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelectFillColor(c.value)}
                title={`Fill: ${c.name}`}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                  isSelected ? 'ring-2 ring-primary-400 scale-110 shadow-md' : 'hover:scale-105'
                } ${c.value === 'transparent' ? 'bg-slate-800 border border-slate-700' : 'border border-slate-600/60'}`}
                style={{ backgroundColor: c.value !== 'transparent' ? c.value : undefined }}
              >
                {c.value === 'transparent' && <Ban className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Stroke Style & Thickness */}
      <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-3">
        {/* Stroke Style */}
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-1.5">
            Border Style
          </span>
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            {STROKE_STYLES.map((st) => {
              const isSelected = strokeStyle === st.type;
              return (
                <button
                  key={st.type}
                  type="button"
                  onClick={() => onSelectStrokeStyle(st.type)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                    isSelected
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-1.5">
            Border Width
          </span>
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1 items-center justify-between">
            {STROKE_WIDTHS.map((w) => {
              const isSelected = strokeWidth === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => onSelectStrokeWidth(w)}
                  className={`w-6 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-primary-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[11px]">{w}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
