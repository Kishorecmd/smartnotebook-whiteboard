import { describe, expect, it, vi } from 'vitest';
import { CoordinateTransformer } from '../../canvas/CoordinateTransformer';
import { createStrokeObject } from '../../models';
import type { FreehandStroke } from '../../types';
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
