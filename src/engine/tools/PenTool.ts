import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject } from '../../models';
import { AddStrokeCommand } from '../commands/AddStrokeCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class PenTool implements ITool {
  public readonly name: string = 'pen';
  private activeStrokes: Map<number, Point[]> = new Map();

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const points = [worldPoint];
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

    points.push(worldPoint);
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

    if (points.length > 0) {
      // Ensure the final point is included
      points.push(worldPoint);

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
    engine.getRenderer().setActiveStroke(_e.pointerId, null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.activeStrokes.clear();
    engine.getRenderer().clearActiveStrokes();
  }
}
