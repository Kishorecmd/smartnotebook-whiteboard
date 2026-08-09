import { Point, TeachingToolObject } from '../types';
import { rotatePoint } from '../utils/math.utils';
import type { WhiteboardEngine } from './WhiteboardEngine';

interface SnapState {
  rulerId: string;
}

export class RulerSnapper {
  private activeSnaps: Map<number, SnapState> = new Map();
  private indicators: Map<number, Point> = new Map();

  private SNAP_ACTIVATION_DISTANCE = 20;
  private SNAP_RELEASE_DISTANCE = 30;

  constructor(private engine: WhiteboardEngine) {}

  public setConfig(activation: number, release: number) {
    this.SNAP_ACTIVATION_DISTANCE = activation;
    this.SNAP_RELEASE_DISTANCE = release;
  }

  public snapPoint(
    worldPoint: Point,
    pointerId: number,
    isShiftPressed: boolean
  ): Point {
    const objects = this.engine.getObjects();
    const rulersAndProtractors = objects.filter(
      (o): o is TeachingToolObject =>
        o.type === 'teaching-tool' && (o.toolId === 'ruler' || o.toolId === 'protractor')
    );

    if (rulersAndProtractors.length === 0) {
      this.clearSnap(pointerId);
      return worldPoint;
    }

    const snapState = this.activeSnaps.get(pointerId);

    // If currently snapped, check if we should release
    if (snapState) {
      const toolObj = rulersAndProtractors.find((r) => r.id === snapState.rulerId);
      if (!toolObj || toolObj.toolData?.snapEnabled === false) {
        this.clearSnap(pointerId);
        return worldPoint;
      }

      const releaseDistance = toolObj.toolData?.snapDistance ? toolObj.toolData.snapDistance + 10 : this.SNAP_RELEASE_DISTANCE;
      const projected = this.projectToTool(worldPoint, toolObj);
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
        };
      }
    }

    // If not snapped, find closest tool
    for (const toolObj of rulersAndProtractors) {
      if (toolObj.toolData?.snapEnabled === false) continue;
      
      const activationDistance = toolObj.toolData?.snapDistance ?? this.SNAP_ACTIVATION_DISTANCE;
      const projected = this.projectToTool(worldPoint, toolObj);
      
      if (projected.distance <= activationDistance || isShiftPressed) {
        // Snap activated!
        this.activeSnaps.set(pointerId, { rulerId: toolObj.id });
        this.indicators.set(pointerId, projected.worldProjected);
        this.updateRenderer();
        return {
          x: projected.worldProjected.x,
          y: projected.worldProjected.y,
          pressure: worldPoint.pressure,
          time: worldPoint.time,
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
    const PROTRACTOR_RADIUS = 200;
    const center = {
      x: protractor.x + protractor.width / 2,
      y: protractor.y + protractor.height - 30, // crosshair center
    };

    const localPoint = rotatePoint(p, center, -(protractor.rotation || 0));

    // Calculate distance from center
    const distFromCenter = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);

    // Distances to the two edges
    // 1. Curved edge: arc of radius PROTRACTOR_RADIUS where local.y <= 0
    let curvedDistance = Infinity;
    if (localPoint.y <= 20) { // give some leeway below the axis
      curvedDistance = Math.abs(distFromCenter - PROTRACTOR_RADIUS);
    }

    // 2. Straight edge: line at local.y = 30 (the flat bottom)
    const straightDistance = Math.abs(localPoint.y - 30);

    // Decide which edge is closer
    if (curvedDistance < straightDistance && localPoint.y <= 20) {
      // Snap to curved edge
      // Normalize vector from center to localPoint, then multiply by RADIUS
      let angle = Math.atan2(localPoint.y, localPoint.x);
      // Clamp angle to top half (Math.PI to 0) which is y <= 0
      if (angle > 0) {
         if (angle > Math.PI / 2) angle = Math.PI; // Snap to left corner
         else angle = 0; // Snap to right corner
      }
      
      const projectedLocal = {
        x: PROTRACTOR_RADIUS * Math.cos(angle),
        y: PROTRACTOR_RADIUS * Math.sin(angle),
      };
      
      return {
        localPoint,
        projectedLocal,
        worldProjected: rotatePoint(projectedLocal, center, protractor.rotation || 0),
        distance: curvedDistance,
      };
    } else {
      // Snap to straight edge
      const projectedLocal = {
        x: localPoint.x,
        y: 30
      };
      
      return {
        localPoint,
        projectedLocal,
        worldProjected: rotatePoint(projectedLocal, center, protractor.rotation || 0),
        distance: straightDistance,
      };
    }
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
