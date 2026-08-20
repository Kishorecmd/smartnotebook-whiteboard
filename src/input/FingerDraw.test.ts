import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_INPUT_SETTINGS, shouldFingerDraw } from './InputSettings';

const withPointerCapability = (fine: boolean) => {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: query === '(any-pointer: fine)' ? fine : !fine }),
  });
};

afterEach(() => vi.unstubAllGlobals());

describe('shouldFingerDraw', () => {
  it('lets a finger draw on touch-only hardware in automatic mode', () => {
    withPointerCapability(false);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(true);
  });

  it('leaves a stylus board on finger-to-select in automatic mode', () => {
    withPointerCapability(true);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(false);
  });

  it('honours an explicit override on either kind of hardware', () => {
    withPointerCapability(true);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'on' })).toBe(true);
    withPointerCapability(false);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'off' })).toBe(false);
  });

  it('falls back to selecting where media queries are unavailable', () => {
    vi.stubGlobal('window', {});
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(false);
  });
});
