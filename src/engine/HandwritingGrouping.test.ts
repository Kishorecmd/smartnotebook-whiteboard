import { describe, expect, it } from 'vitest';
import { createStrokeObject } from '../models';
import type { FreehandStroke, WhiteboardObject } from '../types';
import { getCombinedBoundingBox } from '../utils';
import { HandwritingGrouping, type AutoGroupingMode } from './HandwritingGrouping';
import { CommandManager } from './CommandManager';

const ink = (x: number, y = 100, height = 50): FreehandStroke => createStrokeObject({
  tool: 'pencil', points: [{ x, y }, { x: x + 10, y: y + height }], color: '#111827', width: 2, opacity: 1,
});
const setup = () => {
  let objects: WhiteboardObject[] = [];
  const grouping = new HandwritingGrouping();
  const history = new CommandManager();
  const add = (stroke: FreehandStroke, start = 100, mode: AutoGroupingMode = 'words', source = 'pen') => {
    const command = grouping.command(stroke, source, start, mode, () => objects, next => { objects = next; grouping.reset(); });
    history.execute(command);
    grouping.remember(stroke, source, mode, start + 100);
  };
  return { add, grouping, history, objects: () => objects, groups: () => objects.filter(o => o.type === 'group') };
};

describe('Automatic handwriting grouping', () => {
  it('joins nearby letters into one flat group with unchanged bounds and per-stroke undo/redo', () => {
    const s = setup();
    const strokes = [ink(100), ink(120), ink(140), ink(160), ink(180)];
    strokes.forEach((stroke, i) => s.add(stroke, 100 + i * 250));
    expect(s.groups()).toHaveLength(1);
    expect(s.groups()[0].children).toHaveLength(5);
    expect(getCombinedBoundingBox(s.groups(), 4, s.objects())).toEqual(getCombinedBoundingBox(strokes, 4));
    s.history.undo();
    expect(s.groups()[0].children).toHaveLength(4);
    s.history.redo();
    expect(s.groups()[0].children).toHaveLength(5);
    for (let i = 0; i < 4; i++) s.history.undo();
    expect(s.groups()).toHaveLength(0);
    expect(s.objects()).toHaveLength(1);
    expect(s.objects()[0].parentGroupId).toBeUndefined();
    for (let i = 0; i < 4; i++) s.history.redo();
    expect(s.groups()[0].children).toHaveLength(5);
  });

  it.each(['words', 'sentences'] as const)('starts a new group after a pause or on a new line in %s mode', mode => {
    const s = setup();
    s.add(ink(100), 100, mode); s.add(ink(120), 350, mode);
    s.add(ink(140), 5000, mode); s.add(ink(160), 5250, mode);
    s.add(ink(100, 220), 5500, mode); s.add(ink(120, 220), 5750, mode);
    expect(s.groups()).toHaveLength(3);
  });

  it('uses larger word spaces for sentences while keeping words separate', () => {
    for (const mode of ['words', 'sentences'] as const) {
      const s = setup();
      [100, 120, 175, 195].forEach((x, i) => s.add(ink(x), 100 + 250 * i, mode));
      expect(s.groups()).toHaveLength(mode === 'words' ? 2 : 1);
    }
  });

  it('includes a detached dot above a letter', () => {
    const s = setup();
    s.add(ink(100)); s.add(ink(105, 85, 1), 350);
    expect(s.groups()).toHaveLength(1);
  });

  it('keeps strokes separate when disabled', () => {
    const s = setup(); s.add(ink(100), 100, 'off'); s.add(ink(120), 350, 'off');
    expect(s.groups()).toHaveLength(0);
  });

  it('does not join concurrent input, different input types, or changed ink', () => {
    for (const kind of ['concurrent', 'source', 'color', 'size', 'tool'] as const) {
      const s = setup(); s.add(ink(100));
      const next = ink(120);
      if (kind === 'color') next.color = '#ff0000';
      if (kind === 'size') next.width = 6;
      if (kind === 'tool') next.tool = 'highlighter';
      s.add(next, kind === 'concurrent' ? 150 : 350, 'words', kind === 'source' ? 'touch' : 'pen');
      expect(s.groups()).toHaveLength(0);
    }
  });

  it('does not rejoin after an edit, page switch, or manual ungroup resets the session', () => {
    const s = setup(); s.add(ink(100)); s.grouping.reset(); s.add(ink(120), 350);
    expect(s.groups()).toHaveLength(0);
  });
});
