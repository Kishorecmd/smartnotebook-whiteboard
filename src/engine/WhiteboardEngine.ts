import { CoordinateTransformer, CanvasRenderer, TextRenderer } from '../canvas';
import { CommandManager } from './CommandManager';
import { PointerManager } from '../input/PointerManager';
import { InputRouter } from '../input/InputRouter';
import { GestureEngine } from '../input/GestureEngine';
import { TouchActionManager } from '../input/TouchActionManager';
import { RulerSnapper } from './RulerSnapper';
import { StorageService } from '../services/StorageService';
import { MediaManager } from '../media/MediaManager';
import { ITool } from './tools/ITool';
import { PenFamilyTool } from './tools/PenFamilyTool';
import { MarkerTool } from './tools/MarkerTool';
import { EraserTool } from './tools/EraserTool';
import { ShapeTool } from './tools/ShapeTool';
import { SelectTool } from './tools/SelectTool';
import { PanTool } from './tools/PanTool';
import { TextTool } from './tools/TextTool';
import { LaserTool } from './tools/LaserTool';
import { SpotlightTool } from './tools/SpotlightTool';
import { MagicPenTool } from './tools/MagicPenTool';
import { PencilTool } from './tools/PencilTool';
import { BrushTool } from './tools/BrushTool';
import { CrayonTool } from './tools/CrayonTool';
import { HighlighterTool } from './tools/HighlighterTool';
import { MagicEraserTool } from './tools/MagicEraserTool';
import { EyedropperTool } from './tools/EyedropperTool';
import { FillTool } from './tools/FillTool';
import { ClearPageCommand } from './commands/ClearPageCommand';
import { DeleteObjectsCommand } from './commands/DeleteObjectsCommand';
import { AddObjectCommand } from './commands/AddObjectCommand';
import { ReorderObjectsCommand, ReorderAction } from './commands/ReorderObjectsCommand';
import { ChangeStyleCommand, StylePatch } from './commands/ChangeStyleCommand';
import { UpdateTextContentCommand } from './commands/UpdateTextContentCommand';
import { ConvertStrokesToTextCommand } from './commands/ConvertStrokesToTextCommand';
import { createTextObject } from '../models';
import {
  WhiteboardObject,
  TextObject,
  FreehandStroke,
  ToolType,
  ToolSettings,
  CanvasBackgroundType,
  EngineCallbacks,
  ViewportTransform,
  HistoryState,
  TextEditRequest,
  Point,
} from '../types';
import { getCombinedBoundingBox, calculateBoundingBox, generateId } from '../utils';

export interface WhiteboardEngineOptions {
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
  initialObjects?: WhiteboardObject[];
  initialSettings?: Partial<ToolSettings>;
  callbacks?: EngineCallbacks;
}

export class WhiteboardEngine {
  private canvasElement: HTMLCanvasElement;
  private transformer: CoordinateTransformer;
  private renderer: CanvasRenderer;
  private pointerManager: PointerManager;
  private inputRouter: InputRouter;
  private gestureEngine: GestureEngine;
  private touchActionManager: TouchActionManager;
  private commandManager: CommandManager;
  private rulerSnapper: RulerSnapper;
  // Object URLs for local video blobs, revoked on dispose.
  private videoObjectUrls: Map<string, string> = new Map();

  // Tools registry
  private tools: Map<ToolType, ITool> = new Map();
  private activeToolType: ToolType = 'pen';

  // Tool settings
  private settings: ToolSettings = {
    tool: 'pen',
    activePenId: 'fine',
    color: '#1e293b',
    penWidth: 4,
    pencilWidth: 3,
    brushWidth: 12,
    crayonWidth: 16,
    highlighterWidth: 24,
    markerWidth: 24,
    eraserWidth: 28,
    markerOpacity: 0.4,
    opacity: 1.0,
    smoothingLevel: 'medium',
    eraserMode: 'stroke',
    shapeType: 'rectangle',
    shapeFillColor: 'transparent',
    shapeStrokeStyle: 'solid',
    shapeStrokeWidth: 3,
    textFontSize: 28,
    textFontFamily: 'Inter, sans-serif',
    textFontWeight: 'normal',
    textFontStyle: 'normal',
    textUnderline: false,
    textAlign: 'left',
    textColor: '#1e293b',
    magicPenMode: 'ink',
    magicPenDuration: 3000,
    magicPenMagnification: 2.0,
    magicPenPermanent: false,
  };

