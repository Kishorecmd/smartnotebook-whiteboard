import React, { useState, useRef, useEffect } from 'react';
import { PlaySquare, X, Play } from 'lucide-react';
import { useWhiteboardStore } from '../../store';
import { YouTubeUrlParser } from '../../media/youtube/YouTubeUrlParser';
import { v4 as uuidv4 } from 'uuid';
import { YouTubeVideoObject } from '../../types';

export const YouTubeDialog: React.FC = () => {
  const { isYouTubeDialogOpen, setYouTubeDialogOpen, engine } = useWhiteboardStore();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isYouTubeDialogOpen) {
      setUrl('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isYouTubeDialogOpen]);

  if (!isYouTubeDialogOpen) return null;

  const handleClose = () => {
    setYouTubeDialogOpen(false);
  };

  const handleAdd = () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const videoId = YouTubeUrlParser.extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL. Please check and try again.');
      return;
    }

    if (engine) {
      // Calculate center of current viewport
      const canvasRect = engine.getCanvas().getBoundingClientRect();
      const center = engine.getTransformer().screenToWorld({
        x: canvasRect.width / 2,
        y: canvasRect.height / 2,
      });

      // Standard YouTube aspect ratio is 16:9
      const defaultWidth = 480;
      const defaultHeight = 270;

      const videoObject: YouTubeVideoObject = {
        id: uuidv4(),
        type: 'youtubeVideo',
        videoId,
        originalUrl: url,
        x: center.x - defaultWidth / 2,
        y: center.y - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        visible: true,
        locked: false,
        zIndex: 0,
        autoplay: false,
        muted: false,
        controls: true,
        startTime: YouTubeUrlParser.extractStartTime(url),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.addObject(videoObject);
      engine.setTool('select');
      useWhiteboardStore.getState().setSelectedIds([videoObject.id]);
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add YouTube video"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-red-500">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <PlaySquare className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Add YouTube Video</h2>
          </div>
          <button 
            type="button"
            aria-label="Close YouTube dialog"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Paste YouTube URL
          </label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            autoComplete="off"
            spellCheck="false"
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          
          <div className="mt-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400 font-medium mb-1">Supported formats:</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>• https://youtu.be/VIDEO_ID</li>
              <li>• https://www.youtube.com/shorts/VIDEO_ID</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-auto">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/20 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </div>
    </div>
  );
};
