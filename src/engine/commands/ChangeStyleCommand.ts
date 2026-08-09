import { ICommand, WhiteboardObject, ShapeObject, TextObject, StrokeStyle, TextAlign } from '../../types';
import { generateId } from '../../utils';

export interface StylePatch {
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  opacity?: number;
  // Text styling properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: TextAlign;
  color?: string;
  backgroundColor?: string;
}

export class ChangeStyleCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'Change Style';
  private beforeStates: Map<string, WhiteboardObject>;
  private patch: StylePatch;
  private targetIds: Set<string>;
  private objectsRef: () => WhiteboardObject[];
  private setObjectsRef: (objects: WhiteboardObject[]) => void;

  constructor(
    targetObjects: WhiteboardObject[],
    patch: StylePatch,
    objectsRef: () => WhiteboardObject[],
    setObjectsRef: (objects: WhiteboardObject[]) => void
  ) {
    this.id = generateId('cmd');
    this.patch = patch;
    this.targetIds = new Set(targetObjects.map((o) => o.id));
    this.beforeStates = new Map(targetObjects.map((o) => [o.id, JSON.parse(JSON.stringify(o))]));
    this.objectsRef = objectsRef;
    this.setObjectsRef = setObjectsRef;
  }

  public execute(): void {
    const list = this.objectsRef();
    const updated = list.map((obj) => {
      if (!this.targetIds.has(obj.id)) return obj;

      const now = Date.now();
      if (obj.type === 'shape') {
        const shape = obj as ShapeObject;
        return {
          ...shape,
          strokeColor: this.patch.strokeColor ?? shape.strokeColor,
          fillColor: this.patch.fillColor ?? shape.fillColor,
          strokeWidth: this.patch.strokeWidth ?? shape.strokeWidth,
          strokeStyle: this.patch.strokeStyle ?? shape.strokeStyle,
          opacity: this.patch.opacity ?? shape.opacity,
          updatedAt: now,
        };
      } else if (obj.type === 'stroke') {
        return {
          ...obj,
          color: this.patch.strokeColor ?? obj.color,
          width: this.patch.strokeWidth ?? obj.width,
          opacity: this.patch.opacity ?? obj.opacity,
          updatedAt: now,
        };
      } else if (obj.type === 'text') {
        const textObj = obj as TextObject;
        return {
          ...textObj,
          fontSize: this.patch.fontSize ?? textObj.fontSize,
          fontFamily: this.patch.fontFamily ?? textObj.fontFamily,
          fontWeight: this.patch.fontWeight ?? textObj.fontWeight,
          fontStyle: this.patch.fontStyle ?? textObj.fontStyle,
          underline: this.patch.underline !== undefined ? this.patch.underline : textObj.underline,
          textAlign: this.patch.textAlign ?? textObj.textAlign,
          color: this.patch.color ?? this.patch.strokeColor ?? textObj.color,
          backgroundColor: this.patch.backgroundColor ?? textObj.backgroundColor,
          updatedAt: now,
        };
      }
      return obj;
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
