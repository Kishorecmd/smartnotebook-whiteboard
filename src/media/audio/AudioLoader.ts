import { AudioObject, ImageAudioObject, Point } from '../../types';
import { generateId } from '../../utils';
import { MediaManager } from '../MediaManager';

/** Card size on the board, in world units. */
const AUDIO_CARD_WIDTH = 320;
const AUDIO_CARD_HEIGHT = 96;
const WAVEFORM_BUCKETS = 64;

/**
 * Reads duration and a coarse waveform from an audio file.
 *
 * decodeAudioData is done once at import: the peaks are stored on the object so
 * the renderer never decodes audio to draw a frame. Failure is not fatal --
 * a missing waveform just means the card draws a flat bar.
 */
async function analyseAudio(file: Blob): Promise<{ duration: number; peaks: number[] }> {
  const AudioCtor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return { duration: 0, peaks: [] };

  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioCtor();
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(channel.length / WAVEFORM_BUCKETS));

    const peaks: number[] = [];
    for (let b = 0; b < WAVEFORM_BUCKETS; b++) {
      let peak = 0;
      const start = b * bucketSize;
      const end = Math.min(channel.length, start + bucketSize);
      for (let i = start; i < end; i++) {
        const v = Math.abs(channel[i]);
        if (v > peak) peak = v;
      }
      peaks.push(Math.min(1, peak));
    }

    return { duration: buffer.duration, peaks };
  } catch {
    // Encrypted, unsupported or very large files: fall back to metadata only.
    return { duration: await readDurationViaElement(file), peaks: [] };
  } finally {
    if (ctx && typeof ctx.close === 'function') void ctx.close();
  }
}

/** Duration without decoding, via a throwaway <audio> element. */
function readDurationViaElement(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('audio');
    el.preload = 'metadata';
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => done(0);
    setTimeout(() => done(0), 4000);
    el.src = url;
  });
}

export class AudioLoader {
  /** Imports an audio file and builds the board object for it. */
  public static async importAudio(file: File, centerPoint: Point): Promise<AudioObject> {
    const { duration, peaks } = await analyseAudio(file);

    const asset = await MediaManager.putAsset(file, 'audio', {
      fileName: file.name,
      mimeType: file.type,
      durationSeconds: duration,
    });

    const now = Date.now();
    return {
      id: generateId('audio'),
      type: 'audio',
      mediaId: asset.id,
      mimeType: file.type,
      title: file.name.replace(/\.[^.]+$/, '') || 'Audio',
      durationSeconds: duration,
      fileName: file.name,
      muted: false,
      loop: false,
      volume: 1,
      playbackRate: 1,
      autoplay: false,
      showVisualizer: peaks.length > 0,
      waveform: peaks.length ? peaks : undefined,
      x: centerPoint.x - AUDIO_CARD_WIDTH / 2,
      y: centerPoint.y - AUDIO_CARD_HEIGHT / 2,
      width: AUDIO_CARD_WIDTH,
      height: AUDIO_CARD_HEIGHT,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Builds the picture-with-sound object. The image is kept inline when small
   * so the pair stays self-contained, and moved to the asset store when large.
   */
  public static async importImageAudio(
    imageFile: File,
    audioFile: File,
    centerPoint: Point,
    maxDisplaySize?: { width: number; height: number }
  ): Promise<ImageAudioObject> {
    const { duration } = await analyseAudio(audioFile);

    const audioAsset = await MediaManager.putAsset(audioFile, 'audio', {
      fileName: audioFile.name,
      mimeType: audioFile.type,
      durationSeconds: duration,
    });

    const { dataUrl, naturalWidth, naturalHeight } = await readImage(imageFile);

    const INLINE_LIMIT = 512 * 1024; // keep small pictures in the document
    let imageDataUrl: string | undefined = dataUrl;
    let imageAssetId: string | undefined;
    if (imageFile.size > INLINE_LIMIT) {
      const imageAsset = await MediaManager.putAsset(imageFile, 'image', {
        fileName: imageFile.name,
        mimeType: imageFile.type,
        naturalWidth,
        naturalHeight,
      });
      imageAssetId = imageAsset.id;
      imageDataUrl = undefined;
    }

    const playerHeight = 56;
    let fit = 1;
    if (maxDisplaySize && maxDisplaySize.width > 0 && maxDisplaySize.height > 0) {
      fit = Math.min(
        1,
        maxDisplaySize.width / naturalWidth,
        (maxDisplaySize.height - playerHeight) / naturalHeight
      );
    }
    const pictureWidth = Math.max(80, Math.round(naturalWidth * fit));
    const pictureHeight = Math.max(60, Math.round(naturalHeight * fit));
    const totalHeight = pictureHeight + playerHeight;

    const now = Date.now();
    return {
      id: generateId('imageaudio'),
      type: 'image-audio',
      imageDataUrl,
      imageAssetId,
      imageMimeType: imageFile.type,
      audioMediaId: audioAsset.id,
      audioMimeType: audioFile.type,
      title: imageFile.name.replace(/\.[^.]+$/, '') || 'Image + Audio',
      durationSeconds: duration,
      fileName: audioFile.name,
      muted: false,
      loop: false,
      volume: 1,
      playbackRate: 1,
      autoplayMode: 'off',
      playerHeight,
      x: centerPoint.x - pictureWidth / 2,
      y: centerPoint.y - totalHeight / 2,
      width: pictureWidth,
      height: totalHeight,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function readImage(file: File): Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () =>
        resolve({ dataUrl, naturalWidth: img.naturalWidth || 320, naturalHeight: img.naturalHeight || 240 });
      img.onerror = () => reject(new Error('That image could not be read.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(file);
  });
}
