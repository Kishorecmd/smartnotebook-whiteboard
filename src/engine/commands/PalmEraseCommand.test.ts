import { describe, expect, it } from 'vitest';
import type { ImageObject } from '../../types';
import { PalmEraseCommand } from './PalmEraseCommand';

const image = (id: string, zIndex: number): ImageObject => ({
  id, type: 'image', x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex,
  visible: true, locked: false, createdAt: 1, updatedAt: 1,
  mimeType: 'image/png', originalWidth: 10, originalHeight: 10,
});

describe('PalmEraseCommand', () => {
  it('preserves objects created concurrently by the stylus during undo and redo', () => {
    const erased = image('erased', 1);
    const segment = image('segment', 1);
    const concurrentStylusStroke = image('new-stylus-object', 2);
    let objects = [segment, concurrentStylusStroke];
    const command = new PalmEraseCommand([erased], [segment], () => objects, (next) => { objects = next as ImageObject[]; });

    command.undo();
    expect(objects.map((object) => object.id)).toEqual(['erased', 'new-stylus-object']);
    command.redo();
    expect(objects.map((object) => object.id)).toEqual(['segment', 'new-stylus-object']);
  });
});
