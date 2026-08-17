import { HitTest } from '../engine/HitTest';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import type { PointerState } from './PointerState';

export class TouchManager {
  public hitObject(pointer: PointerState, engine: WhiteboardEngine) {
    const transformer = engine.getTransformer();
    const world = transformer.screenToWorld(pointer);
    // A finger receives a much larger target than mouse/stylus geometry.
    return HitTest.findObjectAtPoint(world, engine.getObjects(), 22 / transformer.getZoom());
  }

  public bothOnSelectedObject(pointers: PointerState[], engine: WhiteboardEngine): boolean {
    if (pointers.length !== 2 || engine.getSelectedIds().length === 0) return false;
    return pointers.every((pointer) => {
      const hit = this.hitObject(pointer, engine);
      return !!hit && engine.isSelected(hit.id);
    });
  }
}
