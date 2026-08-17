import { ITool } from './ITool';
import { Point, WhiteboardObject, TextObject, BoundingBox, HandleType } from '../../types';
import {
  getCombinedBoundingBox,
  calculateBoundingBox,
} from '../../utils';
import { HitTest } from '../HitTest';
import { TransformObjectsCommand } from '../commands/TransformObjectsCommand';
import type { WhiteboardEngine } from '../WhiteboardEngine';
import { CompassInteraction } from '../../teaching-tools/compass/CompassInteraction';
import { CompassObject } from '../../types';
import { GroupManager } from '../../objects/GroupManager';

type DragMode = 'idle' | 'moving' | 'resizing' | 'rotating' | 'marquee' | 'compass-drag';

export class SelectTool implements ITool {
  public readonly name: string = 'select';

  private dragMode: DragMode = 'idle';
  private startPoint: Point | null = null;
  private activeHandle: HandleType | null = null;

  // Snapshots for undo/redo and live math
  private initialBoundingBox: BoundingBox | null = null;
  private initialObjectSnapshots: WhiteboardObject[] = [];
  private initialAngle: number = 0;

  // Double click detection
  private lastClickTime: number = 0;
  private lastClickObjId: string | null = null;

  public onPointerDown(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.startPoint = worldPoint;
    const selectedObjects = engine.getSelectedObjects();
    const zoom = engine.getTransformer().getZoom();

    // 1. Check if clicking on an active selection's bounding box or handles
    if (selectedObjects.length > 0) {
      const box = getCombinedBoundingBox(selectedObjects, 4 / zoom);
      
      let handle: HandleType | null = null;
      
      // Special check for Compass custom handles
      if (selectedObjects.length === 1 && selectedObjects[0].type === 'compass') {
         handle = CompassInteraction.hitTestCompass(worldPoint, selectedObjects[0] as CompassObject, zoom);
      }
      
      // Fallback to bounding box handles
      if (!handle && box) {
         handle = HitTest.hitTestHandle(worldPoint, box, zoom, e.pointerType === 'touch' ? 26 : 12);
      }

      if (handle) {
        const anyLocked = selectedObjects.some(obj => obj.locked);
        if (anyLocked) {
          this.dragMode = 'idle';
          return;
        }

        this.activeHandle = handle;
        this.initialBoundingBox = box;
        
        // Snapshot all descendants so children move/scale with the group
        const allAffected = GroupManager.getAllAffectedObjects(
          selectedObjects.map((o) => o.id),
          engine.getObjects()
        );
        this.initialObjectSnapshots = JSON.parse(JSON.stringify(allAffected));

        if (handle === 'rotate' && box) {
          this.dragMode = 'rotating';
          const cx = box.minX + box.width / 2;
          const cy = box.minY + box.height / 2;
          this.initialAngle = Math.atan2(worldPoint.y - cy, worldPoint.x - cx);
        } else if (handle === 'body') {
          this.dragMode = 'moving';
        } else if (handle === 'compass-needle' || handle === 'compass-pencil' || handle === 'compass-body') {
          this.dragMode = 'compass-drag';
        } else {
          this.dragMode = 'resizing';
        }
        return;
      }
    }

    // 2. Not clicking existing selection handle; hit test objects directly
    const hitObj = HitTest.findObjectAtPoint(
      worldPoint,
      engine.getObjects(),
      (e.pointerType === 'touch' ? 22 : 8) / zoom,
    );

    if (hitObj) {
      const now = Date.now();
      if (
        (hitObj.type === 'text' || hitObj.type === 'youtubeVideo' || hitObj.type === 'webApp') &&
        this.lastClickObjId === hitObj.id &&
        now - this.lastClickTime < 350
      ) {
        if (hitObj.type === 'text') {
          const textObj = hitObj as TextObject;
          engine.startTextEditing({
            id: textObj.id,
            worldPoint: { x: textObj.x, y: textObj.y },
            initialText: textObj.text,
            fontSize: textObj.fontSize,
            fontFamily: textObj.fontFamily,
            fontWeight: textObj.fontWeight,
            fontStyle: textObj.fontStyle,
            underline: textObj.underline,
            textAlign: textObj.textAlign,
            color: textObj.color,
            width: textObj.width,
            height: textObj.height,
            rotation: textObj.rotation,
          });
        } else if (hitObj.type === 'youtubeVideo' || hitObj.type === 'webApp') {
          engine.getObjectManager().updateObject(hitObj.id, { isInteractive: true });
        }
        
        this.lastClickTime = 0;
        this.lastClickObjId = null;
        this.dragMode = 'idle';
        return;
      }

      this.lastClickTime = now;
      this.lastClickObjId = hitObj.id;

      const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
      let newSelection = new Set(engine.getSelectedIds());
      
      if (isShift) {
        if (newSelection.has(hitObj.id)) {
          newSelection.delete(hitObj.id);
        } else {
          newSelection.add(hitObj.id);
        }
      } else {
        if (!engine.isSelected(hitObj.id)) {
          newSelection = new Set([hitObj.id]);
        }
      }

      // Expand to effective selection (select parent groups)
      newSelection = engine.getObjectManager().getEffectiveSelection(newSelection);
      // Ensure we don't select locked objects
      newSelection = engine.getObjectManager().filterLocked(newSelection);
      
      engine.setSelectedIds(Array.from(newSelection));

      // Prepare for potential move immediately
      const activeSelection = engine.getSelectedObjects();
      const anyLocked = activeSelection.some(obj => obj.locked);
      if (anyLocked) {
        this.dragMode = 'idle';
        this.activeHandle = null;
        this.initialObjectSnapshots = [];
      } else {
        this.dragMode = 'moving';
        this.activeHandle = 'body';
        this.initialBoundingBox = getCombinedBoundingBox(activeSelection, 4 / zoom);
        // Snapshot all descendants so children move/scale with the group
        const allAffected = GroupManager.getAllAffectedObjects(
          activeSelection.map((o) => o.id),
          engine.getObjects()
        );
        this.initialObjectSnapshots = JSON.parse(JSON.stringify(allAffected));
      }
    } else {
      // 3. Clicked empty canvas -> Start Marquee selection or deselect
      if (!e.shiftKey && !e.ctrlKey) {
        engine.clearSelection();
      }
      this.dragMode = 'marquee';
      this.activeHandle = null;
      this.initialObjectSnapshots = [];
    }
  }

