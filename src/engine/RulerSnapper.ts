import { Point, TeachingToolObject } from '../types';
import { rotatePoint } from '../utils/math.utils';
import type { WhiteboardEngine } from './WhiteboardEngine';

interface SnapState {
  rulerId: string;
  isProtractor?: boolean;
}

export type SnappedPoint = Point & { 
  isSnapped?: boolean;
  snapToolId?: string;
  isProtractor?: boolean;
};

export class RulerSnapper {
  private activeSnaps: Map<number, SnapState> = new Map();
  private indicators: Map<number, Point> = new Map();
  private angleSelectors: Map<number, SnapState> = new Map();

  private SNAP_ACTIVATION_DISTANCE = 20;
  private SNAP_RELEASE_DISTANCE = 30;
  private PROTRACTOR_RADIUS = 200;

  constructor(private engine: WhiteboardEngine) {}

  public setConfig(activation: number, release: number) {
    this.SNAP_ACTIVATION_DISTANCE = activation;
    this.SNAP_RELEASE_DISTANCE = release;
  }

  private getProtractorCenter(p: TeachingToolObject) {
    return {
      x: p.x + p.width / 2,
      y: p.y + p.height - 30, // crosshair center
    };
  }

  private updateProtractorData(id: string, data: any) {
    const obj = this.engine.getObjects().find(o => o.id === id);
    if (obj && obj.type === 'teaching-tool') {
      const updated = { ...obj, toolData: { ...obj.toolData, ...data } };
      this.engine.setObjects(this.engine.getObjects().map(o => o.id === id ? updated : o));
    }
  }

  private snapAngle(angleRad: number, snapDegree: number): number {
    if (snapDegree === 0 || !snapDegree) return angleRad;
    let angleDeg = (angleRad * 180) / Math.PI;
    angleDeg = Math.round(angleDeg / snapDegree) * snapDegree;
    return (angleDeg * Math.PI) / 180;
  }

