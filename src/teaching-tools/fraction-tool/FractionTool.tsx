import React, { useState } from 'react';
import { PieChart, Plus, Minus } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';

export const FractionTool: React.FC = () => {
  const [denominator, setDenominator] = useState(4);
  const [numerator, setNumerator] = useState(1);

  const handleDenominatorChange = (delta: number) => {
    const newDenom = Math.max(1, Math.min(24, denominator + delta));
    setDenominator(newDenom);
    if (numerator > newDenom) setNumerator(newDenom);
  };

  const handleNumeratorChange = (delta: number) => {
    const newNum = Math.max(0, Math.min(denominator, numerator + delta));
    setNumerator(newNum);
  };

  // Generate SVG pie slices
  const getSlices = () => {
    const slices = [];
    const angle = 360 / denominator;
    
    for (let i = 0; i < denominator; i++) {
      const startAngle = i * angle;
      const endAngle = (i + 1) * angle;
      const isFilled = i < numerator;
      
      const startX = 100 + 100 * Math.cos((startAngle - 90) * (Math.PI / 180));
      const startY = 100 + 100 * Math.sin((startAngle - 90) * (Math.PI / 180));
      const endX = 100 + 100 * Math.cos((endAngle - 90) * (Math.PI / 180));
      const endY = 100 + 100 * Math.sin((endAngle - 90) * (Math.PI / 180));
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = denominator === 1 
        ? `M 100 0 A 100 100 0 1 1 99.9 0 Z`
        : `M 100 100 L ${startX} ${startY} A 100 100 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
        
      slices.push(
        <path
          key={i}
          d={pathData}
          fill={isFilled ? '#3b82f6' : '#f1f5f9'}
          stroke="#1e293b"
          strokeWidth="2"
        />
      );
    }
    
    return slices;
  };

  return (
    <DraggableOverlay toolId="fraction-tool" title="Fractions">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#ffffff' }}>
        
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ marginBottom: '30px' }}>
          {getSlices()}
        </svg>
        
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          {/* Numerator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => handleNumeratorChange(1)} style={btnStyle}><Plus size={16} /></button>
            <div style={{ fontSize: '32px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{numerator}</div>
            <button onClick={() => handleNumeratorChange(-1)} style={btnStyle}><Minus size={16} /></button>
          </div>
          
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#94a3b8' }}>/</div>
          
          {/* Denominator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => handleDenominatorChange(1)} style={btnStyle}><Plus size={16} /></button>
            <div style={{ fontSize: '32px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{denominator}</div>
            <button onClick={() => handleDenominatorChange(-1)} style={btnStyle}><Minus size={16} /></button>
          </div>
        </div>
        
      </div>
    </DraggableOverlay>
  );
};

const btnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#e2e8f0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  color: '#334155'
};

export const registerFractionTool = () => {
  TeachingToolRegistry.register({
    id: 'fraction-tool',
    name: 'Fractions',
    icon: PieChart,
    category: 'MATHEMATICS',
    type: 'overlay-ui',
    description: 'Interactive fraction visualizer.',
    component: FractionTool,
  });
};
