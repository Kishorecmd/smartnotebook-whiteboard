import React from 'react';
import { Check } from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { PenRegistry, PenPreset } from '../../drawing/pens';

/**
 * The pen family selector. A compact popover anchored to the toolbar rather than
 * a full-screen modal, with 64px targets so it is usable on a wall-mounted
 * interactive display.
 */
export const PenFamilyPicker: React.FC = () => {
  const toolSettings = useWhiteboardStore((s) => s.toolSettings);
  const setActivePen = useWhiteboardStore((s) => s.setActivePen);
  const childFriendlyMode = useWhiteboardStore((s) => s.childFriendlyMode);

  const available = PenRegistry.getForMode(childFriendlyMode);
  const quick = available.filter((p) => p.group === 'quick');
  const more = available.filter((p) => p.group === 'more');

  const activeId = toolSettings.activePenId;

  const PenButton: React.FC<{ pen: PenPreset }> = ({ pen }) => {
    const isActive = pen.id === activeId;
    return (
      <button
        type="button"
        onClick={() => setActivePen(pen.id)}
        title={pen.name}
        aria-label={pen.name}
        aria-pressed={isActive}
        // 64px minimum touch target, per the large-display guidance.
        className={`relative flex min-h-[64px] min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400/60'
            : 'bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
        }`}
      >
        <span className={childFriendlyMode ? 'text-3xl leading-none' : 'text-2xl leading-none'}>
          {pen.icon}
        </span>
        <span className="text-[11px] font-semibold leading-none">{pen.name}</span>
        {isActive && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-white/20 p-0.5">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-[min(92vw,420px)] rounded-3xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {childFriendlyMode ? 'Pens' : 'Quick'}
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((pen) => (
          <PenButton key={pen.id} pen={pen} />
        ))}
      </div>

      {more.length > 0 && (
        <>
          <div className="mb-2 mt-3 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            More
          </div>
          <div className="flex flex-wrap gap-2">
            {more.map((pen) => (
              <PenButton key={pen.id} pen={pen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