  // Handle angle selection drag
  public handlePointerDown(worldPoint: Point, pointerId: number): boolean {
    const objects = this.engine.getObjects();
    const protractors = objects.filter(
      (o): o is TeachingToolObject => o.type === 'teaching-tool' && o.toolId === 'protractor' && o.toolData?.snapEnabled !== false
    );

    for (const p of protractors) {
      const center = this.getProtractorCenter(p);
      const localPoint = rotatePoint(worldPoint, center, -(p.rotation || 0));
      const distFromCenter = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);

      // Hit center or arc (Angle Selection Mode)
      if (distFromCenter < 40 || (Math.abs(distFromCenter - this.PROTRACTOR_RADIUS) < this.SNAP_ACTIVATION_DISTANCE && localPoint.y <= 20)) {
        let angle = Math.atan2(localPoint.y, localPoint.x);
        angle = this.snapAngle(angle, p.toolData?.angleSnap ?? 1);

        this.angleSelectors.set(pointerId, { rulerId: p.id, isProtractor: true });
        this.updateProtractorData(p.id, { selectedAngle: angle });
        return true;
      }
    }
    return false;
  }

  public handlePointerMove(worldPoint: Point, pointerId: number): boolean {
    const selector = this.angleSelectors.get(pointerId);
    if (selector && selector.isProtractor) {
      const p = this.engine.getObjects().find(o => o.id === selector.rulerId) as TeachingToolObject;
      if (p) {
        const center = this.getProtractorCenter(p);
        const localPoint = rotatePoint(worldPoint, center, -(p.rotation || 0));
        let angle = Math.atan2(localPoint.y, localPoint.x);
        angle = this.snapAngle(angle, p.toolData?.angleSnap ?? 1);
        this.updateProtractorData(p.id, { selectedAngle: angle });
      }
      return true;
    }
    return false;
  }

  public handlePointerUp(pointerId: number): boolean {
    if (this.angleSelectors.has(pointerId)) {
      this.angleSelectors.delete(pointerId);
      return true;
    }
    return false;
  }

  public snapPoint(
    worldPoint: Point,
    pointerId: number,
    isShiftPressed: boolean
  ): SnappedPoint {
    const objects = this.engine.getObjects();
    const rulersAndProtractors = objects.filter(
      (o): o is TeachingToolObject =>
        o.type === 'teaching-tool' && (o.toolId === 'ruler' || o.toolId === 'protractor') && o.toolData?.snapEnabled !== false
    );

    if (rulersAndProtractors.length === 0) {
      this.clearSnap(pointerId);
      return worldPoint;
    }

    const snapState = this.activeSnaps.get(pointerId);

    // If currently snapped, check if we should release
    if (snapState) {
      const toolObj = rulersAndProtractors.find((r) => r.id === snapState.rulerId);
      if (!toolObj) {
        this.clearSnap(pointerId);
        return worldPoint;
      }

      const releaseDistance = toolObj.toolData?.snapDistance ? toolObj.toolData.snapDistance + 10 : this.SNAP_RELEASE_DISTANCE;
      const projected = this.projectToTool(worldPoint, toolObj);
      if (!projected) {
        this.clearSnap(pointerId);
        return worldPoint;
      }

      if (projected.distance > releaseDistance && !isShiftPressed) {
        this.clearSnap(pointerId);
        return worldPoint; // Released
      } else {
        // Still snapped
        this.indicators.set(pointerId, projected.worldProjected);
        this.updateRenderer();
        return {
          x: projected.worldProjected.x,
          y: projected.worldProjected.y,
          pressure: worldPoint.pressure,
          time: worldPoint.time,
          isSnapped: true,
          snapToolId: toolObj.id,
          isProtractor: toolObj.toolId === 'protractor'
        };
      }
    }

    // If not snapped, find closest tool
    for (const toolObj of rulersAndProtractors) {
      const activationDistance = toolObj.toolData?.snapDistance ?? this.SNAP_ACTIVATION_DISTANCE;
      const projected = this.projectToTool(worldPoint, toolObj);
      
      if (projected && (projected.distance <= activationDistance || isShiftPressed)) {
        // Snap activated!
        this.activeSnaps.set(pointerId, { rulerId: toolObj.id, isProtractor: toolObj.toolId === 'protractor' });
        this.indicators.set(pointerId, projected.worldProjected);
        this.updateRenderer();
        return {
          x: projected.worldProjected.x,
          y: projected.worldProjected.y,
          pressure: worldPoint.pressure,
          time: worldPoint.time,
          isSnapped: true,
          snapToolId: toolObj.id,
          isProtractor: toolObj.toolId === 'protractor'
        };
      }
    }

    // No tool close enough
    this.clearSnap(pointerId);
    return worldPoint;
  }

  public clearSnap(pointerId: number) {
    this.activeSnaps.delete(pointerId);
    this.indicators.delete(pointerId);
    this.updateRenderer();
  }

  public clearAll() {
    this.activeSnaps.clear();
    this.indicators.clear();
    this.angleSelectors.clear();
    this.updateRenderer();
  }

  public getIndicators(): Point[] {
    return Array.from(this.indicators.values());
  }

  private updateRenderer() {
    this.engine.getRenderer().setSnapIndicators(this.getIndicators());
  }

  private projectToTool(p: Point, tool: TeachingToolObject) {
    if (tool.toolId === 'protractor') {
      return this.projectToProtractor(p, tool);
    }
    return this.projectToRuler(p, tool);
  }

  private projectToProtractor(p: Point, protractor: TeachingToolObject) {
    const center = this.getProtractorCenter(protractor);
    const localPoint = rotatePoint(p, center, -(protractor.rotation || 0));

    const selectedAngle = protractor.toolData?.selectedAngle;

    // rotatePoint returns a world-space point rotated about the crosshair, so it
    // has to be made relative to the crosshair before projecting. Without this the
    // ray was anchored at the world origin and a point sitting exactly on the
    // chosen angle measured hundreds of units away, so it never snapped.
    const rel = { x: localPoint.x - center.x, y: localPoint.y - center.y };

    // Straight line projection based on selected angle ray
    if (selectedAngle !== undefined) {
      const dx = Math.cos(selectedAngle);
      const dy = Math.sin(selectedAngle);

      // Dot product to find distance along ray
      let t = rel.x * dx + rel.y * dy;

      // If we are strictly projecting to a ray (not a full line), t should be >= 0
      if (t < 0) t = 0; // Constrain strictly to the ray starting from center!

      const projectedRel = { x: t * dx, y: t * dy };
      const projectedLocal = {
        x: projectedRel.x + center.x,
        y: projectedRel.y + center.y,
      };

      const distance = Math.hypot(rel.x - projectedRel.x, rel.y - projectedRel.y);

      return {
        localPoint,
        projectedLocal,
        worldProjected: rotatePoint(projectedLocal, center, protractor.rotation || 0),
        distance,
      };
    }

    // Default snap to the baseline through the crosshair if no angle is chosen yet
    const straightDistance = Math.abs(rel.y);
    if (straightDistance < 50) {
      const projectedLocal = {
        x: localPoint.x,
        y: center.y,
      };
      return {
        localPoint,
        projectedLocal,
        worldProjected: rotatePoint(projectedLocal, center, protractor.rotation || 0),
        distance: straightDistance,
      };
    }

    return null; // Don't snap to arc anymore!
  }

  private projectToRuler(p: Point, ruler: TeachingToolObject) {
    const center = {
      x: ruler.x + ruler.width / 2,
      y: ruler.y + ruler.height / 2,
    };

    const localPoint = rotatePoint(p, center, -(ruler.rotation || 0));

    const edgeY = ruler.y;
    let edgeX = localPoint.x;

    const projectedLocal = { x: edgeX, y: edgeY };
    
    const projectedWorld = rotatePoint(projectedLocal, center, ruler.rotation || 0);
    const distance = Math.abs(localPoint.y - edgeY);

    return {
      localPoint,
      projectedLocal,
      worldProjected: projectedWorld,
      distance,
    };
  }
}
