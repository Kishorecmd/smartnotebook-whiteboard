import type { CoordinateTransformer } from '../canvas/CoordinateTransformer';
import { TransformObjectsCommand } from '../engine/commands/TransformObjectsCommand';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { GroupManager } from '../objects/GroupManager';
import type { Point, WhiteboardObject } from '../types';
import { calculateBoundingBox, getCombinedBoundingBox } from '../utils';
import type { InputSettings } from './InputSettings';
import type { PointerState } from './PointerState';

export interface GestureEngineOptions {
  transformer: CoordinateTransformer;
  getSettings: () => InputSettings;
  onPanZoom: () => void;
}

interface ObjectGesture {
  pointerIds: [number, number];
  startMidpoint: Point;
  startDistance: number;
  startAngle: number;
  anchorWorld: Point;
  snapshots: WhiteboardObject[];
  changed: boolean;
}

export class GestureEngine {
  private startDistance = 0;
  private startZoom = 1;
  private startMidpointScreen: Point = { x: 0, y: 0 };
  private startPanX = 0;
  private startPanY = 0;
  private objectGesture: ObjectGesture | null = null;

  constructor(private readonly options: GestureEngineOptions) {}

  private midpoint(first: PointerState, second: PointerState): Point {
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  }

  private distance(first: PointerState, second: PointerState): number {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  private angle(first: PointerState, second: PointerState): number {
    return Math.atan2(second.y - first.y, second.x - first.x);
  }

  public beginPanZoom(first: PointerState, second: PointerState): void {
    this.startDistance = this.distance(first, second);
    this.startMidpointScreen = this.midpoint(first, second);
    const transform = this.options.transformer.getTransform();
    this.startZoom = transform.zoom;
    this.startPanX = transform.panX;
    this.startPanY = transform.panY;
  }

  public updatePanZoom(first: PointerState, second: PointerState): void {
    const currentMidpoint = this.midpoint(first, second);
    const settings = this.options.getSettings();
    const ratio = this.startDistance > 10 ? this.distance(first, second) / this.startDistance : 1;
    const zoom = Math.min(settings.maxZoom, Math.max(settings.minZoom, this.startZoom * ratio));
    const anchorWorldX = (this.startMidpointScreen.x - this.startPanX) / this.startZoom;
    const anchorWorldY = (this.startMidpointScreen.y - this.startPanY) / this.startZoom;
    this.options.transformer.setTransform({
      zoom,
      panX: currentMidpoint.x - anchorWorldX * zoom,
      panY: currentMidpoint.y - anchorWorldY * zoom,
    });
    this.options.onPanZoom();
  }

  public beginObjectTransform(first: PointerState, second: PointerState, engine: WhiteboardEngine): boolean {
    const selected = engine.getSelectedObjects();
    const box = getCombinedBoundingBox(selected, 0);
    if (!box) return false;
    const allAffected = GroupManager.getAllAffectedObjects(selected.map((object) => object.id), engine.getObjects());
    const midpoint = this.midpoint(first, second);
    this.objectGesture = {
      pointerIds: [first.pointerId, second.pointerId],
      startMidpoint: midpoint,
      startDistance: Math.max(1, this.distance(first, second)),
      startAngle: this.angle(first, second),
      anchorWorld: { x: box.minX + box.width / 2, y: box.minY + box.height / 2 },
      snapshots: structuredClone(allAffected),
      changed: false,
    };
    return true;
  }

  public updateObjectTransform(first: PointerState, second: PointerState, engine: WhiteboardEngine): void {
    const gesture = this.objectGesture;
    if (!gesture || !gesture.pointerIds.includes(first.pointerId) || !gesture.pointerIds.includes(second.pointerId)) return;
    const currentMidpoint = this.midpoint(first, second);
    const zoom = engine.getTransformer().getZoom();
    const translation = {
      x: (currentMidpoint.x - gesture.startMidpoint.x) / zoom,
      y: (currentMidpoint.y - gesture.startMidpoint.y) / zoom,
    };
    const scale = Math.max(0.05, this.distance(first, second) / gesture.startDistance);
    let rotation = this.normaliseAngle(this.angle(first, second) - gesture.startAngle);
    const threshold = this.options.getSettings().rotationThresholdDegrees * Math.PI / 180;
    if (Math.abs(rotation) < threshold) rotation = 0;

    const next = gesture.snapshots.map((object) => this.transformObject(
      object,
      gesture.anchorWorld,
      translation,
      scale,
      rotation,
    ));
    engine.updateObjectsSilently(next);
    engine.getRenderer().setSelectionBox(getCombinedBoundingBox(next, 4 / zoom), null);
    gesture.changed ||= Math.hypot(translation.x, translation.y) > 0.5 || Math.abs(scale - 1) > 0.005 || rotation !== 0;
  }

  public finishObjectTransform(engine: WhiteboardEngine): void {
    const gesture = this.objectGesture;
    this.objectGesture = null;
    if (!gesture?.changed) return;
    const ids = new Set(gesture.snapshots.map((object) => object.id));
    const after = engine.getObjects().filter((object) => ids.has(object.id));
    engine.getCommandManager().recordCommand(new TransformObjectsCommand(
      gesture.snapshots,
      after,
      () => engine.getObjects(),
      (objects) => engine.setObjects(objects),
      'Touch Transform',
    ));
  }

  public cancelObjectTransform(): void { this.objectGesture = null; }
  public isObjectTransforming(): boolean { return this.objectGesture !== null; }

  private normaliseAngle(angle: number): number {
    let next = angle;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    return next;
  }

  private transformPoint(point: Point, anchor: Point, translation: Point, scale: number, rotation: number): Point {
    const dx = (point.x - anchor.x) * scale;
    const dy = (point.y - anchor.y) * scale;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      ...point,
      x: anchor.x + dx * cos - dy * sin + translation.x,
      y: anchor.y + dx * sin + dy * cos + translation.y,
    };
  }

  private transformObject(
    source: WhiteboardObject,
    anchor: Point,
    translation: Point,
    scale: number,
    rotation: number,
  ): WhiteboardObject {
    const object = structuredClone(source) as WhiteboardObject & Record<string, any>;
    const center = this.transformPoint(
      { x: source.x + source.width / 2, y: source.y + source.height / 2 },
      anchor,
      translation,
      scale,
      rotation,
    );
    object.width = Math.max(1, source.width * scale);
    object.height = Math.max(1, source.height * scale);
    object.x = center.x - object.width / 2;
    object.y = center.y - object.height / 2;
    object.rotation = (source.rotation || 0) + rotation;
    object.updatedAt = Date.now();

    if ('points' in object && Array.isArray(object.points)) {
      object.points = object.points.map((point: Point) => this.transformPoint(point, anchor, translation, scale, rotation));
      const bounds = calculateBoundingBox(object.points);
      object.x = bounds.minX;
      object.y = bounds.minY;
      object.width = Math.max(1, bounds.width);
      object.height = Math.max(1, bounds.height);
    }
    if ('centerX' in object && 'centerY' in object) {
      const transformed = this.transformPoint({ x: object.centerX, y: object.centerY }, anchor, translation, scale, rotation);
      object.centerX = transformed.x;
      object.centerY = transformed.y;
    }
    if (typeof object.radius === 'number') object.radius = Math.max(1, object.radius * scale);
    if (typeof object.fontSize === 'number') object.fontSize = Math.max(8, object.fontSize * scale);
    if (source.type === 'stroke') object.width = Math.max(1, object.width);
    return object as WhiteboardObject;
  }
}
