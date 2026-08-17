import { WhiteboardDocument } from '../../types';
import { createDefaultDocument } from '../../models';
import { StorageService } from '../../services';
import type { DocumentSlice, SliceCreator } from '../types';

const activeIndexFor = (doc: WhiteboardDocument): number =>
  Math.min(Math.max(0, Math.trunc(doc.activePageIndex || 0)), Math.max(0, doc.pages.length - 1));

export const createDocumentSlice: SliceCreator<DocumentSlice> = (set, get) => ({
  document: createDefaultDocument('Untitled Whiteboard'),
  activePageIndex: 0,
  isDirty: false,

  setDocument: (doc) => {
    const previous = get();
    const safetyCheckpoint = previous.isDirty
      ? StorageService.createRecoveryCheckpoint(
          { ...previous.document, activePageIndex: previous.activePageIndex },
          'before-open',
          'Before opening another board'
        )
      : Promise.resolve(null);
    const activePageIndex = activeIndexFor(doc);
    const normalizedDoc = { ...doc, activePageIndex };
    set({
      document: normalizedDoc,
      activePageIndex,
      isDirty: false,
      selectedIds: [],
      editingText: null,
    });
    const { engine } = get();
    if (engine && normalizedDoc.pages.length > 0) {
      const page = normalizedDoc.pages[activePageIndex];
      engine.setObjects(page.objects, false);
      engine.setBackground(page.background, page.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }
    void safetyCheckpoint
      .then(() => StorageService.saveAutosave(normalizedDoc))
      .then(() => StorageService.collectUnusedMedia([normalizedDoc]));
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
    const previous = get();
    const safetyCheckpoint = previous.isDirty
      ? StorageService.createRecoveryCheckpoint(
          { ...previous.document, activePageIndex: previous.activePageIndex },
          'before-new',
          'Before creating a new board'
        )
      : Promise.resolve(null);
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
      engine.setObjects([], false);
      engine.setBackground('#ffffff', 'plain');
      engine.resetZoom();
      engine.getCommandManager().clear();
    }
    void safetyCheckpoint
      .then(() => StorageService.saveAutosave(newDoc))
      .then(() => StorageService.collectUnusedMedia([newDoc]));
  },

  saveCurrentDocument: async () => {
    const { document, activePageIndex } = get();
    const updatedDoc = {
      ...document,
      activePageIndex,
      updatedAt: Date.now(),
    };
    await StorageService.saveDocument(updatedDoc);
    set({ document: updatedDoc, isDirty: false });
  },

  loadDocumentFromObject: (doc: WhiteboardDocument) => {
    const previous = get();
    const safetyCheckpoint = previous.isDirty
      ? StorageService.createRecoveryCheckpoint(
          { ...previous.document, activePageIndex: previous.activePageIndex },
          'before-open',
          'Before importing another board'
        )
      : Promise.resolve(null);
    const activePageIndex = activeIndexFor(doc);
    const normalizedDoc = { ...doc, activePageIndex };
    set({
      document: normalizedDoc,
      activePageIndex,
      isDirty: false,
      selectedIds: [],
      editingText: null,
    });
    const engine = get().engine;
    if (engine) {
      const page = normalizedDoc.pages[activePageIndex];
      engine.setObjects(page.objects, false);
      engine.setBackground(page.background, page.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }
    void safetyCheckpoint
      .then(() => StorageService.saveAutosave(normalizedDoc))
      .then(() => StorageService.collectUnusedMedia([normalizedDoc]));
  },

  deleteDocumentById: async (id: string) => {
    await StorageService.deleteDocument(id);
    await StorageService.collectUnusedMedia([get().document]);
  },

  loadDocumentById: async (id: string) => {
    const doc = await StorageService.loadDocument(id);
    if (!doc) {
      console.error(`Document with id ${id} not found`);
      return;
    }
    get().setDocument(doc);
  },

  createRecoveryCheckpoint: async () => {
    const { document, activePageIndex } = get();
    const checkpoint = await StorageService.createRecoveryCheckpoint(
      { ...document, activePageIndex, updatedAt: Date.now() },
      'manual',
      'Manual checkpoint'
    );
    return checkpoint !== null;
  },

  restoreRecoveryCheckpoint: async (checkpoint) => {
    const current = get();
    await StorageService.createRecoveryCheckpoint(
      { ...current.document, activePageIndex: current.activePageIndex },
      'before-restore',
      'Before restoring an older version'
    );

    const activePageIndex = activeIndexFor(checkpoint.document);
    const restoredDocument = {
      ...checkpoint.document,
      activePageIndex,
      updatedAt: Date.now(),
    };
    set({
      document: restoredDocument,
      activePageIndex,
      isDirty: true,
      selectedIds: [],
      editingText: null,
    });

    const engine = get().engine;
    if (engine) {
      const page = restoredDocument.pages[activePageIndex];
      engine.setObjects(page.objects, false);
      engine.setBackground(page.background, page.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }

    await StorageService.saveAutosave(restoredDocument);
    await StorageService.collectUnusedMedia([restoredDocument]);
  },

  startDocumentFromTemplate: (doc) => {
    const previous = get();
    const safetyCheckpoint = previous.isDirty
      ? StorageService.createRecoveryCheckpoint(
          { ...previous.document, activePageIndex: previous.activePageIndex },
          'before-new',
          'Before starting from a lesson template'
        )
      : Promise.resolve(null);
    const activePageIndex = activeIndexFor(doc);
    const templateDocument = { ...doc, activePageIndex, updatedAt: Date.now() };
    set({
      document: templateDocument,
      activePageIndex,
      isDirty: true,
      selectedIds: [],
      editingText: null,
    });
    const engine = get().engine;
    if (engine) {
      const page = templateDocument.pages[activePageIndex];
      engine.setObjects(page.objects, false);
      engine.setBackground(page.background, page.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }
    void safetyCheckpoint
      .then(() => StorageService.saveAutosave(templateDocument))
      .then(() => StorageService.collectUnusedMedia([templateDocument]));
  },
});
