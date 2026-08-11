import { create } from 'zustand';
import type { WhiteboardStoreState } from './types';
import { createEngineSlice } from './slices/engineSlice';
import { createDocumentSlice } from './slices/documentSlice';
import { createPageSlice } from './slices/pageSlice';
import { createToolSlice } from './slices/toolSlice';
import { createPreferencesSlice } from './slices/preferencesSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createHandwritingSlice } from './slices/handwritingSlice';
import { createPdfSlice } from './slices/pdfSlice';
import { createUiSlice } from './slices/uiSlice';

/**
 * Composed from slices in ./slices. Each slice owns a disjoint set of keys and
 * is created against the full store type, so this is a pure reorganisation of
 * one flat object -- consumers see the same single hook and the same API.
 */
export const useWhiteboardStore = create<WhiteboardStoreState>()((...args) => ({
  ...createEngineSlice(...args),
  ...createDocumentSlice(...args),
  ...createPageSlice(...args),
  ...createToolSlice(...args),
  ...createPreferencesSlice(...args),
  ...createSelectionSlice(...args),
  ...createHandwritingSlice(...args),
  ...createPdfSlice(...args),
  ...createUiSlice(...args),
}));
