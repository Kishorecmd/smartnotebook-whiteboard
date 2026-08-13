import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject, createShapeObject } from '../../models';
import { AddStrokeCommand } from '../commands/AddStrokeCommand';
import { AddObjectCommand } from '../commands/AddObjectCommand';
import { PenRegistry, PenPreset, readPointerPressure } from '../../drawing/pens';
import type { SnappedPoint } from '../RulerSnapper';
import type { WhiteboardEngine } from '../WhiteboardEngine';

/**
 * One stroke in flight. Keyed by pointerId so two fingers can draw at once with
 * different pens -- the pen, colour, width and opacity are captured per pointer
 * at pointer-down and never read from global state again mid-stroke.
 */
interface ActiveStroke {
  preset: PenPreset;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
}

/**
 * The pen family tool. Replaces the single hard-coded pen: behaviour comes from
 * whichever PenPreset is active, and everything the original tool did -- ruler
 * snapping, protractor straightening, one undo entry per stroke -- is preserved.
 */
export class PenFamilyTool implements ITool {
  public readonly name: string = 'pen';
  private activeStrokes: Map<number, ActiveStroke> = new Map();

  /** Resolves the pen and the user's size/colour/opacity overrides for it. */
  private resolve(engine: WhiteboardEngine): { preset: PenPreset; color: string; size: number; opacity: number } {
    const settings = engine.getToolSettings();
    const preset = PenRegistry.getOrDefault(settings.activePenId);

    // A preset may pin its own colour (highlighter, glow); otherwise the user's
    // current colour wins, so switching pens never silently changes colour.
    const color = settings.penColorOverride || preset.color || settings.color;
    const size = settings.penSizeOverride ?? preset.size;
    const opacity = settings.penOpacityOverride ?? preset.opacity;

    // Apply Crayon specific overrides if the preset is a crayon
    if (preset.renderMode === 'crayon') {
      preset.textureDensity = settings.penTextureDensityOverride ?? preset.textureDensity;
      preset.roughness = settings.penRoughnessOverride ?? preset.roughness;
    }

    return { preset, color, size, opacity };
  }

  private pointWithPressure(point: Point, e: PointerEvent): Point {
    return { ...point, pressure: readPointerPressure(e) };
  }

  private pushPreview(engine: WhiteboardEngine, pointerId: number, active: ActiveStroke): void {
    engine.getRenderer().setActiveStroke(pointerId, {
      tool: active.preset.legacyTool,
      points: active.points,
      color: active.color,
      width: active.size,
      opacity: active.opacity,
      penId: active.preset.id,
    });
  }

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerDown(worldPoint, e.pointerId)) {
      return;
    }

    const { preset, color, size, opacity } = this.resolve(engine);
    const snapped: SnappedPoint = preset.supportsSnapping
      ? engine.getRulerSnapper().snapPoint(worldPoint, e.pointerId, e.shiftKey)
      : { ...worldPoint };

    const active: ActiveStroke = {
      preset,
      points: [this.pointWithPressure(snapped, e)],
      color,
      size,
      opacity,
    };
    this.activeStrokes.set(e.pointerId, active);
    this.pushPreview(engine, e.pointerId, active);
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerMove(worldPoint, e.pointerId)) {
      return;
    }

    const active = this.activeStrokes.get(e.pointerId);
    if (!active) return;

    const snapped: SnappedPoint = active.preset.supportsSnapping
      ? engine.getRulerSnapper().snapPoint(worldPoint, e.pointerId, e.shiftKey)
      : { ...worldPoint };

    active.points.push(this.pointWithPressure(snapped, e));
    this.pushPreview(engine, e.pointerId, active);
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (engine.getRulerSnapper().handlePointerUp(e.pointerId)) {
      return;
    }

    const active = this.activeStrokes.get(e.pointerId);
    if (!active) {
      engine.getRenderer().setActiveStroke(e.pointerId, null);
      return;
    }

    this.activeStrokes.delete(e.pointerId);
    engine.getRulerSnapper().clearSnap(e.pointerId);

    const snapped: SnappedPoint = active.preset.supportsSnapping
      ? engine.getRulerSnapper().snapPoint(worldPoint, e.pointerId, e.shiftKey)
      : { ...worldPoint };
    active.points.push(this.pointWithPressure(snapped, e));

    engine.getRenderer().setActiveStroke(e.pointerId, null);

    // Protractor snapping straightens the gesture into a true line, exactly as
    // the original pen did. Geometry comes from the protractor, appearance from
    // the pen.
    if (snapped.isProtractor && snapped.isSnapped) {
      const start = active.points[0];
      const end = active.points[active.points.length - 1];

      const shape = createShapeObject({
        shapeType: 'line',
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
        strokeColor: active.color,
        fillColor: 'transparent',
        strokeWidth: active.size,
        strokeStyle: active.preset.renderMode === 'dashed'
          ? 'dashed'
          : active.preset.renderMode === 'dotted'
            ? 'dotted'
            : 'solid',
        points: [start, end],
      });

      engine.getCommandManager().execute(
        new AddObjectCommand(
          shape,
          () => engine.getObjects(),
          (objects) => engine.setObjects(objects),
          'Draw Protractor Line'
        )
      );
      return;
    }

    const stroke = createStrokeObject({
      tool: active.preset.legacyTool,
      points: active.points,
      color: active.color,
      width: active.size,
      opacity: active.opacity,
    });

    // Store how the stroke was drawn so it keeps its look for good.
    const withPen = {
      ...stroke,
      penId: active.preset.id,
      penSettings: {
        smoothing: active.preset.smoothing,
        pressureSensitivity: active.preset.pressureSensitivity,
        spacing: active.preset.spacing,
        dashLength: active.preset.dashLength,
        texture: active.preset.texture,
        nibAngle: active.preset.nibAngle,
        glowIntensity: active.preset.glowIntensity,
        minWidthRatio: active.preset.minWidthRatio,
        maxWidthRatio: active.preset.maxWidthRatio,
        compositeMode: active.preset.compositeMode,
        lineCap: active.preset.lineCap,
        renderMode: active.preset.renderMode,
        textureDensity: active.preset.textureDensity,
        roughness: active.preset.roughness,
        textureSeed: active.preset.textureSeed,
      },
    };

    // One completed stroke, one history entry.
    engine.getCommandManager().execute(
      new AddStrokeCommand(
        withPen,
        () => engine.getObjects(),
        (objects) => engine.setObjects(objects)
      )
    );
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.activeStrokes.delete(e.pointerId);
    engine.getRulerSnapper().clearSnap(e.pointerId);
    engine.getRenderer().setActiveStroke(e.pointerId, null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.activeStrokes.clear();
    engine.getRulerSnapper().clearAll();
    engine.getRenderer().clearActiveStrokes();
  }
}
