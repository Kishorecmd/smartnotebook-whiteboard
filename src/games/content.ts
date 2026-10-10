/**
 * Built-in game content. Pictures are emoji so the games work offline on any
 * board; every word is checked by the content tests.
 */

/** A picture whose word starts with the letter's usual first sound. */
export const LETTER_PICTURES: { letter: string; word: string; picture: string }[] = [
  { letter: 'a', word: 'apple', picture: '🍎' },
  { letter: 'b', word: 'ball', picture: '⚽' },
  { letter: 'c', word: 'cat', picture: '🐱' },
  { letter: 'd', word: 'dog', picture: '🐶' },
  { letter: 'e', word: 'egg', picture: '🥚' },
  { letter: 'f', word: 'fish', picture: '🐟' },
  { letter: 'g', word: 'goat', picture: '🐐' },
  { letter: 'h', word: 'hat', picture: '🎩' },
  { letter: 'k', word: 'kite', picture: '🪁' },
  { letter: 'l', word: 'lion', picture: '🦁' },
  { letter: 'm', word: 'moon', picture: '🌙' },
  { letter: 'n', word: 'nose', picture: '👃' },
  { letter: 'o', word: 'octopus', picture: '🐙' },
  { letter: 'p', word: 'pig', picture: '🐷' },
  { letter: 'q', word: 'queen', picture: '👸' },
  { letter: 'r', word: 'rabbit', picture: '🐰' },
  { letter: 's', word: 'sun', picture: '☀️' },
  { letter: 't', word: 'tiger', picture: '🐯' },
  { letter: 'u', word: 'umbrella', picture: '☂️' },
  { letter: 'v', word: 'van', picture: '🚐' },
  { letter: 'w', word: 'watch', picture: '⌚' },
  { letter: 'y', word: 'yo-yo', picture: '🪀' },
  { letter: 'z', word: 'zebra', picture: '🦓' },
];

/** Three-letter words a child can build sound by sound. */
export const CVC_WORDS: { word: string; picture: string }[] = [
  { word: 'cat', picture: '🐱' }, { word: 'dog', picture: '🐶' }, { word: 'sun', picture: '☀️' },
  { word: 'pig', picture: '🐷' }, { word: 'bus', picture: '🚌' }, { word: 'hat', picture: '🎩' },
  { word: 'fox', picture: '🦊' }, { word: 'bed', picture: '🛏️' }, { word: 'hen', picture: '🐔' },
  { word: 'van', picture: '🚐' }, { word: 'box', picture: '📦' }, { word: 'web', picture: '🕸️' },
  { word: 'bat', picture: '🦇' }, { word: 'rat', picture: '🐀' }, { word: 'cup', picture: '☕' },
  { word: 'map', picture: '🗺️' },
];

/** Things to count. */
export const COUNTABLES = ['🍎', '⭐', '🐟', '🌸', '🚗', '🎈', '🐤', '🍓', '⚽', '🦋'];

export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'oval' | 'diamond' | 'pentagon' | 'hexagon';
export const SHAPES_BY_LEVEL: Record<'kg' | 'g1', ShapeName[]> = {
  kg: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart'],
  g1: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond', 'pentagon', 'hexagon'],
};

/** Pictures for memory pairs. */
export const MEMORY_PICTURES = ['🐶', '🐱', '🐰', '🦁', '🐸', '🐵', '🐼', '🐯', '🦊', '🐨', '🐷', '🐮'];

/** Characters to trace, by level. */
export const TRACE_SETS: Record<'kg' | 'g1', string[]> = {
  kg: ['A', 'B', 'C', 'L', 'O', 'T', '1', '2', '3', '4', '5'],
  g1: ['a', 'b', 'd', 'e', 'g', 'm', 's', '6', '7', '8', '9'],
};
