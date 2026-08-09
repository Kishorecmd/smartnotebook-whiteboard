import React, { useState } from 'react';
import { CircleDot } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';

export const TrafficLightTool: React.FC = () => {
  const [activeLight, setActiveLight] = useState<'red' | 'yellow' | 'green' | null>('red');

  const getOpacity = (color: string) => activeLight === color ? 1 : 0.2;
  const getShadow = (color: string) => activeLight === color ? `0 0 40px ${color}` : 'none';

  return (
    <DraggableOverlay toolId="traffic-light" title="Traffic Light">
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', boxSizing: 'border-box', backgroundColor: '#e2e8f0' }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '20px',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {/* Red Light */}
          <div 
            onClick={() => setActiveLight('red')}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              opacity: getOpacity('red'),
              boxShadow: getShadow('#ef4444'),
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
          {/* Yellow Light */}
          <div 
            onClick={() => setActiveLight('yellow')}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#eab308',
              opacity: getOpacity('yellow'),
              boxShadow: getShadow('#eab308'),
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
          {/* Green Light */}
          <div 
            onClick={() => setActiveLight('green')}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              opacity: getOpacity('green'),
              boxShadow: getShadow('#22c55e'),
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>
    </DraggableOverlay>
  );
};

export const registerTrafficLightTool = () => {
  TeachingToolRegistry.register({
    id: 'traffic-light',
    name: 'Traffic Light',
    icon: CircleDot,
    category: 'CLASSROOM',
    type: 'overlay-ui',
    description: 'Traffic light to manage classroom activities.',
    component: TrafficLightTool,
  });
};
