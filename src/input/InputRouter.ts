import type { ITool } from '../engine/tools/ITool';
import { HitTest } from '../engine/HitTest';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { isGrabbableMedia } from '../media/MediaObject';
import { useWhiteboardStore } from '../store';
import { GestureEngine } from './GestureEngine';
import { GestureState } from './GestureState';
import { GestureStateMachine } from './GestureStateMachine';
import type { InputSettings } from './InputSettings';
import type { PointerAction, PointerState } from './PointerState';
import { StylusManager } from './StylusManager';
import { TouchManager } from './TouchManager';

interface PointerRoute { action: PointerAction; tool?: ITool; started: boolean; }
interface MultiFingerGesture {
  maxCount: number;
  startTime: number;
  startCenter: { x: number; y: number };
  lastCenter: { x: number; y: number };
  maxMovement: number;
}

export class InputRouter {
  private readonly stateMachine = new GestureStateMachine();
  private readonly routes = new Map<number, PointerRoute>();
  private readonly longPressTimers = new Map<number, number>();
  private readonly stylusManager = new StylusManager();
  private readonly touchManager = new TouchManager();
  private multiFingerGesture: MultiFingerGesture | null = null;
  private lastTwoFingerTap = 0;

  constructor(
    private readonly engine: WhiteboardEngine,
    private readonly gestureEngine: GestureEngine,
    private readonly getSettings: () => InputSettings,
  ) {}

  public getCurrentState(): GestureState { return this.stateMachine.getState(); }
  public getPointerAction(pointerId: number): PointerAction | undefined { return this.routes.get(pointerId)?.action; }

  /** Deterministically maps a physical input sample without changing the global toolbar tool. */
  public route(pointer: PointerState, event: PointerEvent): PointerRoute {
    if (pointer.classification === 'STYLUS') {
      const route = this.stylusManager.route(pointer, event, this.engine, this.getSettings());
      return { ...route, started: false };
    }
    if (pointer.classification === 'PALM_ERASER') {
      return { action: 'ERASE', tool: this.engine.getPalmEraserTool(), started: false };
    }
    if (pointer.classification === 'FINGER') {
      return { action: 'SELECT', tool: this.engine.getTool('select'), started: false };
    }
    if (pointer.classification === 'MOUSE') {
      const transformer = this.engine.getTransformer();
      const hit = HitTest.findObjectAtPoint(
        transformer.screenToWorld(pointer),
        this.engine.getObjects(),
        10 / transformer.getZoom(),
      );
      const tool = (event.button === 1 || this.engine.isSpacePressed())
        ? this.engine.getTool('pan')
        : hit && isGrabbableMedia(hit) && !hit.locked
          ? this.engine.getTool('select')
        : this.engine.getActiveTool();
      return { action: 'MOUSE_TOOL', tool, started: false };
    }
    return { action: 'IGNORE', started: false };
  }

  public onPointerAdd(pointer: PointerState, event: PointerEvent, activePointers: PointerState[]): void {
    const route = this.route(pointer, event);
    pointer.action = route.action;
    this.routes.set(pointer.pointerId, route);

    if (pointer.pointerType === 'touch') {
      this.handleTouchAdd(pointer, event, activePointers);
      return;
    }

    this.startRoute(pointer, event, route);
    this.stateMachine.transition(pointer.pointerType === 'pen'
      ? route.action === 'ERASE' ? GestureState.PALM_ERASING : GestureState.STYLUS_DRAWING
      : GestureState.MOUSE_INTERACTION);
  }

  public onPointerUpdate(pointer: PointerState, event: PointerEvent, activePointers: PointerState[]): void {
    let route = this.routes.get(pointer.pointerId);
    if (!route) return;

    if (pointer.pointerType === 'touch') {
      if (pointer.classification === 'PALM_ERASER' && route.action !== 'ERASE') {
        this.cancelLongPress(pointer.pointerId);
        if (route.started) this.cancelRoute(pointer, event, route);
        route = { action: 'ERASE', tool: this.engine.getPalmEraserTool(), started: false };
        pointer.action = 'ERASE';
        this.routes.set(pointer.pointerId, route);
        this.startRoute(pointer, event, route);
        this.stateMachine.transition(GestureState.PALM_ERASING);
        return;
      }
      if (pointer.classification === 'ACCIDENTAL_PALM' || pointer.classification === 'PALM_CANDIDATE') {
        this.cancelLongPress(pointer.pointerId);
        if (route.started) this.cancelRoute(pointer, event, route);
        route.action = 'IGNORE';
        pointer.action = 'IGNORE';
        return;
      }
    }

    const fingers = this.fingers(activePointers);
    this.updateMultiFingerGesture(fingers);
    if (route.action === 'OBJECT_TRANSFORM' && fingers.length === 2) {
      this.gestureEngine.updateObjectTransform(fingers[0], fingers[1], this.engine);
      return;
    }
    if (route.action === 'PAN_ZOOM' && fingers.length === 2) {
      this.gestureEngine.updatePanZoom(fingers[0], fingers[1]);
      return;
    }

    if (route.started && route.tool) {
      this.invoke(route.tool, 'move', pointer, event);
      if (pointer.hasMovedSignificantly) this.cancelLongPress(pointer.pointerId);
    }
  }

