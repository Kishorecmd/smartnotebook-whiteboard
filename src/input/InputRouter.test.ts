import { describe, expect, it, vi } from 'vitest';
vi.mock('../store', () => ({ useWhiteboardStore: { getState: () => ({}) } }));
vi.mock('../media/MediaObject', () => ({ isGrabbableMedia: () => false }));
import { CoordinateTransformer } from '../canvas/CoordinateTransformer';
import type { ITool } from '../engine/tools/ITool';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { GestureEngine } from './GestureEngine';
import { DEFAULT_INPUT_SETTINGS } from './InputSettings';
import { InputRouter } from './InputRouter';
import type { InputClassification, PointerState } from './PointerState';

const sample = (classification: InputClassification): PointerState => ({
  pointerId: 1,
  pointerType: classification === 'STYLUS' ? 'pen' : 'touch',
  isPrimary: true, x: 0, y: 0, previousX: 0, previousY: 0, startX: 0, startY: 0,
  pressure: 0.5, width: 10, height: 10, tiltX: 0, tiltY: 0, twist: 0,
  buttons: 1, timestamp: 1, target: null, classification, action: 'IGNORE',
  hasMovedSignificantly: false, isActive: true,
});

const tool = (name: string): ITool => ({
  name,
  onPointerDown: vi.fn(), onPointerMove: vi.fn(), onPointerUp: vi.fn(), onPointerCancel: vi.fn(),
});

describe('InputRouter physical-device routing', () => {
  it('routes stylus, finger, and palm independently of the selected toolbar tool', () => {
    const pen = tool('pen');
    const select = tool('select');
    const palm = tool('palm');
    const shape = tool('shape');
    const transformer = new CoordinateTransformer();
    const tools: Record<string, ITool> = { pen, select, shape };
    const engine = {
      getActiveToolType: () => 'shape',
      getActiveTool: () => shape,
      getTool: (name: string) => tools[name],
      getPalmEraserTool: () => palm,
      getTransformer: () => transformer,
      getObjects: () => [],
      isSpacePressed: () => false,
    } as unknown as WhiteboardEngine;
    const gesture = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: vi.fn() });
    const router = new InputRouter(engine, gesture, () => ({ ...DEFAULT_INPUT_SETTINGS, lastStylusTool: 'pen' }));
    const event = { button: 0, buttons: 1 } as PointerEvent;

    expect(router.route(sample('STYLUS'), event)).toMatchObject({ action: 'DRAW', tool: pen });
    expect(router.route(sample('FINGER'), event)).toMatchObject({ action: 'SELECT', tool: select });
    expect(router.route(sample('PALM_ERASER'), event)).toMatchObject({ action: 'ERASE', tool: palm });
  });

  it('routes a finger through the selected eraser in touch mode', () => {
    const eraser = tool('eraser');
    const select = tool('select');
    const transformer = new CoordinateTransformer();
    const tools: Record<string, ITool> = { eraser, select };
    const engine = {
      getActiveToolType: () => 'eraser',
      getActiveTool: () => eraser,
      getTool: (name: string) => tools[name],
      getTransformer: () => transformer,
      getObjects: () => [],
      isSpacePressed: () => false,
    } as unknown as WhiteboardEngine;
    const gesture = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: vi.fn() });
    const router = new InputRouter(engine, gesture, () => DEFAULT_INPUT_SETTINGS);

    expect(router.route(sample('FINGER'), { button: 0, buttons: 1 } as PointerEvent))
      .toMatchObject({ action: 'ERASE', tool: eraser });
  });

  it('promotes a moving palm candidate and starts its pointer-local eraser', () => {
    const palm = tool('palm');
    const transformer = new CoordinateTransformer();
    const engine = {
      getPalmEraserTool: () => palm,
      getTransformer: () => transformer,
    } as unknown as WhiteboardEngine;
    const gesture = new GestureEngine({ transformer, getSettings: () => DEFAULT_INPUT_SETTINGS, onPanZoom: vi.fn() });
    const router = new InputRouter(engine, gesture, () => DEFAULT_INPUT_SETTINGS);
    const contact = sample('PALM_CANDIDATE');
    const event = { pointerId: contact.pointerId, button: 0, buttons: 1 } as PointerEvent;

    router.onPointerAdd(contact, event, [contact]);
    contact.classification = 'PALM_ERASER';
    contact.x = 24;
    contact.hasMovedSignificantly = true;
    router.onPointerUpdate(contact, event, [contact]);

    expect(router.getPointerAction(contact.pointerId)).toBe('ERASE');
    expect(palm.onPointerDown).toHaveBeenCalledOnce();
  });
});
