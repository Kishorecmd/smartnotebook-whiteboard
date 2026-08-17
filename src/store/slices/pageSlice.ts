import { WhiteboardObject, WhiteboardPage } from '../../types';
import { createPageObject } from '../../models';
import { StorageService } from '../../services';
import { generateId } from '../../utils';
import type { PageSlice, SliceCreator } from '../types';

function clonePageObjects(objects: WhiteboardObject[]): WhiteboardObject[] {
  const ids = new Map(objects.map((object) => [object.id, generateId(object.type)]));
  return objects.map((object) => {
    const clone = JSON.parse(JSON.stringify(object)) as WhiteboardObject;
    clone.id = ids.get(object.id)!;
    if (clone.parentGroupId) clone.parentGroupId = ids.get(clone.parentGroupId);
    if (clone.type === 'group') {
      clone.children = clone.children.map((id) => ids.get(id)).filter((id): id is string => !!id);
    }
    return clone;
  });
}

export const createPageSlice: SliceCreator<PageSlice> = (set, get) => ({
  setActivePageIndex: (index) => {
    const { document, activePageIndex, engine } = get();
    if (index < 0 || index >= document.pages.length || index === activePageIndex) {
      return;
    }

    const updatedDoc = {
      ...document,
      activePageIndex: index,
      updatedAt: Date.now(),
    };
    set({ document: updatedDoc, activePageIndex: index, selectedIds: [], editingText: null, isDirty: true });

    if (engine) {
      const targetPage = document.pages[index];
      engine.setObjects(targetPage.objects, false);
      engine.setBackground(targetPage.background, targetPage.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }
    void StorageService.saveAutosave(updatedDoc);
  },

  addPage: (background = '#ffffff', backgroundType = 'plain') => {
    const { document, engine } = get();
    const newPage = createPageObject(document.pages.length, background, backgroundType);
    const updatedPages = [...document.pages, newPage];
    const newIndex = updatedPages.length - 1;

    const updatedDoc = {
      ...document,
      pages: updatedPages,
      activePageIndex: newIndex,
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
      engine.setObjects([], false);
      engine.setBackground(background, backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }

    void StorageService.saveAutosave(updatedDoc).then(() =>
      StorageService.collectUnusedMedia([updatedDoc])
    );
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
      activePageIndex: newActiveIndex,
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
      engine.setObjects(activePage.objects, false);
      engine.setBackground(activePage.background, activePage.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
    }

    void StorageService.saveAutosave(updatedDoc).then(() =>
      StorageService.collectUnusedMedia([updatedDoc])
    );
  },

  renamePage: (pageId: string, newTitle: string) => {
    const { document: doc } = get();
    const updatedPages = doc.pages.map((p) =>
      p.id === pageId ? { ...p, title: newTitle, updatedAt: Date.now() } : p
    );
    const updatedDoc = {
      ...doc,
      pages: updatedPages,
      updatedAt: Date.now(),
    };
    set({
      document: updatedDoc,
      isDirty: true,
    });
    void StorageService.saveAutosave(updatedDoc);
  },

  duplicatePage: (pageId) => {
    const { document } = get();
    const pageToDup = document.pages.find((p) => p.id === pageId);
    if (!pageToDup) return;

    const pageIndex = document.pages.findIndex((p) => p.id === pageId);
    const clonedPage: WhiteboardPage = {
      ...JSON.parse(JSON.stringify(pageToDup)),
      id: generateId('page'),
      objects: clonePageObjects(pageToDup.objects),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedPages = [...document.pages];
    updatedPages.splice(pageIndex + 1, 0, clonedPage);

    const reindexedPages = updatedPages.map((p, idx) => ({ ...p, order: idx }));

    const updatedDoc = {
      ...document,
      pages: reindexedPages,
      activePageIndex: pageIndex + 1,
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
      engine.setObjects(clonedPage.objects, false);
      engine.setBackground(clonedPage.background, clonedPage.backgroundType);
      engine.resetZoom();
      engine.getCommandManager().clear();
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
      activePageIndex: newActiveIndex,
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
      engine.setObjects(activePage.objects, false);
      engine.setBackground(activePage.background, activePage.backgroundType);
      engine.getCommandManager().clear();
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
});
