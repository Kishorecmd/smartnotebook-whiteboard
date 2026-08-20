import React from 'react';
import { MainToolbar } from './MainToolbar';
import { PageNavigationFooter } from '../Pages/PageNavigationFooter';
import { ZoomControls } from '../Zoom/ZoomControls';
import { useWhiteboardStore } from '../../store';

export const BottomDock: React.FC = () => {
  const { childFriendlyMode, isPresenterMode } = useWhiteboardStore();
  
  if (childFriendlyMode || isPresenterMode) {
    return null; // Handled separately in App.tsx
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col justify-end p-2 sm:p-4 lg:p-6 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] gap-2 sm:gap-4">
        {/* Only the narrowest screens lack room beside the toolbar. There the
            page and zoom controls take a row of their own rather than being
            dropped; anywhere wider they sit alongside, which keeps the dock
            short enough for a landscape phone. */}
        <div className="pointer-events-auto flex flex-wrap justify-center items-end gap-2 sm:hidden">
          <PageNavigationFooter />
          <ZoomControls />
        </div>

        {/* Container for bottom items */}
        <div className="flex justify-between items-end gap-2 w-full max-w-[100vw]">
          
          {/* Left Side: Pages */}
          <div className="pointer-events-auto shrink-0 hidden sm:block">
            <PageNavigationFooter />
          </div>

          {/* Center: Main Toolbar */}
          <div className="pointer-events-auto flex-1 flex justify-center w-full sm:w-auto relative">
            <MainToolbar />
            
          </div>

          {/* Right Side: Zoom Controls */}
          <div className="pointer-events-auto shrink-0 hidden sm:block">
            <ZoomControls />
          </div>

        </div>
      </div>
      
    </>
  );
};
