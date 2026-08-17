import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  FileCode,
  Printer,
  FileJson,
  Download,
  FileDown,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { ExportService, FileService } from '../../services';

export const ExportModal: React.FC = () => {
  const {
    document: doc,
    activePageIndex,
    isExportModalOpen,
    setExportModalOpen,
    showToast,
  } = useWhiteboardStore();

  const [scale, setScale] = useState<number>(2);
  const [includeBackground, setIncludeBackground] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [scope, setScope] = useState<'page' | 'document'>('page');

  if (!isExportModalOpen) return null;

  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      if (scope === 'document') {
        await ExportService.exportDocumentArchive(doc, { format: 'png', scale, includeBackground, filename: doc.title });
      } else {
        await ExportService.exportPageToImage(activePage, {
          format: 'png', scale, includeBackground, filename: `${doc.title}_${activePage.title}`,
        });
      }
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export PNG images.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPEG = async () => {
    setIsExporting(true);
    try {
      if (scope === 'document') {
        await ExportService.exportDocumentArchive(doc, { format: 'jpeg', scale, quality: 0.95, includeBackground: true, filename: doc.title });
      } else {
        await ExportService.exportPageToImage(activePage, {
          format: 'jpeg', scale, quality: 0.95, includeBackground: true, filename: `${doc.title}_${activePage.title}`,
        });
      }
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export JPEG images.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    setIsExporting(true);
    try {
      if (scope === 'document') {
        await ExportService.exportDocumentArchive(doc, { format: 'svg', includeBackground, filename: doc.title });
      } else {
        await ExportService.exportPageToSVG(activePage, { filename: `${doc.title}_${activePage.title}`, includeBackground });
      }
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export SVG files.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await ExportService.exportDocumentToPDF(doc, { scale: Math.min(scale, 2), filename: doc.title });
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not generate the PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJHW = async () => {
    setIsExporting(true);
    try {
      await FileService.exportToJHW(doc, doc.title);
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export this whiteboard.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      await ExportService.printDocument(doc);
      setExportModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not prepare this whiteboard for printing.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export whiteboard"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Export Whiteboard</h2>
            <p className="text-xs text-slate-400">
              Save your whiteboard pages in various formats
            </p>
          </div>
          <button
            type="button"
            aria-label="Close export dialog"
            onClick={() => setExportModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-4">
          {/* Export Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PNG Export */}
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={isExporting}
              className="flex items-start gap-3 p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all text-left group active:scale-95"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  PNG Image
                </h3>
                <p className="text-xs text-slate-400">
                  High-res raster ({scale}x scale)
                </p>
              </div>
            </button>

            {/* JPEG Export */}
            <button
              type="button"
              onClick={handleExportJPEG}
              disabled={isExporting}
              className="flex items-start gap-3 p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all text-left group active:scale-95"
            >
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  JPEG Image
                </h3>
                <p className="text-xs text-slate-400">Compressed raster format</p>
              </div>
            </button>

            {/* SVG Export */}
            <button
              type="button"
              onClick={handleExportSVG}
              disabled={isExporting}
              className="flex items-start gap-3 p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all text-left group active:scale-95"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  SVG Vector
                </h3>
                <p className="text-xs text-slate-400">Portable vectors with embedded media</p>
              </div>
            </button>

            {/* Real multi-page PDF export */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-start gap-3 p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all text-left group active:scale-95"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  Multi-page PDF
                </h3>
                <p className="text-xs text-slate-400">One downloadable PDF with every page</p>
              </div>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="flex items-start gap-3 p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all text-left group active:scale-95 sm:col-span-2"
            >
              <div className="p-2.5 rounded-xl bg-slate-500/20 text-slate-300 group-hover:scale-110 transition-transform"><Printer className="w-5 h-5" /></div>
              <div><h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">Print</h3><p className="text-xs text-slate-400">Open the browser print dialog for all pages</p></div>
            </button>
          </div>

          {/* JHW Whiteboard Project File */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleExportJHW}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary-900/40 to-indigo-900/40 hover:from-primary-900/60 hover:to-indigo-900/60 border border-primary-500/40 rounded-2xl transition-all text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-500/30 text-primary-300">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Jaihind Document (.jhw)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Complete multi-page project file, including local media
                  </p>
                </div>
              </div>
              <Download className="w-5 h-5 text-primary-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>

          {/* Export Settings */}
          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium text-slate-400">PNG, JPEG and SVG:</span>
            <div className="flex rounded-lg bg-slate-800 p-1">
              <button type="button" onClick={() => setScope('page')} className={`px-3 py-1 rounded-md ${scope === 'page' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}>Current page</button>
              <button type="button" onClick={() => setScope('document')} className={`px-3 py-1 rounded-md ${scope === 'document' ? 'bg-primary-600 text-white' : 'text-slate-400'}`}>All pages (.zip)</button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-400">Image Scale:</span>
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                    scale === s
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                className="accent-primary-500 rounded"
              />
              <span>Background</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
