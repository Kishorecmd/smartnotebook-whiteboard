import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDefaultDocument } from '../models';
import type { ImageObject, RecoveryCheckpoint } from '../types';
import { LibraryService } from './LibraryService';
import { selectRecoveryCheckpointsToRetain, StorageService } from './StorageService';

describe.sequential('StorageService recovery checkpoints', () => {
  it('stores changed manual checkpoints and deduplicates timestamp-only saves', async () => {
    const document = createDefaultDocument('Checkpoint test');
    const first = await StorageService.createRecoveryCheckpoint(document, 'manual');
    expect(first).not.toBeNull();

    const duplicate = await StorageService.createRecoveryCheckpoint(
      { ...document, updatedAt: document.updatedAt + 1000 },
      'manual'
    );
    expect(duplicate).toBeNull();

    const changed = await StorageService.createRecoveryCheckpoint(
      { ...document, title: 'Changed title', updatedAt: document.updatedAt + 2000 },
      'manual'
    );
    expect(changed).not.toBeNull();

    const history = await StorageService.listRecoveryCheckpoints(document.id);
    expect(history).toHaveLength(2);
    expect(history[0].document.title).toBe('Changed title');
  });

  it('limits automatic recovery noise while preserving deliberate versions', () => {
    const document = createDefaultDocument('Retention test');
    const checkpoints: RecoveryCheckpoint[] = Array.from({ length: 45 }, (_, index) => ({
      id: `checkpoint-${index}`,
      documentId: document.id,
      createdAt: index,
      reason: index < 20 ? 'autosave' : 'manual',
      document,
    }));

    const retained = selectRecoveryCheckpointsToRetain(checkpoints);
    expect(retained).toHaveLength(30);
    expect(retained.filter((checkpoint) => checkpoint.reason === 'autosave').length).toBeLessThanOrEqual(15);
    expect(retained.map((checkpoint) => checkpoint.createdAt)).toEqual(
      [...retained].map((checkpoint) => checkpoint.createdAt).sort((a, b) => b - a)
    );
  });

  it('serializes overlapping autosaves so the newest state wins', async () => {
    const document = createDefaultDocument('Autosave first');
    const newer = { ...document, title: 'Autosave newest', updatedAt: document.updatedAt + 1 };

    await Promise.all([
      StorageService.saveAutosave(document),
      StorageService.saveAutosave(newer),
    ]);

    expect((await StorageService.loadAutosave())?.title).toBe('Autosave newest');
  });

  it('keeps media referenced only by a checkpoint until that checkpoint is deleted', async () => {
    const document = createDefaultDocument('Media recovery test');
    const mediaId = `checkpoint-media-${Date.now()}`;
    const now = Date.now();
    const image: ImageObject = {
      id: `image-${now}`,
      type: 'image',
      assetId: mediaId,
      mimeType: 'image/png',
      originalWidth: 10,
      originalHeight: 10,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
    document.pages[0].objects.push(image);

    await StorageService.saveMedia(mediaId, new Blob(['image-bytes'], { type: 'image/png' }));
    const checkpoint = await StorageService.createRecoveryCheckpoint(document, 'manual');
    expect(checkpoint).not.toBeNull();

    const replacement = createDefaultDocument('Replacement');
    await StorageService.saveAutosave(replacement);
    await StorageService.collectUnusedMedia([replacement]);
    expect(await StorageService.loadMedia(mediaId)).not.toBeNull();

    await StorageService.deleteRecoveryCheckpoint(checkpoint!.id, document.id);
    await StorageService.collectUnusedMedia([replacement]);
    expect(await StorageService.loadMedia(mediaId)).toBeNull();
  });

  it('removes a board history when the saved board is deleted', async () => {
    const document = createDefaultDocument('Deleted board');
    await StorageService.saveDocument(document);
    expect(await StorageService.listRecoveryCheckpoints(document.id)).toHaveLength(1);

    await StorageService.deleteDocument(document.id);
    expect(await StorageService.listRecoveryCheckpoints(document.id)).toHaveLength(0);
  });

  it('persists and deletes user templates and reusable content', async () => {
    const document = createDefaultDocument('Library persistence');
    const template = LibraryService.createTemplateFromDocument(
      document, 'Stored template', '', 'general', ['stored']
    );
    await StorageService.saveLessonTemplate(template);
    expect((await StorageService.listLessonTemplates()).some((item) => item.id === template.id)).toBe(true);

    const shape = {
      id: 'library-shape', type: 'shape' as const, shapeType: 'rectangle' as const,
      x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 0,
      visible: true, locked: false, createdAt: 1, updatedAt: 1,
      strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 1, strokeStyle: 'solid' as const,
    };
    const item = LibraryService.createReusableContent('Stored content', '', [], [shape.id], [shape]);
    await StorageService.saveReusableContent(item);
    expect((await StorageService.listReusableContent()).some((entry) => entry.id === item.id)).toBe(true);

    await StorageService.deleteLessonTemplate(template.id);
    await StorageService.deleteReusableContent(item.id);
    expect((await StorageService.listLessonTemplates()).some((entry) => entry.id === template.id)).toBe(false);
    expect((await StorageService.listReusableContent()).some((entry) => entry.id === item.id)).toBe(false);
  });
});
