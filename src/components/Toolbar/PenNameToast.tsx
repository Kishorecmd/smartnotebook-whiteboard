import React, { useEffect } from 'react';
import { useWhiteboardStore } from '../../store';

/**
 * Briefly names the pen the teacher just picked. On a wall display the toolbar
 * is often out of the presenter's eyeline, so the confirmation appears centrally
 * and then gets out of the way.
 */
export const PenNameToast: React.FC = () => {
  const penName = useWhiteboardStore((s) => s.lastSelectedPenName);
  const clear = useWhiteboardStore((s) => s.clearLastSelectedPenName);

  useEffect(() => {
    if (!penName) return;
    const timer = setTimeout(clear, 1200);
    return () => clearTimeout(timer);
  }, [penName, clear]);

  if (!penName) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2">
      <div className="rounded-2xl bg-slate-900/90 px-5 py-2.5 text-base font-bold text-white shadow-2xl backdrop-blur-md">
        {penName}
      </div>
    </div>
  );
};
