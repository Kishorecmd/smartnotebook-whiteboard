import { describe, expect, it, vi } from 'vitest';
import { CoordinateTransformer } from '../canvas/CoordinateTransformer';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { createStrokeObject } from '../models';
import type { FreehandStroke, ImageObject } from '../types';
import { GestureEngine } from './GestureEngine';
import { DEFAULT_INPUT_SETTINGS } from './InputSettings';
import type { PointerState } from './PointerState';

const touch = (id: number, x: number, y: number): PointerState => ({
  pointerId: id, pointerType: 'touch', isPrimary: id === 1,
  x, y, previousX: x, previousY: y, startX: x, startY: y,
  pressure: 0.5, width: 10, height: 10, tiltX: 0, tiltY: 0, twist: 0,
  buttons: 1, timestamp: 1, target: null, classification: 'FINGER', action: 'SELECT',
  hasMovedSignificantly: false, isActive: true,
});

describe('GestureEngine', () => {
  it('keeps the world point under the moving pinch midpoint anchored', () => {
    const transformer = new CoordinateTransformer({ zoom: 1, panX: 10, panY: 0 });
    const changed = vi.fn();
    const gestures = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: changed });
    gestures.beginPanZoom(touch(1, 50, 100), touch(2, 150, 100));
    gestures.updatePanZoom(touch(1, 20, 100), touch(2, 220, 100));

    expect(transformer.getZoom()).toBe(2);
    expect(transformer.screenToWorld({ x: 120, y: 100 })).toEqual({ x: 90, y: 100, pressure: undefined, time: undefined });
    expect(changed).toHaveBeenCalledOnce();
  });

  it('scales a selected object from its original snapshot and records one history command', () => {
    const transformer = new CoordinateTransformer();
    const image: ImageObject = {
      id: 'image-1', type: 'image', x: 0, y: 0, width: 100, height: 100, rotation: 0,
      zIndex: 1, visible: true, locked: false, createdAt: 1, updatedAt: 1,
      mimeType: 'image/png', originalWidth: 100, originalHeight: 100,
    };
    let objects = [image] as ImageObject[];
    const recordCommand = vi.fn();
    const engine = {
      getSelectedObjects: () => objects,
      getObjects: () => objects,
      getTransformer: () => transformer,
      updateObjectsSilently: (next: ImageObject[]) => { objects = next; },
      getRenderer: () => ({ setSelectionBox: vi.fn() }),
      getCommandManager: () => ({ recordCommand }),
      setObjects: (next: ImageObject[]) => { objects = next; },
    } as unknown as WhiteboardEngine;
    const gestures = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: vi.fn() });
    expect(gestures.beginObjectTransform(touch(1, 0, 50), touch(2, 100, 50), engine)).toBe(true);
    gestures.updateObjectTransform(touch(1, -50, 50), touch(2, 150, 50), engine);
    gestures.finishObjectTransform(engine);

    expect(objects[0].width).toBeCloseTo(200);
    expect(objects[0].height).toBeCloseTo(200);
    expect(recordCommand).toHaveBeenCalledOnce();
  });

  it('scales handwriting geometry without replacing pen thickness with its bounds', () => {
    const transformer = new CoordinateTransformer();
    const stroke = createStrokeObject({
      tool: 'pen',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      color: '#111827',
      width: 4,
      opacity: 1,
    });
    let objects = [stroke] as FreehandStroke[];
    const engine = {
      getSelectedObjects: () => objects,
      getObjects: () => objects,
      getTransformer: () => transformer,
      updateObjectsSilently: (next: FreehandStroke[]) => { objects = next; },
      getRenderer: () => ({ setSelectionBox: vi.fn() }),
      getCommandManager: () => ({ recordCommand: vi.fn() }),
      setObjects: (next: FreehandStroke[]) => { objects = next; },
    } as unknown as WhiteboardEngine;
    const gestures = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: vi.fn() });

    gestures.beginObjectTransform(touch(1, 0, 50), touch(2, 100, 50), engine);
    gestures.updateObjectTransform(touch(1, -50, 50), touch(2, 150, 50), engine);

    expect(objects[0].points[1]).toMatchObject({ x: 150, y: 150 });
    expect(objects[0].width).toBeCloseTo(8);
  });
});
