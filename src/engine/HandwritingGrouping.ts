import type { FreehandStroke, ICommand, WhiteboardObject } from '../types';
import { getCombinedBoundingBox, getObjectBoundingBox } from '../utils';
import { AddStrokeCommand } from './commands/AddStrokeCommand';
import { AddGroupedStrokeCommand } from './commands/AddGroupedStrokeCommand';

export type AutoGroupingMode = 'off' | 'words' | 'sentences';

/** Only extends the current writing session; never merges unrelated old ink. */
export class HandwritingGrouping {
  private last: { id: string; source: string; endedAt: number; mode: AutoGroupingMode } | null = null;
  reset(): void { this.last = null; }
  remember(stroke: FreehandStroke, source: string, mode: AutoGroupingMode, endedAt = Date.now()): void {
    this.last = { id: stroke.id, source, endedAt, mode };
  }
  command(stroke: FreehandStroke, source: string, startedAt: number, mode: AutoGroupingMode,
    objectsRef: () => WhiteboardObject[], setObjectsRef: (objects: WhiteboardObject[]) => void): ICommand {
    const previous = this.findPrevious(stroke, source, startedAt, mode, objectsRef());
    return previous ? new AddGroupedStrokeCommand(stroke, previous, objectsRef, setObjectsRef)
      : new AddStrokeCommand(stroke, objectsRef, setObjectsRef);
  }
  private findPrevious(stroke: FreehandStroke, source: string, startedAt: number, mode: AutoGroupingMode, objects: WhiteboardObject[]): FreehandStroke | null {
    const last = this.last;
    if (mode === 'off' || !last || mode !== last.mode || source !== last.source) return null;
    const pause = startedAt - last.endedAt;
    if (pause < 0 || pause > (mode === 'words' ? 1800 : 3500)) return null;
    if (!['pen', 'pencil', 'brush', 'crayon'].includes(stroke.tool) || stroke.maxAge) return null;
    const previous = objects.find((o): o is FreehandStroke => o.id === last.id && o.type === 'stroke');
    if (!previous || !previous.visible || previous.locked || previous.color !== stroke.color || previous.penId !== stroke.penId || previous.tool !== stroke.tool || previous.width !== stroke.width) return null;
    const group = objects.find(o => o.id === previous.parentGroupId);
    if (group && (group.type !== 'group' || group.locked || !group.visible || group.parentGroupId)) return null;
    const bounds = getCombinedBoundingBox([group ?? previous], 0, objects);
    if (!bounds) return null;
    const next = getObjectBoundingBox(stroke);
    const height = Math.max(20, bounds.height, next.height);
    const gapX = Math.max(0, bounds.minX - next.maxX, next.minX - bounds.maxX);
    const gapY = Math.max(0, bounds.minY - next.maxY, next.minY - bounds.maxY);
    const allowedGap = mode === 'words' ? Math.min(40, Math.max(14, height * 0.35)) : Math.min(140, Math.max(40, height * 1.2));
    const detachedMark = next.height < bounds.height * 0.35 && gapX === 0;
    if (gapX > allowedGap || gapY > (detachedMark ? height * 0.45 : height * 0.12)) return null;
    return previous;
  }
}
