import { hexToRgba } from '../../../utils/color.utils';

export interface CrayonTextureConfig {
  color: string;
  size: number;
  density: number; // 0..1 (wax coverage)
  roughness: number; // 0..1 (grain intensity)
  seed: number;
}

// Deterministic PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textureCache = new Map<string, CanvasPattern>();

export function getCrayonTexture(
  config: CrayonTextureConfig,
  ctxForPattern: CanvasRenderingContext2D
): CanvasPattern | null {
  const cacheKey = `${config.color}_${config.size.toFixed(1)}_${config.density.toFixed(2)}_${config.roughness.toFixed(2)}_${config.seed}`;
  
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  // Base pattern size scales slightly with the pen size, but bounded to keep generation fast
  const patternSize = Math.max(64, Math.min(256, Math.ceil(config.size * 6)));
  
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(patternSize, patternSize);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = patternSize;
    canvas.height = patternSize;
  }
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) return null;

  const prng = mulberry32(config.seed);

  // 1. Base wax layer (light opacity)
  const baseAlpha = 0.2 + (config.density * 0.4);
  ctx.fillStyle = hexToRgba(config.color, baseAlpha);
  ctx.fillRect(0, 0, patternSize, patternSize);
  
  // 2. Macro grain (larger chunks of pigment)
  const numPatches = Math.floor((patternSize * patternSize) / 300 * config.roughness);
  ctx.fillStyle = hexToRgba(config.color, 0.7);
  for (let i = 0; i < numPatches; i++) {
    const px = prng() * patternSize;
    const py = prng() * patternSize;
    const r = prng() * (config.size * 0.4) + 0.5;
    
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Wrap around for seamless tiling
    if (px < r) { ctx.beginPath(); ctx.arc(px + patternSize, py, r, 0, Math.PI * 2); ctx.fill(); }
    if (px > patternSize - r) { ctx.beginPath(); ctx.arc(px - patternSize, py, r, 0, Math.PI * 2); ctx.fill(); }
    if (py < r) { ctx.beginPath(); ctx.arc(px, py + patternSize, r, 0, Math.PI * 2); ctx.fill(); }
    if (py > patternSize - r) { ctx.beginPath(); ctx.arc(px, py - patternSize, r, 0, Math.PI * 2); ctx.fill(); }
  }

  // 3. Micro grain (paper interaction gaps where pigment didn't stick)
  ctx.globalCompositeOperation = 'destination-out';
  const gapAlpha = 0.8 * config.roughness;
  ctx.fillStyle = `rgba(0, 0, 0, ${gapAlpha})`;
  const numGaps = Math.floor((patternSize * patternSize) * (1 - config.density) * 1.5);
  for (let i = 0; i < numGaps; i++) {
    const px = prng() * patternSize;
    const py = prng() * patternSize;
    // Tiny specs
    ctx.fillRect(px, py, 1 + prng(), 1 + prng());
  }

  const pattern = ctxForPattern.createPattern(canvas as any, 'repeat');
  if (pattern) {
    textureCache.set(cacheKey, pattern);
  }
  
  // Keep cache bounded
  if (textureCache.size > 100) {
    const firstKey = textureCache.keys().next().value;
    if (firstKey) textureCache.delete(firstKey);
  }
  
  return pattern;
}

/**
 * Returns a stable seed based on the points data, preventing the crayon grain
 * from regenerating differently each frame.
 */
export function seedFromPoints(points: { x: number, y: number }[]): number {
  if (points.length === 0) return 12345;
  // Combine coords of a few points to get a stable, unique integer
  const p1 = points[0];
  const p2 = points[Math.floor(points.length / 2)];
  const p3 = points[points.length - 1];
  return Math.abs(Math.floor((p1.x * 13) + (p2.y * 31) + (p3.x * 17) + points.length));
}
