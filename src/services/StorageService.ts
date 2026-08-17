import { openDB, IDBPDatabase } from 'idb';
import {
  RecoveryCheckpoint,
  RecoveryCheckpointReason,
  LessonTemplate,
  ReusableContentItem,
  WhiteboardObject,
  WhiteboardDocument,
} from '../types';
import { validateDocument } from '../models';

const DB_NAME = 'jaihind_whiteboard_db';
// v4 adds lesson templates and reusable content. The upgrade is additive: existing
// documents, autosaves, and media are untouched.
const DB_VERSION = 4;
const STORE_DOCUMENTS = 'documents';
const STORE_AUTOSAVE = 'autosave';
const STORE_MEDIA = 'media';
const STORE_CHECKPOINTS = 'checkpoints';
const STORE_TEMPLATES = 'lesson_templates';
const STORE_CONTENT_LIBRARY = 'content_library';
const CHECKPOINT_DOCUMENT_INDEX = 'by-document';
const MEDIA_INDEX_KEY = 'jhw_media_assets';
const CHECKPOINT_FALLBACK_PREFIX = 'jhw_checkpoints_';
const TEMPLATE_FALLBACK_KEY = 'jhw_lesson_templates';
const CONTENT_FALLBACK_KEY = 'jhw_content_library';
const AUTOSAVE_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_AUTOSAVE_CHECKPOINTS = 15;
const MAX_CHECKPOINTS_PER_DOCUMENT = 30;

function checkpointFallbackKey(documentId: string): string {
  return `${CHECKPOINT_FALLBACK_PREFIX}${documentId}`;
}

function checkpointContentSignature(doc: WhiteboardDocument): string {
  return JSON.stringify({ ...doc, updatedAt: 0 });
}

function validateCheckpoint(candidate: unknown): RecoveryCheckpoint | null {
  if (typeof candidate !== 'object' || candidate === null) return null;
  const record = candidate as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.documentId !== 'string' ||
    typeof record.createdAt !== 'number' ||
    typeof record.reason !== 'string' ||
    !record.document
  ) {
    return null;
  }

  const allowedReasons: RecoveryCheckpointReason[] = [
    'autosave',
    'manual',
    'save',
    'before-new',
    'before-open',
    'before-restore',
  ];
  if (!allowedReasons.includes(record.reason as RecoveryCheckpointReason)) return null;

  try {
    const document = validateDocument(record.document);
    if (document.id !== record.documentId) return null;
    return {
      id: record.id,
      documentId: record.documentId,
      createdAt: record.createdAt,
      reason: record.reason as RecoveryCheckpointReason,
      label: typeof record.label === 'string' ? record.label : undefined,
      document,
    };
  } catch {
    return null;
  }
}

/** Selects bounded history while keeping deliberate checkpoints ahead of automatic noise. */
export function selectRecoveryCheckpointsToRetain(
  checkpoints: RecoveryCheckpoint[]
): RecoveryCheckpoint[] {
  const newestFirst = [...checkpoints].sort((a, b) => b.createdAt - a.createdAt);
  const deliberate = newestFirst.filter((checkpoint) => checkpoint.reason !== 'autosave');
  const automatic = newestFirst
    .filter((checkpoint) => checkpoint.reason === 'autosave')
    .slice(0, MAX_AUTOSAVE_CHECKPOINTS);

  return [...deliberate, ...automatic]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_CHECKPOINTS_PER_DOCUMENT);
}

