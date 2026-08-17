import { InputClassifier } from './InputClassifier';
import type { InputSettings } from './InputSettings';
import { PointerTracker } from './PointerTracker';
import type { PointerState } from './PointerState';

export interface PointerManagerOptions {
  element: HTMLElement;
  getSettings: () => InputSettings;
  onPointerAdd: (pointer: PointerState, event: PointerEvent) => void;
  onPointerUpdate: (pointer: PointerState, event: PointerEvent) => void;
  onPointerRemove: (pointer: PointerState, event: PointerEvent) => void;
}

/** Owns the single Pointer Events stream and the authoritative active-pointer map. */
export class PointerManager {
  private readonly element: HTMLElement;
  private readonly tracker = new PointerTracker();
  private readonly classifier = new InputClassifier();

  constructor(private readonly options: PointerManagerOptions) {
    this.element = options.element;
    this.element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.element.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.element.addEventListener('pointerup', this.onPointerUp, { passive: false });
    this.element.addEventListener('pointercancel', this.onPointerCancel, { passive: false });
    this.element.addEventListener('lostpointercapture', this.onLostPointerCapture, { passive: false });
  }

  public destroy(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerCancel);
    this.element.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.tracker.clear();
  }

  public getActivePointers(): PointerState[] { return this.tracker.all(); }
  public getPointer(pointerId: number): PointerState | undefined { return this.tracker.get(pointerId); }
  public getActivePointersCount(): number { return this.tracker.all().length; }

  private getScreenCoords(event: PointerEvent): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private classify(pointer: PointerState): void {
    pointer.classification = this.classifier.classify(pointer, this.options.getSettings(), this.tracker.all());
  }

  private onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    try { this.element.setPointerCapture(event.pointerId); } catch { /* unsupported in tests/older boards */ }
    const point = this.getScreenCoords(event);
    const pointer = this.tracker.add(event, point.x, point.y);
    this.classify(pointer);
    this.options.onPointerAdd(pointer, event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    event.preventDefault();
    const point = this.getScreenCoords(event);
    const pointer = this.tracker.update(event, point.x, point.y);
    if (!pointer) return;
    this.classify(pointer);
    this.options.onPointerUpdate(pointer, event);
  };

  private remove(event: PointerEvent): void {
    const pointer = this.tracker.remove(event.pointerId);
    if (!pointer) return;
    this.options.onPointerRemove(pointer, event);
    try { this.element.releasePointerCapture(event.pointerId); } catch { /* no capture */ }
  }

  private onPointerUp = (event: PointerEvent): void => { event.preventDefault(); this.remove(event); };
  private onPointerCancel = (event: PointerEvent): void => { event.preventDefault(); this.remove(event); };
  private onLostPointerCapture = (event: PointerEvent): void => {
    if (this.tracker.get(event.pointerId)) this.remove(event);
  };
}
