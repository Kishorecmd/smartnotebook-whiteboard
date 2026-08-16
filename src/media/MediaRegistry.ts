import { MediaKind, MediaKindDescriptor, MEDIA_CAPABILITIES, MediaCapabilities } from './MediaTypes';

/**
 * The single place media kinds are described. The insert panel, the library and
 * the context menus are all built from this rather than from hard-coded lists,
 * so adding a kind later means registering one descriptor.
 */
export class MediaRegistry {
  private static kinds = new Map<MediaKind, MediaKindDescriptor>();
  private static order: MediaKind[] = [];

  public static register(descriptor: MediaKindDescriptor): void {
    if (!this.kinds.has(descriptor.kind)) this.order.push(descriptor.kind);
    this.kinds.set(descriptor.kind, descriptor);
  }

  public static get(kind: MediaKind): MediaKindDescriptor | undefined {
    return this.kinds.get(kind);
  }

  public static getAll(): MediaKindDescriptor[] {
    return this.order.map((k) => this.kinds.get(k)!).filter(Boolean);
  }

  public static getByGroup(group: 'local' | 'online'): MediaKindDescriptor[] {
    return this.getAll().filter((d) => d.group === group);
  }

  public static capabilities(kind: MediaKind): MediaCapabilities {
    return MEDIA_CAPABILITIES[kind];
  }

  /** Best-guess kind for a dropped or picked file, by MIME then extension. */
  public static kindForFile(file: File): MediaKind | null {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'pdf';

    // Some platforms hand over an empty MIME type, so fall back to the extension.
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return null;
  }
}

MediaRegistry.register({
  kind: 'image',
  label: 'Image',
  icon: '🖼',
  group: 'local',
  accept: 'image/*',
  description: 'Photo, diagram or picture',
});

MediaRegistry.register({
  kind: 'video',
  label: 'Video',
  icon: '🎬',
  group: 'local',
  accept: 'video/*',
  description: 'MP4, WebM or MOV from this device',
});

MediaRegistry.register({
  kind: 'audio',
  label: 'Audio',
  icon: '🎵',
  group: 'local',
  accept: 'audio/*',
  description: 'MP3, WAV, OGG or M4A',
});

MediaRegistry.register({
  kind: 'image-audio',
  label: 'Image + Audio',
  icon: '🖼🎵',
  group: 'local',
  accept: 'image/*',
  description: 'A picture with a spoken word or sound',
});

MediaRegistry.register({
  kind: 'pdf',
  label: 'PDF',
  icon: '📄',
  group: 'local',
  accept: 'application/pdf',
  description: 'Worksheet or document',
});

MediaRegistry.register({
  kind: 'youtube',
  label: 'YouTube',
  icon: '▶',
  group: 'online',
  accept: '',
  description: 'Paste a YouTube link',
});

MediaRegistry.register({
  kind: 'webApp',
  label: 'Website / Web App',
  icon: '🌐',
  group: 'online',
  accept: '',
  description: 'Embed a website or web app',
});
