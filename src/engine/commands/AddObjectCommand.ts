import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class AddObjectCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  private object: WhiteboardObject;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    object: WhiteboardObject,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void,
    name: string = 'Add Object'
  ) {
    this.id = generateId('cmd');
    this.name = name;
    this.object = object;
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    const list = this.objectsRef();
    this.setObjectsRef([...list, this.object]);
  }

  public undo(): void {
    const list = this.objectsRef();
    this.setObjectsRef(list.filter((obj) => obj.id !== this.object.id));
  }

  public redo(): void {
    this.execute();
  }
}
