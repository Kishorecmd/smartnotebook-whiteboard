import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject } from '../../models';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class MagicPenTool implements ITool {
  public readonly name: string = 'magic_pen';
  private activeStrokes: Map<number, Point[]> = new Map();

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
    const points = [snappedPoint];
    this.activeStrokes.set(_e.pointerId, points);

    const settings = engine.getToolSettings();
    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'pen',
      points: points,
      color: settings.color,
      width: settings.penWidth,
      opacity: 1.0,
    });
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
    points.push(snappedPoint);
    const settings = engine.getToolSettings();

    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'pen',
      points: points,
      color: settings.color,
      width: settings.penWidth,
      opacity: 1.0,
    });
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    this.activeStrokes.delete(_e.pointerId);
    engine.getRulerSnapper().clearSnap(_e.pointerId);

    if (points.length > 0) {
      const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
      points.push(snappedPoint);

      const settings = engine.getToolSettings();
      const stroke = createStrokeObject({
        tool: 'pen',
        points: points,
        color: settings.color,
        width: settings.penWidth,
        opacity: 1.0,
      });

      // Clear active preview layer for this pointer
      engine.getRenderer().setActiveStroke(_e.pointerId, null);

      // Add as a transient stroke that fades out over 3 seconds
      engine.addTransientStroke({
        ...stroke,
        maxAge: 3000,
        createdAt: Date.now(),
      });
    } else {
      engine.getRenderer().setActiveStroke(_e.pointerId, null);
    }
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.activeStrokes.delete(_e.pointerId);
    engine.getRulerSnapper().clearSnap(_e.pointerId);
    engine.getRenderer().setActiveStroke(_e.pointerId, null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.activeStrokes.clear();
    engine.getRulerSnapper().clearAll();
    engine.getRenderer().clearActiveStrokes();
  }
}