  public onPointerMove(
    worldPoint: Point,
    _screenPoint: Point,
    e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    const zoom = engine.getTransformer().getZoom();

    if (this.dragMode === 'idle') {
      // Hover cursor management
      this.updateCursor(worldPoint, engine);
      return;
    }

    if (!this.startPoint) return;

    if (this.dragMode === 'marquee') {
      const minX = Math.min(this.startPoint.x, worldPoint.x);
      const minY = Math.min(this.startPoint.y, worldPoint.y);
      const maxX = Math.max(this.startPoint.x, worldPoint.x);
      const maxY = Math.max(this.startPoint.y, worldPoint.y);
      const marqueeBox: BoundingBox = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };

      engine.getRenderer().setMarqueeBox(marqueeBox);

      // Dynamically select objects within marquee
      const hits = HitTest.findObjectsInBox(marqueeBox, engine.getObjects());
      let hitIds = new Set(hits.map((h) => h.id));
      hitIds = engine.getObjectManager().getEffectiveSelection(hitIds);
      hitIds = engine.getObjectManager().filterLocked(hitIds);
      engine.setSelectedIds(Array.from(hitIds));
      return;
    }

    if (this.dragMode === 'compass-drag' && this.startPoint) {
       const dx = worldPoint.x - this.startPoint.x;
       const dy = worldPoint.y - this.startPoint.y;
       
       const compassSnapshot = this.initialObjectSnapshots[0] as CompassObject;
       const newCompass = { ...compassSnapshot };
       
       if (this.activeHandle === 'compass-needle') {
          // Move the entire compass
          newCompass.centerX = compassSnapshot.centerX + dx;
          newCompass.centerY = compassSnapshot.centerY + dy;
          newCompass.x = compassSnapshot.x + dx;
          newCompass.y = compassSnapshot.y + dy;
       } else if (this.activeHandle === 'compass-pencil') {
          // Adjust radius
          const newRadius = Math.sqrt(Math.pow(worldPoint.x - compassSnapshot.centerX, 2) + Math.pow(worldPoint.y - compassSnapshot.centerY, 2));
          newCompass.radius = Math.max(20, newRadius); // Minimum radius
          
          // Optionally, also update the angle so it follows the pointer exactly
          newCompass.angle = Math.atan2(worldPoint.y - compassSnapshot.centerY, worldPoint.x - compassSnapshot.centerX);
       } else if (this.activeHandle === 'compass-body') {
          // Rotate compass
          newCompass.angle = Math.atan2(worldPoint.y - compassSnapshot.centerY, worldPoint.x - compassSnapshot.centerX);
       }

       engine.updateObjectsSilently([newCompass]);
       
       // Clear selection box so it doesn't look weird while manipulating handles, or update it
       engine.getRenderer().setSelectionBox(null, null); 
       return;
    }

