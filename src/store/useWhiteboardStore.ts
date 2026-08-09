import { create } from 'zustand';
import {
  WhiteboardDocument,
  WhiteboardPage,
  ToolType,
  ToolSettings,
  CanvasBackgroundType,
  HistoryState,
  ViewportTransform,
  WhiteboardObject,
  FreehandStroke,
  ShapeType,
  StrokeStyle,
  TextEditRequest,
  Point,
  TextAlign,
  ImageObject,
} from '../types';
import { createDefaultDocument, createPageObject } from '../models';
import { StorageService } from '../services';
import { HandwritingRecognitionService, HandwritingRecognitionResult } from '../services/HandwritingRecognitionService';
import type { WhiteboardEngine } from '../engine';
import { StylePatch } from '../engine/commands/ChangeStyleCommand';
import { ReorderAction } from '../engine/commands/ReorderObjectsCommand';

interface WhiteboardStoreState {
  // Document State
  document: WhiteboardDocument;
  activePageIndex: number;
  isDirty: boolean;

  // Tool & Settings State
  toolSettings: ToolSettings;

  // Selection State
  selectedIds: string[];
  interactiveVideoId: string | null;

  // In-place Text Editing State
  editingText: TextEditRequest | null;

  // Handwriting Recognition State
  isHandwritingModalOpen: boolean;
  isRecognizingHandwriting: boolean;
  handwritingProgress: number;
  handwritingStatus: string;
  handwritingResult: HandwritingRecognitionResult | null;

  // Viewport State
  viewport: ViewportTransform;

  // History State
  history: HistoryState;

  // UI Panels / Modals
  isPageDrawerOpen: boolean;
  isExportModalOpen: boolean;
  isSavedDocsModalOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isClearDialogOpen: boolean;
  isYouTubeDialogOpen: boolean;
  isDocTitleEditing: boolean;
  isPresenterMode: boolean;
  isTeachingPanelOpen: boolean;
  isPdfImportModalOpen: boolean;
  pendingPdfImages: ImageObject[];

  // Active Teaching Overlay Tools (e.g. Timer, Calculator)
  activeOverlayTools: string[];

  // Engine Reference (bridge)
  engine: WhiteboardEngine | null;

  // Actions - Engine Connection
  setEngine: (engine: WhiteboardEngine | null) => void;

  // Actions - Teaching Tools
  toggleOverlayTool: (toolId: string) => void;

  // Actions - Tools & Settings
  setTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;

  // Actions - In-place Text Editing
  startTextEditing: (req: TextEditRequest | null) => void;
  commitTextEdit: (params: {
    id?: string;
    text: string;
    worldPoint: Point;
    fontSize: number;
    fontFamily: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    underline?: boolean;
    textAlign?: TextAlign;
    color: string;
    backgroundColor?: string;
    rotation?: number;
  }) => void;
  cancelTextEdit: () => void;

  // Actions - Handwriting Recognition
  setHandwritingModalOpen: (open: boolean) => void;
  recognizeHandwritingForSelected: () => Promise<void>;
  applyHandwritingRecognition: (params: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    underline?: boolean;
    textAlign?: TextAlign;
    color: string;
    replace: boolean;
  }) => void;

  // Actions - Selection
  setSelectedIds: (ids: string[]) => void;
  setInteractiveVideoId: (id: string | null) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  reorderSelected: (action: ReorderAction) => void;
  applySelectedStyle: (patch: StylePatch) => void;

  // Actions - Document Operations
  setDocument: (doc: WhiteboardDocument) => void;
  setDocumentTitle: (title: string) => void;
  newDocument: () => void;
  saveCurrentDocument: () => Promise<void>;
  loadDocumentById: (id: string) => Promise<void>;
  loadDocumentFromObject: (doc: WhiteboardDocument) => void;
  deleteDocumentById: (id: string) => Promise<void>;

  // Actions - Page Management
  setActivePageIndex: (index: number) => void;
  addPage: (background?: string, backgroundType?: CanvasBackgroundType) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, newTitle: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updateActivePageBackground: (color: string, type: CanvasBackgroundType) => void;
  setPageObjects: (pageIndex: number, objects: WhiteboardObject[]) => void;

  // Actions - Viewport & History Sync
  setViewport: (vp: ViewportTransform) => void;
  setHistoryState: (history: HistoryState) => void;

  // Actions - Modals
  togglePageDrawer: () => void;
  setExportModalOpen: (open: boolean) => void;
  setSavedDocsModalOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setClearDialogOpen: (open: boolean) => void;
  setYouTubeDialogOpen: (open: boolean) => void;
  setDocTitleEditing: (editing: boolean) => void;
  setPresenterMode: (enabled: boolean) => void;
  setTeachingPanelOpen: (open: boolean) => void;
  setPdfImportModalOpen: (open: boolean, images?: ImageObject[]) => void;
  importPdfAsSlides: () => void;
  importPdfToCanvas: () => void;

  // Quick Undo / Redo / Clear / Zoom dispatch to Engine
  undo: () => void;
  redo: () => void;
  clearActivePage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToFit: () => void;
}

