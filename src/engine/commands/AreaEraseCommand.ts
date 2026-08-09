import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class AreaEraseCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Area Erase';
  private originalObjects: WhiteboardObject[];
  private modifiedObjects: WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    originalObjects: WhiteboardObject[],
    modifiedObjects: WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.originalObjects = originalObjects;
    this.modifiedObjects = modifiedObjects;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    this.setObjectsRef(this.modifiedObjects);
  }

  public undo(): void {
    this.setObjectsRef(this.originalObjects);
  }

  public redo(): void {
    this.execute();
  }
}
