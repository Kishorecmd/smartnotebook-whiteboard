import type { ICommand, WhiteboardObject } from '../../types';
import { generateId } from '../../utils';

/** Replays only the objects touched by a palm so concurrent stylus strokes remain intact on undo. */
export class PalmEraseCommand implements ICommand {
  public readonly id = generateId('cmd');
  public readonly name = 'Palm Erase';
  private readonly before = new Map<string, WhiteboardObject>();
  private readonly after = new Map<string, WhiteboardObject>();

  constructor(
    before: WhiteboardObject[],
    after: WhiteboardObject[],
    private readonly getObjects: () => WhiteboardObject[],
    private readonly setObjects: (objects: WhiteboardObject[]) => void,
  ) {
    before.forEach((object) => this.before.set(object.id, structuredClone(object)));
    after.forEach((object) => this.after.set(object.id, structuredClone(object)));
  }

  public execute(): void { this.apply(this.after, this.before); }
  public undo(): void { this.apply(this.before, this.after); }
  public redo(): void { this.execute(); }

  private apply(insert: Map<string, WhiteboardObject>, remove: Map<string, WhiteboardObject>): void {
    const affected = new Set([...insert.keys(), ...remove.keys()]);
    const untouched = this.getObjects().filter((object) => !affected.has(object.id));
    this.setObjects([...untouched, ...Array.from(insert.values())].sort((a, b) => a.zIndex - b.zIndex));
  }
}
