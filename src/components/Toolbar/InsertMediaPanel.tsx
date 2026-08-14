import React, { useState } from 'react';
import { MediaRegistry } from '../../media/MediaRegistry';
import { MediaKind } from '../../media/MediaTypes';

const LAST_KIND_KEY = 'jhw_last_media_kind';

interface InsertMediaPanelProps {
  onInsert: (kind: MediaKind) => void;
}

/**
 * The INSERT MEDIA panel. Built from the media registry rather than a hard-coded
 * list, so registering a new kind adds a card here automatically.
 *
 * Cards are large because this is used on a wall-mounted display with a finger,
 * and the last kind used is remembered and shown first -- a teacher who inserts
 * images all day should not hunt for the same card every time.
 */
export const InsertMediaPanel: React.FC<InsertMediaPanelProps> = ({ onInsert }) => {
  const [lastKind, setLastKind] = useState<MediaKind | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_KIND_KEY) as MediaKind | null;
      return saved && MediaRegistry.get(saved) ? saved : null;
    } catch {
      return null;
    }
  });

  const choose = (kind: MediaKind) => {
    try {
      localStorage.setItem(LAST_KIND_KEY, kind);
    } catch {
      // Remembering is a convenience, never a requirement.
    }
    setLastKind(kind);
    onInsert(kind);
  };

  const Card: React.FC<{ kind: MediaKind }> = ({ kind }) => {
    const d = MediaRegistry.get(kind);
    if (!d) return null;
    const isLast = kind === lastKind;
    return (
      <button
        type="button"
        onClick={() => choose(kind)}
        title={d.description}
        aria-label={d.label}
        // 64px floor for a finger on a large display.
        className={`flex min-h-[64px] flex-1 basis-[150px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
          isLast
            ? 'bg-indigo-600/90 text-white ring-2 ring-indigo-400/60'
            : 'bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
        }`}
      >
        <span className="text-2xl leading-none">{d.icon}</span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-bold leading-tight">{d.label}</span>
          <span className="truncate text-[11px] opacity-70">{d.description}</span>
        </span>
      </button>
    );
  };

  const local = MediaRegistry.getByGroup('local');
  const online = MediaRegistry.getByGroup('online');

  return (
    <div className="w-[min(94vw,470px)] rounded-3xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-2 px-1 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Insert Media
      </div>

      {lastKind && (
        <>
          <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            Last used
          </div>
          <div className="mb-3 flex">
            <Card kind={lastKind} />
          </div>
        </>
      )}

      <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Local
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {local.map((d) => (
          <Card key={d.kind} kind={d.kind} />
        ))}
      </div>

      <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Online
      </div>
      <div className="flex flex-wrap gap-2">
        {online.map((d) => (
          <Card key={d.kind} kind={d.kind} />
        ))}
      </div>
    </div>
  );
};
