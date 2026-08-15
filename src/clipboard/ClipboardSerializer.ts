import { WhiteboardObject, GroupObject } from '../types';
import { generateId } from '../utils';
import { GroupManager } from '../objects/GroupManager';

export interface ClipboardData {
  version: number;
  objects: WhiteboardObject[];
}

export class ClipboardSerializer {
  private static readonly VERSION = 1;
  private static readonly PASTE_OFFSET = 20;

  /**
   * Prepares objects for the clipboard. Finds all descendants so groups are complete.
   */
  static serialize(selectedIds: string[], objects: WhiteboardObject[]): string {
    const affectedObjects = GroupManager.getAllAffectedObjects(selectedIds, objects);
    
    // Deep clone the objects so they are disconnected from live state
    const cloned = JSON.parse(JSON.stringify(affectedObjects)) as WhiteboardObject[];
    
    const data: ClipboardData = {
      version: this.VERSION,
      objects: cloned,
    };
    
    return JSON.stringify(data);
  }

  /**
   * Parses clipboard data and regenerates IDs, offsetting X/Y by a given amount.
   * Returns the new objects.
   */
  static deserialize(clipboardString: string, pasteCount: number = 1): WhiteboardObject[] | null {
    try {
      const data = JSON.parse(clipboardString) as ClipboardData;
      if (data.version !== this.VERSION || !Array.isArray(data.objects)) {
        return null;
      }

      const idMap = new Map<string, string>();
      const offset = this.PASTE_OFFSET * pasteCount;

      // First pass: generate new IDs
      for (const obj of data.objects) {
        idMap.set(obj.id, generateId(obj.type));
      }

      // Second pass: apply new IDs and offset
      const newObjects: WhiteboardObject[] = [];
      for (const obj of data.objects) {
        const newObj = { ...obj, id: idMap.get(obj.id)! };
        
        // Remap group children
        if (newObj.type === 'group') {
          const group = newObj as GroupObject;
          group.children = group.children.map(childId => idMap.get(childId) || childId);
        }

        // Remap parentGroupId
        if (newObj.parentGroupId && idMap.has(newObj.parentGroupId)) {
          newObj.parentGroupId = idMap.get(newObj.parentGroupId);
        }

        // Offset position (for shapes, text, etc)
        newObj.x += offset;
        newObj.y += offset;

        // Offset points (for strokes, regions)
        if ('points' in newObj && Array.isArray(newObj.points)) {
          newObj.points = newObj.points.map(p => ({
            ...p,
            x: p.x + offset,
            y: p.y + offset
          }));
        }

        // Offset center (for circles, arcs, compass)
        if ('centerX' in newObj) {
          (newObj as any).centerX += offset;
          (newObj as any).centerY += offset;
        }

        newObjects.push(newObj);
      }

      return newObjects;
    } catch (e) {
      console.error('Failed to parse clipboard data', e);
      return null;
    }
  }
}
