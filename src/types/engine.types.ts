import { WhiteboardObject, ViewportTransform, ToolSettings, TextEditRequest, ToolType } from './whiteboard.types';

export interface ICommand {
  id: string;
  name: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export interface PointerInfo {
  id: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  isPrimary: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pressure: number;
  time: number;
}

export interface EngineCallbacks {
  onDocumentChange?: (objects: WhiteboardObject[]) => void;
  onHistoryChange?: (state: HistoryState) => void;
  onViewportChange?: (viewport: ViewportTransform) => void;
  onActiveToolChange?: (settings: Partial<ToolSettings>) => void;
  onToolChange?: (tool: ToolType) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onStartTextEditing?: (req: TextEditRequest) => void;
}
