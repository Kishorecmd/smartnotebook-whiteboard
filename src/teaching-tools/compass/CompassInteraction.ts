import { CompassObject, Point, HandleType } from '../../types';
import { distance } from '../../utils';

export class CompassInteraction {
  /**
   * Hit test custom compass handles:
   * - 'compass-needle': The needle tip for moving the entire compass
   * - 'compass-pencil': The pencil tip for adjusting the radius
   * - 'compass-body': The hinge for rotating the compass
   */
  public static hitTestCompass(
    point: Point,
    compass: CompassObject,
    zoom: number = 1.0,
    handleRadiusPx: number = 24 // Generous touch target
  ): HandleType | null {
    const worldRadius = handleRadiusPx / Math.max(0.1, zoom);

    // 1. Pencil Tip (Adjust Radius)
    const pencilX = compass.centerX + Math.cos(compass.angle) * compass.radius;
    const pencilY = compass.centerY + Math.sin(compass.angle) * compass.radius;
    
    if (distance(point, { x: pencilX, y: pencilY }) <= worldRadius) {
      return 'compass-pencil';
    }

    // 2. Needle Tip (Move)
    if (distance(point, { x: compass.centerX, y: compass.centerY }) <= worldRadius) {
      return 'compass-needle';
    }

    // 3. Hinge Body (Rotate)
    const midX = (compass.centerX + pencilX) / 2;
    const midY = (compass.centerY + pencilY) / 2;
    const d = compass.radius;
    const L = Math.max(150, d * 0.8);
    const halfD = d / 2;
    const h = Math.sqrt(Math.max(100, L * L - halfD * halfD));
    const dx = pencilX - compass.centerX;
    const dy = pencilY - compass.centerY;
    const perpX = -dy / d;
    const perpY = dx / d;

    let hx = midX + perpX * h;
    let hy = midY + perpY * h;
    if (hy > midY) {
      hx = midX - perpX * h;
      hy = midY - perpY * h;
    }
    
    if (isNaN(hx) || isNaN(hy)) {
       hx = compass.centerX;
       hy = compass.centerY - L;
    }

    if (distance(point, { x: hx, y: hy }) <= worldRadius * 1.5) { // even larger for hinge
      return 'compass-body';
    }

    return null;
  }
}
