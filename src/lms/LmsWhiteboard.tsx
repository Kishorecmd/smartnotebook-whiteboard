import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eraser, FolderOpen, Hand, Highlighter, LibraryBig, Loader2, LogOut, PenTool, Play, RotateCcw, Sparkles, Target, UploadCloud } from 'lucide-react';
import { lessonIdFromLocation, lessonMessage, lmsBoard, saveLessonBoard } from './classroomLessons';
import {
  WhiteboardCanvas,
  BottomDock,
  PageDrawer,
  ExportModal,
  SavedDocumentsModal,
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
  ToolButton,
} from '../components';
import { TeachingToolsPanel, TeachingToolsOverlay, initializeTeachingTools } from '../teaching-tools';
import { useWhiteboardStore } from '../store';
import { FileService } from '../services';
import { createDefaultDocument } from '../models';
import { ResponsiveLayoutManager } from '../core/responsive';
import { listenToLms, postToLms, type LmsMode } from './bridge';
import '../whiteboard.css';

type LoadState = { status: 'waiting' } | { status: 'ready' } | { status: 'error'; message: string };
type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'saved' } | { status: 'error'; message: string };
/** Lesson mode asks before saving (students see it), before leaving with unsaved notes, and on a version conflict. */
type Ask = null | 'save' | 'leave' | 'conflict';

const ViewerToolbar: React.FC<{ onReset: () => void; onPageChange: () => void }> = ({ onReset, onPageChange }) => {
  const { toolSettings, setTool, activePageIndex, document, setActivePageIndex } = useWhiteboardStore();
  const total = document.pages.length;
  const goTo = (index: number) => { setActivePageIndex(index); onPageChange(); };
  return (
    <div className="lms-viewer-toolbar wb-ui" role="toolbar" aria-label="Lesson whiteboard">
      <div className="lms-viewer-group">
        <button type="button" aria-label="Previous page" disabled={activePageIndex === 0} onClick={() => goTo(activePageIndex - 1)}><ChevronLeft size={20} /></button>
        <span aria-live="polite">{activePageIndex + 1} / {total}</span>
        <button type="button" aria-label="Next page" disabled={activePageIndex >= total - 1} onClick={() => goTo(activePageIndex + 1)}><ChevronRight size={20} /></button>
      </div>
      <div className="lms-viewer-group">
        <ToolButton icon={<Hand className="w-5 h-5" />} label="Move" isActive={toolSettings.tool === 'pan'} onClick={() => setTool('pan')} />
        <ToolButton icon={<Target className="w-5 h-5" />} label="Pointer" isActive={toolSettings.tool === 'spotlight'} onClick={() => setTool('spotlight')} />
        <ToolButton icon={<PenTool className="w-5 h-5" />} label="Pen" isActive={toolSettings.tool === 'pen'} onClick={() => setTool('pen')} />
        <ToolButton icon={<Highlighter className="w-5 h-5" />} label="Marker" isActive={toolSettings.tool === 'marker'} onClick={() => setTool('marker')} />
        <ToolButton icon={<Eraser className="w-5 h-5" />} label="Eraser" isActive={toolSettings.tool === 'eraser'} onClick={() => setTool('eraser')} />
      </div>
      <button type="button" className="lms-viewer-reset" onClick={onReset} title="Remove your notes and show the lesson as the teacher made it"><RotateCcw size={16} /><span>Reset</span></button>
    </div>
  );
};

