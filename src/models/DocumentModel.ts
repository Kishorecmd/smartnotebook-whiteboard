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
});

export const FreehandStrokeSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('stroke'),
  tool: z.enum(['pen', 'marker']),
  points: z.array(PointSchema),
  color: z.string(),
  width: z.number().positive(),
  opacity: z.number().min(0).max(1),
  smooth: z.boolean().optional(),
});

export const ShapeObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'ellipse', 'triangle', 'line', 'arrow', 'star', 'diamond']),
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
  dataUrl: z.string(),
  mimeType: z.string(),
  originalWidth: z.number(),
  originalHeight: z.number(),
});

export const TeachingToolObjectSchema = BaseWhiteboardObjectSchema.extend({
  type: z.literal('teaching-tool'),
  toolId: z.string(),
  toolData: z.record(z.string(), z.any()),
});

export const WhiteboardObjectSchema = z.union([
  FreehandStrokeSchema,
  ShapeObjectSchema,
  TextObjectSchema,
  ImageObjectSchema,
  TeachingToolObjectSchema,
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
  activePageIndex: z.number().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.object({
    author: z.string().optional(),
    appVersion: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
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
    pages: [createDefaultPage('Page 1')],
    activePageIndex: 0,
    createdAt: now,
    updatedAt: now,
    metadata: {
      appVersion: '1.0.0',
    },
  };
}

export function createStrokeObject(params: {
  tool: 'pen' | 'marker';
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
  const result = JHWDocumentSchema.safeParse(data);
  if (result.success) {
    return result.data as JHWDocument;
  }
  const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
  throw new Error(`Invalid .jhw document: ${issues}`);
}
