/**
 * The pen family model.
 *
 * A pen is data, not code branching inside a toolbar component: everything the
 * engine and the renderer need to reproduce a stroke lives in a PenPreset. New
 * pens are added by registering another preset, and a stroke stores the preset
 * id plus the resolved values so it keeps its appearance forever.
 */

export type PenType =
  | 'fine'
  | 'ballpoint'
  | 'marker'
  | 'highlighter'
  | 'pencil'
  | 'fountain'
  | 'brush'
  | 'crayon'
  | 'calligraphy'
  | 'glow'
  | 'dotted'
  | 'dashed'
  | 'special-pen';

export type PressureSensitivity = 'off' | 'low' | 'medium' | 'high';

export type PenSmoothing = 'off' | 'low' | 'medium' | 'high';

/** Which drawer of the selector a pen appears in. */
export type PenGroup = 'quick' | 'more';

/**
 * How the stroke body is drawn. Kept deliberately small: each mode is a cheap
 * canvas technique, not a per-point texture computation.
 */
export type PenRenderMode =
  | 'solid' // one smooth pass, constant width
  | 'tapered' // width follows pressure, drawn segment by segment
  | 'textured' // a few deterministic offset passes (pencil)
  | 'crayon' // procedural textured stroke masked by path
  | 'nib' // width follows stroke direction against a fixed nib angle
  | 'glow' // bright core over a blurred halo
  | 'dotted'
  | 'dashed';

export interface PenPreset {
  id: string;
  name: string;
  type: PenType;
  /** Shown in the selector. Kept as text so no icon font is required. */
  icon: string;
  group: PenGroup;

  /** null means "keep whatever colour the user already has". */
  color: string | null;
  size: number;
  opacity: number;

  smoothing: PenSmoothing;
  pressureSensitivity: PressureSensitivity;

  renderMode: PenRenderMode;
  /** 'source-over' for everything except the translucent pens. */
  compositeMode: GlobalCompositeOperation;
  lineCap: CanvasLineCap;

  /** Gap between marks, in world units, for dotted/dashed pens. */
  spacing?: number;
  /** Mark length for the dashed pen, in world units. */
  dashLength?: number;
  /** Texture strength 0..1 for the textured pens. */
  texture?: number;
  /** Crayon specific: texture density (wax coverage) 0..1 */
  textureDensity?: number;
  /** Crayon specific: edge roughness 0..1 */
  roughness?: number;
  /** Crayon specific: stable texture seed */
  textureSeed?: number;
  /** Nib angle in radians for the calligraphy pen. */
  nibAngle?: number;
  /** Halo size relative to stroke width, for the glow pen. */
  glowIntensity?: number;
  /** Lower bound applied to pressure-driven width, as a fraction of size. */
  minWidthRatio?: number;
  /** Upper bound applied to pressure-driven width, as a fraction of size. */
  maxWidthRatio?: number;

  /** Offered in the contextual toolbar as one-tap sizes. */
  sizePresets?: number[];
  /** Offered when the pen is colour-constrained, e.g. the highlighter. */
  colorPresets?: string[];

  /** Whether ruler / protractor geometry snapping applies. */
  supportsSnapping: boolean;
  /** Shown in Child mode. */
  availableInChildMode: boolean;

  /**
   * Legacy `FreehandStroke.tool` value to store alongside the pen id. Keeps new
   * strokes valid against the existing document schema and lets an older build
   * still render something sensible.
   */
  legacyTool: 'pen' | 'marker' | 'pencil' | 'brush' | 'crayon' | 'highlighter';
}

/** Multiplier applied to the pressure signal for each sensitivity level. */
export const PRESSURE_RESPONSE: Record<PressureSensitivity, number> = {
  off: 0,
  low: 0.25,
  medium: 0.55,
  high: 0.9,
};

/** Finger and mouse input report no useful pressure, so they get a fixed value. */
export const DEFAULT_PRESSURE = 0.5;

/**
 * Resolves a pointer's pressure into a 0..1 signal. Pen hardware reports real
 * values; touch and mouse report 0 or a constant, so they are pinned to the
 * default rather than producing a width that jumps around.
 */
export function readPointerPressure(e: PointerEvent): number {
  if (e.pointerType !== 'pen') return DEFAULT_PRESSURE;
  if (typeof e.pressure !== 'number' || e.pressure <= 0) return DEFAULT_PRESSURE;
  return Math.min(1, e.pressure);
}

/**
 * Width for a point, given the pen's sensitivity. With sensitivity off this is
 * simply the pen size, so a Fine Pen stays perfectly consistent.
 */
export function widthForPressure(preset: PenPreset, size: number, pressure: number): number {
  const response = PRESSURE_RESPONSE[preset.pressureSensitivity];
  if (response <= 0) return size;

  const min = (preset.minWidthRatio ?? 0.55) * size;
  const max = (preset.maxWidthRatio ?? 1.35) * size;

  // Blend between flat width and the full pressure range by the response amount.
  const scaled = min + (max - min) * Math.min(1, Math.max(0, pressure));
  return size + (scaled - size) * response;
}

/** Smoothing strength as a 0..1 factor used by the stroke builder. */
export const SMOOTHING_FACTOR: Record<PenSmoothing, number> = {
  off: 0,
  low: 0.25,
  medium: 0.5,
  high: 0.75,
};
