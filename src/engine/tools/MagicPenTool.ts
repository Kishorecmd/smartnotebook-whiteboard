import { ITool } from './ITool';
import { Point } from '../../types';
import { createStrokeObject } from '../../models';
import type { WhiteboardEngine } from '../WhiteboardEngine';
import { distanceBetween, getPointsBoundingBox } from '../../utils/math.utils';

export class MagicPenTool implements ITool {
  public readonly name: string = 'magic_pen';
  private activeStrokes: Map<number, Point[]> = new Map();
  private pressTimeout: NodeJS.Timeout | null = null;
  private pointerDownTime: number = 0;
  private isHolding: boolean = false;
  private currentMode: 'ink' | 'spotlight_drag' | 'magnifier_drag' | null = null;
  private startPointer: Point | null = null;

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const settings = engine.getToolSettings();

    // Check if we are tapping/dragging an existing spotlight or magnifier
    if (engine.getSpotlightRadius() > 0 || engine.getMagnifierRadius() > 0) {
      if (engine.getSpotlightRadius() > 0) {
        this.currentMode = 'spotlight_drag';
        engine.setSpotlight(worldPoint, engine.getSpotlightRadius());
      } else if (engine.getMagnifierRadius() > 0) {
        this.currentMode = 'magnifier_drag';
        engine.setMagnifier(worldPoint, engine.getMagnifierRadius(), settings.magicPenMagnification);
      }
      return; // Skip normal drawing
    }

    this.currentMode = 'ink';
    this.startPointer = worldPoint;
    const points = [worldPoint];
    this.activeStrokes.set(_e.pointerId, points);
    this.pointerDownTime = Date.now();
    this.isHolding = false;

    // Press and hold detection for Method B
    if (this.pressTimeout) clearTimeout(this.pressTimeout);
    this.pressTimeout = setTimeout(() => {
      this.isHolding = true;
      this.activeStrokes.delete(_e.pointerId);
      engine.getRenderer().setActiveStroke(_e.pointerId, null);
      
      if (settings.magicPenMode === 'magnifier') {
        this.currentMode = 'magnifier_drag';
        engine.setMagnifier(worldPoint, 150, settings.magicPenMagnification);
      } else {
        this.currentMode = 'spotlight_drag';
        engine.setSpotlight(worldPoint, 150);
      }
    }, 600); // 600ms hold

    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'pen',
      points: points,
      color: settings.color,
      width: settings.penWidth,
      opacity: 1.0,
      penId: 'magic',
      penSettings: {
        magicEffect: settings.magicPenMode === 'highlight' ? 'highlight' : 'glow'
      }
    });
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (this.currentMode === 'spotlight_drag') {
      engine.setSpotlight(worldPoint, engine.getSpotlightRadius());
      return;
    }
    if (this.currentMode === 'magnifier_drag') {
      const settings = engine.getToolSettings();
      engine.setMagnifier(worldPoint, engine.getMagnifierRadius(), settings.magicPenMagnification);
      return;
    }

    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    // If moved too far, cancel hold
    if (this.startPointer && distanceBetween(this.startPointer, worldPoint) > 15) {
      if (this.pressTimeout) {
        clearTimeout(this.pressTimeout);
        this.pressTimeout = null;
      }
    }

    points.push(worldPoint);
    const settings = engine.getToolSettings();

    engine.getRenderer().setActiveStroke(_e.pointerId, {
      tool: 'pen',
      points: points,
      color: settings.color,
      width: settings.penWidth,
      opacity: 1.0,
      penId: 'magic',
      penSettings: {
        magicEffect: settings.magicPenMode === 'highlight' ? 'highlight' : 'glow'
      }
    });
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (this.pressTimeout) {
      clearTimeout(this.pressTimeout);
      this.pressTimeout = null;
    }

    if (this.currentMode === 'spotlight_drag' || this.currentMode === 'magnifier_drag') {
      this.currentMode = null;
      // Note: On tap, we exit spotlight.
      if (Date.now() - this.pointerDownTime < 200) {
        engine.setSpotlight(null, 0);
        engine.setMagnifier(null, 0);
      }
      return;
    }

    const points = this.activeStrokes.get(_e.pointerId);
    if (!points) return;

    this.activeStrokes.delete(_e.pointerId);
    points.push(worldPoint);

    const settings = engine.getToolSettings();
    const isCircle = this.recognizeCircle(points);

    engine.getRenderer().setActiveStroke(_e.pointerId, null);

    if (isCircle && (settings.magicPenMode === 'spotlight' || settings.magicPenMode === 'magnifier' || settings.magicPenMode === 'highlight')) {
      const box = getPointsBoundingBox(points);
      const center = { x: box.minX + box.width / 2, y: box.minY + box.height / 2 };
      const radius = Math.max(box.width, box.height) / 2;
      
      if (settings.magicPenMode === 'magnifier') {
        engine.setMagnifier(center, radius, settings.magicPenMagnification);
      } else {
        engine.setSpotlight(center, radius);
      }
    } else {
      // Normal magic ink or highlight
      const stroke = createStrokeObject({
        tool: 'pen',
        points: points,
        color: settings.color,
        width: settings.penWidth,
        opacity: 1.0,
      });

      // Special magic effect flag so the renderer can glow/highlight
      stroke.penSettings = {
        magicEffect: settings.magicPenMode === 'highlight' ? 'highlight' : 'glow'
      };

      if (settings.magicPenPermanent) {
        engine.addObject(stroke);
      } else {
        const duration = settings.magicPenDuration > 0 ? settings.magicPenDuration : 9999999;
        engine.addTransientStroke({
          ...stroke,
          maxAge: duration,
          createdAt: Date.now(),
        });
      }
    }
    
    this.currentMode = null;
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (this.pressTimeout) clearTimeout(this.pressTimeout);
    this.activeStrokes.delete(_e.pointerId);
    engine.getRenderer().setActiveStroke(_e.pointerId, null);
    this.currentMode = null;
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    if (this.pressTimeout) clearTimeout(this.pressTimeout);
    this.activeStrokes.clear();
    engine.getRenderer().clearActiveStrokes();
    engine.setSpotlight(null, 0);
    engine.setMagnifier(null, 0);
  }

  private recognizeCircle(points: Point[]): boolean {
    if (points.length < 10) return false;
    const start = points[0];
    const end = points[points.length - 1];
    
    // 1. Must close the loop (start and end close to each other)
    const box = getPointsBoundingBox(points);
    const maxDim = Math.max(box.width, box.height);
    if (maxDim < 50) return false; // Too small to be a deliberate circle gesture
    
    const distance = distanceBetween(start, end);
    if (distance > maxDim * 0.4) return false; // Loop not closed enough
    
    // 2. Aspect ratio should be somewhat square
    const ratio = box.width / box.height;
    if (ratio < 0.3 || ratio > 3.0) return false; // Too oval/squashed
    
    return true;
  }
}