    if (this.dragMode === 'moving') {
      const dx = worldPoint.x - this.startPoint.x;
      const dy = worldPoint.y - this.startPoint.y;

      const updatedObjects = this.initialObjectSnapshots.map((obj) => {
        if (obj.type === 'shape' || obj.type === 'text' || obj.type === 'image' || obj.type === 'youtubeVideo' || obj.type === 'webApp' || obj.type === 'video' || obj.type === 'audio' || obj.type === 'image-audio' || obj.type === 'pdf' || obj.type === 'teaching-tool' || obj.type === 'compass' || obj.type === 'circle' || obj.type === 'arc') {
          const newObj = { ...obj } as any;
          newObj.x = obj.x + dx;
          newObj.y = obj.y + dy;
          if (newObj.centerX !== undefined && newObj.centerY !== undefined) {
             newObj.centerX += dx;
             newObj.centerY += dy;
          }
          if (newObj.points) {
            newObj.points = newObj.points.map((p: any) => ({ ...p, x: p.x + dx, y: p.y + dy }));
          }
          return newObj;
        } else if (obj.type === 'stroke') {
          const stroke = { ...obj };
          stroke.x = obj.x + dx;
          stroke.y = obj.y + dy;
          stroke.points = stroke.points.map((p) => ({
            ...p,
            x: p.x + dx,
            y: p.y + dy,
          }));
          return stroke;
        }
        return obj;
      });

      engine.updateObjectsSilently(updatedObjects);
      const newBox = getCombinedBoundingBox(updatedObjects, 4 / zoom);
      engine.getRenderer().setSelectionBox(newBox, this.activeHandle);
      return;
    }

    if (this.dragMode === 'rotating' && this.initialBoundingBox) {
      const box = this.initialBoundingBox;
      const cx = box.minX + box.width / 2;
      const cy = box.minY + box.height / 2;
      const currentAngle = Math.atan2(worldPoint.y - cy, worldPoint.x - cx);
      let dAngle = currentAngle - this.initialAngle;

      if (e.shiftKey) {
        // Snap to 15-degree increments (PI / 12)
        const step = Math.PI / 12;
        dAngle = Math.round(dAngle / step) * step;
      }

      const updatedObjects = this.initialObjectSnapshots.map((obj) => {
        const newObj = { ...obj } as any;
        newObj.rotation = (obj.rotation || 0) + dAngle;
        return newObj;
      });

      engine.updateObjectsSilently(updatedObjects);
      const newBox = getCombinedBoundingBox(updatedObjects, 4 / zoom);
      engine.getRenderer().setSelectionBox(newBox, this.activeHandle);
      return;
    }