export const useWhiteboardStore = create<WhiteboardStoreState>((set, get) => ({
  document: createDefaultDocument('Untitled Whiteboard'),
  activePageIndex: 0,
  isDirty: false,
  activeOverlayTools: [],

  toolSettings: {
    tool: 'pen',
    color: '#0f172a',
    penWidth: 4,
    markerWidth: 24,
    eraserWidth: 28,
    markerOpacity: 0.4,
    eraserMode: 'stroke',
    shapeType: 'rectangle' as ShapeType,
    shapeFillColor: 'transparent',
    shapeStrokeStyle: 'solid' as StrokeStyle,
    shapeStrokeWidth: 3,
    textFontSize: 28,
    textFontFamily: 'Inter, sans-serif',
    textFontWeight: 'normal',
    textFontStyle: 'normal',
    textUnderline: false,
    textAlign: 'left',
    textColor: '#0f172a',
  },

  selectedIds: [],
  editingText: null,

  isHandwritingModalOpen: false,
  isRecognizingHandwriting: false,
  handwritingProgress: 0,
  handwritingStatus: '',
  handwritingResult: null,

  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },

  history: {
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,
  },

  isPageDrawerOpen: false,
  isExportModalOpen: false,
  isSavedDocsModalOpen: false,
  isKeyboardShortcutsOpen: false,
  isClearDialogOpen: false,
  isYouTubeDialogOpen: false,
  isDocTitleEditing: false,
  isPresenterMode: false,
  isTeachingPanelOpen: false,
  isPdfImportModalOpen: false,
  pendingPdfImages: [],

  engine: null,

  setEngine: (engine) => set({ engine }),

  setTool: (tool) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, tool };
    set({ toolSettings: updated });
    if (engine) {
      engine.setTool(tool);
    }
  },

  setPdfImportModalOpen: (open: boolean, images?: ImageObject[]) => {
    set({
      isPdfImportModalOpen: open,
      pendingPdfImages: images || [],
    });
  },

  importPdfAsSlides: () => {
    const { pendingPdfImages, document: doc, activePageIndex } = get();
    if (pendingPdfImages.length === 0) return;

    let updatedDoc = { ...doc };
    let newActiveIndex = activePageIndex;

    // For each image (page), we create a new whiteboard page
    pendingPdfImages.forEach((img, index) => {
      // Create a page with the image centered
      const newPage = createPageObject(
        doc.pages.length + 1,
        '#ffffff',
        'plain'
      );
      
      // Move image to center of a reasonable viewport, say (0, 0)
      const centeredImg: ImageObject = {
        ...img,
        x: -img.width / 2,
        y: -img.height / 2,
      };

      newPage.objects = [centeredImg];
      
      // If the current page is empty, replace it
      if (index === 0 && doc.pages[activePageIndex].objects.length === 0) {
        updatedDoc.pages[activePageIndex] = newPage;
      } else {
        updatedDoc.pages.splice(activePageIndex + 1 + index, 0, newPage);
        newActiveIndex = activePageIndex + 1 + index;
      }
    });

    updatedDoc.updatedAt = Date.now();
    set({
      document: updatedDoc,
      activePageIndex: newActiveIndex,
      isDirty: true,
      isPdfImportModalOpen: false,
      pendingPdfImages: [],
    });

    const engine = get().engine;
    if (engine) {
      engine.setObjects(updatedDoc.pages[newActiveIndex].objects, false);
      engine.setBackground(updatedDoc.pages[newActiveIndex].background, updatedDoc.pages[newActiveIndex].backgroundType);
      engine.getCommandManager().clear();
    }
    
    StorageService.saveDocument(updatedDoc);
  },

  importPdfToCanvas: () => {
    const { pendingPdfImages, engine } = get();
    if (pendingPdfImages.length === 0 || !engine) return;

    pendingPdfImages.forEach(img => engine.addObject(img));

    set({
      isPdfImportModalOpen: false,
      pendingPdfImages: [],
      isDirty: true,
    });
  },

  updateToolSettings: (settings) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, ...settings };
    set({ toolSettings: updated });
    if (engine) {
      engine.updateToolSettings(settings);
    }
  },

  startTextEditing: (editingText) => set({ editingText }),

  commitTextEdit: (params) => {
    const { engine } = get();
    if (engine) {
      engine.commitTextEdit(params);
    }
    set({ editingText: null });
  },

  cancelTextEdit: () => set({ editingText: null }),

  setHandwritingModalOpen: (isHandwritingModalOpen) => set({ isHandwritingModalOpen }),

  recognizeHandwritingForSelected: async () => {
    const { document, activePageIndex, selectedIds, engine } = get();
    if (!engine) return;

    const page = document.pages[activePageIndex];
    if (!page) return;

    const selectedStrokes = page.objects.filter(
      (obj): obj is FreehandStroke => obj.type === 'stroke' && selectedIds.includes(obj.id)
    );

    if (selectedStrokes.length === 0) return;

    set({
      isHandwritingModalOpen: true,
      isRecognizingHandwriting: true,
      handwritingProgress: 10,
      handwritingStatus: 'Initializing handwriting recognition...',
      handwritingResult: null,
    });

    try {
      const result = await HandwritingRecognitionService.recognizeStrokes(
        selectedStrokes,
        (progress, status) => {
          set({
            handwritingProgress: progress,
            handwritingStatus: status,
          });
        }
      );

      if (result) {
        set({
          isRecognizingHandwriting: false,
          handwritingResult: result,
          handwritingProgress: 100,
          handwritingStatus: 'Recognition complete!',
        });
      } else {
        set({
          isRecognizingHandwriting: false,
          isHandwritingModalOpen: false,
        });
      }
    } catch (err) {
      console.error('Handwriting recognition failed:', err);
      set({
        isRecognizingHandwriting: false,
        handwritingStatus: 'Recognition error. Please try again.',
      });
    }
  },

  applyHandwritingRecognition: (params) => {
    const { handwritingResult, engine } = get();
    if (!engine || !handwritingResult) return;

    engine.convertStrokesToText({
      strokeIds: handwritingResult.strokeIds,
      text: params.text,
      fontSize: params.fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      fontStyle: params.fontStyle,
      underline: params.underline,
      textAlign: params.textAlign,
      color: params.color,
      replace: params.replace,
    });

    set({
      isHandwritingModalOpen: false,
      handwritingResult: null,
    });
  },

  // Selection
  setSelectedIds: (ids) => {
    set({ selectedIds: ids });
    // Clear interactive video if not selected
    const { interactiveVideoId } = get();
    if (interactiveVideoId && !ids.includes(interactiveVideoId)) {
      set({ interactiveVideoId: null });
    }
  },
  setInteractiveVideoId: (id) => set({ interactiveVideoId: id }),
  deleteSelected: () => {
    const { engine } = get();
    if (engine) engine.deleteSelected();
  },

  duplicateSelected: () => {
    const { engine } = get();
    if (engine) engine.duplicateSelected();
  },

  reorderSelected: (action) => {
    const { engine } = get();
    if (engine) engine.reorderSelected(action);
  },

  applySelectedStyle: (patch) => {
    const { engine } = get();
    if (engine) engine.applySelectedStyle(patch);
  },

  setDocument: (doc) => {
    set({
      document: doc,
      activePageIndex: 0,
      isDirty: false,
      selectedIds: [],
      editingText: null,
    });
    const { engine } = get();
    if (engine && doc.pages.length > 0) {
      const page = doc.pages[0];
      engine.setObjects(page.objects);
      engine.setBackground(page.background, page.backgroundType);
      engine.resetZoom();
    }
    StorageService.saveAutosave(doc);
  },

  setDocumentTitle: (title) => {
    const { document } = get();
    const updatedDoc = {
      ...document,
      title: title.trim() || 'Untitled Whiteboard',
      updatedAt: Date.now(),
    };
    set({ document: updatedDoc, isDirty: true });
    StorageService.saveAutosave(updatedDoc);
  },

  newDocument: () => {
    const newDoc = createDefaultDocument('Untitled Whiteboard');
    set({
      document: newDoc,
      activePageIndex: 0,
      isDirty: false,
      selectedIds: [],
      editingText: null,
    });
    const { engine } = get();
    if (engine) {
      engine.setObjects([]);
      engine.setBackground('#ffffff', 'plain');
      engine.resetZoom();
    }
    StorageService.saveAutosave(newDoc);
  },

  saveCurrentDocument: async () => {
    const { document } = get();
    const updatedDoc = {
      ...document,
      updatedAt: Date.now(),
    };
    await StorageService.saveDocument(updatedDoc);
    set({ document: updatedDoc, isDirty: false });
  },

  loadDocumentFromObject: (doc: WhiteboardDocument) => {
    set({
      document: doc,
      activePageIndex: doc.activePageIndex || 0,
      isDirty: false,
    });
    const engine = get().engine;
    if (engine) {
      const page = doc.pages[doc.activePageIndex || 0];
      engine.setObjects(page.objects, false);
      engine.setBackground(page.background, page.backgroundType);
      engine.getCommandManager().clear();
    }
  },

  deleteDocumentById: async (id: string) => {
    await StorageService.deleteDocument(id);
  },

  loadDocumentById: async (id: string) => {
    const doc = await StorageService.loadDocument(id);
    if (!doc) {
      console.error(`Document with id ${id} not found`);
      return;
    }
    get().setDocument(doc);
  },

  setActivePageIndex: (index) => {
    const { document, activePageIndex, engine } = get();
    if (index < 0 || index >= document.pages.length || index === activePageIndex) {
      return;
    }

    set({ activePageIndex: index, selectedIds: [], editingText: null });

    if (engine) {
      const targetPage = document.pages[index];
      engine.setObjects(targetPage.objects);
      engine.setBackground(targetPage.background, targetPage.backgroundType);
      engine.resetZoom();
    }
  },

  addPage: (background = '#ffffff', backgroundType = 'plain') => {
    const { document, engine } = get();
    const newPage = createPageObject(document.pages.length, background, backgroundType);
    const updatedPages = [...document.pages, newPage];
    const newIndex = updatedPages.length - 1;

    const updatedDoc = {
      ...document,
      pages: updatedPages,
      updatedAt: Date.now(),
    };

    set({
      document: updatedDoc,
      activePageIndex: newIndex,
      isDirty: true,
      selectedIds: [],
      editingText: null,
    });

    if (engine) {
      engine.setObjects([]);
      engine.setBackground(background, backgroundType);
      engine.resetZoom();
    }

    StorageService.saveAutosave(updatedDoc);
  },

  deletePage: (pageId) => {
    const { document, activePageIndex, engine } = get();
    if (document.pages.length <= 1) return; // Keep at least one page

    const pageToDeleteIndex = document.pages.findIndex((p) => p.id === pageId);
    if (pageToDeleteIndex === -1) return;

    const updatedPages = document.pages
      .filter((p) => p.id !== pageId)
      .map((p, idx) => ({ ...p, order: idx }));

    let newActiveIndex = activePageIndex;
    if (activePageIndex >= updatedPages.length) {
      newActiveIndex = updatedPages.length - 1;
    } else if (pageToDeleteIndex < activePageIndex) {
      newActiveIndex = activePageIndex - 1;
    }

    const updatedDoc = {
      ...document,
      pages: updatedPages,
      updatedAt: Date.now(),
    };

    set({
      document: updatedDoc,
      activePageIndex: newActiveIndex,
      isDirty: true,
      selectedIds: [],
      editingText: null,
    });

    if (engine) {
      const activePage = updatedPages[newActiveIndex];
      engine.setObjects(activePage.objects);
      engine.setBackground(activePage.background, activePage.backgroundType);
      engine.resetZoom();
    }

    StorageService.saveAutosave(updatedDoc);
  },

  renamePage: (pageId: string, newTitle: string) => {
    const { document: doc } = get();
    const updatedPages = doc.pages.map((p) =>
      p.id === pageId ? { ...p, title: newTitle, updatedAt: Date.now() } : p
    );
    set({
      document: {
        ...doc,
        pages: updatedPages,
        updatedAt: Date.now(),
      },
      isDirty: true,
    });
  },

  duplicatePage: (pageId) => {
    const { document } = get();
    const pageToDup = document.pages.find((p) => p.id === pageId);
    if (!pageToDup) return;

    const pageIndex = document.pages.findIndex((p) => p.id === pageId);
    const clonedPage: WhiteboardPage = {
      ...JSON.parse(JSON.stringify(pageToDup)),
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedPages = [...document.pages];
    updatedPages.splice(pageIndex + 1, 0, clonedPage);

    const reindexedPages = updatedPages.map((p, idx) => ({ ...p, order: idx }));

    const updatedDoc = {
      ...document,
      pages: reindexedPages,
      updatedAt: Date.now(),
    };

    set({
      document: updatedDoc,
      activePageIndex: pageIndex + 1,
      isDirty: true,
      selectedIds: [],
      editingText: null,
    });

    const { engine } = get();
    if (engine) {
      engine.setObjects(clonedPage.objects);
      engine.setBackground(clonedPage.background, clonedPage.backgroundType);
      engine.resetZoom();
    }

    StorageService.saveAutosave(updatedDoc);
  },

  reorderPages: (fromIndex, toIndex) => {
    const { document, activePageIndex, engine } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= document.pages.length ||
      toIndex < 0 ||
      toIndex >= document.pages.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const updatedPages = [...document.pages];
    const [movedPage] = updatedPages.splice(fromIndex, 1);
    updatedPages.splice(toIndex, 0, movedPage);

    const reordered = updatedPages.map((p, idx) => ({ ...p, order: idx }));

    let newActiveIndex = activePageIndex;
    if (activePageIndex === fromIndex) {
      newActiveIndex = toIndex;
    } else if (fromIndex < activePageIndex && toIndex >= activePageIndex) {
      newActiveIndex--;
    } else if (fromIndex > activePageIndex && toIndex <= activePageIndex) {
      newActiveIndex++;
    }

    const updatedDoc = {
      ...document,
      pages: reordered,
      updatedAt: Date.now(),
    };

    set({
      document: updatedDoc,
      activePageIndex: newActiveIndex,
      isDirty: true,
      editingText: null,
    });

    if (engine) {
      const activePage = reordered[newActiveIndex];
      engine.setObjects(activePage.objects);
      engine.setBackground(activePage.background, activePage.backgroundType);
    }

    StorageService.saveAutosave(updatedDoc);
  },

  updateActivePageBackground: (color, type) => {
    const { document, activePageIndex, engine } = get();
    const updatedPages = [...document.pages];
    updatedPages[activePageIndex] = {
      ...updatedPages[activePageIndex],
      background: color,
      backgroundType: type,
    };

    const updatedDoc = {
      ...document,
      pages: updatedPages,
      updatedAt: Date.now(),
    };

    set({ document: updatedDoc, isDirty: true });

    if (engine) {
      engine.setBackground(color, type);
    }

    StorageService.saveAutosave(updatedDoc);
  },

  setPageObjects: (pageIndex, objects) => {
    const { document } = get();
    if (pageIndex < 0 || pageIndex >= document.pages.length) return;

    const updatedPages = [...document.pages];
    updatedPages[pageIndex] = {
      ...updatedPages[pageIndex],
      objects,
    };

    const updatedDoc = {
      ...document,
      pages: updatedPages,
      updatedAt: Date.now(),
    };

    set({ document: updatedDoc, isDirty: true });
    StorageService.saveAutosave(updatedDoc);
  },

  setViewport: (viewport) => set({ viewport }),
  setHistoryState: (history) => set({ history }),

  togglePageDrawer: () => set((state) => ({ isPageDrawerOpen: !state.isPageDrawerOpen })),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setSavedDocsModalOpen: (isSavedDocsModalOpen) => set({ isSavedDocsModalOpen }),
  setKeyboardShortcutsOpen: (open) => set({ isKeyboardShortcutsOpen: open }),
  setClearDialogOpen: (open) => set({ isClearDialogOpen: open }),
  setYouTubeDialogOpen: (open) => set({ isYouTubeDialogOpen: open }),
  setDocTitleEditing: (editing) => set({ isDocTitleEditing: editing }),
  setPresenterMode: (active) => set({ isPresenterMode: active }),
  setTeachingPanelOpen: (open) => set({ isTeachingPanelOpen: open }),

  toggleOverlayTool: (toolId) => set((state) => {
    const isActive = state.activeOverlayTools.includes(toolId);
    return {
      activeOverlayTools: isActive
        ? state.activeOverlayTools.filter(id => id !== toolId)
        : [...state.activeOverlayTools, toolId]
    };
  }),
  undo: () => {
    const { engine } = get();
    if (engine) engine.undo();
  },

  redo: () => {
    const { engine } = get();
    if (engine) engine.redo();
  },

  clearActivePage: () => {
    const { engine } = get();
    if (engine) engine.clearPage();
  },

  zoomIn: () => {
    const { engine } = get();
    if (engine) engine.zoomIn();
  },

  zoomOut: () => {
    const { engine } = get();
    if (engine) engine.zoomOut();
  },

  resetZoom: () => {
    const { engine } = get();
    if (engine) engine.resetZoom();
  },

  zoomToFit: () => {
    const { engine } = get();
    if (engine) engine.zoomToFit();
  },
}));
