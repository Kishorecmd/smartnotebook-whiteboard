import { describe, expect, it } from 'vitest';
import { CoordinateTransformer } from './CoordinateTransformer';

describe('CoordinateTransformer', () => {
  it('maps the viewport centre into world coordinates after pan and zoom', () => {
    const transformer = new CoordinateTransformer({ panX: 120, panY: -40, zoom: 2 });
    expect(transformer.screenToWorld({ x: 500, y: 300 })).toMatchObject({
      x: 190,
      y: 170,
    });
  });

  it('keeps a point invariant through world/screen conversion', () => {
    const transformer = new CoordinateTransformer({ panX: -75, panY: 33, zoom: 1.75 });
    const point = { x: 42, y: -18 };
    expect(transformer.screenToWorld(transformer.worldToScreen(point))).toMatchObject(point);
  });
});
