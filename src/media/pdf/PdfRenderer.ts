import * as pdfjsLib from 'pdfjs-dist';
import { PdfObject } from '../../types';
import { MediaManager } from '../MediaManager';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Rasterises PDF pages on demand and keeps a small window of them in memory.
 *
 * A worksheet can run to dozens of pages, so nothing is rendered until it is
 * actually shown. The page either side of the current one is prefetched, because
 * that is where the teacher goes next, and anything outside that window is
 * dropped so a long document does not sit in memory as bitmaps.
 */

const PREFETCH_RADIUS = 1;
const RENDER_SCALE = 1.6; // legible on a large display without being wasteful

interface DocEntry {
  doc: pdfjsLib.PDFDocumentProxy;
  /** Kept so the worker-side document can be torn down, not just the pages. */
  task: pdfjsLib.PDFDocumentLoadingTask;
  pages: Map<number, HTMLCanvasElement>;
  rendering: Set<number>;
}

export class PdfRenderer {
  private static docs = new Map<string, DocEntry>();
  private static loading = new Set<string>();

  /** Called when a page finishes rasterising, so the board can redraw. */
  public static onPageReady: (() => void) | null = null;

  /**
   * The rendered bitmap for a page, or null if it is not ready yet. Kicks off
   * loading and prefetching as a side effect; callers just draw a placeholder
   * and wait for the redraw.
   */
  public static getPage(obj: PdfObject, pageNumber: number): HTMLCanvasElement | null {
    const entry = this.docs.get(obj.id);

    if (!entry) {
      void this.openDocument(obj);
      return null;
    }

    const cached = entry.pages.get(pageNumber);
    if (cached) {
      this.prefetchAround(obj, pageNumber);
      return cached;
    }

    void this.renderPage(obj.id, pageNumber);
    return null;
  }

  private static async openDocument(obj: PdfObject): Promise<void> {
    if (this.loading.has(obj.id) || this.docs.has(obj.id)) return;
    this.loading.add(obj.id);

    try {
      const blob = await MediaManager.getBlob(obj.assetId);
      if (!blob) {
        console.warn(`PDF asset ${obj.assetId} is missing from storage.`);
        return;
      }
      const data = await blob.arrayBuffer();
      const task = pdfjsLib.getDocument({ data });
      const doc = await task.promise;
      this.docs.set(obj.id, { doc, task, pages: new Map(), rendering: new Set() });
      await this.renderPage(obj.id, obj.currentPage);
    } catch (err) {
      console.warn('Could not open PDF:', err);
    } finally {
      this.loading.delete(obj.id);
    }
  }

  private static async renderPage(objectId: string, pageNumber: number): Promise<void> {
    const entry = this.docs.get(objectId);
    if (!entry) return;
    if (entry.pages.has(pageNumber) || entry.rendering.has(pageNumber)) return;
    if (pageNumber < 1 || pageNumber > entry.doc.numPages) return;

    entry.rendering.add(pageNumber);
    try {
      const page = await entry.doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
      entry.pages.set(pageNumber, canvas);
      this.onPageReady?.();
    } catch (err) {
      console.warn(`Could not render PDF page ${pageNumber}:`, err);
    } finally {
      entry.rendering.delete(pageNumber);
    }
  }

  /** Renders the neighbours and drops pages outside the window. */
  private static prefetchAround(obj: PdfObject, pageNumber: number): void {
    const entry = this.docs.get(obj.id);
    if (!entry) return;

    for (let offset = 1; offset <= PREFETCH_RADIUS; offset++) {
      void this.renderPage(obj.id, pageNumber - offset);
      void this.renderPage(obj.id, pageNumber + offset);
    }

    for (const cachedPage of Array.from(entry.pages.keys())) {
      if (Math.abs(cachedPage - pageNumber) > PREFETCH_RADIUS) {
        entry.pages.delete(cachedPage);
      }
    }
  }

  /** Page count and natural size, read once at import. */
  public static async probe(
    blob: Blob
  ): Promise<{ pageCount: number; pageWidth: number; pageHeight: number; posterDataUrl: string }> {
    const data = await blob.arrayBuffer();
    const task = pdfjsLib.getDocument({ data });
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const posterScale = Math.min(1.5, 900 / Math.max(1, viewport.width));
    const posterViewport = page.getViewport({ scale: posterScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(posterViewport.width));
    canvas.height = Math.max(1, Math.floor(posterViewport.height));
    const ctx = canvas.getContext('2d');

    let posterDataUrl = '';
    if (ctx) {
      await page.render({ canvas, canvasContext: ctx, viewport: posterViewport } as any).promise;
      posterDataUrl = canvas.toDataURL('image/jpeg', 0.75);
    }

    const result = {
      pageCount: doc.numPages,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      posterDataUrl,
    };
    void doc.cleanup();
    void task.destroy();
    return result;
  }

  /** Frees everything held for an object, e.g. when it is deleted. */
  public static release(objectId: string): void {
    const entry = this.docs.get(objectId);
    if (entry) {
      entry.pages.clear();
      void entry.doc.cleanup();
      void entry.task.destroy();
      this.docs.delete(objectId);
    }
  }

  public static releaseAll(): void {
    for (const id of Array.from(this.docs.keys())) this.release(id);
  }

  /** Pages currently held in memory, for verifying the window behaviour. */
  public static cachedPageCount(objectId: string): number {
    return this.docs.get(objectId)?.pages.size ?? 0;
  }
}
