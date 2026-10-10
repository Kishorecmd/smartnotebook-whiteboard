import { useCallback, useEffect, useRef, useState } from 'react';
import { playFinish, playTick } from '../games/feedback';

/**
 * Waits between the names flicking past: quick at first, then slowing like a
 * wheel coming to rest. About two and a half seconds in all.
 */
export function shuffleDelays(steps = 18): number[] {
  return Array.from({ length: steps }, (_, i) => Math.round(55 + 380 * (i / (steps - 1)) ** 2.6));
}

/**
 * The names shown on the way to `winner`: random, never the same twice in a
 * row, and ending on the winner.
 */
export function shuffleSequence<T>(items: T[], winner: T, steps: number, random = Math.random): T[] {
  if (items.length < 2) return [winner];
  const sequence: T[] = [];
  for (let i = 0; i < steps - 1; i++) {
    let next = items[Math.floor(random() * items.length)];
    if (next === sequence[i - 1]) next = items[(items.indexOf(next) + 1) % items.length];
    sequence.push(next);
  }
  if (sequence[sequence.length - 1] === winner) sequence[sequence.length - 1] = items[(items.indexOf(winner) + 1) % items.length];
  return [...sequence, winner];
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Shuffles through `items` and settles on a random one. `tick` changes on
 * every name shown so the card can replay its flick animation.
 */
export function useNameShuffle<T>(onPicked: (winner: T) => void) {
  const [shown, setShown] = useState<T | null>(null);
  const [tick, setTick] = useState(0);
  const [rolling, setRolling] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const picked = useRef(onPicked);
  picked.current = onPicked;
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => stop, []);

  const start = useCallback((items: T[]) => {
    if (!items.length || timers.current.length) return;
    const winner = items[Math.floor(Math.random() * items.length)];
    if (reducedMotion() || items.length < 2) {
      setShown(winner); setTick(t => t + 1); picked.current(winner); playFinish();
      return;
    }
    const delays = shuffleDelays();
    const sequence = shuffleSequence(items, winner, delays.length);
    setRolling(true);
    let at = 0;
    sequence.forEach((item, i) => {
      timers.current.push(setTimeout(() => {
        setShown(item); setTick(t => t + 1);
        if (i < sequence.length - 1) playTick();
        else { stop(); setRolling(false); picked.current(winner); playFinish(); }
      }, at));
      at += delays[i];
    });
  }, []);

  const reset = useCallback(() => { stop(); setRolling(false); setShown(null); }, []);
  return { shown, tick, rolling, start, reset };
}
