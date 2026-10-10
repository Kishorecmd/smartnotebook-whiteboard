import { describe, expect, it } from 'vitest';
import { CVC_WORDS, LETTER_PICTURES, MEMORY_PICTURES, SHAPES_BY_LEVEL } from './content';
import { countRounds, encouragement, isSolved, letterRounds, levelForGrade, memoryDeck, orderRounds, puzzleSide, scrambled, shapeRounds, swapPieces, traceCoverage, traceRounds, wordRounds } from './logic';
import { sample, seeded, shuffle } from './random';

describe('content', () => {
  it('pairs each letter with a picture whose word starts with it', () => {
    for (const { letter, word } of LETTER_PICTURES) expect(word.startsWith(letter)).toBe(true);
    expect(new Set(LETTER_PICTURES.map(p => p.letter)).size).toBe(LETTER_PICTURES.length);
  });
  it('uses only three-letter words for building', () => {
    for (const { word } of CVC_WORDS) expect(word).toMatch(/^[a-z]{3}$/);
  });
  it('has enough memory pictures for the largest board', () => {
    expect(new Set(MEMORY_PICTURES).size).toBeGreaterThanOrEqual(8);
  });
});

describe('random helpers', () => {
  it('repeat for the same seed and keep every item when shuffling', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)));
    expect(shuffle([1, 2, 3, 4, 5], seeded(7)).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(sample([1, 2, 3, 4, 5], 3, seeded(1))).size).toBe(3);
  });
});

describe('levels', () => {
  it('maps kindergarten classes to KG and other grades to Grade 1–2', () => {
    for (const g of ['LKG', 'UKG', 'KG', 'Pre-KG', 'Nursery']) expect(levelForGrade(g)).toBe('kg');
    for (const g of ['Grade 1', 'Grade 2', 'Grade 3']) expect(levelForGrade(g)).toBe('g1');
    expect(levelForGrade(undefined)).toBe('kg');
  });
});

describe('choice rounds', () => {
  for (const seed of [1, 2, 3]) {
    it(`always include the right answer once, with distinct options (seed ${seed})`, () => {
      for (const level of ['kg', 'g1'] as const) {
        for (const round of [...letterRounds(level, seeded(seed)), ...countRounds(level, seeded(seed)), ...shapeRounds(level, seeded(seed))]) {
          expect(round.options.filter(o => o === round.answer)).toHaveLength(1);
          expect(new Set(round.options).size).toBe(round.options.length);
          expect(round.options.length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  }
  it('gives KG three letter choices and fewer, smaller counts', () => {
    const rounds = letterRounds('kg', seeded(4));
    expect(rounds).toHaveLength(8);
    expect(rounds.every(r => r.options.length === 3)).toBe(true);
    expect(countRounds('kg', seeded(4)).every(r => r.prompt.count >= 1 && r.prompt.count <= 5)).toBe(true);
    expect(countRounds('g1', seeded(4)).every(r => Number(r.answer) === r.prompt.count && r.prompt.count <= 12)).toBe(true);
  });
  it('asks only for shapes taught at that level', () => {
    for (const r of shapeRounds('kg', seeded(9))) expect(SHAPES_BY_LEVEL.kg).toContain(r.answer);
  });
});

describe('word, order, memory and trace rounds', () => {
  it('give every letter of the word as a tile, plus letters not in it', () => {
    for (const r of wordRounds('g1', seeded(5))) {
      for (const c of r.word) expect(r.tiles).toContain(c);
      expect(r.tiles).toHaveLength(r.word.length + 3);
    }
  });
  it('shuffle consecutive numbers', () => {
    for (const r of orderRounds('g1', seeded(6))) {
      expect([...r.shuffled].sort((a, b) => a - b)).toEqual(r.numbers);
      expect(r.numbers.every((n, i) => i === 0 || n === r.numbers[i - 1] + 1)).toBe(true);
    }
  });
  it('deal each memory picture exactly twice', () => {
    const deck = memoryDeck('kg', seeded(3));
    expect(deck).toHaveLength(12);
    const counts = deck.reduce<Record<string, number>>((m, c) => ({ ...m, [c.picture]: (m[c.picture] || 0) + 1 }), {});
    expect(Object.values(counts).every(n => n === 2)).toBe(true);
  });
  it('pick five characters to trace', () => {
    expect(new Set(traceRounds('kg', seeded(2))).size).toBe(5);
  });
});

describe('scoring', () => {
  it('measures how much of the guide is covered', () => {
    const guide = new Uint8ClampedArray(4 * 10), ink = new Uint8ClampedArray(4 * 10);
    for (let p = 0; p < 10; p++) guide[p * 4 + 3] = 255;
    for (let p = 0; p < 7; p++) ink[p * 4 + 3] = 255;
    expect(traceCoverage(guide, ink, 1)).toBe(0.7);
    expect(traceCoverage(new Uint8ClampedArray(8), ink.slice(0, 8), 1)).toBe(0);
  });
  it('always encourages and never ranks', () => {
    for (const firstTry of [0, 3, 7, 10]) expect(encouragement({ firstTry, total: 10, hints: 0 })).toMatch(/well|good|great|wonderful/i);
  });
});

describe('picture puzzle', () => {
  it('never starts solved, keeps every piece, and is solved when sorted', () => {
    for (let seed = 1; seed < 40; seed++) {
      const order = scrambled(4, seeded(seed));
      expect(isSolved(order)).toBe(false);
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
    expect(isSolved(swapPieces([1, 0, 2, 3], 0, 1))).toBe(true);
    expect(puzzleSide('kg')).toBe(2);
    expect(puzzleSide('g1')).toBe(3);
  });
  it('praises creative work without counting right answers', () => {
    expect(encouragement({ firstTry: 0, total: 3, hints: 0, creative: true })).toMatch(/beautiful/i);
  });
});