    if (this.dragMode === 'resizing' && this.initialBoundingBox && this.activeHandle) {
      const handle = this.activeHandle;
      const initialBox = this.initialBoundingBox;

      const dx = worldPoint.x - this.startPoint.x;
      const dy = worldPoint.y - this.startPoint.y;

      let newMinX = initialBox.minX;
      let newMinY = initialBox.minY;
      let newMaxX = initialBox.maxX;
      let newMaxY = initialBox.maxY;

      if (handle.includes('w')) newMinX += dx;
      if (handle.includes('e')) newMaxX += dx;
      if (handle.includes('n')) newMinY += dy;
      if (handle.includes('s')) newMaxY += dy;

      const newWidth = Math.max(10, newMaxX - newMinX);
      const newHeight = Math.max(10, newMaxY - newMinY);

      const scaleX = initialBox.width > 0 ? newWidth / initialBox.width : 1;
      const scaleY = initialBox.height > 0 ? newHeight / initialBox.height : 1;

      const originX = handle.includes('w') ? initialBox.maxX : initialBox.minX;
      const originY = handle.includes('n') ? initialBox.maxY : initialBox.minY;

      const updatedObjects = this.initialObjectSnapshots.map((obj) => {
        if (obj.type === 'shape' || obj.type === 'text' || obj.type === 'image' || obj.type === 'youtubeVideo' || obj.type === 'webApp' || obj.type === 'video' || obj.type === 'audio' || obj.type === 'image-audio' || obj.type === 'pdf') {
          const newObj = { ...obj } as any;
          const relX = obj.x - originX;
          const relY = obj.y - originY;
          newObj.x = originX + relX * scaleX;
          newObj.y = originY + relY * scaleY;
          newObj.width = Math.max(5, obj.width * scaleX);
          newObj.height = Math.max(5, obj.height * scaleY);
          
          if (obj.type === 'text' && newObj.fontSize) {
            newObj.fontSize = Math.max(8, obj.fontSize * Math.min(scaleX, scaleY));
          }

          if (newObj.points) {
            newObj.points = newObj.points.map((p: any) => ({
              ...p,
              x: originX + (p.x - originX) * scaleX,
              y: originY + (p.y - originY) * scaleY,
            }));
          }
          return newObj;
        } else if (obj.type === 'stroke') {
          const stroke = { ...obj };
          const relX = obj.x - originX;
          const relY = obj.y - originY;
          stroke.x = originX + relX * scaleX;
          stroke.y = originY + relY * scaleY;
          stroke.points = stroke.points.map((p) => ({
            ...p,
            x: originX + (p.x - originX) * scaleX,
            y: originY + (p.y - originY) * scaleY,
          }));
          const bounds = calculateBoundingBox(stroke.points);
          stroke.width = Math.max(1, bounds.width);
          stroke.height = Math.max(1, bounds.height);
          return stroke;
        }
        return obj;
      });

      engine.updateObjectsSilently(updatedObjects);
      const newBox = getCombinedBoundingBox(updatedObjects, 4 / zoom);
      engine.getRenderer().setSelectionBox(newBox, this.activeHandle);
      return;
    }
  }

  public onPointerUp(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    if (this.dragMode === 'marquee') {
      engine.getRenderer().setMarqueeBox(null);
    } else if (this.dragMode === 'moving' || this.dragMode === 'resizing' || this.dragMode === 'rotating' || this.dragMode === 'compass-drag') {
      // Commit the transform command for undo/redo
      if (this.initialObjectSnapshots.length > 0) {
        const snapshotIds = new Set(this.initialObjectSnapshots.map(o => o.id));
        const currentStates = engine.getObjects().filter(o => snapshotIds.has(o.id));

        if (currentStates.length > 0) {
          const cmd = new TransformObjectsCommand(
            this.initialObjectSnapshots,
            currentStates,
            () => engine.getObjects(),
            (objects) => engine.setObjects(objects),
            this.dragMode === 'moving' || this.dragMode === 'compass-drag' ? 'Move' : this.dragMode === 'rotating' ? 'Rotate' : 'Resize'
          );
          // We push this directly into CommandManager history stack without calling execute again
          // since objects are already transformed in memory
          engine.getCommandManager().recordCommand(cmd);
        }
      }
    }

    this.dragMode = 'idle';
    this.startPoint = null;
    this.activeHandle = null;
    this.initialBoundingBox = null;
    this.initialObjectSnapshots = [];

    // Re-render selection box cleanly
    const zoom = engine.getTransformer().getZoom();
    const box = getCombinedBoundingBox(engine.getSelectedObjects(), 4 / zoom);
    engine.getRenderer().setSelectionBox(box, null);
  }

  public onPointerCancel(
    _worldPoint: Point,
    _screenPoint: Point,
    _e: PointerEvent,
    engine: WhiteboardEngine
  ): void {
    this.dragMode = 'idle';
    this.startPoint = null;
    this.activeHandle = null;
    engine.getRenderer().setMarqueeBox(null);
    const zoom = engine.getTransformer().getZoom();
    const box = getCombinedBoundingBox(engine.getSelectedObjects(), 4 / zoom);
    engine.getRenderer().setSelectionBox(box, null);
  }

  public onDeactivate(engine: WhiteboardEngine): void {
    this.dragMode = 'idle';
    this.startPoint = null;
    this.activeHandle = null;
    engine.getRenderer().setMarqueeBox(null);
    engine.getRenderer().setSelectionBox(null, null);
  }

  private updateCursor(worldPoint: Point, engine: WhiteboardEngine): void {
    const selectedObjects = engine.getSelectedObjects();
    const zoom = engine.getTransformer().getZoom();
    const canvas = engine.getCanvas();
    if (!canvas) return;

    if (selectedObjects.length > 0) {
      const box = getCombinedBoundingBox(selectedObjects, 4 / zoom);
      if (box) {
        const handle = HitTest.hitTestHandle(worldPoint, box, zoom);
        if (handle) {
          switch (handle) {
            case 'nw':
            case 'se':
              canvas.style.cursor = 'nwse-resize';
              return;
            case 'ne':
            case 'sw':
              canvas.style.cursor = 'nesw-resize';
              return;
            case 'n':
            case 's':
              canvas.style.cursor = 'ns-resize';
              return;
            case 'e':
            case 'w':
              canvas.style.cursor = 'ew-resize';
              return;
            case 'rotate':
              canvas.style.cursor = 'crosshair';
              return;
            case 'compass-pencil':
            case 'compass-body':
              canvas.style.cursor = 'crosshair';
              return;
            case 'compass-needle':
              canvas.style.cursor = 'move';
              return;
            case 'body':
              canvas.style.cursor = 'move';
              return;
          }
        }
      }
    }

    const hitObj = HitTest.findObjectAtPoint(worldPoint, engine.getObjects(), 8 / zoom);
    if (hitObj) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  }
}
