import React, { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';

// A minimal subset for the MVP
const ELEMENTS = [
  { symbol: 'H', name: 'Hydrogen', number: 1, group: 1, period: 1, type: 'nonmetal' },
  { symbol: 'He', name: 'Helium', number: 2, group: 18, period: 1, type: 'noble' },
  { symbol: 'Li', name: 'Lithium', number: 3, group: 1, period: 2, type: 'alkali' },
  { symbol: 'Be', name: 'Beryllium', number: 4, group: 2, period: 2, type: 'alkaline' },
  { symbol: 'B', name: 'Boron', number: 5, group: 13, period: 2, type: 'metalloid' },
  { symbol: 'C', name: 'Carbon', number: 6, group: 14, period: 2, type: 'nonmetal' },
  { symbol: 'N', name: 'Nitrogen', number: 7, group: 15, period: 2, type: 'nonmetal' },
  { symbol: 'O', name: 'Oxygen', number: 8, group: 16, period: 2, type: 'nonmetal' },
  { symbol: 'F', name: 'Fluorine', number: 9, group: 17, period: 2, type: 'halogen' },
  { symbol: 'Ne', name: 'Neon', number: 10, group: 18, period: 2, type: 'noble' },
  { symbol: 'Na', name: 'Sodium', number: 11, group: 1, period: 3, type: 'alkali' },
  { symbol: 'Mg', name: 'Magnesium', number: 12, group: 2, period: 3, type: 'alkaline' },
  { symbol: 'Al', name: 'Aluminum', number: 13, group: 13, period: 3, type: 'metal' },
  { symbol: 'Si', name: 'Silicon', number: 14, group: 14, period: 3, type: 'metalloid' },
  { symbol: 'P', name: 'Phosphorus', number: 15, group: 15, period: 3, type: 'nonmetal' },
  { symbol: 'S', name: 'Sulfur', number: 16, group: 16, period: 3, type: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine', number: 17, group: 17, period: 3, type: 'halogen' },
  { symbol: 'Ar', name: 'Argon', number: 18, group: 18, period: 3, type: 'noble' },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'nonmetal': return '#6ee7b7';
    case 'noble': return '#93c5fd';
    case 'alkali': return '#fca5a5';
    case 'alkaline': return '#fdba74';
    case 'metalloid': return '#d8b4fe';
    case 'halogen': return '#fcd34d';
    case 'metal': return '#cbd5e1';
    default: return '#e2e8f0';
  }
};

export const PeriodicTableTool: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<typeof ELEMENTS[0] | null>(null);

  return (
    <DraggableOverlay toolId="periodic-table" title="Periodic Table (First 18)">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc', width: '800px' }}>
        
        {/* Detail View */}
        <div style={{ 
          height: '100px', 
          marginBottom: '20px', 
          backgroundColor: selectedElement ? getTypeColor(selectedElement.type) : '#e2e8f0',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'background-color 0.3s ease'
        }}>
          {selectedElement ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1e293b' }}>{selectedElement.symbol}</div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{selectedElement.name}</div>
                <div style={{ fontSize: '14px', color: '#475569' }}>
                  Atomic Number: {selectedElement.number} | Group: {selectedElement.group} | Period: {selectedElement.period}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '18px' }}>Select an element to view details</div>
          )}
        </div>

        {/* Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(18, 1fr)', 
          gridTemplateRows: 'repeat(3, 1fr)', 
          gap: '4px',
          flex: 1
        }}>
          {ELEMENTS.map(el => (
            <div
              key={el.symbol}
              onClick={() => setSelectedElement(el)}
              style={{
                gridColumn: el.group,
                gridRow: el.period,
                backgroundColor: getTypeColor(el.type),
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: selectedElement?.symbol === el.symbol ? '2px solid #1e293b' : '2px solid transparent',
                transition: 'all 0.1s ease',
                position: 'relative'
              }}
            >
              <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '9px', color: '#475569' }}>{el.number}</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{el.symbol}</span>
            </div>
          ))}
        </div>

      </div>
    </DraggableOverlay>
  );
};

export const registerPeriodicTableTool = () => {
  TeachingToolRegistry.register({
    id: 'periodic-table',
    name: 'Periodic Table',
    icon: FlaskConical,
    category: 'SCIENCE',
    type: 'overlay-ui',
    description: 'Interactive periodic table of elements.',
    component: PeriodicTableTool,
  });
};
