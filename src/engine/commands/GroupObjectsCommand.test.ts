import { describe, expect, it } from 'vitest';
import { createStrokeObject } from '../../models';
import type { GroupObject, WhiteboardObject } from '../../types';
import { getCombinedBoundingBox } from '../../utils';
import { GroupManager } from '../../objects/GroupManager';
import { GroupObjectsCommand } from './GroupObjectsCommand';

const handwriting = () => [
  createStrokeObject({ tool: 'pencil', points: [{ x: 330, y: 300 }, { x: 365, y: 460 }], color: '#111827', width: 4, opacity: 1 }),
  createStrokeObject({ tool: 'pencil', points: [{ x: 400, y: 315 }, { x: 400, y: 450 }], color: '#111827', width: 4, opacity: 1 }),
  createStrokeObject({ tool: 'pencil', points: [{ x: 450, y: 390 }, { x: 460, y: 430 }], color: '#111827', width: 4, opacity: 1 }),
  createStrokeObject({ tool: 'pencil', points: [{ x: 455, y: 365 }], color: '#111827', width: 4, opacity: 1 }),
];

describe('Grouped handwriting bounds', () => {
  it('preserves the selection box through grouping, undo, and redo', () => {
    let objects: WhiteboardObject[] = handwriting();
    const before = getCombinedBoundingBox(objects, 4);
    const command = new GroupObjectsCommand(objects.map(o => o.id), () => objects, next => { objects = next; });
    command.execute();
    const group = objects.find(o => o.type === 'group')!;
    expect(getCombinedBoundingBox([group], 4, objects)).toEqual(before);
    expect(getCombinedBoundingBox(objects, 4)).toEqual(before);
    expect(GroupManager.getGroupBoundingBox(group.id, objects)).toEqual({
      minX: 328, minY: 298, maxX: 462, maxY: 462, width: 134, height: 164,
    });
    command.undo();
    expect(getCombinedBoundingBox(objects, 4)).toEqual(before);
    command.redo();
    expect(getCombinedBoundingBox([group], 4, objects)).toEqual(before);
  });

  it('resolves nested groups and ignores an unrelated object at the canvas origin', () => {
    let objects: WhiteboardObject[] = handwriting();
    const before = getCombinedBoundingBox(objects, 4);
    new GroupObjectsCommand(objects.slice(0, 2).map(o => o.id), () => objects, next => { objects = next; }).execute();
    new GroupObjectsCommand(objects.filter(o => !o.parentGroupId).map(o => o.id), () => objects, next => { objects = next; }).execute();
    const outer = objects.at(-1)!;
    objects.push(createStrokeObject({ tool: 'pencil', points: [{ x: 0, y: 0 }], color: '#111827', width: 4, opacity: 1 }));
    expect(getCombinedBoundingBox([outer], 4, objects)).toEqual(before);
  });

  it('uses current stroke points after moving, instead of the group placeholder', () => {
    let objects: WhiteboardObject[] = handwriting();
    new GroupObjectsCommand(objects.map(o => o.id), () => objects, next => { objects = next; }).execute();
    objects = objects.map(o => o.type === 'stroke' ? { ...o, points: o.points.map(p => ({ x: p.x + 100, y: p.y + 50 })) } : o);
    const group = objects.at(-1)!;
    expect(getCombinedBoundingBox([group], 4, objects)).toEqual({
      minX: 424, minY: 344, maxX: 566, maxY: 516, width: 142, height: 172,
    });
  });

  it('does not give empty groups a phantom selection at the origin', () => {
    const empty: GroupObject = { id: 'empty', type: 'group', children: [], x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: 0, visible: true, locked: false, createdAt: 0, updatedAt: 0 };
    expect(getCombinedBoundingBox([empty], 4)).toBeNull();
  });
});
