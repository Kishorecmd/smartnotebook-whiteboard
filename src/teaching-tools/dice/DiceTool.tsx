import React, { useState } from 'react';
import { Dices } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';

export const DiceTool: React.FC = () => {
  const [value, setValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    
    let rolls = 0;
    const maxRolls = 10;
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls >= maxRolls) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 50);
  };

  const getDots = (val: number) => {
    const dots = [];
    if ([1, 3, 5].includes(val)) dots.push({ top: '50%', left: '50%' }); // Center
    if ([2, 3, 4, 5, 6].includes(val)) {
      dots.push({ top: '20%', left: '20%' }); // Top Left
      dots.push({ top: '80%', left: '80%' }); // Bottom Right
    }
    if ([4, 5, 6].includes(val)) {
      dots.push({ top: '20%', left: '80%' }); // Top Right
      dots.push({ top: '80%', left: '20%' }); // Bottom Left
    }
    if (val === 6) {
      dots.push({ top: '50%', left: '20%' }); // Middle Left
      dots.push({ top: '50%', left: '80%' }); // Middle Right
    }
    return dots;
  };

  return (
    <DraggableOverlay toolId="dice" title="Dice">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        <div 
          onClick={rollDice}
          style={{
            width: '120px',
            height: '120px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1), inset 0 -4px 8px rgba(0,0,0,0.05)',
            position: 'relative',
            cursor: 'pointer',
            transform: isRolling ? 'scale(0.95) rotate(15deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.1s ease-in-out',
          }}
        >
          {getDots(value).map((dot, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '24px',
              height: '24px',
              backgroundColor: '#1e293b',
              borderRadius: '50%',
              top: dot.top,
              left: dot.left,
              transform: 'translate(-50%, -50%)'
            }} />
          ))}
        </div>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          Tap to roll
        </p>
      </div>
    </DraggableOverlay>
  );
};

export const registerDiceTool = () => {
  TeachingToolRegistry.register({
    id: 'dice',
    name: 'Dice',
    icon: Dices,
    category: 'CLASSROOM',
    type: 'overlay-ui',
    description: 'Interactive dice for classroom games.',
    component: DiceTool,
  });
};
