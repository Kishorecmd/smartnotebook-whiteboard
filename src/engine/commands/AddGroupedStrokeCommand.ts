import type { FreehandStroke, GroupObject, ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';
import { nextZIndex } from './zIndex';

/** Adds ink and group membership together, preserving one undo step per stroke. */
export class AddGroupedStrokeCommand implements ICommand {
  readonly id = generateId('cmd');
  readonly name = 'Add Handwriting Stroke';
  private before: WhiteboardObject[];
  private after: WhiteboardObject[];
  private addedIds: Set<string>;

  constructor(stroke: FreehandStroke, previous: FreehandStroke,
    private objectsRef: () => WhiteboardObject[],
    private setObjectsRef: (objects: WhiteboardObject[]) => void) {
    const objects = objectsRef();
    const existing = objects.find((o): o is GroupObject => o.id === previous.parentGroupId && o.type === 'group');
    const group: GroupObject = existing ? { ...existing, children: [...existing.children, stroke.id], updatedAt: Date.now() } : {
      id: generateId('group'), type: 'group', children: [previous.id, stroke.id],
      x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: 0,
      visible: true, locked: false, createdAt: Date.now(), updatedAt: Date.now(),
    };
    this.before = existing ? [existing] : [previous];
    this.after = [
      ...(existing ? [] : [{ ...previous, parentGroupId: group.id }]),
      { ...stroke, zIndex: nextZIndex(objects), parentGroupId: group.id }, group,
    ];
    this.addedIds = new Set(existing ? [stroke.id] : [stroke.id, group.id]);
  }
  execute(): void {
    const updates = new Map(this.after.map(o => [o.id, o]));
    const objects = this.objectsRef().map(o => updates.get(o.id) ?? o);
    const ids = new Set(objects.map(o => o.id));
    this.setObjectsRef([...objects, ...this.after.filter(o => !ids.has(o.id))]);
  }
  undo(): void {
    const previous = new Map(this.before.map(o => [o.id, o]));
    this.setObjectsRef(this.objectsRef().filter(o => !this.addedIds.has(o.id)).map(o => previous.get(o.id) ?? o));
  }
  redo(): void { this.execute(); }
}
