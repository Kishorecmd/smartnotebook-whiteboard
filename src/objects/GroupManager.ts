import { WhiteboardObject, BoundingBox } from '../types';
import { calculateBoundingBox } from '../utils';

export class GroupManager {
  /**
   * Recursively finds all descendants (children, grandchildren) of the given group IDs.
   */
  static getDescendants(groupIds: string[], objects: WhiteboardObject[]): WhiteboardObject[] {
    const descendants: WhiteboardObject[] = [];
    const groupIdsToProcess = [...groupIds];
    
    while (groupIdsToProcess.length > 0) {
      const currentGroupId = groupIdsToProcess.shift();
      const children = objects.filter(o => o.parentGroupId === currentGroupId);
      
      for (const child of children) {
        descendants.push(child);
        if (child.type === 'group') {
          groupIdsToProcess.push(child.id);
        }
      }
    }
    
    return descendants;
  }

  /**
   * Returns all objects that are either directly in the list of IDs, or are descendants.
   */
  static getAllAffectedObjects(ids: string[], objects: WhiteboardObject[]): WhiteboardObject[] {
    const initialObjects = objects.filter(o => ids.includes(o.id));
    const descendants = this.getDescendants(ids, objects);
    
    // Deduplicate
    const all = [...initialObjects, ...descendants];
    const uniqueMap = new Map(all.map(o => [o.id, o]));
    
    return Array.from(uniqueMap.values());
  }

  /**
   * Returns the combined bounding box of all descendants of a group.
   */
  static getGroupBoundingBox(groupId: string, objects: WhiteboardObject[]): BoundingBox {
    const descendants = this.getDescendants([groupId], objects);
    // Filter out groups themselves to avoid 0x0 boxes or circular logic
    const renderableDescendants = descendants.filter(o => o.type !== 'group');
    
    if (renderableDescendants.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    
    return calculateBoundingBox(renderableDescendants);
  }
}
