import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
import { TextAlign } from '../../types';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  Trash2,
  Type,
} from 'lucide-react';

const TEXT_PALETTE = [
  '#0f172a', // Slate 900
  '#dc2626', // Red
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#db2777', // Pink
  '#ffffff', // White
];

const FONT_FAMILIES = [
  { label: 'Sans-Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Merriweather, Georgia, serif' },
  { label: 'Monospace', value: 'JetBrains Mono, Menlo, monospace' },
  { label: 'Handwriting', value: 'Comic Sans MS, Caveat, cursive' },
];

export const CanvasTextEditor: React.FC = () => {
  const { editingText, engine, viewport, commitTextEdit, cancelTextEdit } = useWhiteboardStore();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(28);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [color, setColor] = useState('#0f172a');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Initialize or reset state when editingText changes
  useEffect(() => {
    if (editingText) {
      setText(editingText.initialText || '');
      setFontSize(editingText.fontSize || 28);
      setFontFamily(editingText.fontFamily || 'Inter, sans-serif');
      setFontWeight(editingText.fontWeight || 'normal');
      setFontStyle(editingText.fontStyle || 'normal');
      setUnderline(editingText.underline || false);
      setTextAlign(editingText.textAlign || 'left');
      setColor(editingText.color || '#0f172a');

      // Auto-focus after next frame
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
    }
  }, [editingText]);

  // Auto-resize textarea height as user types
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [text, fontSize, fontFamily, fontWeight]);

  if (!editingText || !engine) {
    return null;
  }

  const transformer = engine.getTransformer();
  const screenPos = transformer.worldToScreen(editingText.worldPoint);
  const zoom = viewport.zoom;
  const scaledFontSize = Math.max(12, Math.round(fontSize * zoom));

  const handleCommit = () => {
    commitTextEdit({
      id: editingText.id,
      text,
      worldPoint: editingText.worldPoint,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      underline,
      textAlign,
      color,
      rotation: editingText.rotation,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelTextEdit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 pointer-events-auto"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        transform: editingText.rotation ? `rotate(${editingText.rotation}deg)` : undefined,
        transformOrigin: 'top left',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Floating Mini Formatting Toolbar */}
      <div className="absolute -top-12 left-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 text-white backdrop-blur-md rounded-xl shadow-xl border border-slate-700/60 text-xs select-none">
        {/* Font Family Selector */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="bg-slate-800 text-white rounded px-2 py-1 outline-none text-xs border border-slate-700 cursor-pointer"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font Size controls */}
        <div className="flex items-center gap-1 bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700">
          <Type size={12} className="text-slate-400" />
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(12, s - 4))}
            className="px-1 hover:text-indigo-400 font-bold"
          >
            -
          </button>
          <span className="w-5 text-center font-semibold">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(120, s + 4))}
            className="px-1 hover:text-indigo-400 font-bold"
          >
            +
          </button>
        </div>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Bold, Italic, Underline */}
        <button
          type="button"
          onClick={() => setFontWeight((w) => (w === 'bold' ? 'normal' : 'bold'))}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Bold"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => setFontStyle((s) => (s === 'italic' ? 'normal' : 'italic'))}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Italic"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={() => setUnderline((u) => !u)}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            underline ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Underline"
        >
          <Underline size={13} />
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => setTextAlign('left')}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            textAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('center')}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('right')}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-300'
          }`}
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Color Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
            title="Text Color"
          />

          {showColorPicker && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 bg-slate-900 rounded-lg shadow-xl border border-slate-700">
              {TEXT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                  className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Commit / Done */}
        <button
          type="button"
          onClick={handleCommit}
          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium flex items-center gap-1 shadow-sm"
          title="Done (Ctrl+Enter)"
        >
          <Check size={13} />
        </button>

        {/* Cancel / Delete */}
        <button
          type="button"
          onClick={cancelTextEdit}
          className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition-colors"
          title="Cancel (Esc)"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Auto-growing Text Input Box */}
      <textarea
        ref={textareaRef}
        value={text}
        placeholder="Type here..."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="outline-none resize-none overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-dashed border-indigo-500 rounded-lg p-2 shadow-2xl focus:border-indigo-600 transition-colors"
        style={{
          fontSize: `${scaledFontSize}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          textDecoration: underline ? 'underline' : 'none',
          textAlign,
          color,
          lineHeight: 1.25,
          minWidth: '180px',
          maxWidth: '80vw',
        }}
      />
    </div>
  );
};
