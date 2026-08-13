import { Point } from '../../types';
import { PenPreset, SMOOTHING_FACTOR, DEFAULT_PRESSURE, widthForPressure } from './PenPreset';

/**
 * Geometry for pen strokes: smoothing, per-point widths and the mark positions
 * used by the dotted and dashed pens.
 *
 * Everything here is pure and cheap. Nothing allocates per pointer event -- the
 * work happens once per draw pass, on the points already captured.
 */

/** A point with its resolved half-width, ready for the renderer. */
export interface StrokeVertex {
  x: number;
  y: number;
  width: number;
}

/**
 * Deterministic pseudo-random in [-1, 1] from an integer seed.
 *
 * Texture must not use Math.random: the canvas redraws on every pan, zoom and
 * neighbouring stroke, and a random offset would make finished strokes crawl.
 * Seeding from the point index keeps a stroke identical every frame.
 */
export function stableJitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Chaikin-style corner cutting. Pulls each point towards its neighbours by the
 * smoothing factor, which takes the wobble out of a finger-drawn line without
 * moving the stroke off where it was drawn.
 */
export function smoothPoints(points: Point[], preset: PenPreset): Point[] {
  const factor = SMOOTHING_FACTOR[preset.smoothing];
  if (factor <= 0 || points.length < 3) return points;

  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const targetX = (prev.x + next.x) / 2;
    const targetY = (prev.y + next.y) / 2;
    out.push({
      ...curr,
      x: curr.x + (targetX - curr.x) * factor,
      y: curr.y + (targetY - curr.y) * factor,
    });
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Resolves each point to a width. For a nib pen the width comes from the stroke
 * direction against the nib angle; otherwise it follows pressure.
 */
export function buildVertices(points: Point[], preset: PenPreset, size: number): StrokeVertex[] {
  const vertices: StrokeVertex[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const pressure = p.pressure ?? DEFAULT_PRESSURE;

    let width: number;
    if (preset.renderMode === 'nib') {
      width = nibWidth(points, i, preset, size, pressure);
    } else {
      width = widthForPressure(preset, size, pressure);
    }

    vertices.push({ x: p.x, y: p.y, width: Math.max(0.2, width) });
  }

  return vertices;
}

/**
 * A broad nib is wide when the stroke runs across it and narrow when it runs
 * along it, which is what gives calligraphy its thick-thin contrast.
 */
function nibWidth(
  points: Point[],
  index: number,
  preset: PenPreset,
  size: number,
  pressure: number
): number {
  const prev = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.hypot(dx, dy);

  const min = (preset.minWidthRatio ?? 0.18) * size;
  const max = (preset.maxWidthRatio ?? 1) * size;
  if (len < 0.0001) return max;

  const angle = preset.nibAngle ?? Math.PI / 4;
  // Component of travel perpendicular to the nib: 1 across it, 0 along it.
  const across = Math.abs(Math.sin(Math.atan2(dy, dx) - angle));
  const base = min + (max - min) * across;

  // Pressure still nudges the width so a stylus keeps some expression.
  return base * (0.85 + pressure * 0.3);
}

/** Total path length, used to lay marks out evenly. */
export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/**
 * Walks the path and returns a position every `spacing` units. Used by the
 * dotted pen, and by the dashed pen to place dash starts. Spacing is in world
 * units so the pattern stays put as the board is zoomed.
 */
export function sampleAlongPath(
  points: Point[],
  spacing: number
): Array<{ x: number; y: number; angle: number }> {
  const marks: Array<{ x: number; y: number; angle: number }> = [];
  if (points.length === 0) return marks;
  const step = Math.max(0.5, spacing);

  if (points.length === 1) {
    marks.push({ x: points[0].x, y: points[0].y, angle: 0 });
    return marks;
  }

  let carried = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 0.0001) continue;

    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    let distanceIntoSegment = carried === 0 ? 0 : step - carried;

    while (distanceIntoSegment <= segLen) {
      const t = distanceIntoSegment / segLen;
      marks.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle });
      distanceIntoSegment += step;
    }
    carried = (segLen - (distanceIntoSegment - step)) % step;
  }

  return marks;
}

/**
 * Traces the point list as a smooth path through midpoints. This is the same
 * curve the original renderer used, so a plain stroke looks unchanged.
 */
export function tracePath(ctx: CanvasRenderingContext2D, points: Point[] | StrokeVertex[]): void {
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}
