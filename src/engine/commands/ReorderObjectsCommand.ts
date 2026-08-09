import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export type ReorderAction = 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward';

export class ReorderObjectsCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  private previousList: WhiteboardObject[];
  private nextList: WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    targetIds: string[],
    action: ReorderAction,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.name = `Reorder (${action})`;
    this.setObjectsRef = setObjectsRef;

    const current = objectsRef();
    this.previousList = [...current];

    const targetSet = new Set(targetIds);
    const selected = current.filter((o) => targetSet.has(o.id));
    const nonSelected = current.filter((o) => !targetSet.has(o.id));

    let reordered: WhiteboardObject[] = [];

    switch (action) {
      case 'bringToFront':
        reordered = [...nonSelected, ...selected];
        break;

      case 'sendToBack':
        reordered = [...selected, ...nonSelected];
        break;

      case 'bringForward': {
        const list = [...current];
        for (let i = list.length - 2; i >= 0; i--) {
          if (targetSet.has(list[i].id) && !targetSet.has(list[i + 1].id)) {
            const temp = list[i];
            list[i] = list[i + 1];
            list[i + 1] = temp;
          }
        }
        reordered = list;
        break;
      }

      case 'sendBackward': {
        const list = [...current];
        for (let i = 1; i < list.length; i++) {
          if (targetSet.has(list[i].id) && !targetSet.has(list[i - 1].id)) {
            const temp = list[i];
            list[i] = list[i - 1];
            list[i - 1] = temp;
          }
        }
        reordered = list;
        break;
      }
    }

    this.nextList = reordered;
  }

  public execute(): void {
    this.setObjectsRef(this.nextList);
  }

  public undo(): void {
    this.setObjectsRef(this.previousList);
  }

  public redo(): void {
    this.execute();
  }
}
