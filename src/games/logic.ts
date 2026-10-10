import { COUNTABLES, CVC_WORDS, LETTER_PICTURES, MEMORY_PICTURES, SHAPES_BY_LEVEL, TRACE_SETS, type ShapeName } from './content';
import { integer, sample, shuffle, type Rng } from './random';

/** KG covers LKG and UKG; g1 covers Grades 1 and 2. */
export type Level = 'kg' | 'g1';

export function levelForGrade(grade: string | undefined): Level {
  return !grade || /\b(l?kg|ukg|pre[- ]?kg|nursery|pre[- ]?primary)\b/i.test(grade) || /^kg/i.test(grade.trim()) ? 'kg' : 'g1';
}

export const roundsFor = (level: Level) => (level === 'kg' ? 8 : 10);

/** A question with one right answer among a few choices. */
export type ChoiceRound<T> = { prompt: T; answer: string; options: string[] };

export function letterRounds(level: Level, rng: Rng): ChoiceRound<{ word: string; picture: string }>[] {
  const optionCount = level === 'kg' ? 3 : 4;
  return sample(LETTER_PICTURES, roundsFor(level), rng).map(item => {
    const others = sample(LETTER_PICTURES.map(p => p.letter).filter(l => l !== item.letter), optionCount - 1, rng);
    return { prompt: { word: item.word, picture: item.picture }, answer: item.letter, options: shuffle([item.letter, ...others], rng) };
  });
}

export function countRounds(level: Level, rng: Rng): ChoiceRound<{ count: number; thing: string }>[] {
  const max = level === 'kg' ? 5 : 12;
  return Array.from({ length: roundsFor(level) }, () => {
    const count = integer(1, max, rng);
    const near = shuffle([-2, -1, 1, 2].map(d => count + d).filter(n => n >= 1 && n <= max + 2), rng).slice(0, 2);
    return { prompt: { count, thing: COUNTABLES[integer(0, COUNTABLES.length - 1, rng)] }, answer: String(count), options: shuffle([count, ...near].map(String), rng) };
  });
}

export function shapeRounds(level: Level, rng: Rng): ChoiceRound<ShapeName>[] {
  const pool = SHAPES_BY_LEVEL[level];
  const optionCount = level === 'kg' ? 3 : 4;
  // Each shape is asked about once before any repeats, in a random order.
  return shuffle(Array.from({ length: roundsFor(level) }, (_, i) => pool[i % pool.length]), rng)
    .map(shape => ({ prompt: shape, answer: shape, options: shuffle([shape, ...sample(pool.filter(s => s !== shape), optionCount - 1, rng)], rng) }));
}

/** Build-a-word: the letters of the word plus a few that do not belong. */
export function wordRounds(level: Level, rng: Rng) {
  const extra = level === 'kg' ? 1 : 3;
  return sample(CVC_WORDS, level === 'kg' ? 6 : 8, rng).map(({ word, picture }) => {
    const distractors = sample('abcdefghijklmnoprstuvw'.split('').filter(c => !word.includes(c)), extra, rng);
    return { word, picture, tiles: shuffle([...word.split(''), ...distractors], rng) };
  });
}

/** Numbers to tap in order: 1–5 for KG, a run of six from up to 20 for Grade 1–2. */
export function orderRounds(level: Level, rng: Rng) {
  return Array.from({ length: level === 'kg' ? 5 : 6 }, () => {
    const start = level === 'kg' ? 1 : integer(1, 15, rng);
    const length = level === 'kg' ? 5 : 6;
    const numbers = Array.from({ length }, (_, i) => start + i);
    return { numbers, shuffled: shuffle(numbers, rng) };
  });
}

export type MemoryCard = { id: number; picture: string };

export function memoryDeck(level: Level, rng: Rng): MemoryCard[] {
  const pictures = sample(MEMORY_PICTURES, level === 'kg' ? 6 : 8, rng);
  return shuffle(pictures.flatMap(p => [p, p]), rng).map((picture, id) => ({ id, picture }));
}

export function traceRounds(level: Level, rng: Rng) {
  return sample(TRACE_SETS[level], 5, rng);
}

/** The share of guide pixels covered by ink. Both arrays are canvas RGBA data of the same size. */
export function traceCoverage(guide: Uint8ClampedArray, ink: Uint8ClampedArray, step = 4): number {
  let guided = 0, covered = 0;
  for (let i = 3; i < guide.length; i += 4 * step) {
    if (guide[i] < 128) continue;
    guided++;
    if (ink[i] >= 128) covered++;
  }
  return guided ? covered / guided : 0;
}

/**
 * How a game ended: rounds right first time out of all rounds. Never a rank.
 * Creative games have no right answers, so they report pieces made instead.
 */
export type GameResult = { firstTry: number; total: number; hints: number; creative?: boolean };

export function encouragement({ firstTry, total, creative }: GameResult) {
  if (creative) return total === 1 ? 'Beautiful work!' : `${total} beautiful pieces. Lovely work!`;
  const share = total ? firstTry / total : 0;
  return share === 1 ? 'Every one right first time. Wonderful!'
    : share >= 0.7 ? 'Great work. You are learning fast!'
    : share >= 0.4 ? 'Good effort. Practice makes it easier!'
    : 'Well done for finishing. Let’s try again together!';
}

/** Picture puzzle: the pieces in a shuffled order that is never already solved. */
export function scrambled(pieces: number, rng: Rng): number[] {
  const order = Array.from({ length: pieces }, (_, i) => i);
  let out = shuffle(order, rng);
  while (pieces > 1 && isSolved(out)) out = shuffle(order, rng);
  return out;
}

export function swapPieces(order: number[], a: number, b: number): number[] {
  const out = [...order];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

export const isSolved = (order: number[]) => order.every((piece, slot) => piece === slot);

/** Pieces per side: 2×2 for KG, 3×3 for Grade 1–2. */
export const puzzleSide = (level: Level) => (level === 'kg' ? 2 : 3);
