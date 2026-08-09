import { PointerState } from './PointerState';
import { CoordinateTransformer } from '../canvas/CoordinateTransformer';
import { Point } from '../types';

export interface GestureEngineOptions {
  transformer: CoordinateTransformer;
  onPanZoom: () => void; // Callback to trigger re-render
}

export class GestureEngine {
  private transformer: CoordinateTransformer;
  private onPanZoom: () => void;

  // Pan/Zoom gesture start state
  private startDistance: number = 0;
  private startZoom: number = 1;
  private startMidpointScreen: Point = { x: 0, y: 0 };

  private startPanX: number = 0;
  private startPanY: number = 0;

  constructor(options: GestureEngineOptions) {
    this.transformer = options.transformer;
    this.onPanZoom = options.onPanZoom;
  }

  public beginPanZoom(p1: PointerState, p2: PointerState): void {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    this.startDistance = Math.sqrt(dx * dx + dy * dy);
    
    this.startMidpointScreen = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    const currentTransform = this.transformer.getTransform();
    this.startZoom = currentTransform.zoom;
    this.startPanX = currentTransform.panX;
    this.startPanY = currentTransform.panY;
  }

  public updatePanZoom(p1: PointerState, p2: PointerState): void {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    
    const currentMidpointScreen = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    // Use CoordinateTransformer's built-in zoomAt functionality
    let newZoom = this.startZoom;
    if (this.startDistance > 10) { 
      const distanceRatio = currentDistance / this.startDistance;
      newZoom = this.startZoom * distanceRatio;
    }

    // Set the state back to gesture start before applying the new relative transform
    this.transformer.setTransform({
      zoom: this.startZoom,
      panX: this.startPanX,
      panY: this.startPanY
    });

    // 1. Pan first to match the new midpoint
    const dxMid = currentMidpointScreen.x - this.startMidpointScreen.x;
    const dyMid = currentMidpointScreen.y - this.startMidpointScreen.y;
    this.transformer.panBy(dxMid, dyMid);

    // 2. Zoom at the new midpoint
    this.transformer.zoomAt(currentMidpointScreen.x, currentMidpointScreen.y, newZoom);

    this.onPanZoom();
  }
}
