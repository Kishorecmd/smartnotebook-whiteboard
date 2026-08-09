import React, { useEffect, useState } from 'react';
import {
  X,
  FolderOpen,
  Upload,
  Trash2,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { WhiteboardDocument } from '../../types';
import { StorageService, FileService } from '../../services';
import { useWhiteboardStore } from '../../store';

export const SavedDocumentsModal: React.FC = () => {
  const { isSavedDocsModalOpen, setSavedDocsModalOpen, setDocument } = useWhiteboardStore();
  const [documents, setDocuments] = useState<WhiteboardDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await StorageService.listDocuments();
      // Sort by newest updatedAt
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setDocuments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved boards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSavedDocsModalOpen) {
      fetchDocuments();
    }
  }, [isSavedDocsModalOpen]);

  if (!isSavedDocsModalOpen) return null;

  const handleOpenDoc = (doc: WhiteboardDocument) => {
    setDocument(doc);
    setSavedDocsModalOpen(false);
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await StorageService.deleteDocument(id);
    await fetchDocuments();
  };

  const handleImportFile = async () => {
    try {
      const imported = await FileService.importFromJHW();
      await StorageService.saveDocument(imported);
      setDocument(imported);
      setSavedDocsModalOpen(false);
    } catch (err: any) {
      if (err.message !== 'File selection cancelled') {
        alert(err.message || 'Import error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Saved Whiteboards</h2>
              <p className="text-xs text-slate-400">
                Browse boards stored locally on this device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSavedDocsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Import Button */}
          <button
            type="button"
            onClick={handleImportFile}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-slate-200 hover:text-white text-xs font-semibold transition-all active:scale-[0.99]"
          >
            <Upload className="w-4 h-4 text-primary-400" />
            <span>Import .jhw File from Computer</span>
          </button>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading saved whiteboards...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No saved whiteboards found yet. Click "Save" on the top header to save your work!
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleOpenDoc(d)}
                  className="group flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-2xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-700/60 text-slate-300 group-hover:bg-primary-600/30 group-hover:text-primary-300 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                        {d.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {d.pages.length} {d.pages.length === 1 ? 'page' : 'pages'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(d.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteDoc(d.id, e)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-950/40 opacity-60 group-hover:opacity-100 transition-all"
                    title="Delete Saved Board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
