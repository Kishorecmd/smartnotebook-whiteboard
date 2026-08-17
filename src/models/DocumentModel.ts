import { z } from 'zod';
import {
  JHWDocument,
  Page,
  FreehandStroke,
  ShapeObject,
  TextObject,
  Point,
  CanvasBackgroundType,
  WhiteboardObject,
  ShapeType,
  StrokeStyle,
  TextAlign,
} from '../types';
import { generateId } from '../utils';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().min(0).max(1).optional(),
  time: z.number().optional(),
});

export const BaseWhiteboardObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  zIndex: z.number().default(0),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
  parentGroupId: z.string().optional(),
});

export const FreehandStrokeSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('stroke'),
  tool: z.enum(['pen', 'marker', 'pencil', 'brush', 'crayon', 'highlighter', 'magic_pen']),
  points: z.array(PointSchema),
  color: z.string(),
  width: z.number().positive(),
  opacity: z.number().min(0).max(1),
  smooth: z.boolean().optional(),
  // Pen family. Optional so documents written before the pen system still load,
  // and permissive so a board saved with a future custom pen is not rejected.
  penId: z.string().optional(),
  penSettings: z
    .object({
      smoothing: z.string().optional(),
      pressureSensitivity: z.string().optional(),
      spacing: z.number().optional(),
      dashLength: z.number().optional(),
      texture: z.number().optional(),
      nibAngle: z.number().optional(),
      glowIntensity: z.number().optional(),
      minWidthRatio: z.number().optional(),
      maxWidthRatio: z.number().optional(),
      compositeMode: z.string().optional(),
      lineCap: z.string().optional(),
      renderMode: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const ShapeObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'rounded-rectangle', 'ellipse', 'circle', 'triangle', 'line', 'arrow', 'star', 'diamond']),
  strokeColor: z.string(),
  fillColor: z.string(),
  strokeWidth: z.number().positive(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  opacity: z.number().min(0).max(1).optional(),
  points: z.array(PointSchema).optional(),
});

export const TextObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().positive(),
  fontFamily: z.string(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  underline: z.boolean().optional(),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  color: z.string(),
  backgroundColor: z.string().optional(),
  padding: z.number().optional(),
  lineHeight: z.number().optional(),
});

export const ImageObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('image'),
  dataUrl: z.string().optional(),
  assetId: z.string().optional(),
  src: z.string().optional(),
  mimeType: z.string(),
  originalWidth: z.number(),
  originalHeight: z.number(),
  crop: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const TeachingToolObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('teaching-tool'),
  toolId: z.string(),
  toolData: z.record(z.string(), z.any()),
});

export const YouTubeVideoObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('youtubeVideo'),
  videoId: z.string(),
  originalUrl: z.string().optional(),
  title: z.string().optional(),
  thumbnail: z.string().optional(),
  autoplay: z.boolean().default(false),
  muted: z.boolean().default(false),
  controls: z.boolean().default(true),
  // Documents saved before startTime existed omit it, so default rather than reject.
  startTime: z.number().default(0),
  isInteractive: z.boolean().optional(),
});

export const WebAppObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('webApp'),
  url: z.string(),
  title: z.string(),
  isInteractive: z.boolean().optional(),
});

export const VideoObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('video'),
  mediaId: z.string(),
  mimeType: z.string(),
  posterDataUrl: z.string(),
  durationSeconds: z.number().default(0),
  fileName: z.string().optional(),
  muted: z.boolean().default(false),
  loop: z.boolean().default(false),
});

export const AudioObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('audio'),
  mediaId: z.string(),
  mimeType: z.string(),
  title: z.string().default('Audio'),
  durationSeconds: z.number().default(0),
  fileName: z.string().optional(),
  muted: z.boolean().default(false),
  loop: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  playbackRate: z.number().positive().default(1),
  autoplay: z.boolean().default(false),
  showVisualizer: z.boolean().default(true),
  waveform: z.array(z.number()).optional(),
});

