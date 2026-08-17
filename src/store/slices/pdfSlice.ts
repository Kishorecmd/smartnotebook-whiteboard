import { ImageObject } from '../../types';
import { createPageObject } from '../../models';
import { StorageService } from '../../services';
import type { PdfSlice, SliceCreator } from '../types';

export const createPdfSlice: SliceCreator<PdfSlice> = (set, get) => ({
  isPdfImportModalOpen: false,
  pendingPdfImages: [],

  setPdfImportModalOpen: (open: boolean, images?: ImageObject[]) => {
    set({
      isPdfImportModalOpen: open,
      pendingPdfImages: images || [],
    });
  },

  importPdfAsSlides: () => {
    const { pendingPdfImages, document: doc, activePageIndex } = get();
    if (pendingPdfImages.length === 0) return;

    // An empty active page is consumed by the first slide; otherwise the whole
    // run is inserted directly after it.
    const replacesActivePage = doc.pages[activePageIndex].objects.length === 0;
    const insertAt = replacesActivePage ? activePageIndex : activePageIndex + 1;

    const importedPages = pendingPdfImages.map((img, index) => {
      const newPage = createPageObject(insertAt + index, '#ffffff', 'plain');

      // Move image to center of a reasonable viewport, say (0, 0)
      const centeredImg: ImageObject = {
        ...img,
        x: -img.width / 2,
        y: -img.height / 2,
      };

      newPage.objects = [centeredImg];
      return newPage;
    });

    const updatedPages = [...doc.pages];
    updatedPages.splice(insertAt, replacesActivePage ? 1 : 0, ...importedPages);

    // Land on the last imported slide.
    const newActiveIndex = insertAt + importedPages.length - 1;
    const updatedDoc = {
      ...doc,
      pages: updatedPages.map((p, idx) => ({ ...p, order: idx })),
      activePageIndex: newActiveIndex,
      updatedAt: Date.now(),
    };

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

    StorageService.saveAutosave(updatedDoc);
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
});
