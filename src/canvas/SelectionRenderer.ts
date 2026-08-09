import { BoundingBox, HandleType } from '../types';
import { getHandlePositions } from '../utils';

export class SelectionRenderer {
  /**
   * Renders the selection bounding box, handles, and rotation stalk on the overlay canvas.
   */
  public static renderSelectionBox(
    ctx: CanvasRenderingContext2D,
    box: BoundingBox,
    zoom: number = 1.0,
    activeHandle?: HandleType | null
  ): void {
    if (box.width <= 0 && box.height <= 0) return;

    ctx.save();

    const handles = getHandlePositions(box, zoom);
    const handleRadius = Math.max(4, 5 / zoom);
    const lineWidth = Math.max(1, 1.5 / zoom);

    // 1. Draw Bounding Box Outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([Math.max(4, 6 / zoom), Math.max(3, 4 / zoom)]);
    ctx.strokeRect(box.minX, box.minY, box.width, box.height);

    // 2. Draw Rotation Stalk & Handle
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(handles.n.x, handles.n.y);
    ctx.lineTo(handles.rotate.x, handles.rotate.y);
    ctx.stroke();

    // Rotation Handle Circle
    ctx.fillStyle = activeHandle === 'rotate' ? '#2563eb' : '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = lineWidth * 1.5;
    ctx.beginPath();
    ctx.arc(handles.rotate.x, handles.rotate.y, handleRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Draw 8 Resize Handles
    const handleList: HandleType[] = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'];

    for (const h of handleList) {
      const pos = handles[h];
      const isActive = activeHandle === h;

      ctx.fillStyle = isActive ? '#2563eb' : '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.rect(
        pos.x - handleRadius,
        pos.y - handleRadius,
        handleRadius * 2,
        handleRadius * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the interactive marquee drag selection box.
   */
  public static renderMarqueeBox(
    ctx: CanvasRenderingContext2D,
    box: BoundingBox,
    zoom: number = 1.0
  ): void {
    ctx.save();

    // Fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fillRect(box.minX, box.minY, box.width, box.height);

    // Border
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.setLineDash([Math.max(3, 4 / zoom), Math.max(2, 3 / zoom)]);
    ctx.strokeRect(box.minX, box.minY, box.width, box.height);

    ctx.restore();
  }
}
