import React, { useState } from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  HelpCircle,
  Check,
  Edit2,
  Image as ImageIcon,
  Play,
  Smile
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { FileImportService, FileService } from '../../services';
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
    isChildFriendlyMode,
    setChildFriendlyMode,
  } = useWhiteboardStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      setDocumentTitle(titleInput.trim());
    } else {
      setTitleInput(doc.title);
    }
    setIsEditingTitle(false);
  };

  const handleSave = async () => {
    await saveCurrentDocument();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
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

    // We will place it at the center of the viewport
    const centerPoint: Point = engine.getTransformer().screenToWorld({
      x: engine.getCanvas().width / 2,
      y: engine.getCanvas().height / 2,
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const imgObj = await FileImportService.importImage(file, centerPoint);
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

    // Reset input
    e.target.value = '';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-slate-900/85 backdrop-blur-xl border-b border-slate-800/80 select-none shadow-md">
      {/* Left: Branding & Document Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <img src={Logo} alt="Jaihind International School" className="h-9 object-contain drop-shadow-md" />
        </div>

        {/* Document Title (Editable) */}
        <div className="flex items-center gap-2">
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
                className="px-2.5 py-1 text-sm font-medium bg-slate-800 text-white border border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800/70 transition-colors"
              title="Click to rename document"
            >
              <span>{doc.title}</span>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pr-2 py-1 flex-1 justify-end mask-fade-right">
        {/* Load JHW */}
        <button
          type="button"
          onClick={async () => {
            try {
              const doc = await FileService.importFromJHW();
              loadDocumentFromObject(doc);
            } catch (err) {
              console.error('Failed to load JHW:', err);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title="Load .JHW Document"
        >
          <FolderOpen className="w-4 h-4 text-purple-400" />
          <span className="hidden md:inline">Load</span>
        </button>

        {/* New Board */}
        <button
          type="button"
          onClick={newDocument}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title="Create New Whiteboard"
        >
          <FilePlus className="w-4 h-4 text-primary-400" />
          <span className="hidden md:inline">New</span>
        </button>

        {/* Open Saved Boards */}
        <button
          type="button"
          onClick={() => setSavedDocsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title="Open Saved Whiteboards"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Boards</span>
        </button>

        {/* Save Board */}
        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
            saveToast
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
          title="Save Whiteboard (IndexedDB)"
        >
          {saveToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4 text-blue-400" />}
          <span className="hidden md:inline">{saveToast ? 'Saved!' : 'Save'}</span>
        </button>

        {/* Export Board */}
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-md shadow-primary-600/20 transition-all active:scale-95"
          title="Export Image, SVG, PDF or .JHW"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Export</span>
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Import Media */}
        <label
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
          title="Import Image or PDF"
        >
          <ImageIcon className="w-4 h-4 text-pink-400" />
          <span className="hidden md:inline">Import</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleImportFile}
            className="hidden"
          />
        </label>

        {/* Child Friendly Mode Toggle */}
        <button
          type="button"
          onClick={() => setChildFriendlyMode(!isChildFriendlyMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
            isChildFriendlyMode
              ? 'bg-pink-600/30 text-pink-400 border border-pink-500/50'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Toggle Child-Friendly UI"
        >
          <Smile className="w-4 h-4" />
          <span className="hidden xl:inline">Kids Mode</span>
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Presentation Mode */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          title="Start Presentation (Fullscreen)"
        >
          <Play className="w-4 h-4" />
          <span className="hidden md:inline">Present</span>
        </button>

        {/* Keyboard Shortcuts Help */}
        <button
          type="button"
          onClick={() => setKeyboardShortcutsOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title="Keyboard Shortcuts"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
