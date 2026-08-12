import { FreehandStroke } from '../types/whiteboard.types';
import {
  HandwritingRecognitionService,
  HandwritingRecognitionResult,
} from './HandwritingRecognitionService';

/**
 * Cloud handwriting recognition via Azure AI Vision 4.0 "Read".
 *
 * Azure's older Ink Recognizer (which consumed stroke data directly) was retired
 * on 31 January 2021. Image Analysis 4.0 is its replacement and reads cursive
 * handwriting from a rasterised image, so the ink is drawn to a canvas first.
 *
 * Credentials are supplied by the user at runtime and kept in localStorage --
 * nothing is compiled into the bundle, which is a static client-side build.
 */

const ENDPOINT_KEY = 'jhw_azure_vision_endpoint';
const API_KEY_KEY = 'jhw_azure_vision_key';

// Azure rejects images smaller than 50x50, and unlike Tesseract it does better
// with a generous resolution, so ink is rasterised larger for this path.
const AZURE_TARGET_LINE_HEIGHT = 120;
const AZURE_MIN_DIMENSION = 50;

export interface AzureVisionCredentials {
  endpoint: string;
  apiKey: string;
}

export class AzureInkRecognitionService {
  public static loadCredentials(): AzureVisionCredentials {
    try {
      return {
        endpoint: localStorage.getItem(ENDPOINT_KEY) || '',
        apiKey: localStorage.getItem(API_KEY_KEY) || '',
      };
    } catch {
      return { endpoint: '', apiKey: '' };
    }
  }

  public static saveCredentials(creds: AzureVisionCredentials): void {
    try {
      localStorage.setItem(ENDPOINT_KEY, creds.endpoint.trim());
      localStorage.setItem(API_KEY_KEY, creds.apiKey.trim());
    } catch {
      // Storage unavailable (private mode); the values simply won't persist.
    }
  }

  public static isConfigured(): boolean {
    const { endpoint, apiKey } = this.loadCredentials();
    return endpoint.length > 0 && apiKey.length > 0;
  }

  /** Normalises whatever the user pasted into a usable analyze URL. */
  private static buildAnalyzeUrl(endpoint: string): string {
    const base = endpoint.trim().replace(/\/+$/, '');
    return `${base}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read`;
  }

  /** Grows the canvas if either side is under Azure's 50px floor. */
  private static padToMinimum(canvas: HTMLCanvasElement): HTMLCanvasElement {
    if (canvas.width >= AZURE_MIN_DIMENSION && canvas.height >= AZURE_MIN_DIMENSION) {
      return canvas;
    }
    const padded = document.createElement('canvas');
    padded.width = Math.max(AZURE_MIN_DIMENSION, canvas.width);
    padded.height = Math.max(AZURE_MIN_DIMENSION, canvas.height);
    const ctx = padded.getContext('2d');
    if (!ctx) return canvas;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, padded.width, padded.height);
    ctx.drawImage(
      canvas,
      Math.round((padded.width - canvas.width) / 2),
      Math.round((padded.height - canvas.height) / 2)
    );
    return padded;
  }

  private static canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the handwriting sample as an image.'));
      }, 'image/png');
    });
  }

  /**
   * Recognises handwriting through Azure. Throws with a readable message on any
   * configuration, network or service error so the caller can fall back.
   */
  public static async recognizeStrokes(
    strokes: FreehandStroke[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<HandwritingRecognitionResult | null> {
    if (strokes.length === 0) return null;

    const { endpoint, apiKey } = this.loadCredentials();
    if (!endpoint || !apiKey) {
      throw new Error('Azure endpoint and key are not set. Add them in Recognition settings.');
    }

    onProgress?.(10, 'Preparing handwriting sample...');
    const rasterized = HandwritingRecognitionService.rasterizeStrokes(
      strokes,
      36,
      AZURE_TARGET_LINE_HEIGHT
    );
    const canvas = this.padToMinimum(rasterized.canvas);
    const blob = await this.canvasToBlob(canvas);

    onProgress?.(40, 'Sending to Azure AI Vision...');

    let response: Response;
    try {
      response = await fetch(this.buildAnalyzeUrl(endpoint), {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      });
    } catch {
      throw new Error('Could not reach Azure. Check the endpoint and your network connection.');
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Azure rejected the key (HTTP ' + response.status + '). Check the key and endpoint region.');
      }
      if (response.status === 429) {
        throw new Error('Azure rate limit reached. Wait a moment and try again.');
      }
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error?.message || '';
      } catch {
        // response body wasn't JSON
      }
      throw new Error(`Azure returned HTTP ${response.status}${detail ? ': ' + detail : ''}`);
    }

    onProgress?.(80, 'Reading Azure response...');
    const data = await response.json();

    // Image Analysis 4.0 shape: readResult.blocks[].lines[].{text, words[].confidence}
    const blocks: any[] = data?.readResult?.blocks || [];
    const lines: any[] = blocks.flatMap((b) => b?.lines || []);

    const text = lines
      .map((l) => (l?.text || '').trim())
      .filter((l) => l.length > 0)
      .join('\n');

    // Azure reports confidence per word, not per line.
    const wordConfidences: number[] = lines
      .flatMap((l) => l?.words || [])
      .map((w: any) => w?.confidence)
      .filter((c: any) => typeof c === 'number');

    const confidence = wordConfidences.length
      ? Math.round((wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length) * 100)
      : 0;

    if (!text) {
      throw new Error('Azure did not find any text in that handwriting.');
    }

    const lineCount = Math.max(1, text.split('\n').length);
    const suggestedFontSize = Math.max(
      16,
      Math.min(96, Math.round((rasterized.bbox.height / lineCount) * 0.65))
    );

    onProgress?.(100, 'Handwriting recognized by Azure.');

    return {
      text,
      confidence,
      bbox: rasterized.bbox,
      previewDataUrl: rasterized.previewDataUrl,
      suggestedFontSize,
      color: rasterized.primaryColor,
      strokeIds: strokes.map((s) => s.id),
    };
  }
}
