import { ShapeObject, ShapeType, StrokeStyle, Point } from '../types';

export class ShapeRenderer {
  /**
   * Applies dashed or dotted stroke style patterns to the canvas context.
   */
  public static applyStrokeStyle(
    ctx: CanvasRenderingContext2D,
    style: StrokeStyle,
    strokeWidth: number
  ): void {
    if (style === 'dashed') {
      ctx.setLineDash([Math.max(6, strokeWidth * 2.5), Math.max(4, strokeWidth * 1.5)]);
    } else if (style === 'dotted') {
      ctx.setLineDash([Math.max(2, strokeWidth * 0.75), Math.max(4, strokeWidth * 1.25)]);
    } else {
      ctx.setLineDash([]);
    }
  }

  /**
   * Renders a committed ShapeObject to the canvas.
   */
  public static renderShape(ctx: CanvasRenderingContext2D, shape: ShapeObject): void {
    if (!shape.visible) return;

    ctx.save();

    const opacity = shape.opacity ?? 1.0;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor || 'transparent';
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.applyStrokeStyle(ctx, shape.strokeStyle, shape.strokeWidth);

    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    if (shape.rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(shape.rotation);
      ctx.translate(-cx, -cy);
    }

    const hasFill = shape.fillColor && shape.fillColor !== 'transparent' && shape.fillColor !== 'none';

    switch (shape.shapeType) {
      case 'rectangle': {
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'rounded-rectangle': {
        const radius = Math.min(16, shape.width / 4, shape.height / 4);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function' && radius > 0) {
          ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
        } else {
          ctx.rect(shape.x, shape.y, shape.width, shape.height);
        }
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'ellipse': {
        const rx = Math.max(0.1, shape.width / 2);
        const ry = Math.max(0.1, shape.height / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'circle': {
        const r = Math.max(0.1, Math.min(shape.width, shape.height) / 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height);
        ctx.closePath();
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(cx, shape.y);
        ctx.lineTo(shape.x + shape.width, cy);
        ctx.lineTo(cx, shape.y + shape.height);
        ctx.lineTo(shape.x, cy);
        ctx.closePath();
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'star': {
        const spikes = 5;
        const outerRadius = Math.min(shape.width, shape.height) / 2;
        const innerRadius = outerRadius * 0.4;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (hasFill) ctx.fill();
        ctx.stroke();
        break;
      }

      case 'line': {
        const p1 = shape.points && shape.points[0] ? shape.points[0] : { x: shape.x, y: shape.y };
        const p2 = shape.points && shape.points[1] ? shape.points[1] : { x: shape.x + shape.width, y: shape.y + shape.height };
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const p1 = shape.points && shape.points[0] ? shape.points[0] : { x: shape.x, y: shape.y };
        const p2 = shape.points && shape.points[1] ? shape.points[1] : { x: shape.x + shape.width, y: shape.y + shape.height };
        this.renderArrow(ctx, p1, p2, shape.strokeWidth, shape.strokeStyle);
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Renders a live shape in progress during drag interaction on overlay.
   */
  public static renderActiveShapePreview(
    ctx: CanvasRenderingContext2D,
    params: {
      shapeType: ShapeType;
      start: Point;
      current: Point;
      strokeColor: string;
      fillColor: string;
      strokeWidth: number;
      strokeStyle: StrokeStyle;
      shiftKey: boolean;
    }
  ): void {
    const { shapeType, start, current, strokeColor, fillColor, strokeWidth, strokeStyle, shiftKey } = params;

    let x = Math.min(start.x, current.x);
    let y = Math.min(start.y, current.y);
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    if (shiftKey && shapeType !== 'line' && shapeType !== 'arrow') {
      const maxDim = Math.max(width, height);
      width = maxDim;
      height = maxDim;
      x = current.x < start.x ? start.x - maxDim : start.x;
      y = current.y < start.y ? start.y - maxDim : start.y;
    }

    let endPt = current;
    if (shiftKey && (shapeType === 'line' || shapeType === 'arrow')) {
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const angle = Math.atan2(dy, dx);
      // Snap to closest 45-degree angle (PI / 4)
      const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.sqrt(dx * dx + dy * dy);
      endPt = {
        x: start.x + Math.cos(snapAngle) * len,
        y: start.y + Math.sin(snapAngle) * len,
      };
      x = Math.min(start.x, endPt.x);
      y = Math.min(start.y, endPt.y);
      width = Math.abs(endPt.x - start.x);
      height = Math.abs(endPt.y - start.y);
    }

    const previewShape: ShapeObject = {
      id: 'active_preview',
      type: 'shape',
      shapeType,
      x,
      y,
      width: Math.max(1, width),
      height: Math.max(1, height),
      strokeColor,
      fillColor,
      strokeWidth,
      strokeStyle,
      rotation: 0,
      zIndex: 9999,
      visible: true,
      locked: false,
      points: [start, endPt],
      createdAt: 0,
      updatedAt: 0,
    };

    this.renderShape(ctx, previewShape);
  }

  private static renderArrow(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    strokeWidth: number,
    _strokeStyle: StrokeStyle
  ): void {
    const headLength = Math.max(12, strokeWidth * 3.5);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw solid arrowhead
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
