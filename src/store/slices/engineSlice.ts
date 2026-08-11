import type { EngineSlice, SliceCreator } from '../types';

export const createEngineSlice: SliceCreator<EngineSlice> = (set, get) => ({
  engine: null,

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

  setEngine: (engine) => set({ engine }),

  setViewport: (viewport) => set({ viewport }),
  setHistoryState: (history) => set({ history }),

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
});
