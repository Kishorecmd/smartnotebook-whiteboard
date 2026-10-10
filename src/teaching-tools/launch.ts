import { useWhiteboardStore } from '../store';
import type { ToolType } from '../types/whiteboard.types';
import { TeachingToolRegistry } from './TeachingToolRegistry';

/** Opens a teaching tool on the current board: an overlay, an object placed in view, or a pointer tool. */
export function launchTeachingTool(toolId: string): boolean {
  const toolDef = TeachingToolRegistry.getTool(toolId);
  const store = useWhiteboardStore.getState();
  if (!toolDef) return false;
  store.addRecentTool(toolId);
  const engine = store.engine;
  if (toolDef.type === 'overlay-ui') {
    // Reopening a running tool must preserve its state.
    if (!store.activeOverlayTools.includes(toolId)) store.toggleOverlayTool(toolId);
  } else if (toolDef.type === 'canvas-object' && engine && toolDef.objectFactory) {
    const rect = engine.getCanvas().getBoundingClientRect();
    const center = engine.getTransformer().screenToWorld({ x: rect.width / 2, y: Math.max(120, (rect.height - 180) / 2) });
    const object = toolDef.objectFactory(center);
    const zoom = engine.getTransformer().getZoom();
    const scale = Math.min(1, (rect.width - 40) / (object.width * zoom), Math.max(100, rect.height - 240) / (object.height * zoom));
    object.width *= scale;
    object.height *= scale;
    object.x = center.x - object.width / 2;
    object.y = center.y - object.height / 2;
    if (object.type === 'compass') object.radius *= scale;
    engine.addObject(object);
    store.setTool('select');
    engine.setSelectedIds([object.id]);
  } else {
    toolDef.onActivate?.(engine);
  }
  return true;
}

/** Calls `ready` once the whiteboard's drawing engine exists, e.g. just after switching to the board. */
export function whenBoardReady(ready: () => void, timeoutMs = 5000) {
  if (useWhiteboardStore.getState().engine) { ready(); return; }
  const timer = window.setTimeout(() => stop(), timeoutMs);
  const stop = useWhiteboardStore.subscribe(state => {
    if (!state.engine) return;
    window.clearTimeout(timer); stop();
    // Let the canvas finish its first layout before placing objects.
    window.requestAnimationFrame(() => ready());
  });
}

/** What a dock button opens on the whiteboard. */
export type BoardAction = { tool: ToolType } | { teachingTool: string };

export function openOnBoard(action: BoardAction) {
  whenBoardReady(() => {
    if ('tool' in action) useWhiteboardStore.getState().setTool(action.tool);
    else launchTeachingTool(action.teachingTool);
  });
}
