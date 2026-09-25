import React from 'react';
import { useWhiteboardStore } from '../../store';
import type { AutoGroupingMode } from '../../engine/HandwritingGrouping';

export const AutoGroupingControl: React.FC = () => {
  const mode = useWhiteboardStore(s => s.toolSettings.autoGrouping ?? 'words');
  const update = useWhiteboardStore(s => s.updateToolSettings);
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <span>Auto-group</span>
      <select aria-label="Automatic handwriting grouping" value={mode}
        onChange={e => update({ autoGrouping: e.target.value as AutoGroupingMode })}
        title="Join nearby strokes while writing. Pause or start a new line to begin a new group."
        className="rounded-md bg-slate-800 px-2 py-1 font-semibold text-white">
        <option value="off">Off</option>
        <option value="words">Words</option>
        <option value="sentences">Sentences</option>
      </select>
    </label>
  );
};
