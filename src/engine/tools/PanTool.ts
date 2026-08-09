import { ITool } from './ITool';
import { Point } from '../../types';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class PanTool implements ITool {
  public readonly name: string = 'pan';
  private isPanning: boolean = false;
  private lastScreenX: number = 0;
  private lastScreenY: number = 0;

  public onPointerDown(
    _worldPoint: Point,
    screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.isPanning = true;
    this.lastScreenX = screenPoint.x;
    this.lastScreenY = screenPoint.y;
  }

  public onPointerMove(
    _worldPoint: Point,
    screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (!this.isPanning) return;

    const dx = screenPoint.x - this.lastScreenX;
    const dy = screenPoint.y - this.lastScreenY;

    this.lastScreenX = screenPoint.x;
    this.lastScreenY = screenPoint.y;

    engine.panBy(dx, dy);
  }

  public onPointerUp(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.isPanning = false;
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.isPanning = false;
  }

  public onDeactivate(_engine: WhiteboardEngine): void {
    this.isPanning = false;
  }
}
