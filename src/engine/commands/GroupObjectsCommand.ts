import { ICommand, WhiteboardObject, GroupObject } from '../../types';
import { generateId } from '../../utils';

export class GroupObjectsCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Group Objects';
  
  private groupObj: GroupObject;
  private previousStates: Map<string, string | undefined> = new Map();
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    childrenIds: string[],
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;

    const currentObjects = objectsRef();
    
    // Store previous parent group IDs
    for (const obj of currentObjects) {
      if (childrenIds.includes(obj.id)) {
        this.previousStates.set(obj.id, obj.parentGroupId);
      }
    }

    this.groupObj = {
      id: generateId('group'),
      type: 'group',
      children: [...childrenIds],
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  public execute(): void {
    const list = [...this.objectsRef()];
    
    // Set parentGroupId for children
    for (let i = 0; i < list.length; i++) {
      if (this.previousStates.has(list[i].id)) {
        list[i] = { ...list[i], parentGroupId: this.groupObj.id, updatedAt: Date.now() };
      }
    }

    // Add the group object
    list.push({ ...this.groupObj });
    this.setObjectsRef(list);
  }

  public undo(): void {
    let list = this.objectsRef();
    
    // Remove the group object
    list = list.filter((obj) => obj.id !== this.groupObj.id);

    // Restore previous parent group IDs
    for (let i = 0; i < list.length; i++) {
      if (this.previousStates.has(list[i].id)) {
        const prevParentId = this.previousStates.get(list[i].id);
        if (prevParentId === undefined) {
          const { parentGroupId, ...rest } = list[i] as any;
          list[i] = { ...rest, updatedAt: Date.now() };
        } else {
          list[i] = { ...list[i], parentGroupId: prevParentId, updatedAt: Date.now() };
        }
      }
    }

    this.setObjectsRef(list);
  }

  public redo(): void {
    this.execute();
  }
}
