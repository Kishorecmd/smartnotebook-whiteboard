import { WhiteboardDocument } from '../../types';
import { createDefaultDocument } from '../../models';
import { StorageService } from '../../services';
import type { DocumentSlice, SliceCreator } from '../types';

export const createDocumentSlice: SliceCreator<DocumentSlice> = (set, get) => ({
  document: createDefaultDocument('Untitled Whiteboard'),
  activePageIndex: 0,
  isDirty: false,

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
});