  // Document objects in current page
  private objects: WhiteboardObject[] = [];
  private background: string = '#ffffff';
  private backgroundType: CanvasBackgroundType = 'plain';

  // Selection state
  private selectedIds: Set<string> = new Set();

  // Teaching Tools State
  private transientStrokes: FreehandStroke[] = [];
  private spotlightPosition: Point | null = null;
  private spotlightRadius: number = 150;
  private magnifierPosition: Point | null = null;
  private magnifierRadius: number = 150;
  
  // Keyboard State
  private spacePressed: boolean = false;

  // Callbacks to UI
  private callbacks: EngineCallbacks = {};

  constructor(options: WhiteboardEngineOptions) {
    this.canvasElement = options.canvas;
    this.callbacks = options.callbacks || {};

    if (options.initialSettings) {
      this.settings = { ...this.settings, ...options.initialSettings };
      this.activeToolType = this.settings.tool;
    }

    if (options.initialObjects) {
      this.objects = [...options.initialObjects];
    }

    // 1. Initialize Transformation Matrix
    this.transformer = new CoordinateTransformer();

    // 2. Initialize Canvas Renderer
    this.renderer = new CanvasRenderer({
      canvas: options.canvas,
      overlayCanvas: options.overlayCanvas,
      transformer: this.transformer,
    });
    this.renderer.setObjects(this.objects);

    // 3. Register Tools
    this.registerTools();

    // 4. Initialize Command / History Stack
    this.commandManager = new CommandManager(50, (state: HistoryState) => {
      if (this.callbacks.onHistoryChange) {
        this.callbacks.onHistoryChange(state);
      }
    });

    // 5. Initialize Ruler Snapper
    this.rulerSnapper = new RulerSnapper(this);

    // 6. Initialize Multitouch Input Engine
    const inputElement = options.overlayCanvas || options.canvas;
    
    this.touchActionManager = new TouchActionManager(inputElement, 'none');
    
    this.gestureEngine = new GestureEngine({
      transformer: this.transformer,
      onPanZoom: () => {
        this.render();
        // Pinch/two-finger gestures move the transformer directly, so the store
        // needs telling too or the zoom indicator and any viewport consumers go stale.
        this.notifyViewportChange();
      },
    });
    
    this.inputRouter = new InputRouter(this, this.gestureEngine);
    
    this.pointerManager = new PointerManager({
      element: inputElement,
      onPointerAdd: (pointer, e) => this.inputRouter.onPointerAdd(pointer, e, this.pointerManager.getActivePointers()),
      onPointerUpdate: (pointer, e) => this.inputRouter.onPointerUpdate(pointer, e, this.pointerManager.getActivePointers()),
      onPointerRemove: (pointer, e) => this.inputRouter.onPointerRemove(pointer, e, this.pointerManager.getActivePointers()),
    });
  }

  private registerTools(): void {
    // The pen slot is now the whole pen family; behaviour comes from the active
    // PenPreset rather than from this registration.
    this.tools.set('pen', new PenFamilyTool());
    this.tools.set('marker', new MarkerTool());
    this.tools.set('eraser', new EraserTool());
    this.tools.set('shape', new ShapeTool());
    this.tools.set('select', new SelectTool());
    this.tools.set('pan', new PanTool());
    this.tools.set('text', new TextTool());
    this.tools.set('laser', new LaserTool());
    this.tools.set('spotlight', new SpotlightTool());
    this.tools.set('magic_pen', new MagicPenTool());
    this.tools.set('pencil', new PencilTool());
    this.tools.set('brush', new BrushTool());
    this.tools.set('crayon', new CrayonTool());
    this.tools.set('highlighter', new HighlighterTool());
    this.tools.set('magic_eraser', new MagicEraserTool());
    this.tools.set('eyedropper', new EyedropperTool());
    this.tools.set('fill', new FillTool());
  }

  // --- Getters & Accessors ---

  public getTransformer(): CoordinateTransformer {
    return this.transformer;
  }

  public getRenderer(): CanvasRenderer {
    return this.renderer;
  }

  public getRulerSnapper(): RulerSnapper {
    return this.rulerSnapper;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvasElement;
  }

