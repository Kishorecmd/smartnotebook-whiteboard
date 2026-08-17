import { openDB, IDBPDatabase } from 'idb';
import { WhiteboardDocument } from '../types';
import { validateDocument } from '../models';

const DB_NAME = 'jaihind_whiteboard_db';
// v2 adds the media store for video blobs. The upgrade is additive: existing
// documents and autosaves are untouched.
const DB_VERSION = 2;
const STORE_DOCUMENTS = 'documents';
const STORE_AUTOSAVE = 'autosave';
const STORE_MEDIA = 'media';
const MEDIA_INDEX_KEY = 'jhw_media_assets';

function referencedMediaIds(doc: WhiteboardDocument): Set<string> {
  const ids = new Set<string>();
  for (const page of doc.pages) {
    for (const object of page.objects) {
      switch (object.type) {
        case 'image':
          if (object.assetId) ids.add(object.assetId);
          break;
        case 'video':
        case 'audio':
          ids.add(object.mediaId);
          break;
        case 'image-audio':
          ids.add(object.audioMediaId);
          if (object.imageAssetId) ids.add(object.imageAssetId);
          break;
        case 'pdf':
          ids.add(object.assetId);
          break;
      }
    }
  }
  return ids;
}

export class StorageService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;

  private static getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
            db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
            db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_MEDIA)) {
            db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Stores a media blob (currently video) keyed by id. Kept out of the document
   * itself so saved boards stay small.
   */
  public static async saveMedia(id: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_MEDIA, { id, blob, size: blob.size, type: blob.type, createdAt: Date.now() });
  }

  public static async loadMedia(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      const record = await db.get(STORE_MEDIA, id);
      return record?.blob instanceof Blob ? record.blob : null;
    } catch (err) {
      console.warn('Failed to load media blob:', err);
      return null;
    }
  }

  public static async deleteMedia(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_MEDIA, id);
    } catch (err) {
      console.warn('Failed to delete media blob:', err);
    }
  }

  /** Total bytes held in the media store, for surfacing storage pressure. */
  public static async getMediaUsage(): Promise<number> {
    try {
      const db = await this.getDB();
      const records = await db.getAll(STORE_MEDIA);
      return records.reduce((sum: number, r: any) => sum + (r?.size || 0), 0);
    } catch {
      return 0;
    }
  }

  /**
   * Removes blobs that are no longer referenced by a saved document or the
   * current autosave. Run this only after command history has been cleared so
   * undo cannot resurrect an object whose bytes were reclaimed.
   */
  public static async collectUnusedMedia(extraDocuments: WhiteboardDocument[] = []): Promise<number> {
    try {
      const db = await this.getDB();
      const documents = [...extraDocuments];
      const saved = await db.getAll(STORE_DOCUMENTS);
      for (const candidate of saved) {
        try {
          documents.push(validateDocument(candidate));
        } catch {
          // A malformed record must not prevent cleanup of healthy records.
        }
      }

      const autosave = await db.get(STORE_AUTOSAVE, 'current_session');
      if (autosave?.doc) {
        try {
          documents.push(validateDocument(autosave.doc));
        } catch {
          // Ignore an unreadable autosave.
        }
      }

      // Include localStorage fallbacks as well as IndexedDB records.
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key || (!key.startsWith('jhw_doc_') && key !== 'jhw_autosave')) continue;
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || 'null');
          const candidate = key === 'jhw_autosave' ? parsed?.doc : parsed;
          if (candidate) documents.push(validateDocument(candidate));
        } catch {
          // Ignore corrupt fallback data; normal loading reports that separately.
        }
      }

      const retained = new Set<string>();
      for (const document of documents) {
        for (const id of referencedMediaIds(document)) retained.add(id);
      }

      const transaction = db.transaction(STORE_MEDIA, 'readwrite');
      const records = await transaction.store.getAll();
      const removedIds: string[] = [];
      for (const record of records) {
        if (typeof record?.id === 'string' && !retained.has(record.id)) {
          await transaction.store.delete(record.id);
          removedIds.push(record.id);
        }
      }
      await transaction.done;

      if (removedIds.length > 0) {
        try {
          const raw = localStorage.getItem(MEDIA_INDEX_KEY);
          const index = raw ? JSON.parse(raw) : {};
          for (const id of removedIds) delete index[id];
          localStorage.setItem(MEDIA_INDEX_KEY, JSON.stringify(index));
        } catch {
          // The metadata index is a convenience; blob cleanup still succeeded.
        }
      }

      return removedIds.length;
    } catch (err) {
      console.warn('Failed to clean unused media:', err);
      return 0;
    }
  }

  /**
   * Saves a document to IndexedDB with localStorage fallback.
   */
  public static async saveDocument(doc: WhiteboardDocument): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STORE_DOCUMENTS, doc);
    } catch (err) {
      console.warn('IndexedDB save failed, falling back to localStorage:', err);
      try {
        localStorage.setItem(`jhw_doc_${doc.id}`, JSON.stringify(doc));
      } catch (localErr) {
        console.error('LocalStorage save failed:', localErr);
      }
    }
  }

  /**
   * Loads a document by ID.
   */
  public static async loadDocument(id: string): Promise<WhiteboardDocument | null> {
    try {
      const db = await this.getDB();
      const doc = await db.get(STORE_DOCUMENTS, id);
      if (doc) {
        return validateDocument(doc);
      }
    } catch (err) {
      console.warn('IndexedDB get failed, checking localStorage:', err);
    }

    try {
      const raw = localStorage.getItem(`jhw_doc_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return validateDocument(parsed);
      }
    } catch (err) {
      console.error('Failed to parse document from localStorage:', err);
    }

    return null;
  }

  /**
   * Lists all saved documents.
   */
  public static async listDocuments(): Promise<WhiteboardDocument[]> {
    try {
      const db = await this.getDB();
      const docs = await db.getAll(STORE_DOCUMENTS);
      return (docs || []).flatMap((doc) => {
        try {
          return [validateDocument(doc)];
        } catch (err) {
          console.warn('Skipping an invalid saved document:', err);
          return [];
        }
      });
    } catch (err) {
      console.warn('IndexedDB getAll failed, reading localStorage:', err);
      const docs: WhiteboardDocument[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('jhw_doc_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) docs.push(validateDocument(JSON.parse(raw)));
          } catch {}
        }
      }
      return docs;
    }
  }

  /**
   * Saves autosave state.
   */
  public static async saveAutosave(doc: WhiteboardDocument): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STORE_AUTOSAVE, { id: 'current_session', doc, timestamp: Date.now() });
    } catch {
      try {
        localStorage.setItem('jhw_autosave', JSON.stringify({ doc, timestamp: Date.now() }));
      } catch {}
    }
  }

  /**
   * Loads autosave state.
   */
  public static async loadAutosave(): Promise<WhiteboardDocument | null> {
    try {
      const db = await this.getDB();
      const record = await db.get(STORE_AUTOSAVE, 'current_session');
      if (record && record.doc) {
        return validateDocument(record.doc);
      }
    } catch (err) {
      console.warn('Failed to load autosave from IDB:', err);
    }

    try {
      const raw = localStorage.getItem('jhw_autosave');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.doc) {
          return validateDocument(parsed.doc);
        }
      }
    } catch {}

    return null;
  }

  /**
   * Deletes a document.
   */
  public static async deleteDocument(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_DOCUMENTS, id);
    } catch {}
    try {
      localStorage.removeItem(`jhw_doc_${id}`);
    } catch {}
  }
}
