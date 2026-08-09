import { CoordinateTransformer } from './CoordinateTransformer';
import { StrokeRenderer } from './StrokeRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { TextRenderer } from './TextRenderer';
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
} from '../types';
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
  private activeStrokes: Map<number, {
    tool: 'pen' | 'marker';
    points: Point[];
    color: string;
    width: number;
    opacity: number;
  }> = new Map();

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

  private animationFrameId: number | null = null;
  
  // Teaching tools
  private transientStrokes: FreehandStroke[] = [];
  private spotlightPosition: Point | null = null;
  private spotlightRadius: number = 150;
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

  public setSpotlight(pos: Point | null, radius: number): void {
    this.spotlightPosition = pos;
    this.spotlightRadius = radius;
    this.isOverlayDirty = true;
    this.requestRender();
  }

  public setSnapIndicators(indicators: Point[]): void {
    this.snapIndicators = indicators;
    this.isOverlayDirty = true;
    this.requestRender();
  }

  public setActiveStroke(pointerId: number, params: {
    tool: 'pen' | 'marker';
    points: Point[];
    color: string;
    width: number;
    opacity: number;
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
      } else if (obj.type === 'image') {
        this.renderImage(ctx, obj as ImageObject);
      } else if (obj.type === 'teaching-tool') {
        const teachingObj = obj as TeachingToolObject;
        const toolDef = TeachingToolRegistry.getTool(teachingObj.toolId);
        if (toolDef && toolDef.renderer) {
          toolDef.renderer(ctx, teachingObj, zoom);
        }
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

    if (keepAnimating) {
      this.requestRender();
    }

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
          stroke.opacity
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
