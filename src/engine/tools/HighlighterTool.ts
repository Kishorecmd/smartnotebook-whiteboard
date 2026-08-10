import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject, createShapeObject } from '../../models';
import { AddStrokeCommand } from '../commands/AddStrokeCommand';
import { AddObjectCommand } from '../commands/AddObjectCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class HighlighterTool implements ITool {
  public readonly name: string = 'highlighter';
  private activeStrokes: Map<number, Point[]> = new Map();

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerDown(worldPoint, _e.pointerId)) {
      return;
    }

    const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
    const points = [snappedPoint];
    this.activeStrokes.set(_e.pointerId, points);

    const settings = engine.getToolSettings();
    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'highlighter' as any,
      points: points,
      color: settings.color,
      width: settings.highlighterWidth,
      opacity: settings.markerOpacity, // Uses translucent marker opacity
    });
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerMove(worldPoint, _e.pointerId)) {
      return;
    }

    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
    points.push(snappedPoint);
    const settings = engine.getToolSettings();

    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'highlighter',
      points: points,
      color: settings.color,
      width: settings.highlighterWidth,
      opacity: settings.markerOpacity,
    });
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerUp(_e.pointerId)) {
      return;
    }

    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    this.activeStrokes.delete(_e.pointerId);
    engine.getRulerSnapper().clearSnap(_e.pointerId);

    if (points.length > 0) {
      const snappedPoint = engine.getRulerSnapper().snapPoint(worldPoint, _e.pointerId, _e.shiftKey);
      points.push(snappedPoint);

      const settings = engine.getToolSettings();
      engine.getRenderer().setActiveStroke(_e.pointerId, null);

      if (snappedPoint.isProtractor && snappedPoint.isSnapped) {
        const start = points[0];
        const end = points[points.length - 1];
        
        const shape = createShapeObject({
          shapeType: 'line',
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          strokeColor: settings.color,
          fillColor: 'transparent',
          strokeWidth: settings.highlighterWidth,
          strokeStyle: 'solid',
          points: [start, end],
        });

        const cmd = new AddObjectCommand(
          shape,
          () => engine.getObjects(),
          (objects) => engine.setObjects(objects),
          'Draw Protractor Line'
        );
        engine.getCommandManager().execute(cmd);
      } else {
        const stroke = createStrokeObject({
          tool: 'highlighter' as any,
          points: points,
          color: settings.color,
          width: settings.highlighterWidth,
          opacity: settings.markerOpacity,
        });

        const command = new AddStrokeCommand(
          stroke,
          () => engine.getObjects(),
          (objects) => engine.setObjects(objects)
        );
        engine.getCommandManager().execute(command);
      }
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
