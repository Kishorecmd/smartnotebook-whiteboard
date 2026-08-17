import { createPointerState, type PointerState } from './PointerState';

export class PointerTracker {
  private readonly pointers = new Map<number, PointerState>();

  public add(event: PointerEvent, x: number, y: number): PointerState {
    const pointer = createPointerState(event, x, y);
    this.pointers.set(pointer.pointerId, pointer);
    return pointer;
  }

  public update(event: PointerEvent, x: number, y: number): PointerState | undefined {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return undefined;
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = x;
    pointer.y = y;
    pointer.pressure = event.pressure > 0 ? event.pressure : pointer.pointerType === 'pen' ? 0.5 : pointer.pressure;
    pointer.width = event.width || pointer.width;
    pointer.height = event.height || pointer.height;
    pointer.tiltX = event.tiltX || 0;
    pointer.tiltY = event.tiltY || 0;
    pointer.twist = event.twist || 0;
    pointer.buttons = event.buttons;
    pointer.timestamp = event.timeStamp || Date.now();
    pointer.hasMovedSignificantly ||= Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 5;
    return pointer;
  }

  public remove(pointerId: number): PointerState | undefined {
    const pointer = this.pointers.get(pointerId);
    if (!pointer) return undefined;
    pointer.isActive = false;
    this.pointers.delete(pointerId);
    return pointer;
  }

  public get(pointerId: number): PointerState | undefined { return this.pointers.get(pointerId); }
  public all(): PointerState[] { return Array.from(this.pointers.values()); }
  public clear(): void { this.pointers.clear(); }
}
