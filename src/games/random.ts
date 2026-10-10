/** A small seeded generator so every round set can be reproduced in tests. */
export type Rng = () => number;

export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` distinct items in random order (all of them if there are fewer). */
export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count));
}

export function integer(min: number, max: number, rng: Rng) {
  return min + Math.floor(rng() * (max - min + 1));
}
