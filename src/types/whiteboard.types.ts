export type ToolType = 'pen' | 'magic_pen' | 'marker' | 'eraser' | 'shape' | 'text' | 'select' | 'pan' | 'laser' | 'spotlight' | 'pencil' | 'brush' | 'fill' | 'crayon' | 'highlighter' | 'magic_eraser' | 'eyedropper';

export type SmoothingLevel = 'off' | 'low' | 'medium' | 'high';

export type EraserMode = 'stroke' | 'area';

export type ShapeType = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'circle' | 'triangle' | 'line' | 'arrow' | 'star' | 'diamond';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type TextAlign = 'left' | 'center' | 'right';

export type CanvasBackgroundType = 'plain' | 'grid' | 'dots' | 'lines' | 'chalkboard';

export type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rotate' | 'body' | 'compass-needle' | 'compass-pencil' | 'compass-body';

export interface Point {
  x: number;
  y: number;
  pressure?: number; // 0.0 to 1.0 (defaults to 0.5 if not available)
  time?: number;     // timestamp in ms
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BaseWhiteboardObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  parentGroupId?: string;
}

export interface FreehandStroke extends BaseWhiteboardObject {
  type: 'stroke';
  /**
   * Legacy tool family. Always written, including for the newer pens, so a
   * document stays readable by older builds and by the existing eraser,
   * selection and export paths.
   */
  tool: 'pen' | 'marker' | 'pencil' | 'brush' | 'crayon' | 'highlighter' | 'magic_pen';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  smooth?: boolean;
  maxAge?: number;

  /**
   * Pen family id, e.g. 'fountain'. Absent on strokes drawn before the pen
   * system existed, which render through the original code path unchanged.
   */
  penId?: string;
  /**
   * Resolved appearance captured at draw time. A stroke keeps how it looked even
   * if the preset is later edited or the active pen is changed.
   */
  penSettings?: {
    smoothing?: 'off' | 'low' | 'medium' | 'high';
    pressureSensitivity?: 'off' | 'low' | 'medium' | 'high';
    spacing?: number;
    dashLength?: number;
    texture?: number;
    nibAngle?: number;
    glowIntensity?: number;
    minWidthRatio?: number;
    maxWidthRatio?: number;
    compositeMode?: string;
    lineCap?: string;
    renderMode?: string;
    // Crayon specifics
    textureDensity?: number;
    roughness?: number;
    textureSeed?: number;
    // Magic Pen specifics
    magicEffect?: 'glow' | 'highlight';
  };
}

export interface ShapeObject extends BaseWhiteboardObject {
  type: 'shape';
  shapeType: ShapeType;
  strokeColor: string;
  fillColor: string; // 'transparent' or hex/rgba color
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  opacity?: number;
  points?: Point[];  // start [0] and end [1] for line/arrow, or polygon vertices
}

export interface TextObject extends BaseWhiteboardObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign: TextAlign;
  color: string;
  backgroundColor?: string;
  padding?: number;
  lineHeight?: number;
}

// Union of all whiteboard object types
export interface ImageObject extends BaseWhiteboardObject {
  type: 'image';
  dataUrl?: string; // Optional: legacy Base64 or object URL fallback
  assetId?: string; // Reference to AssetManager storage
  src?: string;     // Transient object URL for fast rendering
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  crop?: { x: number; y: number; width: number; height: number };
  flipX?: boolean;
  flipY?: boolean;
  metadata?: Record<string, any>;
}

export interface TeachingToolObject extends BaseWhiteboardObject {
  type: 'teaching-tool';
  toolId: string;
  toolData: Record<string, any>;
}

export interface YouTubeVideoObject extends BaseWhiteboardObject {
  type: 'youtubeVideo';
  videoId: string;
  originalUrl?: string;
  title?: string;
  thumbnail?: string;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
  startTime: number;
  isInteractive?: boolean;
}

/**
 * A local video file placed on the board. The file itself lives in IndexedDB
 * under `mediaId` -- embedding it in the document as a data URL would make saved
 * boards enormous. `posterDataUrl` is a still frame captured at import so the
 * object can render (and export) without decoding the video.
 */
export interface VideoObject extends BaseWhiteboardObject {
  type: 'video';
  mediaId: string;
  mimeType: string;
  posterDataUrl: string;
  durationSeconds: number;
  fileName?: string;
  muted: boolean;
  loop: boolean;
}

/**
 * A local audio file, drawn on the board as a compact player card. The bytes
 * live in the asset store under `mediaId`; only the waveform preview and the
 * settings travel in the document.
 */
export interface AudioObject extends BaseWhiteboardObject {
  type: 'audio';
  mediaId: string;
  mimeType: string;
  title: string;
  durationSeconds: number;
  fileName?: string;
  muted: boolean;
  loop: boolean;
  volume: number;
  playbackRate: number;
  autoplay: boolean;
  showVisualizer: boolean;
  /** Normalised 0..1 peaks sampled at import, so the card can draw a waveform
   *  without decoding the file again on every render. */
  waveform?: number[];
}

/**
 * A picture with a sound attached: the core vocabulary and phonics object.
 * Image and audio are replaceable independently, so a teacher can keep the
 * picture and swap the pronunciation.
 */
