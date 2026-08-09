export class TouchActionManager {
  private element: HTMLElement;
  private defaultAction: 'none' | 'auto' | 'pan-x' | 'pan-y' | 'manipulation';

  constructor(element: HTMLElement, defaultAction: 'none' | 'auto' | 'pan-x' | 'pan-y' | 'manipulation' = 'none') {
    this.element = element;
    this.defaultAction = defaultAction;
    this.setTouchAction(this.defaultAction);
  }

  public setTouchAction(action: 'none' | 'auto' | 'pan-x' | 'pan-y' | 'manipulation'): void {
    if (this.element.style.touchAction !== action) {
      this.element.style.touchAction = action;
    }
  }

  public reset(): void {
    this.setTouchAction(this.defaultAction);
  }
}
