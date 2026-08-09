import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class ClearPageCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Clear Page';
  private previousObjects: WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    previousObjects: WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.previousObjects = previousObjects;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    this.setObjectsRef([]);
  }

  public undo(): void {
    this.setObjectsRef(this.previousObjects);
  }

  public redo(): void {
    this.execute();
  }
}
