import { StorageService } from '../services/StorageService';
import { generateId } from '../utils';
import { MediaAssetRecord, MediaKind } from './MediaTypes';

/**
 * Storage seam for media bytes.
 *
 * Everything browser-specific about holding a file lives behind this interface.
 * The web implementation uses IndexedDB via StorageService; an Android build can
 * supply a file-backed one without touching the whiteboard engine.
 */
export interface MediaAssetStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  usage(): Promise<number>;
}

const indexedDbStore: MediaAssetStore = {
  put: (id, blob) => StorageService.saveMedia(id, blob),
  get: (id) => StorageService.loadMedia(id),
  remove: (id) => StorageService.deleteMedia(id),
  usage: () => StorageService.getMediaUsage(),
};

const ASSET_INDEX_KEY = 'jhw_media_assets';

/**
 * Owns media assets: the bytes, their metadata, and the object URLs handed to
 * <video>/<audio> elements.
 *
 * Object URLs are cached per asset and revoked on release, because creating one
 * per render would leak a handle on every frame.
 */
export class MediaManager {
  private static store: MediaAssetStore = indexedDbStore;
  private static objectUrls = new Map<string, string>();

  /** Lets a platform swap in its own storage without changing callers. */
  public static setStore(store: MediaAssetStore): void {
    this.store = store;
  }

  // --- Asset metadata index -------------------------------------------------
  // Kept in localStorage so the media library can list assets without reading
  // every blob out of IndexedDB.

  private static readIndex(): Record<string, MediaAssetRecord> {
    try {
      const raw = localStorage.getItem(ASSET_INDEX_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static writeIndex(index: Record<string, MediaAssetRecord>): void {
    try {
      localStorage.setItem(ASSET_INDEX_KEY, JSON.stringify(index));
    } catch {
      // Index is a convenience; losing it must never break playback.
    }
  }

  public static listAssets(kind?: MediaKind): MediaAssetRecord[] {
    const all = Object.values(this.readIndex());
    const filtered = kind ? all.filter((a) => a.kind === kind) : all;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  public static getAssetRecord(id: string): MediaAssetRecord | undefined {
    return this.readIndex()[id];
  }

  /** Stores a file and returns its metadata record. */
  public static async putAsset(
    file: Blob,
    kind: MediaKind,
    meta: Partial<MediaAssetRecord> = {}
  ): Promise<MediaAssetRecord> {
    const id = meta.id || generateId('asset');
    await this.store.put(id, file);

    // Caller metadata first, then the fields this method owns, so id and byteSize
    // always reflect what was actually stored.
    const record: MediaAssetRecord = {
      kind,
      mimeType: file.type || meta.mimeType || 'application/octet-stream',
      createdAt: Date.now(),
      ...meta,
      id,
      byteSize: file.size,
    };

    const index = this.readIndex();
    index[id] = record;
    this.writeIndex(index);
    return record;
  }

  public static async getBlob(id: string): Promise<Blob | null> {
    return this.store.get(id);
  }

  /**
   * A stable object URL for an asset. Repeated calls return the same URL so
   * media elements are not handed a fresh one on every render.
   */
  public static async getObjectUrl(id: string): Promise<string | null> {
    const cached = this.objectUrls.get(id);
    if (cached) return cached;

    const blob = await this.store.get(id);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.objectUrls.set(id, url);
    return url;
  }

  public static releaseObjectUrl(id: string): void {
    const url = this.objectUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(id);
    }
  }

  public static releaseAll(): void {
    for (const id of Array.from(this.objectUrls.keys())) this.releaseObjectUrl(id);
  }

  public static async removeAsset(id: string): Promise<void> {
    this.releaseObjectUrl(id);
    await this.store.remove(id);
    const index = this.readIndex();
    delete index[id];
    this.writeIndex(index);
  }

  public static async renameAsset(id: string, fileName: string): Promise<void> {
    const index = this.readIndex();
    if (index[id]) {
      index[id] = { ...index[id], fileName };
      this.writeIndex(index);
    }
  }

  public static usage(): Promise<number> {
    return this.store.usage();
  }

  /** True when the bytes for an asset are still present. */
  public static async isAvailable(id: string): Promise<boolean> {
    return (await this.store.get(id)) !== null;
  }
}
