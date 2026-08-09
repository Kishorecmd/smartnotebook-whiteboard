import React, { useState, useRef, useEffect } from 'react';
import { Compass as CompassIcon } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { useWhiteboardStore } from '../../store';
import { createStrokeObject } from '../../models';

export const CompassTool: React.FC = () => {
  const [position, setPosition] = useState({ x: 400, y: 300 });
  const [radius, setRadius] = useState(150);
  const [angle, setAngle] = useState(0); // in radians
  
  const isDraggingBody = useRef(false);
  const isDraggingPencil = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const currentStrokeId = useRef<string | null>(null);
  const lastAngle = useRef(0);

  const engine = useWhiteboardStore((state) => state.engine);

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (isDraggingBody.current) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
        lastPos.current = { x: e.clientX, y: e.clientY };
      } else if (isDraggingPencil.current && engine) {
        // Calculate new angle and radius
        const dx = e.clientX - position.x;
        const dy = e.clientY - position.y;
        const newRadius = Math.max(50, Math.sqrt(dx * dx + dy * dy));
        const newAngle = Math.atan2(dy, dx);
        
        setRadius(newRadius);
        setAngle(newAngle);
        
        // Draw the stroke
        const transformer = engine.getTransformer();
        const zoom = transformer.getZoom();
        const worldCenter = transformer.screenToWorld({ x: position.x, y: position.y });
        const worldPencil = transformer.screenToWorld({ x: e.clientX, y: e.clientY });
        
        if (!currentStrokeId.current) {
          const newStroke = createStrokeObject({
            tool: 'pen',
            points: [worldPencil],
            color: engine.getToolSettings().color,
            width: engine.getToolSettings().penWidth,
            opacity: 1,
            zIndex: engine.getObjects().length + 1
          });
          currentStrokeId.current = newStroke.id;
          engine.addObject(newStroke);
          lastAngle.current = newAngle;
        } else {
          // Update existing stroke
          const obj = engine.getObjects().find(o => o.id === currentStrokeId.current);
          if (obj && obj.type === 'stroke') {
            const updated = { ...obj };
            // Compute points between last angle and new angle to make a smooth arc
            let dTheta = newAngle - lastAngle.current;
            // Handle wrapping
            if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
            if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
            
            const steps = Math.max(2, Math.floor(Math.abs(dTheta) / (Math.PI / 18))); // point every 10 degrees
            const stepAngle = dTheta / steps;
            
            const newPoints = [];
            for (let i = 1; i <= steps; i++) {
              const a = lastAngle.current + i * stepAngle;
              newPoints.push({
                x: worldCenter.x + Math.cos(a) * (radius / zoom),
                y: worldCenter.y + Math.sin(a) * (radius / zoom)
              });
            }
            
            updated.points = [...updated.points, ...newPoints];
            
            // Recompute bounding box
            let minX = updated.x;
            let minY = updated.y;
            let maxX = updated.x + updated.width;
            let maxY = updated.y + updated.height;
            for (const pt of newPoints) {
              if (pt.x < minX) minX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y > maxY) maxY = pt.y;
            }
            updated.x = minX;
            updated.y = minY;
            updated.width = maxX - minX;
            updated.height = maxY - minY;

            engine.updateObjectsSilently([updated]);
            lastAngle.current = newAngle;
          }
        }
      }
    };

    const handleGlobalUp = () => {
      isDraggingBody.current = false;
      isDraggingPencil.current = false;
      currentStrokeId.current = null;
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [position.x, position.y, engine]);

  const onBodyDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingBody.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPencilDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingPencil.current = true;
    // Don't set lastPos for pencil, we track absolute relative to center
  };

  const pencilX = position.x + Math.cos(angle) * radius;
  const pencilY = position.y + Math.sin(angle) * radius;

  return (
    <div style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
      {/* Compass Needle / Body */}
      <div
        onPointerDown={onBodyDown}
        style={{
          position: 'absolute',
          left: position.x - 10,
          top: position.y - 10,
          width: 20,
          height: 20,
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          cursor: 'move',
          pointerEvents: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '2px solid white'
        }}
      >
        <div style={{ position: 'absolute', top: 8, left: 8, width: 4, height: 4, backgroundColor: 'white', borderRadius: '50%' }} />
      </div>

      {/* Compass Arm */}
      <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <line
          x1={position.x}
          y1={position.y}
          x2={pencilX}
          y2={pencilY}
          stroke="#94a3b8"
          strokeWidth="4"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Pencil */}
      <div
        onPointerDown={onPencilDown}
        style={{
          position: 'absolute',
          left: pencilX - 15,
          top: pencilY - 15,
          width: 30,
          height: 30,
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ width: 6, height: 6, backgroundColor: 'black', borderRadius: '50%' }} />
      </div>
    </div>
  );
};

export const registerCompassTool = () => {
  TeachingToolRegistry.register({
    id: 'compass',
    name: 'Compass',
    icon: CompassIcon,
    category: 'MATHEMATICS',
    type: 'overlay-ui',
    description: 'Interactive compass for drawing circles and arcs.',
    component: CompassTool,
  });
};