  public onPointerRemove(pointer: PointerState, event: PointerEvent, activePointers: PointerState[]): void {
    this.cancelLongPress(pointer.pointerId);
    const route = this.routes.get(pointer.pointerId);
    this.routes.delete(pointer.pointerId);
    if (!route) return;

    if (route.action === 'OBJECT_TRANSFORM') {
      this.gestureEngine.finishObjectTransform(this.engine);
      this.clearGestureRoutes('OBJECT_TRANSFORM');
    } else if (route.action === 'PAN_ZOOM') {
      this.clearGestureRoutes('PAN_ZOOM');
    } else if (route.started && route.tool) {
      this.invoke(route.tool, 'up', pointer, event);
    }

    const active = activePointers.filter((item) => item.isActive);
    if (pointer.pointerType === 'touch' && active.filter((item) => item.pointerType === 'touch').length === 0) {
      this.finishMultiFingerGesture();
    }
    if (active.length === 0) this.stateMachine.reset();
  }

  public destroy(): void {
    this.longPressTimers.forEach((timer) => window.clearTimeout(timer));
    this.longPressTimers.clear();
    this.routes.clear();
    this.gestureEngine.cancelObjectTransform();
    this.stateMachine.reset();
  }

  private handleTouchAdd(pointer: PointerState, event: PointerEvent, activePointers: PointerState[]): void {
    const route = this.routes.get(pointer.pointerId)!;
    if (route.action === 'IGNORE') return;
    const fingers = this.fingers(activePointers);
    this.beginOrGrowMultiFingerGesture(fingers);

    if (fingers.length === 1) {
      this.startRoute(pointer, event, route);
      this.stateMachine.transition(GestureState.FINGER_SELECTING);
      if (this.touchManager.hitObject(pointer, this.engine)) this.scheduleLongPress(pointer, event);
      return;
    }

    if (fingers.length === 2) {
      this.cancelAllLongPress();
      // The first finger may have selected an object. End its one-finger route before promoting both pointers.
      for (const finger of fingers) {
        const existing = this.routes.get(finger.pointerId);
        if (existing?.started && existing.tool) {
          if (finger.hasMovedSignificantly) {
            this.invoke(existing.tool, 'up', finger, event);
            existing.started = false;
          } else {
            this.cancelRoute(finger, event, existing);
          }
        }
      }
      const action: PointerAction = this.touchManager.bothOnSelectedObject(fingers, this.engine)
        ? 'OBJECT_TRANSFORM'
        : 'PAN_ZOOM';
      for (const finger of fingers) {
        finger.action = action;
        this.routes.set(finger.pointerId, { action, started: true });
      }
      if (action === 'OBJECT_TRANSFORM' && this.gestureEngine.beginObjectTransform(fingers[0], fingers[1], this.engine)) {
        this.stateMachine.transition(GestureState.OBJECT_TRANSFORMING);
      } else {
        this.gestureEngine.beginPanZoom(fingers[0], fingers[1]);
        this.stateMachine.transition(GestureState.CANVAS_PINCH_ZOOMING);
      }
      return;
    }

    // Three/four-finger shortcuts own the contact sequence; no object/canvas manipulation continues.
    if (fingers.length >= 3) {
      this.cancelAllLongPress();
      this.gestureEngine.cancelObjectTransform();
      for (const finger of fingers) {
        finger.action = 'IGNORE';
        this.routes.set(finger.pointerId, { action: 'IGNORE', started: false });
      }
      this.stateMachine.transition(GestureState.IDLE);
    }
  }

  private startRoute(pointer: PointerState, event: PointerEvent, route: PointerRoute): void {
    if (!route.tool || route.started || route.action === 'IGNORE') return;
    route.started = true;
    this.invoke(route.tool, 'down', pointer, event);
  }

  private cancelRoute(pointer: PointerState, event: PointerEvent, route: PointerRoute): void {
    if (!route.tool || !route.started) return;
    this.invoke(route.tool, 'cancel', pointer, event);
    route.started = false;
  }

