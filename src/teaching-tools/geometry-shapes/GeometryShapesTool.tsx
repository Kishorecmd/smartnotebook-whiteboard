import React from 'react';
import { Shapes, Triangle, Square, Hexagon } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { useWhiteboardStore } from '../../store';
import { createStrokeObject } from '../../models';

// Shape paths assuming a 100x100 bounding box
const SHAPES = [
  { name: 'Triangle', icon: Triangle, path: [[50,0], [100,100], [0,100], [50,0]] },
  { name: 'Square', icon: Square, path: [[0,0], [100,0], [100,100], [0,100], [0,0]] },
  { name: 'Hexagon', icon: Hexagon, path: [[50,0], [100,25], [100,75], [50,100], [0,75], [0,25], [50,0]] },
];

export const GeometryShapesTool: React.FC = () => {
  const { engine } = useWhiteboardStore();

  const addShape = (path: number[][]) => {
    if (!engine) return;
    
    const transformer = engine.getTransformer();
    const center = transformer.screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    const scale = 2; // Size multiplier
    const points = path.map(([x, y]) => ({
      x: center.x - 100 + (x * scale),
      y: center.y - 100 + (y * scale)
    }));
    
    const stroke = createStrokeObject({
      tool: 'pen',
      points,
      color: engine.getToolSettings().color,
      width: engine.getToolSettings().penWidth,
      opacity: 1,
      zIndex: engine.getObjects().length + 1
    });
    
    engine.addObject(stroke);
  };

  return (
    <DraggableOverlay toolId="geometry-shapes" title="Geometry Shapes">
      <div style={{ padding: '20px', display: 'flex', gap: '16px', backgroundColor: '#f8fafc' }}>
        {SHAPES.map(shape => (
          <button
            key={shape.name}
            onClick={() => addShape(shape.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <shape.icon size={32} />
            <span style={{ fontSize: '12px' }}>{shape.name}</span>
          </button>
        ))}
      </div>
    </DraggableOverlay>
  );
};

export const registerGeometryShapesTool = () => {
  TeachingToolRegistry.register({
    id: 'geometry-shapes',
    name: 'Geometry Shapes',
    icon: Shapes,
    category: 'MATHEMATICS',
    type: 'overlay-ui',
    description: 'Insert perfect geometric shapes.',
    component: GeometryShapesTool,
  });
};