export const ImageAudioObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('image-audio'),
  imageDataUrl: z.string().optional(),
  imageAssetId: z.string().optional(),
  imageMimeType: z.string().optional(),
  audioMediaId: z.string(),
  audioMimeType: z.string(),
  title: z.string().default('Image + Audio'),
  durationSeconds: z.number().default(0),
  fileName: z.string().optional(),
  muted: z.boolean().default(false),
  loop: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  playbackRate: z.number().positive().default(1),
  autoplayMode: z.enum(['off', 'open', 'click']).default('off'),
  crop: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .optional(),
  playerHeight: z.number().default(56),
});

export const PdfObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('pdf'),
  assetId: z.string(),
  fileName: z.string().optional(),
  pageCount: z.number().int().positive().default(1),
  currentPage: z.number().int().positive().default(1),
  posterDataUrl: z.string().optional(),
  pageWidth: z.number().positive().default(595),
  pageHeight: z.number().positive().default(842),
  pageRotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  fitMode: z.enum(['fit', 'fill', 'original']).default('fit'),
});

export const ColoringRegionSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('coloringRegion'),
  fillColor: z.string(),
  tolerance: z.number(),
  opacity: z.number().min(0).max(1),
  points: z.array(PointSchema),
});

export const CircleObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('circle'),
  centerX: z.number(),
  centerY: z.number(),
  radius: z.number(),
  strokeColor: z.string(),
  strokeWidth: z.number(),
  opacity: z.number(),
});

export const ArcObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('arc'),
  centerX: z.number(),
  centerY: z.number(),
  radius: z.number(),
  startAngle: z.number(),
  endAngle: z.number(),
  strokeColor: z.string(),
  strokeWidth: z.number(),
  opacity: z.number(),
});

export const CompassObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('compass'),
  centerX: z.number(),
  centerY: z.number(),
  radius: z.number(),
  angle: z.number(),
  needleAngle: z.number().optional(),
  pencilAngle: z.number().optional(),
});

export const GroupObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('group'),
  children: z.array(z.string()),
});

// Must stay in sync with the WhiteboardObject union in types/whiteboard.types.ts --
// an object type missing here is silently rejected on load.
export const WhiteboardObjectSchema = z.discriminatedUnion('type', [
  FreehandStrokeSchema,
  ShapeObjectSchema,
  TextObjectSchema,
  ImageObjectSchema,
  TeachingToolObjectSchema,
  YouTubeVideoObjectSchema,
  VideoObjectSchema,
  AudioObjectSchema,
  ImageAudioObjectSchema,
  PdfObjectSchema,
  ColoringRegionSchema,
  CircleObjectSchema,
  ArcObjectSchema,
  CompassObjectSchema,
  GroupObjectSchema,
  WebAppObjectSchema,
]);

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  background: z.string().default('#ffffff'),
  backgroundType: z.enum(['plain', 'grid', 'dots', 'lines', 'chalkboard']).default('plain'),
  objects: z.array(WhiteboardObjectSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const JHWDocumentSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  title: z.string(),
  pages: z.array(PageSchema).min(1),
  activePageIndex: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.object({
    author: z.string().optional(),
    appVersion: z.string().optional(),
    description: z.string().optional(),
}).optional(),
}).superRefine((document, context) => {
  if (document.activePageIndex >= document.pages.length) {
    context.addIssue({
      code: 'custom',
      path: ['activePageIndex'],
      message: 'Active page index must refer to an existing page',
    });
  }
});

