import { FreehandStroke, Point } from '../types';
import { getMidPoint } from '../utils';
import { PenRegistry, PenRenderer, PenPreset } from '../drawing/pens';

export class StrokeRenderer {
  /**
   * Builds the preset a stroke was drawn with, overlaid with the settings that
   * were captured at the time, so editing a preset later never changes existing
   * work.
   */
  private static resolvePreset(stroke: FreehandStroke): PenPreset | null {
    if (!stroke.penId) return null;
    const base = PenRegistry.get(stroke.penId);
    if (!base) return null;
    return stroke.penSettings ? ({ ...base, ...stroke.penSettings } as PenPreset) : base;
  }

  /**
   * Renders a committed stroke object onto the canvas 2D context.
   */
  public static renderStroke(ctx: CanvasRenderingContext2D, stroke: FreehandStroke): void {
    if (!stroke.visible || stroke.points.length === 0) return;

    // Strokes drawn with the pen family render through it. Anything older has no
    // penId and falls through to the original code below, unchanged.
    const preset = this.resolvePreset(stroke);
    if (preset) {
      PenRenderer.render(ctx, preset, stroke.points, stroke.color, stroke.width, stroke.opacity);
      return;
    }

    ctx.save();
    
    // Default styling
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (stroke.tool) {
      case 'marker':
        ctx.globalCompositeOperation = 'multiply';
        break;
      case 'highlighter':
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineCap = 'butt'; // Gives that square highlighter look
        break;
      case 'pencil':
        // Pencil is often slightly opaque/darker and thinner, maybe some texture
        ctx.globalAlpha = Math.min(stroke.opacity, 0.8);
        break;
      case 'brush':
        // Brush could have a specific tapering or shadow effect
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.width * 0.2;
        break;
      case 'crayon':
        // Crayon might have some texture. We can simulate a rough edge by slightly altering the path or drawing multiple passes.
        // For performance, we'll keep it simple: semi-opaque, no shadow, round caps.
        ctx.globalAlpha = Math.min(stroke.opacity, 0.9);
        break;
      case 'pen':
      default:
        // Pen is standard
        break;
    }

    const points = stroke.points;

    // Single point -> draw a filled circle dot
    if (points.length === 1) {
      const pt = points[0];
      const radius = Math.max(1, (stroke.width * (0.6 + (pt.pressure ?? 0.5) * 0.4)) / 2);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Two points -> simple line
    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      
      if (stroke.tool === 'crayon') {
        // Draw a second rough pass for crayon
        ctx.globalAlpha = stroke.opacity * 0.5;
        ctx.lineWidth = stroke.width * 0.8;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Three or more points -> Quadratic Bézier curve smoothing through midpoints
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const mid = getMidPoint(points[i], points[i + 1]);
      ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
    }

    // Connect to the last point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    
    if (stroke.tool === 'crayon') {
      // Draw a second rough pass for crayon
      ctx.globalAlpha = stroke.opacity * 0.5;
      ctx.lineWidth = stroke.width * 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the active in-progress stroke directly from raw points during pointer drawing.
   */
  public static renderActiveStroke(
    ctx: CanvasRenderingContext2D,
    tool: string,
    points: Point[],
    color: string,
    width: number,
    opacity: number,
    penId?: string
  ): void {
    if (points.length === 0) return;

    // Preview with the same renderer the committed stroke will use, so the line
    // does not change appearance the moment the pointer lifts.
    if (penId) {
      const preset = PenRegistry.get(penId);
      if (preset) {
        PenRenderer.render(ctx, preset, points, color, width, opacity);
        return;
      }
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (tool) {
      case 'marker':
        ctx.globalCompositeOperation = 'multiply';
        break;
      case 'highlighter':
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineCap = 'butt';
        break;
      case 'pencil':
        ctx.globalAlpha = Math.min(opacity, 0.8);
        break;
      case 'brush':
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 0.2;
        break;
      case 'crayon':
        ctx.globalAlpha = Math.min(opacity, 0.9);
        break;
    }

    if (points.length === 1) {
      const pt = points[0];
      const radius = Math.max(1, (width * (0.6 + (pt.pressure ?? 0.5) * 0.4)) / 2);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      if (tool === 'crayon') {
        ctx.globalAlpha = opacity * 0.5;
        ctx.lineWidth = width * 0.8;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const mid = getMidPoint(points[i], points[i + 1]);
      ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    
    if (tool === 'crayon') {
      ctx.globalAlpha = opacity * 0.5;
      ctx.lineWidth = width * 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders an eraser cursor ring / trail preview on the overlay canvas.
   */
  public static renderEraserPreview(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red accent
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
