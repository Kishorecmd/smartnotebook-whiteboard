import React, { useState } from 'react';
import { MainToolbar } from './MainToolbar';
import { PageNavigationFooter } from '../Pages/PageNavigationFooter';
import { ZoomControls } from '../Zoom/ZoomControls';
import { useWhiteboardStore } from '../../store';
import { X } from 'lucide-react';

export const BottomDock: React.FC = () => {
  const { childFriendlyMode, isPresenterMode } = useWhiteboardStore();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  if (childFriendlyMode || isPresenterMode) {
    return null; // Handled separately in App.tsx
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col justify-end p-2 sm:p-4 lg:p-6 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] gap-4">
        {/* Container for bottom items */}
        <div className="flex justify-between items-end gap-2 w-full max-w-[100vw]">
          
          {/* Left Side: Pages */}
          <div className="pointer-events-auto shrink-0 hidden lg:block">
            <PageNavigationFooter />
          </div>

          {/* Center: Main Toolbar */}
          <div className="pointer-events-auto flex-1 flex justify-center w-full lg:w-auto relative">
            <MainToolbar />
            
            {/* Mobile "More" floating button if we want to trigger the bottom sheet from the dock area on small screens, 
                though typically it's integrated inside the toolbar or replaces it.
                For now, MainToolbar itself is responsive and scrollable. */}
          </div>

          {/* Right Side: Zoom Controls */}
          <div className="pointer-events-auto shrink-0 hidden lg:block">
            <ZoomControls />
          </div>

        </div>
      </div>
      
      {/* Mobile Bottom Sheet (Future integration point) */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setIsMobileSheetOpen(false)} />
          <div className="relative bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 shadow-2xl w-full h-[60vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Tools</h3>
              <button onClick={() => setIsMobileSheetOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Tool grid goes here in the next step */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
