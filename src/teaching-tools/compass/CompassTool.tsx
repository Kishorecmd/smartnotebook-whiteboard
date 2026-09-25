import { Compass } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { CompassObject, Point } from '../../types';
import { generateId } from '../../utils';

export const createCompassObject = (center: Point): CompassObject => ({
  id: generateId('compass'), type: 'compass', x: center.x - 150, y: center.y - 150,
  width: 300, height: 300, centerX: center.x, centerY: center.y, radius: 150, angle: 0,
  rotation: 0, zIndex: 100, visible: true, locked: false, createdAt: Date.now(), updatedAt: Date.now()
});
export const registerCompassTool = () => {
  TeachingToolRegistry.register({
    id: 'compass', name: 'Compass', icon: Compass, description: 'Draw perfect circles and arcs',
    category: 'MATHEMATICS', type: 'canvas-object', objectFactory: createCompassObject,
  });
};
