import React, { useEffect, useRef, useState } from 'react';
import { WhiteboardEngine } from '../../engine/WhiteboardEngine';
import { YouTubeVideoObject, WebAppObject, WhiteboardObject } from '../../types';
import { YouTubePlayerNode } from './YouTubePlayerNode';
import { WebAppNode } from './WebAppNode';

interface MediaLayerProps {
  engine: WhiteboardEngine;
}

export const MediaLayer: React.FC<MediaLayerProps> = ({ engine }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const [youtubeObjects, setYoutubeObjects] = useState<YouTubeVideoObject[]>([]);
  const [webAppObjects, setWebAppObjects] = useState<WebAppObject[]>([]);
  
  useEffect(() => {
    let animationFrameId: number;
    let lastTransformStr = '';
    
    // Poll the camera transform from the engine and apply it via CSS transform
    // This avoids triggering expensive React re-renders on every camera pan frame.
    const updateTransform = () => {
      if (layerRef.current) {
        const transformer = engine.getTransformer();
        const transform = transformer.getTransform();
        const newTransformStr = `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`;
        
        if (newTransformStr !== lastTransformStr) {
          layerRef.current.style.transform = newTransformStr;
          lastTransformStr = newTransformStr;
        }
      }
      animationFrameId = requestAnimationFrame(updateTransform);
    };
    
    animationFrameId = requestAnimationFrame(updateTransform);
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine]);

  useEffect(() => {
    let animationFrameId: number;
    let lastStateStr = '';

    const checkObjects = () => {
      const allObjects = engine.getObjects();
      const ytObjects = allObjects.filter((obj: WhiteboardObject) => obj.type === 'youtubeVideo') as YouTubeVideoObject[];
      const waObjects = allObjects.filter((obj: WhiteboardObject) => obj.type === 'webApp') as WebAppObject[];
      
      // We only care if id, position, size, rotation, or isInteractive changes.
      // Stringifying a projection of these properties is extremely fast.
      const stateStr = JSON.stringify([
        ytObjects.map(o => `${o.id}-${o.x}-${o.y}-${o.width}-${o.height}-${o.rotation}-${!!o.isInteractive}`),
        waObjects.map(o => `${o.id}-${o.x}-${o.y}-${o.width}-${o.height}-${o.rotation}-${!!o.isInteractive}-${o.url}`)
      ]);
      
      if (stateStr !== lastStateStr) {
        lastStateStr = stateStr;
        setYoutubeObjects(ytObjects);
        setWebAppObjects(waObjects);
      }
      
      animationFrameId = requestAnimationFrame(checkObjects);
    };

    animationFrameId = requestAnimationFrame(checkObjects);
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine]);

  if (youtubeObjects.length === 0) return null;

  return (
    <div 
      className="whiteboard-media-layer absolute inset-0 pointer-events-none overflow-hidden" 
      style={{ zIndex: 25 }}
    >
      <div ref={layerRef} className="absolute inset-0 origin-top-left pointer-events-none transform-gpu">
        {youtubeObjects.map(obj => (
          <YouTubePlayerNode key={obj.id} object={obj} />
        ))}
        {webAppObjects.map(obj => (
          <WebAppNode key={obj.id} object={obj} />
        ))}
      </div>
    </div>
  );
};
