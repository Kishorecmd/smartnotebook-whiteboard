import { Point, BoundingBox, WhiteboardObject, HandleType, TeachingToolObject } from '../types/whiteboard.types';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getMidPoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    pressure: ((p1.pressure ?? 0.5) + (p2.pressure ?? 0.5)) / 2,
    time: ((p1.time ?? 0) + (p2.time ?? 0)) / 2,
  };
}

export function rotatePoint(p: Point, center: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
    pressure: p.pressure,
    time: p.time,
  };
}

/**
 * Calculates the perpendicular distance from point P to line segment AB.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return distance(p, a);
  }

  // Projection scalar t on the line segment AB
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = clamp(t, 0, 1);

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  const distX = p.x - projX;
  const distY = p.y - projY;
  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Computes the axis-aligned bounding box for a series of points.
 */
export function calculateBoundingBox(points: Point[], padding: number = 0): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/**
 * Computes bounding box for any whiteboard object (stroke or shape).
 */
export function getObjectBoundingBox(obj: WhiteboardObject, padding: number = 0): BoundingBox {
  if (obj.type === 'stroke') {
    return calculateBoundingBox(obj.points, padding + obj.width / 2);
  }

  if (obj.type === 'shape') {
    if ((obj.shapeType === 'line' || obj.shapeType === 'arrow') && obj.points && obj.points.length >= 2) {
      return calculateBoundingBox(obj.points, padding + obj.strokeWidth / 2);
    }

    const minX = obj.x - padding;
    const minY = obj.y - padding;
    const maxX = obj.x + obj.width + padding;
    const maxY = obj.y + obj.height + padding;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }
  if (
    obj.type === 'text' ||
    obj.type === 'audio' ||
    obj.type === 'image-audio' ||
    obj.type === 'image' ||
    obj.type === 'youtubeVideo' ||
    obj.type === 'video' ||
    obj.type === 'circle' ||
    obj.type === 'arc' ||
    obj.type === 'compass'
  ) {
    const minX = obj.x - padding;
    const minY = obj.y - padding;
    const maxX = obj.x + obj.width + padding;
    const maxY = obj.y + obj.height + padding;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  if (obj.type === 'teaching-tool') {
    const teachingObj = obj as TeachingToolObject;
    const toolDef = TeachingToolRegistry.getTool(teachingObj.toolId);
    if (toolDef && toolDef.getBoundingBox) {
      return toolDef.getBoundingBox(teachingObj);
    }
    
    const minX = obj.x - padding;
    const minY = obj.y - padding;
    const maxX = obj.x + obj.width + padding;
    const maxY = obj.y + obj.height + padding;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
}

/**
 * Computes the composite bounding box encompassing an array of objects.
 */
export function getCombinedBoundingBox(objects: WhiteboardObject[], padding: number = 0): BoundingBox | null {
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    if (!obj.visible) continue;
    const box = getObjectBoundingBox(obj, 0);
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  if (minX === Infinity) return null;

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

export function pointInBox(p: Point, box: BoundingBox): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
}

export function isPointInPolygon(p: Point, vs: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;

    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInEllipse(p: Point, cx: number, cy: number, rx: number, ry: number): boolean {
  if (rx <= 0 || ry <= 0) return false;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

export function distanceToPolygonPerimeter(p: Point, vs: Point[]): number {
  let minDist = Infinity;
  for (let i = 0; i < vs.length; i++) {
    const next = (i + 1) % vs.length;
    const d = distanceToSegment(p, vs[i], vs[next]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Handles derived from a bounding box. The compass handles are excluded on
 * purpose: they come from the compass's own geometry via CompassInteraction,
 * not from a box, so there is no sensible box position for them.
 */
export type BoxHandleType = Exclude<
  HandleType,
  'compass-needle' | 'compass-pencil' | 'compass-body'
>;

/**
 * Computes positions for 8-direction resize handles and the rotation stalk.
 */
export function getHandlePositions(box: BoundingBox, zoom: number): Record<BoxHandleType, Point> {
  const midX = box.minX + box.width / 2;
  const midY = box.minY + box.height / 2;
  const stalkOffset = 26 / Math.max(0.2, zoom);

  return {
    nw: { x: box.minX, y: box.minY },
    n: { x: midX, y: box.minY },
    ne: { x: box.maxX, y: box.minY },
    e: { x: box.maxX, y: midY },
    se: { x: box.maxX, y: box.maxY },
    s: { x: midX, y: box.maxY },
    sw: { x: box.minX, y: box.maxY },
    w: { x: box.minX, y: midY },
    rotate: { x: midX, y: box.minY - stalkOffset },
    body: { x: midX, y: midY },
  };
}
