import { ITool } from './ITool';
import { Point } from '../../types';
import { HitTest } from '../HitTest';
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
        // Images are complex to sample from the vector layer without a hit-test canvas
        // so we skip them for now in this version.
      }

      if (sampledColor) {
        engine.updateToolSettings({ color: sampledColor });
        
        // Fallback tool
        engine.updateToolSettings({ tool: 'pen' });
      }
    }
  }

  public onPointerMove(): void {}
  public onPointerUp(): void {}
  public onPointerCancel(): void {}
  public onDeactivate(): void {}
}
