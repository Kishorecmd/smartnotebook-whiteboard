import { ITool } from './ITool';
import { WhiteboardEngine } from '../WhiteboardEngine';
import { Point, FreehandStroke } from '../../types';
import { generateId } from '../../utils';
import { useWhiteboardStore } from '../../store';

export class LaserTool implements ITool {
  public readonly name: string = 'LaserTool';
  private isDrawing: boolean = false;
  private currentStroke: FreehandStroke | null = null;
  private currentPoints: Point[] = [];
  
  // Throttle events for performance
  private lastPointTime: number = 0;
  private readonly THROTTLE_MS = 16; 

  public onPointerDown(worldPoint: Point, _screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isDrawing = true;
    const settings = useWhiteboardStore.getState().toolSettings;
    this.currentPoints = [worldPoint];
    this.lastPointTime = Date.now();

    this.currentStroke = {
      id: generateId('laser'),
      type: 'stroke',
      tool: 'pen',
      points: this.currentPoints,
      color: '#ff0000', // Bright red laser
      opacity: 0.8,
      x: 0,
      y: 0,
      width: Math.max(8, settings.penWidth * 2),
      height: 0,
      rotation: 0,
      zIndex: 9999,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      smooth: true,
    };

    engine.addTransientStroke(this.currentStroke);
  }

  public onPointerCancel(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void {
    this.onPointerUp(worldPoint, screenPoint, e, engine);
  }

  public onPointerMove(worldPoint: Point, _screenPoint: Point, _e: PointerEvent, engine: WhiteboardEngine): void {
    if (!this.isDrawing || !this.currentStroke) return;

    const now = Date.now();
    if (now - this.lastPointTime >= this.THROTTLE_MS) {
      this.currentPoints.push(worldPoint);
      this.lastPointTime = now;
      engine.render(); 
    }
  }

  public onPointerUp(_worldPoint: Point, _screenPoint: Point, _e: PointerEvent, engine: WhiteboardEngine): void {
    if (!this.isDrawing || !this.currentStroke) return;

    this.isDrawing = false;
    this.currentStroke = null;
    this.currentPoints = [];
    
    engine.render();
  }
}
