import { WhiteboardObject, ImageObject } from '../types';
import { ClipboardSerializer } from './ClipboardSerializer';
import { AssetManager } from '../assets/AssetManager';
import { FileImportService } from '../services/FileImportService';
import { useWhiteboardStore } from '../store/useWhiteboardStore';

const STORAGE_KEY = 'smartnotebook_clipboard';
const CLIPBOARD_SIGNATURE = 'JAIHIND_CLIPBOARD_V1:';

export class ClipboardManager {
  private pasteCount = 0;
  private lastCopiedData: string | null = null;

  /**
   * Copies selected objects to local storage for cross-document capability.
   * Also attempts to write to the system clipboard.
   */
  public async copy(selectedIds: string[], objects: WhiteboardObject[]): Promise<void> {
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

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const clipboardItems: Record<string, Blob> = {};
        
        // Write our custom text signature to identify internal copies
        clipboardItems['text/plain'] = new Blob([CLIPBOARD_SIGNATURE + serialized], { type: 'text/plain' });
        
        // If an image is selected, attempt to write it to the system clipboard
        const selectedObjects = objects.filter(o => selectedIds.includes(o.id));
        const firstImage = selectedObjects.find(o => o.type === 'image') as ImageObject;
        if (firstImage) {
           let blob: Blob | null = null;
           if (firstImage.assetId) {
             blob = await AssetManager.getImage(firstImage.assetId);
           } else if (firstImage.dataUrl) {
             blob = AssetManager.dataUrlToBlob(firstImage.dataUrl);
           }
           if (blob) {
             // Browsers typically only support image/png for ClipboardItem safely
             if (blob.type === 'image/png') {
                 clipboardItems['image/png'] = blob;
             } else {
                 clipboardItems[blob.type] = blob; 
             }
           }
        }
        
        await navigator.clipboard.write([new ClipboardItem(clipboardItems)]);
        console.log('[Clipboard] Copy requested. Internal clipboard: SUCCESS. System clipboard: SUCCESS.');
      } catch (err) {
        console.warn('Failed to write to system clipboard', err);
        console.log('[Clipboard] Copy requested. Internal clipboard: SUCCESS. System clipboard: FAILED.');
      }
    } else {
        console.log('[Clipboard] Copy requested. Internal clipboard: SUCCESS. System clipboard: UNSUPPORTED.');
    }
  }

  /**
   * Reads from clipboard (system or internal) and returns newly generated objects.
   */
  public async paste(e?: ClipboardEvent, centerPoint?: { x: number, y: number }): Promise<WhiteboardObject[] | null> {
    console.log('[Clipboard] Paste requested');
    const showToast = useWhiteboardStore.getState().showToast;
    const targetPoint = centerPoint || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // Size constraint (60% of viewport)
    const maxDisplaySize = { width: window.innerWidth * 0.6, height: window.innerHeight * 0.6 };

    let dataToPaste = this.lastCopiedData;
    
    // 1. If an event is provided, check if it's an internal copy via text signature
    if (e && e.clipboardData) {
      const types = Array.from(e.clipboardData.types);
      console.log('[Clipboard] types:', types);

      const textData = e.clipboardData.getData('text/plain');

      // 1. Internal Signature Check
      if (textData && textData.startsWith(CLIPBOARD_SIGNATURE)) {
         dataToPaste = textData.substring(CLIPBOARD_SIGNATURE.length);
         console.log('[Clipboard] System clipboard: FOUND INTERNAL SIGNATURE');
      } else {
         // 2. Direct Image Blob Check
         const items = e.clipboardData.files;
         for (let i = 0; i < items.length; i++) {
           if (items[i].type.startsWith('image/')) {
             try {
                console.log('[Clipboard] Direct image: FOUND');
                const imageObj = await FileImportService.importImageBlob(items[i], targetPoint, maxDisplaySize);
                console.log('[Clipboard] Direct image: SUCCESS');
                showToast("Image pasted");
                return [imageObj];
             } catch (err: any) {
                console.error('Failed to paste external image blob', err);
                showToast(err.message || 'This image format is not supported.');
                return null;
             }
           }
         }

         // 3. HTML Clipboard Check
         const htmlData = e.clipboardData.getData('text/html');
         if (htmlData) {
            console.log('[Clipboard] HTML: FOUND');
            try {
               const doc = new DOMParser().parseFromString(htmlData, "text/html");
               const img = doc.querySelector('img[src], img[srcset]');
               if (img) {
                 let src = img.getAttribute('src');
                 const srcset = img.getAttribute('srcset');
                 
                 if (srcset) {
                    const candidates = srcset.split(',').map(s => s.trim().split(/\s+/));
                    if (candidates.length > 0) {
                        src = candidates[candidates.length - 1][0];
                    }
                 }
                 
                 if (src && (src.startsWith('http:') || src.startsWith('https:') || src.startsWith('data:'))) {
                     console.log('[Clipboard] HTML image src: FOUND. Fetching image...', src);
                     try {
                        const imageObj = await FileImportService.importImageUrl(src, targetPoint, maxDisplaySize);
                        console.log('[Clipboard] Fetch: SUCCESS. Image created.');
                        showToast("Image pasted");
                        return [imageObj];
                     } catch (err: any) {
                        console.error('[Clipboard] HTML Fetch: FAILED', err);
                        showToast(err.message || 'Failed to fetch image from HTML payload.');
                        return null; 
                     }
                 }
               }
            } catch (err) {
               console.error('[Clipboard] Failed to parse HTML payload', err);
            }
         }

         // 4. Plain text URL Check
         if (textData) {
            const isImageUrl = /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(textData.trim());
            const isWebpageUrl = /^https?:\/\//i.test(textData.trim());
            
            if (isImageUrl) {
                console.log('[Clipboard] Plain text image URL: FOUND. Fetching...', textData);
                try {
                    const imageObj = await FileImportService.importImageUrl(textData.trim(), targetPoint, maxDisplaySize);
                    showToast("Image pasted");
                    return [imageObj];
                } catch (err: any) {
                    showToast(err.message || 'Failed to fetch image from URL.');
                    return null;
                }
            } else if (isWebpageUrl) {
                showToast("The clipboard contains a webpage link, not image data.");
                return null;
            }
         }
      }
    }

    // 3. Fallback to reading internal local storage if no external paste took over
    if (!dataToPaste || (e && !e.clipboardData?.getData('text/plain').startsWith(CLIPBOARD_SIGNATURE))) {
      try {
        const storageData = localStorage.getItem(STORAGE_KEY);
        if (storageData) {
          if (storageData !== this.lastCopiedData) {
            dataToPaste = storageData;
            this.lastCopiedData = storageData;
            this.pasteCount = 0;
          }
        }
      } catch (err) {
        console.warn('Failed to read clipboard from localStorage. Falling back to memory.', err);
      }
    }

    if (!dataToPaste) {
       console.log('[Clipboard] Internal clipboard: NOT FOUND');
       return null;
    }

    this.pasteCount++;
    console.log(`[Clipboard] Internal clipboard: FOUND. Paste count: ${this.pasteCount}`);
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
