import * as pdfjsLib from 'pdfjs-dist';
import { ImageObject, Point, VideoObject } from '../types';
import { generateId } from '../utils';
import { AssetManager } from '../assets/AssetManager';
import { MediaManager } from '../media/MediaManager';

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export class FileImportService {
  /**
   * Imports an image blob and returns an ImageObject placed at the specified center point.
   */
  public static async importImageBlob(
    blob: Blob,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<ImageObject> {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(blob.type)) {
      throw new Error(`This image format (${blob.type || 'unknown'}) is not supported.`);
    }

    const assetId = await AssetManager.addImage(blob, blob.type);
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      // Load image to get intrinsic dimensions
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        MediaManager.updateAssetRecord(assetId, { naturalWidth, naturalHeight });

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
          assetId,
          mimeType: blob.type,
          originalWidth: naturalWidth,
          originalHeight: naturalHeight,
          createdAt: now,
          updatedAt: now,
        };

        URL.revokeObjectURL(objectUrl);
        resolve(imageObject);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image to calculate dimensions.'));
      };
      img.src = objectUrl;
    });
  }

  /**
   * Fetches an image from a URL and imports it via importImageBlob.
   */
  public static async importImageUrl(
    url: string,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<ImageObject> {
    let response: Response;
    try {
      // Intentionally avoiding mode: 'no-cors' so we get readable image data or fail with a clear CORS error.
      response = await fetch(url);
    } catch {
      throw new Error('This website prevents direct image import. Try Copy image or download the image first.');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('The URL did not return a valid image.');
    }

    const blob = await response.blob();
    return FileImportService.importImageBlob(blob, centerPoint, maxDisplaySize);
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

      const asset = await MediaManager.putAsset(file, 'video', {
        fileName: file.name,
        mimeType: file.type,
        thumbnailDataUrl: posterDataUrl,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
        naturalWidth,
        naturalHeight,
      });

      const now = Date.now();
      return {
        id: generateId('video'),
        type: 'video',
        mediaId: asset.id,
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
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob for PDF page');
      
      const assetId = await AssetManager.addImage(blob, 'image/png', { includeInLibrary: false });
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
        assetId,
        mimeType: 'image/png', // Rendered PDF page is saved as a PNG
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
