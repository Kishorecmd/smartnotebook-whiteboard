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
} from '../types';
import { StrokeRenderer, ShapeRenderer, TextRenderer } from '../canvas';
import { AudioCardRenderer } from '../media/audio/AudioCardRenderer';
import { GeometryRenderer } from '../drawing/shapes/GeometryRenderer';
import { CompassRenderer } from '../teaching-tools/compass/CompassRenderer';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';
import { PdfRenderer } from '../media/pdf/PdfRenderer';

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

const escapeXml = (value: unknown): string => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export class ExportService {
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
      ctx.fillStyle = page.background || '#ffffff';
      ctx.fillRect(0, 0, width, height);
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
        } else if (obj.type === 'youtubeVideo') {
          const v = obj as YouTubeVideoObject;
          drawLoadedImage(ctx, v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`, obj, imageCache);
        } else if (obj.type === 'video') {
          const v = obj as VideoObject;
          if (v.posterDataUrl) drawLoadedImage(ctx, v.posterDataUrl, obj, imageCache);
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
  public static generateSVG(page: WhiteboardPage): string {
    const width = page.width || 1920;
    const height = page.height || 1080;
    const bg = page.background || '#ffffff';

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <rect width="100%" height="100%" fill="${bg}"/>\n`;

    const objects = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);

    for (const obj of objects) {
      if (obj.visible === false) continue;
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
