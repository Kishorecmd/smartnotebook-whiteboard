import {
  WhiteboardPage,
  FreehandStroke,
  ShapeObject,
  TextObject,
  ImageObject,
  YouTubeVideoObject,
  WebAppObject,
  VideoObject,
  AudioObject,
  ImageAudioObject,
  PdfObject,
  ColoringRegion,
  CircleObject,
  ArcObject,
  CompassObject,
  TeachingToolObject,
  WhiteboardDocument,
  WhiteboardObject,
} from '../types';
import { StrokeRenderer, ShapeRenderer, TextRenderer } from '../canvas';
import { AudioCardRenderer } from '../media/audio/AudioCardRenderer';
import { GeometryRenderer } from '../drawing/shapes/GeometryRenderer';
import { CompassRenderer } from '../teaching-tools/compass/CompassRenderer';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';
import { PdfRenderer } from '../media/pdf/PdfRenderer';

function drawPageBackground(
  ctx: CanvasRenderingContext2D,
  page: WhiteboardPage,
  width: number,
  height: number,
): void {
  const background = page.background || '#ffffff';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  if (!page.backgroundType || page.backgroundType === 'plain' || page.backgroundType === 'chalkboard') return;

  const dark = background === '#1e293b' || background === '#1e382b';
  const spacing = 40;
  ctx.save();
  if (page.backgroundType === 'dots') {
    ctx.fillStyle = dark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)';
    for (let x = 0; x <= width; x += spacing) {
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (page.backgroundType === 'grid') {
      for (let x = 0; x <= width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    }
    for (let y = 0; y <= height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawMediaPlaceholder(
  ctx: CanvasRenderingContext2D,
  obj: { x: number; y: number; width: number; height: number; rotation?: number },
  title: string,
  detail = '',
): void {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  if (obj.rotation) {
    ctx.translate(obj.width / 2, obj.height / 2);
    ctx.rotate(obj.rotation);
    ctx.translate(-obj.width / 2, -obj.height / 2);
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, obj.width, obj.height);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, obj.width, obj.height);
  ctx.fillStyle = '#f8fafc';
  ctx.font = `600 ${Math.max(12, Math.min(24, obj.height * 0.12))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, obj.width / 2, obj.height / 2 - (detail ? 12 : 0), obj.width - 24);
  if (detail) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `400 ${Math.max(10, Math.min(14, obj.height * 0.08))}px Inter, sans-serif`;
    ctx.fillText(detail, obj.width / 2, obj.height / 2 + 18, obj.width - 24);
  }
  ctx.restore();
}

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

function drawImageContent(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  obj: ImageObject,
): void {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  if (obj.rotation) {
    ctx.translate(obj.width / 2, obj.height / 2);
    ctx.rotate(obj.rotation);
    ctx.translate(-obj.width / 2, -obj.height / 2);
  }
  if (obj.flipX || obj.flipY) {
    ctx.translate(obj.flipX ? obj.width : 0, obj.flipY ? obj.height : 0);
    ctx.scale(obj.flipX ? -1 : 1, obj.flipY ? -1 : 1);
  }
  if (obj.crop) {
    ctx.drawImage(
      image,
      obj.crop.x * image.naturalWidth,
      obj.crop.y * image.naturalHeight,
      obj.crop.width * image.naturalWidth,
      obj.crop.height * image.naturalHeight,
      0,
      0,
      obj.width,
      obj.height,
    );
  } else {
    ctx.drawImage(image, 0, 0, obj.width, obj.height);
  }
  ctx.restore();
}

function drawPdfImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pdf: PdfObject,
): void {
  ctx.save();
  ctx.translate(pdf.x, pdf.y);
  if (pdf.rotation) {
    ctx.translate(pdf.width / 2, pdf.height / 2);
    ctx.rotate(pdf.rotation);
    ctx.translate(-pdf.width / 2, -pdf.height / 2);
  }
  const quarterTurns = ((pdf.pageRotation / 90) | 0) % 4;
  if (quarterTurns) {
    ctx.translate(pdf.width / 2, pdf.height / 2);
    ctx.rotate((quarterTurns * Math.PI) / 2);
    const width = quarterTurns % 2 === 0 ? pdf.width : pdf.height;
    const height = quarterTurns % 2 === 0 ? pdf.height : pdf.width;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  } else {
    ctx.drawImage(image, 0, 0, pdf.width, pdf.height);
  }
  ctx.restore();
}

/** Preloads every image the page needs so the synchronous draw pass can use them. */
interface PreloadedPageImages {
  cache: Map<string, HTMLImageElement>;
  sourceByObjectId: Map<string, string>;
  temporaryObjectUrls: string[];
}

async function preloadPageImages(page: WhiteboardPage): Promise<PreloadedPageImages> {
  const sources: string[] = [];
  const sourceByObjectId = new Map<string, string>();
  const temporaryObjectUrls: string[] = [];
  
  // We may need to resolve asset IDs
  const { AssetManager } = await import('../assets/AssetManager');

  for (const obj of page.objects) {
    if (obj.type === 'image') {
      const imgObj = obj as ImageObject;
      // Asset IDs remain valid across reloads; `src` may be an expired blob URL
      // inherited from an older saved document.
      if (imgObj.assetId) {
        const url = await AssetManager.getImageUrl(imgObj.assetId);
        if (url) {
          sources.push(url);
          sourceByObjectId.set(imgObj.id, url);
          temporaryObjectUrls.push(url);
        }
      } else if (imgObj.dataUrl) {
        sources.push(imgObj.dataUrl);
        sourceByObjectId.set(imgObj.id, imgObj.dataUrl);
      } else if (imgObj.src) {
        sources.push(imgObj.src);
        sourceByObjectId.set(imgObj.id, imgObj.src);
      }
    }
    if (obj.type === 'youtubeVideo') {
      const v = obj as YouTubeVideoObject;
      sources.push(v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`);
    }
    if (obj.type === 'video') {
      const v = obj as VideoObject;
      if (v.posterDataUrl) sources.push(v.posterDataUrl);
    }
    if (obj.type === 'image-audio') {
      const media = obj as ImageAudioObject;
      if (media.imageAssetId) {
        const url = await AssetManager.getImageUrl(media.imageAssetId);
        if (url) {
          sources.push(url);
          sourceByObjectId.set(media.id, url);
          temporaryObjectUrls.push(url);
        }
      } else if (media.imageDataUrl) {
        sources.push(media.imageDataUrl);
        sourceByObjectId.set(media.id, media.imageDataUrl);
      }
    }
    if (obj.type === 'pdf') {
      const pdf = obj as PdfObject;
      const renderedPage = await PdfRenderer.renderForExport(pdf);
      if (renderedPage) {
        sources.push(renderedPage);
        sourceByObjectId.set(pdf.id, renderedPage);
      }
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
  return { cache, sourceByObjectId, temporaryObjectUrls };
}

export interface ExportImageOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
  includeBackground?: boolean;
  filename?: string;
  /** Internal consumers such as multi-page printing can render without downloading. */
  download?: boolean;
}

export interface ExportSVGOptions {
  includeBackground?: boolean;
  filename?: string;
  download?: boolean;
}

export interface ExportPdfOptions {
  scale?: number;
  quality?: number;
  filename?: string;
  download?: boolean;
}

export interface ExportArchiveOptions {
  format?: 'png' | 'jpeg' | 'svg';
  scale?: number;
  quality?: number;
  includeBackground?: boolean;
  filename?: string;
  download?: boolean;
}

const escapeXml = (value: unknown): string => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const svgKeepsVector = (object: WhiteboardObject): boolean => {
  if (object.type === 'stroke') {
    const mode = object.penSettings?.renderMode;
    return !mode || mode === 'solid';
  }
  if (object.type === 'text' && (object.backgroundColor && object.backgroundColor !== 'transparent' || object.underline)) {
    return false;
  }
  return ['shape', 'text', 'coloringRegion', 'circle', 'arc', 'group'].includes(object.type);
};

const svgBackground = (page: WhiteboardPage, width: number, height: number): string => {
  const background = escapeXml(page.background || '#ffffff');
  const type = page.backgroundType || 'plain';
  if (type === 'plain' || type === 'chalkboard') return `  <rect width="100%" height="100%" fill="${background}"/>\n`;
  const dark = page.background === '#1e293b' || page.background === '#1e382b';
  const ink = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)';
  let mark = '';
  if (type === 'dots') mark = `<circle cx="1.5" cy="1.5" r="1.5" fill="${ink}"/>`;
  else if (type === 'lines') mark = `<path d="M0 39.5H40" fill="none" stroke="${ink}"/>`;
  else mark = `<path d="M39.5 0V40M0 39.5H40" fill="none" stroke="${ink}"/>`;
  return `  <defs><pattern id="page-pattern" width="40" height="40" patternUnits="userSpaceOnUse">${mark}</pattern></defs>\n  <rect width="${width}" height="${height}" fill="${background}"/>\n  <rect width="${width}" height="${height}" fill="url(#page-pattern)"/>\n`;
};

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};