  public getPointerManager(): PointerManager {
    return this.pointerManager;
  }

  public getInputRouter(): InputRouter {
    return this.inputRouter;
  }

  public getCommandManager(): CommandManager {
    return this.commandManager;
  }

  public isSpacePressed(): boolean {
    return this.spacePressed;
  }

  public setSpacePressed(pressed: boolean): void {
    this.spacePressed = pressed;
  }

  public getActiveTool(): ITool | undefined {
    return this.tools.get(this.activeToolType);
  }

  public getActiveToolType(): ToolType {
    return this.activeToolType;
  }

  public setActiveTool(toolType: ToolType): void {
    if (this.activeToolType === toolType) return;

    const oldTool = this.getActiveTool();
    if (oldTool && oldTool.onDeactivate) {
      oldTool.onDeactivate(this);
    }

    this.activeToolType = toolType;
    this.settings.tool = toolType;

    // Clear marquee/previews when switching tools
    this.renderer.clearOverlay();

    // Deselect if switching to a drawing tool
    if (toolType !== 'select') {
      this.clearSelection();
    }

    if (this.callbacks.onToolChange) {
      this.callbacks.onToolChange(toolType);
    }
  }

  public setTool(toolType: ToolType): void {
    this.setActiveTool(toolType);
  }

  public getToolSettings(): ToolSettings {
    return { ...this.settings };
  }

