import { CompassObject } from '../../../types';

export class CompassRenderer {
  public static render(ctx: CanvasRenderingContext2D, obj: CompassObject, zoom: number = 1) {
    ctx.save();

    // 1. Draw temporary radius guide
    ctx.beginPath();
    ctx.moveTo(obj.centerX, obj.centerY);
    ctx.lineTo(obj.centerX + Math.cos(obj.angle) * obj.radius, obj.centerY + Math.sin(obj.angle) * obj.radius);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Compass Kinematics
    const pencilX = obj.centerX + Math.cos(obj.angle) * obj.radius;
    const pencilY = obj.centerY + Math.sin(obj.angle) * obj.radius;

    const midX = (obj.centerX + pencilX) / 2;
    const midY = (obj.centerY + pencilY) / 2;
    const d = obj.radius;
    
    // Fixed leg length L.
    const L = Math.max(150, d * 0.8);
    const halfD = d / 2;
    const h = Math.sqrt(Math.max(100, L * L - halfD * halfD));

    // Direction from needle to pencil
    const dx = pencilX - obj.centerX;
    const dy = pencilY - obj.centerY;
    
    // Perpendicular vector for the hinge
    const perpX = -dy / d;
    const perpY = dx / d;

    let hx = midX + perpX * h;
    let hy = midY + perpY * h;
    if (hy > midY) { // hinge above midpoint relative to screen
      hx = midX - perpX * h;
      hy = midY - perpY * h;
    }

    if (isNaN(hx) || isNaN(hy)) {
       hx = obj.centerX;
       hy = obj.centerY - L;
    }

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8 / zoom;
    ctx.shadowOffsetX = 4 / zoom;
    ctx.shadowOffsetY = 4 / zoom;

    // Draw Needle Leg
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(obj.centerX, obj.centerY);
    ctx.strokeStyle = '#cbd5e1'; // light metallic/grey
    ctx.lineWidth = 10 / zoom;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw Pencil Leg
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(pencilX, pencilY);
    ctx.strokeStyle = '#94a3b8'; // slightly darker grey
    ctx.lineWidth = 10 / zoom;
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Draw Hinge Body
    ctx.beginPath();
    ctx.arc(hx, hy, 20 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a'; // dark navy body
    ctx.fill();
    
    // Draw Hinge Inner Pin
    ctx.beginPath();
    ctx.arc(hx, hy, 6 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    // Draw Needle Tip
    ctx.beginPath();
    ctx.arc(obj.centerX, obj.centerY, 6 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2 / zoom;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Draw Pencil Tip
    ctx.beginPath();
    ctx.arc(pencilX, pencilY, 8 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b'; 
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
