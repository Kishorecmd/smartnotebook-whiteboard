import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Palette,
  X,
  Sliders,
  Ban,
  Edit3,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Ruler,
  Lock,
  Unlock,
  PlaySquare,
  Pause,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Scissors,
  Combine,
  SplitSquareHorizontal,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { StrokeStyle, TextObject, TextAlign, TeachingToolObject, YouTubeVideoObject, VideoObject, CompassObject, PdfObject } from '../../types';
import { CompassToolbar } from '../../teaching-tools/compass/CompassToolbar';

const COLOR_SWATCHES = [
  '#0f172a',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0284c7',
  '#4f46e5',
  '#9333ea',
  '#db2777',
  '#ffffff',
];

const FILL_SWATCHES = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Slate', value: '#f1f5f9' },
  { name: 'Blue', value: '#bae6fd' },
  { name: 'Green', value: '#a7f3d0' },
  { name: 'Yellow', value: '#fde68a' },
  { name: 'Pink', value: '#fecdd3' },
  { name: 'Purple', value: '#e9d5ff' },
];

export const SelectionActionBar: React.FC = () => {
  const {
    document: doc,
    activePageIndex,
    selectedIds,
    toolSettings,
    duplicateSelected,
    deleteSelected,
    reorderSelected,
    applySelectedStyle,
    startTextEditing,
    recognizeHandwritingForSelected,
    engine,
  } = useWhiteboardStore();

  const [activeMenu, setActiveMenu] = useState<'none' | 'color' | 'style' | 'order' | 'ruler'>('none');
  // Playback lives on the <video> element, not in the store, so nudge a re-render
  // to swap the play/pause label.
  const [, setVideoTick] = useState(0);

  if (selectedIds.length === 0 || toolSettings.tool !== 'select') {
    return null;
  }

  const activePage = doc.pages[activePageIndex] || doc.pages[0];
  const selectedObjects = activePage?.objects.filter((obj) => selectedIds.includes(obj.id)) || [];
  const isSingleTextSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'text';
  const selectedTextObj = isSingleTextSelected ? (selectedObjects[0] as TextObject) : null;
  const selectedStrokes = selectedObjects.filter((obj) => obj.type === 'stroke');
  const hasStrokesSelected = selectedStrokes.length > 0;
  const isSingleGuideSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'teaching-tool' && ((selectedObjects[0] as TeachingToolObject).toolId === 'ruler' || (selectedObjects[0] as TeachingToolObject).toolId === 'protractor');
  const selectedGuideObj = isSingleGuideSelected ? (selectedObjects[0] as TeachingToolObject) : null;
  const isSingleVideoSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'youtubeVideo';
  const selectedVideoObj = isSingleVideoSelected ? (selectedObjects[0] as YouTubeVideoObject) : null;
  const isSingleLocalVideoSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'video';
  const selectedLocalVideo = isSingleLocalVideoSelected ? (selectedObjects[0] as VideoObject) : null;
  const isSinglePdfSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'pdf';
  const selectedPdf = isSinglePdfSelected ? (selectedObjects[0] as PdfObject) : null;
  const isSingleAudioSelected = selectedObjects.length === 1 &&
    (selectedObjects[0].type === 'audio' || selectedObjects[0].type === 'image-audio');
  const selectedAudio = isSingleAudioSelected ? selectedObjects[0] : null;
  const isSingleCompassSelected = selectedObjects.length === 1 && selectedObjects[0].type === 'compass';
  const selectedCompassObj = isSingleCompassSelected ? (selectedObjects[0] as CompassObject) : null;

  const handleDeselect = () => {
    if (engine) {
      engine.clearSelection();
    }
  };

  const handleEditText = () => {
    if (selectedTextObj && engine) {
      startTextEditing({
        id: selectedTextObj.id,
        worldPoint: {
          x: selectedTextObj.x,
          y: selectedTextObj.y,
        },
        initialText: selectedTextObj.text,
        fontSize: selectedTextObj.fontSize,
        fontFamily: selectedTextObj.fontFamily,
        fontWeight: selectedTextObj.fontWeight,
        fontStyle: selectedTextObj.fontStyle,
        underline: selectedTextObj.underline,
        textAlign: selectedTextObj.textAlign,
        color: selectedTextObj.color,
        width: selectedTextObj.width,
        height: selectedTextObj.height,
        rotation: selectedTextObj.rotation,
      });
    }
  };

  const updateGuideSettings = (updates: any) => {
    if (selectedGuideObj && engine) {
      const newToolData = { ...selectedGuideObj.toolData, ...updates };
      engine.getCommandManager().execute({
        id: `cmd_${Date.now()}`,
        name: 'Update Guide Settings',
        execute: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, toolData: newToolData } : o);
          engine.setObjects(objs);
        },
        undo: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, toolData: selectedGuideObj.toolData } : o);
          engine.setObjects(objs);
        },
        redo: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, toolData: newToolData } : o);
          engine.setObjects(objs);
        }
      });
    }
  };

  const toggleGuideLock = () => {
    if (selectedGuideObj && engine) {
      const newLocked = !selectedGuideObj.locked;
      engine.getCommandManager().execute({
        id: `cmd_${Date.now()}`,
        name: 'Toggle Guide Lock',
        execute: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, locked: newLocked } : o);
          engine.setObjects(objs);
        },
        undo: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, locked: !newLocked } : o);
          engine.setObjects(objs);
        },
        redo: () => {
          const objs = engine.getObjects().map(o => o.id === selectedGuideObj.id ? { ...o, locked: newLocked } : o);
          engine.setObjects(objs);
        }
      });
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 flex flex-col items-center select-none animate-fade-in" style={{ zIndex: 200 }}>
      {/* Floating Submenus */}
      {activeMenu === 'ruler' && selectedGuideObj && (
        <div
          className="mb-3 p-4 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl ring-1 ring-white/10 w-64 animate-scale-up space-y-4 text-slate-200 text-sm font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60 mb-2">
            <Ruler className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold">{selectedGuideObj.toolId === 'protractor' ? 'Protractor Settings' : 'Ruler Settings'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Snap to Guide</span>
            <button 
              onClick={() => updateGuideSettings({ snapEnabled: selectedGuideObj.toolData?.snapEnabled === false ? true : false })}
              className={`w-10 h-5 rounded-full relative transition-colors ${selectedGuideObj.toolData?.snapEnabled !== false ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${selectedGuideObj.toolData?.snapEnabled !== false ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          
          {selectedGuideObj.toolData?.snapEnabled !== false && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Snap Distance</span>
                <span>{selectedGuideObj.toolData?.snapDistance ?? 20} px</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                step="5"
                value={selectedGuideObj.toolData?.snapDistance ?? 20}
                onChange={(e) => updateGuideSettings({ snapDistance: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          )}

          {selectedGuideObj.toolId === 'protractor' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Angle Snap</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800 rounded-xl p-1">
                {['OFF', 1, 5, 10].map((snapVal) => {
                  const currentSnap = selectedGuideObj.toolData?.angleSnap ?? 1;
                  const isSelected = snapVal === 'OFF' ? currentSnap === 0 : currentSnap === snapVal;
                  return (
                    <button
                      key={snapVal}
                      type="button"
                      onClick={() => updateGuideSettings({ angleSnap: snapVal === 'OFF' ? 0 : snapVal })}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {snapVal}{snapVal !== 'OFF' && '°'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            <span>Orientation</span>
            <span className="font-mono text-slate-200">
              {Math.round((selectedGuideObj.rotation * 180) / Math.PI)}°
            </span>
          </div>

          <button
            onClick={toggleGuideLock}
            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              selectedGuideObj.locked
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {selectedGuideObj.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{selectedGuideObj.locked ? 'Unlock Tool' : 'Lock Tool'}</span>
          </button>
        </div>
      )}

      {activeMenu === 'color' && (
        <div
          className="mb-3 p-3 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl ring-1 ring-white/10 w-72 animate-scale-up space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              {isSingleTextSelected ? 'Text Color' : 'Stroke Color'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => applySelectedStyle({ strokeColor: color, color })}
                  className="w-6 h-6 rounded-lg border border-slate-600/80 hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {!isSingleTextSelected && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Fill Color
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILL_SWATCHES.map((fill) => (
                  <button
                    key={fill.name}
                    type="button"
                    onClick={() => applySelectedStyle({ fillColor: fill.value })}
                    title={fill.name}
                    className="w-6 h-6 rounded-lg border border-slate-600/80 hover:scale-110 transition-transform flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: fill.value !== 'transparent' ? fill.value : '#1e293b' }}
                  >
                    {fill.value === 'transparent' && <Ban className="w-3 h-3 text-slate-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeMenu === 'style' && (
        <div
          className="mb-3 p-3 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl ring-1 ring-white/10 w-64 animate-scale-up space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {isSingleTextSelected && selectedTextObj ? (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Font Size
                </span>
                <div className="flex items-center justify-between bg-slate-800 rounded-xl p-1">
                  {[16, 20, 24, 28, 36, 48].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => applySelectedStyle({ fontSize: sz })}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                        selectedTextObj.fontSize === sz
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Alignment
                </span>
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 justify-around">
                  {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => applySelectedStyle({ textAlign: align })}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        selectedTextObj.textAlign === align
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {align === 'left' && <AlignLeft size={14} />}
                      {align === 'center' && <AlignCenter size={14} />}
                      {align === 'right' && <AlignRight size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Line Thickness
                </span>
                <div className="flex items-center justify-between bg-slate-800 rounded-xl p-1">
                  {[2, 3, 5, 8, 12].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => applySelectedStyle({ strokeWidth: w })}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Line Style
                </span>
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                  {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => applySelectedStyle({ strokeStyle: st })}
                      className="flex-1 py-1 text-[11px] font-semibold capitalize text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeMenu === 'order' && (
        <div
          className="mb-3 p-2 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl ring-1 ring-white/10 flex items-center gap-1 animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => reorderSelected('bringToFront')}
            title="Bring to Front (Ctrl+])"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition-colors"
          >
            <BringToFront className="w-4 h-4 text-primary-400" />
            <span>Front</span>
          </button>
          <button
            type="button"
            onClick={() => reorderSelected('bringForward')}
            title="Bring Forward (])"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition-colors"
          >
            <ArrowUp className="w-4 h-4 text-emerald-400" />
            <span>Forward</span>
          </button>
          <button
            type="button"
            onClick={() => reorderSelected('sendBackward')}
            title="Send Backward ([)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition-colors"
          >
            <ArrowDown className="w-4 h-4 text-amber-400" />
            <span>Backward</span>
          </button>
          <button
            type="button"
            onClick={() => reorderSelected('sendToBack')}
            title="Send to Back (Ctrl+[)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition-colors"
          >
            <SendToBack className="w-4 h-4 text-sky-400" />
            <span>Back</span>
          </button>
        </div>
      )}

      {/* Main Glass Action Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/70 rounded-2xl shadow-2xl ring-1 ring-white/10">
        {/* Selection Count Pill */}
        <div className="px-3 py-1 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <span>{selectedIds.length}</span>
          <span className="text-[11px] font-normal text-primary-300">
            {selectedIds.length === 1 ? (isSingleTextSelected ? 'text' : 'item') : 'items'}
          </span>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

        {/* Edit Text button (if single text selected) */}
        {isSingleTextSelected && (
          <>
            <button
              type="button"
              onClick={handleEditText}
              title="Edit Text (Double click object)"
              aria-label="Edit text content"
              className="p-2 text-indigo-300 hover:text-indigo-100 hover:bg-indigo-600/30 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>Edit Text</span>
            </button>

            {/* Quick Bold toggle */}
            <button
              type="button"
              onClick={() =>
                applySelectedStyle({
                  fontWeight: selectedTextObj?.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
              title="Toggle Bold"
              className={`p-2 rounded-xl transition-colors ${
                selectedTextObj?.fontWeight === 'bold'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>

            {/* Quick Italic toggle */}
            <button
              type="button"
              onClick={() =>
                applySelectedStyle({
                  fontStyle: selectedTextObj?.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
              title="Toggle Italic"
              className={`p-2 rounded-xl transition-colors ${
                selectedTextObj?.fontStyle === 'italic'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>

            {/* Quick Underline toggle */}
            <button
              type="button"
              onClick={() =>
                applySelectedStyle({
                  underline: !selectedTextObj?.underline,
                })
              }
              title="Toggle Underline"
              className={`p-2 rounded-xl transition-colors ${
                selectedTextObj?.underline
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Underline className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {/* Handwriting Recognition Button (if stroke(s) selected) */}
        {hasStrokesSelected && (
          <>
            <button
              type="button"
              onClick={() => recognizeHandwritingForSelected()}
              title="Convert Handwriting to Text (Ctrl+Alt+T)"
              className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="hidden sm:inline">Convert to Text</span>
              <span className="sm:hidden">To Text</span>
            </button>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {/* Local video playback. Frames are drawn onto the canvas, so the video
            never floats above the board. */}
        {/* Audio transport for audio and image+audio objects */}
        {isSingleAudioSelected && selectedAudio && (
          <>
            <button
              type="button"
              onClick={() => { engine?.toggleAudioObject(selectedAudio.id); setVideoTick((t) => t + 1); }}
              title="Play or pause"
              aria-label="Play or pause audio"
              className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40"
            >
              {engine && engine.isAudioPlaying(selectedAudio.id)
                ? (<><Pause className="w-4 h-4" /><span className="hidden sm:inline">Pause</span></>)
                : (<><PlaySquare className="w-4 h-4" /><span className="hidden sm:inline">Play</span></>)}
            </button>
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {/* PDF page navigation (section 20/22) */}
        {isSinglePdfSelected && selectedPdf && (
          <>
            <div className="flex items-center gap-1 rounded-xl bg-slate-800 px-1.5 py-1">
              <button
                type="button"
                onClick={() => engine?.previousPdfPage(selectedPdf.id)}
                disabled={selectedPdf.currentPage <= 1}
                title="Previous page"
                aria-label="Previous PDF page"
                className="rounded-lg px-2 py-1.5 text-slate-200 disabled:opacity-40 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[52px] text-center text-[11px] font-bold text-slate-200">
                {selectedPdf.currentPage} / {selectedPdf.pageCount}
              </span>
              <button
                type="button"
                onClick={() => engine?.nextPdfPage(selectedPdf.id)}
                disabled={selectedPdf.currentPage >= selectedPdf.pageCount}
                title="Next page"
                aria-label="Next PDF page"
                className="rounded-lg px-2 py-1.5 text-slate-200 disabled:opacity-40 hover:bg-slate-700"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => engine?.rotatePdfPage(selectedPdf.id)}
                title="Rotate page"
                aria-label="Rotate PDF page"
                className="rounded-lg px-2 py-1.5 text-slate-200 hover:bg-slate-700"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {isSingleLocalVideoSelected && selectedLocalVideo && (
          <>
            <button
              type="button"
              onClick={() => {
                if (!engine) return;
                if (engine.isVideoPlaying(selectedLocalVideo.id)) {
                  engine.pauseVideoObject(selectedLocalVideo.id);
                } else {
                  void engine.playVideoObject(selectedLocalVideo.id);
                }
                setVideoTick((t) => t + 1);
              }}
              title={selectedLocalVideo.fileName || 'Play video'}
              aria-label="Play or pause video"
              className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40 hover:text-emerald-300"
            >
              {engine && engine.isVideoPlaying(selectedLocalVideo.id) ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <PlaySquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </button>
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {/* Watch on YouTube — videos render as a poster on the canvas, so playback
            happens in a real YouTube tab rather than an iframe over the board. */}
        {isSingleVideoSelected && selectedVideoObj && (
          <>
            <button
              type="button"
              onClick={() => {
                const start = selectedVideoObj.startTime;
                const url =
                  `https://www.youtube.com/watch?v=${selectedVideoObj.videoId}` +
                  (start > 0 ? `&t=${Math.floor(start)}s` : '');
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              title="Watch on YouTube (opens in a new tab)"
              aria-label="Watch on YouTube"
              className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:text-red-300"
            >
              <PlaySquare className="w-4 h-4" />
              <span className="hidden sm:inline">Watch on YouTube</span>
            </button>
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
          </>
        )}

        {/* Compass specific toolbar */}
        {isSingleCompassSelected && selectedCompassObj && (
          <CompassToolbar compass={selectedCompassObj} />
        )}

        {/* Cut Button */}
        <button
          type="button"
          onClick={() => engine?.getObjectManager()?.cut(selectedIds)}
          title="Cut (Ctrl+X)"
          aria-label="Cut selected"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Scissors className="w-4 h-4 text-pink-400" />
        </button>
        
        {/* Copy Button */}
        <button
          type="button"
          onClick={() => engine?.getObjectManager()?.copy(selectedIds)}
          title="Copy (Ctrl+C)"
          aria-label="Copy selected"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Copy className="w-4 h-4 text-teal-400" />
        </button>

        {/* Duplicate Button */}
        <button
          type="button"
          onClick={() => engine?.getObjectManager()?.duplicate(selectedIds)}
          title="Duplicate (Ctrl+D)"
          aria-label="Duplicate selected"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Copy className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Duplicate</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

        {/* Group / Ungroup Buttons */}
        {selectedIds.length > 1 && (
          <button
            type="button"
            onClick={() => engine?.getObjectManager()?.groupObjects(selectedIds)}
            title="Group Objects (Ctrl+G)"
            aria-label="Group objects"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Combine className="w-4 h-4 text-amber-400" />
          </button>
        )}
        {selectedObjects.some(obj => obj.type === 'group') && (
          <button
            type="button"
            onClick={() => engine?.getObjectManager()?.ungroupObjects(selectedIds)}
            title="Ungroup Objects (Ctrl+Shift+G)"
            aria-label="Ungroup objects"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <SplitSquareHorizontal className="w-4 h-4 text-orange-400" />
          </button>
        )}

        {/* Lock / Unlock Buttons */}
        {selectedObjects.some(obj => !obj.locked) ? (
          <button
            type="button"
            onClick={() => engine?.getObjectManager()?.lockObjects(selectedIds)}
            title="Lock Objects (Ctrl+Shift+L)"
            aria-label="Lock objects"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Lock className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => engine?.getObjectManager()?.unlockObjects(selectedIds)}
            title="Unlock Objects (Ctrl+Shift+L)"
            aria-label="Unlock objects"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Unlock className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Delete Button */}
        <button
          type="button"
          onClick={deleteSelected}
          title="Delete (Delete / Backspace)"
          aria-label="Delete selected"
          className="p-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

        {/* Quick Color Swatches */}
        <button
          type="button"
          onClick={() => setActiveMenu((prev) => (prev === 'color' ? 'none' : 'color'))}
          title="Change Color"
          aria-label="Change Color"
          className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
            activeMenu === 'color'
              ? 'bg-slate-800 text-primary-400 ring-1 ring-primary-500'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden md:inline">Color</span>
        </button>

        {/* Quick Style */}
        {!isSingleGuideSelected && !isSingleVideoSelected && (
          <button
            type="button"
            onClick={() => setActiveMenu((prev) => (prev === 'style' ? 'none' : 'style'))}
            title={isSingleTextSelected ? 'Text Styling' : 'Change Stroke Style / Width'}
            aria-label="Change Style"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
              activeMenu === 'style'
                ? 'bg-slate-800 text-primary-400 ring-1 ring-primary-500'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden md:inline">{isSingleTextSelected ? 'Size' : 'Style'}</span>
          </button>
        )}

        {/* Ruler Settings Button (Only if ruler is selected) */}
        {isSingleGuideSelected && (
          <button
            type="button"
            onClick={() => setActiveMenu((prev) => (prev === 'ruler' ? 'none' : 'ruler'))}
            title="Ruler Settings"
            aria-label="Ruler Settings"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
              activeMenu === 'ruler'
                ? 'bg-slate-800 text-primary-400 ring-1 ring-primary-500'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden md:inline">Ruler Settings</span>
          </button>
        )}

        {/* Layers / Reorder */}
        <button
          type="button"
          onClick={() => setActiveMenu((prev) => (prev === 'order' ? 'none' : 'order'))}
          title="Layer Order"
          aria-label="Layer Order"
          className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
            activeMenu === 'order'
              ? 'bg-slate-800 text-primary-400 ring-1 ring-primary-500'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <BringToFront className="w-4 h-4" />
          <span className="hidden md:inline">Order</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

        {/* Deselect / Close */}
        <button
          type="button"
          onClick={handleDeselect}
          title="Deselect (Escape)"
          aria-label="Deselect"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
