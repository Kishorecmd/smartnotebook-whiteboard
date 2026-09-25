import { WhiteboardObject } from '../types';

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
      if (!objMap.has(id)) continue;
      let currentId = id;
      let topLevelId = id;
      const visited = new Set<string>([id]);
      
      // Traverse up to find the highest parent group
      while (currentId) {
        const obj = objMap.get(currentId);
        const parent = obj?.parentGroupId ? objMap.get(obj.parentGroupId) : undefined;
        if (parent?.type === 'group' && !visited.has(parent.id)) {
          currentId = parent.id;
          topLevelId = parent.id;
          visited.add(parent.id);
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