const LmsWhiteboard: React.FC<{ mode: LmsMode }> = ({ mode }) => {
  const { document: doc, isDirty, isPresenterMode, setPresenterMode, setResponsiveState, setSavedDocsModalOpen, openLibrary } = useWhiteboardStore();
  const [load, setLoad] = useState<LoadState>({ status: 'waiting' });
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const [title, setTitle] = useState('');
  // Bumped whenever the student view should fit the page to the screen.
  const [fitRequest, setFitRequest] = useState(0);
  const original = useRef<{ title: string; package: string | null } | null>(null);
  const pendingSave = useRef<string | null>(null);
  // Lesson mode: the LMS board version this copy was opened at, sent back with Save to lesson.
  const version = useRef(0);
  const [ask, setAsk] = useState<Ask>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  const open = useCallback(async (lessonTitle: string, pkg: string | null) => {
    try {
      const board = pkg ? await FileService.fromPortableJSON(pkg) : createDefaultDocument(lessonTitle || 'Lesson whiteboard');
      useWhiteboardStore.getState().setDocument({ ...board, activePageIndex: 0 });
      if (mode === 'view') {
        useWhiteboardStore.getState().setTool('pan');
        setFitRequest((count) => count + 1);
      }
      setLoad({ status: 'ready' });
    } catch (error) {
      setLoad({ status: 'error', message: error instanceof Error ? error.message : 'This whiteboard could not be opened.' });
    }
  }, [mode]);

  const fetchLesson = useCallback(async () => {
    const id = lessonIdFromLocation();
    setLoad({ status: 'waiting' });
    if (!id) { setLoad({ status: 'error', message: 'This lesson link is not complete. Open the lesson again from Lessons.' }); return; }
    try {
      const board = await lmsBoard(id);
      if (!board.package) { setLoad({ status: 'error', message: 'This lesson has no whiteboard yet. Create it in the LMS first.' }); return; }
      version.current = board.version;
      original.current = { title: board.lesson.title, package: board.package };
      setTitle(board.lesson.title);
      setSave({ status: 'idle' });
      setSavedVersion(null);
      await open(board.lesson.title, board.package);
      useWhiteboardStore.setState({ isDirty: false });
    } catch (error) {
      setLoad({ status: 'error', message: lessonMessage(error instanceof Error ? error.message : '') });
    }
  }, [open]);

  useEffect(() => {
    if (mode !== 'lesson') return;
    initializeTeachingTools();
    const unsubscribe = ResponsiveLayoutManager.getInstance().subscribe(setResponsiveState);
    void fetchLesson();
    return unsubscribe;
  }, [mode, fetchLesson, setResponsiveState]);

  useEffect(() => {
    if (mode !== 'lesson' || !isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [mode, isDirty]);

  useEffect(() => {
    if (mode === 'lesson') return;
    initializeTeachingTools();
    const unsubscribe = ResponsiveLayoutManager.getInstance().subscribe(setResponsiveState);
    const stopListening = listenToLms((message) => {
      if (message.type === 'load') {
        original.current = { title: message.title, package: message.package };
        setTitle(message.title);
        void open(message.title, message.package);
      } else if (message.requestId === pendingSave.current) {
        pendingSave.current = null;
        if (message.ok) {
          useWhiteboardStore.setState({ isDirty: false });
          setSave({ status: 'saved' });
        } else {
          setSave({ status: 'error', message: message.message || 'The LMS did not save the whiteboard.' });
        }
      }
    });
    postToLms({ type: 'ready', mode });
    return () => { unsubscribe(); stopListening(); };
  }, [mode, open, setResponsiveState]);

  useEffect(() => {
    if (mode === 'edit') postToLms({ type: 'dirty', dirty: isDirty });
    if (isDirty) setSave((current) => current.status === 'saved' ? { status: 'idle' } : current);
  }, [isDirty, mode]);

  useEffect(() => {
    if (mode !== 'view' || load.status !== 'ready' || fitRequest === 0) return;
    // A board drawn on a classroom screen must still fit a phone; wait for the canvas to size itself.
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => useWhiteboardStore.getState().zoomToFit()));
    return () => cancelAnimationFrame(frame);
  }, [fitRequest, load.status, mode]);

  useEffect(() => {
    const onFullscreenChange = () => { if (!document.fullscreenElement) setPresenterMode(false); };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [setPresenterMode]);

  const saveToLms = async () => {
    if (save.status === 'saving') return;
    setSave({ status: 'saving' });
    try {
      const state = useWhiteboardStore.getState();
      const board = { ...state.document, title: title || state.document.title, activePageIndex: state.activePageIndex, updatedAt: Date.now() };
      const requestId = crypto.randomUUID();
      pendingSave.current = requestId;
      postToLms({ type: 'save', requestId, package: await FileService.toPortableJSON(board), pages: board.pages.length });
    } catch (error) {
      pendingSave.current = null;
      setSave({ status: 'error', message: error instanceof Error ? error.message : 'The whiteboard could not be packaged.' });
    }
  };

  /** Save to lesson: replaces the LMS board that students see, if nobody saved since it was opened. */
  const saveToLesson = async () => {
    const id = lessonIdFromLocation();
    if (!id || save.status === 'saving') return;
    setAsk(null);
    setSave({ status: 'saving' });
    try {
      const state = useWhiteboardStore.getState();
      const board = { ...state.document, title: title || state.document.title, activePageIndex: state.activePageIndex, updatedAt: Date.now() };
      const result = await saveLessonBoard(id, await FileService.toPortableJSON(board), version.current);
      version.current = result.version;
      useWhiteboardStore.setState({ isDirty: false });
      setSavedVersion(result.version);
      setSave({ status: 'saved' });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'LMS_VERSION_CONFLICT') { setSave({ status: 'idle' }); setAsk('conflict'); return; }
      setSave({ status: 'error', message: code.startsWith('LMS_') || code === 'SIGN_IN_REQUIRED' ? lessonMessage(code) : 'The board could not be saved. Try again.' });
    }
  };

  const backToClassroom = () => {
    useWhiteboardStore.setState({ isDirty: false });
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    window.location.replace('/');
  };
  const endLesson = () => { if (useWhiteboardStore.getState().isDirty) setAsk('leave'); else backToClassroom(); };

  const present = () => {
    setPresenterMode(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  if (window.parent === window && mode !== 'lesson') {
    return <div className="lms-message"><Sparkles size={28} /><h1>Open this lesson from Jaihind LMS</h1><p>Lesson whiteboards are shown inside lms.jaihind.school after you sign in.</p></div>;
  }
  if (load.status !== 'ready') {
    return <div className="lms-message" role={load.status === 'error' ? 'alert' : 'status'}>
      {load.status === 'waiting' ? <><Loader2 className="animate-spin" size={28} /><p>Opening the lesson whiteboard…</p></> : <><h1>This whiteboard could not be opened</h1><p>{load.message}</p>
        {mode === 'lesson' && <div className="lms-message-actions"><button onClick={() => void fetchLesson()}><RotateCcw size={16} />Try again</button><button onClick={backToClassroom}><LogOut size={16} />Back to the classroom</button></div>}</>}
    </div>;
  }

  const saveLabel = save.status === 'saving' ? 'Saving…'
    : save.status === 'error' ? save.message
    : isDirty ? 'Unsaved changes'
    : save.status === 'saved' ? 'Saved to LMS' : 'Up to date';

  return (
    <div className={`wb-workspace lms-whiteboard lms-${mode} relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none touch-none`}>
      {mode === 'teach' && !isPresenterMode && <header className="wb-header wb-ui lms-teach-header">
        <span className="wb-brand" aria-hidden="true">
          <span className="wb-brand-mark"><Sparkles size={21} /></span>
          <span className="wb-brand-name">Smartnotebook<small>TEACHING</small></span>
        </span>
        <div className="wb-document">
          <span className="wb-document-name"><span>{title || doc.title}</span></span>
          <div className="wb-save-status" role="status">Your notes stay on this screen and do not change the lesson</div>
        </div>
        <div className="wb-header-actions">
          <button className="wb-header-button" onClick={() => openLibrary()}><LibraryBig size={16} /><span>Library</span></button>
          <button className="wb-header-button" onClick={present}><Play size={15} /><span>Present</span></button>
          <button className="wb-present-button" onClick={() => postToLms({ type: 'exit' })}><LogOut size={15} /><span>End lesson</span></button>
        </div>
      </header>}
      {mode === 'lesson' && !isPresenterMode && <header className="wb-header wb-ui lms-teach-header">
        <span className="wb-brand" aria-hidden="true">
          <span className="wb-brand-mark"><Sparkles size={21} /></span>
          <span className="wb-brand-name">Smartnotebook<small>TEACHING</small></span>
        </span>
        <div className="wb-document">
          <span className="wb-document-name"><span>{title || doc.title}</span></span>
          <div className={`wb-save-status lms-save-status lms-save-${save.status}`} role="status">{
            save.status === 'saving' ? 'Saving to the lesson…'
            : save.status === 'error' ? save.message
            : isDirty ? 'Your notes do not change the lesson until you save'
            : save.status === 'saved' ? `Saved · version ${savedVersion}`
            : 'Lesson board from Jaihind LMS'}</div>
        </div>
        <div className="wb-header-actions">
          <button className="wb-header-button" onClick={() => openLibrary()}><LibraryBig size={16} /><span>Library</span></button>
          <button className="wb-header-button" onClick={present}><Play size={15} /><span>Present</span></button>
          <button className="wb-header-button" disabled={save.status === 'saving' || !isDirty} onClick={() => setAsk('save')}>
            {save.status === 'saving' ? <Loader2 className="animate-spin" size={15} /> : <UploadCloud size={15} />}<span>Save to lesson</span>
          </button>
          <button className="wb-present-button" onClick={endLesson}><LogOut size={15} /><span>End lesson</span></button>
        </div>
      </header>}
      {ask && <div className="lms-ask-shade"><div className="lms-ask" role="alertdialog" aria-modal="true" aria-labelledby="lms-ask-title">
        {ask === 'save' && <><h2 id="lms-ask-title">Save your changes to the lesson?</h2><p>Students will see this version of the board in the LMS.</p>
          <div><button onClick={() => setAsk(null)}>Cancel</button><button className="lms-ask-primary" onClick={() => void saveToLesson()}>Save to lesson</button></div></>}
        {ask === 'leave' && <><h2 id="lms-ask-title">End the lesson?</h2><p>Your changes are not saved to the lesson.</p>
          <div><button onClick={() => setAsk(null)}>Keep teaching</button><button onClick={backToClassroom}>Discard changes</button><button className="lms-ask-primary" onClick={() => setAsk('save')}>Save to lesson…</button></div></>}
        {ask === 'conflict' && <><h2 id="lms-ask-title">Someone else saved this lesson</h2><p>The lesson board changed after you opened it, so your version was not saved. Load the newer board (your changes here are lost), or keep teaching with yours.</p>
          <div><button onClick={() => setAsk(null)}>Keep my board</button><button className="lms-ask-primary" onClick={() => { setAsk(null); void fetchLesson(); }}>Load the newer board</button></div></>}
      </div></div>}
      {mode === 'edit' && !isPresenterMode && <header className="wb-header wb-ui">
        <span className="wb-brand" aria-hidden="true">
          <span className="wb-brand-mark"><Sparkles size={21} /></span>
          <span className="wb-brand-name">Smartnotebook<small>LMS LESSON</small></span>
        </span>
        <div className="wb-document">
          <span className="wb-document-name"><span>{title || doc.title}</span></span>
          <div className={`wb-save-status lms-save-status lms-save-${save.status}`} role="status">{saveLabel}</div>
        </div>
        <div className="wb-header-actions">
          <button className="wb-header-button" title="Use one of your saved boards for this lesson" onClick={() => setSavedDocsModalOpen(true)}><FolderOpen size={16} /><span>My boards</span></button>
          <button className="wb-header-button" onClick={() => openLibrary()}><LibraryBig size={16} /><span>Library</span></button>
          <button className="wb-header-button" onClick={present}><Play size={15} /><span>Preview</span></button>
          <button className="wb-present-button lms-save-button" disabled={save.status === 'saving'} onClick={saveToLms}>
            {save.status === 'saving' ? <Loader2 className="animate-spin" size={15} /> : <UploadCloud size={15} />}<span>Save to LMS</span>
          </button>
        </div>
      </header>}

      <main className={`relative flex-1 w-full h-full ${mode !== 'view' && !isPresenterMode ? 'wb-canvas-shell' : ''}`}>
        <WhiteboardCanvas />
        {mode === 'view' && <ViewerToolbar onReset={() => original.current && void open(original.current.title, original.current.package)} onPageChange={() => setFitRequest((count) => count + 1)} />}
        {mode !== 'view' && (isPresenterMode ? <PresenterToolbar /> : <><BottomDock /><PenNameToast /><PageDrawer /></>)}

        {mode !== 'view' && <>
          <ExportModal />
          <SavedDocumentsModal />
          <LibraryModal />
          <KeyboardShortcutsModal />
          <ClearConfirmModal />
          <YouTubeDialog />
          <WebAppDialog />
          <HandwritingRecognitionModal />
          <PdfImportModal />
        </>}
        <TeachingToolsPanel />
        <TeachingToolsOverlay />
        <GlobalToast />
      </main>
    </div>
  );
};

export default LmsWhiteboard;
