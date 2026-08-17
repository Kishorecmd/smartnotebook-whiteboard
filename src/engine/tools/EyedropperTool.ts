import { ITool } from './ITool';
import { Point } from '../../types';
import { HitTest } from '../HitTest';
import { useWhiteboardStore } from '../../store';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class EyedropperTool implements ITool {
  public readonly name: string = 'eyedropper';

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const zoom = engine.getTransformer().getTransform().zoom;
    const tolerance = 10 / zoom; // Adjust tolerance based on zoom

    const objects = engine.getObjects();
    const hitObject = HitTest.findObjectAtPoint(worldPoint, objects, tolerance);

    if (hitObject) {
      let sampledColor: string | null = null;
      
      switch (hitObject.type) {
        case 'stroke':
          sampledColor = hitObject.color;
          break;
        case 'shape':
          sampledColor = hitObject.fillColor !== 'transparent' ? hitObject.fillColor : hitObject.strokeColor;
          break;
        case 'text':
          sampledColor = hitObject.color;
          break;
        case 'coloringRegion':
          sampledColor = hitObject.fillColor;
          break;
      }

      sampledColor ??= engine.getRenderer().sampleColorAt(worldPoint);

      if (sampledColor) {
        // Go through the store so the toolbar reflects the picked colour and the
        // tool switch; the store forwards both to the engine.
        const { updateToolSettings, setTool } = useWhiteboardStore.getState();
        updateToolSettings({ color: sampledColor });

        // Fallback tool
        setTool('pen');
      }
    } else {
      const sampledColor = engine.getRenderer().sampleColorAt(worldPoint);
      if (sampledColor) {
        const { updateToolSettings, setTool } = useWhiteboardStore.getState();
        updateToolSettings({ color: sampledColor });
        setTool('pen');
      }
    }
  }

  public onPointerMove(): void {}
  public onPointerUp(): void {}
  public onPointerCancel(): void {}
  public onDeactivate(): void {}
}
