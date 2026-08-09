import { ITool } from './ITool';
import { Point } from '../../types';
import { distance } from '../../utils';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class TextTool implements ITool {
  public readonly name: string = 'text';
  private startPoint: Point | null = null;

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.startPoint = worldPoint;
  }

  public onPointerMove(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    // No drag action for text placement
  }

  public onPointerUp(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (!this.startPoint) return;

    const dist = distance(this.startPoint, worldPoint);

    // If click or tap within small threshold, trigger in-place text creation
    if (dist < 10) {
      const settings = engine.getToolSettings();
      engine.startTextEditing({
        worldPoint: this.startPoint,
        fontSize: settings.textFontSize || 28,
        fontFamily: settings.textFontFamily || 'Inter, sans-serif',
        fontWeight: settings.textFontWeight || 'normal',
        fontStyle: settings.textFontStyle || 'normal',
        underline: settings.textUnderline || false,
        textAlign: settings.textAlign || 'left',
        color: settings.textColor || settings.color || '#1e293b',
      });
    }

    this.startPoint = null;
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    _engine: WhiteboardEngine
  ): void {
    this.startPoint = null;
  }
}
