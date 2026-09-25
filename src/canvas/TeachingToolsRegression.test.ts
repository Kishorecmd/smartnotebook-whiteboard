import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from './CanvasRenderer';
import { CoordinateTransformer } from './CoordinateTransformer';
import { StrokeRenderer } from './StrokeRenderer';
import { createStrokeObject } from '../models';
import { getCombinedBoundingBox } from '../utils/math.utils';
import { TeachingToolRegistry } from '../teaching-tools/TeachingToolRegistry';
import { registerRulerTool } from '../teaching-tools/ruler/RulerTool';
import { MagicPenTool } from '../engine/tools/MagicPenTool';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';

vi.mock('../media/pdf/PdfRenderer', () => ({ PdfRenderer: {} }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Teaching tool regressions', () => {
  it('preserves animation requests made while drawing a frame', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    const renderer = new CanvasRenderer({ canvas: { getContext: () => ({}) } as unknown as HTMLCanvasElement, transformer: new CoordinateTransformer() });
    const main = vi.spyOn(renderer, 'renderMainScene').mockImplementation(() => renderer.requestRender());
    const overlay = vi.spyOn(renderer as unknown as { renderOverlay(): void }, 'renderOverlay').mockImplementation(() => renderer.requestOverlayRender());
    frames.shift()!(0);
    frames.shift()!(16);
    expect(main).toHaveBeenCalledTimes(2);
    expect(overlay).toHaveBeenCalledTimes(2);
  });

  it('draws polygon vertices without handwriting smoothing', () => {
    const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), stroke: vi.fn() };
    const stroke = createStrokeObject({ tool: 'pen', points: [{ x: 50, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 50, y: 0 }], color: '#000', width: 2, opacity: 1 });
    stroke.smooth = false;
    StrokeRenderer.renderStroke(ctx as unknown as CanvasRenderingContext2D, stroke);
    expect(ctx.lineTo.mock.calls).toEqual([[100, 100], [0, 100], [50, 0]]);
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
  });

  it('includes a rotated ruler in its selection bounds', () => {
    registerRulerTool();
    const ruler = TeachingToolRegistry.getTool('ruler')!.objectFactory!({ x: 400, y: 300 });
    ruler.rotation = Math.PI / 2;
    const box = getCombinedBoundingBox([ruler], 0)!;
    expect(box.width).toBeCloseTo(80);
    expect(box.height).toBeCloseTo(600);
    expect(box.minX).toBeCloseTo(360);
    expect(box.minY).toBeCloseTo(0);
  });

  it('opens the magnifier even when the default spotlight radius is nonzero', () => {
    const engine = { getToolSettings: () => ({ magicPenMode: 'magnifier', magicPenMagnification: 3 }), getMagnifierRadius: () => 150, getSpotlightRadius: () => 150, setSpotlight: vi.fn(), setMagnifier: vi.fn() };
    const tool = new MagicPenTool();
    tool.onPointerDown({ x: 100, y: 200 }, { x: 100, y: 200 }, { pointerId: 1 } as PointerEvent, engine as unknown as WhiteboardEngine);
    expect(engine.setSpotlight).toHaveBeenCalledWith(null, 0);
    expect(engine.setMagnifier).toHaveBeenCalledWith({ x: 100, y: 200 }, 150, 3);
  });
});
