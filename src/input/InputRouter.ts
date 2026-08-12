import { PointerState } from './PointerState';
import { GestureState } from './GestureState';
import { GestureEngine } from './GestureEngine';
import { HitTest } from '../engine/HitTest';
import { useWhiteboardStore } from '../store';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';

// Tools whose whole purpose is navigation or transient presentation. Clicking a
// video with one of these should keep doing what the tool does.
const TOOLS_THAT_KEEP_PRIORITY_OVER_VIDEOS = ['select', 'pan', 'laser', 'spotlight'];

export class InputRouter {
  private engine: WhiteboardEngine;
  private gestureEngine: GestureEngine;

  // Overall state of the interaction surface
  private currentState: GestureState = GestureState.IDLE;

  constructor(engine: WhiteboardEngine, gestureEngine: GestureEngine) {
    this.engine = engine;
    this.gestureEngine = gestureEngine;
  }

  public getCurrentState(): GestureState {
    return this.currentState;
  }

  /**
   * Videos are DOM elements sitting *under* the canvas with pointer-events off,
   * so a click on one is delivered to whichever tool is active and would other-
   * wise draw over it. Report whether this pointer landed on a video that the
   * user should be able to grab directly.
   *
   * Only the topmost hit counts, so a stroke drawn on top of a video still
   * belongs to the stroke, and locked videos are skipped so they can be drawn on.
   */
  private isPointerOnGrabbableVideo(pointer: PointerState): boolean {
    const transformer = this.engine.getTransformer();
    const worldPoint = transformer.screenToWorld({ x: pointer.x, y: pointer.y });
    const tolerance = 10 / transformer.getTransform().zoom;
    const hit = HitTest.findObjectAtPoint(worldPoint, this.engine.getObjects(), tolerance);

    return !!hit && hit.type === 'youtubeVideo' && !hit.locked && hit.visible !== false;
  }

  public onPointerAdd(pointer: PointerState, e: PointerEvent, activePointers: PointerState[]): void {
    const activeCount = activePointers.length;
    const currentTool = this.engine.getToolSettings().tool;

    // Fast path: Middle mouse or space+click for pan
    if (e.button === 1 || this.engine.isSpacePressed()) {
      this.currentState = GestureState.CANVAS_PANNING;
      this.engine.getActiveTool()?.onPointerDown(
        this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
        { x: pointer.x, y: pointer.y },
        e,
        this.engine
      );
      return;
    }

    // Clicking a video grabs it whatever tool is in hand, so it can be moved
    // without switching to Select first.
    if (
      activeCount === 1 &&
      !TOOLS_THAT_KEEP_PRIORITY_OVER_VIDEOS.includes(currentTool) &&
      this.isPointerOnGrabbableVideo(pointer)
    ) {
      // Go through the store so the toolbar follows the switch.
      useWhiteboardStore.getState().setTool('select');
      this.currentState = GestureState.DRAWING;
      this.engine.getActiveTool()?.onPointerDown(
        this.engine.getTransformer().screenToWorld({ x: pointer.x, y: pointer.y }),
        { x: pointer.x, y: pointer.y },
        e,
        this.engine
      );
      return;
    }

    const isDrawingTool = ['pen', 'pencil', 'brush', 'crayon', 'highlighter', 'marker', 'eraser', 'fill'].includes(currentTool);

    if (isDrawingTool) {
      // Allow multi-touch independent drawing
      this.currentState = GestureState.DRAWING;
      this.engine.getActiveTool()?.onPointerDown(
        this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
        { x: pointer.x, y: pointer.y },
        e,
        this.engine
      );
    } else {
      if (activeCount === 1) {
        // 1 Finger -> Normal Interaction
        this.currentState = GestureState.DRAWING;
        this.engine.getActiveTool()?.onPointerDown(
          this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
          { x: pointer.x, y: pointer.y },
          e,
          this.engine
        );
      } else if (activeCount === 2) {
        // 2 Fingers -> Pan/Zoom
        if (currentTool === 'spotlight') {
           this.currentState = GestureState.TEACHING_TOOL_INTERACTION;
           this.engine.getActiveTool()?.onPointerDown(
             this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
             { x: pointer.x, y: pointer.y },
             e,
             this.engine
           );
           return;
        }
        
        this.currentState = GestureState.CANVAS_ZOOMING;
        this.engine.getActiveTool()?.onPointerCancel(this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}), { x: pointer.x, y: pointer.y }, e, this.engine);
        
        this.gestureEngine.beginPanZoom(activePointers[0], activePointers[1]);
      }
    }
  }

  public onPointerUpdate(pointer: PointerState, e: PointerEvent, activePointers: PointerState[]): void {
    if (this.currentState === GestureState.CANVAS_ZOOMING && activePointers.length === 2) {
      this.gestureEngine.updatePanZoom(activePointers[0], activePointers[1]);
    } else if (this.currentState === GestureState.DRAWING || this.currentState === GestureState.TEACHING_TOOL_INTERACTION || this.currentState === GestureState.CANVAS_PANNING) {
      this.engine.getActiveTool()?.onPointerMove(
        this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
        {x: pointer.x, y: pointer.y},
        e,
        this.engine
      );
    }
  }

  public onPointerRemove(pointer: PointerState, e: PointerEvent, activePointers: PointerState[]): void {
    if (this.currentState === GestureState.DRAWING || this.currentState === GestureState.TEACHING_TOOL_INTERACTION || this.currentState === GestureState.CANVAS_PANNING) {
      this.engine.getActiveTool()?.onPointerUp(
        this.engine.getTransformer().screenToWorld({x: pointer.x, y: pointer.y}),
        {x: pointer.x, y: pointer.y},
        e,
        this.engine
      );
    }

    const activeCount = activePointers.filter(p => p.isActive).length;

    if (activeCount === 0) {
      this.currentState = GestureState.IDLE;
    } else if (activeCount === 1 && this.currentState === GestureState.CANVAS_ZOOMING) {
      // One finger released during zoom. We don't drop back to drawing immediately to prevent accidental strokes
      this.currentState = GestureState.IDLE; 
    }
  }
}
