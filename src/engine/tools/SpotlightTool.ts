import { ITool } from './ITool';
import { WhiteboardEngine } from '../WhiteboardEngine';
import { Point } from '../../types';
import { distance } from '../../utils';

export class SpotlightTool implements ITool {
  public readonly name: string = 'SpotlightTool';
  private isActive: boolean = false;

  // Pinch to zoom state
  private initialPinchDist: number = 0;
  private initialRadius: number = 150;

  public onPointerDown(worldPoint: Point, _screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    const activePointers = engine.getPointerManager().getActivePointers();
    
    // Reset on new touch to handle multi-touch gracefully
    if (activePointers.length === 2) {
      this.initialPinchDist = distance(
        { x: activePointers[0].x, y: activePointers[0].y },
        { x: activePointers[1].x, y: activePointers[1].y }
      );
      this.initialRadius = engine.getSpotlightRadius();
      return;
    }
    
    this.isActive = true;
    engine.setSpotlight(worldPoint);
  }

  public onPointerCancel(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void {
    this.onPointerUp(worldPoint, screenPoint, e, engine);
  }

  public onPointerMove(worldPoint: Point, _screenPoint: Point, _e: PointerEvent, engine: WhiteboardEngine): void {
    const activePointers = engine.getPointerManager().getActivePointers();
    
    if (activePointers.length === 2) {
      const p1 = { x: activePointers[0].x, y: activePointers[0].y };
      const p2 = { x: activePointers[1].x, y: activePointers[1].y };
      const currentDist = distance(p1, p2);
      const ratio = currentDist / this.initialPinchDist;
      
      const newRadius = Math.max(50, Math.min(1000, this.initialRadius * ratio));
      engine.setSpotlight(engine.getTransformer().screenToWorld({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      }), newRadius);
      return;
    }

    if (!this.isActive) return;
    engine.setSpotlight(worldPoint);
  }

  public onPointerUp(_worldPoint: Point, _screenPoint: Point, _e: PointerEvent, engine: WhiteboardEngine): void {
    const activePointers = engine.getPointerManager().getActivePointers();
    if (activePointers.length > 0) return;
    this.isActive = false;
    engine.setSpotlight(null);
  }
}
