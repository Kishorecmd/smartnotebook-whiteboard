import type { ToolType } from '../types';
import type { ITool } from '../engine/tools/ITool';
import type { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { isStylusTool, saveInputSettings, type InputSettings } from './InputSettings';
import type { PointerAction, PointerState } from './PointerState';

export interface StylusRoute { action: PointerAction; tool?: ITool; }

export class StylusManager {
  public route(pointer: PointerState, event: PointerEvent, engine: WhiteboardEngine, settings: InputSettings): StylusRoute {
    const eraserEnd = event.button === 5 || (event.buttons & 32) === 32;
    if (eraserEnd) return { action: 'ERASE', tool: engine.getTool('eraser') };

    const barrelButton = event.button === 2 || (event.buttons & 2) === 2;
    if (barrelButton) return { action: 'SELECT', tool: engine.getTool('select') };

    const selected = engine.getActiveToolType();
    const stylusTool: ToolType = isStylusTool(selected) ? selected : settings.lastStylusTool;
    if (isStylusTool(selected) && selected !== settings.lastStylusTool) {
      settings.lastStylusTool = selected;
      saveInputSettings({ lastStylusTool: selected });
    }
    pointer.action = 'DRAW';
    return { action: 'DRAW', tool: engine.getTool(stylusTool) || engine.getTool('pen') };
  }
}
