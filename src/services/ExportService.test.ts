import { describe, expect, it, vi } from 'vitest';

vi.mock('../media/pdf/PdfRenderer', () => ({
  PdfRenderer: { renderForExport: vi.fn() },
}));

import { buildPdfFromJpegPages, buildStoredZip } from './ExportService';

describe('ExportService binary document builders', () => {
  it('builds a parseable two-page PDF object tree and cross-reference table', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const blob = buildPdfFromJpegPages([
      { jpeg, pixelWidth: 100, pixelHeight: 50, pageWidth: 75, pageHeight: 37.5 },
      { jpeg, pixelWidth: 50, pixelHeight: 100, pageWidth: 37.5, pageHeight: 75 },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder().decode(bytes);

    expect(blob.type).toBe('application/pdf');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Type /Pages /Count 2');
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    const xrefOffset = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(new TextDecoder().decode(bytes.slice(xrefOffset, xrefOffset + 4))).toBe('xref');
    expect(text.endsWith('%%EOF')).toBe(true);
  });

  it('packages all exported pages into one standards-shaped ZIP archive', async () => {
    const blob = buildStoredZip([
      { name: '01_Page_One.svg', bytes: new TextEncoder().encode('<svg/>') },
      { name: '02_Page_Two.svg', bytes: new TextEncoder().encode('<svg><text>2</text></svg>') },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    const text = new TextDecoder().decode(bytes);

    expect(blob.type).toBe('application/zip');
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(text).toContain('01_Page_One.svg');
    expect(text).toContain('02_Page_Two.svg');
  });
});
