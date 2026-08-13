import { Point } from '../../types';
import { PenPreset } from './PenPreset';
import {
  buildVertices,
  smoothPoints,
  stableJitter,
  sampleAlongPath,
  tracePath,
  StrokeVertex,
} from './PenEngine';
import { CrayonRenderer } from './crayon/CrayonRenderer';

/**
 * Draws a pen stroke. One entry point, `render`, used for both the committed
 * stroke and the live preview so what you see while drawing is what you get.
 *
 * Each render mode is a distinct canvas technique rather than a change of line
 * width, but all of them are a handful of passes over points that already
 * exist -- no per-event texture work, no offscreen canvases.
 */
export class PenRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    color: string,
    size: number,
    opacity: number
  ): void {
    if (points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = preset.lineCap;
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = preset.compositeMode;

    const smoothed = smoothPoints(points, preset);

    // A tap should leave a mark, whatever the pen.
    if (smoothed.length === 1) {
      this.renderDot(ctx, preset, smoothed[0], size);
      ctx.restore();
      return;
    }

    switch (preset.renderMode) {
      case 'tapered':
      case 'nib':
        this.renderVariableWidth(ctx, preset, smoothed, size);
        break;
      case 'textured':
        this.renderTextured(ctx, preset, smoothed, size, opacity);
        break;
      case 'crayon':
        CrayonRenderer.render(ctx, preset, smoothed, color, size, opacity);
        break;
      case 'glow':
        this.renderGlow(ctx, preset, smoothed, color, size, opacity);
        break;
      case 'dotted':
        this.renderDotted(ctx, preset, smoothed, size);
        break;
      case 'dashed':
        this.renderDashed(ctx, preset, smoothed, size);
        break;
      case 'solid':
      default:
        tracePath(ctx, smoothed);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private static renderDot(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    point: Point,
    size: number
  ): void {
    const pressure = point.pressure ?? 0.5;
    const radius = Math.max(0.5, (size * (0.6 + pressure * 0.4)) / 2);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (preset.renderMode === 'glow') {
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.shadowBlur = size * 2 * (preset.glowIntensity ?? 1);
      ctx.fill();
    }
  }

  /**
   * Segment-by-segment stroking, where each segment takes the width resolved for
   * its point. Used by ballpoint, fountain, brush and calligraphy -- the width
   * varies, so the path cannot be stroked in one pass.
   */
  private static renderVariableWidth(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    size: number
  ): void {
    const vertices: StrokeVertex[] = buildVertices(points, preset, size);

    for (let i = 1; i < vertices.length; i++) {
      const a = vertices[i - 1];
      const b = vertices[i];
      ctx.beginPath();
      ctx.lineWidth = (a.width + b.width) / 2;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  /**
   * Pencil and crayon: the base stroke plus two lighter passes nudged off-axis.
   * The offsets come from a seeded hash of the point index, so the grain is
   * stable across redraws instead of crawling.
   */
  private static renderTextured(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    size: number,
    opacity: number
  ): void {
    const grain = preset.texture ?? 0.35;
    const vertices = buildVertices(points, preset, size);

    // Base pass keeps the stroke solid where it matters.
    ctx.globalAlpha = opacity;
    tracePath(ctx, vertices);
    ctx.lineWidth = size;
    ctx.stroke();

    // Two offset passes give a broken, waxy edge for very little cost.
    const offset = size * grain * 0.5;
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = opacity * (0.3 - pass * 0.1);
      ctx.lineWidth = size * (0.85 - pass * 0.2);
      ctx.beginPath();
      for (let i = 0; i < vertices.length; i++) {
        const seed = i * (pass + 1) + 17;
        const x = vertices[i].x + stableJitter(seed) * offset;
        const y = vertices[i].y + stableJitter(seed + 91) * offset;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /**
   * Glow: one blurred halo pass then a bright core. shadowBlur is GPU-cheap on a
   * single pass; the halo is drawn once rather than stacked.
   */
  private static renderGlow(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    color: string,
    size: number,
    opacity: number
  ): void {
    const intensity = preset.glowIntensity ?? 1;

    // Deliberately NOT the 'lighter' composite: it adds to the backdrop, so on a
    // white board -- the default -- the stroke clamps to white and disappears.
    // A blurred halo under a solid core reads as a glow on any background.
    ctx.globalCompositeOperation = 'source-over';

    ctx.shadowColor = color;
    ctx.shadowBlur = size * 2.5 * intensity;
    ctx.globalAlpha = opacity * 0.5;
    ctx.lineWidth = size * 1.2;
    tracePath(ctx, points);
    ctx.stroke();

    // Second halo pass deepens the bloom without another full blur cost.
    ctx.globalAlpha = opacity * 0.35;
    ctx.lineWidth = size;
    ctx.stroke();

    // Solid core, no blur, so the line still reads as a line.
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = Math.max(1, size * 0.45);
    tracePath(ctx, points);
    ctx.stroke();
  }

  /** Evenly spaced dots along the path, spacing measured in world units. */
  private static renderDotted(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    size: number
  ): void {
    const marks = sampleAlongPath(points, preset.spacing ?? 14);
    const radius = Math.max(0.5, size / 2);
    for (const mark of marks) {
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Dashes via the canvas dash pattern, which follows the curve properly and
   * costs a single stroke call.
   */
  private static renderDashed(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    size: number
  ): void {
    const dash = preset.dashLength ?? 16;
    const gap = preset.spacing ?? 12;
    ctx.setLineDash([dash, gap]);
    ctx.lineWidth = size;
    tracePath(ctx, points);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
