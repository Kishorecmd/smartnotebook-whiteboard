import React from 'react';
import { Palette } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { useWhiteboardStore } from '../../store';

const COLORS = [
  '#000000', '#4b5563', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e',
  '#ffffff', '#94a3b8', '#fca5a5', '#fdba74', '#fef08a', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f0abfc', '#fda4af'
];

export const ColorPickerTool: React.FC = () => {
  const { updateToolSettings, toolSettings } = useWhiteboardStore();

  const handleColorSelect = (color: string) => {
    updateToolSettings({ color, textColor: color });
  };

  return (
    <DraggableOverlay toolId="color-picker" title="Color Palette">
      <div style={{ width: '540px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))', gap: '10px', backgroundColor: '#f8fafc' }}>
        {COLORS.map(color => (
          <button type="button" aria-label={`Choose color ${color}`} aria-pressed={toolSettings.color === color}
            key={color}
            onClick={() => handleColorSelect(color)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: color,
              cursor: 'pointer',
              border: toolSettings.color === color ? '3px solid #345f42' : '2px solid #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.1s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
    </DraggableOverlay>
  );
};

export const registerColorPickerTool = () => {
  TeachingToolRegistry.register({
    id: 'color-picker',
    name: 'Color Picker',
    icon: Palette,
    category: 'DRAWING',
    type: 'overlay-ui',
    description: 'Large color palette for selecting tool colors.',
    component: ColorPickerTool,
  });
};
