import React, { useEffect } from 'react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { useWhiteboardStore } from '../../store';
import { CompassObject } from '../../types';

export const CompassTool: React.FC = () => {
  const engine = useWhiteboardStore((state) => state.engine);
  const toggleTeachingTool = useWhiteboardStore((state) => state.toggleTeachingTool);

  useEffect(() => {
    if (!engine) return;

    const transformer = engine.getTransformer();
    // Default position at center of screen
    const center = transformer.screenToWorld({ 
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2 
    });

    const zoom = transformer.getZoom();
    const defaultRadius = 150 / zoom;

    const compassObj: CompassObject = {
      id: `compass_${Date.now()}`,
      type: 'compass',
      x: center.x - defaultRadius,
      y: center.y - defaultRadius,
      width: defaultRadius * 2,
      height: defaultRadius * 2,
      centerX: center.x,
      centerY: center.y,
      radius: defaultRadius,
      angle: 0,
      rotation: 0,
      zIndex: engine.getObjects().length + 1,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    engine.getCommandManager().execute({
      id: `cmd_${Date.now()}`,
      name: 'Add Compass',
      execute: () => engine.addObject(compassObj),
      undo: () => engine.removeObject(compassObj.id),
      redo: () => engine.addObject(compassObj)
    });

    // Auto-select the newly added compass so its toolbar appears
    engine.setSelectedIds([compassObj.id]);

    // Unmount this React tool, the compass is now a true WhiteboardObject
    toggleTeachingTool('compass');

  }, [engine, toggleTeachingTool]);

  return null; // The compass is rendered by CanvasRenderer
};

export const registerCompassTool = () => {
  TeachingToolRegistry.register({
    id: 'compass',
    name: 'Compass',
    icon: 'Compass',
    description: 'Draw perfect circles and arcs',
    category: 'math',
    component: CompassTool,
    hasOverlay: false // No longer needs a React overlay
  });
};
