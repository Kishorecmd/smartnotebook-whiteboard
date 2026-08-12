import { WhiteboardPage, FreehandStroke, ShapeObject, TextObject, ImageObject, YouTubeVideoObject } from '../types';
import { StrokeRenderer, ShapeRenderer, TextRenderer } from '../canvas';

/**
 * Draws an image-like object (image or YouTube poster) once it has decoded.
 * Export is synchronous, so anything still loading is simply skipped rather than
 * blocking the export.
 */
function drawLoadedImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  obj: { x: number; y: number; width: number; height: number; rotation?: number },
  cache: Map<string, HTMLImageElement>
): void {
  const img = cache.get(src);
  if (!img || !img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.translate(obj.x, obj.y);
  if (obj.rotation) {
    ctx.translate(obj.width / 2, obj.height / 2);
    ctx.rotate(obj.rotation);
    ctx.translate(-obj.width / 2, -obj.height / 2);
  }
  ctx.drawImage(img, 0, 0, obj.width, obj.height);
  ctx.restore();
}

/** Preloads every image the page needs so the synchronous draw pass can use them. */
async function preloadPageImages(page: WhiteboardPage): Promise<Map<string, HTMLImageElement>> {
  const sources: string[] = [];
  for (const obj of page.objects) {
    if (obj.type === 'image') sources.push((obj as ImageObject).dataUrl);
    if (obj.type === 'youtubeVideo') {
      const v = obj as YouTubeVideoObject;
      sources.push(v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`);
    }
  }

  const cache = new Map<string, HTMLImageElement>();
  await Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // keeps the export canvas untainted
          img.onload = () => { cache.set(src, img); resolve(); };
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
  return cache;
}

export interface ExportImageOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
  includeBackground?: boolean;
  filename?: string;
}

export class ExportService {
  /**
   * Exports a Whiteboard Page to PNG or JPEG format.
   */
  public static async exportPageToImage(
    page: WhiteboardPage,
    options: ExportImageOptions = {}
  ): Promise<void> {
    const format = options.format || 'png';
    const quality = options.quality ?? 0.95;
    const scale = options.scale ?? 2; // 2x high resolution
    const includeBackground = options.includeBackground ?? true;
    const filename = (options.filename || page.title || 'whiteboard_page')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    // Determine canvas dimensions
    const width = page.width || 1920;
    const height = page.height || 1080;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width * scale;
    offscreenCanvas.height = height * scale;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    // Scale canvas context for high-res output
    ctx.scale(scale, scale);

    // 1. Draw Background
    if (includeBackground) {
      ctx.fillStyle = page.background || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw all page objects (sorted by zIndex). Previously only strokes were
    // drawn, so shapes, text, images and videos were silently missing from exports.
    const imageCache = await preloadPageImages(page);
    const objects = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);
    for (const obj of objects) {
      if (obj.visible === false) continue;

      if (obj.type === 'stroke') {
        StrokeRenderer.renderStroke(ctx, obj as FreehandStroke);
      } else if (obj.type === 'shape') {
        ShapeRenderer.renderShape(ctx, obj as ShapeObject);
      } else if (obj.type === 'text') {
        TextRenderer.renderText(ctx, obj as TextObject);
      } else if (obj.type === 'image') {
        drawLoadedImage(ctx, (obj as ImageObject).dataUrl, obj, imageCache);
      } else if (obj.type === 'youtubeVideo') {
        const v = obj as YouTubeVideoObject;
        drawLoadedImage(ctx, v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`, obj, imageCache);
      }
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = offscreenCanvas.toDataURL(mimeType, quality);

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${filename}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  /**
   * Generates SVG XML text representation of a page.
   */
  public static generateSVG(page: WhiteboardPage): string {
    const width = page.width || 1920;
    const height = page.height || 1080;
    const bg = page.background || '#ffffff';

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <rect width="100%" height="100%" fill="${bg}"/>\n`;

    const objects = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);

    for (const obj of objects) {
      if (obj.type === 'stroke' && obj.points.length > 0) {
        const stroke = obj as FreehandStroke;
        const pts = stroke.points;

        if (pts.length === 1) {
          svg += `  <circle cx="${pts[0].x}" cy="${pts[0].y}" r="${stroke.width / 2}" fill="${stroke.color}" opacity="${stroke.opacity}"/>\n`;
        } else if (pts.length === 2) {
          svg += `  <line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" opacity="${stroke.opacity}"/>\n`;
        } else {
          let pathData = `M ${pts[0].x} ${pts[0].y}`;
          for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            pathData += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
          }
          pathData += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

          svg += `  <path d="${pathData}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" opacity="${stroke.opacity}"/>\n`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Exports a Whiteboard Page to SVG vector file.
   */
  public static exportPageToSVG(page: WhiteboardPage, filename?: string): void {
    const svgContent = this.generateSVG(page);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safeName = (filename || page.title || 'whiteboard_page')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeName}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Triggers high-quality multi-page print stream.
   */
  public static printDocument(): void {
    window.print();
  }
}
