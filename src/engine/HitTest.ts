import { Point, FreehandStroke, ShapeObject, TextObject, ImageObject, WhiteboardObject, BoundingBox, HandleType } from '../types';
import {
  distance,
  distanceToSegment,
  calculateBoundingBox,
  getObjectBoundingBox,
  pointInBox,
  boxesIntersect,
  isPointInPolygon,
  isPointInEllipse,
  distanceToPolygonPerimeter,
  getHandlePositions,
  rotatePoint,
} from '../utils';
import { createStrokeObject } from '../models';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';
import { TeachingToolObject } from '../types';

export class HitTest {
  /**
   * Tests if a world point intersects a freehand stroke.
   */
  public static hitTestStroke(
    point: Point,
    stroke: FreehandStroke,
    tolerance: number = 10
  ): boolean {
    if (!stroke.visible || stroke.points.length === 0) return false;

    const threshold = tolerance + stroke.width / 2;

    // 1. Fast Bounding Box Pre-Check
    const bbox = calculateBoundingBox(stroke.points, threshold);
    if (!pointInBox(point, bbox)) {
      return false;
    }

    const points = stroke.points;

    // 2. Single point stroke
    if (points.length === 1) {
      return distance(point, points[0]) <= threshold;
    }

    // 3. Multi-segment Polyline Check
    for (let i = 0; i < points.length - 1; i++) {
      const dist = distanceToSegment(point, points[i], points[i + 1]);
      if (dist <= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Tests if a world point intersects a shape object (fill or stroke outline).
   */
  public static hitTestShape(
    point: Point,
    shape: ShapeObject,
    tolerance: number = 8
  ): boolean {
    if (!shape.visible) return false;

    const effectiveTol = tolerance + shape.strokeWidth / 2;

    // Apply inverse rotation around shape center
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const localPt = shape.rotation !== 0
      ? rotatePoint(point, { x: cx, y: cy }, -shape.rotation)
      : point;

    const hasFill = shape.fillColor && shape.fillColor !== 'transparent' && shape.fillColor !== 'none';

    switch (shape.shapeType) {
      case 'rectangle':
      case 'rounded-rectangle': {
        const box: BoundingBox = {
          minX: shape.x - effectiveTol,
          minY: shape.y - effectiveTol,
          maxX: shape.x + shape.width + effectiveTol,
          maxY: shape.y + shape.height + effectiveTol,
          width: shape.width + effectiveTol * 2,
          height: shape.height + effectiveTol * 2,
        };

        if (!pointInBox(localPt, box)) return false;
        if (hasFill) return true;

        // Check perimeter
        const leftDist = Math.abs(localPt.x - shape.x);
        const rightDist = Math.abs(localPt.x - (shape.x + shape.width));
        const topDist = Math.abs(localPt.y - shape.y);
        const bottomDist = Math.abs(localPt.y - (shape.y + shape.height));

        const nearVertical = (leftDist <= effectiveTol || rightDist <= effectiveTol) &&
          localPt.y >= shape.y - effectiveTol && localPt.y <= shape.y + shape.height + effectiveTol;
        const nearHorizontal = (topDist <= effectiveTol || bottomDist <= effectiveTol) &&
          localPt.x >= shape.x - effectiveTol && localPt.x <= shape.x + shape.width + effectiveTol;

        return nearVertical || nearHorizontal;
      }

      case 'ellipse':
      case 'circle': {
        const rx = shape.width / 2;
        const ry = shape.height / 2;
        if (rx <= 0 || ry <= 0) return false;

        const isInside = isPointInEllipse(localPt, cx, cy, rx + effectiveTol, ry + effectiveTol);
        if (!isInside) return false;
        if (hasFill) return true;

        // Check ellipse outline distance approximation
        const dx = localPt.x - cx;
        const dy = localPt.y - cy;
        const normalizedDist = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
        return Math.abs(normalizedDist - 1) * Math.min(rx, ry) <= effectiveTol;
      }

      case 'triangle': {
        const p1 = { x: shape.x + shape.width / 2, y: shape.y };
        const p2 = { x: shape.x, y: shape.y + shape.height };
        const p3 = { x: shape.x + shape.width, y: shape.y + shape.height };
        const vertices = [p1, p2, p3];

        if (hasFill && isPointInPolygon(localPt, vertices)) {
          return true;
        }
        return distanceToPolygonPerimeter(localPt, vertices) <= effectiveTol;
      }

      case 'diamond': {
        const p1 = { x: cx, y: shape.y };
        const p2 = { x: shape.x + shape.width, y: cy };
        const p3 = { x: cx, y: shape.y + shape.height };
        const p4 = { x: shape.x, y: cy };
        const vertices = [p1, p2, p3, p4];

        if (hasFill && isPointInPolygon(localPt, vertices)) {
          return true;
        }
        return distanceToPolygonPerimeter(localPt, vertices) <= effectiveTol;
      }

      case 'star': {
        const spikes = 5;
        const outerRadius = Math.min(shape.width, shape.height) / 2;
        const innerRadius = outerRadius * 0.4;
        const vertices: Point[] = [];

        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          vertices.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
          });
        }

        if (hasFill && isPointInPolygon(localPt, vertices)) {
          return true;
        }
        return distanceToPolygonPerimeter(localPt, vertices) <= effectiveTol;
      }

      case 'line':
      case 'arrow': {
        const p1 = shape.points && shape.points[0] ? shape.points[0] : { x: shape.x, y: shape.y };
        const p2 = shape.points && shape.points[1] ? shape.points[1] : { x: shape.x + shape.width, y: shape.y + shape.height };
        return distanceToSegment(point, p1, p2) <= effectiveTol;
      }

      default:
        return false;
    }
  }

