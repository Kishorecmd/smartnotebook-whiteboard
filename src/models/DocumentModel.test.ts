import { describe, expect, it } from 'vitest';
import {
  JHWDocumentSchema,
  createDefaultDocument,
  createStrokeObject,
  validateDocument,
} from './DocumentModel';

describe('whiteboard document validation', () => {
  it('accepts Magic Pen strokes', () => {
    const document = createDefaultDocument('Magic Pen');
    document.pages[0].objects.push(createStrokeObject({
      tool: 'magic_pen',
      points: [{ x: 10, y: 10 }, { x: 30, y: 20 }],
      color: '#7c3aed',
      width: 6,
      opacity: 0.8,
    }));

    expect(validateDocument(document).pages[0].objects[0]).toMatchObject({
      type: 'stroke',
      tool: 'magic_pen',
    });
  });

  it('strictly rejects an active page outside the page list', () => {
    const document = createDefaultDocument('Invalid page');
    expect(JHWDocumentSchema.safeParse({ ...document, activePageIndex: 99 }).success).toBe(false);
  });

  it('repairs the stale active page index written by older builds', () => {
    const document = createDefaultDocument('Legacy page');
    expect(validateDocument({ ...document, activePageIndex: 99 }).activePageIndex).toBe(0);
  });
});
