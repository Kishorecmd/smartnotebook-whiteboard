import { ICommand, FreehandStroke, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';
import { nextZIndex } from './zIndex';

export class AddStrokeCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Add Stroke';
  private stroke: FreehandStroke;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    stroke: FreehandStroke,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
    // Land above whatever is already on the page, so annotating over an image or
    // video is actually visible. Resolved once here so redo reuses the same value.
    this.stroke = stroke.zIndex ? stroke : { ...stroke, zIndex: nextZIndex(objectsRef()) };
  }

  public execute(): void {
    const list = this.objectsRef();
    this.setObjectsRef([...list, this.stroke]);
  }

  public undo(): void {
    const list = this.objectsRef();
    this.setObjectsRef(list.filter((obj) => obj.id !== this.stroke.id));
  }

  public redo(): void {
    this.execute();
  }
}
