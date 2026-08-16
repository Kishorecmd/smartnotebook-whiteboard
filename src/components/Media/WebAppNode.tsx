import React, { useState } from 'react';
import { WebAppObject } from '../../types';
import { useWhiteboardStore } from '../../store';
import { ExternalLink } from 'lucide-react';

interface WebAppNodeProps {
  object: WebAppObject;
}

export const WebAppNode: React.FC<WebAppNodeProps> = ({ object }) => {
  const [error, setError] = useState<boolean>(false);
  const isPresenterMode = useWhiteboardStore((state) => state.isPresenterMode);

  // Pointer events depend on interaction mode.
  // When not interactive (Edit Mode), pointer-events: none lets clicks pass through to canvas.
  // When interactive (Play Mode), pointer-events: auto captures clicks for web app.
  const pointerEvents = (object.isInteractive || isPresenterMode) ? 'auto' : 'none';

  return (
    <div
      className="webapp-object absolute bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}rad)`,
        transformOrigin: 'center center',
        pointerEvents,
      }}
    >
      {error ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center gap-4">
          <p className="text-lg">This website does not allow embedded viewing.</p>
          <a
            href={object.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <iframe
          id={`webapp-object-${object.id}`}
          title={object.title || 'Embedded Web App'}
          src={object.url}
          className="w-full h-full border-none bg-white"
          allow="camera; microphone; fullscreen; display-capture; geolocation; autoplay; clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onError={() => setError(true)}
          onLoad={() => {
             // Basic heuristic: if it's cross-origin and X-Frame-Options blocks it, it might trigger error
             // Browser handles CSP / X-Frame-Options natively and blocks it. We can't always catch it via JS due to cross-origin policies.
             // But we add standard sandbox attributes.
          }}
        />
      )}
    </div>
  );
};
