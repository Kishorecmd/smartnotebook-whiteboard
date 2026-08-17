import React, { useEffect } from 'react';
import {
  WhiteboardCanvas,
  HeaderBar,
  BottomDock,
  ChildFriendlyToolbar,
  PageDrawer,
  ExportModal,
  SavedDocumentsModal,
  VersionHistoryModal,
  LibraryModal,
  KeyboardShortcutsModal,
  ClearConfirmModal,
  YouTubeDialog,
  WebAppDialog,
  HandwritingRecognitionModal,
  PdfImportModal,
  PresenterToolbar,
  PenNameToast,
  GlobalToast,
  InputSettingsModal,
  AssessmentModal,
  StudentResponseView,
} from './components';
import { TeachingToolsPanel, TeachingToolsOverlay, initializeTeachingTools } from './teaching-tools';
import { useWhiteboardStore } from './store';
import { StorageService } from './services';
import { ResponsiveLayoutManager } from './core/responsive';

const WhiteboardApp: React.FC = () => {
  const { setDocument, isDirty, isPresenterMode, setPresenterMode, childFriendlyMode, setResponsiveState, showToast } = useWhiteboardStore();

  useEffect(() => {
    initializeTeachingTools();
    
    // Initialize and subscribe to ResponsiveLayoutManager
    const manager = ResponsiveLayoutManager.getInstance();
    const unsubscribe = manager.subscribe((state) => {
      setResponsiveState(state);
    });
    
    return unsubscribe;
  }, [setResponsiveState]);

  // Restore autosaved session on startup if present
  useEffect(() => {
    const loadSession = async () => {
      try {
        const autosave = await StorageService.loadAutosave();
        if (autosave && autosave.pages && autosave.pages.length > 0) {
          setDocument(autosave);
        } else {
          const recovery = await StorageService.loadLatestRecoveryCheckpoint();
          if (recovery) {
            setDocument(recovery.document);
            showToast('Recovered the latest available checkpoint');
          } else {
            await StorageService.collectUnusedMedia();
          }
        }
      } catch (err) {
        console.warn('Could not restore autosave:', err);
      }
    };

    loadSession();
  }, [setDocument, showToast]);

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
              <BottomDock />
            )}
            <PenNameToast />
            <PageDrawer />
          </>
        ) : (
          <PresenterToolbar />
        )}

        {/* Modals & Dialogs */}
        <ExportModal />
        <SavedDocumentsModal />
        <VersionHistoryModal />
        <LibraryModal />
        <KeyboardShortcutsModal />
        <ClearConfirmModal />
        <YouTubeDialog />
        <WebAppDialog />
        <HandwritingRecognitionModal />
        <PdfImportModal />
        <InputSettingsModal />
        <AssessmentModal />
        <TeachingToolsPanel />
        <TeachingToolsOverlay />
        <GlobalToast />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const joinCode = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase();
  return joinCode ? <StudentResponseView code={joinCode} /> : <WhiteboardApp />;
};

export default App;
