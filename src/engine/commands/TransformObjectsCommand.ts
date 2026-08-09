import { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

export class TransformObjectsCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Transform Objects';
  private beforeStates: Map<string, WhiteboardObject>;
  private afterStates: Map<string, WhiteboardObject>;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    beforeObjects: WhiteboardObject[],
    afterObjects: WhiteboardObject[],
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void,
    name: string = 'Transform Objects'
  ) {
    this.id = generateId('cmd');
    this.name = name;
    this.beforeStates = new Map(beforeObjects.map((o) => [o.id, JSON.parse(JSON.stringify(o))]));
    this.afterStates = new Map(afterObjects.map((o) => [o.id, JSON.parse(JSON.stringify(o))]));
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    const list = this.objectsRef();
    const updated = list.map((obj) => {
      const next = this.afterStates.get(obj.id);
      return next ? { ...next } : obj;
    });
    this.setObjectsRef(updated);
  }

  public undo(): void {
    const list = this.objectsRef();
    const updated = list.map((obj) => {
      const prev = this.beforeStates.get(obj.id);
      return prev ? { ...prev } : obj;
    });
    this.setObjectsRef(updated);
  }

  public redo(): void {
    this.execute();
  }
}
