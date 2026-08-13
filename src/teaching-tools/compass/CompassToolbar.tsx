import React from 'react';
import { CompassObject } from '../../types';
import { useWhiteboardStore } from '../../store';
import { createId } from '../../utils';
import { CircleObject, ArcObject } from '../../types';

interface CompassToolbarProps {
  compass: CompassObject;
}

export const CompassToolbar: React.FC<CompassToolbarProps> = ({ compass }) => {
  const engine = useWhiteboardStore((state) => state.engine);

  if (!engine) return null;

  const handleDrawCircle = () => {
    const circle: CircleObject = {
      id: `circle_${Date.now()}`,
      type: 'circle',
      x: compass.centerX - compass.radius,
      y: compass.centerY - compass.radius,
      width: compass.radius * 2,
      height: compass.radius * 2,
      centerX: compass.centerX,
      centerY: compass.centerY,
      radius: compass.radius,
      strokeColor: engine.getToolSettings().color || '#000000',
      strokeWidth: engine.getToolSettings().penWidth || 4,
      opacity: 1,
      rotation: 0,
      zIndex: engine.getObjects().length + 1,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    engine.getCommandManager().execute({
      id: `cmd_${Date.now()}`,
      name: 'Draw Circle',
      execute: () => engine.addObject(circle),
      undo: () => engine.removeObject(circle.id),
      redo: () => engine.addObject(circle)
    });
  };

  const handleDrawArc = () => {
    // We'll draw an arc from 0 to the current compass angle, or maybe -PI/4 to angle.
    // Actually, drawing an arc requires start/end. The user spec says "Draw Arc", so maybe draw a semicircle or arc based on angle?
    // Let's draw an arc covering 90 degrees starting from current angle.
    const startAngle = compass.angle;
    const endAngle = compass.angle + Math.PI / 2;
    
    const arc: ArcObject = {
      id: `arc_${Date.now()}`,
      type: 'arc',
      x: compass.centerX - compass.radius,
      y: compass.centerY - compass.radius,
      width: compass.radius * 2,
      height: compass.radius * 2,
      centerX: compass.centerX,
      centerY: compass.centerY,
      radius: compass.radius,
      startAngle,
      endAngle,
      strokeColor: engine.getToolSettings().color || '#000000',
      strokeWidth: engine.getToolSettings().penWidth || 4,
      opacity: 1,
      rotation: 0,
      zIndex: engine.getObjects().length + 1,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    engine.getCommandManager().execute({
      id: `cmd_${Date.now()}`,
      name: 'Draw Arc',
      execute: () => engine.addObject(arc),
      undo: () => engine.removeObject(arc.id),
      redo: () => engine.addObject(arc)
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-1 rounded">
        r = {Math.round(compass.radius)} px
      </div>
      <button
        type="button"
        onClick={handleDrawCircle}
        className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-blue-400 border border-blue-900/50 hover:bg-blue-900/40 hover:text-blue-300"
      >
        Draw Circle
      </button>
      <button
        type="button"
        onClick={handleDrawArc}
        className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-indigo-400 border border-indigo-900/50 hover:bg-indigo-900/40 hover:text-indigo-300"
      >
        Draw Arc
      </button>
      <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5" />
    </div>
  );
};
