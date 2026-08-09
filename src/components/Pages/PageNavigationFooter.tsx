import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Layers } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

export const PageNavigationFooter: React.FC = () => {
  const {
    document: doc,
    activePageIndex,
    setActivePageIndex,
    addPage,
    togglePageDrawer,
  } = useWhiteboardStore();

  const totalPages = doc.pages.length;
  const hasPrev = activePageIndex > 0;
  const hasNext = activePageIndex < totalPages - 1;

  return (
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl select-none ring-1 ring-white/10">
      {/* Pages Drawer Toggle */}
      <button
        type="button"
        onClick={togglePageDrawer}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all"
        title="Open Pages Drawer"
      >
        <Layers className="w-4 h-4 text-primary-400" />
        <span className="hidden sm:inline">Pages</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-500 text-white font-bold">
          {totalPages}
        </span>
      </button>

      <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />

      {/* Previous Page */}
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => setActivePageIndex(activePageIndex - 1)}
        className={`p-2 rounded-xl transition-colors ${
          hasPrev
            ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95'
            : 'text-slate-600 cursor-not-allowed'
        }`}
        title="Previous Page"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page indicator */}
      <span className="px-2 text-xs font-bold text-slate-300 font-mono">
        {activePageIndex + 1} / {totalPages}
      </span>

      {/* Next Page */}
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => setActivePageIndex(activePageIndex + 1)}
        className={`p-2 rounded-xl transition-colors ${
          hasNext
            ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95'
            : 'text-slate-600 cursor-not-allowed'
        }`}
        title="Next Page"
        aria-label="Next Page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Quick Add Page */}
      <button
        type="button"
        onClick={() => addPage()}
        className="p-2 text-primary-400 hover:text-white hover:bg-primary-600/30 rounded-xl transition-all active:scale-95"
        title="Add Blank Page"
        aria-label="Add Blank Page"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};
