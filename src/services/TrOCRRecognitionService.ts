import { FreehandStroke } from '../types/whiteboard.types';
import {
  HandwritingRecognitionResult,
  HandwritingRecognitionService,
} from './HandwritingRecognitionService';

interface PendingRecognition {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number, status: string) => void;
}

interface TrOCRWorkerMessage {
  type: 'progress' | 'result' | 'error';
  requestId: number;
  progress?: number;
  status?: string;
  text?: string;
  message?: string;
}

/**
 * Runs Microsoft's TrOCR-small handwritten model in a module worker. The model
 * is downloaded by the browser the first time it is needed; selected ink is
 * passed only to the local worker and never to a recognition API.
 */
export class TrOCRRecognitionService {
  private static worker: Worker | null = null;
  private static requestId = 0;
  private static pending = new Map<number, PendingRecognition>();

  private static getWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL('../workers/TrOCRWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<TrOCRWorkerMessage>) => {
      const { type, requestId, progress, status, text, message } = event.data;
      const pending = this.pending.get(requestId);
      if (!pending) return;

      if (type === 'progress') {
        pending.onProgress?.(progress ?? 0, status ?? 'Loading handwriting model…');
        return;
      }

      this.pending.delete(requestId);
      if (type === 'result') {
        pending.resolve(text ?? '');
      } else {
        pending.reject(new Error(message ?? 'Handwriting recognition failed.'));
      }
    };

    worker.onerror = (event) => {
      const error = new Error(event.message || 'The handwriting recognition worker stopped unexpectedly.');
      this.rejectPending(error);
      worker.terminate();
      if (this.worker === worker) this.worker = null;
    };

    this.worker = worker;
    return worker;
  }

  private static rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private static recognizeImage(
    imageDataUrl: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<string> {
    const requestId = ++this.requestId;
    const worker = this.getWorker();

    return new Promise<string>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, onProgress });
      worker.postMessage({ type: 'recognize', requestId, imageDataUrl });
    });
  }

  public static async recognizeStrokes(
    strokes: FreehandStroke[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<HandwritingRecognitionResult | null> {
    const drawableStrokes = strokes.filter((stroke) => stroke.points.length > 0);
    if (drawableStrokes.length === 0) return null;

    onProgress?.(5, 'Preparing handwriting sample…');
    const rasterized = HandwritingRecognitionService.rasterizeStrokes(drawableStrokes, 36, 64);
    const text = await this.recognizeImage(rasterized.canvas.toDataURL('image/png'), onProgress);

    if (!text) {
      throw new Error('TrOCR could not detect text in that handwriting. Select one clear line and try again.');
    }

    const lineCount = Math.max(1, text.split('\n').length);
    const suggestedFontSize = Math.max(
      16,
      Math.min(96, Math.round((rasterized.bbox.height / lineCount) * 0.65))
    );

    onProgress?.(100, 'Handwriting recognized locally.');

    return {
      text,
      // TrOCR's browser pipeline produces text but not a calibrated confidence
      // score, so the UI deliberately presents this as an AI result instead.
      confidence: null,
      engine: 'trocr',
      bbox: rasterized.bbox,
      previewDataUrl: rasterized.previewDataUrl,
      suggestedFontSize,
      color: rasterized.primaryColor,
      strokeIds: drawableStrokes.map((stroke) => stroke.id),
    };
  }

  public static terminate(): void {
    this.rejectPending(new Error('Handwriting recognition was stopped.'));
    this.worker?.terminate();
    this.worker = null;
  }
}
