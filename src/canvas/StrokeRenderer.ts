import { FreehandStroke, Point } from '../types';
import { getMidPoint } from '../utils';

export class StrokeRenderer {
  /**
   * Renders a committed stroke object onto the canvas 2D context.
   */
  public static renderStroke(ctx: CanvasRenderingContext2D, stroke: FreehandStroke): void {
    if (!stroke.visible || stroke.points.length === 0) return;

    ctx.save();

    if (stroke.tool === 'marker') {
      // Marker / Highlighter styling: translucent overlay with smooth linecaps
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      // Standard Pen styling
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
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

    ctx.restore();
  }

  /**
   * Renders the active in-progress stroke directly from raw points during pointer drawing.
   */
  public static renderActiveStroke(
    ctx: CanvasRenderingContext2D,
    _tool: 'pen' | 'marker',
    points: Point[],
    color: string,
    width: number,
    opacity: number
  ): void {
    if (points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
