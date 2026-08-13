/**
 * Platform-independent media model.
 *
 * Nothing in this file touches the DOM, IndexedDB, pdf.js or the YouTube iframe.
 * The whiteboard engine understands only these shapes, which keeps the core free
 * of browser APIs and leaves the Android port a clear seam to swap out.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'image-audio' | 'pdf' | 'youtube';

/** Where a media object's bytes actually live. */
export type MediaSourceKind =
  /** Bytes held in the local asset store, referenced by id. */
  | 'asset'
  /** Small payloads embedded directly in the document (data URL). */
  | 'inline'
  /** An external service addressed by id or URL, e.g. YouTube. */
  | 'remote';

export interface MediaSource {
  kind: MediaSourceKind;
  /** Asset id when kind is 'asset'. */
  assetId?: string;
  /** Data URL when kind is 'inline'. */
  dataUrl?: string;
  /** URL or service-specific id when kind is 'remote'. */
  url?: string;
  mimeType?: string;
  fileName?: string;
  byteSize?: number;
}

/** Non-destructive crop, expressed as fractions of the natural image (0..1). */
export interface MediaCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Playback settings shared by everything with a timeline. */
export interface MediaPlaybackSettings {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  /** Seconds. Where playback begins. */
  startTime: number;
}

export const DEFAULT_PLAYBACK: MediaPlaybackSettings = {
  autoplay: false, // browsers block sound-on autoplay; never assume it works
  loop: false,
  muted: false,
  volume: 1,
  playbackRate: 1,
  startTime: 0,
};

/** How an image fills its frame. */
export type MediaFitMode = 'fit' | 'fill' | 'original';

/**
 * A stored asset's metadata. The bytes themselves live in whatever store the
 * platform provides; this record is what travels in the document.
 */
export interface MediaAssetRecord {
  id: string;
  kind: MediaKind;
  mimeType: string;
  fileName?: string;
  byteSize: number;
  createdAt: number;
  /** Small data-URL preview used by the library and by static exports. */
  thumbnailDataUrl?: string;
  /** Seconds, for audio and video. */
  durationSeconds?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

/** What a media kind supports, so UI can be built from data rather than switches. */
export interface MediaCapabilities {
  playable: boolean;
  croppable: boolean;
  paginated: boolean;
  hasVisualFrame: boolean;
  /** Can be drawn into a static PNG/JPG/PDF export. */
  exportsStatically: boolean;
}

export const MEDIA_CAPABILITIES: Record<MediaKind, MediaCapabilities> = {
  image: { playable: false, croppable: true, paginated: false, hasVisualFrame: true, exportsStatically: true },
  video: { playable: true, croppable: false, paginated: false, hasVisualFrame: true, exportsStatically: true },
  audio: { playable: true, croppable: false, paginated: false, hasVisualFrame: false, exportsStatically: true },
  'image-audio': { playable: true, croppable: true, paginated: false, hasVisualFrame: true, exportsStatically: true },
  pdf: { playable: false, croppable: false, paginated: true, hasVisualFrame: true, exportsStatically: true },
  youtube: { playable: false, croppable: false, paginated: false, hasVisualFrame: true, exportsStatically: true },
};

/** Presentation metadata for the insert panel and the media library. */
export interface MediaKindDescriptor {
  kind: MediaKind;
  label: string;
  icon: string;
  /** 'local' reads a file from the device; 'online' addresses a service. */
  group: 'local' | 'online';
  /** Accept string for a file picker, empty for non-file kinds. */
  accept: string;
  description: string;
}
