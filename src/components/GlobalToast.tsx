import React from 'react';
import { useWhiteboardStore } from '../store/useWhiteboardStore';

export const GlobalToast: React.FC = () => {
  const toastMessage = useWhiteboardStore((state) => state.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white text-sm rounded-full shadow-lg z-[9999] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {toastMessage}
    </div>
  );
};