export function createDefaultPage(name: string = 'Page 1'): Page {
  const now = Date.now();
  return {
    id: generateId('page'),
    name,
    title: name,
    background: '#ffffff',
    backgroundType: 'plain',
    objects: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createPageObject(
  paramsOrTitle?: string | number | {
    title?: string;
    name?: string;
    background?: string;
    backgroundType?: CanvasBackgroundType;
    objects?: WhiteboardObject[];
  },
  background: string = '#ffffff',
  backgroundType: CanvasBackgroundType = 'plain'
): Page {
  const now = Date.now();
  if (typeof paramsOrTitle === 'string' || typeof paramsOrTitle === 'number') {
    const title = typeof paramsOrTitle === 'number' ? `Page ${paramsOrTitle + 1}` : (paramsOrTitle || 'Page');
    return {
      id: generateId('page'),
      name: title,
      title,
      background,
      backgroundType,
      objects: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  const params = paramsOrTitle || {};
  const title = params.title || params.name || 'Page';
  return {
    id: generateId('page'),
    name: title,
    title,
    background: params.background || '#ffffff',
    backgroundType: params.backgroundType || 'plain',
    objects: params.objects || [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultDocument(title: string = 'Untitled Lesson'): JHWDocument {
  const now = Date.now();

  return {
    version: 1,
    id: generateId('doc'),
    title,
    // Starts empty: a placeholder video here would load the YouTube iframe API
    // on every fresh board.
    pages: [createPageObject({ title: 'Page 1', objects: [] })],
    activePageIndex: 0,
    createdAt: now,
    updatedAt: now,
    metadata: {
      appVersion: '1.0.0',
    },
  };
}

export function createStrokeObject(params: {
  // Derived from the object type rather than repeated, so adding a tool family
  // (magic_pen was the last one) cannot leave this signature behind.
  tool: FreehandStroke['tool'];
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  zIndex?: number;
}): FreehandStroke {
  const now = Date.now();
  // Compute bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of params.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  if (params.points.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  const boxHeight = Math.max(1, maxY - minY);

  return {
    id: generateId('stroke'),
    type: 'stroke',
    tool: params.tool,
    points: params.points,
    color: params.color,
    width: params.width,
    opacity: params.opacity,
    x: minX,
    y: minY,
    height: boxHeight,
    rotation: 0,
    zIndex: params.zIndex ?? 0,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createShapeObject(params: {
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
  rotation?: number;
  zIndex?: number;
  points?: Point[];
}): ShapeObject {
  const now = Date.now();
  return {
    id: generateId('shape'),
    type: 'shape',
    shapeType: params.shapeType,
    x: params.x,
    y: params.y,
    width: Math.max(1, Math.abs(params.width)),
    height: Math.max(1, Math.abs(params.height)),
    strokeColor: params.strokeColor,
    fillColor: params.fillColor ?? 'transparent',
    strokeWidth: params.strokeWidth,
    strokeStyle: params.strokeStyle ?? 'solid',
    rotation: params.rotation ?? 0,
    zIndex: params.zIndex ?? 0,
    visible: true,
    locked: false,
    points: params.points,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTextObject(params: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: TextAlign;
  color: string;
  backgroundColor?: string;
  padding?: number;
  lineHeight?: number;
  rotation?: number;
  zIndex?: number;
}): TextObject {
  const now = Date.now();
  return {
    id: generateId('text'),
    type: 'text',
    text: params.text,
    x: params.x,
    y: params.y,
    width: Math.max(10, params.width),
    height: Math.max(10, params.height),
    fontSize: params.fontSize,
    fontFamily: params.fontFamily,
    fontWeight: params.fontWeight ?? 'normal',
    fontStyle: params.fontStyle ?? 'normal',
    underline: params.underline ?? false,
    textAlign: params.textAlign ?? 'left',
    color: params.color,
    backgroundColor: params.backgroundColor,
    padding: params.padding ?? 8,
    lineHeight: params.lineHeight ?? 1.25,
    rotation: params.rotation ?? 0,
    zIndex: params.zIndex ?? 0,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateDocument(data: unknown): JHWDocument {
  // Older builds could leave this field stale when pages were deleted. Repair
  // that one known legacy defect before applying strict schema validation.
  let normalizedData = data;
  if (typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages) && data.pages.length > 0) {
    const candidate = data as Record<string, unknown>;
    const rawIndex = typeof candidate.activePageIndex === 'number' && Number.isFinite(candidate.activePageIndex)
      ? Math.trunc(candidate.activePageIndex)
      : 0;
    normalizedData = {
      ...candidate,
      activePageIndex: Math.min(Math.max(0, rawIndex), data.pages.length - 1),
    };
  }

  const result = JHWDocumentSchema.safeParse(normalizedData);
  if (result.success) {
    return result.data as JHWDocument;
  }
  const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
  throw new Error(`Invalid .jhw document: ${issues}`);
}
