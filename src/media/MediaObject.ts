import { WhiteboardObject, MediaWhiteboardObject } from '../types';
import { MediaKind } from './MediaTypes';

/**
 * Predicates the engine uses to treat media generically.
 *
 * These exist so the object-type lists are written once. They were previously
 * repeated across HitTest, the bounding-box helper, SelectTool and InputRouter,
 * and adding a type meant remembering all four -- the same drift that left
 * `magic_pen` half-added and broke the build.
 */

/** Every object type owned by the media system. */
export const MEDIA_OBJECT_TYPES = ['image', 'video', 'audio', 'image-audio', 'pdf', 'youtubeVideo', 'webApp'] as const;

export function isMediaObject(obj: WhiteboardObject): obj is MediaWhiteboardObject {
  return (MEDIA_OBJECT_TYPES as readonly string[]).includes(obj.type);
}

/**
 * Media laid out as a plain rectangle: hit-tested by its box, moved and resized
 * by the standard transform path.
 */
export function isRectangularMedia(obj: WhiteboardObject): boolean {
  return isMediaObject(obj);
}

/** Media that plays and therefore offers transport controls. */
export function isPlayableMedia(obj: WhiteboardObject): boolean {
  return obj.type === 'video' || obj.type === 'audio' || obj.type === 'image-audio';
}

/** Media a tap should grab rather than draw over, whatever tool is in hand. */
export function isGrabbableMedia(obj: WhiteboardObject): boolean {
  return (
    obj.type === 'youtubeVideo' ||
    obj.type === 'webApp' ||
    obj.type === 'video' ||
    obj.type === 'audio' ||
    obj.type === 'image-audio' ||
    obj.type === 'pdf'
  );
}

/** The media kind for a board object, or null if it is not media. */
export function mediaKindOf(obj: WhiteboardObject): MediaKind | null {
  switch (obj.type) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'image-audio':
      return 'image-audio';
    case 'pdf':
      return 'pdf';
    case 'youtubeVideo':
      return 'youtube';
    case 'webApp':
      return 'webApp';
    default:
      return null;
  }
}

/** Asset ids a media object depends on, for availability checks and cleanup. */
export function assetIdsFor(obj: WhiteboardObject): string[] {
  switch (obj.type) {
    case 'video':
      return [obj.mediaId];
    case 'audio':
      return [obj.mediaId];
    case 'image-audio':
      return obj.imageAssetId ? [obj.audioMediaId, obj.imageAssetId] : [obj.audioMediaId];
    case 'pdf':
      return [obj.assetId];
    default:
      return [];
  }
}
