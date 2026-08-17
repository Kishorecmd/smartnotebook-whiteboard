import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Clock3,
  FileText,
  History,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { RecoveryCheckpoint, RecoveryCheckpointReason } from '../../types';
import { StorageService } from '../../services';
import { useWhiteboardStore } from '../../store';

const reasonLabels: Record<RecoveryCheckpointReason, string> = {
  autosave: 'Automatic recovery point',
  manual: 'Manual checkpoint',
  save: 'Saved version',
  'before-new': 'Before new board',
  'before-open': 'Before opening another board',
  'before-restore': 'Before previous restore',
};

export const VersionHistoryModal: React.FC = () => {
  const {
    document,
    isVersionHistoryModalOpen,
    setVersionHistoryModalOpen,
    createRecoveryCheckpoint,
    restoreRecoveryCheckpoint,
    showToast,
  } = useWhiteboardStore();
  const [checkpoints, setCheckpoints] = useState<RecoveryCheckpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<RecoveryCheckpoint | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RecoveryCheckpoint | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCheckpoints(await StorageService.listRecoveryCheckpoints(document.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load version history');
    } finally {
      setIsLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    if (isVersionHistoryModalOpen) void refresh();
  }, [isVersionHistoryModalOpen, refresh]);

  if (!isVersionHistoryModalOpen) return null;

  const handleCreate = async () => {
    setBusyId('create');
    try {
      const created = await createRecoveryCheckpoint();
      showToast(created ? 'Recovery checkpoint created' : 'No changes since the last checkpoint');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create checkpoint');
    } finally {
      setBusyId(null);
    }
  };

  const confirmRestore = async () => {
    const checkpoint = restoreCandidate;
    if (!checkpoint) return;
    setBusyId(checkpoint.id);
    try {
      await restoreRecoveryCheckpoint(checkpoint);
      setRestoreCandidate(null);
      setVersionHistoryModalOpen(false);
      showToast('Version restored. Save to keep it as the current version.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore this checkpoint');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const checkpoint = deleteCandidate;
    if (!checkpoint) return;
    setBusyId(checkpoint.id);
    try {
      await StorageService.deleteRecoveryCheckpoint(checkpoint.id, checkpoint.documentId);
      await StorageService.collectUnusedMedia([document]);
      setDeleteCandidate(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this checkpoint');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Version history and recovery checkpoints"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-100">Version History</h2>
              <p className="text-xs text-slate-400 truncate">Recovery points for {document.title}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close version history"
            onClick={() => setVersionHistoryModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={handleCreate}
            disabled={busyId !== null}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            {busyId === 'create' ? 'Creating checkpoint…' : 'Create recovery checkpoint now'}
          </button>
          <p className="mt-2 text-[11px] text-slate-500 text-center">
            Automatic checkpoints are retained periodically. Older automatic entries are pruned safely.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 p-3 bg-rose-950/40 border border-rose-800 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading version history…</div>
          ) : checkpoints.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No checkpoints yet. Create one before making a major change.
            </div>
          ) : (
            <div className="space-y-2">
              {checkpoints.map((checkpoint) => {
                const objectCount = checkpoint.document.pages.reduce(
                  (total, page) => total + page.objects.length,
                  0
                );
                const busy = busyId === checkpoint.id;
                return (
                  <article
                    key={checkpoint.id}
                    className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                          {checkpoint.label || reasonLabels[checkpoint.reason]}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            {new Date(checkpoint.createdAt).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {checkpoint.document.pages.length} pages
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {objectCount} objects
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-slate-700 text-[10px] text-slate-300 whitespace-nowrap">
                        {reasonLabels[checkpoint.reason]}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        type="button"
                        aria-label={`Delete checkpoint from ${new Date(checkpoint.createdAt).toLocaleString()}`}
                        onClick={() => setDeleteCandidate(checkpoint)}
                        disabled={busyId !== null}
                        className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-40 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestoreCandidate(checkpoint)}
                        disabled={busyId !== null}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                        Restore
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {restoreCandidate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-5 bg-slate-950/80 backdrop-blur-sm">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="restore-checkpoint-title"
              aria-describedby="restore-checkpoint-description"
              className="w-full max-w-md p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            >
              <h3 id="restore-checkpoint-title" className="text-base font-bold text-slate-100">
                Restore this checkpoint?
              </h3>
              <p id="restore-checkpoint-description" className="mt-2 text-sm text-slate-400 leading-relaxed">
                Restore “{restoreCandidate.document.title}” from{' '}
                {new Date(restoreCandidate.createdAt).toLocaleString()}? A safety checkpoint of the
                current board will be created first.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setRestoreCandidate(null)}
                  disabled={busyId !== null}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRestore}
                  disabled={busyId !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <RotateCcw className={`w-4 h-4 ${busyId ? 'animate-spin' : ''}`} />
                  {busyId ? 'Restoring…' : 'Restore checkpoint'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteCandidate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-5 bg-slate-950/80 backdrop-blur-sm">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-checkpoint-title"
              aria-describedby="delete-checkpoint-description"
              className="w-full max-w-md p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            >
              <h3 id="delete-checkpoint-title" className="text-base font-bold text-slate-100">
                Delete this checkpoint?
              </h3>
              <p id="delete-checkpoint-description" className="mt-2 text-sm text-slate-400 leading-relaxed">
                This removes the recovery point from {new Date(deleteCandidate.createdAt).toLocaleString()}.
                Media used only by this version may also be reclaimed.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={busyId !== null}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={busyId !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {busyId ? 'Deleting…' : 'Delete checkpoint'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
