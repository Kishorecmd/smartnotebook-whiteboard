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
  Menu,
  Cloud,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { FileImportService, FileService } from '../../services';
import { visibleWorldBox } from '../../utils';
import { Point } from '../../types';
import Logo from '../../assets/logo.png';

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
          const imgObj = await FileImportService.importImage(
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
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md text-xs text-amber-400 cursor-pointer hover:bg-amber-500/20" onClick={handleSave}>
          <CloudUpload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Unsaved</span>
        </div>
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
      <button onClick={() => { setIsMoreMenuOpen(false); setExportModalOpen(true); }} className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <Download className="w-4 h-4 text-primary-400" /> Export Options
      </button>
      
      <button onClick={async () => {
        setIsMoreMenuOpen(false);
        try {
          const doc = await FileService.importFromJHW();
          loadDocumentFromObject(doc);
        } catch (err) {}
      }} className="lg:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FolderOpen className="w-4 h-4 text-purple-400" /> Load .JHW
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); newDocument(); }} className="lg:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FilePlus className="w-4 h-4 text-primary-400" /> New Whiteboard
      </button>
      
      <button onClick={() => { setIsMoreMenuOpen(false); setSavedDocsModalOpen(true); }} className="lg:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <FolderOpen className="w-4 h-4 text-amber-400" /> Saved Boards
      </button>

      <button onClick={() => { setIsMoreMenuOpen(false); toggleFullscreen(); }} className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
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

      <div className="h-px bg-slate-700/50 my-1" />

      <button onClick={() => { setIsMoreMenuOpen(false); setKeyboardShortcutsOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white transition-colors w-full text-left">
        <HelpCircle className="w-4 h-4 text-slate-400" /> Help & Shortcuts
      </button>
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2.5 bg-slate-900/85 backdrop-blur-xl border-b border-slate-800/80 select-none shadow-md h-12 sm:h-14">
      
      {/* Left Area (Mobile: Menu + Status, Tablet/Desktop: Logo + Name) */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 overflow-hidden">
        
        {/* Mobile Hamburger */}
        <button className="sm:hidden p-2 text-slate-400 hover:text-white" onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}>
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo (Hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-2">
          <img src={Logo} alt="Jaihind" className="h-8 object-contain drop-shadow-md" />
        </div>

        <div className="w-px h-6 bg-slate-700 hidden sm:block" />

        {/* Document Title (Editable) */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(doc.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-24 sm:w-48 px-2 py-1 text-sm font-medium bg-slate-800 text-white border border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 truncate"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInput(doc.title);
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800/70 transition-colors truncate max-w-[120px] sm:max-w-xs"
              title="Rename document"
            >
              <span className="truncate">{doc.title}</span>
              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Right Area Actions */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Status indicator always visible */}
        {renderSaveStatus()}

        <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

        {/* Primary Desktop Actions */}
        <div className="hidden lg:flex items-center gap-1">
          <button onClick={newDocument} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all">
            <FilePlus className="w-3.5 h-3.5 text-primary-400" /> New
          </button>
          
          <button onClick={() => setSavedDocsModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all">
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Boards
          </button>
        </div>

        {/* Export is primary on tablet and desktop */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-md transition-all active:scale-95 ml-1"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>

        {/* Present Mode always primary unless on mobile phone portrait */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all active:scale-95 ml-1"
        >
          <Play className="w-3.5 h-3.5" /> Present
        </button>

        {/* Mobile/Tablet More Dropdown */}
        <div className="relative" ref={moreMenuRef}>
          <button 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all" 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isMoreMenuOpen && <MoreMenu />}
        </div>
      </div>
    </header>
  );
};
