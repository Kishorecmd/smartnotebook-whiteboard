import { ICommand, FreehandStroke, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class DeleteStrokesCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Erase Strokes';
  private deletedStrokes: { stroke: FreehandStroke; originalIndex: number }[] = [];
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    strokesToDelete: FreehandStroke[],
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;

    const currentList = this.objectsRef();
    for (const stroke of strokesToDelete) {
      const idx = currentList.findIndex((item) => item.id === stroke.id);
      if (idx !== -1) {
        this.deletedStrokes.push({ stroke, originalIndex: idx });
      }
    }
  }

  public execute(): void {
    const idsToDelete = new Set(this.deletedStrokes.map((d) => d.stroke.id));
    const currentList = this.objectsRef();
    this.setObjectsRef(currentList.filter((obj) => !idsToDelete.has(obj.id)));
  }

  public undo(): void {
    const currentList = [...this.objectsRef()];
    // Re-insert strokes in their original sequence
    const sorted = [...this.deletedStrokes].sort((a, b) => a.originalIndex - b.originalIndex);
    for (const item of sorted) {
      const targetIdx = Math.min(item.originalIndex, currentList.length);
      currentList.splice(targetIdx, 0, item.stroke);
    }
    this.setObjectsRef(currentList);
  }

  public redo(): void {
    this.execute();
  }
}
