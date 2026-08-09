import { Point } from '../../types';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export interface ITool {
  readonly name: string;
  onPointerDown(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void;
  onPointerMove(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void;
  onPointerUp(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void;
  onPointerCancel(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void;
  onPointerHover?(worldPoint: Point, screenPoint: Point, e: PointerEvent, engine: WhiteboardEngine): void;
  onDeactivate?(engine: WhiteboardEngine): void;
}
