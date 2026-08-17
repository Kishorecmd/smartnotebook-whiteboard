import React from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Grid,
  Square,
  FileText,
  Edit2,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { CanvasBackgroundType, Page } from '../../types';

interface BackgroundPreset {
  name: string;
  color: string;
  type: CanvasBackgroundType;
  icon: React.ReactNode;
}

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { name: 'White', color: '#ffffff', type: 'plain', icon: <Square className="w-4 h-4 fill-white text-slate-400" /> },
  { name: 'Dark Slate', color: '#0f172a', type: 'plain', icon: <Square className="w-4 h-4 fill-slate-900 text-slate-700" /> },
  { name: 'Blackboard', color: '#064e3b', type: 'plain', icon: <Square className="w-4 h-4 fill-emerald-950 text-emerald-800" /> },
  { name: 'Grid Paper', color: '#f8fafc', type: 'grid', icon: <Grid className="w-4 h-4 text-blue-500" /> },
  { name: 'Dot Grid', color: '#f8fafc', type: 'dots', icon: <div className="w-4 h-4 flex items-center justify-center font-black text-xs text-blue-500">•</div> },
  { name: 'Lined Paper', color: '#f8fafc', type: 'lines', icon: <FileText className="w-4 h-4 text-blue-500" /> },
];

export const PageDrawer: React.FC = () => {
  const {
    document: doc,
    activePageIndex,
    isPageDrawerOpen,
    togglePageDrawer,
    setActivePageIndex,
    addPage,
    deletePage,
    duplicatePage,
    reorderPages,
    renamePage,
    updateActivePageBackground,
  } = useWhiteboardStore();

  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState<string>('');

  const handleRenameSubmit = (pageId: string) => {
    if (editingTitle.trim()) {
      renamePage(pageId, editingTitle.trim());
    }
    setEditingPageId(null);
  };

  if (!isPageDrawerOpen) return null;

  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  return (
    <aside
      aria-label="Pages Drawer"
      className="fixed top-14 left-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800/80 z-40 flex flex-col shadow-2xl animate-fade-in select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Pages ({doc.pages.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={togglePageDrawer}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Close Drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {doc.pages.map((page: Page, idx: number) => {
          const isActive = idx === activePageIndex;
          const strokeCount = page.objects.length;

          return (
            <div
              key={page.id}
              onClick={() => setActivePageIndex(idx)}
              className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-950/40 border-primary-500/80 ring-2 ring-primary-500/30'
                  : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`flex-shrink-0 w-12 h-10 rounded-lg overflow-hidden border-2 flex items-center justify-center relative ${
                      isActive ? 'border-primary-500' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: page.background }}
                    title="Page Thumbnail"
                  >
                    <span className={`absolute top-1 left-1 text-[8px] font-bold px-1 rounded-sm ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-slate-800/80 text-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                    {page.backgroundType === 'grid' && <Grid className="w-4 h-4 text-slate-400 opacity-50" />}
                    {page.backgroundType === 'lines' && <FileText className="w-4 h-4 text-slate-400 opacity-50" />}
                    {page.backgroundType === 'dots' && <span className="text-xs font-black text-slate-400 opacity-50">•</span>}
                  </div>
                  <div>
                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(page.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRenameSubmit(page.id);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingPageId(null);
                          }
                        }}
                        autoFocus
                        className="text-xs font-semibold bg-slate-800 text-white border border-primary-500 rounded px-1 py-0.5 w-[110px] outline-none focus:ring-2 focus:ring-primary-500/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                        {page.title}
                      </h3>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {strokeCount} {strokeCount === 1 ? 'object' : 'objects'}
                    </span>
                  </div>
                </div>

                {/* Page Action Buttons */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-wrap justify-end max-w-[80px]">
                  {/* Rename */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPageId(page.id);
                      setEditingTitle(page.title || `Page ${idx + 1}`);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                    title="Rename Page"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Reorder Up */}
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderPages(idx, idx - 1);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Reorder Down */}
                  {idx < doc.pages.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderPages(idx, idx + 1);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicatePage(page.id);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete (if > 1 page) */}
                  {doc.pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Background swatch preview indicator */}
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-600 inline-block"
                  style={{ backgroundColor: page.background }}
                />
                <span className="capitalize">{page.backgroundType} style</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Background Picker for Active Page */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Page Background
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {BACKGROUND_PRESETS.map((preset) => {
            const isSelected =
              activePage.background === preset.color &&
              activePage.backgroundType === preset.type;

            return (
              <button
                key={`${preset.name}-${preset.type}`}
                type="button"
                onClick={() => updateActivePageBackground(preset.color, preset.type)}
                className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-primary-600/30 border-primary-500 text-white shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {preset.icon}
                <span className="truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Page Footer Button */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900">
        <button
          type="button"
          onClick={() => addPage()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-primary-600/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Page</span>
        </button>
      </div>
    </aside>
  );
};
