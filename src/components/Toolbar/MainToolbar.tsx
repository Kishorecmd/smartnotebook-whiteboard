import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer, Hand, Pen, Highlighter, Eraser, Shapes, Type, Image as ImageIcon,
  Palette, Sliders, Undo2, Redo2, Trash2, GraduationCap, ChevronRight, Settings2, Video, FileText, Music
} from 'lucide-react';
import { ToolButton } from './ToolButton';
import { ColorPalette } from './ColorPalette';
import { StrokeWidthPicker } from './StrokeWidthPicker';
import { ShapePicker } from './ShapePicker';
import { TextPicker } from './TextPicker';
import { useWhiteboardStore } from '../../store';
import { ToolType } from '../../types';

export const MainToolbar: React.FC = () => {
  const {
    toolSettings,
    history,
    setTool,
    updateToolSettings,
    undo,
    redo,
    setClearDialogOpen,
    setTeachingPanelOpen,
    setYouTubeDialogOpen,
    setPdfImportModalOpen,
  } = useWhiteboardStore();

  const [activePopover, setActivePopover] = useState<'none' | 'color' | 'width' | 'shape' | 'text' | 'media'>('none');
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopover('none');
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const togglePopover = (type: typeof activePopover) => {
    setActivePopover((prev) => (prev === type ? 'none' : type));
  };

  const handleSelectTool = (type: ToolType) => {
    setTool(type);
    if (type === 'shape') setActivePopover('shape');
    else if (type === 'text') setActivePopover('text');
    else setActivePopover('none');
  };

  const handleMediaInsert = (type: 'youtube' | 'image' | 'video' | 'audio' | 'pdf') => {
    setActivePopover('none');
    if (type === 'youtube') setYouTubeDialogOpen(true);
    else if (type === 'pdf') setPdfImportModalOpen(true);
    else {
      // Create a hidden input for basic file types
      const input = document.createElement('input');
      input.type = 'file';
      if (type === 'image') input.accept = 'image/*';
      if (type === 'video') input.accept = 'video/*';
      if (type === 'audio') input.accept = 'audio/*';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          alert(`File upload for ${type} is coming soon!`);
        }
      };
      input.click();
    }
  };

  const Divider = () => <div className="w-px h-8 bg-slate-700/50 mx-1 hidden sm:block" />;

  return (
    <div
      ref={toolbarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center select-none w-full max-w-[98vw] sm:max-w-max"
    >
      {/* Popovers */}
      <div className="mb-3 relative w-full flex justify-center">
        {activePopover === 'color' && (
          <ColorPalette
            selectedColor={toolSettings.color}
            onSelectColor={(color) => {
              updateToolSettings({ color, textColor: color });
              if (toolSettings.tool === 'eraser' || toolSettings.tool === 'pan') {
                setTool('pen');
              }
            }}
          />
        )}

        {activePopover === 'shape' && (
          <ShapePicker
            currentShape={toolSettings.shapeType || 'rectangle'}
            currentColor={toolSettings.color}
            fillColor={toolSettings.shapeFillColor || 'transparent'}
            strokeStyle={toolSettings.shapeStrokeStyle || 'solid'}
            strokeWidth={toolSettings.shapeStrokeWidth || 3}
            onSelectShape={(shapeType) => {
              updateToolSettings({ shapeType });
              if (toolSettings.tool !== 'shape') setTool('shape');
            }}
            onSelectStrokeColor={(color) => updateToolSettings({ color })}
            onSelectFillColor={(shapeFillColor) => updateToolSettings({ shapeFillColor })}
            onSelectStrokeStyle={(shapeStrokeStyle) => updateToolSettings({ shapeStrokeStyle })}
            onSelectStrokeWidth={(shapeStrokeWidth) => updateToolSettings({ shapeStrokeWidth })}
          />
        )}

        {activePopover === 'text' && (
          <TextPicker
            fontSize={toolSettings.textFontSize || 28}
            fontFamily={toolSettings.textFontFamily || 'Inter, sans-serif'}
            fontWeight={toolSettings.textFontWeight || 'normal'}
            fontStyle={toolSettings.textFontStyle || 'normal'}
            underline={toolSettings.textUnderline || false}
            textAlign={toolSettings.textAlign || 'left'}
            textColor={toolSettings.textColor || toolSettings.color || '#0f172a'}
            onChangeFontSize={(textFontSize) => updateToolSettings({ textFontSize })}
            onChangeFontFamily={(textFontFamily) => updateToolSettings({ textFontFamily })}
            onChangeFontWeight={(textFontWeight) => updateToolSettings({ textFontWeight })}
            onChangeFontStyle={(textFontStyle) => updateToolSettings({ textFontStyle })}
            onChangeUnderline={(textUnderline) => updateToolSettings({ textUnderline })}
            onChangeTextAlign={(textAlign) => updateToolSettings({ textAlign })}
            onChangeTextColor={(textColor) => updateToolSettings({ textColor, color: textColor })}
          />
        )}

        {activePopover === 'width' && (
          <StrokeWidthPicker
            tool={toolSettings.tool}
            penWidth={toolSettings.penWidth}
            markerWidth={toolSettings.markerWidth}
            eraserWidth={toolSettings.eraserWidth}
            eraserMode={toolSettings.eraserMode}
            currentColor={toolSettings.color}
            onChangeWidth={(width) => {
              if (toolSettings.tool === 'pen') updateToolSettings({ penWidth: width });
              else if (toolSettings.tool === 'marker') updateToolSettings({ markerWidth: width });
              else if (toolSettings.tool === 'eraser') updateToolSettings({ eraserWidth: width });
              else if (toolSettings.tool === 'shape') updateToolSettings({ shapeStrokeWidth: width });
            }}
            onChangeEraserMode={(eraserMode) => {
              updateToolSettings({ eraserMode });
              if (toolSettings.tool !== 'eraser') setTool('eraser');
            }}
          />
        )}

        {activePopover === 'media' && (
          <div className="flex bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-2 shadow-2xl animate-fade-in gap-2">
            <button onClick={() => handleMediaInsert('youtube')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300">
              <Video className="w-6 h-6 mb-1 text-red-500" />
              <span className="text-[10px] uppercase font-bold">YouTube</span>
            </button>
            <button onClick={() => handleMediaInsert('image')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300">
              <ImageIcon className="w-6 h-6 mb-1 text-indigo-400" />
              <span className="text-[10px] uppercase font-bold">Image</span>
            </button>
            <button onClick={() => handleMediaInsert('video')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300">
              <Video className="w-6 h-6 mb-1 text-sky-400" />
              <span className="text-[10px] uppercase font-bold">Video</span>
            </button>
            <button onClick={() => handleMediaInsert('audio')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300">
              <Music className="w-6 h-6 mb-1 text-amber-400" />
              <span className="text-[10px] uppercase font-bold">Audio</span>
            </button>
            <button onClick={() => handleMediaInsert('pdf')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300">
              <FileText className="w-6 h-6 mb-1 text-rose-400" />
              <span className="text-[10px] uppercase font-bold">PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Toolbar */}
      <div className="flex flex-row items-center gap-1 sm:gap-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl sm:rounded-full p-2 shadow-2xl overflow-x-auto custom-scrollbar w-full sm:w-auto h-20 sm:h-[72px]">
        
        {/* Navigation & Selection */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<MousePointer className="w-6 h-6" />}
            label="Select"
            isActive={toolSettings.tool === 'select'}
            onClick={() => handleSelectTool('select')}
          />
          <ToolButton
            icon={<Hand className="w-6 h-6" />}
            label="Pan"
            isActive={toolSettings.tool === 'pan'}
            onClick={() => handleSelectTool('pan')}
          />
        </div>

        <Divider />

        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            <ToolButton
              icon={<Pen className="w-6 h-6" />}
              label="Pen"
              isActive={toolSettings.tool === 'pen'}
              onClick={() => handleSelectTool('pen')}
            />
            {toolSettings.tool === 'pen' && (
              <button 
                onClick={() => togglePopover('width')}
                className="flex items-center justify-center w-6 h-10 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg z-10"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            )}
          </div>
          <div className="flex items-center">
            <ToolButton
              icon={<Highlighter className="w-6 h-6" />}
              label="Marker"
              isActive={toolSettings.tool === 'marker'}
              onClick={() => handleSelectTool('marker')}
            />
            {toolSettings.tool === 'marker' && (
              <button 
                onClick={() => togglePopover('width')}
                className="flex items-center justify-center w-6 h-10 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg z-10"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            )}
          </div>
          <div className="flex items-center">
            <ToolButton
              icon={<Eraser className="w-6 h-6" />}
              label="Eraser"
              isActive={toolSettings.tool === 'eraser'}
              onClick={() => handleSelectTool('eraser')}
            />
            {toolSettings.tool === 'eraser' && (
              <button 
                onClick={() => togglePopover('width')}
                className="flex items-center justify-center w-6 h-10 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg z-10"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            )}
          </div>
        </div>

        <Divider />

        {/* Objects & Media */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<Shapes className="w-6 h-6" />}
            label="Shapes"
            isActive={toolSettings.tool === 'shape'}
            onClick={() => handleSelectTool('shape')}
          />
          <ToolButton
            icon={<Type className="w-6 h-6" />}
            label="Text"
            isActive={toolSettings.tool === 'text'}
            onClick={() => handleSelectTool('text')}
          />
          <ToolButton
            icon={<ImageIcon className="w-6 h-6" />}
            label="Media"
            isActive={activePopover === 'media'}
            onClick={() => togglePopover('media')}
          />
        </div>

        <Divider />

        {/* Teaching Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTeachingPanelOpen(true)}
            className="group relative flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl transition-all bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400"
            title="Teaching Tools"
          >
            <GraduationCap className="w-7 h-7" />
          </button>
        </div>

        <Divider />

        {/* Properties */}
        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl transition-all hover:bg-slate-800"
            onClick={() => togglePopover('color')}
            title="Colour Palette"
          >
            <div 
              className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner"
              style={{ backgroundColor: toolSettings.color }}
            />
          </button>
          <ToolButton
            icon={<Sliders className="w-6 h-6" />}
            label="Properties"
            isActive={false}
            onClick={() => alert("Object Properties coming soon")}
          />
        </div>

        <Divider />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<Undo2 className="w-6 h-6" />}
            label="Undo"
            onClick={undo}
            isDisabled={!history.canUndo}
          />
          <ToolButton
            icon={<Redo2 className="w-6 h-6" />}
            label="Redo"
            onClick={redo}
            isDisabled={!history.canRedo}
          />
          <ToolButton
            icon={<Trash2 className="w-6 h-6" />}
            label="Clear"
            onClick={() => setClearDialogOpen(true)}
            className="text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
          />
        </div>
      </div>
    </div>
  );
};
