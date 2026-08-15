import { WhiteboardObject } from '../types';
import { ClipboardSerializer } from './ClipboardSerializer';

const STORAGE_KEY = 'smartnotebook_clipboard';

export class ClipboardManager {
  private pasteCount = 0;
  private lastCopiedData: string | null = null;

  /**
   * Copies selected objects to local storage for cross-document capability.
   */
  public copy(selectedIds: string[], objects: WhiteboardObject[]): void {
    if (selectedIds.length === 0) return;
    
    const serialized = ClipboardSerializer.serialize(selectedIds, objects);
    
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      this.lastCopiedData = serialized;
      this.pasteCount = 0; // Reset paste count on new copy
    } catch (e) {
      console.warn('Failed to write clipboard to localStorage. Falling back to memory.', e);
      this.lastCopiedData = serialized;
      this.pasteCount = 0;
    }
  }

  /**
   * Reads from local storage and returns newly generated objects.
   */
  public paste(): WhiteboardObject[] | null {
    let dataToPaste = this.lastCopiedData;
    
    try {
      const storageData = localStorage.getItem(STORAGE_KEY);
      if (storageData) {
        // If storage data changed from another tab, prefer it and reset paste count
        if (storageData !== this.lastCopiedData) {
          dataToPaste = storageData;
          this.lastCopiedData = storageData;
          this.pasteCount = 0;
        }
      }
    } catch (e) {
      console.warn('Failed to read clipboard from localStorage. Falling back to memory.', e);
    }

    if (!dataToPaste) return null;

    this.pasteCount++;
    return ClipboardSerializer.deserialize(dataToPaste, this.pasteCount);
  }

  /**
   * Checks if there's anything in the clipboard.
   */
  public hasClipboardContent(): boolean {
    if (this.lastCopiedData) return true;
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }
}
