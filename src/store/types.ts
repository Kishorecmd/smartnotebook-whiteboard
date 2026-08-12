import type { StateCreator } from 'zustand';
import {
  WhiteboardDocument,
  ToolType,
  ToolSettings,
  CanvasBackgroundType,
  HistoryState,
  ViewportTransform,
  WhiteboardObject,
  TextEditRequest,
  Point,
  TextAlign,
  ImageObject,
} from '../types';
import type { WhiteboardEngine } from '../engine';
import { StylePatch } from '../engine/commands/ChangeStyleCommand';
import { ReorderAction } from '../engine/commands/ReorderObjectsCommand';
import { HandwritingRecognitionResult } from '../services/HandwritingRecognitionService';
import type { AzureVisionCredentials } from '../services/AzureInkRecognitionService';

export interface CommitTextEditParams {
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
}

export interface ApplyHandwritingParams {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: TextAlign;
  color: string;
  replace: boolean;
}

/** Engine reference (bridge) plus the state the engine pushes back into the store. */
export interface EngineSlice {
  engine: WhiteboardEngine | null;
  viewport: ViewportTransform;
  history: HistoryState;

  setEngine: (engine: WhiteboardEngine | null) => void;
  setViewport: (vp: ViewportTransform) => void;
  setHistoryState: (history: HistoryState) => void;

  // Quick Undo / Redo / Clear / Zoom dispatch to Engine
  undo: () => void;
  redo: () => void;
  clearActivePage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToFit: () => void;
}

export interface DocumentSlice {
  document: WhiteboardDocument;
  activePageIndex: number;
  isDirty: boolean;

  setDocument: (doc: WhiteboardDocument) => void;
  setDocumentTitle: (title: string) => void;
  newDocument: () => void;
  saveCurrentDocument: () => Promise<void>;
  loadDocumentById: (id: string) => Promise<void>;
  loadDocumentFromObject: (doc: WhiteboardDocument) => void;
  deleteDocumentById: (id: string) => Promise<void>;
}

/** Page management. Operates on `document.pages` from DocumentSlice. */
export interface PageSlice {
  setActivePageIndex: (index: number) => void;
  addPage: (background?: string, backgroundType?: CanvasBackgroundType) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, newTitle: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updateActivePageBackground: (color: string, type: CanvasBackgroundType) => void;
  setPageObjects: (pageIndex: number, objects: WhiteboardObject[]) => void;
}

export interface ToolSlice {
  toolSettings: ToolSettings;

  setTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
}

/** User preferences that persist to localStorage. */
export interface PreferencesSlice {
  coloringMode: boolean;
  childFriendlyMode: boolean;
  recentColors: string[];
  favoriteColors: string[];
  favoriteTools: string[];
  recentTools: string[];

  setColoringMode: (enabled: boolean) => void;
  setChildFriendlyMode: (enabled: boolean) => void;
  addRecentColor: (color: string) => void;
  addFavoriteColor: (color: string) => void;
  removeFavoriteColor: (color: string) => void;
  toggleFavoriteTool: (toolId: string) => void;
  addRecentTool: (toolId: string) => void;
}

export interface SelectionSlice {
  selectedIds: string[];
  editingText: TextEditRequest | null;

  setSelectedIds: (ids: string[]) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  reorderSelected: (action: ReorderAction) => void;
  applySelectedStyle: (patch: StylePatch) => void;

  // In-place text editing
  startTextEditing: (req: TextEditRequest | null) => void;
  commitTextEdit: (params: CommitTextEditParams) => void;
  cancelTextEdit: () => void;
}

/** Offline Tesseract, or Azure AI Vision 4.0 Read when the user has configured it. */
export type RecognitionEngine = 'tesseract' | 'azure';

export interface HandwritingSlice {
  isHandwritingModalOpen: boolean;
  isRecognizingHandwriting: boolean;
  handwritingProgress: number;
  handwritingStatus: string;
  handwritingResult: HandwritingRecognitionResult | null;
  recognitionEngine: RecognitionEngine;
  azureCredentials: AzureVisionCredentials;
  recognitionError: string | null;

  setHandwritingModalOpen: (open: boolean) => void;
  setRecognitionEngine: (engine: RecognitionEngine) => void;
  setAzureCredentials: (creds: AzureVisionCredentials) => void;
  recognizeHandwritingForSelected: () => Promise<void>;
  applyHandwritingRecognition: (params: ApplyHandwritingParams) => void;
}

export interface PdfSlice {
  isPdfImportModalOpen: boolean;
  pendingPdfImages: ImageObject[];

  setPdfImportModalOpen: (open: boolean, images?: ImageObject[]) => void;
  importPdfAsSlides: () => void;
  importPdfToCanvas: () => void;
}

/** Modals, panels and other transient UI flags. */
export interface UiSlice {
  isPageDrawerOpen: boolean;
  isExportModalOpen: boolean;
  isSavedDocsModalOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isClearDialogOpen: boolean;
  isYouTubeDialogOpen: boolean;
  isDocTitleEditing: boolean;
  isPresenterMode: boolean;
  isTeachingPanelOpen: boolean;

  // Active Teaching Overlay Tools (e.g. Timer, Calculator)
  activeOverlayTools: string[];

  togglePageDrawer: () => void;
  setExportModalOpen: (open: boolean) => void;
  setSavedDocsModalOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setClearDialogOpen: (open: boolean) => void;
  setYouTubeDialogOpen: (open: boolean) => void;
  setDocTitleEditing: (editing: boolean) => void;
  setPresenterMode: (enabled: boolean) => void;
  setTeachingPanelOpen: (open: boolean) => void;
  toggleOverlayTool: (toolId: string) => void;
}

export type WhiteboardStoreState = EngineSlice &
  DocumentSlice &
  PageSlice &
  ToolSlice &
  PreferencesSlice &
  SelectionSlice &
  HandwritingSlice &
  PdfSlice &
  UiSlice;

/**
 * Every slice is created against the full store type, so a slice can read or
 * write another slice's state through `get()` / `set()` exactly as it could
 * when the store was a single object.
 */
export type SliceCreator<T> = StateCreator<WhiteboardStoreState, [], [], T>;
