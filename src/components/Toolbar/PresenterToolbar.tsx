import React from 'react';
import { useWhiteboardStore } from '../../store';
import { ToolButton } from './ToolButton';
import { 
  ChevronLeft, 
  ChevronRight, 
  PenTool, 
  Highlighter, 
  Eraser, 
  MousePointer2, 
  X,
  Target
} from 'lucide-react';

export const PresenterToolbar: React.FC = () => {
  const { 
    toolSettings, 
    setTool, 
    activePageIndex, 
    document, 
    setActivePageIndex,
    setPresenterMode
  } = useWhiteboardStore();

  const totalPages = document.pages.length;
  const canGoPrev = activePageIndex > 0;
  const canGoNext = activePageIndex < totalPages - 1;

  const handlePrevPage = () => {
    if (canGoPrev) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setActivePageIndex(activePageIndex + 1);
    }
  };

  const handleExitPresentation = () => {
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen().catch(err => {
        console.warn('Could not exit fullscreen:', err);
      });
    }
    setPresenterMode(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-slate-800/90 backdrop-blur-md border border-slate-700/50 p-2 rounded-2xl shadow-2xl z-50 pointer-events-auto transition-transform duration-300">
      
      {/* Navigation Controls */}
      <div className="flex items-center space-x-2 mr-6 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/30">
        <button 
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className={`p-2 rounded-lg transition-colors ${canGoPrev ? 'hover:bg-slate-700 text-white' : 'text-slate-600 cursor-not-allowed'}`}
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-slate-300 font-medium text-sm min-w-[70px] text-center select-none">
          {activePageIndex + 1} / {totalPages}
        </div>
        
        <button 
          onClick={handleNextPage}
          disabled={!canGoNext}
          className={`p-2 rounded-lg transition-colors ${canGoNext ? 'hover:bg-slate-700 text-white' : 'text-slate-600 cursor-not-allowed'}`}
          title="Next Page (Right Arrow)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Basic Tools */}
      <div className="flex items-center space-x-2 mr-6 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/30">
        <ToolButton
          icon={<MousePointer2 className="w-5 h-5" />}
          label="Select"
          isActive={toolSettings.tool === 'select'}
          onClick={() => setTool('select')}
        />
        <ToolButton
          icon={<Target className="w-5 h-5" />}
          label="Laser Pointer"
          isActive={toolSettings.tool === 'spotlight'}
          onClick={() => setTool('spotlight')}
        />
        <ToolButton
          icon={<PenTool className="w-5 h-5" />}
          label="Pen"
          isActive={toolSettings.tool === 'pen'}
          onClick={() => setTool('pen')}
        />
        <ToolButton
          icon={<Highlighter className="w-5 h-5" />}
          label="Marker"
          isActive={toolSettings.tool === 'marker'}
          onClick={() => setTool('marker')}
        />
        <ToolButton
          icon={<Eraser className="w-5 h-5" />}
          label="Eraser"
          isActive={toolSettings.tool === 'eraser'}
          onClick={() => setTool('eraser')}
        />
      </div>

      {/* Exit */}
      <button 
        onClick={handleExitPresentation}
        className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 p-3 rounded-xl transition-colors border border-red-500/20"
        title="Exit Presentation Mode (Esc)"
      >
        <X className="w-5 h-5" />
        <span className="text-sm font-semibold pr-1">Exit</span>
      </button>

    </div>
  );
};
