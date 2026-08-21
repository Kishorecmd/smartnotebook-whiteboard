import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_INPUT_SETTINGS, shouldFingerDraw } from './InputSettings';

const withPrimaryPointer = (coarse: boolean) => {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' ? coarse : !coarse }),
  });
};

afterEach(() => vi.unstubAllGlobals());

describe('shouldFingerDraw', () => {
  it('lets a finger draw on a touch-first device that has never seen a stylus', () => {
    withPrimaryPointer(true);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(true);
  });

  it('hands writing back to the pen once a stylus has been used', () => {
    withPrimaryPointer(true);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto', stylusSeen: true })).toBe(false);
  });

  it('ignores (any-pointer: fine), which a stylus-less tablet also reports', () => {
    // The HONOR tablet reports a fine pointer with no stylus attached; only the
    // primary pointer and observed stylus use decide the outcome.
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q === '(pointer: coarse)' || q === '(any-pointer: fine)' }) });
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(true);
  });

  it('leaves a fine-pointer desktop selecting with the pointer', () => {
    withPrimaryPointer(false);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(false);
  });

  it('honours an explicit override over both signals', () => {
    withPrimaryPointer(false);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'on', stylusSeen: true })).toBe(true);
    withPrimaryPointer(true);
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'off' })).toBe(false);
  });

  it('falls back to selecting where media queries are unavailable', () => {
    vi.stubGlobal('window', {});
    expect(shouldFingerDraw({ ...DEFAULT_INPUT_SETTINGS, fingerDraw: 'auto' })).toBe(false);
  });
});