  /**
   * Tests if a world point intersects a text object (including rotation).
   */
  public static hitTestText(
    point: Point,
    textObj: TextObject,
    tolerance: number = 8
  ): boolean {
    if (!textObj.visible) return false;

    // Apply inverse rotation around text center
    const cx = textObj.x + textObj.width / 2;
    const cy = textObj.y + textObj.height / 2;
    const localPt = textObj.rotation !== 0
      ? rotatePoint(point, { x: cx, y: cy }, -textObj.rotation)
      : point;

    const box: BoundingBox = {
      minX: textObj.x - tolerance,
      minY: textObj.y - tolerance,
      maxX: textObj.x + textObj.width + tolerance,
      maxY: textObj.y + textObj.height + tolerance,
      width: textObj.width + tolerance * 2,
      height: textObj.height + tolerance * 2,
    };

    return pointInBox(localPt, box);
  }

  /**
   * Tests if a world point intersects an image object.
   */
  public static hitTestImage(
    point: Point,
    imageObj: ImageObject,
    tolerance: number = 8
  ): boolean {
    if (!imageObj.visible) return false;

    const cx = imageObj.x + imageObj.width / 2;
    const cy = imageObj.y + imageObj.height / 2;
    const localPt = imageObj.rotation !== 0
      ? rotatePoint(point, { x: cx, y: cy }, -imageObj.rotation)
      : point;

    const box: BoundingBox = {
      minX: imageObj.x - tolerance,
      minY: imageObj.y - tolerance,
      maxX: imageObj.x + imageObj.width + tolerance,
      maxY: imageObj.y + imageObj.height + tolerance,
      width: imageObj.width + tolerance * 2,
      height: imageObj.height + tolerance * 2,
    };

    return pointInBox(localPt, box);
  }

  /**
   * Generic hit test for any whiteboard object.
   */
  public static hitTestObject(
    point: Point,
    obj: WhiteboardObject,
    tolerance: number = 8
  ): boolean {
    if (obj.type === 'stroke') {
      return this.hitTestStroke(point, obj, tolerance);
    }
    if (obj.type === 'shape') {
      return this.hitTestShape(point, obj, tolerance);
    }
    if (obj.type === 'text') {
      return this.hitTestText(point, obj, tolerance);
    }
    if (obj.type === 'image' || obj.type === 'youtubeVideo') {
      return this.hitTestImage(point, obj as ImageObject, tolerance);
    }
    if (obj.type === 'teaching-tool') {
      const teachingObj = obj as TeachingToolObject;
      const toolDef = TeachingToolRegistry.getTool(teachingObj.toolId);
      if (toolDef && toolDef.hitTest) {
        return !!toolDef.hitTest(teachingObj, point, 1.0); // zoom handles in renderer
      }
      return false; // if no custom hit test, not selectable
    }
    return false;
  }

