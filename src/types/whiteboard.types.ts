export type ToolType = 'pen' | 'marker' | 'eraser' | 'shape' | 'text' | 'select' | 'pan' | 'laser' | 'spotlight';

export type EraserMode = 'stroke' | 'area';

export type ShapeType = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'circle' | 'triangle' | 'line' | 'arrow' | 'star' | 'diamond';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type TextAlign = 'left' | 'center' | 'right';

export type CanvasBackgroundType = 'plain' | 'grid' | 'dots' | 'lines' | 'chalkboard';

export type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rotate' | 'body';

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
}

export interface FreehandStroke extends BaseWhiteboardObject {
  type: 'stroke';
  tool: 'pen' | 'marker';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  smooth?: boolean;
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
  dataUrl: string; // Base64 encoded image data
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
}

export interface TeachingToolObject extends BaseWhiteboardObject {
  type: 'teaching-tool';
  toolId: string;
  toolData: Record<string, any>;
}

export type WhiteboardObject = FreehandStroke | ShapeObject | TextObject | ImageObject | TeachingToolObject;

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
  markerWidth: number;
  eraserWidth: number;
  markerOpacity: number;
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