const textBytes = (value: string): Uint8Array => new TextEncoder().encode(value);
const uint16 = (value: number): Uint8Array => new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
const uint32 = (value: number): Uint8Array => new Uint8Array([
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
]);

const dataUrlBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) output[index] = binary.charCodeAt(index);
  return output;
};

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

export interface ArchiveFile { name: string; bytes: Uint8Array; }

/** Creates a standards-compliant, uncompressed ZIP without adding a large runtime dependency. */
export const buildStoredZip = (files: ArchiveFile[]): Blob => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const file of files) {
    const name = textBytes(file.name);
    const crc = crc32(file.bytes);
    const localHeader = concatBytes(
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(file.bytes.length), uint32(file.bytes.length), uint16(name.length), uint16(0), name,
    );
    localParts.push(localHeader, file.bytes);
    centralParts.push(concatBytes(
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(file.bytes.length), uint32(file.bytes.length), uint16(name.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(localOffset), name,
    ));
    localOffset += localHeader.length + file.bytes.length;
  }
  const central = concatBytes(...centralParts);
  const end = concatBytes(
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(central.length), uint32(localOffset), uint16(0),
  );
  const zipBytes = concatBytes(...localParts, central, end);
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
};

export interface PdfJpegPage {
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  pageWidth: number;
  pageHeight: number;
}

