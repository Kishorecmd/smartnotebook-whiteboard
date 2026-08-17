import { PointerState, createPointerState } from './PointerState';

export interface PointerManagerOptions {
  element: HTMLElement;
  onPointerAdd: (pointer: PointerState, e: PointerEvent) => void;
  onPointerUpdate: (pointer: PointerState, e: PointerEvent) => void;
  onPointerRemove: (pointer: PointerState, e: PointerEvent) => void;
}

export class PointerManager {
  private element: HTMLElement;
  private activePointers: Map<number, PointerState> = new Map();
  private options: PointerManagerOptions;
  
  // Palm rejection state
  private stylusActive: boolean = false;
  private stylusTimeout: number | null = null;

  constructor(options: PointerManagerOptions) {
    this.options = options;
    this.element = options.element;
    
    // Bind event listeners
    this.element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.element.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.element.addEventListener('pointerup', this.onPointerUp, { passive: false });
    this.element.addEventListener('pointercancel', this.onPointerCancel, { passive: false });
    this.element.addEventListener('pointerleave', this.onPointerLeave, { passive: false });
  }

  public destroy(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerCancel);
    this.element.removeEventListener('pointerleave', this.onPointerLeave);
  }

  public getActivePointers(): PointerState[] {
    return Array.from(this.activePointers.values());
  }

  public getPointer(pointerId: number): PointerState | undefined {
    return this.activePointers.get(pointerId);
  }

  public getActivePointersCount(): number {
    return this.activePointers.size;
  }

  private getScreenCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handlePalmRejection(e: PointerEvent): boolean {
    // Basic palm rejection: if a stylus is being used or was recently used,
    // we ignore non-stylus pointerdown events that look like palms (touch).
    // We can't strictly reject all touch because user might want to pan with fingers while holding stylus.
    // However, for the initial implementation, if stylus is active, we just mark stylusActive.
    
    if (e.pointerType === 'pen') {
      this.stylusActive = true;
      if (this.stylusTimeout !== null) {
        window.clearTimeout(this.stylusTimeout);
        this.stylusTimeout = null;
      }
      return false; // Don't reject the stylus itself
    }

    if (e.pointerType === 'touch' && this.stylusActive) {
      // In a real sophisticated palm rejection, we check e.width/e.height (contact geometry)
      // to see if it's a large palm vs a small finger. 
      // PointerEvent.width/height is not consistently supported, but we try:
      const size = Math.max(e.width || 0, e.height || 0);
      if (size > 40) { // arbitrary threshold for a palm/knuckle
        return true; // Reject large touches when stylus is around
      }
    }

    return false;
  }

  private onPointerDown = (e: PointerEvent): void => {
    // Only prevent default if we want to stop browser pan/zoom
    // We handle this via touch-action CSS, but preventDefault on pointerdown
    // can also stop default behaviors.
    e.preventDefault();

    if (this.handlePalmRejection(e)) {
      return; // Ignored due to palm rejection
    }

    try {
      this.element.setPointerCapture(e.pointerId);
      } catch {
      // Ignore if capture fails (e.g., testing environments)
    }

    const { x, y } = this.getScreenCoords(e);
    const pointer = createPointerState(e, x, y);
    
    this.activePointers.set(e.pointerId, pointer);
    this.options.onPointerAdd(pointer, e);
  };

  private onPointerMove = (e: PointerEvent): void => {
    e.preventDefault();

    const pointer = this.activePointers.get(e.pointerId);
    if (!pointer) return; // Ignore if we didn't capture down (e.g. palm rejected)

    const { x, y } = this.getScreenCoords(e);
    


    // Update state based on the last event (the main one)
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = x;
    pointer.y = y;
    pointer.pressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.5;
    pointer.timestamp = e.timeStamp || Date.now();
    pointer.buttons = e.buttons;

    if (!pointer.hasMovedSignificantly) {
      const dx = pointer.x - pointer.startX;
      const dy = pointer.y - pointer.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        pointer.hasMovedSignificantly = true;
      }
    }

    this.options.onPointerUpdate(pointer, e);
  };

  private removePointer(e: PointerEvent): void {
    const pointer = this.activePointers.get(e.pointerId);
    if (pointer) {
      pointer.isActive = false;
      this.options.onPointerRemove(pointer, e);
      this.activePointers.delete(e.pointerId);
    }

    try {
      this.element.releasePointerCapture(e.pointerId);
      } catch {
      // Ignore
    }

    if (e.pointerType === 'pen' && this.activePointers.size === 0) {
      // Start a timeout to release stylus-only mode
      this.stylusTimeout = window.setTimeout(() => {
        this.stylusActive = false;
        this.stylusTimeout = null;
      }, 500); // Wait 500ms after stylus leaves before fully allowing touch again
    }
  }

  private onPointerUp = (e: PointerEvent): void => {
    e.preventDefault();
    this.removePointer(e);
  };

  private onPointerCancel = (e: PointerEvent): void => {
    e.preventDefault();
    this.removePointer(e);
  };

  private onPointerLeave = (e: PointerEvent): void => {
    e.preventDefault();
    this.removePointer(e);
  };
}
