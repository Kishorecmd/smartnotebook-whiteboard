import React, { useEffect } from 'react';
import {
  WhiteboardCanvas,
  HeaderBar,
  MainToolbar,
  ChildFriendlyToolbar,
  PageNavigationFooter,
  ZoomControls,
  PageDrawer,
  ExportModal,
  SavedDocumentsModal,
  KeyboardShortcutsModal,
  ClearConfirmModal,
  YouTubeDialog,
  HandwritingRecognitionModal,
  PdfImportModal,
  PresenterToolbar,
  PenNameToast,
} from './components';
import { TeachingToolsPanel, TeachingToolsOverlay, initializeTeachingTools } from './teaching-tools';
import { useWhiteboardStore } from './store';
import { StorageService } from './services';

export const App: React.FC = () => {
  const { setDocument, isDirty, isPresenterMode, setPresenterMode, childFriendlyMode } = useWhiteboardStore();

  useEffect(() => {
    initializeTeachingTools();
  }, []);

  // Restore autosaved session on startup if present
  useEffect(() => {
    const loadSession = async () => {
      try {
        const autosave = await StorageService.loadAutosave();
        if (autosave && autosave.pages && autosave.pages.length > 0) {
          setDocument(autosave);
        }
      } catch (err) {
        console.warn('Could not restore autosave:', err);
      }
    };

    loadSession();
  }, [setDocument]);

  // Protect against accidental tab closure with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle exiting fullscreen via ESC key or other browser means
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setPresenterMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setPresenterMode]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none touch-none">
      {/* Top Application Header */}
      {!isPresenterMode && <HeaderBar />}

      {/* Main Canvas Workspace */}
      <main className={`relative flex-1 w-full h-full ${!isPresenterMode ? 'pt-14' : ''}`}>
        <WhiteboardCanvas />

        {/* Floating Controls Layer */}
        {!isPresenterMode ? (
          <>
            {childFriendlyMode ? (
              <div className="absolute top-1/2 left-4 -translate-y-1/2 z-40">
                <ChildFriendlyToolbar />
              </div>
            ) : (
              <MainToolbar />
            )}
            <PenNameToast />
            <PageNavigationFooter />
            <ZoomControls />
            <PageDrawer />
          </>
        ) : (
          <PresenterToolbar />
        )}

        {/* Modals & Dialogs */}
        <ExportModal />
        <SavedDocumentsModal />
        <KeyboardShortcutsModal />
        <ClearConfirmModal />
        <YouTubeDialog />
        <HandwritingRecognitionModal />
        <PdfImportModal />
        <TeachingToolsPanel />
        <TeachingToolsOverlay />
      </main>
    </div>
  );
};

export default App;