function referencedMediaIdsFromObjects(objects: WhiteboardObject[]): Set<string> {
  const ids = new Set<string>();
  for (const object of objects) {
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
  return ids;
}

function referencedMediaIds(doc: WhiteboardDocument): Set<string> {
  const ids = new Set<string>();
  for (const page of doc.pages) {
    for (const id of referencedMediaIdsFromObjects(page.objects)) ids.add(id);
  }
  return ids;
}

function validateLessonTemplate(candidate: unknown): LessonTemplate | null {
  if (typeof candidate !== 'object' || candidate === null) return null;
  const value = candidate as Partial<LessonTemplate>;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.pages) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) return null;
  try {
    const document = validateDocument({
      version: 1,
      id: `template_validation_${value.id}`,
      title: value.title,
      pages: value.pages,
      activePageIndex: 0,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    });
    return {
      id: value.id,
      title: value.title,
      description: value.description,
      category: value.category || 'general',
      tags: value.tags.filter((tag): tag is string => typeof tag === 'string'),
      pages: document.pages,
      builtIn: Boolean(value.builtIn),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

function validateReusableContent(candidate: unknown): ReusableContentItem | null {
  if (typeof candidate !== 'object' || candidate === null) return null;
  const value = candidate as Partial<ReusableContentItem>;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.objects) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) return null;
  try {
    const document = validateDocument({
      version: 1,
      id: `content_validation_${value.id}`,
      title: value.title,
      pages: [{
        id: 'content_page',
        name: 'Content',
        title: 'Content',
        background: '#ffffff',
        backgroundType: 'plain',
        objects: value.objects,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      }],
      activePageIndex: 0,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    });
    return {
      id: value.id,
      title: value.title,
      description: value.description,
      tags: value.tags.filter((tag): tag is string => typeof tag === 'string'),
      objects: document.pages[0].objects,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

export class StorageService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;
  private static checkpointQueue: Promise<void> = Promise.resolve();
  private static autosaveQueue: Promise<void> = Promise.resolve();

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
          if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
            const checkpointStore = db.createObjectStore(STORE_CHECKPOINTS, { keyPath: 'id' });
            checkpointStore.createIndex(CHECKPOINT_DOCUMENT_INDEX, 'documentId');
          }
          if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
            db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_CONTENT_LIBRARY)) {
            db.createObjectStore(STORE_CONTENT_LIBRARY, { keyPath: 'id' });
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

  public static async listStoredMediaRecords(): Promise<Array<{
    id: string;
    size: number;
    type: string;
    createdAt: number;
  }>> {
    try {
      const db = await this.getDB();
      const records = await db.getAll(STORE_MEDIA);
      return records.flatMap((record) =>
        typeof record?.id === 'string'
          ? [{
              id: record.id,
              size: typeof record.size === 'number' ? record.size : record.blob?.size || 0,
              type: typeof record.type === 'string' ? record.type : record.blob?.type || 'application/octet-stream',
              createdAt: typeof record.createdAt === 'number' ? record.createdAt : 0,
            }]
          : []
      );
    } catch {
      return [];
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

      const checkpoints = await db.getAll(STORE_CHECKPOINTS);
      for (const candidate of checkpoints) {
        const checkpoint = validateCheckpoint(candidate);
        if (checkpoint) documents.push(checkpoint.document);
      }

      const libraryMediaIds = new Set<string>();
      const templates = await db.getAll(STORE_TEMPLATES);
      for (const candidate of templates) {
        const template = validateLessonTemplate(candidate);
        if (!template) continue;
        for (const page of template.pages) {
          for (const id of referencedMediaIdsFromObjects(page.objects)) libraryMediaIds.add(id);
        }
      }

      const contentItems = await db.getAll(STORE_CONTENT_LIBRARY);
      for (const candidate of contentItems) {
        const item = validateReusableContent(candidate);
        if (!item) continue;
        for (const id of referencedMediaIdsFromObjects(item.objects)) libraryMediaIds.add(id);
      }

      // Include localStorage fallbacks as well as IndexedDB records.
      try {
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (
            !key ||
            (!key.startsWith('jhw_doc_') &&
              key !== 'jhw_autosave' &&
              !key.startsWith(CHECKPOINT_FALLBACK_PREFIX) &&
              key !== TEMPLATE_FALLBACK_KEY &&
              key !== CONTENT_FALLBACK_KEY)
          ) continue;
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || 'null');
            if (key === TEMPLATE_FALLBACK_KEY) {
              for (const candidate of Array.isArray(parsed) ? parsed : []) {
                const template = validateLessonTemplate(candidate);
                if (!template) continue;
                for (const page of template.pages) {
                  for (const id of referencedMediaIdsFromObjects(page.objects)) libraryMediaIds.add(id);
                }
              }
            } else if (key === CONTENT_FALLBACK_KEY) {
              for (const candidate of Array.isArray(parsed) ? parsed : []) {
                const item = validateReusableContent(candidate);
                if (!item) continue;
                for (const id of referencedMediaIdsFromObjects(item.objects)) libraryMediaIds.add(id);
              }
            } else if (key.startsWith(CHECKPOINT_FALLBACK_PREFIX)) {
              for (const candidate of Array.isArray(parsed) ? parsed : []) {
                const checkpoint = validateCheckpoint(candidate);
                if (checkpoint) documents.push(checkpoint.document);
              }
            } else {
              const candidate = key === 'jhw_autosave' ? parsed?.doc : parsed;
              if (candidate) documents.push(validateDocument(candidate));
            }
          } catch {
            // Ignore corrupt fallback data; normal loading reports that separately.
          }
        }
      } catch {
        // localStorage may be unavailable in private or restricted contexts.
      }

      const retained = new Set<string>();
      for (const document of documents) {
        for (const id of referencedMediaIds(document)) retained.add(id);
      }
      for (const id of libraryMediaIds) retained.add(id);
      try {
        const rawIndex = localStorage.getItem(MEDIA_INDEX_KEY);
        const index = rawIndex ? JSON.parse(rawIndex) : {};
        for (const id of Object.keys(index)) retained.add(id);
      } catch {
        // The searchable asset index may be unavailable in restricted contexts.
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
    const validDocument = validateDocument(doc);
    try {
      const db = await this.getDB();
      await db.put(STORE_DOCUMENTS, validDocument);
    } catch (err) {
      console.warn('IndexedDB save failed, falling back to localStorage:', err);
      try {
        localStorage.setItem(`jhw_doc_${validDocument.id}`, JSON.stringify(validDocument));
      } catch (localErr) {
        console.error('LocalStorage save failed:', localErr);
      }
    }
    await this.createRecoveryCheckpoint(validDocument, 'save', 'Saved version');
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
  public static saveAutosave(doc: WhiteboardDocument): Promise<void> {
    const validDocument = validateDocument(doc);
    const task = async () => {
      try {
        const db = await this.getDB();
        await db.put(STORE_AUTOSAVE, { id: 'current_session', doc: validDocument, timestamp: Date.now() });
      } catch {
        try {
          localStorage.setItem('jhw_autosave', JSON.stringify({ doc: validDocument, timestamp: Date.now() }));
        } catch {}
      }
      await this.createRecoveryCheckpoint(
        validDocument,
        'autosave',
        'Automatic recovery point',
        AUTOSAVE_CHECKPOINT_INTERVAL_MS
      );
    };

    const result = this.autosaveQueue.then(task, task);
    this.autosaveQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  /** Creates an immutable document snapshot and prunes old automatic history. */
  public static createRecoveryCheckpoint(
    doc: WhiteboardDocument,
    reason: RecoveryCheckpointReason = 'manual',
    label?: string,
    minimumIntervalMs = 0
  ): Promise<RecoveryCheckpoint | null> {
    const task = async (): Promise<RecoveryCheckpoint | null> => {
      const document = validateDocument(doc);
      const existing = await this.listRecoveryCheckpoints(document.id);
      const latestForReason = existing.find((checkpoint) => checkpoint.reason === reason);
      if (
        latestForReason &&
        (minimumIntervalMs <= 0 || Date.now() - latestForReason.createdAt < minimumIntervalMs) &&
        checkpointContentSignature(latestForReason.document) === checkpointContentSignature(document)
      ) {
        return null;
      }
      if (
        latestForReason &&
        minimumIntervalMs > 0 &&
        Date.now() - latestForReason.createdAt < minimumIntervalMs
      ) {
        return null;
      }

      const checkpoint: RecoveryCheckpoint = {
        id: `checkpoint_${document.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        documentId: document.id,
        createdAt: Date.now(),
        reason,
        label,
        document,
      };

      const retained = selectRecoveryCheckpointsToRetain([checkpoint, ...existing]);
      const retainedIds = new Set(retained.map((entry) => entry.id));

      try {
        const db = await this.getDB();
        const transaction = db.transaction(STORE_CHECKPOINTS, 'readwrite');
        await transaction.store.put(checkpoint);
        for (const old of existing) {
          if (!retainedIds.has(old.id)) await transaction.store.delete(old.id);
        }
        await transaction.done;
      } catch (err) {
        console.warn('IndexedDB checkpoint save failed, using localStorage:', err);
        try {
          localStorage.setItem(checkpointFallbackKey(document.id), JSON.stringify(retained));
        } catch (localErr) {
          console.error('Recovery checkpoint could not be stored:', localErr);
          return null;
        }
      }

      return checkpoint;
    };

    const result = this.checkpointQueue.then(task, task);
    this.checkpointQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  public static async listRecoveryCheckpoints(documentId: string): Promise<RecoveryCheckpoint[]> {
    const merged = new Map<string, RecoveryCheckpoint>();
    try {
      const db = await this.getDB();
      const records = await db.getAllFromIndex(
        STORE_CHECKPOINTS,
        CHECKPOINT_DOCUMENT_INDEX,
        documentId
      );
      for (const record of records) {
        const checkpoint = validateCheckpoint(record);
        if (checkpoint) merged.set(checkpoint.id, checkpoint);
      }
    } catch (err) {
      console.warn('Could not read recovery checkpoints from IndexedDB:', err);
    }

    try {
      const raw = localStorage.getItem(checkpointFallbackKey(documentId));
      for (const candidate of raw ? JSON.parse(raw) : []) {
        const checkpoint = validateCheckpoint(candidate);
        if (checkpoint) merged.set(checkpoint.id, checkpoint);
      }
    } catch {
      // Ignore a corrupt fallback; healthy IndexedDB history remains available.
    }

    return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static async loadLatestRecoveryCheckpoint(): Promise<RecoveryCheckpoint | null> {
    const candidates: RecoveryCheckpoint[] = [];
    try {
      const db = await this.getDB();
      const records = await db.getAll(STORE_CHECKPOINTS);
      for (const record of records) {
        const checkpoint = validateCheckpoint(record);
        if (checkpoint) candidates.push(checkpoint);
      }
    } catch (err) {
      console.warn('Could not scan recovery checkpoints:', err);
    }

    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(CHECKPOINT_FALLBACK_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        for (const candidate of raw ? JSON.parse(raw) : []) {
          const checkpoint = validateCheckpoint(candidate);
          if (checkpoint) candidates.push(checkpoint);
        }
      }
    } catch {
      // Ignore broken fallback history.
    }

    return candidates.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  }

  public static async deleteRecoveryCheckpoint(id: string, documentId: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_CHECKPOINTS, id);
    } catch {}
    try {
      const remaining = (await this.listRecoveryCheckpoints(documentId))
        .filter((checkpoint) => checkpoint.id !== id);
      localStorage.setItem(checkpointFallbackKey(documentId), JSON.stringify(remaining));
    } catch {}
  }

  public static async deleteRecoveryCheckpointsForDocument(documentId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(STORE_CHECKPOINTS, 'readwrite');
      let cursor = await transaction.store.index(CHECKPOINT_DOCUMENT_INDEX).openCursor(documentId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await transaction.done;
    } catch {}
    try {
      localStorage.removeItem(checkpointFallbackKey(documentId));
    } catch {}
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
    await this.deleteRecoveryCheckpointsForDocument(id);
  }

  public static async saveLessonTemplate(template: LessonTemplate): Promise<void> {
    const valid = validateLessonTemplate({ ...template, builtIn: false });
    if (!valid) throw new Error('This lesson template is invalid.');
    try {
      const db = await this.getDB();
      await db.put(STORE_TEMPLATES, valid);
    } catch {
      const existing = await this.listLessonTemplates();
      const next = [valid, ...existing.filter((item) => item.id !== valid.id)];
      localStorage.setItem(TEMPLATE_FALLBACK_KEY, JSON.stringify(next));
    }
  }

  public static async listLessonTemplates(): Promise<LessonTemplate[]> {
    const merged = new Map<string, LessonTemplate>();
    try {
      const db = await this.getDB();
      for (const candidate of await db.getAll(STORE_TEMPLATES)) {
        const template = validateLessonTemplate(candidate);
        if (template) merged.set(template.id, template);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(TEMPLATE_FALLBACK_KEY);
      for (const candidate of raw ? JSON.parse(raw) : []) {
        const template = validateLessonTemplate(candidate);
        if (template) merged.set(template.id, template);
      }
    } catch {}
    return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public static async deleteLessonTemplate(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_TEMPLATES, id);
    } catch {}
    try {
      const remaining = (await this.listLessonTemplates()).filter((item) => item.id !== id);
      localStorage.setItem(TEMPLATE_FALLBACK_KEY, JSON.stringify(remaining));
    } catch {}
  }

  public static async saveReusableContent(item: ReusableContentItem): Promise<void> {
    const valid = validateReusableContent(item);
    if (!valid) throw new Error('This reusable content is invalid.');
    try {
      const db = await this.getDB();
      await db.put(STORE_CONTENT_LIBRARY, valid);
    } catch {
      const existing = await this.listReusableContent();
      const next = [valid, ...existing.filter((entry) => entry.id !== valid.id)];
      localStorage.setItem(CONTENT_FALLBACK_KEY, JSON.stringify(next));
    }
  }

  public static async listReusableContent(): Promise<ReusableContentItem[]> {
    const merged = new Map<string, ReusableContentItem>();
    try {
      const db = await this.getDB();
      for (const candidate of await db.getAll(STORE_CONTENT_LIBRARY)) {
        const item = validateReusableContent(candidate);
        if (item) merged.set(item.id, item);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(CONTENT_FALLBACK_KEY);
      for (const candidate of raw ? JSON.parse(raw) : []) {
        const item = validateReusableContent(candidate);
        if (item) merged.set(item.id, item);
      }
    } catch {}
    return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public static async deleteReusableContent(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_CONTENT_LIBRARY, id);
    } catch {}
    try {
      const remaining = (await this.listReusableContent()).filter((item) => item.id !== id);
      localStorage.setItem(CONTENT_FALLBACK_KEY, JSON.stringify(remaining));
    } catch {}
  }
}
