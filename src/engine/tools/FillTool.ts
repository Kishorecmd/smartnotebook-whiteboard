import { ITool } from './ITool';
import { Point } from '../../types';
import { HitTest } from '../HitTest';
import { ChangeStyleCommand } from '../commands/ChangeStyleCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class FillTool implements ITool {
  public readonly name: string = 'fill';

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const zoom = engine.getTransformer().getTransform().zoom;
    const tolerance = 10 / zoom; 
    const objects = engine.getObjects();
    const hitObject = HitTest.findObjectAtPoint(worldPoint, objects, tolerance);
    const settings = engine.getToolSettings();

    if (hitObject && hitObject.type === 'shape' && !hitObject.locked) {
      // 1. Vector-aware Fill
      const cmd = new ChangeStyleCommand(
        [hitObject],
        { fillColor: settings.color, opacity: settings.opacity },
        () => engine.getObjects(),
        (newObjects) => engine.setObjects(newObjects)
      );
      engine.getCommandManager().execute(cmd);
      return;
    }

    if (hitObject && hitObject.type === 'coloringRegion' && !hitObject.locked) {
        // Change color of existing filled region
        const cmd = new ChangeStyleCommand(
            [hitObject],
            { fillColor: settings.color, opacity: settings.opacity },
            () => engine.getObjects(),
            (newObjects) => engine.setObjects(newObjects)
        );
        engine.getCommandManager().execute(cmd);
        return;
    }

    // 2. Freehand / Raster Fill (Flood Fill)
    // Dispatch to Web Worker to find boundaries on the rendered canvas context.
    const renderer = engine.getRenderer();
    if (renderer && renderer.dispatchFloodFill) {
      // Call into canvas renderer which holds the offscreen or main canvas context
      // to read pixels and start the worker task.
      renderer.dispatchFloodFill(worldPoint, settings.color, settings.opacity);
    }
  }

  public onPointerMove(): void {}
  public onPointerUp(): void {}
  public onPointerCancel(): void {}
  public onDeactivate(): void {}
}
