import { WhiteboardObject } from '../../types';

/**
 * The z-index a newly added object should take to sit above everything already
 * on the page. Without this, new strokes default to 0 and end up *behind* objects
 * that carry an explicit z-index (images, videos), so annotating over them is
 * invisible.
 */
export function nextZIndex(objects: WhiteboardObject[]): number {
  if (objects.length === 0) return 1;
  return objects.reduce((max, o) => Math.max(max, o.zIndex || 0), 0) + 1;
}
