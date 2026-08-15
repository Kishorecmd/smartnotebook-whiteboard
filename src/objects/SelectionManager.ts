import { WhiteboardObject, BoundingBox, Point } from '../types';
import { GroupManager } from './GroupManager';
import { isPointInPolygon } from '../utils';

export class SelectionManager {
  /**
   * Given an initial set of selected IDs, expands the selection to include the top-most
   * ancestor group of each selected item. This ensures that clicking a child of a group
   * selects the entire group.
   */
  static getEffectiveSelection(selectedIds: Set<string>, objects: WhiteboardObject[]): Set<string> {
    const effectiveSet = new Set<string>();
    
    // Map objects for quick lookup
    const objMap = new Map(objects.map(o => [o.id, o]));
    
    for (const id of selectedIds) {
      let currentId = id;
      let topLevelId = id;
      
      // Traverse up to find the highest parent group
      while (currentId) {
        const obj = objMap.get(currentId);
        if (obj && obj.parentGroupId) {
          currentId = obj.parentGroupId;
          topLevelId = obj.parentGroupId;
        } else {
          break;
        }
      }
      
      effectiveSet.add(topLevelId);
    }
    
    return effectiveSet;
  }

  /**
   * Filters out locked objects from a selection set.
   */
  static filterLocked(selectedIds: Set<string>, objects: WhiteboardObject[]): Set<string> {
    const objMap = new Map(objects.map(o => [o.id, o]));
    const unlockedSet = new Set<string>();
    
    for (const id of selectedIds) {
      const obj = objMap.get(id);
      if (obj && !obj.locked) {
        unlockedSet.add(id);
      }
    }
    
    return unlockedSet;
  }
}
