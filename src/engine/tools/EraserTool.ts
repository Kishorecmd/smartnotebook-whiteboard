import { ITool } from './ITool';
import { Point, WhiteboardObject } from '../../types';
import { HitTest } from '../HitTest';
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand';
import { AreaEraseCommand } from '../commands/AreaEraseCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class EraserTool implements ITool {
  public readonly name: string = 'eraser';
  private activePointers: Set<number> = new Set();

  // Stroke mode state (erases whole objects: strokes or shapes)
  private erasedObjectsInDrag: Map<string, WhiteboardObject> = new Map();

  // Area mode state
  private initialObjectsBeforeDrag: WhiteboardObject[] | null = null;

  public onPointerDown(
    worldPoint: Point,
    screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.activePointers.add(_e.pointerId);
    const settings = engine.getToolSettings();
    const radius = settings.eraserWidth / 2;

    engine.getRenderer().setEraserPreview({
      x: screenPoint.x,
      y: screenPoint.y,
      radius,
    });

    if (settings.eraserMode === 'stroke') {
      this.erasedObjectsInDrag.clear();
      this.processStrokeErase(worldPoint, radius, engine);
    } else {
      this.initialObjectsBeforeDrag = [...engine.getObjects()];
      this.processAreaErase(worldPoint, radius, engine);
    }
  }

  public onPointerMove(
    worldPoint: Point,
    screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const settings = engine.getToolSettings();
    const radius = settings.eraserWidth / 2;

    engine.getRenderer().setEraserPreview({
      x: screenPoint.x,
      y: screenPoint.y,
      radius,
    });

    if (!this.activePointers.has(_e.pointerId)) return;

    if (settings.eraserMode === 'stroke') {
      this.processStrokeErase(worldPoint, radius, engine);
    } else {
      this.processAreaErase(worldPoint, radius, engine);
    }
  }

  public onPointerHover(
    _worldPoint: Point,
    screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const settings = engine.getToolSettings();
    engine.getRenderer().setEraserPreview({
      x: screenPoint.x,
      y: screenPoint.y,
      radius: settings.eraserWidth / 2,
    });
  }

  public onPointerUp(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (!this.activePointers.has(_e.pointerId)) return;
    this.activePointers.delete(_e.pointerId);
    
    // Only commit if all fingers have lifted
    if (this.activePointers.size > 0) return;

    const settings = engine.getToolSettings();

    if (settings.eraserMode === 'stroke') {
      if (this.erasedObjectsInDrag.size > 0) {
        const deletedArray = Array.from(this.erasedObjectsInDrag.values());
        const command = new DeleteObjectsCommand(
          deletedArray,
          () => engine.getObjects(),
          (objs) => engine.setObjects(objs)
        );
        engine.getCommandManager().execute(command);
      }
      this.erasedObjectsInDrag.clear();
    } else {
      if (this.initialObjectsBeforeDrag) {
        const currentObjects = engine.getObjects();
        if (currentObjects.length !== this.initialObjectsBeforeDrag.length ||
            currentObjects.some((o, i) => o !== this.initialObjectsBeforeDrag![i])) {
          const command = new AreaEraseCommand(
            this.initialObjectsBeforeDrag,
            currentObjects,
            (objs) => engine.setObjects(objs)
          );
          engine.getCommandManager().execute(command);
        }
      }
      this.initialObjectsBeforeDrag = null;
    }
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.activePointers.delete(_e.pointerId);
    if (this.activePointers.size > 0) return;
    
    this.erasedObjectsInDrag.clear();
    this.initialObjectsBeforeDrag = null;
    engine.getRenderer().setEraserPreview(null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.activePointers.clear();
    this.erasedObjectsInDrag.clear();
    this.initialObjectsBeforeDrag = null;
    engine.getRenderer().setEraserPreview(null);
  }

  private processStrokeErase(worldPoint: Point, radius: number, engine: WhiteboardEngine): void {
    const currentObjects = engine.getObjects();
    const hits = HitTest.findIntersectingObjects(worldPoint, currentObjects, radius);

    if (hits.length > 0) {
      let changed = false;
      const hitIds = new Set<string>();

      for (const h of hits) {
        if (!this.erasedObjectsInDrag.has(h.id)) {
          this.erasedObjectsInDrag.set(h.id, h);
          hitIds.add(h.id);
          changed = true;
        }
      }

      if (changed) {
        // Temporarily hide or remove from current live rendering
        const remaining = currentObjects.filter((o) => !hitIds.has(o.id));
        engine.setObjects(remaining, false); // false = don't push history yet
      }
    }
  }

  private processAreaErase(worldPoint: Point, radius: number, engine: WhiteboardEngine): void {
    const currentObjects = engine.getObjects();
    let hasChanges = false;
    const nextObjects: WhiteboardObject[] = [];

    for (const obj of currentObjects) {
      if (obj.type === 'stroke') {
        if (HitTest.hitTestStroke(worldPoint, obj, radius)) {
          hasChanges = true;
          const subStrokes = HitTest.areaEraseStroke(obj, worldPoint, radius);
          nextObjects.push(...subStrokes);
        } else {
          nextObjects.push(obj);
        }
      } else if (obj.type === 'shape') {
        if (HitTest.hitTestShape(worldPoint, obj, radius)) {
          hasChanges = true;
          // For area erase on shapes, remove the shape
        } else {
          nextObjects.push(obj);
        }
      } else {
        nextObjects.push(obj);
      }
    }

    if (hasChanges) {
      engine.setObjects(nextObjects, false);
    }
  }
}
