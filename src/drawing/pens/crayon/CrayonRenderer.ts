import { Point } from '../../../types';
import { PenPreset } from '../PenPreset';
import { buildVertices, smoothPoints, stableJitter } from '../PenEngine';
import { getCrayonTexture, seedFromPoints } from './CrayonTexture';

export class CrayonRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    preset: PenPreset,
    points: Point[],
    color: string,
    size: number,
    opacity: number
  ): void {
    if (points.length === 0) return;

    // Retrieve crayon parameters (or fallback to presets if not strictly provided)
    const density = preset.textureDensity ?? 0.65;
    const roughness = preset.roughness ?? 0.5;
    // Crayon strokes generate a seed on commit, but active strokes can just use points
    const seed = preset.textureSeed ?? seedFromPoints(points);

    // Fetch the cached procedural canvas pattern
    const pattern = getCrayonTexture({ color, size, density, roughness, seed }, ctx);

    ctx.save();
    // We apply opacity directly, but the pattern itself contains opacity gaps for paper texture.
    // When segments overlap, pigment naturally accumulates in those gaps.
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = preset.compositeMode || 'source-over';
    ctx.lineCap = preset.lineCap || 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pattern || color;
    ctx.fillStyle = pattern || color;

    const smoothed = smoothPoints(points, preset);

    if (smoothed.length === 1) {
      // Draw a textured dot
      const pressure = smoothed[0].pressure ?? 0.5;
      const radius = Math.max(0.5, (size * (0.6 + pressure * 0.4)) / 2);

      ctx.beginPath();
      // Rough edges on the dot
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const offset = stableJitter(seed + i) * radius * roughness * 0.4;
        const x = smoothed[0].x + Math.cos(theta) * (radius + offset);
        const y = smoothed[0].y + Math.sin(theta) * (radius + offset);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.fill();
      ctx.restore();
      return;
    }

    // Use buildVertices to get pressure-responsive widths for each point
    const vertices = buildVertices(points, preset, size);
    
    // Draw segment by segment to allow width variation and natural overlap accumulation
    const edgeOffset = size * roughness * 0.2;
    
    // Base pass (solid but textured)
    for (let i = 1; i < vertices.length; i++) {
      const a = vertices[i - 1];
      const b = vertices[i];
      
      const width = (a.width + b.width) / 2;
      
      // Simulate pressure affecting coverage by skipping some strokes if pressure is extremely low
      // Actually, variable width handles most of the pressure dynamics visually.
      
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Edge roughness pass (lighter, smaller offset pass to break the perfectly smooth geometry)
    if (roughness > 0) {
      ctx.globalAlpha = opacity * 0.6; // Lighter on edges
      
      for (let i = 1; i < vertices.length; i++) {
        const a = vertices[i - 1];
        const b = vertices[i];
        
        const width = ((a.width + b.width) / 2) * (0.8 + roughness * 0.3);
        
        // Jitter offsets
        const sA = seed + i;
        const sB = seed + i + 1;
        const aX = a.x + stableJitter(sA) * edgeOffset;
        const aY = a.y + stableJitter(sA + 11) * edgeOffset;
        const bX = b.x + stableJitter(sB) * edgeOffset;
        const bY = b.y + stableJitter(sB + 11) * edgeOffset;
        
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.moveTo(aX, aY);
        ctx.lineTo(bX, bY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
