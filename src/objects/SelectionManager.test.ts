import { describe, expect, it } from 'vitest';
import { createStrokeObject } from '../models';
import type { GroupObject, WhiteboardObject } from '../types';
import { SelectionManager } from './SelectionManager';

const stroke = () => createStrokeObject({ tool: 'pencil', points: [{ x: 10, y: 10 }, { x: 40, y: 50 }], color: '#111827', width: 3, opacity: 1 });
const group = (id: string, parentGroupId?: string): GroupObject => ({ ...stroke(), type: 'group', id, parentGroupId, children: [] } as GroupObject);

describe('Selection of handwriting with group references', () => {
  it('keeps a stroke selectable when its saved parent group is missing', () => {
    const ink = { ...stroke(), parentGroupId: 'deleted-group' };
    const effective = SelectionManager.getEffectiveSelection(new Set([ink.id]), [ink]);
    expect([...SelectionManager.filterLocked(effective, [ink])]).toEqual([ink.id]);
    expect(ink.parentGroupId).toBe('deleted-group');
  });
  it('selects the highest existing group when an outer group is missing', () => {
    const inner = group('word', 'missing-outer');
    const ink = { ...stroke(), parentGroupId: inner.id };
    expect([...SelectionManager.getEffectiveSelection(new Set([ink.id]), [ink, inner])]).toEqual(['word']);
  });
  it('preserves normal nested group selection and lock filtering', () => {
    const outer = { ...group('sentence'), locked: true };
    const inner = group('word', outer.id);
    const ink = { ...stroke(), parentGroupId: inner.id };
    const objects: WhiteboardObject[] = [ink, inner, outer];
    const effective = SelectionManager.getEffectiveSelection(new Set([ink.id]), objects);
    expect([...effective]).toEqual(['sentence']);
    expect([...SelectionManager.filterLocked(effective, objects)]).toEqual([]);
  });
  it('ignores nonexistent selection IDs and does not follow non-group parents', () => {
    const unrelated = stroke();
    const ink = { ...stroke(), parentGroupId: unrelated.id };
    expect([...SelectionManager.getEffectiveSelection(new Set([ink.id, 'missing']), [ink, unrelated])]).toEqual([ink.id]);
  });
  it('terminates when group ancestry contains a cycle', () => {
    const a = group('a', 'b'), b = group('b', 'a');
    expect([...SelectionManager.getEffectiveSelection(new Set(['a']), [a, b])]).toEqual(['b']);
  });
});
