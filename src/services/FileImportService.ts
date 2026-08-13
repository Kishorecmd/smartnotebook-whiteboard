import * as pdfjsLib from 'pdfjs-dist';
import { ImageObject, Point } from '../types';
import { generateId } from '../utils';

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export class FileImportService {
  /**
   * Imports an image file and returns an ImageObject placed at the specified center point.
   */
  /**
   * @param maxDisplaySize Optional box, in world units, the image should fit inside.
   * A photo straight off a phone is several thousand pixels across and would other-
   * wise be placed at that size, dwarfing the board. The intrinsic size is still
   * recorded in originalWidth/originalHeight.
   */
  public static async importImage(
    file: File,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<ImageObject> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        // Load image to get intrinsic dimensions
        const img = new Image();
        img.onload = () => {
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;

          // Shrink to fit while preserving aspect ratio; never scale small images up.
          let fitScale = 1;
          if (maxDisplaySize && maxDisplaySize.width > 0 && maxDisplaySize.height > 0) {
            fitScale = Math.min(
              1,
              maxDisplaySize.width / naturalWidth,
              maxDisplaySize.height / naturalHeight
            );
          }
          const width = Math.max(1, Math.round(naturalWidth * fitScale));
          const height = Math.max(1, Math.round(naturalHeight * fitScale));

          const now = Date.now();
          const imageObject: ImageObject = {
            id: generateId('image'),
            type: 'image',
            x: centerPoint.x - width / 2,
            y: centerPoint.y - height / 2,
            width,
            height,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            dataUrl,
            mimeType: file.type,
            originalWidth: naturalWidth,
            originalHeight: naturalHeight,
            createdAt: now,
            updatedAt: now,
          };

          resolve(imageObject);
        };
        img.onerror = () => reject(new Error('Failed to load image to calculate dimensions.'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file as DataURL.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Imports a PDF file and returns an array of ImageObjects, one for each page.
   * Rendered sequentially, offset vertically.
   */
  public static async importPdfAsImages(file: File, startPoint: Point, scale: number = 2.0): Promise<ImageObject[]> {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    const numPages = pdfDocument.numPages;
    const images: ImageObject[] = [];
    
    let currentY = startPoint.y;
    const padding = 50; // Vertical padding between pages

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Failed to create canvas context for PDF rendering.');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };
      
      await page.render(renderContext as any).promise;
      
      const dataUrl = canvas.toDataURL('image/png');
      const now = Date.now();
      
      // Calculate display width based on the scale to ensure it fits well on the whiteboard
      const displayWidth = viewport.width / scale;
      const displayHeight = viewport.height / scale;
      
      const imageObject: ImageObject = {
        id: generateId('image'),
        type: 'image',
        x: startPoint.x - displayWidth / 2, // Centered horizontally on the start point
        y: currentY,
        width: displayWidth,
        height: displayHeight,
        rotation: 0,
        zIndex: 0,
        visible: true,
        locked: false,
        dataUrl,
        mimeType: 'image/png', // Rendered PDF page is saved as a PNG data URL
        originalWidth: viewport.width,
        originalHeight: viewport.height,
        createdAt: now,
        updatedAt: now,
      };
      
      images.push(imageObject);
      currentY += displayHeight + padding;
    }
    
    return images;
  }
}
