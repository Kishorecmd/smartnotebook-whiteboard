import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class ChangeObjectStateCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;

  private previousStates: Map<string, Partial<WhiteboardObject>> = new Map();
  private newState: Partial<WhiteboardObject>;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    objectIds: string[],
    newState: Partial<WhiteboardObject>,
    name: string,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.name = name;
    this.newState = newState;
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;

    const currentObjects = objectsRef();
    
    // Store previous states for the affected keys
    for (const obj of currentObjects) {
      if (objectIds.includes(obj.id)) {
        const prevState: Partial<WhiteboardObject> = {};
        for (const key of Object.keys(newState)) {
          // @ts-ignore
          prevState[key as keyof WhiteboardObject] = obj[key as keyof WhiteboardObject];
        }
        this.previousStates.set(obj.id, prevState);
      }
    }
  }

  public execute(): void {
    const list = [...this.objectsRef()];
    
    for (let i = 0; i < list.length; i++) {
      if (this.previousStates.has(list[i].id)) {
        list[i] = { ...list[i], ...this.newState, updatedAt: Date.now() } as WhiteboardObject;
      }
    }

    this.setObjectsRef(list);
  }

  public undo(): void {
    const list = [...this.objectsRef()];
    
    for (let i = 0; i < list.length; i++) {
      if (this.previousStates.has(list[i].id)) {
        const prevState = this.previousStates.get(list[i].id)!;
        list[i] = { ...list[i], ...prevState, updatedAt: Date.now() } as WhiteboardObject;
      }
    }

    this.setObjectsRef(list);
  }

  public redo(): void {
    this.execute();
  }
}
