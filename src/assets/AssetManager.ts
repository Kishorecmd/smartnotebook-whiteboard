import { StorageService } from '../services/StorageService';
import { MediaManager } from '../media/MediaManager';
import { generateId } from '../utils';

export class AssetManager {
  /**
   * Saves an image blob to IndexedDB and returns its asset ID.
   */
  public static async addImage(
    blob: Blob,
    mimeType: string,
    options: { includeInLibrary?: boolean; fileName?: string } = {}
  ): Promise<string> {
    // Create a new blob with the correct mime type if necessary
    const storeBlob = new Blob([blob], { type: mimeType });
    if (options.includeInLibrary === false) {
      const assetId = generateId('asset');
      await StorageService.saveMedia(assetId, storeBlob);
      return assetId;
    }
    const asset = await MediaManager.putAsset(storeBlob, 'image', {
      fileName: options.fileName || (blob instanceof File ? blob.name : undefined),
      mimeType,
    });
    return asset.id;
  }

  /**
   * Retrieves an image blob by its asset ID.
   */
  public static async getImage(assetId: string): Promise<Blob | null> {
    return await StorageService.loadMedia(assetId);
  }

  /**
   * Generates a transient Object URL for a given asset.
   * Note: The caller must eventually call URL.revokeObjectURL on the returned URL to avoid memory leaks.
   */
  public static async getImageUrl(assetId: string): Promise<string | null> {
    const blob = await this.getImage(assetId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  /**
   * Helper to convert a Data URL to a Blob
   */
  public static dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }
}
