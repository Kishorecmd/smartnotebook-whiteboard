import { describe, expect, it } from 'vitest';
import { readStudentMode, STUDENT_MODE_KEY, writeStudentMode } from './studentMode';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

describe('Student Mode persistence', () => {
  it('is remembered across a reload until it is turned off', () => {
    const s = memory();
    expect(readStudentMode(s)).toBe(false);
    writeStudentMode(true, s);
    expect(readStudentMode(s)).toBe(true);
    expect(s.m.get(STUDENT_MODE_KEY)).toBe('on');
    writeStudentMode(false, s);
    expect(readStudentMode(s)).toBe(false);
  });
  it('treats blocked or odd storage as off without throwing', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(readStudentMode(broken)).toBe(false);
    expect(() => writeStudentMode(true, broken)).not.toThrow();
    const s = memory(); s.setItem(STUDENT_MODE_KEY, 'yes');
    expect(readStudentMode(s)).toBe(false);
  });
});
