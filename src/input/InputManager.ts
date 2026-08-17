import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { GestureEngine } from './GestureEngine';
import { InputRouter } from './InputRouter';
import { loadInputSettings, type InputSettings } from './InputSettings';
import { PointerManager } from './PointerManager';
import { TouchActionManager } from './TouchActionManager';

/** Public facade for pointer tracking, classification, routing, gestures, and device-local settings. */
export class InputManager {
  private settings = loadInputSettings();
  private readonly touchAction: TouchActionManager;
  private readonly gestureEngine: GestureEngine;
  private readonly router: InputRouter;
  private readonly pointerManager: PointerManager;

  constructor(element: HTMLElement, engine: WhiteboardEngine, onViewportChange: () => void) {
    this.touchAction = new TouchActionManager(element, 'none');
    this.gestureEngine = new GestureEngine({
      transformer: engine.getTransformer(),
      getSettings: () => this.settings,
      onPanZoom: onViewportChange,
    });
    this.router = new InputRouter(engine, this.gestureEngine, () => this.settings);
    this.pointerManager = new PointerManager({
      element,
      getSettings: () => this.settings,
      onPointerAdd: (pointer, event) => this.router.onPointerAdd(pointer, event, this.pointerManager.getActivePointers()),
      onPointerUpdate: (pointer, event) => this.router.onPointerUpdate(pointer, event, this.pointerManager.getActivePointers()),
      onPointerRemove: (pointer, event) => this.router.onPointerRemove(pointer, event, this.pointerManager.getActivePointers()),
    });
    window.addEventListener('jhw-input-settings-change', this.onSettingsChange as EventListener);
  }

  public getPointerManager(): PointerManager { return this.pointerManager; }
  public getRouter(): InputRouter { return this.router; }
  public getSettings(): InputSettings { return { ...this.settings }; }

  public destroy(): void {
    window.removeEventListener('jhw-input-settings-change', this.onSettingsChange as EventListener);
    this.router.destroy();
    this.pointerManager.destroy();
    this.touchAction.reset();
  }

  private onSettingsChange = (event: CustomEvent<InputSettings>): void => {
    this.settings = { ...event.detail };
  };
}
