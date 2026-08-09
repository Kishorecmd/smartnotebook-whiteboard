import { Baseline } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { TeachingToolObject, Point, BoundingBox } from '../../types';

const PROTRACTOR_RADIUS = 200;
const PROTRACTOR_WIDTH = PROTRACTOR_RADIUS * 2;
const PROTRACTOR_HEIGHT = PROTRACTOR_RADIUS + 30; // some extra space for base

export const registerProtractorTool = () => {
  TeachingToolRegistry.register({
    id: 'protractor',
    name: 'Protractor',
    icon: Baseline,
    category: 'MATHEMATICS',
    type: 'canvas-object',
    description: 'A draggable and rotatable protractor.',
    
    onActivate: (_engine: any) => {
    },

    objectFactory: (center: Point): TeachingToolObject => {
      return {
        id: `protractor_${Date.now()}`,
        type: 'teaching-tool',
        toolId: 'protractor',
        x: center.x - PROTRACTOR_WIDTH / 2,
        y: center.y - PROTRACTOR_HEIGHT / 2,
        width: PROTRACTOR_WIDTH,
        height: PROTRACTOR_HEIGHT,
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
      // Basic bounding box check for the unrotated point
      const inX = point.x >= obj.x && point.x <= obj.x + obj.width;
      const inY = point.y >= obj.y && point.y <= obj.y + obj.height;
      return inX && inY;
    },

    renderer: (ctx: CanvasRenderingContext2D, obj: TeachingToolObject, _zoom: number) => {
      const { x, y, width, height } = obj;
      const centerX = x + width / 2;
      const centerY = y + height - 30; // base is 30px from bottom

      // Semi-circle background
      ctx.fillStyle = 'rgba(200, 235, 255, 0.4)'; // Transparent blueish glass
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.8)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, PROTRACTOR_RADIUS, Math.PI, 0);
      ctx.lineTo(centerX + PROTRACTOR_RADIUS, centerY + 30);
      ctx.lineTo(centerX - PROTRACTOR_RADIUS, centerY + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner cutout
      ctx.beginPath();
      ctx.arc(centerX, centerY, PROTRACTOR_RADIUS - 40, Math.PI, 0);
      ctx.lineTo(centerX + PROTRACTOR_RADIUS - 40, centerY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.stroke();

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();

      // Markings
      ctx.fillStyle = 'rgba(0, 50, 100, 0.9)';
      ctx.strokeStyle = 'rgba(0, 50, 100, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '10px sans-serif';

      for (let angle = 0; angle <= 180; angle++) {
        const rad = (angle * Math.PI) / 180;
        const isTen = angle % 10 === 0;
        const isFive = angle % 5 === 0;

        const markLength = isTen ? 15 : isFive ? 10 : 5;
        const startRadius = PROTRACTOR_RADIUS;
        const endRadius = PROTRACTOR_RADIUS - markLength;

        // Angle goes from 0 (right) to 180 (left) in standard math, but canvas arc goes clockwise.
        // We want 0 on right, 180 on left.
        // So canvas angle = Math.PI - rad
        const drawRad = Math.PI - rad;

        const startX = centerX + startRadius * Math.cos(drawRad);
        const startY = centerY - startRadius * Math.sin(drawRad);
        const endX = centerX + endRadius * Math.cos(drawRad);
        const endY = centerY - endRadius * Math.sin(drawRad);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = isTen ? 1.5 : 1;
        ctx.stroke();

        if (isTen) {
          const textRadius = PROTRACTOR_RADIUS - 22;
          const textX = centerX + textRadius * Math.cos(drawRad);
          const textY = centerY - textRadius * Math.sin(drawRad);
          
          // Draw outer text (0 to 180)
          ctx.fillText(angle.toString(), textX, textY);
          
          // Draw inner text (180 to 0)
          const innerTextRadius = PROTRACTOR_RADIUS - 55;
          const innerTextX = centerX + innerTextRadius * Math.cos(drawRad);
          const innerTextY = centerY - innerTextRadius * Math.sin(drawRad);
          ctx.fillText((180 - angle).toString(), innerTextX, innerTextY);
        }
      }

      // Draw the selected angle ray if one exists
      if (obj.toolData?.selectedAngle !== undefined) {
        const selectedAngleRad = obj.toolData.selectedAngle;
        const rayLen = PROTRACTOR_RADIUS + 40;
        const rayX = centerX + rayLen * Math.cos(selectedAngleRad);
        const rayY = centerY + rayLen * Math.sin(selectedAngleRad);
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(rayX, rayY);
        ctx.strokeStyle = '#2563eb'; // blue-600
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw degree label
        const deg = Math.round(Math.abs(selectedAngleRad * 180 / Math.PI));
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 14px sans-serif';
        const textX = centerX + (rayLen + 20) * Math.cos(selectedAngleRad);
        const textY = centerY + (rayLen + 20) * Math.sin(selectedAngleRad);
        ctx.fillText(`${deg}°`, textX, textY);
      }
    }
  });
};