  public updateToolSettings(newSettings: Partial<ToolSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.tool) {
      this.setActiveTool(newSettings.tool);
    }
  }

  public getObjects(): WhiteboardObject[] {
    return [...this.objects];
  }

  // --- Selection Methods ---

  public getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  public getSelectedObjects(): WhiteboardObject[] {
    return this.objects.filter((obj) => this.selectedIds.has(obj.id));
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public setSelectedIds(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.updateSelectionVisuals();
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(this.getSelectedIds());
    }
  }

  public toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.updateSelectionVisuals();
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(this.getSelectedIds());
    }
  }

  public clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.updateSelectionVisuals();
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange([]);
    }
  }

  public selectAll(): void {
    this.selectedIds = new Set(this.objects.map((o) => o.id));
    this.updateSelectionVisuals();
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(this.getSelectedIds());
    }
  }

  public updateSelectionVisuals(): void {
    const selected = this.getSelectedObjects();
    const zoom = this.transformer.getZoom();
    const box = getCombinedBoundingBox(selected, 4 / zoom);
    this.renderer.setSelectionBox(box);
  }

  // --- Object Lifecycle & Mutation ---

  public addObject(obj: WhiteboardObject): void {
    const command = new AddObjectCommand(
      obj,
      () => this.getObjects(),
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(command);
  }

  public deleteObject(id: string): void {
    const obj = this.objects.find((o) => o.id === id);
    if (!obj) return;

    const command = new DeleteObjectsCommand(
      [obj],
      () => this.getObjects(),
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(command);
  }

  public setObjects(objects: WhiteboardObject[], notify: boolean = true): void {
    this.objects = [...objects];
    
    // Prune selected IDs that no longer exist
    const validIds = new Set(objects.map((o) => o.id));
    let selectionChanged = false;
    for (const id of this.selectedIds) {
      if (!validIds.has(id)) {
        this.selectedIds.delete(id);
        selectionChanged = true;
      }
    }

    this.updateSelectionVisuals();

    if (selectionChanged && this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(this.getSelectedIds());
    }

    if (notify && this.callbacks.onDocumentChange) {
      this.callbacks.onDocumentChange(objects);
    }
    
    this.renderer.setObjects(this.objects);
    this.renderer.setTransientStrokes(this.transientStrokes);
    this.renderer.setSpotlight(this.spotlightPosition, this.spotlightRadius);
    this.renderer.setMagnifier(this.magnifierPosition, this.magnifierRadius);
  }

  public updateObjectsSilently(objects: WhiteboardObject[]): void {
    const updatedMap = new Map(objects.map((o) => [o.id, o]));
    this.objects = this.objects.map((o) => updatedMap.get(o.id) || o);
    this.renderer.setObjects(this.objects);
    // Used during active dragging/resizing so we don't trigger heavy history saves or react state updates
  }

  // --- Teaching Tools Methods ---
  public addTransientStroke(stroke: FreehandStroke): void {
    this.transientStrokes.push(stroke);
    this.renderer.setTransientStrokes(this.transientStrokes);
  }

  public getTransientStrokes(): FreehandStroke[] {
    return this.transientStrokes;
  }

  public setTransientStrokes(strokes: FreehandStroke[]): void {
    this.transientStrokes = strokes;
    this.render();
  }

  public setSpotlight(position: Point | null, radius?: number): void {
    this.spotlightPosition = position;
    if (radius !== undefined) {
      this.spotlightRadius = radius;
    }
    this.render();
  }

  public getSpotlightRadius(): number {
    return this.spotlightRadius;
  }

  public setMagnifier(position: Point | null, radius?: number, zoom?: number): void {
    this.magnifierPosition = position;
    if (radius !== undefined) {
      this.magnifierRadius = radius;
    }
    const finalZoom = zoom ?? 2.0;
    this.renderer.setMagnifier(this.magnifierPosition, this.magnifierRadius, finalZoom);
    this.render();
  }

  public getMagnifierRadius(): number {
    return this.magnifierRadius;
  }

  public setBackground(color: string, type: CanvasBackgroundType = 'plain'): void {
    this.background = color;
    this.backgroundType = type;
    this.renderer.setBackground(color, type);
  }

  public getBackground(): string {
    return this.background;
  }

  public getBackgroundType(): CanvasBackgroundType {
    return this.backgroundType;
  }

  public resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  // --- Selected Object Actions ---

  public deleteSelected(): void {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;

    const cmd = new DeleteObjectsCommand(
      selected,
      () => this.getObjects(),
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(cmd);
    this.clearSelection();
  }

  public duplicateSelected(): void {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;

    const offset = 24;
    const clonedObjects: WhiteboardObject[] = [];
    const newSelectedIds: string[] = [];

    for (const orig of selected) {
      const now = Date.now();
      const newId = generateId(orig.type);
      newSelectedIds.push(newId);

      if (orig.type === 'shape') {
        clonedObjects.push({
          ...orig,
          id: newId,
          x: orig.x + offset,
          y: orig.y + offset,
          points: orig.points
            ? orig.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset }))
            : undefined,
          createdAt: now,
          updatedAt: now,
        });
      } else if (orig.type === 'stroke') {
        clonedObjects.push({
          ...orig,
          id: newId,
          x: orig.x + offset,
          y: orig.y + offset,
          points: orig.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Everything else (text, image, youtubeVideo, teaching-tool, coloringRegion)
        // duplicates by offsetting position; previously these silently produced no
        // clone, which also cleared the selection via setSelectedIds([]) below.
        clonedObjects.push({
          ...orig,
          id: newId,
          x: orig.x + offset,
          y: orig.y + offset,
          ...(('points' in orig && Array.isArray((orig as any).points))
            ? { points: (orig as any).points.map((p: any) => ({ ...p, x: p.x + offset, y: p.y + offset })) }
            : {}),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (clonedObjects.length === 0) return;

    // Add each object via command or combined list
    for (const clone of clonedObjects) {
      const cmd = new AddObjectCommand(
        clone,
        () => this.getObjects(),
        (objs) => this.setObjects(objs),
        'Duplicate'
      );
      this.commandManager.execute(cmd);
    }

    this.setSelectedIds(newSelectedIds);
  }

  public reorderSelected(action: ReorderAction): void {
    const ids = this.getSelectedIds();
    if (ids.length === 0) return;

    const cmd = new ReorderObjectsCommand(
      ids,
      action,
      () => this.getObjects(),
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(cmd);
  }

  public applySelectedStyle(patch: StylePatch): void {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;

    const cmd = new ChangeStyleCommand(
      selected,
      patch,
      () => this.getObjects(),
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(cmd);
  }

  // --- In-place Text Editing Methods ---

  public startTextEditing(req: TextEditRequest): void {
    if (this.callbacks.onStartTextEditing) {
      this.callbacks.onStartTextEditing(req);
    }
  }

  public commitTextEdit(params: {
    id?: string;
    text: string;
    worldPoint: Point;
    fontSize: number;
    fontFamily: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    underline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    color: string;
    backgroundColor?: string;
    rotation?: number;
  }): void {
    const trimmed = params.text.trim();
    if (!trimmed) {
      // If editing an existing object and cleared the text, delete it
      if (params.id) {
        this.deleteObject(params.id);
      }
      return;
    }

    const bounds = TextRenderer.measureTextBounds(
      params.text,
      params.fontSize,
      params.fontFamily,
      params.fontWeight ?? 'normal',
      params.fontStyle ?? 'normal'
    );

    if (params.id) {
      // Update existing text object
      const existing = this.objects.find((o) => o.id === params.id && o.type === 'text') as TextObject | undefined;
      if (existing) {
        const cmd = new UpdateTextContentCommand(
          existing,
          {
            text: params.text,
            width: bounds.width,
            height: bounds.height,
            fontSize: params.fontSize,
            fontFamily: params.fontFamily,
            fontWeight: params.fontWeight,
            fontStyle: params.fontStyle,
            underline: params.underline,
            textAlign: params.textAlign,
            color: params.color,
            backgroundColor: params.backgroundColor,
          },
          () => this.getObjects(),
          (objs) => this.setObjects(objs)
        );
        this.commandManager.execute(cmd);
        this.setSelectedIds([params.id]);
      }
    } else {
      // Create new text object
      const textObj = createTextObject({
        text: params.text,
        x: params.worldPoint.x,
        y: params.worldPoint.y,
        width: bounds.width,
        height: bounds.height,
        fontSize: params.fontSize,
        fontFamily: params.fontFamily,
        fontWeight: params.fontWeight,
        fontStyle: params.fontStyle,
        underline: params.underline,
        textAlign: params.textAlign,
        color: params.color,
        backgroundColor: params.backgroundColor,
        rotation: params.rotation ?? 0,
      });

      const cmd = new AddObjectCommand(
        textObj,
        () => this.getObjects(),
        (objs) => this.setObjects(objs),
        'Add Text'
      );
      this.commandManager.execute(cmd);
      this.setSelectedIds([textObj.id]);
    }
  }

  /**
   * Converts given stroke objects into a TextObject using ConvertStrokesToTextCommand.
   */
  public convertStrokesToText(params: {
    strokeIds: string[];
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    underline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    replace?: boolean;
    worldPoint?: Point;
  }): TextObject | null {
    const allStrokes = this.objects.filter(
      (obj): obj is FreehandStroke => obj.type === 'stroke' && params.strokeIds.includes(obj.id)
    );

    if (allStrokes.length === 0 && !params.worldPoint) {
      return null;
    }

    const replace = params.replace !== false;
    const allPoints = allStrokes.flatMap((s) => s.points);
    const bounds = allPoints.length > 0 ? calculateBoundingBox(allPoints, 0) : null;

    const posX = params.worldPoint ? params.worldPoint.x : (bounds ? bounds.minX : 100);
    const posY = params.worldPoint ? params.worldPoint.y : (bounds ? bounds.minY : 100);

    const fontSize = params.fontSize || this.settings.textFontSize || 28;
    const fontFamily = params.fontFamily || this.settings.textFontFamily || 'Inter, sans-serif';
    const fontWeight = params.fontWeight || 'normal';
    const fontStyle = params.fontStyle || 'normal';
    const underline = params.underline || false;
    const textAlign = params.textAlign || 'left';
    const color = params.color || (allStrokes[0]?.color ?? this.settings.textColor);

    const textBounds = TextRenderer.measureTextBounds(
      params.text,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle
    );

    const textObj = createTextObject({
      text: params.text,
      x: posX,
      y: posY,
      width: Math.max(textBounds.width, bounds?.width ?? 100),
      height: Math.max(textBounds.height, bounds?.height ?? 40),
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      underline,
      textAlign,
      color,
    });

    const cmd = new ConvertStrokesToTextCommand(
      allStrokes,
      textObj,
      replace,
      () => this.getObjects(),
      (objs) => this.setObjects(objs),
      (id) => {
        if (id) {
          this.setSelectedIds([id]);
        } else {
          this.clearSelection();
        }
      }
    );

    this.commandManager.execute(cmd);
    return textObj;
  }

  // --- Viewport & Zoom Controls ---

  public panBy(dx: number, dy: number): void {
    this.transformer.panBy(dx, dy);
    this.renderer.requestRender();
    this.updateSelectionVisuals();
    this.notifyViewportChange();
  }

  public zoomAt(screenX: number, screenY: number, newZoom: number): void {
    this.transformer.zoomAt(screenX, screenY, newZoom);
    this.renderer.requestRender();
    this.updateSelectionVisuals();
    this.notifyViewportChange();
  }

  public zoomIn(): void {
    const currentZoom = this.transformer.getZoom();
    const targetZoom = Math.min(CoordinateTransformer.MAX_ZOOM, currentZoom * 1.25);
    const rect = this.canvasElement.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, targetZoom);
  }

  public zoomOut(): void {
    const currentZoom = this.transformer.getZoom();
    const targetZoom = Math.max(CoordinateTransformer.MIN_ZOOM, currentZoom * 0.8);
    const rect = this.canvasElement.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, targetZoom);
  }

  public render(): void {
    this.renderer.setTransientStrokes(this.transientStrokes);
    this.renderer.setSpotlight(this.spotlightPosition, this.spotlightRadius);
    this.renderer.setSnapIndicators(this.rulerSnapper.getIndicators());
    this.renderer.requestRender();
  }

  public resetZoom(): void {
    this.transformer.reset();
    this.renderer.requestRender();
    this.updateSelectionVisuals();
    this.notifyViewportChange();
  }

  public zoomToFit(): void {
    if (this.objects.length === 0) {
      this.resetZoom();
      return;
    }

    const totalBounds = getCombinedBoundingBox(this.objects, 50);
    if (!totalBounds) return;

    const rect = this.canvasElement.getBoundingClientRect();
    this.transformer.zoomToFit(totalBounds, rect.width, rect.height, 40);
    this.renderer.requestRender();
    this.updateSelectionVisuals();
    this.notifyViewportChange();
  }

  public getViewportTransform(): ViewportTransform {
    return this.transformer.getTransform();
  }

  private notifyViewportChange(): void {
    if (this.callbacks.onViewportChange) {
      this.callbacks.onViewportChange(this.transformer.getTransform());
    }
  }

  // --- Local Video Playback ---

  /**
   * Video objects reference a blob in IndexedDB rather than embedding it. This
   * creates the backing <video> element on demand, hands it to the renderer to
   * paint, and keeps the object URL for disposal.
   */
  public async playVideoObject(objectId: string): Promise<void> {
    const obj = this.objects.find((o) => o.id === objectId);
    if (!obj || obj.type !== 'video') return;

    let element = this.renderer.getVideoElement(objectId);

    if (!element) {
      const blob = await StorageService.loadMedia(obj.mediaId);
      if (!blob) {
        console.warn(`Video media ${obj.mediaId} is missing from storage.`);
        return;
      }
      const url = URL.createObjectURL(blob);
      this.videoObjectUrls.set(objectId, url);

      element = document.createElement('video');
      element.src = url;
      element.muted = obj.muted;
      element.loop = obj.loop;
      element.playsInline = true;
      // Never attached to the DOM: frames are drawn onto the canvas instead, so
      // the video can't float above the board the way the old iframe did.
      element.addEventListener('ended', () => this.renderer.requestRender());
      this.renderer.setVideoElement(objectId, element);

      await new Promise<void>((resolve) => {
        element!.onloadeddata = () => resolve();
        element!.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }

    try {
      await element.play();
    } catch (err) {
      console.warn('Video playback was blocked:', err);
    }

    // Autoplay policy can refuse sound-on playback *without rejecting* -- play()
    // resolves and the element quietly stays paused. Detect that and retry muted
    // so the teacher gets picture rather than nothing.
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (element.paused) {
      element.muted = true;
      try {
        await element.play();
      } catch (err) {
        console.warn('Muted video playback also failed:', err);
      }
    }

    this.renderer.requestRender();
  }

  /** True when playback had to be muted to start, so the UI can say so. */
  public isVideoForcedMuted(objectId: string): boolean {
    const obj = this.objects.find((o) => o.id === objectId);
    const element = this.renderer.getVideoElement(objectId);
    if (!obj || obj.type !== 'video' || !element) return false;
    return element.muted && !obj.muted;
  }

  public pauseVideoObject(objectId: string): void {
    const element = this.renderer.getVideoElement(objectId);
    if (element) element.pause();
    this.renderer.requestRender();
  }

  public isVideoPlaying(objectId: string): boolean {
    const element = this.renderer.getVideoElement(objectId);
    return !!element && !element.paused && !element.ended;
  }

  /** Releases the element and object URL for a video that's gone or unloaded. */
  public disposeVideoObject(objectId: string): void {
    const element = this.renderer.getVideoElement(objectId);
    if (element) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
    this.renderer.setVideoElement(objectId, null);
    const url = this.videoObjectUrls.get(objectId);
    if (url) {
      URL.revokeObjectURL(url);
      this.videoObjectUrls.delete(objectId);
    }
  }

  private disposeAllVideos(): void {
    for (const id of Array.from(this.videoObjectUrls.keys())) {
      this.disposeVideoObject(id);
    }
  }

  // --- Audio playback (audio and image+audio objects) ---

  /**
   * Starts playback for an audio or image+audio object, creating the backing
   * <audio> element on demand. Nothing is added to the DOM tree: the element is
   * detached and the card is painted on the canvas, so playback cannot float
   * above the board.
   */
  public async playAudioObject(objectId: string): Promise<void> {
    const obj = this.objects.find((o) => o.id === objectId);
    if (!obj || (obj.type !== 'audio' && obj.type !== 'image-audio')) return;

    const assetId = obj.type === 'audio' ? obj.mediaId : obj.audioMediaId;
    let element = this.renderer.getMediaElement(objectId) as HTMLAudioElement | undefined;

    if (!element) {
      const url = await MediaManager.getObjectUrl(assetId);
      if (!url) {
        console.warn(`Audio asset ${assetId} is missing from storage.`);
        return;
      }
      element = document.createElement('audio');
      element.src = url;
      element.preload = 'auto';
      element.addEventListener('ended', () => this.renderer.requestRender());
      this.renderer.setMediaElement(objectId, element);
      await new Promise<void>((resolve) => {
        element!.oncanplay = () => resolve();
        element!.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }

    element.loop = obj.loop;
    element.muted = obj.muted;
    element.volume = Math.min(1, Math.max(0, obj.volume));
    element.playbackRate = obj.playbackRate || 1;

    try {
      await element.play();
    } catch (err) {
      console.warn('Audio playback was blocked:', err);
    }

    // Autoplay policy can refuse sound-on playback without rejecting the promise,
    // so confirm it actually started and retry muted rather than doing nothing.
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (element.paused) {
      element.muted = true;
      try {
        await element.play();
      } catch (err) {
        console.warn('Muted audio playback also failed:', err);
      }
    }
    this.renderer.requestRender();
  }

  public pauseAudioObject(objectId: string): void {
    const element = this.renderer.getMediaElement(objectId);
    if (element) element.pause();
    this.renderer.requestRender();
  }

  public isAudioPlaying(objectId: string): boolean {
    const element = this.renderer.getMediaElement(objectId);
    return !!element && !element.paused && !element.ended;
  }

  public toggleAudioObject(objectId: string): void {
    if (this.isAudioPlaying(objectId)) this.pauseAudioObject(objectId);
    else void this.playAudioObject(objectId);
  }

  /** Moves the playhead, as a 0..1 fraction of the track. */
  public seekAudioObject(objectId: string, progress: number): void {
    const element = this.renderer.getMediaElement(objectId);
    if (!element || !Number.isFinite(element.duration)) return;
    element.currentTime = Math.min(1, Math.max(0, progress)) * element.duration;
    this.renderer.requestRender();
  }

  public disposeAudioObject(objectId: string): void {
    const element = this.renderer.getMediaElement(objectId);
    if (element) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
    this.renderer.setMediaElement(objectId, null);
  }

  // --- History Actions ---

  public undo(): void {
    this.commandManager.undo();
  }

  public redo(): void {
    this.commandManager.redo();
  }

  public clearPage(): void {
    if (this.objects.length === 0) return;

    const command = new ClearPageCommand(
      [...this.objects],
      (objs) => this.setObjects(objs)
    );
    this.commandManager.execute(command);
    this.clearSelection();
  }

  public setCallbacks(callbacks: EngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public dispose(): void {
    this.disposeAllVideos();
    this.pointerManager.destroy();
    this.touchActionManager.reset();
    this.renderer.dispose();
  }
}
