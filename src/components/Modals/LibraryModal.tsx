import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Box,
  FileStack,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  LessonTemplate,
  LessonTemplateCategory,
  ReusableContentItem,
} from '../../types';
import type { MediaAssetRecord } from '../../media/MediaTypes';
import { MediaManager } from '../../media/MediaManager';
import { LibraryService, StorageService } from '../../services';
import { useWhiteboardStore } from '../../store';

type LibraryTab = 'templates' | 'content' | 'assets';

const categoryLabels: Record<LessonTemplateCategory, string> = {
  general: 'General',
  language: 'Language',
  mathematics: 'Mathematics',
  science: 'Science',
  assessment: 'Assessment',
};

const parseTags = (value: string) => value.split(',').map((tag) => tag.trim()).filter(Boolean);
const searchable = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' ').toLowerCase();

export const LibraryModal: React.FC = () => {
  const {
    document,
    activePageIndex,
    selectedIds,
    engine,
    isLibraryModalOpen,
    libraryInitialTab,
    setLibraryModalOpen,
    startDocumentFromTemplate,
    showToast,
  } = useWhiteboardStore();
  const [tab, setTab] = useState<LibraryTab>('templates');
  const [query, setQuery] = useState('');
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [content, setContent] = useState<ReusableContentItem[]>([]);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateCandidate, setTemplateCandidate] = useState<LessonTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<LessonTemplateCategory>('general');
  const [templateTags, setTemplateTags] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [contentTags, setContentTags] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [savedTemplates, savedContent, savedAssets] = await Promise.all([
        StorageService.listLessonTemplates(),
        StorageService.listReusableContent(),
        MediaManager.listAssetsAsync(),
      ]);
      setTemplates([...LibraryService.getBuiltInTemplates(), ...savedTemplates]);
      setContent(savedContent);
      setAssets(savedAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The library could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLibraryModalOpen) return;
    setTab(libraryInitialTab);
    setQuery('');
    void refresh();
  }, [isLibraryModalOpen, libraryInitialTab, refresh]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((template) =>
      !needle || searchable([template.title, template.description, template.category, ...template.tags]).includes(needle)
    );
  }, [query, templates]);

  const filteredContent = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return content.filter((item) =>
      !needle || searchable([item.title, item.description, ...item.tags]).includes(needle)
    );
  }, [content, query]);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) =>
      !needle || searchable([asset.fileName, asset.kind, asset.mimeType]).includes(needle)
    );
  }, [assets, query]);

  if (!isLibraryModalOpen) return null;

  const saveTemplate = async () => {
    try {
      const template = LibraryService.createTemplateFromDocument(
        { ...document, activePageIndex },
        templateTitle,
        templateDescription,
        templateCategory,
        parseTags(templateTags)
      );
      await StorageService.saveLessonTemplate(template);
      setShowTemplateForm(false);
      setTemplateTitle('');
      setTemplateDescription('');
      setTemplateTags('');
      await refresh();
      showToast('Lesson template saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template could not be saved.');
    }
  };

  const applyTemplate = () => {
    if (!templateCandidate) return;
    startDocumentFromTemplate(LibraryService.createDocumentFromTemplate(templateCandidate));
    setTemplateCandidate(null);
    setLibraryModalOpen(false);
    showToast('Lesson template applied');
  };

  const saveSelectedContent = async () => {
    try {
      const page = document.pages[activePageIndex];
      const item = LibraryService.createReusableContent(
        contentTitle,
        contentDescription,
        parseTags(contentTags),
        selectedIds,
        page.objects
      );
      await StorageService.saveReusableContent(item);
      setContentTitle('');
      setContentDescription('');
      setContentTags('');
      await refresh();
      showToast('Selection saved to the content library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selection could not be saved.');
    }
  };

  const insertionPoint = () => {
    if (!engine) throw new Error('The canvas is not ready.');
    const rect = engine.getCanvas().getBoundingClientRect();
    return engine.getTransformer().screenToWorld({ x: rect.width / 2, y: rect.height / 2 });
  };

  const insertContent = (item: ReusableContentItem) => {
    if (!engine) return;
    const current = engine.getObjects();
    const startZ = current.reduce((highest, object) => Math.max(highest, object.zIndex), -1) + 1;
    const objects = LibraryService.objectsForInsertion(item, insertionPoint(), startZ);
    for (const object of objects) engine.addObject(object);
    engine.setSelectedIds(objects.map((object) => object.id));
    setLibraryModalOpen(false);
    showToast('Reusable content inserted');
  };

  const insertAsset = async (asset: MediaAssetRecord) => {
    if (!engine) return;
    if (!(await MediaManager.isAvailable(asset.id))) {
      setError('The bytes for this asset are no longer available.');
      return;
    }
    const object = LibraryService.objectFromMediaAsset(asset, insertionPoint());
    const highestZ = engine.getObjects().reduce((highest, entry) => Math.max(highest, entry.zIndex), -1);
    object.zIndex = highestZ + 1;
    engine.addObject(object);
    engine.setSelectedIds([object.id]);
    setLibraryModalOpen(false);
    showToast('Asset inserted');
  };

  const deleteTemplate = async (template: LessonTemplate) => {
    await StorageService.deleteLessonTemplate(template.id);
    await StorageService.collectUnusedMedia([document]);
    await refresh();
  };

  const deleteContent = async (item: ReusableContentItem) => {
    await StorageService.deleteReusableContent(item.id);
    await StorageService.collectUnusedMedia([document]);
    await refresh();
  };

  const removeAsset = async (asset: MediaAssetRecord) => {
    MediaManager.removeFromLibrary(asset.id);
    await StorageService.collectUnusedMedia([document]);
    await refresh();
  };

  const tabButton = (id: LibraryTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        tab === id ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div role="dialog" aria-modal="true" aria-label="Lesson and content library" className="relative w-full max-w-5xl h-[min(88vh,820px)] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300"><BookOpen className="w-5 h-5" /></div>
            <div><h2 className="text-lg font-bold text-slate-100">Lesson Library</h2><p className="text-xs text-slate-400">Templates, reusable content, and searchable assets</p></div>
          </div>
          <button type="button" aria-label="Close lesson library" onClick={() => setLibraryModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-3 sm:p-4 border-b border-slate-800 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {tabButton('templates', 'Templates', <FileStack className="w-4 h-4" />)}
            {tabButton('content', 'My Content', <Box className="w-4 h-4" />)}
            {tabButton('assets', 'Assets', <ImageIcon className="w-4 h-4" />)}
          </div>
          <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl">
            <Search className="w-4 h-4 text-slate-500" />
            <input aria-label="Search library" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, subject, tag, or file type…" className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {error && <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300">{error}</div>}
          {loading ? <div className="py-16 text-center text-slate-400">Loading library…</div> : (
            <>
              {tab === 'templates' && (
                <div className="space-y-4">
                  <button type="button" onClick={() => { setShowTemplateForm(!showTemplateForm); setTemplateTitle(document.title); }} className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-2xl"><Plus className="w-4 h-4" />Save current lesson as a template</button>
                  {showTemplateForm && <div className="grid gap-3 p-4 bg-slate-800/70 border border-slate-700 rounded-2xl">
                    <input aria-label="Template title" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Template title" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" />
                    <input aria-label="Template description" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Short description" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" />
                    <div className="grid sm:grid-cols-2 gap-3"><select aria-label="Template category" value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value as LessonTemplateCategory)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label="Template tags" value={templateTags} onChange={(e) => setTemplateTags(e.target.value)} placeholder="Tags, separated by commas" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" /></div>
                    <button type="button" onClick={saveTemplate} className="justify-self-end px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl">Save template</button>
                  </div>}
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{filteredTemplates.map((template) => <article key={template.id} className="flex flex-col p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl"><div className="flex justify-between gap-2"><div className="p-2 bg-violet-500/15 text-violet-300 rounded-xl"><FileStack className="w-5 h-5" /></div><span className="text-[10px] px-2 py-1 h-fit rounded-full bg-slate-700 text-slate-300">{template.builtIn ? 'Built in' : 'Mine'}</span></div><h3 className="mt-3 text-sm font-bold text-white">{template.title}</h3><p className="mt-1 text-xs text-slate-400 flex-1">{template.description}</p><div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500"><Layers className="w-3 h-3" />{template.pages.length} pages · {categoryLabels[template.category]}</div><div className="flex gap-2 mt-4">{!template.builtIn && <button type="button" aria-label={`Delete template ${template.title}`} onClick={() => void deleteTemplate(template)} className="p-2 text-slate-500 hover:text-rose-300 rounded-xl"><Trash2 className="w-4 h-4" /></button>}<button type="button" onClick={() => setTemplateCandidate(template)} className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-xl">Use template</button></div></article>)}</div>
                </div>
              )}

              {tab === 'content' && <div className="space-y-4">
                <div className="grid gap-3 p-4 bg-slate-800/70 border border-slate-700 rounded-2xl"><div className="text-sm font-semibold text-slate-100">Save selected objects</div><div className="text-xs text-slate-400">{selectedIds.length ? `${selectedIds.length} selected` : 'Select objects on the canvas first.'}</div><input aria-label="Reusable content title" value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} placeholder="Content title" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" /><input aria-label="Reusable content description" value={contentDescription} onChange={(e) => setContentDescription(e.target.value)} placeholder="Description" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" /><input aria-label="Reusable content tags" value={contentTags} onChange={(e) => setContentTags(e.target.value)} placeholder="Tags, separated by commas" className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none" /><button type="button" disabled={!selectedIds.length} onClick={saveSelectedContent} className="justify-self-end px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">Save selection</button></div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{filteredContent.map((item) => <article key={item.id} className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl"><div className="flex items-start justify-between"><div className="p-2 bg-cyan-500/15 text-cyan-300 rounded-xl"><Box className="w-5 h-5" /></div><button type="button" aria-label={`Delete reusable content ${item.title}`} onClick={() => void deleteContent(item)} className="p-2 text-slate-500 hover:text-rose-300 rounded-xl"><Trash2 className="w-4 h-4" /></button></div><h3 className="mt-3 text-sm font-bold text-white">{item.title}</h3><p className="mt-1 text-xs text-slate-400 min-h-8">{item.description}</p><div className="mt-2 text-[11px] text-slate-500">{item.objects.length} objects · {item.tags.join(', ') || 'no tags'}</div><button type="button" onClick={() => insertContent(item)} className="w-full mt-4 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl">Insert on page</button></article>)}</div>
              </div>}

              {tab === 'assets' && <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{filteredAssets.map((asset) => <article key={asset.id} className="overflow-hidden bg-slate-800/60 border border-slate-700/60 rounded-2xl">{asset.thumbnailDataUrl ? <img src={asset.thumbnailDataUrl} alt="" className="w-full h-28 object-cover bg-slate-950" /> : <div className="h-28 flex items-center justify-center bg-slate-950 text-4xl">{asset.kind === 'audio' ? '🎵' : asset.kind === 'pdf' ? '📄' : asset.kind === 'video' ? '🎬' : '🖼'}</div>}<div className="p-3"><h3 className="text-sm font-semibold text-white truncate">{asset.fileName || `${asset.kind} asset`}</h3><p className="mt-1 text-[11px] text-slate-500">{asset.kind} · {(asset.byteSize / 1024).toFixed(0)} KB</p><div className="flex gap-2 mt-3"><button type="button" aria-label={`Remove ${asset.fileName || asset.kind} from asset library`} onClick={() => void removeAsset(asset)} className="p-2 text-slate-500 hover:text-rose-300 rounded-xl"><Trash2 className="w-4 h-4" /></button><button type="button" onClick={() => void insertAsset(asset)} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl">Insert</button></div></div></article>)}</div>}

              {((tab === 'templates' && !filteredTemplates.length) || (tab === 'content' && !filteredContent.length) || (tab === 'assets' && !filteredAssets.length)) && <div className="py-16 text-center text-slate-500"><Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />No matching library items.</div>}
            </>
          )}
        </div>

        {templateCandidate && <div className="absolute inset-0 z-10 flex items-center justify-center p-5 bg-slate-950/85 backdrop-blur-sm"><div role="alertdialog" aria-modal="true" aria-label="Use lesson template" className="w-full max-w-md p-5 bg-slate-900 border border-slate-700 rounded-2xl"><h3 className="text-base font-bold text-white">Start “{templateCandidate.title}”?</h3><p className="mt-2 text-sm text-slate-400">This replaces the current workspace with {templateCandidate.pages.length} template pages. Unsaved work is captured as a recovery checkpoint first.</p><div className="flex justify-end gap-2 mt-5"><button type="button" onClick={() => setTemplateCandidate(null)} className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-xl">Cancel</button><button type="button" onClick={applyTemplate} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl">Use template</button></div></div></div>}
      </div>
    </div>
  );
};
