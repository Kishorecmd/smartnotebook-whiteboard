import React, { useState } from 'react';
import { YouTubeVideoObject } from '../../types';
import { useWhiteboardStore } from '../../store';

interface YouTubePlayerNodeProps {
  object: YouTubeVideoObject;
}

export const YouTubePlayerNode: React.FC<YouTubePlayerNodeProps> = ({ object }) => {
  const [error, setError] = useState<boolean>(false);
  const isPresenterMode = useWhiteboardStore((state) => state.isPresenterMode);

  // We construct the iframe URL cleanly for nocookie domain.
  // Using URLSearchParams ensures values are properly encoded.
  const query = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    autoplay: (object.autoplay || object.isInteractive || isPresenterMode) ? '1' : '0',
    mute: object.muted ? '1' : '0',
    controls: object.controls ? '1' : '0',
  });

  if (object.startTime > 0) {
    query.set('start', Math.floor(object.startTime).toString());
  }

  const iframeSrc = `https://www.youtube-nocookie.com/embed/${object.videoId}?${query.toString()}`;

  // Pointer events depend on interaction mode.
  // When not interactive (Edit Mode), pointer-events: none lets clicks pass through to canvas.
  // When interactive (Play Mode), pointer-events: auto captures clicks for video controls.
  const pointerEvents = (object.isInteractive || isPresenterMode) ? 'auto' : 'none';

  return (
    <div
      className="youtube-object absolute"
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
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white p-4 text-center">
          <p>This video does not allow embedded playback. Please choose another video.</p>
        </div>
      ) : (
        <iframe
          id={`youtube-player-object-${object.id}`}
          title={object.title || 'YouTube video player'}
          src={iframeSrc}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      )}
    </div>
  );
};
