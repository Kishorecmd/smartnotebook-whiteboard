import * as pdfjsLib from 'pdfjs-dist';
import { ImageObject, Point, VideoObject } from '../types';
import { generateId } from '../utils';
import { StorageService } from './StorageService';

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
   * Imports a local video file. The blob is stored in IndexedDB and referenced by
   * id; a still frame is captured so the board can render and export the video
   * without decoding it. Rejects with a readable message if the browser can't
   * decode the file.
   */
  public static async importVideo(
    file: File,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<VideoObject> {
    const objectUrl = URL.createObjectURL(file);

    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () =>
          reject(new Error(`This browser can't play ${file.type || 'that video format'}. Try an MP4 (H.264).`));
      });

      const naturalWidth = video.videoWidth || 640;
      const naturalHeight = video.videoHeight || 360;

      // Seek a little way in: frame zero of a video is very often black.
      const posterTime = Math.min(1, (video.duration || 1) / 10);
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = done;
        video.onerror = done;
        try {
          video.currentTime = posterTime;
        } catch {
          resolve();
        }
        setTimeout(resolve, 2000); // don't hang on a codec that won't seek
      });

      const posterCanvas = document.createElement('canvas');
      posterCanvas.width = naturalWidth;
      posterCanvas.height = naturalHeight;
      const posterCtx = posterCanvas.getContext('2d');
      let posterDataUrl = '';
      if (posterCtx) {
        try {
          posterCtx.drawImage(video, 0, 0, naturalWidth, naturalHeight);
          posterDataUrl = posterCanvas.toDataURL('image/jpeg', 0.7);
        } catch {
          posterDataUrl = '';
        }
      }

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

      const mediaId = generateId('media');
      await StorageService.saveMedia(mediaId, file);

      const now = Date.now();
      return {
        id: generateId('video'),
        type: 'video',
        mediaId,
        mimeType: file.type,
        posterDataUrl,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
        fileName: file.name,
        muted: false,
        loop: false,
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
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
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
