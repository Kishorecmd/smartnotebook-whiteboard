import { describe, expect, it, vi } from 'vitest';
import { CoordinateTransformer } from '../../canvas/CoordinateTransformer';
import { createStrokeObject } from '../../models';
import type { FreehandStroke, WhiteboardObject } from '../../types';
import { getCombinedBoundingBox, getHandlePositions } from '../../utils';
import { GroupObjectsCommand } from '../commands/GroupObjectsCommand';
import { CommandManager } from '../CommandManager';
import type { WhiteboardEngine } from '../WhiteboardEngine';
import { SelectTool } from './SelectTool';

describe('SelectTool handwriting resize', () => {
  it('keeps stroke thickness proportional when resizing a handwriting selection', () => {
    const transformer = new CoordinateTransformer();
    let objects: FreehandStroke[] = [createStrokeObject({
      tool: 'pen',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      color: '#111827',
      width: 4,
      opacity: 1,
    })];
    const renderer = { setSelectionBox: vi.fn(), setMarqueeBox: vi.fn() };
    const engine = {
      getSelectedObjects: () => objects,
      getObjects: () => objects,
      getTransformer: () => transformer,
      getRenderer: () => renderer,
      updateObjectsSilently: (next: FreehandStroke[]) => { objects = next; },
    } as unknown as WhiteboardEngine;
    const select = new SelectTool();
    const event = { pointerType: 'mouse', shiftKey: false } as PointerEvent;

    // A 4px stroke from 0..100 has a padded selection box ending at 106.
    select.onPointerDown({ x: 106, y: 106 }, { x: 106, y: 106 }, event, engine);
    select.onPointerMove({ x: 206, y: 206 }, { x: 206, y: 206 }, event, engine);

    const expectedScale = 212 / 112;
    expect(objects[0].width).toBeCloseTo(4 * expectedScale);
    expect(objects[0].width).toBeLessThan(10);
  });
});

describe('SelectTool handwriting rotation', () => {
  it.each([false, true])('rotates the ink around one selection center (grouped: %s), with undo/redo', grouped => {
    const transformer = new CoordinateTransformer();
    let objects: WhiteboardObject[] = [
      createStrokeObject({ tool: 'pencil', points: [{ x: 100, y: 150, pressure: 0.4, time: 1 }, { x: 100, y: 200, pressure: 0.7, time: 2 }], color: '#111827', width: 3, opacity: 1 }),
      createStrokeObject({ tool: 'pencil', points: [{ x: 120, y: 170 }, { x: 170, y: 170 }], color: '#111827', width: 3, opacity: 1 }),
    ];
    const setObjects = vi.fn((next: WhiteboardObject[]) => { objects = next; });
    if (grouped) new GroupObjectsCommand(objects.map(o => o.id), () => objects, setObjects).execute();
    setObjects.mockClear();
    const before = structuredClone(objects);
    const selectedIds = objects.filter(o => !o.parentGroupId).map(o => o.id);
    const selected = () => objects.filter(o => selectedIds.includes(o.id));
    const box = getCombinedBoundingBox(selected(), 4, objects)!;
    const handle = getHandlePositions(box, 1).rotate;
    const center = { x: box.minX + box.width / 2, y: box.minY + box.height / 2 };
    const target = { x: center.x + center.y - handle.y, y: center.y };
    const renderer = { setSelectionBox: vi.fn(), setMarqueeBox: vi.fn() };
    const history = new CommandManager();
    const engine = {
      getSelectedObjects: selected, getObjects: () => objects,
      getTransformer: () => transformer, getRenderer: () => renderer,
      updateObjectsSilently: (next: WhiteboardObject[]) => {
        const updates = new Map(next.map(o => [o.id, o]));
        objects = objects.map(o => updates.get(o.id) ?? o);
      },
      setObjects, getCommandManager: () => history,
    } as unknown as WhiteboardEngine;
    const tool = new SelectTool();
    const event = { pointerType: 'mouse', shiftKey: false } as PointerEvent;
    tool.onPointerDown(handle, handle, event, engine);
    tool.onPointerMove(target, target, event, engine);
    expect(setObjects).not.toHaveBeenCalled();
    tool.onPointerUp(target, target, event, engine);
    expect(setObjects).toHaveBeenCalledOnce();
    const after = structuredClone(objects);
    for (const original of before) {
      if (original.type !== 'stroke') continue;
      const rotated = objects.find(o => o.id === original.id) as FreehandStroke;
      expect(rotated.width).toBe(original.width);
      original.points.forEach((point, i) => {
        expect(rotated.points[i].x).toBeCloseTo(center.x - (point.y - center.y));
        expect(rotated.points[i].y).toBeCloseTo(center.y + (point.x - center.x));
        expect(rotated.points[i].pressure).toBe(point.pressure);
        expect(rotated.points[i].time).toBe(point.time);
      });
    }
    expect(renderer.setSelectionBox).toHaveBeenLastCalledWith(getCombinedBoundingBox(selected(), 4, objects), null);
    expect(history.getState().undoCount).toBe(1);
    history.undo();
    expect(objects).toEqual(before);
    history.redo();
    expect(objects).toEqual(after);
  });
});
