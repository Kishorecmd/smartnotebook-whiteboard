import { MoveHorizontal } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { TeachingToolObject, Point, BoundingBox } from '../../types';

const LINE_WIDTH = 800;
const LINE_HEIGHT = 100; // Hitbox height

export const registerNumberLineTool = () => {
  TeachingToolRegistry.register({
    id: 'number-line',
    name: 'Number Line',
    icon: MoveHorizontal,
    category: 'MATHEMATICS',
    type: 'canvas-object',
    description: 'An interactive number line from -10 to 10.',
    
    onActivate: (_engine: any) => {
    },

    objectFactory: (center: Point): TeachingToolObject => {
      return {
        id: `number-line_${Date.now()}`,
        type: 'teaching-tool',
        toolId: 'number-line',
        x: center.x - LINE_WIDTH / 2,
        y: center.y - LINE_HEIGHT / 2,
        width: LINE_WIDTH,
        height: LINE_HEIGHT,
        rotation: 0,
        zIndex: 100,
        visible: true,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        toolData: {
          min: -10,
          max: 10,
        },
      };
    },

    getBoundingBox: (obj: TeachingToolObject): BoundingBox => {
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
      const inX = point.x >= obj.x && point.x <= obj.x + obj.width;
      const inY = point.y >= obj.y && point.y <= obj.y + obj.height;
      return inX && inY;
    },

    renderer: (ctx: CanvasRenderingContext2D, obj: TeachingToolObject, _zoom: number) => {
      const { x, y, width, height, toolData } = obj;
      const centerY = y + height / 2;
      
      const min = toolData?.min || -10;
      const max = toolData?.max || 10;
      const range = max - min;
      
      // Draw main line
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Left arrow
      ctx.moveTo(x + 20, centerY - 10);
      ctx.lineTo(x, centerY);
      ctx.lineTo(x + 20, centerY + 10);
      
      // Main segment
      ctx.moveTo(x, centerY);
      ctx.lineTo(x + width, centerY);
      
      // Right arrow
      ctx.moveTo(x + width - 20, centerY - 10);
      ctx.lineTo(x + width, centerY);
      ctx.lineTo(x + width - 20, centerY + 10);
      
      ctx.stroke();

      // Draw ticks
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '16px sans-serif';

      const paddingX = 40;
      const drawableWidth = width - paddingX * 2;
      const stepPixels = drawableWidth / range;

      for (let i = min; i <= max; i++) {
        const tickX = x + paddingX + (i - min) * stepPixels;
        
        ctx.beginPath();
        ctx.moveTo(tickX, centerY - 10);
        ctx.lineTo(tickX, centerY + 10);
        ctx.lineWidth = i === 0 ? 4 : 2;
        ctx.stroke();

        ctx.fillText(i.toString(), tickX, centerY + 15);
      }
    }
  });
};
