import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

interface RemovedItem {
  index: number;
  object: WhiteboardObject;
}

export class DeleteObjectsCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Delete Objects';
  private removedItems: RemovedItem[] = [];
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    objectsToDelete: WhiteboardObject[],
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;

    const currentObjects = objectsRef();
    const ids = new Set(objectsToDelete.map((o) => o.id));

    currentObjects.forEach((obj, index) => {
      if (ids.has(obj.id)) {
        this.removedItems.push({ index, object: { ...obj } });
      }
    });
  }

  public execute(): void {
    const list = this.objectsRef();
    const idsToRemove = new Set(this.removedItems.map((item) => item.object.id));
    this.setObjectsRef(list.filter((obj) => !idsToRemove.has(obj.id)));
  }

  public undo(): void {
    const list = [...this.objectsRef()];
    // Sort items by index ascending to restore at original positions
    const sorted = [...this.removedItems].sort((a, b) => a.index - b.index);

    for (const item of sorted) {
      const idx = Math.min(item.index, list.length);
      list.splice(idx, 0, item.object);
    }

    this.setObjectsRef(list);
  }

  public redo(): void {
    this.execute();
  }
}
