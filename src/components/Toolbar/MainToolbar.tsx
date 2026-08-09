import React, { useState, useRef, useEffect } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Hand,
  MousePointer,
  Shapes,
  Type,
  Palette,
  Sliders,
  Undo2,
  Redo2,
  Trash2,
  Presentation,
  Sparkles,
  PlaySquare,
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
  } = useWhiteboardStore();

  const [activePopover, setActivePopover] = useState<'none' | 'color' | 'width' | 'shape' | 'text'>('none');
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopover('none');
      }
    };

    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const togglePopover = (type: 'color' | 'width' | 'shape' | 'text') => {
    setActivePopover((prev) => (prev === type ? 'none' : type));
  };

  const handleSelectTool = (type: ToolType) => {
    setTool(type);
    if (type === 'shape') {
      setActivePopover('shape');
    } else if (type === 'text') {
      setActivePopover('text');
    } else {
      setActivePopover('none');
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center select-none"
    >
      {/* Popovers */}
      <div className="mb-3">
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
              if (toolSettings.tool === 'pen') {
                updateToolSettings({ penWidth: width });
              } else if (toolSettings.tool === 'marker') {
                updateToolSettings({ markerWidth: width });
              } else if (toolSettings.tool === 'eraser') {
                updateToolSettings({ eraserWidth: width });
              } else if (toolSettings.tool === 'shape') {
                updateToolSettings({ shapeStrokeWidth: width });
              }
            }}
            onChangeEraserMode={(eraserMode) => {
              updateToolSettings({ eraserMode });
            }}
          />
        )}
      </div>

      {/* Main Glass Floating Bar */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl ring-1 ring-white/10">
        {/* Select & Transform Tool */}
        <ToolButton
          icon={<MousePointer className="w-5 h-5" />}
          label="Select / Move / Resize (V or S)"
          isActive={toolSettings.tool === 'select'}
          onClick={() => handleSelectTool('select')}
        />

        <ToolButton
          icon={<Pen className="w-5 h-5" />}
          label="Pen (P)"
          isActive={toolSettings.tool === 'pen'}
          onClick={() => handleSelectTool('pen')}
        />

        {/* Magic Pen Tool */}
        <ToolButton
          icon={<Sparkles className="w-5 h-5" />}
          label="Magic Pen (Vanishes after writing)"
          isActive={toolSettings.tool === 'magic_pen'}
          onClick={() => handleSelectTool('magic_pen')}
        />

        {/* Marker / Highlighter Tool */}
        <ToolButton
          icon={<Highlighter className="w-5 h-5" />}
          label="Highlighter (M)"
          isActive={toolSettings.tool === 'marker'}
          onClick={() => handleSelectTool('marker')}
        />

        {/* Text Tool */}
        <ToolButton
          icon={<Type className="w-5 h-5" />}
          label="Text Note / Annotation (T)"
          isActive={toolSettings.tool === 'text'}
          onClick={() => handleSelectTool('text')}
        />

        {/* Shapes Tool */}
        <ToolButton
          icon={<Shapes className="w-5 h-5" />}
          label="Shapes (U)"
          isActive={toolSettings.tool === 'shape'}
          onClick={() => handleSelectTool('shape')}
        />

        {/* Eraser Tool */}
        <ToolButton
          icon={<Eraser className="w-5 h-5" />}
          label="Eraser (E)"
          isActive={toolSettings.tool === 'eraser'}
          onClick={() => handleSelectTool('eraser')}
        />

        <div className="w-px h-8 bg-slate-700/50 mx-1" />

        <ToolButton
          icon={<Presentation />}
          label="Teaching Tools"
          isActive={false}
          onClick={() => {
            setActivePopover('none');
            setTeachingPanelOpen(true);
          }}
        />

        <ToolButton
          icon={<PlaySquare className="text-red-500" />}
          label="Insert YouTube Video"
          isActive={false}
          onClick={() => {
            setActivePopover('none');
            setYouTubeDialogOpen(true);
          }}
        />

        <div className="w-px h-8 bg-slate-700/50 mx-1" />

        {/* Pan Hand Tool */}
        <ToolButton
          icon={<Hand className="w-5 h-5" />}
          label="Pan / Move Canvas (H or Space)"
          isActive={toolSettings.tool === 'pan'}
          onClick={() => handleSelectTool('pan')}
        />

        {/* Separator */}
        <div className="w-[1px] h-7 bg-slate-700/60 mx-1" />

        {/* Color Palette Button */}
        <button
          type="button"
          onClick={() => togglePopover('color')}
          title="Color Palette"
          aria-label="Color Palette"
          className={`relative p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center ${
            activePopover === 'color'
              ? 'bg-slate-800 ring-2 ring-primary-500'
              : 'hover:bg-slate-800/70 text-slate-300'
          }`}
        >
          <div className="relative">
            <Palette className="w-5 h-5" />
            <span
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-slate-900 shadow-sm"
              style={{ backgroundColor: toolSettings.textColor || toolSettings.color }}
            />
          </div>
        </button>

        {/* Stroke / Text Options Button */}
        <button
          type="button"
          onClick={() => (toolSettings.tool === 'text' ? togglePopover('text') : togglePopover('width'))}
          title={toolSettings.tool === 'text' ? 'Text Styling' : 'Stroke Thickness'}
          aria-label={toolSettings.tool === 'text' ? 'Text Styling' : 'Stroke Thickness'}
          className={`p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center ${
            activePopover === 'width' || activePopover === 'text'
              ? 'bg-slate-800 ring-2 ring-primary-500'
              : 'hover:bg-slate-800/70 text-slate-300'
          }`}
        >
          {toolSettings.tool === 'text' ? <Type className="w-5 h-5 text-indigo-400" /> : <Sliders className="w-5 h-5" />}
        </button>

        {/* Separator */}
        <div className="w-[1px] h-7 bg-slate-700/60 mx-1" />

        {/* Undo */}
        <ToolButton
          icon={<Undo2 className="w-5 h-5" />}
          label="Undo (Ctrl+Z)"
          isDisabled={!history.canUndo}
          onClick={undo}
        />

        {/* Redo */}
        <ToolButton
          icon={<Redo2 className="w-5 h-5" />}
          label="Redo (Ctrl+Y)"
          isDisabled={!history.canRedo}
          onClick={redo}
        />

        {/* Clear Page */}
        <ToolButton
          icon={<Trash2 className="w-5 h-5" />}
          label="Clear Current Page"
          variant="danger"
          onClick={() => setClearDialogOpen(true)}
        />
      </div>
    </div>
  );
};
