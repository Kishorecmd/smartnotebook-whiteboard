import React from 'react';
import { X } from 'lucide-react';
import { ColorPalette } from './ColorPalette';
import { InsertMediaPanel } from './InsertMediaPanel';
import { MediaKind } from '../../media/MediaTypes';
import { StrokeWidthPicker } from './StrokeWidthPicker';
import { ShapePicker } from './ShapePicker';
import { TextPicker } from './TextPicker';
import { PenFamilyPicker } from './PenFamilyPicker';
import { PenContextBar } from './PenContextBar';
import { useWhiteboardStore } from '../../store';

export type PopoverType = 'none' | 'color' | 'width' | 'shape' | 'text' | 'media' | 'pens' | 'eraser';

interface ContextToolbarProps {
  activePopover: PopoverType;
  onClose: () => void;
  onMediaInsert: (kind: MediaKind) => void;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({ activePopover, onClose, onMediaInsert }) => {
  const { toolSettings, updateToolSettings, setTool } = useWhiteboardStore();

  if (activePopover === 'none') return null;

  return (
    <div 
      className="context-toolbar-popover scrollbar-none fixed left-1/2 z-40 animate-fade-in pointer-events-auto"
    >
      <button
        type="button"
        onClick={onClose}
        className="context-toolbar-close"
        aria-label="Close tool options"
        title="Close tool options"
      >
        <X className="h-5 w-5" />
      </button>
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

      {activePopover === 'pens' && (
        <div className="pen-tools-layout">
          <PenFamilyPicker />
          <PenContextBar />
        </div>
      )}

      {activePopover === 'eraser' && (
        <StrokeWidthPicker
          tool={'eraser'}
          penWidth={toolSettings.penWidth}
          markerWidth={toolSettings.markerWidth}
          eraserWidth={toolSettings.eraserWidth}
          eraserMode={toolSettings.eraserMode}
          currentColor={toolSettings.color}
          onChangeWidth={(width) => updateToolSettings({ eraserWidth: width })}
          onChangeEraserMode={(eraserMode) => {
            updateToolSettings({ eraserMode });
            if (toolSettings.tool !== 'eraser') setTool('eraser');
          }}
        />
      )}

      {activePopover === 'width' && toolSettings.tool === 'marker' && (
        <StrokeWidthPicker
          tool={'marker'}
          penWidth={toolSettings.penWidth}
          markerWidth={toolSettings.markerWidth}
          eraserWidth={toolSettings.eraserWidth}
          eraserMode={toolSettings.eraserMode}
          currentColor={toolSettings.color}
          onChangeWidth={(width) => updateToolSettings({ markerWidth: width })}
          onChangeEraserMode={() => {}}
        />
      )}

      {activePopover === 'media' && (
        <InsertMediaPanel onInsert={(kind) => onMediaInsert(kind)} />
      )}
    </div>
  );
};
