import { WhiteboardDocument, WhiteboardObject } from '../types';
import { validateDocument } from '../models';
import { StorageService } from './StorageService';
import { MediaManager } from '../media/MediaManager';
import type { MediaKind } from '../media/MediaTypes';

const JHW_PACKAGE_FORMAT = 'jaihind-whiteboard-package';
const JHW_PACKAGE_VERSION = 1;

type PortableAssetKind = Extract<MediaKind, 'image' | 'video' | 'audio' | 'pdf'>;

interface PortableAssetReference {
  id: string;
  kind: PortableAssetKind;
  mimeType: string;
  fileName?: string;
}

interface PortableAsset extends PortableAssetReference {
  data: string;
}

interface PortableJHWPackage {
  format: typeof JHW_PACKAGE_FORMAT;
  packageVersion: typeof JHW_PACKAGE_VERSION;
  document: WhiteboardDocument;
  assets: PortableAsset[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPortableJHWPackage(value: unknown): value is PortableJHWPackage {
  if (
    !isRecord(value) ||
    value.format !== JHW_PACKAGE_FORMAT ||
    value.packageVersion !== JHW_PACKAGE_VERSION ||
    !isRecord(value.document) ||
    !Array.isArray(value.assets)
  ) {
    return false;
  }

  return value.assets.every((asset) =>
    isRecord(asset) &&
    typeof asset.id === 'string' &&
    (asset.kind === 'image' || asset.kind === 'video' || asset.kind === 'audio' || asset.kind === 'pdf') &&
    typeof asset.mimeType === 'string' &&
    typeof asset.data === 'string' &&
    (asset.fileName === undefined || typeof asset.fileName === 'string')
  );
}

function collectAssetReferences(document: WhiteboardDocument): PortableAssetReference[] {
  const references = new Map<string, PortableAssetReference>();
  const add = (id: string | undefined, kind: PortableAssetKind, mimeType: string, fileName?: string) => {
    if (id && !references.has(id)) {
      references.set(id, { id, kind, mimeType, fileName });
    }
  };

  for (const page of document.pages) {
    for (const object of page.objects as WhiteboardObject[]) {
      switch (object.type) {
        case 'image':
          add(object.assetId, 'image', object.mimeType);
          break;
        case 'video':
          add(object.mediaId, 'video', object.mimeType, object.fileName);
          break;
        case 'audio':
          add(object.mediaId, 'audio', object.mimeType, object.fileName);
          break;
        case 'image-audio':
          add(object.imageAssetId, 'image', object.imageMimeType || 'image/*', object.fileName);
          add(object.audioMediaId, 'audio', object.audioMimeType, object.fileName);
          break;
        case 'pdf':
          add(object.assetId, 'pdf', 'application/pdf', object.fileName);
          break;
      }
    }
  }

  return Array.from(references.values());
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not package a media asset.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not encode a media asset.'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const chunkSize = 32 * 1024;
  const chunks: ArrayBuffer[] = [];

  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const slice = binary.slice(offset, offset + chunkSize);
    const buffer = new ArrayBuffer(slice.length);
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < slice.length; index++) {
      bytes[index] = slice.charCodeAt(index);
    }
    chunks.push(buffer);
  }

  return new Blob(chunks, { type: mimeType });
}

export class FileService {
  /**
   * Serializes and downloads the whiteboard document as a .jhw file.
   */
  public static async exportToJHW(doc: WhiteboardDocument, filename?: string): Promise<void> {
    const validDoc = validateDocument(doc);
    const references = collectAssetReferences(validDoc);
    const assets: PortableAsset[] = [];

    for (const reference of references) {
      const media = await StorageService.loadMedia(reference.id);
      if (!media) {
        throw new Error(`Media asset "${reference.fileName || reference.id}" is unavailable and cannot be included.`);
      }
      assets.push({
        ...reference,
        mimeType: media.type || reference.mimeType || 'application/octet-stream',
        data: await blobToBase64(media),
      });
    }

    // Plain boards stay readable as the original document JSON; boards with
    // local media use a backward-compatible envelope that carries the bytes.
    const content: WhiteboardDocument | PortableJHWPackage = assets.length === 0
      ? validDoc
      : {
          format: JHW_PACKAGE_FORMAT,
          packageVersion: JHW_PACKAGE_VERSION,
          document: validDoc,
          assets,
        };
    const jsonString = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = (filename || doc.title || 'whiteboard')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeName}.jhw`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Prompts user to pick a .jhw file, parses and validates it.
   */
  public static async importFromJHW(): Promise<WhiteboardDocument> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jhw,application/json';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) {
          reject(new Error('No file selected'));
          return;
        }

        const file = target.files[0];
        try {
          const text = await file.text();
          const parsed: unknown = JSON.parse(text);

          if (!isPortableJHWPackage(parsed)) {
            resolve(validateDocument(parsed));
            return;
          }

          const validated = validateDocument(parsed.document);
          const assetsById = new Map(parsed.assets.map((asset) => [asset.id, asset]));
          for (const reference of collectAssetReferences(validated)) {
            const asset = assetsById.get(reference.id);
            if (!asset) {
              throw new Error(`Portable package is missing media asset "${reference.fileName || reference.id}".`);
            }
            if (asset.kind !== reference.kind) {
              throw new Error(`Portable package has an invalid media type for "${reference.fileName || reference.id}".`);
            }

            const blob = base64ToBlob(asset.data, asset.mimeType);
            await MediaManager.putAsset(blob, asset.kind, {
              id: asset.id,
              mimeType: asset.mimeType,
              fileName: asset.fileName,
            });
          }

          resolve(validated);
        } catch (err: any) {
          reject(new Error(`Failed to load .jhw file: ${err.message || err}`));
        }
      };

      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
      };

      input.click();
    });
  }
}
