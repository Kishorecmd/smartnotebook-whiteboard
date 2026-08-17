import { Point, ViewportTransform, BoundingBox } from '../types';
import { clamp } from '../utils';

export class CoordinateTransformer {
  private panX: number = 0;
  private panY: number = 0;
  private zoom: number = 1.0;

  public static readonly MIN_ZOOM = 0.25; // 25%
  public static readonly MAX_ZOOM = 5.0; // 500%

  constructor(initial?: Partial<ViewportTransform>) {
    if (initial) {
      this.panX = initial.panX ?? 0;
      this.panY = initial.panY ?? 0;
      this.zoom = clamp(initial.zoom ?? 1.0, CoordinateTransformer.MIN_ZOOM, CoordinateTransformer.MAX_ZOOM);
    }
  }

  public getTransform(): ViewportTransform {
    return {
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom,
    };
  }

  public setTransform(transform: Partial<ViewportTransform>): void {
    if (transform.panX !== undefined) this.panX = transform.panX;
    if (transform.panY !== undefined) this.panY = transform.panY;
    if (transform.zoom !== undefined) {
      this.zoom = clamp(transform.zoom, CoordinateTransformer.MIN_ZOOM, CoordinateTransformer.MAX_ZOOM);
    }
  }

  public getPanX(): number {
    return this.panX;
  }

  public getPanY(): number {
    return this.panY;
  }

  public getZoom(): number {
    return this.zoom;
  }

  /**
   * Transforms a point from screen/DOM pixel coordinates to world coordinates.
   */
  public screenToWorld(screenPoint: Point): Point {
    return {
      x: (screenPoint.x - this.panX) / this.zoom,
      y: (screenPoint.y - this.panY) / this.zoom,
      pressure: screenPoint.pressure,
      time: screenPoint.time,
    };
  }

  /**
   * Transforms a point from world coordinates to screen pixel coordinates.
   */
  public worldToScreen(worldPoint: Point): Point {
    return {
      x: worldPoint.x * this.zoom + this.panX,
      y: worldPoint.y * this.zoom + this.panY,
      pressure: worldPoint.pressure,
      time: worldPoint.time,
    };
  }

  /**
   * Pans the canvas viewport by screen delta values (dx, dy).
   */
  public panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
  }

  /**
   * Zooms around a specific screen anchor point (e.g. mouse cursor or pinch center).
   */
  public zoomAt(screenAnchorX: number, screenAnchorY: number, newZoom: number): void {
    const clampedZoom = clamp(newZoom, CoordinateTransformer.MIN_ZOOM, CoordinateTransformer.MAX_ZOOM);
    if (Math.abs(clampedZoom - this.zoom) < 0.0001) return;

    // Maintain the world point under screenAnchor invariant
    const zoomRatio = clampedZoom / this.zoom;
    this.panX = screenAnchorX - (screenAnchorX - this.panX) * zoomRatio;
    this.panY = screenAnchorY - (screenAnchorY - this.panY) * zoomRatio;
    this.zoom = clampedZoom;
  }

  /**
   * Applies the current pan, zoom, and device pixel ratio transformation to a canvas context.
   */
  public applyToContext(ctx: CanvasRenderingContext2D, dpr: number = 1): void {
    ctx.setTransform(
      dpr * this.zoom,
      0,
      0,
      dpr * this.zoom,
      dpr * this.panX,
      dpr * this.panY
    );
  }

  /**
   * Gets the visible world bounding box for viewport culling.
   */
  public getVisibleWorldBounds(screenWidth: number, screenHeight: number): BoundingBox {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: screenWidth, y: screenHeight });

    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Centers and fits a bounding box into the viewport with padding.
   */
  public zoomToFit(box: BoundingBox, screenWidth: number, screenHeight: number, padding: number = 40): void {
    if (box.width <= 0 || box.height <= 0) {
      this.reset();
      return;
    }

    const availableWidth = Math.max(100, screenWidth - padding * 2);
    const availableHeight = Math.max(100, screenHeight - padding * 2);

    const scaleX = availableWidth / box.width;
    const scaleY = availableHeight / box.height;
    const fitZoom = clamp(Math.min(scaleX, scaleY), CoordinateTransformer.MIN_ZOOM, 1.5);

    const boxCenterX = box.minX + box.width / 2;
    const boxCenterY = box.minY + box.height / 2;

    this.zoom = fitZoom;
    this.panX = screenWidth / 2 - boxCenterX * fitZoom;
    this.panY = screenHeight / 2 - boxCenterY * fitZoom;
  }

  public reset(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
  }
}
