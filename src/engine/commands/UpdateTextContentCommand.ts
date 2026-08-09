import { ICommand, WhiteboardObject, TextObject } from '../../types';
import { generateId } from '../../utils';

export interface TextContentUpdate {
  text: string;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
}

export class UpdateTextContentCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Update Text';
  private targetId: string;
  private prevTextObj: TextObject;
  private newParams: TextContentUpdate;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    targetObj: TextObject,
    newParams: TextContentUpdate,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.targetId = targetObj.id;
    this.prevTextObj = JSON.parse(JSON.stringify(targetObj));
    this.newParams = newParams;
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    const list = this.objectsRef();
    const updated = list.map((obj) => {
      if (obj.id !== this.targetId || obj.type !== 'text') return obj;

      const current = obj as TextObject;
      const now = Date.now();

      return {
        ...current,
        text: this.newParams.text,
        width: this.newParams.width,
        height: this.newParams.height,
        fontSize: this.newParams.fontSize ?? current.fontSize,
        fontFamily: this.newParams.fontFamily ?? current.fontFamily,
        fontWeight: this.newParams.fontWeight ?? current.fontWeight,
        fontStyle: this.newParams.fontStyle ?? current.fontStyle,
        underline: this.newParams.underline !== undefined ? this.newParams.underline : current.underline,
        textAlign: this.newParams.textAlign ?? current.textAlign,
        color: this.newParams.color ?? current.color,
        backgroundColor: this.newParams.backgroundColor ?? current.backgroundColor,
        updatedAt: now,
      } as TextObject;
    });

    this.setObjectsRef(updated);
  }

  public undo(): void {
    const list = this.objectsRef();
    const updated = list.map((obj) => {
      if (obj.id === this.targetId) {
        return { ...this.prevTextObj };
      }
      return obj;
    });
    this.setObjectsRef(updated);
  }

  public redo(): void {
    this.execute();
  }
}
