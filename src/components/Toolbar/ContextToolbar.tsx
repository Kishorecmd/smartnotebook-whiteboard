import React from 'react';
import { ColorPalette } from './ColorPalette';
import { StrokeWidthPicker } from './StrokeWidthPicker';
import { ShapePicker } from './ShapePicker';
import { TextPicker } from './TextPicker';
import { PenFamilyPicker } from './PenFamilyPicker';
import { PenContextBar } from './PenContextBar';
import { Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

export type PopoverType = 'none' | 'color' | 'width' | 'shape' | 'text' | 'media' | 'pens' | 'eraser';

interface ContextToolbarProps {
  activePopover: PopoverType;
  onClose: () => void;
  onMediaInsert: (type: 'youtube' | 'image' | 'video' | 'audio' | 'pdf') => void;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({ activePopover, onMediaInsert }) => {
  const { toolSettings, updateToolSettings, setTool } = useWhiteboardStore();

  if (activePopover === 'none') return null;

  return (
    <div className="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-40 animate-fade-in pointer-events-auto">
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
        <div className="flex flex-col items-center gap-2">
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
        <div className="flex bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-2 shadow-2xl gap-2">
          <button onClick={() => onMediaInsert('youtube')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors">
            <Video className="w-6 h-6 mb-1 text-red-500" />
            <span className="text-[10px] uppercase font-bold">YouTube</span>
          </button>
          <button onClick={() => onMediaInsert('image')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors">
            <ImageIcon className="w-6 h-6 mb-1 text-indigo-400" />
            <span className="text-[10px] uppercase font-bold">Image</span>
          </button>
          <button onClick={() => onMediaInsert('video')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors">
            <Video className="w-6 h-6 mb-1 text-sky-400" />
            <span className="text-[10px] uppercase font-bold">Video</span>
          </button>
          <button onClick={() => onMediaInsert('audio')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors">
            <Music className="w-6 h-6 mb-1 text-amber-400" />
            <span className="text-[10px] uppercase font-bold">Audio</span>
          </button>
          <button onClick={() => onMediaInsert('pdf')} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors">
            <FileText className="w-6 h-6 mb-1 text-rose-400" />
            <span className="text-[10px] uppercase font-bold">PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
