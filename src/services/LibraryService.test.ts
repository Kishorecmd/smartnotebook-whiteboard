import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createShapeObject, validateDocument } from '../models';
import type { GroupObject, ReusableContentItem } from '../types';
import type { MediaAssetRecord } from '../media/MediaTypes';
import { LibraryService } from './LibraryService';

describe('LibraryService', () => {
  it('creates valid, independent documents from every built-in lesson template', () => {
    const templates = LibraryService.getBuiltInTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(6);

    for (const template of templates) {
      const first = LibraryService.createDocumentFromTemplate(template);
      const second = LibraryService.createDocumentFromTemplate(template);
      expect(() => validateDocument(first)).not.toThrow();
      expect(first.pages).toHaveLength(template.pages.length);
      expect(first.id).not.toBe(second.id);
      expect(first.pages[0].id).not.toBe(second.pages[0].id);
    }
  });

  it('expands selected groups and remaps their internal relationships', () => {
    const first = createShapeObject({
      shapeType: 'rectangle', x: 100, y: 80, width: 120, height: 60,
      strokeColor: '#000000', strokeWidth: 2,
    });
    const second = createShapeObject({
      shapeType: 'circle', x: 250, y: 100, width: 60, height: 60,
      strokeColor: '#000000', strokeWidth: 2,
    });
    const now = Date.now();
    const group: GroupObject = {
      id: 'group-original', type: 'group', children: [first.id, second.id],
      x: 100, y: 80, width: 210, height: 80, rotation: 0, zIndex: 3,
      visible: true, locked: false, createdAt: now, updatedAt: now,
    };
    first.parentGroupId = group.id;
    second.parentGroupId = group.id;

    const item = LibraryService.createReusableContent(
      'Diagram', '', ['science'], [group.id], [first, second, group]
    );
    expect(item.objects).toHaveLength(3);

    const inserted = LibraryService.objectsForInsertion(item, { x: 500, y: 400 }, 10);
    const insertedGroup = inserted.find((object) => object.type === 'group') as GroupObject;
    const insertedChildren = inserted.filter((object) => object.type !== 'group');
    expect(insertedGroup.children.sort()).toEqual(insertedChildren.map((object) => object.id).sort());
    expect(insertedChildren.every((object) => object.parentGroupId === insertedGroup.id)).toBe(true);
    expect(inserted.map((object) => object.zIndex)).toEqual([10, 11, 12]);
  });

  it('centres reusable content around the requested insertion point', () => {
    const shape = createShapeObject({
      shapeType: 'rectangle', x: 100, y: 200, width: 80, height: 40,
      strokeColor: '#000000', strokeWidth: 2,
    });
    const item: ReusableContentItem = {
      id: 'content', title: 'Card', description: '', tags: [], objects: [shape],
      createdAt: 1, updatedAt: 1,
    };
    const [inserted] = LibraryService.objectsForInsertion(item, { x: 400, y: 300 }, 0);
    expect(inserted.x + inserted.width / 2).toBe(400);
    expect(inserted.y + inserted.height / 2).toBe(300);
  });

  it('builds insertable objects from indexed media metadata', () => {
    const asset: MediaAssetRecord = {
      id: 'pdf-asset', kind: 'pdf', mimeType: 'application/pdf', fileName: 'worksheet.pdf',
      byteSize: 1000, createdAt: 1, naturalWidth: 595, naturalHeight: 842, pageCount: 4,
    };
    const object = LibraryService.objectFromMediaAsset(asset, { x: 300, y: 300 });
    expect(object.type).toBe('pdf');
    if (object.type === 'pdf') {
      expect(object.pageCount).toBe(4);
      expect(object.assetId).toBe(asset.id);
    }
  });

  it('captures a current document as a user template', () => {
    const document = createDefaultDocument('Fractions');
    const template = LibraryService.createTemplateFromDocument(
      document, 'Fraction lesson', 'Reusable sequence', 'mathematics', ['Math', ' Fractions ']
    );
    expect(template.builtIn).toBe(false);
    expect(template.tags).toEqual(['math', 'fractions']);
    expect(template.pages).not.toBe(document.pages);
  });
});
