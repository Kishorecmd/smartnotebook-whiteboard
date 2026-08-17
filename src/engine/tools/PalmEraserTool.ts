import type { ITool } from './ITool';
import type { Point, WhiteboardObject } from '../../types';
import type { WhiteboardEngine } from '../WhiteboardEngine';
import { HitTest } from '../HitTest';
import { PalmEraseCommand } from '../commands/PalmEraseCommand';
import { palmEraserRadius } from '../../input/InputSettings';

interface PalmSession {
  beforeAffected: Map<string, WhiteboardObject>;
  addedIds: Set<string>;
  changed: boolean;
}

/** Pointer-local, ink-first eraser used only by deliberate palm movement. */
export class PalmEraserTool implements ITool {
  public readonly name = 'palm-eraser';
  private readonly sessions = new Map<number, PalmSession>();

  public onPointerDown(world: Point, screen: Point, event: PointerEvent, engine: WhiteboardEngine): void {
    this.sessions.set(event.pointerId, { beforeAffected: new Map(), addedIds: new Set(), changed: false });
    this.erase(world, screen, event, engine);
  }

  public onPointerMove(world: Point, screen: Point, event: PointerEvent, engine: WhiteboardEngine): void {
    if (this.sessions.has(event.pointerId)) this.erase(world, screen, event, engine);
  }

  public onPointerUp(_world: Point, _screen: Point, event: PointerEvent, engine: WhiteboardEngine): void {
    const session = this.sessions.get(event.pointerId);
    this.sessions.delete(event.pointerId);
    engine.getRenderer().setEraserPreview(null);
    if (!session?.changed) return;
    const after = engine.getObjects().filter((object) => session.addedIds.has(object.id));
    engine.getCommandManager().recordCommand(new PalmEraseCommand(
      Array.from(session.beforeAffected.values()),
      after,
      () => engine.getObjects(),
      (objects) => engine.setObjects(objects),
    ));
  }

  public onPointerCancel(_world: Point, _screen: Point, event: PointerEvent, engine: WhiteboardEngine): void {
    this.sessions.delete(event.pointerId);
    engine.getRenderer().setEraserPreview(null);
  }

  private erase(world: Point, screen: Point, event: PointerEvent, engine: WhiteboardEngine): void {
    const settings = engine.getInputSettings();
    const screenRadius = palmEraserRadius(settings, event.width || 1, event.height || 1);
    const worldRadius = screenRadius / engine.getTransformer().getZoom();
    engine.getRenderer().setEraserPreview({ x: screen.x, y: screen.y, radius: screenRadius });

    let changed = false;
    const next: WhiteboardObject[] = [];
    for (const object of engine.getObjects()) {
      if (object.locked || object.visible === false) {
        next.push(object);
        continue;
      }
      if (object.type === 'stroke' && HitTest.hitTestStroke(world, object, worldRadius)) {
        const session = this.sessions.get(event.pointerId);
        if (session?.addedIds.has(object.id)) session.addedIds.delete(object.id);
        else session?.beforeAffected.set(object.id, structuredClone(object));
        const segments = HitTest.areaEraseStroke(object, world, worldRadius);
        segments.forEach((segment) => session?.addedIds.add(segment.id));
        next.push(...segments);
        changed = true;
        continue;
      }
      if (settings.palmEraserTarget !== 'ink' && object.type === 'shape' && HitTest.hitTestShape(world, object, worldRadius)) {
        this.rememberRemoved(object, event.pointerId);
        changed = true;
        continue;
      }
      if (settings.palmEraserTarget === 'all' && HitTest.hitTestObject(world, object, worldRadius)) {
        this.rememberRemoved(object, event.pointerId);
        changed = true;
        continue;
      }
      next.push(object);
    }

    if (changed) {
      engine.setObjects(next, false);
      const session = this.sessions.get(event.pointerId);
      if (session) session.changed = true;
    }
  }

  private rememberRemoved(object: WhiteboardObject, pointerId: number): void {
    const session = this.sessions.get(pointerId);
    if (!session) return;
    if (session.addedIds.has(object.id)) session.addedIds.delete(object.id);
    else session.beforeAffected.set(object.id, structuredClone(object));
  }
}
