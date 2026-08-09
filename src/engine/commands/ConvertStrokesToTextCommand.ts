import { ICommand, WhiteboardObject, TextObject, FreehandStroke } from '../../types';
import { generateId } from '../../utils';

interface RemovedStrokeItem {
  index: number;
  stroke: FreehandStroke;
}

export class ConvertStrokesToTextCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Convert Handwriting to Text';
  private removedStrokes: RemovedStrokeItem[] = [];
  private textObject: TextObject;
  private replace: boolean;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;
  private selectObjectRef?: (id: string | null) => void;

  constructor(
    strokesToConvert: FreehandStroke[],
    textObject: TextObject,
    replace: boolean,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void,
    selectObjectRef?: (id: string | null) => void
  ) {
    this.id = generateId('cmd');
    this.textObject = textObject;
    this.replace = replace;
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
    this.selectObjectRef = selectObjectRef;

    const currentObjects = objectsRef();
    const strokeIdSet = new Set(strokesToConvert.map((s) => s.id));

    currentObjects.forEach((obj, index) => {
      if (strokeIdSet.has(obj.id) && obj.type === 'stroke') {
        this.removedStrokes.push({ index, stroke: { ...obj } });
      }
    });
  }

  public execute(): void {
    const list = [...this.objectsRef()];

    if (this.replace && this.removedStrokes.length > 0) {
      const idsToRemove = new Set(this.removedStrokes.map((s) => s.stroke.id));
      const filtered = list.filter((obj) => !idsToRemove.has(obj.id));
      
      // Insert text object around the index where the first stroke was
      const firstIndex = Math.min(...this.removedStrokes.map((s) => s.index));
      const insertIndex = Math.min(firstIndex, filtered.length);
      filtered.splice(insertIndex, 0, this.textObject);
      
      this.setObjectsRef(filtered);
    } else {
      // Append text object to top of layer stack
      this.setObjectsRef([...list, this.textObject]);
    }

    this.selectObjectRef?.(this.textObject.id);
  }

  public undo(): void {
    const list = [...this.objectsRef()];
    
    // 1. Remove the text object
    const withoutText = list.filter((obj) => obj.id !== this.textObject.id);

    // 2. If strokes were replaced, restore them at their original index locations
    if (this.replace && this.removedStrokes.length > 0) {
      const sorted = [...this.removedStrokes].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        const idx = Math.min(item.index, withoutText.length);
        withoutText.splice(idx, 0, item.stroke);
      }
    }

    this.setObjectsRef(withoutText);
    this.selectObjectRef?.(null);
  }

  public redo(): void {
    this.execute();
  }
}