export interface ImageAudioObject extends BaseWhiteboardObject {
  type: 'image-audio';
  /** Picture. Small images may be inline; larger ones reference an asset. */
  imageDataUrl?: string;
  imageAssetId?: string;
  imageMimeType?: string;
  /** Sound. */
  audioMediaId: string;
  audioMimeType: string;
  title: string;
  durationSeconds: number;
  fileName?: string;
  muted: boolean;
  loop: boolean;
  volume: number;
  playbackRate: number;
  /** 'off' | 'open' (when the page is shown) | 'click' (when tapped). */
  autoplayMode: 'off' | 'open' | 'click';
  /** Non-destructive crop of the picture, as fractions of the natural size. */
  crop?: { x: number; y: number; width: number; height: number };
  /** Height of the player strip beneath the picture, in world units. */
  playerHeight: number;
}

/**
 * A PDF placed on the board as a single object (Mode B). The file lives in the
 * asset store; pages are rasterised lazily and cached by the renderer, so a long
 * worksheet does not decode every page on open.
 *
 * Importing a PDF as separate whiteboard pages (Mode A) still goes through the
 * existing PDF import modal and produces image objects.
 */
export interface PdfObject extends BaseWhiteboardObject {
  type: 'pdf';
  assetId: string;
  fileName?: string;
  pageCount: number;
  /** 1-based. */
  currentPage: number;
  /** First page, captured at import, so the object draws instantly and exports. */
  posterDataUrl?: string;
  /** Natural page size at scale 1, used to keep the aspect ratio on page change. */
  pageWidth: number;
  pageHeight: number;
  /** Quarter turns applied on top of the page's own orientation. */
  pageRotation: 0 | 90 | 180 | 270;
  fitMode: 'fit' | 'fill' | 'original';
}

export interface ColoringRegion extends BaseWhiteboardObject {
  type: 'coloringRegion';
  fillColor: string;
  tolerance: number;
  opacity: number;
  points: Point[]; // Represents the boundary path or flood fill mask simplified points
}

export interface CircleObject extends BaseWhiteboardObject {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface ArcObject extends BaseWhiteboardObject {
  type: 'arc';
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface CompassObject extends BaseWhiteboardObject {
  type: 'compass';
  centerX: number;
  centerY: number;
  radius: number;
  angle: number;
  needleAngle?: number;
  pencilAngle?: number;
}

export interface GroupObject extends BaseWhiteboardObject {
  type: 'group';
  children: string[]; // IDs of child objects
}

export type WhiteboardObject = FreehandStroke | ShapeObject | TextObject | ImageObject | TeachingToolObject | YouTubeVideoObject | VideoObject | AudioObject | ImageAudioObject | PdfObject | ColoringRegion | CircleObject | ArcObject | CompassObject | GroupObject;

/** Object types the media system owns. */
export type MediaWhiteboardObject =
  | ImageObject
  | VideoObject
  | AudioObject
  | ImageAudioObject
  | PdfObject
  | YouTubeVideoObject;

export interface Page {
  id: string;
  name: string;
  title?: string;
  width?: number;
  height?: number;
  background: string;
  backgroundType: CanvasBackgroundType;
  objects: WhiteboardObject[];
  createdAt: number;
  updatedAt: number;
}

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number; // 1.0 = 100%
}

export interface ToolSettings {
  tool: ToolType;
  color: string;
  penWidth: number;
  pencilWidth: number;
  brushWidth: number;
  crayonWidth: number;
  highlighterWidth: number;
  markerWidth: number;
  eraserWidth: number;
  markerOpacity: number;
  opacity: number;
  smoothingLevel: SmoothingLevel;
  eraserMode: EraserMode;
  shapeType: ShapeType;
  shapeFillColor: string;
  shapeStrokeStyle: StrokeStyle;
  shapeStrokeWidth: number;
  textFontSize: number;
  textFontFamily: string;
  textFontWeight: 'normal' | 'bold';
  textFontStyle: 'normal' | 'italic';
  textUnderline: boolean;
  textAlign: TextAlign;
  textColor: string;

  /** Active pen family preset id, e.g. 'fine' or 'highlighter'. */
  activePenId: string;
  /**
   * Per-pen overrides. Undefined means "use the preset value", which is what
   * lets a teacher tweak the marker without disturbing the other pens.
   */
  penSizeOverride?: number;
  penOpacityOverride?: number;
  /** Set when a colour-pinned pen (highlighter, glow) has its colour changed. */
  penColorOverride?: string;
  /** Crayon specific overrides */
  penTextureDensityOverride?: number;
  penRoughnessOverride?: number;
  
  /** Magic Pen specific settings */
  magicPenMode: 'ink' | 'spotlight' | 'magnifier' | 'highlight';
  magicPenDuration: number; // 0 means 'Never'
  magicPenMagnification: number; // e.g. 1.5, 2.0
  magicPenPermanent: boolean;
}

export interface ObjectTransformState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  points?: Point[];
}

export interface TextEditRequest {
  id?: string;
  worldPoint: Point;
  initialText?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: TextAlign;
  color?: string;
  width?: number;
  height?: number;
  rotation?: number;
}
