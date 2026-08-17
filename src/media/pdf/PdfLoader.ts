import { PdfObject, Point } from '../../types';
import { generateId } from '../../utils';
import { MediaManager } from '../MediaManager';
import { PdfRenderer } from './PdfRenderer';

/**
 * Imports a PDF as a single board object (Mode B). The file is stored once and
 * referenced; only the first-page poster travels in the document so a saved
 * board stays small and still previews without opening the PDF.
 */
export class PdfLoader {
  public static async importPdf(
    file: File,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<PdfObject> {
    const probe = await PdfRenderer.probe(file);

    const asset = await MediaManager.putAsset(file, 'pdf', {
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      naturalWidth: probe.pageWidth,
      naturalHeight: probe.pageHeight,
      pageCount: probe.pageCount,
      thumbnailDataUrl: probe.posterDataUrl,
    });

    // Land at a readable size inside the current view rather than at the PDF's
    // own point size, which is usually far larger than the visible board.
    let fit = 1;
    if (maxDisplaySize && maxDisplaySize.width > 0 && maxDisplaySize.height > 0) {
      fit = Math.min(1, maxDisplaySize.width / probe.pageWidth, maxDisplaySize.height / probe.pageHeight);
    }
    const width = Math.max(120, Math.round(probe.pageWidth * fit));
    const height = Math.max(120, Math.round(probe.pageHeight * fit));

    const now = Date.now();
    return {
      id: generateId('pdf'),
      type: 'pdf',
      assetId: asset.id,
      fileName: file.name,
      pageCount: probe.pageCount,
      currentPage: 1,
      posterDataUrl: probe.posterDataUrl,
      pageWidth: probe.pageWidth,
      pageHeight: probe.pageHeight,
      pageRotation: 0,
      fitMode: 'fit',
      x: centerPoint.x - width / 2,
      y: centerPoint.y - height / 2,
      width,
      height,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
  }
}