/** Builds a real multi-page PDF with one high-quality JPEG XObject per lesson page. */
export const buildPdfFromJpegPages = (pages: PdfJpegPage[]): Blob => {
  if (pages.length === 0) throw new Error('A PDF needs at least one page.');
  const objects = new Map<number, Uint8Array>();
  objects.set(1, textBytes('<< /Type /Catalog /Pages 2 0 R >>'));
  const pageObjectIds = pages.map((_, index) => 3 + index * 3);
  objects.set(2, textBytes(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`));

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const content = textBytes(`q\n${page.pageWidth} 0 0 ${page.pageHeight} 0 0 cm\n/Im0 Do\nQ`);
    objects.set(pageId, textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.pageWidth} ${page.pageHeight}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.set(contentId, concatBytes(textBytes(`<< /Length ${content.length} >>\nstream\n`), content, textBytes('\nendstream')));
    objects.set(imageId, concatBytes(
      textBytes(`<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),
      page.jpeg,
      textBytes('\nendstream'),
    ));
  });

  const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  const body: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;
  const count = 2 + pages.length * 3;
  for (let id = 1; id <= count; id++) {
    const wrapped = concatBytes(textBytes(`${id} 0 obj\n`), objects.get(id)!, textBytes('\nendobj\n'));
    offsets[id] = offset;
    body.push(wrapped);
    offset += wrapped.length;
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= count; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  const trailer = `${xref}trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const pdfBytes = concatBytes(...body, textBytes(trailer));
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
};

export class ExportService {
  private static safeName(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'whiteboard';
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Exports a Whiteboard Page to PNG or JPEG format.
   */
  public static async exportPageToImage(
    page: WhiteboardPage,
    options: ExportImageOptions = {}
  ): Promise<string> {
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
    if (!ctx) return '';

    // Scale canvas context for high-res output
    ctx.scale(scale, scale);

    // 1. Draw Background
    if (includeBackground) {
      drawPageBackground(ctx, page, width, height);
    }

    // 2. Draw all page objects (sorted by zIndex). Previously only strokes were
    // drawn, so shapes, text, images and videos were silently missing from exports.
    const { cache: imageCache, sourceByObjectId, temporaryObjectUrls } = await preloadPageImages(page);
    try {
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
          const imgObj = obj as ImageObject;
          const imageSource = sourceByObjectId.get(imgObj.id) || '';
          const image = imageCache.get(imageSource);
          if (image?.complete && image.naturalWidth > 0) drawImageContent(ctx, image, imgObj);
          else drawMediaPlaceholder(ctx, imgObj, 'Image unavailable');
        } else if (obj.type === 'youtubeVideo') {
          const v = obj as YouTubeVideoObject;
          const source = v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
          const image = imageCache.get(source);
          if (image?.complete && image.naturalWidth > 0) drawLoadedImage(ctx, source, obj, imageCache);
          else drawMediaPlaceholder(ctx, obj, 'YouTube Video', v.title || v.videoId);
        } else if (obj.type === 'video') {
          const v = obj as VideoObject;
          const image = v.posterDataUrl ? imageCache.get(v.posterDataUrl) : undefined;
          if (v.posterDataUrl && image?.complete && image.naturalWidth > 0) drawLoadedImage(ctx, v.posterDataUrl, obj, imageCache);
          else drawMediaPlaceholder(ctx, obj, 'Video', v.fileName || 'Local video');
        } else if (obj.type === 'audio') {
          AudioCardRenderer.renderAudioCard(ctx, obj as AudioObject, {
            playing: false,
            progress: 0,
            currentTime: 0,
          });
        } else if (obj.type === 'image-audio') {
          const media = obj as ImageAudioObject;
          ctx.save();
          ctx.translate(media.x, media.y);
          if (media.rotation) {
            ctx.translate(media.width / 2, media.height / 2);
            ctx.rotate(media.rotation);
            ctx.translate(-media.width / 2, -media.height / 2);
          }
          const pictureHeight = Math.max(0, media.height - media.playerHeight);
          const source = sourceByObjectId.get(media.id) || '';
          const image = imageCache.get(source);
          if (image?.complete && image.naturalWidth > 0) {
            if (media.crop) {
              ctx.drawImage(
                image,
                media.crop.x * image.naturalWidth,
                media.crop.y * image.naturalHeight,
                media.crop.width * image.naturalWidth,
                media.crop.height * image.naturalHeight,
                0,
                0,
                media.width,
                pictureHeight,
              );
            } else {
              ctx.drawImage(image, 0, 0, media.width, pictureHeight);
            }
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, media.width, pictureHeight);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '600 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Image unavailable', media.width / 2, pictureHeight / 2, media.width - 24);
          }
          AudioCardRenderer.renderImageAudioStrip(ctx, media, {
            playing: false,
            progress: 0,
            currentTime: 0,
          });
          ctx.restore();
        } else if (obj.type === 'pdf') {
          const pdf = obj as PdfObject;
          const source = sourceByObjectId.get(pdf.id) || '';
          const image = imageCache.get(source);
          if (image?.complete && image.naturalWidth > 0) drawPdfImage(ctx, image, pdf);
          else drawMediaPlaceholder(ctx, pdf, 'PDF page unavailable', pdf.fileName || `Page ${pdf.currentPage}`);
        } else if (obj.type === 'coloringRegion') {
          const region = obj as ColoringRegion;
          if (region.points.length > 0) {
            ctx.save();
            ctx.globalAlpha = region.opacity;
            ctx.fillStyle = region.fillColor;
            ctx.beginPath();
            ctx.moveTo(region.points[0].x, region.points[0].y);
            for (const point of region.points.slice(1)) ctx.lineTo(point.x, point.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else if (obj.type === 'circle') {
          GeometryRenderer.renderCircle(ctx, obj as CircleObject);
        } else if (obj.type === 'arc') {
          GeometryRenderer.renderArc(ctx, obj as ArcObject);
        } else if (obj.type === 'compass') {
          CompassRenderer.render(ctx, obj as CompassObject, 1);
        } else if (obj.type === 'teaching-tool') {
          const teachingObject = obj as TeachingToolObject;
          const definition = TeachingToolRegistry.getTool(teachingObject.toolId);
          if (definition?.renderer) definition.renderer(ctx, teachingObject, 1);
        } else if (obj.type === 'webApp') {
          const wa = obj as WebAppObject;
          ctx.save();
          ctx.translate(wa.x, wa.y);
          if (wa.rotation) {
            ctx.translate(wa.width / 2, wa.height / 2);
            ctx.rotate(wa.rotation);
            ctx.translate(-wa.width / 2, -wa.height / 2);
          }
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, wa.width, wa.height);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, wa.width, wa.height);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 24px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wa.title || 'Embedded Website', wa.width / 2, wa.height / 2 - 15);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '16px Inter, sans-serif';
          ctx.fillText(wa.url, wa.width / 2, wa.height / 2 + 20);
          ctx.restore();
        }
      }

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = offscreenCanvas.toDataURL(mimeType, quality);

      if (options.download !== false) {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = `${filename}.${format}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
      return dataUrl;
    } finally {
      for (const url of temporaryObjectUrls) {
        URL.revokeObjectURL(url);
      }
    }
  }

  /**
   * Generates SVG XML text representation of a page.
   */
  public static async generateSVG(page: WhiteboardPage, options: ExportSVGOptions = {}): Promise<string> {
    const width = page.width || 1920;
    const height = page.height || 1080;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    if (options.includeBackground !== false) svg += svgBackground(page, width, height);

    const objects = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);

    // Unsupported vector types are rendered in consecutive transparent raster
    // layers. Grouping adjacent items preserves z-order without creating one
    // full-page bitmap for every media object.
    const rasterLayers = new Map<string, string>();
    const rasterLayerMembers = new Set<string>();
    for (let index = 0; index < objects.length;) {
      if (svgKeepsVector(objects[index])) { index += 1; continue; }
      const run = [];
      while (index < objects.length && !svgKeepsVector(objects[index])) {
        if (objects[index].visible !== false) run.push(objects[index]);
        index += 1;
      }
      if (run.length === 0) continue;
      const dataUrl = await this.exportPageToImage(
        { ...page, objects: run },
        { format: 'png', scale: 1, includeBackground: false, download: false },
      );
      rasterLayers.set(run[0].id, dataUrl);
      run.slice(1).forEach((object) => rasterLayerMembers.add(object.id));
    }

    for (const obj of objects) {
      if (obj.visible === false) continue;
      if (rasterLayerMembers.has(obj.id)) continue;
      const rasterLayer = rasterLayers.get(obj.id);
      if (rasterLayer) {
        svg += `  <image x="0" y="0" width="${width}" height="${height}" href="${escapeXml(rasterLayer)}"/>\n`;
        continue;
      }
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
      } else if (obj.type === 'shape') {
        const shape = obj as ShapeObject;
        const fill = shape.fillColor || 'none';
        const dash = shape.strokeStyle === 'dashed' ? ' stroke-dasharray="12 8"' : shape.strokeStyle === 'dotted' ? ' stroke-dasharray="2 7" stroke-linecap="round"' : '';
        const transform = shape.rotation ? ` transform="rotate(${shape.rotation * 180 / Math.PI} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})"` : '';
        const common = `fill="${escapeXml(fill)}" stroke="${escapeXml(shape.strokeColor)}" stroke-width="${shape.strokeWidth}" opacity="${shape.opacity ?? 1}"${dash}${transform}`;
        if (shape.shapeType === 'rectangle' || shape.shapeType === 'rounded-rectangle') {
          const radius = shape.shapeType === 'rounded-rectangle' ? Math.min(shape.width, shape.height) * 0.12 : 0;
          svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${radius}" ${common}/>\n`;
        } else if (shape.shapeType === 'ellipse' || shape.shapeType === 'circle') {
          svg += `  <ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${common}/>\n`;
        } else if (shape.shapeType === 'line' || shape.shapeType === 'arrow') {
          const start = shape.points?.[0] || { x: shape.x, y: shape.y };
          const end = shape.points?.[1] || { x: shape.x + shape.width, y: shape.y + shape.height };
          svg += `  <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${common}/>\n`;
          if (shape.shapeType === 'arrow') {
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const size = Math.max(10, shape.strokeWidth * 4);
            const leftX = end.x - size * Math.cos(angle - Math.PI / 6);
            const leftY = end.y - size * Math.sin(angle - Math.PI / 6);
            const rightX = end.x - size * Math.cos(angle + Math.PI / 6);
            const rightY = end.y - size * Math.sin(angle + Math.PI / 6);
            svg += `  <polygon points="${end.x},${end.y} ${leftX},${leftY} ${rightX},${rightY}" fill="${escapeXml(shape.strokeColor)}" opacity="${shape.opacity ?? 1}"/>\n`;
          }
        } else {
          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          let points = shape.points?.length ? shape.points : [
            { x: centerX, y: shape.y },
            { x: shape.x + shape.width, y: shape.y + shape.height },
            { x: shape.x, y: shape.y + shape.height },
          ];
          if (!shape.points?.length && shape.shapeType === 'diamond') {
            points = [
              { x: centerX, y: shape.y },
              { x: shape.x + shape.width, y: centerY },
              { x: centerX, y: shape.y + shape.height },
              { x: shape.x, y: centerY },
            ];
          } else if (!shape.points?.length && shape.shapeType === 'star') {
            const outerRadius = Math.min(shape.width, shape.height) / 2;
            const innerRadius = outerRadius * 0.4;
            points = Array.from({ length: 10 }, (_, index) => {
              const radius = index % 2 === 0 ? outerRadius : innerRadius;
              const angle = index * Math.PI / 5 - Math.PI / 2;
              return {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
              };
            });
          }
          svg += `  <polygon points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" ${common}/>\n`;
        }
      } else if (obj.type === 'text') {
        const text = obj as TextObject;
        const transform = text.rotation ? ` transform="rotate(${text.rotation * 180 / Math.PI} ${text.x + text.width / 2} ${text.y + text.height / 2})"` : '';
        const anchor = text.textAlign === 'center' ? 'middle' : text.textAlign === 'right' ? 'end' : 'start';
        const x = text.textAlign === 'center' ? text.x + text.width / 2 : text.textAlign === 'right' ? text.x + text.width : text.x;
        const lines = text.text.split('\n');
        svg += `  <text x="${x}" y="${text.y + text.fontSize}" fill="${escapeXml(text.color)}" font-family="${escapeXml(text.fontFamily)}" font-size="${text.fontSize}" font-weight="${text.fontWeight || 'normal'}" font-style="${text.fontStyle || 'normal'}" text-anchor="${anchor}"${transform}>`;
        lines.forEach((line, index) => {
          svg += `<tspan x="${x}" dy="${index === 0 ? 0 : text.fontSize * (text.lineHeight || 1.25)}">${escapeXml(line)}</tspan>`;
        });
        svg += `</text>\n`;
      } else if (obj.type === 'coloringRegion') {
        const region = obj as ColoringRegion;
        svg += `  <polygon points="${region.points.map((point) => `${point.x},${point.y}`).join(' ')}" fill="${escapeXml(region.fillColor)}" opacity="${region.opacity}"/>\n`;
      } else if (obj.type === 'circle') {
        const circle = obj as CircleObject;
        svg += `  <circle cx="${circle.centerX}" cy="${circle.centerY}" r="${circle.radius}" fill="none" stroke="${escapeXml(circle.strokeColor)}" stroke-width="${circle.strokeWidth}" opacity="${circle.opacity}"/>\n`;
      } else if (obj.type === 'arc') {
        const arc = obj as ArcObject;
        const startX = arc.centerX + Math.cos(arc.startAngle) * arc.radius;
        const startY = arc.centerY + Math.sin(arc.startAngle) * arc.radius;
        const endX = arc.centerX + Math.cos(arc.endAngle) * arc.radius;
        const endY = arc.centerY + Math.sin(arc.endAngle) * arc.radius;
        const largeArc = Math.abs(arc.endAngle - arc.startAngle) > Math.PI ? 1 : 0;
        svg += `  <path d="M ${startX} ${startY} A ${arc.radius} ${arc.radius} 0 ${largeArc} 1 ${endX} ${endY}" fill="none" stroke="${escapeXml(arc.strokeColor)}" stroke-width="${arc.strokeWidth}" opacity="${arc.opacity}"/>\n`;
      } else if (obj.type !== 'group') {
        const label = obj.type === 'image-audio' ? 'Image + Audio' : obj.type === 'youtubeVideo' ? 'YouTube Video' : obj.type === 'webApp' ? 'Embedded Website' : obj.type.replaceAll('-', ' ');
        svg += `  <g transform="translate(${obj.x} ${obj.y}) rotate(${obj.rotation * 180 / Math.PI} ${obj.width / 2} ${obj.height / 2})"><rect width="${obj.width}" height="${obj.height}" rx="8" fill="#0f172a" stroke="#475569"/><text x="${obj.width / 2}" y="${obj.height / 2}" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="18">${escapeXml(label)}</text></g>\n`;
      }
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Exports a Whiteboard Page to SVG vector file.
   */
  public static async exportPageToSVG(page: WhiteboardPage, options: ExportSVGOptions | string = {}): Promise<string> {
    const resolved = typeof options === 'string' ? { filename: options } : options;
    const svgContent = await this.generateSVG(page, resolved);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });

    const safeName = (resolved.filename || page.title || 'whiteboard_page')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    if (resolved.download !== false) this.downloadBlob(blob, `${safeName}.svg`);
    return svgContent;
  }

  /** Downloads a real PDF file containing every whiteboard page in document order. */
  public static async exportDocumentToPDF(
    documentModel: WhiteboardDocument,
    options: ExportPdfOptions = {},
  ): Promise<Blob> {
    if (documentModel.pages.length === 0) throw new Error('This whiteboard has no pages to export.');
    const scale = Math.max(0.5, Math.min(3, options.scale ?? 1.5));
    const quality = Math.max(0.5, Math.min(1, options.quality ?? 0.92));
    const pages: PdfJpegPage[] = [];
    for (const page of documentModel.pages) {
      const width = page.width || 1920;
      const height = page.height || 1080;
      const dataUrl = await this.exportPageToImage(page, {
        format: 'jpeg', quality, scale, includeBackground: true, download: false,
      });
      pages.push({
        jpeg: dataUrlBytes(dataUrl),
        pixelWidth: Math.round(width * scale),
        pixelHeight: Math.round(height * scale),
        // CSS pixels are 96dpi; PDF points are 72dpi.
        pageWidth: Math.round(width * 0.75 * 100) / 100,
        pageHeight: Math.round(height * 0.75 * 100) / 100,
      });
    }
    const blob = buildPdfFromJpegPages(pages);
    if (options.download !== false) {
      this.downloadBlob(blob, `${this.safeName(options.filename || documentModel.title || 'whiteboard')}.pdf`);
    }
    return blob;
  }

  /** Packages every page as PNG, JPEG, or portable SVG in one ZIP download. */
  public static async exportDocumentArchive(
    documentModel: WhiteboardDocument,
    options: ExportArchiveOptions = {},
  ): Promise<Blob> {
    if (documentModel.pages.length === 0) throw new Error('This whiteboard has no pages to export.');
    const format = options.format || 'png';
    const files: ArchiveFile[] = [];
    for (let index = 0; index < documentModel.pages.length; index++) {
      const page = documentModel.pages[index];
      const pageName = this.safeName(page.title || page.name || `page_${index + 1}`);
      const prefix = `${String(index + 1).padStart(2, '0')}_${pageName}`;
      if (format === 'svg') {
        const svg = await this.generateSVG(page, { includeBackground: options.includeBackground });
        files.push({ name: `${prefix}.svg`, bytes: textBytes(svg) });
      } else {
        const dataUrl = await this.exportPageToImage(page, {
          format,
          quality: options.quality,
          scale: options.scale,
          includeBackground: format === 'jpeg' ? true : options.includeBackground,
          download: false,
        });
        files.push({ name: `${prefix}.${format}`, bytes: dataUrlBytes(dataUrl) });
      }
    }
    const blob = buildStoredZip(files);
    if (options.download !== false) {
      this.downloadBlob(blob, `${this.safeName(options.filename || documentModel.title || 'whiteboard')}_${format}_pages.zip`);
    }
    return blob;
  }

  /**
   * Triggers high-quality multi-page print stream.
   */
  public static async printDocument(documentModel: WhiteboardDocument): Promise<void> {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Printable whiteboard document');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);

    try {
      const printable = frame.contentDocument;
      const printWindow = frame.contentWindow;
      if (!printable || !printWindow) throw new Error('Could not prepare the print document.');

      printable.open();
      printable.write('<!doctype html><html><head><title></title><style>@page{size:landscape;margin:0}html,body{margin:0;padding:0;background:#fff}.page{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}.page img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body></body></html>');
      printable.close();

      for (const page of documentModel.pages) {
        const dataUrl = await this.exportPageToImage(page, {
          format: 'png',
          scale: 1,
          includeBackground: true,
          download: false,
        });
        const pageElement = printable.createElement('section');
        pageElement.className = 'page';
        const image = printable.createElement('img');
        image.src = dataUrl;
        image.alt = page.title || page.name || 'Whiteboard page';
        pageElement.appendChild(image);
        printable.body.appendChild(pageElement);
      }

      await Promise.all(Array.from(printable.images).map((image) => image.decode().catch(() => undefined)));
      printWindow.focus();
      printWindow.print();
    } finally {
      window.setTimeout(() => frame.remove(), 1000);
    }
  }
}
