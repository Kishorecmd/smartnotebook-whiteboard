import React from 'react';
import { useWhiteboardStore } from '../../store';
import { X, FileDown, Layers } from 'lucide-react';

export const PdfImportModal: React.FC = () => {
  const isPdfImportModalOpen = useWhiteboardStore((state) => state.isPdfImportModalOpen);
  const pendingPdfImages = useWhiteboardStore((state) => state.pendingPdfImages);
  const setPdfImportModalOpen = useWhiteboardStore((state) => state.setPdfImportModalOpen);
  const importPdfAsSlides = useWhiteboardStore((state) => state.importPdfAsSlides);
  const importPdfToCanvas = useWhiteboardStore((state) => state.importPdfToCanvas);

  if (!isPdfImportModalOpen || pendingPdfImages.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Import PDF</h2>
            <button
              onClick={() => setPdfImportModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            You are importing a PDF with {pendingPdfImages.length} page(s). How would you like to add it to the whiteboard?
          </p>

          <div className="space-y-3">
            <button
              onClick={importPdfAsSlides}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <Layers className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700">Import as Slides</h3>
                <p className="text-xs text-slate-500 group-hover:text-indigo-600/80">Each PDF page becomes a new whiteboard page.</p>
              </div>
            </button>

            <button
              onClick={importPdfToCanvas}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <FileDown className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700">Import to Canvas</h3>
                <p className="text-xs text-slate-500 group-hover:text-indigo-600/80">Add all pages vertically onto the current canvas.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