  private invoke(tool: ITool, phase: 'down' | 'move' | 'up' | 'cancel', pointer: PointerState, event: PointerEvent): void {
    const screen = { x: pointer.x, y: pointer.y };
    const world = this.engine.getTransformer().screenToWorld(screen);
    if (phase === 'down') tool.onPointerDown(world, screen, event, this.engine);
    else if (phase === 'move') tool.onPointerMove(world, screen, event, this.engine);
    else if (phase === 'up') tool.onPointerUp(world, screen, event, this.engine);
    else tool.onPointerCancel(world, screen, event, this.engine);
  }

  private fingers(pointers: PointerState[]): PointerState[] {
    return pointers.filter((pointer) => pointer.isActive && pointer.pointerType === 'touch' && pointer.classification === 'FINGER');
  }

  private scheduleLongPress(pointer: PointerState, event: PointerEvent): void {
    const timer = window.setTimeout(() => {
      const route = this.routes.get(pointer.pointerId);
      if (!route || pointer.hasMovedSignificantly || route.action !== 'SELECT') return;
      pointer.action = 'CONTEXT_MENU';
      this.stateMachine.transition(GestureState.CONTEXT_PENDING);
      const target = (event.target as HTMLElement | null) || this.engine.getCanvas();
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
      }));
    }, this.getSettings().longPressMs);
    this.longPressTimers.set(pointer.pointerId, timer);
  }

  private cancelLongPress(pointerId: number): void {
    const timer = this.longPressTimers.get(pointerId);
    if (timer !== undefined) window.clearTimeout(timer);
    this.longPressTimers.delete(pointerId);
  }
  private cancelAllLongPress(): void {
    Array.from(this.longPressTimers.keys()).forEach((id) => this.cancelLongPress(id));
  }
  private clearGestureRoutes(action: PointerAction): void {
    this.routes.forEach((route, id) => {
      if (route.action === action) this.routes.set(id, { action: 'IGNORE', started: false });
    });
  }

  private center(pointers: PointerState[]): { x: number; y: number } {
    const count = Math.max(1, pointers.length);
    return pointers.reduce((sum, pointer) => ({ x: sum.x + pointer.x / count, y: sum.y + pointer.y / count }), { x: 0, y: 0 });
  }

  private beginOrGrowMultiFingerGesture(fingers: PointerState[]): void {
    if (fingers.length < 2) return;
    const center = this.center(fingers);
    if (!this.multiFingerGesture) {
      this.multiFingerGesture = { maxCount: fingers.length, startTime: Date.now(), startCenter: center, lastCenter: center, maxMovement: 0 };
    } else {
      this.multiFingerGesture.maxCount = Math.max(this.multiFingerGesture.maxCount, fingers.length);
      this.multiFingerGesture.lastCenter = center;
    }
  }

  private updateMultiFingerGesture(fingers: PointerState[]): void {
    if (!this.multiFingerGesture || fingers.length < 2) return;
    const center = this.center(fingers);
    this.multiFingerGesture.lastCenter = center;
    this.multiFingerGesture.maxMovement = Math.max(
      this.multiFingerGesture.maxMovement,
      Math.hypot(center.x - this.multiFingerGesture.startCenter.x, center.y - this.multiFingerGesture.startCenter.y),
      ...fingers.map((pointer) => Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY)),
    );
  }

  private finishMultiFingerGesture(): void {
    const gesture = this.multiFingerGesture;
    this.multiFingerGesture = null;
    if (!gesture || !this.getSettings().advancedGestures) return;
    const duration = Date.now() - gesture.startTime;
    const dx = gesture.lastCenter.x - gesture.startCenter.x;
    const dy = gesture.lastCenter.y - gesture.startCenter.y;
    const settings = this.getSettings();

    if (gesture.maxCount === 3 && settings.threeFingerSwipe && Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) this.engine.undo(); else this.engine.redo();
      return;
    }
    if (gesture.maxCount === 4 && settings.fourFingerFocus && duration < 500 && gesture.maxMovement < settings.touchSlop * 2) {
      const store = useWhiteboardStore.getState();
      store.setPresenterMode(!store.isPresenterMode);
      return;
    }
    if (gesture.maxCount === 2 && duration < 280 && gesture.maxMovement < settings.touchSlop * 1.5) {
      const now = Date.now();
      if (settings.twoFingerDoubleTapFit && now - this.lastTwoFingerTap < 420) this.engine.zoomToFit();
      else this.engine.clearSelection();
      this.lastTwoFingerTap = now;
    }
  }
}
