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
      return docs || [];
    } catch (err) {
      console.warn('IndexedDB getAll failed, reading localStorage:', err);
      const docs: WhiteboardDocument[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('jhw_doc_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) docs.push(JSON.parse(raw));
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
    } catch (err) {
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
