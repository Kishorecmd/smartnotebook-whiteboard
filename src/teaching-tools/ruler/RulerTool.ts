import { Ruler } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { TeachingToolObject, Point, BoundingBox } from '../../types';

const RULER_WIDTH = 600;
const RULER_HEIGHT = 80;

export const registerRulerTool = () => {
  TeachingToolRegistry.register({
    id: 'ruler',
    name: 'Ruler',
    icon: Ruler,
    category: 'MATHEMATICS',
    type: 'canvas-object',
    description: 'A draggable and rotatable ruler.',
    
    onActivate: (_engine: any) => {
      // In a real app we'd dispatch an action to add this object to the center of the viewport
      // But we can also let the TeachingToolsPanel handle this using the factory
    },

    objectFactory: (center: Point): TeachingToolObject => {
      return {
        id: `ruler_${Date.now()}`,
        type: 'teaching-tool',
        toolId: 'ruler',
        x: center.x - RULER_WIDTH / 2,
        y: center.y - RULER_HEIGHT / 2,
        width: RULER_WIDTH,
        height: RULER_HEIGHT,
        rotation: 0,
        zIndex: 100,
        visible: true,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        toolData: {},
      };
    },

    getBoundingBox: (obj: TeachingToolObject): BoundingBox => {
      // The bounding box here doesn't account for rotation, but the HitTest engine will handle
      // point un-rotation before calling this, or handle it via rect checks.
      return {
        minX: obj.x,
        minY: obj.y,
        maxX: obj.x + obj.width,
        maxY: obj.y + obj.height,
        width: obj.width,
        height: obj.height,
      };
    },

    hitTest: (obj: TeachingToolObject, point: Point, _zoom: number): boolean | string => {
      // The point is already unrotated in the HitTest engine relative to the object's center
      // Wait, is the point unrotated?
      // Yes, HitTest.ts does: `const unrotated = rotatePoint(point, center, -obj.rotation);`
      // Then it checks against the bounding box.
      // We can just return true if we just want the body to be draggable.
      // HitTest handles the basic rect collision if we just let it fall through,
      // but HitTest delegates to this function.
      
      const inX = point.x >= obj.x && point.x <= obj.x + obj.width;
      const inY = point.y >= obj.y && point.y <= obj.y + obj.height;
      return inX && inY;
    },

    renderer: (ctx: CanvasRenderingContext2D, obj: TeachingToolObject, _zoom: number) => {
      const { x, y, width, height } = obj;

      // Draw Ruler Body
      ctx.fillStyle = 'rgba(255, 235, 150, 0.9)'; // Yellowish wood color
      ctx.strokeStyle = '#d4b85c';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.stroke();

      // Draw Markings
      ctx.fillStyle = '#4a3f18';
      ctx.strokeStyle = '#4a3f18';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '12px sans-serif';

      const cmPixels = 40; // Let's say 40px is 1cm for visual purposes
      const maxCm = Math.floor(width / cmPixels);

      for (let i = 0; i <= maxCm; i++) {
        const markX = x + 10 + i * cmPixels;
        if (markX > x + width - 10) break;

        // cm line
        ctx.beginPath();
        ctx.moveTo(markX, y);
        ctx.lineTo(markX, y + 25);
        ctx.stroke();

        ctx.fillText(i.toString(), markX, y + 30);

        // mm lines
        if (i < maxCm) {
          for (let j = 1; j < 10; j++) {
            const mmX = markX + j * (cmPixels / 10);
            if (mmX > x + width - 10) break;
            
            const isHalf = j === 5;
            const markLength = isHalf ? 15 : 8;
            
            ctx.beginPath();
            ctx.moveTo(mmX, y);
            ctx.lineTo(mmX, y + markLength);
            ctx.lineWidth = isHalf ? 1.5 : 1;
            ctx.stroke();
          }
        }
      }
    }
  });
};