  /**
   * Finds the topmost object at a given world coordinate.
   */
  public static findObjectAtPoint(
    point: Point,
    objects: WhiteboardObject[],
    tolerance: number = 8
  ): WhiteboardObject | null {
    // Search in reverse z-order (topmost first)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (this.hitTestObject(point, obj, tolerance)) {
        return obj;
      }
    }
    return null;
  }

  /**
   * Returns all objects (strokes or shapes) that intersect with the given eraser point.
   */
  public static findIntersectingObjects(
    point: Point,
    objects: WhiteboardObject[],
    eraserRadius: number = 10
  ): WhiteboardObject[] {
    const hits: WhiteboardObject[] = [];
    for (let i = 0; i < objects.length; i++) {
      if (this.hitTestObject(point, objects[i], eraserRadius)) {
        hits.push(objects[i]);
      }
    }
    return hits;
  }

  /**
   * Returns all strokes that intersect with the given eraser point.
   */
  public static findIntersectingStrokes(
    point: Point,
    strokes: FreehandStroke[],
    eraserRadius: number = 10
  ): FreehandStroke[] {
    const hits: FreehandStroke[] = [];
    for (let i = 0; i < strokes.length; i++) {
      if (this.hitTestStroke(point, strokes[i], eraserRadius)) {
        hits.push(strokes[i]);
      }
    }
    return hits;
  }

  /**
   * Returns all objects intersecting with or enclosed inside a marquee selection box.
   */
  public static findObjectsInBox(
    box: BoundingBox,
    objects: WhiteboardObject[]
  ): WhiteboardObject[] {
    const hits: WhiteboardObject[] = [];

    for (const obj of objects) {
      if (!obj.visible) continue;
      const objBox = getObjectBoundingBox(obj, 0);
      if (boxesIntersect(box, objBox)) {
        hits.push(obj);
      }
    }

    return hits;
  }

  /**
   * Hit tests bounding box resize/rotation handles.
   */
  public static hitTestHandle(
    point: Point,
    box: BoundingBox,
    zoom: number = 1.0,
    handleRadiusPx: number = 12
  ): HandleType | null {
    const worldRadius = handleRadiusPx / Math.max(0.1, zoom);
    const handles = getHandlePositions(box, zoom);

    // Check rotate handle first
    if (distance(point, handles.rotate) <= worldRadius * 1.5) {
      return 'rotate';
    }

    // Check corner handles
    const order: HandleType[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];
    for (const h of order) {
      if (distance(point, handles[h]) <= worldRadius) {
        return h;
      }
    }

    // Check body if inside the box
    if (pointInBox(point, box)) {
      return 'body';
    }

    return null;
  }

  /**
   * Splits a stroke into multiple sub-strokes by removing points within the erase radius (Area Eraser).
   */
  public static areaEraseStroke(
    stroke: FreehandStroke,
    eraseCenter: Point,
    eraseRadius: number
  ): FreehandStroke[] {
    const effectiveRadius = eraseRadius + stroke.width / 4;
    const points = stroke.points;
    const subSegments: Point[][] = [];
    let currentSegment: Point[] = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const dist = distance(eraseCenter, pt);

      if (dist > effectiveRadius) {
        currentSegment.push(pt);
      } else {
        if (currentSegment.length > 0) {
          subSegments.push(currentSegment);
          currentSegment = [];
        }
      }
    }

    if (currentSegment.length > 0) {
      subSegments.push(currentSegment);
    }

    const resultingStrokes: FreehandStroke[] = [];
    for (const segment of subSegments) {
      if (segment.length > 0) {
        resultingStrokes.push(
          createStrokeObject({
            tool: stroke.tool,
            points: segment,
            color: stroke.color,
            width: stroke.width,
            opacity: stroke.opacity,
            zIndex: stroke.zIndex,
          })
        );
      }
    }

    return resultingStrokes;
  }
}
