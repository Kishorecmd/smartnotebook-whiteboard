import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';
import { nextZIndex } from './zIndex';

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
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
    // Same rule as strokes: a new object belongs on top unless it asked for a layer.
    this.object = object.zIndex ? object : { ...object, zIndex: nextZIndex(objectsRef()) };
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
