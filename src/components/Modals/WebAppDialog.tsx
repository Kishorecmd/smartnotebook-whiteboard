import React, { useState, useRef, useEffect } from 'react';
import { Globe, X, Globe2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { WebAppObject } from '../../types';

export const WebAppDialog: React.FC = () => {
  const { isWebAppDialogOpen, setWebAppDialogOpen, engine } = useWhiteboardStore();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isWebAppDialogOpen) {
      setUrl('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isWebAppDialogOpen]);

  if (!isWebAppDialogOpen) return null;

  const handleClose = () => {
    setWebAppDialogOpen(false);
  };

  const handleAdd = () => {
    let finalUrl = url.trim();
    if (!finalUrl) {
      setError('Please enter a website URL');
      return;
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError('Invalid URL. Please check and try again.');
      return;
    }

    if (engine) {
      // Calculate center of current viewport
      const canvasRect = engine.getCanvas().getBoundingClientRect();
      const center = engine.getTransformer().screenToWorld({
        x: canvasRect.width / 2,
        y: canvasRect.height / 2,
      });

      // Default aspect ratio, large enough to be useful
      const defaultWidth = 800;
      const defaultHeight = 600;

      const webAppObject: WebAppObject = {
        id: uuidv4(),
        type: 'webApp',
        url: finalUrl,
        title: finalUrl, // Fallback title
        x: center.x - defaultWidth / 2,
        y: center.y - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        visible: true,
        locked: false,
        zIndex: 0,
        isInteractive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.addObject(webAppObject);
      engine.setTool('select');
      useWhiteboardStore.getState().setSelectedIds([webAppObject.id]);
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Embed website"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-sky-400">
            <div className="p-2 bg-sky-500/20 rounded-xl">
              <Globe className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Embed Website</h2>
          </div>
          <button 
            type="button"
            aria-label="Close website dialog"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Website URL
            </label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                } else if (e.key === 'Escape') {
                  handleClose();
                }
              }}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-medium shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Globe2 className="w-5 h-5" />
              Embed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
