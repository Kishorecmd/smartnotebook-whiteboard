import { ICommand, WhiteboardObject, GroupObject } from '../../types';
import { generateId } from '../../utils';

export class UngroupObjectsCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Ungroup Objects';
  
  private groupObjs: GroupObject[] = [];
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    groupIds: string[],
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;

    const currentObjects = objectsRef();
    
    for (const obj of currentObjects) {
      if (groupIds.includes(obj.id) && obj.type === 'group') {
        this.groupObjs.push({ ...obj } as GroupObject);
      }
    }
  }

  public execute(): void {
    let list = this.objectsRef();
    
    const groupIdsToRemove = new Set(this.groupObjs.map(g => g.id));

    // Remove the group objects
    list = list.filter(obj => !groupIdsToRemove.has(obj.id));

    // Clear parentGroupId for children
    for (let i = 0; i < list.length; i++) {
      if (list[i].parentGroupId && groupIdsToRemove.has(list[i].parentGroupId as string)) {
        const ungrouped = { ...list[i], updatedAt: Date.now() };
        delete ungrouped.parentGroupId;
        list[i] = ungrouped;
      }
    }

    this.setObjectsRef(list);
  }

  public undo(): void {
    const list = [...this.objectsRef()];
    
    // Add the group objects back
    list.push(...this.groupObjs);

    // Restore parentGroupId for children
    for (const group of this.groupObjs) {
      const childIds = new Set(group.children);
      for (let i = 0; i < list.length; i++) {
        if (childIds.has(list[i].id)) {
          list[i] = { ...list[i], parentGroupId: group.id, updatedAt: Date.now() };
        }
      }
    }

    this.setObjectsRef(list);
  }

  public redo(): void {
    this.execute();
  }
}
