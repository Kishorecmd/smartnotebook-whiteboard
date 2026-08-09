import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from 'lucide-react';
import { TextAlign } from '../../types';

interface TextPickerProps {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  textAlign: TextAlign;
  textColor: string;
  onChangeFontSize: (size: number) => void;
  onChangeFontFamily: (family: string) => void;
  onChangeFontWeight: (weight: 'normal' | 'bold') => void;
  onChangeFontStyle: (style: 'normal' | 'italic') => void;
  onChangeUnderline: (underline: boolean) => void;
  onChangeTextAlign: (align: TextAlign) => void;
  onChangeTextColor: (color: string) => void;
}

const FONT_FAMILIES = [
  { label: 'Sans-Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Merriweather, Georgia, serif' },
  { label: 'Monospace', value: 'JetBrains Mono, Menlo, monospace' },
  { label: 'Handwriting', value: 'Comic Sans MS, Caveat, cursive' },
];

const PRESET_FONT_SIZES = [16, 20, 24, 28, 36, 48, 64];

const PRESET_COLORS = [
  '#0f172a',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#db2777',
  '#ffffff',
];

export const TextPicker: React.FC<TextPickerProps> = ({
  fontSize,
  fontFamily,
  fontWeight,
  fontStyle,
  underline,
  textAlign,
  textColor,
  onChangeFontSize,
  onChangeFontFamily,
  onChangeFontWeight,
  onChangeFontStyle,
  onChangeUnderline,
  onChangeTextAlign,
  onChangeTextColor,
}) => {
  return (
    <div className="p-4 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl ring-1 ring-white/10 w-80 text-white select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
        <Type className="w-4 h-4 text-indigo-400" />
        <span>Text Tool Settings</span>
      </div>

      {/* Font Family */}
      <div className="mb-3">
        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Font Family</label>
        <select
          value={fontFamily}
          onChange={(e) => onChangeFontFamily(e.target.value)}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none text-xs border border-slate-700 hover:border-slate-600 focus:border-indigo-500 cursor-pointer"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size Presets */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[11px] font-medium text-slate-400">Font Size</label>
          <span className="text-xs font-bold text-indigo-400">{fontSize}px</span>
        </div>
        <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 justify-between">
          {PRESET_FONT_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onChangeFontSize(sz)}
              className={`flex-1 py-1 text-xs rounded-lg font-medium transition-all ${
                fontSize === sz
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Formatting & Alignment */}
      <div className="mb-3 flex items-center gap-2">
        {/* Style toggles */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => onChangeFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`p-1.5 rounded-lg transition-colors ${
              fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => onChangeFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
            className={`p-1.5 rounded-lg transition-colors ${
              fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => onChangeUnderline(!underline)}
            className={`p-1.5 rounded-lg transition-colors ${
              underline ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Underline"
          >
            <Underline size={15} />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex-1 flex items-center justify-around bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => onChangeTextAlign('left')}
            className={`p-1.5 rounded-lg transition-colors ${
              textAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onChangeTextAlign('center')}
            className={`p-1.5 rounded-lg transition-colors ${
              textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onClick={() => onChangeTextAlign('right')}
            className={`p-1.5 rounded-lg transition-colors ${
              textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>
        </div>
      </div>

      {/* Color Swatches */}
      <div>
        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Text Color</label>
        <div className="grid grid-cols-8 gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChangeTextColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                textColor.toLowerCase() === c.toLowerCase()
                  ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-105'
                  : 'border-slate-700'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
