import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
import {
  Sparkles,
  X,
  Plus,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  AlertTriangle,
} from 'lucide-react';
import { TextAlign } from '../../types';

const FONT_FAMILIES = [
  { label: 'Sans-Serif', value: 'Inter, sans-serif' },
  { label: 'Handwritten', value: 'Caveat, "Comic Sans MS", cursive' },
  { label: 'Serif', value: 'Merriweather, Georgia, serif' },
  { label: 'Monospace', value: '"JetBrains Mono", Courier, monospace' },
];

const PRESET_COLORS = [
  '#0f172a', // Dark Slate
  '#2563eb', // Blue
  '#059669', // Emerald Green
  '#dc2626', // Red
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ffffff', // White
];

const MINIMUM_RELIABLE_OFFLINE_CONFIDENCE = 60;

export const HandwritingRecognitionModal: React.FC = () => {
  const {
    isHandwritingModalOpen,
    isRecognizingHandwriting,
    handwritingProgress,
    handwritingStatus,
    handwritingResult,
    setHandwritingModalOpen,
    applyHandwritingRecognition,
    recognitionEngine,
    setRecognitionEngine,
    recognitionError,
    recognizeHandwritingForSelected,
  } = useWhiteboardStore();

  const [showSettings, setShowSettings] = useState(false);

  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(28);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [color, setColor] = useState('#0f172a');
  const [hasReviewedLowConfidenceResult, setHasReviewedLowConfidenceResult] = useState(false);

  // Synchronize local edit state when new recognition results arrive
  useEffect(() => {
    if (handwritingResult) {
      setText(handwritingResult.text);
      setFontSize(handwritingResult.suggestedFontSize || 28);
      setColor(handwritingResult.color || '#0f172a');
      setHasReviewedLowConfidenceResult(false);
    }
  }, [handwritingResult]);

  if (!isHandwritingModalOpen) return null;

  const handleClose = () => {
    setHandwritingModalOpen(false);
  };

  const handleApply = (replace: boolean) => {
    if (!text.trim()) return;

    applyHandwritingRecognition({
      text,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      underline,
      textAlign,
      color,
      replace,
    });
  };

  const isLowConfidenceOfflineResult =
    handwritingResult?.engine === 'tesseract' &&
    handwritingResult.confidence !== null &&
    handwritingResult.confidence < MINIMUM_RELIABLE_OFFLINE_CONFIDENCE;
  const mustReviewResult = isLowConfidenceOfflineResult && !hasReviewedLowConfidenceResult;
  const displayedRecognitionEngine = handwritingResult?.engine ?? recognitionEngine;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Handwriting to Text
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI handwriting recognition for interactive whiteboard
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isRecognizingHandwriting ? (
            /* Progress State */
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 absolute" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {handwritingStatus || 'Analyzing handwriting...'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {recognitionEngine === 'gemini'
                    ? 'Gemini Vision is reading only the selected handwriting image'
                    : 'The handwriting model runs locally in a background worker'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-64 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${handwritingProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400">
                {handwritingProgress}%
              </span>
            </div>
          ) : handwritingResult ? (
            /* Result Preview & Edit State */
            <div className="space-y-5">
              {/* Top Side-by-Side: Ink sample vs Recognized text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Handwritten Ink Thumbnail */}
                <div className="flex flex-col space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Handwritten Ink
                  </span>
                  <div className="h-36 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 overflow-hidden">
                    {handwritingResult.previewDataUrl ? (
                      <img
                        src={handwritingResult.previewDataUrl}
                        alt="Handwriting sample"
                        className="max-h-full max-w-full object-contain rounded filter dark:invert"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No preview</span>
                    )}
                  </div>
                </div>

                {/* Recognized Editable Text */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Recognized Text
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                      {handwritingResult.confidence === null
                        ? 'TrOCR on-device AI'
                        : `${handwritingResult.confidence}% confidence`}
                    </span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Recognized text here..."
                    className="h-36 w-full p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none font-medium"
                  />
                </div>
              </div>

              {isLowConfidenceOfflineResult && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
                    <p>
                      This offline result is only {handwritingResult.confidence}% confident. Tesseract is suitable for neat printed/block letters, not cursive writing like this sample. Choose <strong>Change</strong> below to use Gemini Vision, or review the text before inserting it.
                    </p>
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={hasReviewedLowConfidenceResult}
                      onChange={(e) => setHasReviewedLowConfidenceResult(e.target.checked)}
                      className="h-3.5 w-3.5 accent-amber-700"
                    />
                    I have reviewed and corrected this text.
                  </label>
                </div>
              )}

              {/* Recognition engine */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">Recognition engine:</span>
                    <span className="font-medium">
                      {displayedRecognitionEngine === 'gemini'
                        ? 'Gemini Vision (cloud AI)'
                        : displayedRecognitionEngine === 'trocr'
                          ? 'TrOCR handwriting AI (on-device)'
                          : 'Tesseract (printed / block letters)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings((v) => !v)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showSettings ? 'Hide' : 'Change'}
                  </button>
                </div>

                {recognitionError && (
                  <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                    <span>{recognitionError}</span>
                  </div>
                )}

                {showSettings && (
                  <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(['gemini', 'trocr', 'tesseract'] as const).map((eng) => (
                        <button
                          key={eng}
                          type="button"
                          onClick={() => setRecognitionEngine(eng)}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                            recognitionEngine === eng
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {eng === 'gemini'
                            ? 'Gemini Vision (recommended)'
                            : eng === 'trocr'
                              ? 'TrOCR (handwriting; on-device)'
                              : 'Tesseract (printed / block letters)'}
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Gemini Vision sends the selected handwriting image to your configured Node
                      server and Gemini; the API key stays on the server. TrOCR and Tesseract run
                      locally in the browser and do not send the ink to a recognition service.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        recognizeHandwritingForSelected();
                      }}
                      className="w-full rounded-lg bg-slate-200 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Recognize again
                    </button>
                  </div>
                )}
              </div>

              {/* Typography Formatting Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Font Family */}
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Font Size Stepper */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setFontSize(Math.max(12, fontSize - 4))}
                      className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {fontSize}px
                    </span>
                    <button
                      onClick={() => setFontSize(Math.min(96, fontSize + 4))}
                      className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>

                  {/* Bold, Italic, Underline */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        fontWeight === 'bold'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        fontStyle === 'italic'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setUnderline(!underline)}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        underline
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Text Alignment */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setTextAlign('left')}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        textAlign === 'left'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTextAlign('center')}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        textAlign === 'center'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTextAlign('right')}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        textAlign === 'right'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Color:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : recognitionError ? (
            <div
              role="alert"
              className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5 text-center text-sm text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <AlertTriangle className="h-5 w-5" />
              <p>{recognitionError}</p>
              <button
                type="button"
                onClick={() => recognizeHandwritingForSelected()}
                className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              No strokes available for recognition.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleApply(false)}
              disabled={isRecognizingHandwriting || !text.trim() || mustReviewResult}
              className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Insert Alongside
            </button>

            <button
              onClick={() => handleApply(true)}
              disabled={isRecognizingHandwriting || !text.trim() || mustReviewResult}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Replace Ink with Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
