import React, { useEffect, useRef, useState } from 'react';
import { YouTubeVideoObject } from '../../types';
import { useWhiteboardStore } from '../../store';

interface YouTubeVideoProps {
  video: YouTubeVideoObject;
}

// Global registry for YouTube players so the contextual toolbar can access them
if (!(window as any).youtubePlayers) {
  (window as any).youtubePlayers = new Map<string, any>();
}

let apiLoaded = false;
let apiLoading = false;
const onApiLoadCallbacks: (() => void)[] = [];

function loadYouTubeApi(callback: () => void) {
  if (apiLoaded) {
    callback();
    return;
  }
  onApiLoadCallbacks.push(callback);
  
  if (apiLoading) return;
  apiLoading = true;

  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  
  (window as any).onYouTubeIframeAPIReady = () => {
    apiLoaded = true;
    onApiLoadCallbacks.forEach(cb => cb());
    onApiLoadCallbacks.length = 0;
  };
  
  document.body.appendChild(script);
}

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ video }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  
  // Track if this video is currently the one interactive
  const interactiveVideoId = useWhiteboardStore(state => state.interactiveVideoId);
  const isInteractive = interactiveVideoId === video.id;

  // Track if this video is currently the one selected
  const selectedIds = useWhiteboardStore(state => state.selectedIds);
  const isSelected = selectedIds.length === 1 && selectedIds[0] === video.id;

  // Whenever selection changes, if we get deselected, exit interactive mode
  // (This is now handled by the store automatically when selection is cleared)

  useEffect(() => {
    let mounted = true;

    loadYouTubeApi(() => {
      if (!mounted || !containerRef.current) return;
      
      const playerDiv = document.createElement('div');
      containerRef.current.appendChild(playerDiv);

      const player = new (window as any).YT.Player(playerDiv, {
        videoId: video.videoId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: video.autoplay ? 1 : 0,
          controls: video.controls ? 1 : 0,
          mute: video.muted ? 1 : 0,
          start: video.startTime || 0,
          rel: 0,
          modestbranding: 1,
          fs: 1
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = player;
            (window as any).youtubePlayers.set(video.id, player);
          }
        }
      });
    });

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        (window as any).youtubePlayers.delete(video.id);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [video.videoId]); // Remount entirely if video ID changes. We don't remount on size/position changes!

  // In standard mode, the iframe is pointer-events: none, so touch goes to the canvas (which is z-index 10)
  // Wait, the canvas is on top! So touches ALWAYS hit the canvas!
  // If the canvas is above this, how do we ever interact with the video?
  // We need to punch a hole for pointer events? No, we can't punch a hole for pointer events in canvas easily without clip-path or pointer-events: none on canvas.
  // Actually, if the Canvas has pointer-events: auto, it will ALWAYS swallow touches!
  
  return (
    <div 
      style={{
        position: 'absolute',
        left: `${video.x}px`,
        top: `${video.y}px`,
        width: `${video.width}px`,
        height: `${video.height}px`,
        transformOrigin: 'center',
        transform: `rotate(${video.rotation}rad)`,
        zIndex: isInteractive ? 100 : (video.zIndex || 0),
        backgroundColor: '#000', // standard for videos
        pointerEvents: isInteractive ? 'auto' : 'none',
      }}
    >
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          pointerEvents: isInteractive ? 'auto' : 'none' 
        }} 
      />
      {/* If not interactive, show an invisible drag surface just in case */}
      {!isInteractive && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      )}
    </div>
  );
};
