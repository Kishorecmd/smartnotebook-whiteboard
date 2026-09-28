import { describe, expect, it } from 'vitest';
import { NoiseLimit, soundLevel } from './soundLevel';

describe('Relative sound level', () => {
  it('treats silence and DC offset as silence', () => {
    expect(soundLevel(new Float32Array())).toBe(0);
    expect(soundLevel(new Float32Array([0, 0, 0]))).toBe(0);
    expect(soundLevel(new Float32Array([0.5, 0.5, 0.5]))).toBe(0);
  });
  it('maps known amplitudes to a bounded relative scale', () => {
    expect(soundLevel(new Float32Array([0.001, -0.001]))).toBeCloseTo(0);
    expect(soundLevel(new Float32Array([0.01, -0.01]))).toBeCloseTo(100 / 3);
    expect(soundLevel(new Float32Array([0.1, -0.1]))).toBeCloseTo(200 / 3);
    expect(soundLevel(new Float32Array([1, -1]), 2)).toBe(100);
  });
  it('responds to sensitivity without changing the signal', () => {
    const samples = new Float32Array([0.01, -0.01]);
    expect(soundLevel(samples, 2)).toBeGreaterThan(soundLevel(samples, 1));
    expect(samples[0]).toBeCloseTo(0.01);
  });
});
describe('Sustained noise alerts', () => {
  it('ignores brief peaks and resets their duration after quiet', () => {
    const detector = new NoiseLimit();
    expect(detector.update(80, 60, 0)).toBe(false);
    expect(detector.update(80, 60, 1100)).toBe(false);
    expect(detector.update(20, 60, 1150)).toBe(false);
    expect(detector.update(80, 60, 1200)).toBe(false);
    expect(detector.update(80, 60, 2300)).toBe(false);
    expect(detector.update(80, 60, 2400)).toBe(true);
  });
  it('does not repeatedly alert during continuous noise or threshold jitter', () => {
    const detector = new NoiseLimit();
    detector.update(80, 60, 0);
    expect(detector.update(80, 60, 1200)).toBe(true);
    expect(detector.update(80, 60, 10000)).toBe(false);
    detector.update(58, 60, 11000);
    detector.update(58, 60, 13000);
    detector.update(80, 60, 14000);
    expect(detector.update(80, 60, 16000)).toBe(false);
  });
  it('rearms after sustained quiet and respects the alert cooldown', () => {
    const detector = new NoiseLimit();
    detector.update(80, 60, 0); detector.update(80, 60, 1200);
    detector.update(20, 60, 1300); detector.update(20, 60, 2300);
    detector.update(80, 60, 2400);
    expect(detector.update(80, 60, 3600)).toBe(false);
    expect(detector.update(80, 60, 6200)).toBe(true);
  });
});
