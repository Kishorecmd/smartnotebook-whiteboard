import { AlertTriangle, Trash2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

export const ClearConfirmModal: React.FC = () => {
  const { isClearDialogOpen, setClearDialogOpen, clearActivePage } = useWhiteboardStore();

  if (!isClearDialogOpen) return null;

  const handleConfirm = () => {
    clearActivePage();
    setClearDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-5 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-100 mb-1">
          Clear Current Page?
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          This will erase all strokes on this page. (You can still undo with Ctrl+Z).
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={() => setClearDialogOpen(false)}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
