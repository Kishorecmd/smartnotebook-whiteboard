import { ITool } from './ITool';
import { Point } from '../../types';
import { createShapeObject } from '../../models';
import { AddObjectCommand } from '../commands/AddObjectCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class ShapeTool implements ITool {
  public readonly name: string = 'shape';
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private isDrawing: boolean = false;

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.isDrawing = true;
    this.startPoint = worldPoint;
    this.currentPoint = worldPoint;
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (!this.isDrawing || !this.startPoint) return;

    this.currentPoint = worldPoint;
    const settings = engine.getToolSettings();

    engine.getRenderer().setActiveShapePreview({
      shapeType: settings.shapeType,
      start: this.startPoint,
      current: this.currentPoint,
      strokeColor: settings.color,
      fillColor: settings.shapeFillColor,
      strokeWidth: settings.shapeStrokeWidth,
      strokeStyle: settings.shapeStrokeStyle,
      shiftKey: e.shiftKey,
    });
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (!this.isDrawing || !this.startPoint) return;
    this.isDrawing = false;
    this.currentPoint = worldPoint;

    const start = this.startPoint;
    let end = this.currentPoint;
    const settings = engine.getToolSettings();
    const shapeType = settings.shapeType;

    let x = Math.min(start.x, end.x);
    let y = Math.min(start.y, end.y);
    let width = Math.abs(end.x - start.x);
    let height = Math.abs(end.y - start.y);

    // Apply Shift modifier
    if (e.shiftKey && shapeType !== 'line' && shapeType !== 'arrow') {
      const maxDim = Math.max(width, height);
      width = maxDim;
      height = maxDim;
      x = end.x < start.x ? start.x - maxDim : start.x;
      y = end.y < start.y ? start.y - maxDim : start.y;
    }

    if (e.shiftKey && (shapeType === 'line' || shapeType === 'arrow')) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx);
      const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.sqrt(dx * dx + dy * dy);
      end = {
        x: start.x + Math.cos(snapAngle) * len,
        y: start.y + Math.sin(snapAngle) * len,
      };
      x = Math.min(start.x, end.x);
      y = Math.min(start.y, end.y);
      width = Math.abs(end.x - start.x);
      height = Math.abs(end.y - start.y);
    }

    // Minimum size threshold to prevent accidental clicks
    const minSpan = Math.max(width, height);
    if (minSpan >= 4) {
      const shape = createShapeObject({
        shapeType,
        x,
        y,
        width,
        height,
        strokeColor: settings.color,
        fillColor: settings.shapeFillColor,
        strokeWidth: settings.shapeStrokeWidth,
        strokeStyle: settings.shapeStrokeStyle,
        points: shapeType === 'line' || shapeType === 'arrow' ? [start, end] : undefined,
      });

      const cmd = new AddObjectCommand(
        shape,
        () => engine.getObjects(),
        (objects) => engine.setObjects(objects),
        `Add ${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`
      );
      engine.getCommandManager().execute(cmd);
    }

    engine.getRenderer().setActiveShapePreview(null);
    this.startPoint = null;
    this.currentPoint = null;
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.currentPoint = null;
    engine.getRenderer().setActiveShapePreview(null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.currentPoint = null;
    engine.getRenderer().setActiveShapePreview(null);
  }
}
