import { CoordinateTransformer } from './CoordinateTransformer';
import { StrokeRenderer } from './StrokeRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { TextRenderer } from './TextRenderer';
import { GeometryRenderer } from '../drawing/shapes/GeometryRenderer';
import { CompassRenderer } from '../teaching-tools/compass/CompassRenderer';
import { SelectionRenderer } from './SelectionRenderer';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';
import {
  WhiteboardObject,
  CanvasBackgroundType,
  Point,
  ShapeType,
  StrokeStyle,
  BoundingBox,
  HandleType,
  ImageObject,
  TeachingToolObject,
  FreehandStroke,
  YouTubeVideoObject,
  VideoObject,
  AudioObject,
  ImageAudioObject,
  PdfObject,
} from '../types';
import { AudioCardRenderer, AudioCardState } from '../media/audio/AudioCardRenderer';
import { MediaManager } from '../media/MediaManager';
import { PdfRenderer } from '../media/pdf/PdfRenderer';
import { getObjectBoundingBox, boxesIntersect } from '../utils';

export interface CanvasRendererOptions {
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
  transformer: CoordinateTransformer;
}

export interface ActiveShapeParams {
  shapeType: ShapeType;
  start: Point;
  current: Point;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  shiftKey: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;

  private transformer: CoordinateTransformer;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  // Scene state
  private objects: WhiteboardObject[] = [];
  private background: string = '#ffffff';
  private backgroundType: CanvasBackgroundType = 'plain';

  // Active in-progress freehand stroke state
  private activeStrokes: Map<
    number,
    { tool: string; points: Point[]; color: string; width: number; opacity: number; penId?: string; penSettings?: any }
  > = new Map();

  // Active in-progress shape state
  private activeShapeParams: ActiveShapeParams | null = null;

  // Active selection state
  private selectionBox: BoundingBox | null = null;
  private activeHandle: HandleType | null = null;
  private marqueeBox: BoundingBox | null = null;

  // Eraser preview state
  private eraserPreview: { x: number; y: number; radius: number } | null = null;

  // Render loop control
  private isDirty = true;
  private isOverlayDirty = true;
  private isDisposed = false;
  
  private imageCache = new Map<string, HTMLImageElement>();
  // <video> elements backing video objects, owned by the engine.
  private videoElements = new Map<string, HTMLVideoElement>();
  // <audio>/<video> elements backing audio and image+audio objects.
  private mediaElements = new Map<string, HTMLMediaElement>();
  // Set during a draw pass when a playing video needs another frame.
  private videoNeedsFrame = false;

  private animationFrameId: number | null = null;
  
  // Teaching tools
  private transientStrokes: FreehandStroke[] = [];
  private spotlightPosition: Point | null = null;
  private spotlightRadius: number = 150;
  private magnifierPosition: Point | null = null;
  private magnifierRadius: number = 150;
  private magnifierZoom: number = 2.0;
  private snapIndicators: Point[] = [];

  constructor(options: CanvasRendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      throw new Error('Unable to obtain 2D canvas rendering context.');
    }
    this.ctx = ctx;

    if (options.overlayCanvas) {
      this.overlayCanvas = options.overlayCanvas;
      this.overlayCtx = this.overlayCanvas.getContext('2d', { alpha: true, desynchronized: true });
    }

    this.transformer = options.transformer;
    this.dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

    // A PDF page finishes rasterising off the main flow, so the renderer needs
    // telling to draw again when it lands.
    PdfRenderer.onPageReady = () => this.requestRender();

