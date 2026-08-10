import { ITool } from './ITool';
import { Point } from '../../types';
import { HitTest } from '../HitTest';
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';

export class MagicEraserTool implements ITool {
  public readonly name: string = 'magic_eraser';

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

    if (hitObject && !hitObject.locked) {
      // Instantly delete the whole object
      const cmd = new DeleteObjectsCommand(
        [hitObject],
        () => engine.getObjects(),
        (newObjects) => engine.setObjects(newObjects)
      );
      engine.getCommandManager().execute(cmd);
      engine.clearSelection();
    }
  }

  public onPointerMove(): void {
    // Magic eraser operates on click/down
  }

  public onPointerUp(): void {}

  public onPointerCancel(): void {}

  public onDeactivate(): void {}
}
