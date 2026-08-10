import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

export const ZoomControls: React.FC = () => {
  const { viewport, zoomIn, zoomOut, resetZoom, zoomToFit } = useWhiteboardStore();
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="fixed top-[70px] right-2 lg:top-auto lg:bottom-6 lg:right-6 z-30 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl select-none ring-1 ring-white/10">
      {/* Zoom Out */}
      <button
        type="button"
        onClick={zoomOut}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
        title="Zoom Out (Ctrl -)"
        aria-label="Zoom Out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>

      {/* Zoom Percentage Label / Reset */}
      <button
        type="button"
        onClick={resetZoom}
        className="px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white font-mono hover:bg-slate-800 rounded-lg transition-colors"
        title="Click to Reset Zoom (100%)"
      >
        {zoomPercent}%
      </button>

      {/* Zoom In */}
      <button
        type="button"
        onClick={zoomIn}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
        title="Zoom In (Ctrl +)"
        aria-label="Zoom In"
      >
        <ZoomIn className="w-5 h-5" />
      </button>

      <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

      {/* Zoom to Fit */}
      <button
        type="button"
        onClick={zoomToFit}
        className="p-2 text-primary-400 hover:text-white hover:bg-primary-600/30 rounded-xl transition-all active:scale-95"
        title="Zoom to Fit All Content"
        aria-label="Zoom to Fit All Content"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};
