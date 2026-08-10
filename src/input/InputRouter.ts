import { PointerState } from './PointerState';
import { GestureState } from './GestureState';
import { GestureEngine } from './GestureEngine';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';

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
