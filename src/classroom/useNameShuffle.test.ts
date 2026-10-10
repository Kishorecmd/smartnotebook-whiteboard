import { describe, expect, it } from 'vitest';
import { shuffleDelays, shuffleSequence } from './useNameShuffle';

describe('Random name shuffle', () => {
  it('starts quick and slows down, taking about two and a half seconds', () => {
    const delays = shuffleDelays();
    for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    expect(delays[0]).toBeLessThan(80);
    expect(delays.at(-1)).toBeGreaterThan(400);
    const total = delays.slice(0, -1).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(1800);
    expect(total).toBeLessThan(3200);
  });
  it('ends on the chosen name and never shows the same name twice in a row', () => {
    const names = ['Asha', 'Bala', 'Chitra', 'Dev'];
    for (let run = 0; run < 50; run++) {
      const winner = names[run % names.length];
      const sequence = shuffleSequence(names, winner, 18);
      expect(sequence).toHaveLength(18);
      expect(sequence.at(-1)).toBe(winner);
      for (let i = 1; i < sequence.length; i++) expect(sequence[i]).not.toBe(sequence[i - 1]);
    }
  });
  it('shows the only name straight away when there is nobody else', () => {
    expect(shuffleSequence(['Asha'], 'Asha', 18)).toEqual(['Asha']);
  });
});
