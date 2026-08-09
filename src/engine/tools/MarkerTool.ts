import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject } from '../../models';
import { AddStrokeCommand } from '../commands/AddStrokeCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class MarkerTool implements ITool {
  public readonly name: string = 'marker';
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
      tool: 'marker',
      points: points,
      color: settings.color,
      width: settings.markerWidth,
      opacity: settings.markerOpacity,
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
      tool: 'marker',
      points: points,
      color: settings.color,
      width: settings.markerWidth,
      opacity: settings.markerOpacity,
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
    
    // Clear the snap state so the indicator disappears
    engine.getRulerSnapper().clearSnap(_e.pointerId);

    if (points.length > 0) {
      // Ensure the final point is included
      const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
      points.push(snappedPoint);

      const settings = engine.getToolSettings();
      const stroke = createStrokeObject({
        tool: 'marker',
        points: points,
        color: settings.color,
        width: settings.markerWidth,
        opacity: settings.markerOpacity,
      });

      // Clear active preview layer
      engine.getRenderer().setActiveStroke(_e.pointerId, null);

      // Execute AddStrokeCommand via CommandManager
      const command = new AddStrokeCommand(
        stroke,
        () => engine.getObjects(),
        (objects) => engine.setObjects(objects)
      );
      engine.getCommandManager().execute(command);
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
