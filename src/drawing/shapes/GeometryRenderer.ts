import { CircleObject, ArcObject } from '../../types';

export class GeometryRenderer {
  public static renderCircle(ctx: CanvasRenderingContext2D, obj: CircleObject) {
    ctx.save();
    ctx.globalAlpha = obj.opacity;
    ctx.beginPath();
    ctx.arc(obj.centerX, obj.centerY, obj.radius, 0, Math.PI * 2);
    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.stroke();
    ctx.restore();
  }

  public static renderArc(ctx: CanvasRenderingContext2D, obj: ArcObject) {
    ctx.save();
    ctx.globalAlpha = obj.opacity;
    ctx.beginPath();
    ctx.arc(obj.centerX, obj.centerY, obj.radius, obj.startAngle, obj.endAngle);
    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.stroke();
    ctx.restore();
  }
}
