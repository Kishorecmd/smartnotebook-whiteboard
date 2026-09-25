import React, { useState, useRef, useEffect } from 'react';
import {
  FilePlus,
  FolderOpen,
  Download,
  HelpCircle,
  Check,
  Edit2,
  Image as ImageIcon,
  Play,
  Smile,
  MoreVertical,
  Sparkles,
  Cloud,
  CloudUpload,
  RefreshCw,
  History,
  LibraryBig,
  Settings2,
  ClipboardCheck,
  LayoutDashboard,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { FileImportService, FileService } from '../../services';
import { visibleWorldBox } from '../../utils';
import { Point } from '../../types';


export const HeaderBar: React.FC = () => {
  const {
    document: doc,
    isDirty,
    setDocumentTitle,
    newDocument,
    saveCurrentDocument,
    loadDocumentFromObject,
    setExportModalOpen,
    setSavedDocsModalOpen,
    setVersionHistoryModalOpen,
    openLibrary,
    setKeyboardShortcutsOpen,
    setPresenterMode,
    setPdfImportModalOpen,
    engine,
    childFriendlyMode,
    setChildFriendlyMode,
  } = useWhiteboardStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDirty) setSaveStatus('unsaved');
    else setSaveStatus('saved');
  }, [isDirty]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      setDocumentTitle(titleInput.trim());
    } else {
      setTitleInput(doc.title);
    }
    setIsEditingTitle(false);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    await saveCurrentDocument();
    setSaveStatus('saved');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setPresenterMode(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setPresenterMode(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !engine) return;
    
    setIsMoreMenuOpen(false);

    const centerPoint: Point = engine.getTransformer().screenToWorld({
      x: engine.getCanvas().width / 2,
      y: engine.getCanvas().height / 2,
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const rect = engine.getCanvas().getBoundingClientRect();
          const imgObj = await FileImportService.importImageBlob(
            file,
            centerPoint,
            visibleWorldBox(engine.getTransformer().getTransform().zoom, rect.width, rect.height)
          );
          engine.addObject(imgObj);
        } catch (err) {
          console.error("Failed to import image", err);
        }
      } else if (file.type === 'application/pdf') {
        try {
          const images = await FileImportService.importPdfAsImages(file, centerPoint, 2.0);
          if (images.length > 0) {
            setPdfImportModalOpen(true, images);
          }
        } catch (err) {
          console.error("Failed to import PDF", err);
        }
      }
    }
    e.target.value = '';
  };

  const renderSaveStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-md text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Saving...</span>
        </div>
      );
    }
    if (saveStatus === 'unsaved') {
      return (
        <button type="button" aria-label="Save whiteboard locally" className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md text-xs text-amber-400 cursor-pointer hover:bg-amber-500/20" onClick={handleSave}>
          <CloudUpload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save changes</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-md text-xs text-emerald-400">
        <Cloud className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Saved</span>
      </div>
    );
  };

  // Build the actions dropdown menu
  const MoreMenu = () => (
    <div className="absolute top-full right-2 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 flex flex-col z-50 overflow-hidden">
      <button onClick={() => { setIsMoreMenuOpen(false); setExportModalOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <Download className="w-4 h-4 text-primary-400" /> Export Options
      </button>
      
      <button onClick={async () => {
        setIsMoreMenuOpen(false);
        try {
          const doc = await FileService.importFromJHW();
          loadDocumentFromObject(doc);
        } catch {}
      }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FolderOpen className="w-4 h-4 text-purple-400" /> Load .JHW
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); newDocument(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FilePlus className="w-4 h-4 text-primary-400" /> New Whiteboard
      </button>
      
      <button onClick={() => { setIsMoreMenuOpen(false); setSavedDocsModalOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FolderOpen className="w-4 h-4 text-amber-400" /> Saved Boards
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); toggleFullscreen(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <Play className="w-4 h-4 text-emerald-400" /> Present
      </button>

      <div className="h-px bg-slate-700/50 my-1 lg:hidden" />

      <label className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left cursor-pointer">
        <ImageIcon className="w-4 h-4 text-pink-400" /> Import Image/PDF
        <input type="file" accept="image/*,application/pdf" multiple onChange={handleImportFile} className="hidden" />
      </label>

      <button onClick={() => { setIsMoreMenuOpen(false); setChildFriendlyMode(!childFriendlyMode); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <Smile className="w-4 h-4 text-yellow-400" /> Kids Mode {childFriendlyMode ? '(On)' : '(Off)'}
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); setVersionHistoryModalOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <History className="w-4 h-4 text-cyan-400" /> Version History
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); openLibrary(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <LibraryBig className="w-4 h-4 text-violet-400" /> Lesson Library
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); window.dispatchEvent(new Event('jhw-open-assessments')); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <ClipboardCheck className="w-4 h-4 text-sky-400" /> Polls & Quizzes
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); window.dispatchEvent(new Event('jhw-open-input-settings')); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <Settings2 className="w-4 h-4 text-emerald-400" /> Input & Gestures
      </button>

      <div className="h-px bg-slate-700/50 my-1" />

      <button onClick={() => { setIsMoreMenuOpen(false); setKeyboardShortcutsOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <HelpCircle className="w-4 h-4 text-slate-400" /> Help & Shortcuts
      </button>
    </div>
  );

  return (
    <header className="wb-header wb-ui">
      <button className="wb-brand" aria-label="Open classroom screen" title="Back to your classroom screens" onClick={() => window.dispatchEvent(new Event('jhw-open-classroom'))}>
        <span className="wb-brand-mark"><Sparkles size={21} /></span>
        <span className="wb-brand-name">Smartnotebook<small>THE WHITEBOARD</small></span>
      </button>
      <div className="wb-document">
        {isEditingTitle ? <div className="wb-title-edit">
          <input aria-label="Whiteboard title" value={titleInput} autoFocus maxLength={100} onChange={e => setTitleInput(e.target.value)} onBlur={handleSaveTitle} onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }} />
          <button aria-label="Confirm whiteboard title" onClick={handleSaveTitle}><Check size={16} /></button>
        </div> : <button className="wb-document-name" title="Rename document" onClick={() => { setTitleInput(doc.title); setIsEditingTitle(true); }}><span>{doc.title}</span><Edit2 size={12} /></button>}
        <div className="wb-save-status">{renderSaveStatus()}</div>
      </div>
      <div className="wb-header-actions">
        <button className="wb-header-button wb-classroom-link" onClick={() => window.dispatchEvent(new Event('jhw-open-classroom'))}><LayoutDashboard size={16} /><span>Classroom</span></button>
        <button className="wb-header-button wb-boards-link" onClick={() => setSavedDocsModalOpen(true)}><FolderOpen size={16} /><span>My boards</span></button>
        <button className="wb-header-button wb-export-link" onClick={() => setExportModalOpen(true)}><Download size={16} /><span>Export</span></button>
        <button className="wb-present-button" aria-label="Present" onClick={toggleFullscreen}><Play size={15} /><span>Present</span></button>
        <div className="relative" ref={moreMenuRef}>
          <button className="wb-more-button" aria-label="Open more actions" title="Board options" aria-expanded={isMoreMenuOpen} onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}><MoreVertical size={20} /></button>
          {isMoreMenuOpen && <MoreMenu />}
        </div>
      </div>
    </header>
  );
};
