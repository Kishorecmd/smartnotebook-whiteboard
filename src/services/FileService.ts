import { WhiteboardDocument } from '../types';
import { validateDocument } from '../models';

export class FileService {
  /**
   * Serializes and downloads the whiteboard document as a .jhw file.
   */
  public static exportToJHW(doc: WhiteboardDocument, filename?: string): void {
    const validDoc = validateDocument(doc);
    const jsonString = JSON.stringify(validDoc, null, 2);
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
          const parsed = JSON.parse(text);
          const validated = validateDocument(parsed);
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
