import { FreehandStroke } from '../types/whiteboard.types';
import {
  HandwritingRecognitionResult,
  HandwritingRecognitionService,
} from './HandwritingRecognitionService';

interface HandwritingApiResponse {
  text?: string;
  error?: string;
}

/**
 * Sends a high-contrast image of the selected ink to the application's own
 * Node endpoint. The Gemini API key remains exclusively on that server.
 */
export class GeminiVisionRecognitionService {
  public static async recognizeStrokes(
    strokes: FreehandStroke[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<HandwritingRecognitionResult | null> {
    const drawableStrokes = strokes.filter((stroke) => stroke.points.length > 0);
    if (drawableStrokes.length === 0) return null;

    onProgress?.(5, 'Preparing handwriting sample…');
    // Vision models benefit from a larger, high-contrast source image. The
    // bbox still remains in whiteboard coordinates for accurate replacement.
    const rasterized = HandwritingRecognitionService.rasterizeStrokes(drawableStrokes, 48, 128);

    onProgress?.(25, 'Sending selected ink to Gemini Vision…');
    let httpResponse: Response;
    try {
      httpResponse = await fetch('/api/handwriting-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ imageDataUrl: rasterized.canvas.toDataURL('image/png') }),
      });
    } catch {
      throw new Error(
        'Could not reach the Gemini handwriting server. Start the Node server and check the connection.'
      );
    }

    const payload = (await httpResponse.json().catch(() => ({}))) as HandwritingApiResponse;
    if (!httpResponse.ok) {
      throw new Error(payload.error ?? 'Gemini handwriting recognition failed. Please try again.');
    }

    const text = payload.text?.trim();
    if (!text) {
      throw new Error('Gemini could not read text in that selection. Select a single, clear line and try again.');
    }

    const lineCount = Math.max(1, text.split('\n').length);
    const suggestedFontSize = Math.max(
      16,
      Math.min(96, Math.round((rasterized.bbox.height / lineCount) * 0.65))
    );

    onProgress?.(100, 'Handwriting recognized by Gemini Vision.');
    return {
      text,
      confidence: null,
      engine: 'gemini',
      bbox: rasterized.bbox,
      previewDataUrl: rasterized.previewDataUrl,
      suggestedFontSize,
      color: rasterized.primaryColor,
      strokeIds: drawableStrokes.map((stroke) => stroke.id),
    };
  }
}