    this.startRenderLoop();
  }

  /**
   * Resizes the canvas buffer and adjusts for high-DPI displays.
   */
  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.width = width;
    this.height = height;
    this.dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

    // Set buffer size
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    // Set CSS display size
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.overlayCanvas) {
      this.overlayCanvas.width = Math.floor(width * this.dpr);
      this.overlayCanvas.height = Math.floor(height * this.dpr);
      this.overlayCanvas.style.width = `${width}px`;
      this.overlayCanvas.style.height = `${height}px`;
    }

    this.requestRender();
  }

  public setObjects(objects: WhiteboardObject[]): void {
    this.objects = objects;
    this.requestRender();
  }

  public setBackground(color: string, type: CanvasBackgroundType = 'plain'): void {
    this.background = color;
    this.backgroundType = type;
    this.requestRender();
  }

  public setTransientStrokes(strokes: FreehandStroke[]): void {
    this.transientStrokes = strokes;
    if (strokes.length > 0) {
      this.requestRender();
    }
  }

  public setSpotlight(position: Point | null, radius: number): void {
    this.spotlightPosition = position;
    this.spotlightRadius = radius;
    this.requestOverlayRender();
  }

  public setMagnifier(position: Point | null, radius: number, zoom: number = 2.0): void {
    this.magnifierPosition = position;
    this.magnifierRadius = radius;
    this.magnifierZoom = zoom;
    this.requestOverlayRender();
  }

  public setSnapIndicators(indicators: Point[]): void {
    this.snapIndicators = indicators;
    this.isOverlayDirty = true;
    this.requestRender();
  }

  public setActiveStroke(pointerId: number, params: {
    tool: string;
    points: Point[];
    color: string;
    width: number;
    opacity: number;
    penId?: string;
    penSettings?: any;
  } | null): void {
    if (!params || params.points.length === 0) {
      this.activeStrokes.delete(pointerId);
    } else {
      this.activeStrokes.set(pointerId, params);
    }
    this.requestOverlayRender();
  }
  
  public clearActiveStrokes(): void {
    this.activeStrokes.clear();
    this.requestOverlayRender();
  }

  public setActiveShapePreview(params: ActiveShapeParams | null): void {
    this.activeShapeParams = params;
    this.requestOverlayRender();
  }

  public setSelectionBox(box: BoundingBox | null, activeHandle?: HandleType | null): void {
    this.selectionBox = box;
    this.activeHandle = activeHandle ?? null;
    this.requestOverlayRender();
  }

  public setMarqueeBox(box: BoundingBox | null): void {
    this.marqueeBox = box;
    this.requestOverlayRender();
  }

  public setEraserPreview(preview: { x: number; y: number; radius: number } | null): void {
    this.eraserPreview = preview;
    this.requestOverlayRender();
  }

  public clearOverlay(): void {
    this.selectionBox = null;
    this.activeHandle = null;
    this.marqueeBox = null;
    this.activeShapeParams = null;
    this.activeStrokes.clear();
    this.eraserPreview = null;
    this.isOverlayDirty = true;
  }

  public dispatchFloodFill(worldPoint: Point, color: string, opacity: number): void {
    // Stub for FloodFillWorker dispatch
    console.warn('dispatchFloodFill not implemented yet.', worldPoint, color, opacity);
  }

  public requestRender(): void {
    this.isDirty = true;
    this.isOverlayDirty = true;
  }

  public requestOverlayRender(): void {
    this.isOverlayDirty = true;
  }

  private startRenderLoop = (): void => {
    const loop = () => {
      if (this.isDisposed) return;

      if (this.isDirty) {
        this.renderMainScene();
        this.isDirty = false;
      }

      if (this.isOverlayDirty) {
        this.renderOverlay();
        this.isOverlayDirty = false;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  };

  /**
   * Renders the main static scene (Background + Committed objects).
   */
  public renderMainScene(): void {
    if (this.width <= 0 || this.height <= 0) return;

    const ctx = this.ctx;
    ctx.save();

    // Reset transform to screen pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Draw canvas background
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Apply World-to-Screen Transformation Matrix
    this.transformer.applyToContext(ctx, this.dpr);

    // 3. Draw background pattern if enabled (grid, dots, lines)
    this.renderBackgroundPattern(ctx);

    // 4. Viewport culling calculation
    const visibleBounds = this.transformer.getVisibleWorldBounds(this.width, this.height);
    const zoom = this.transformer.getZoom();

    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      if (!obj.visible) continue;

      // Culling check
      const objBox = getObjectBoundingBox(obj, 10);
      if (!boxesIntersect(visibleBounds, objBox)) {
        continue;
      }

      if (obj.type === 'stroke') {
        StrokeRenderer.renderStroke(ctx, obj);
      } else if (obj.type === 'shape') {
        ShapeRenderer.renderShape(ctx, obj);
      } else if (obj.type === 'text') {
        TextRenderer.renderText(ctx, obj as any);
      } else if (obj.type === 'circle') {
        GeometryRenderer.renderCircle(ctx, obj as any);
      } else if (obj.type === 'arc') {
        GeometryRenderer.renderArc(ctx, obj as any);
      } else if (obj.type === 'compass') {
        CompassRenderer.render(ctx, obj as any, zoom);
      } else if (obj.type === 'image') {
        this.renderImage(ctx, obj as ImageObject);
      } else if (obj.type === 'coloringRegion') {
        const region = obj as any; // Cast to access points/fillColor safely if types aren't fully resolved
        if (region.points && region.points.length > 0) {
          ctx.save();
          ctx.globalAlpha = region.opacity ?? 1;
          ctx.fillStyle = region.fillColor;
          ctx.beginPath();
          ctx.moveTo(region.points[0].x, region.points[0].y);
          for (let p = 1; p < region.points.length; p++) {
            ctx.lineTo(region.points[p].x, region.points[p].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else if (obj.type === 'teaching-tool') {
        const teachingObj = obj as TeachingToolObject;
        const toolDef = TeachingToolRegistry.getTool(teachingObj.toolId);
        if (toolDef && toolDef.renderer) {
          toolDef.renderer(ctx, teachingObj, zoom);
        }
      } else if (obj.type === 'youtubeVideo') {
        this.renderYouTubeThumbnail(ctx, obj as YouTubeVideoObject);
      } else if (obj.type === 'video') {
        this.renderVideoObject(ctx, obj as VideoObject);
      } else if (obj.type === 'audio') {
        this.renderAudioObject(ctx, obj as AudioObject);
      } else if (obj.type === 'image-audio') {
        this.renderImageAudioObject(ctx, obj as ImageAudioObject);
      } else if (obj.type === 'pdf') {
        this.renderPdfObject(ctx, obj as PdfObject);
      }
    }

    // 6. Render Transient Strokes (Laser)
    const now = Date.now();
    let keepAnimating = false;
    for (let i = this.transientStrokes.length - 1; i >= 0; i--) {
      const stroke = this.transientStrokes[i];
      const age = now - stroke.createdAt;
      const MAX_AGE = (stroke as any).maxAge || 1500; // use custom maxAge or default to 1.5 seconds
      
      if (age > MAX_AGE) {
        this.transientStrokes.splice(i, 1);
        continue;
      }
      keepAnimating = true;
      const fade = 1 - (age / MAX_AGE);
      ctx.save();
      ctx.globalAlpha = stroke.opacity * fade;
      StrokeRenderer.renderStroke(ctx, stroke);
      ctx.restore();
    }

    if (keepAnimating || this.videoNeedsFrame) {
      this.requestRender();
    }
    this.videoNeedsFrame = false;

    ctx.restore();
  }

  private renderImage(ctx: CanvasRenderingContext2D, obj: ImageObject): void {
    let img = this.imageCache.get(obj.id);
    if (!img) {
      // Create and load image
      img = new Image();
      img.src = obj.dataUrl;
      this.imageCache.set(obj.id, img);
      
      // Request a re-render when image finally decodes and loads
      img.onload = () => {
        this.requestRender();
      };
      return; // Skip rendering on this frame until loaded
    }

    if (!img.complete) return;

    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-obj.width / 2, -obj.height / 2);
    }
    
    // Draw the image scaled to the object's width/height
    ctx.drawImage(img, 0, 0, obj.width, obj.height);
    ctx.restore();
  }

  /**
   * YouTube videos are drawn straight onto the canvas as their poster image, so
   * they behave like any other object (drag, select, export) instead of needing a
   * DOM iframe layered over the board.
   */
  private renderYouTubeThumbnail(ctx: CanvasRenderingContext2D, obj: YouTubeVideoObject): void {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-obj.width / 2, -obj.height / 2);
    }

    const img = this.getYouTubeThumbnail(obj);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, obj.width, obj.height);
    } else {
      // Shown while the poster loads, and as the permanent fallback when it can't be fetched.
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, obj.width, obj.height);
    }

    this.renderPlayBadge(ctx, obj.width, obj.height);
    ctx.restore();
  }

  /**
   * Registers the <video> element backing a video object. The element is created
   * and owned by the engine; the renderer only paints its current frame.
   */
  public setVideoElement(objectId: string, element: HTMLVideoElement | null): void {
    if (element) this.videoElements.set(objectId, element);
    else this.videoElements.delete(objectId);
    this.requestRender();
  }

  public getVideoElement(objectId: string): HTMLVideoElement | undefined {
    return this.videoElements.get(objectId);
  }

  /**
   * Draws the live frame while a video plays, otherwise the poster still with a
   * play badge -- the same treatment as a YouTube object, so both read alike.
   */
  private renderVideoObject(ctx: CanvasRenderingContext2D, obj: VideoObject): void {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-obj.width / 2, -obj.height / 2);
    }

    const videoEl = this.videoElements.get(obj.id);
    const isPlaying = !!videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState >= 2;

    if (isPlaying && videoEl) {
      ctx.drawImage(videoEl, 0, 0, obj.width, obj.height);
      // Keep the loop alive so the next frame gets painted.
      this.videoNeedsFrame = true;
    } else {
      const poster = this.getVideoPoster(obj);
      if (poster && poster.complete && poster.naturalWidth > 0) {
        ctx.drawImage(poster, 0, 0, obj.width, obj.height);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, obj.width, obj.height);
      }
      // A paused-but-started video keeps its frame; only badge it when stopped.
      if (!videoEl || videoEl.currentTime === 0) {
        this.renderPlayBadge(ctx, obj.width, obj.height);
      } else if (videoEl.readyState >= 2) {
        ctx.drawImage(videoEl, 0, 0, obj.width, obj.height);
        this.renderPlayBadge(ctx, obj.width, obj.height);
      }
    }

    ctx.restore();
  }

  /**
   * Playback state for a media object, read from the live element if the engine
   * has one. Audio has no visual frame of its own, so the card is drawn from
   * these numbers rather than from the element.
   */
  private mediaState(objectId: string, duration: number): AudioCardState {
    const el = this.mediaElements.get(objectId);
    if (!el) return { playing: false, progress: 0, currentTime: 0 };
    const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    const playing = !el.paused && !el.ended;
    if (playing) this.videoNeedsFrame = true; // keep the loop alive while the bar moves
    return {
      playing,
      progress: total > 0 ? Math.min(1, el.currentTime / total) : 0,
      currentTime: el.currentTime,
    };
  }

  /** Registers the <audio>/<video> element backing a media object. */
  public setMediaElement(objectId: string, element: HTMLMediaElement | null): void {
    if (element) this.mediaElements.set(objectId, element);
    else this.mediaElements.delete(objectId);
    this.requestRender();
  }

  public getMediaElement(objectId: string): HTMLMediaElement | undefined {
    return this.mediaElements.get(objectId);
  }

  private renderAudioObject(ctx: CanvasRenderingContext2D, obj: AudioObject): void {
    AudioCardRenderer.renderAudioCard(ctx, obj, this.mediaState(obj.id, obj.durationSeconds));
  }

  /**
   * Draws the current PDF page. The rasterised page arrives asynchronously, so
   * the poster captured at import stands in until it is ready -- the object is
   * never blank, and a page turn shows something immediately.
   */
  private renderPdfObject(ctx: CanvasRenderingContext2D, obj: PdfObject): void {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-obj.width / 2, -obj.height / 2);
    }

    // Paper, so a page with transparency still reads as a document.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, obj.width, obj.height);

    const page = PdfRenderer.getPage(obj, obj.currentPage);
    const quarterTurns = ((obj.pageRotation / 90) | 0) % 4;

    ctx.save();
    if (quarterTurns) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate((quarterTurns * Math.PI) / 2);
      // Swap the frame for odd turns so the page still fills its box.
      const w = quarterTurns % 2 === 0 ? obj.width : obj.height;
      const h = quarterTurns % 2 === 0 ? obj.height : obj.width;
      ctx.translate(-w / 2, -h / 2);
      if (page) ctx.drawImage(page, 0, 0, w, h);
      else this.drawPdfPoster(ctx, obj, w, h);
    } else if (page) {
      ctx.drawImage(page, 0, 0, obj.width, obj.height);
    } else {
      this.drawPdfPoster(ctx, obj, obj.width, obj.height);
    }
    ctx.restore();

    // Page badge, so the teacher can see where they are without selecting it.
    if (obj.pageCount > 1) {
      const label = `${obj.currentPage} / ${obj.pageCount}`;
      ctx.font = '600 13px Inter, sans-serif';
      const textW = ctx.measureText(label).width;
      const bw = textW + 16;
      const bh = 22;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(obj.width - bw - 8, obj.height - bh - 8, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, obj.width - bw / 2 - 8, obj.height - bh / 2 - 8);
    }

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, obj.width, obj.height);
    ctx.restore();
  }

  private drawPdfPoster(ctx: CanvasRenderingContext2D, obj: PdfObject, w: number, h: number): void {
    if (!obj.posterDataUrl) return;
    const key = `pdfposter_${obj.id}`;
    let img = this.imageCache.get(key);
    if (!img) {
      img = new Image();
      img.onload = () => this.requestRender();
      img.onerror = () => this.requestRender();
      img.src = obj.posterDataUrl;
      this.imageCache.set(key, img);
      return;
    }
    if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, 0, 0, w, h);
  }

  private renderImageAudioObject(ctx: CanvasRenderingContext2D, obj: ImageAudioObject): void {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(obj.width / 2, obj.height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-obj.width / 2, -obj.height / 2);
    }

    const pictureHeight = Math.max(0, obj.height - obj.playerHeight);
    const img = this.getImageAudioPicture(obj);

    if (img && img.complete && img.naturalWidth > 0) {
      // Non-destructive crop: the source rectangle changes, the file never does.
      const crop = obj.crop;
      if (crop) {
        ctx.drawImage(
          img,
          crop.x * img.naturalWidth,
          crop.y * img.naturalHeight,
          crop.width * img.naturalWidth,
          crop.height * img.naturalHeight,
          0,
          0,
          obj.width,
          pictureHeight
        );
      } else {
        ctx.drawImage(img, 0, 0, obj.width, pictureHeight);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, obj.width, pictureHeight);
    }

    AudioCardRenderer.renderImageAudioStrip(ctx, obj, this.mediaState(obj.id, obj.durationSeconds));
    ctx.restore();
  }

  /**
   * Picture for an image+audio object. Inline data URLs load directly; asset-
   * backed ones resolve through the media manager and trigger a redraw.
   */
  private getImageAudioPicture(obj: ImageAudioObject): HTMLImageElement | null {
    const key = `imgaudio_${obj.id}`;
    const cached = this.imageCache.get(key);
    if (cached) return cached;

    const img = new Image();
    img.onload = () => this.requestRender();
    img.onerror = () => this.requestRender();
    this.imageCache.set(key, img);

    if (obj.imageDataUrl) {
      img.src = obj.imageDataUrl;
    } else if (obj.imageAssetId) {
      void MediaManager.getObjectUrl(obj.imageAssetId).then((url) => {
        if (url) img.src = url;
      });
    }
    return null;
  }

  private getVideoPoster(obj: VideoObject): HTMLImageElement | null {
    const key = `poster_${obj.id}`;
    const cached = this.imageCache.get(key);
    if (cached) return cached;
    if (!obj.posterDataUrl) return null;

    const img = new Image();
    img.onload = () => this.requestRender();
    img.onerror = () => this.requestRender();
    img.src = obj.posterDataUrl;
    this.imageCache.set(key, img);
    return null;
  }

  private getYouTubeThumbnail(obj: YouTubeVideoObject): HTMLImageElement | null {
    const key = `yt_${obj.id}`;
    const cached = this.imageCache.get(key);
    if (cached) return cached;

    const img = new Image();
    // Required: the board is exported via toDataURL, and a non-CORS image would
    // taint the canvas and make every export fail.
    img.crossOrigin = 'anonymous';
    img.onload = () => this.requestRender();
    img.onerror = () => this.requestRender(); // fall through to the placeholder
    img.src = obj.thumbnail || `https://img.youtube.com/vi/${obj.videoId}/hqdefault.jpg`;
    this.imageCache.set(key, img);
    return null;
  }

  private renderPlayBadge(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const badgeW = Math.max(28, Math.min(width * 0.22, 72));
    const badgeH = badgeW * 0.7;
    const x = (width - badgeW) / 2;
    const y = (height - badgeH) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x, y, badgeW, badgeH, badgeH * 0.28);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const cx = x + badgeW / 2;
    const cy = y + badgeH / 2;
    const t = badgeH * 0.26;
    ctx.beginPath();
    ctx.moveTo(cx - t * 0.8, cy - t);
    ctx.lineTo(cx - t * 0.8, cy + t);
    ctx.lineTo(cx + t, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders the interactive overlay (active drawing preview, shape preview, selection box, marquee, and eraser cursor).
   */
  private renderOverlay(): void {
    if (!this.overlayCanvas || !this.overlayCtx) {
      if (this.isOverlayDirty && !this.overlayCanvas) {
        this.isDirty = true;
      }
      return;
    }

    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    ctx.save();
    
    // Draw spotlight first so it covers everything underneath but ui stays on top
    if (this.spotlightPosition) {
      const screenPos = this.transformer.worldToScreen(this.spotlightPosition);
      
      // Draw dimming background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      
      // Punch out the circle
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(screenPos.x * this.dpr, screenPos.y * this.dpr, this.spotlightRadius * this.transformer.getZoom() * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      
      // Add a soft glow ring inside
      ctx.globalCompositeOperation = 'source-over';
      const gradient = ctx.createRadialGradient(
        screenPos.x * this.dpr, screenPos.y * this.dpr, (this.spotlightRadius * this.transformer.getZoom() - 10) * this.dpr,
        screenPos.x * this.dpr, screenPos.y * this.dpr, this.spotlightRadius * this.transformer.getZoom() * this.dpr
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenPos.x * this.dpr, screenPos.y * this.dpr, this.spotlightRadius * this.transformer.getZoom() * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw magnifier
    if (this.magnifierPosition && this.canvas) {
      const screenPos = this.transformer.worldToScreen(this.magnifierPosition);
      const magRadius = this.magnifierRadius * this.transformer.getZoom() * this.dpr;
      const mX = screenPos.x * this.dpr;
      const mY = screenPos.y * this.dpr;

      ctx.save();
      // Drop shadow for the lens
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 15 * this.dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10 * this.dpr;
      ctx.beginPath();
      ctx.arc(mX, mY, magRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent'; // reset

      // Clip to lens circle
      ctx.beginPath();
      ctx.arc(mX, mY, magRadius, 0, Math.PI * 2);
      ctx.clip();

      // Clear the background so we aren't blending with anything underneath the overlay
      ctx.clearRect(mX - magRadius, mY - magRadius, magRadius * 2, magRadius * 2);

      // Draw magnified portion of the main canvas
      const sx = mX - (magRadius / this.magnifierZoom);
      const sy = mY - (magRadius / this.magnifierZoom);
      const sw = (magRadius * 2) / this.magnifierZoom;
      const sh = (magRadius * 2) / this.magnifierZoom;

      ctx.drawImage(
        this.canvas,
        sx, sy, sw, sh,
        mX - magRadius, mY - magRadius, magRadius * 2, magRadius * 2
      );

      // Inner shadow/glow to give glass effect
      const gradient = ctx.createRadialGradient(mX - magRadius * 0.3, mY - magRadius * 0.3, 0, mX, mY, magRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
      gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mX, mY, magRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * this.dpr;
      ctx.stroke();

      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.transformer.applyToContext(ctx, this.dpr);

    // 1. Render active in-progress strokes in world coordinates
    for (const stroke of this.activeStrokes.values()) {
      if (stroke.points.length > 0) {
        StrokeRenderer.renderActiveStroke(
          ctx,
          stroke.tool,
          stroke.points,
          stroke.color,
          stroke.width,
          stroke.opacity,
          stroke.penId,
          stroke.penSettings
        );
      }
    }

    // 2. Render active shape in progress
    if (this.activeShapeParams) {
      ShapeRenderer.renderActiveShapePreview(ctx, this.activeShapeParams);
    }

    // 3. Render selection bounding box & handles
    const zoom = this.transformer.getZoom();
    if (this.selectionBox) {
      SelectionRenderer.renderSelectionBox(ctx, this.selectionBox, zoom, this.activeHandle);
    }

    // 4. Render marquee box
    if (this.marqueeBox) {
      SelectionRenderer.renderMarqueeBox(ctx, this.marqueeBox, zoom);
    }

    // 5. Render eraser preview in screen coordinates
    if (this.eraserPreview) {
      ctx.restore();
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      StrokeRenderer.renderEraserPreview(
        ctx,
        this.eraserPreview.x,
        this.eraserPreview.y,
        this.eraserPreview.radius
      );
    }

    // 6. Render Ruler Snap Indicators in world coordinates
    for (const indicator of this.snapIndicators) {
      ctx.fillStyle = '#3b82f6'; // subtle blue indicator
      ctx.beginPath();
      ctx.arc(indicator.x, indicator.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders classroom background grids, dot matrices, or ruled lines.
   */
  private renderBackgroundPattern(ctx: CanvasRenderingContext2D): void {
    if (this.backgroundType === 'plain') return;

    const bounds = this.transformer.getVisibleWorldBounds(this.width, this.height);
    const zoom = this.transformer.getZoom();

    // Adapt grid spacing to zoom level to maintain clean visuals
    let spacing = 40;
    if (zoom < 0.5) spacing = 80;
    if (zoom > 2.5) spacing = 20;

    const startX = Math.floor(bounds.minX / spacing) * spacing;
    const endX = Math.ceil(bounds.maxX / spacing) * spacing;
    const startY = Math.floor(bounds.minY / spacing) * spacing;
    const endY = Math.ceil(bounds.maxY / spacing) * spacing;

    ctx.save();

    if (this.backgroundType === 'grid') {
      ctx.strokeStyle = this.background === '#1e293b' || this.background === '#1e382b' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();

      for (let x = startX; x <= endX; x += spacing) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
      }
      for (let y = startY; y <= endY; y += spacing) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
      ctx.stroke();
    } else if (this.backgroundType === 'dots') {
      ctx.fillStyle = this.background === '#1e293b' || this.background === '#1e382b' 
        ? 'rgba(255, 255, 255, 0.15)' 
        : 'rgba(0, 0, 0, 0.15)';
      const dotRadius = Math.max(1, 1.5 / zoom);

      for (let x = startX; x <= endX; x += spacing) {
        for (let y = startY; y <= endY; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (this.backgroundType === 'lines') {
      ctx.strokeStyle = this.background === '#1e293b' || this.background === '#1e382b' 
        ? 'rgba(255, 255, 255, 0.09)' 
        : 'rgba(0, 0, 0, 0.07)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();

      for (let y = startY; y <= endY; y += spacing) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Exports the entire canvas viewport or bounding box to an image blob.
   */
  public async exportToBlob(type: string = 'image/png', quality: number = 0.95): Promise<Blob | null> {
    return new Promise((resolve) => {
      // Force a full clean render first
      this.renderMainScene();
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  public exportToDataURL(type: string = 'image/png', quality: number = 0.95): string {
    this.renderMainScene();
    return this.canvas.toDataURL(type, quality);
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
