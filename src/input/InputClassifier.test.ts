import { describe, expect, it } from 'vitest';
import { InputClassifier } from './InputClassifier';
import { DEFAULT_INPUT_SETTINGS } from './InputSettings';
import type { PointerState, PointerType } from './PointerState';

const pointer = (pointerType: PointerType, overrides: Partial<PointerState> = {}): PointerState => ({
  pointerId: 1,
  pointerType,
  isPrimary: true,
  x: 10,
  y: 10,
  previousX: 10,
  previousY: 10,
  startX: 10,
  startY: 10,
  pressure: 0.5,
  width: 10,
  height: 10,
  tiltX: 0,
  tiltY: 0,
  twist: 0,
  buttons: 1,
  timestamp: 1,
  target: null,
  classification: 'UNKNOWN',
  action: 'IGNORE',
  hasMovedSignificantly: false,
  isActive: true,
  ...overrides,
});

describe('InputClassifier', () => {
  const classifier = new InputClassifier();

  it('routes pen, finger, and mouse by their physical pointer type', () => {
    expect(classifier.classify(pointer('pen'), DEFAULT_INPUT_SETTINGS, [])).toBe('STYLUS');
    expect(classifier.classify(pointer('touch'), DEFAULT_INPUT_SETTINGS, [])).toBe('FINGER');
    expect(classifier.classify(pointer('mouse'), DEFAULT_INPUT_SETTINGS, [])).toBe('MOUSE');
  });

  it('does not erase when a large palm is resting without movement', () => {
    const restingPalm = pointer('touch', { width: 68, height: 54 });
    expect(classifier.classify(restingPalm, DEFAULT_INPUT_SETTINGS, [])).toBe('PALM_CANDIDATE');
  });

  it('promotes a large moving contact to a deliberate palm eraser', () => {
    const movingPalm = pointer('touch', { width: 68, height: 54, x: 28, y: 10 });
    expect(classifier.classify(movingPalm, DEFAULT_INPUT_SETTINGS, [])).toBe('PALM_ERASER');
  });

  it('treats a resting large contact as accidental while a stylus is active', () => {
    const stylus = pointer('pen', { pointerId: 2 });
    const palm = pointer('touch', { width: 55, height: 50 });
    expect(classifier.classify(palm, DEFAULT_INPUT_SETTINGS, [stylus, palm])).toBe('ACCIDENTAL_PALM');
  });
});
