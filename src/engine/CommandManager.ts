import { ICommand, HistoryState } from '../types';

export class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory: number;
  private onStateChange?: (state: HistoryState) => void;

  constructor(maxHistory: number = 50, onStateChange?: (state: HistoryState) => void) {
    this.maxHistory = maxHistory;
    this.onStateChange = onStateChange;
  }

  public execute(command: ICommand): void {
    command.execute();
    this.recordCommand(command);
  }

  /**
   * Pushes an already-executed command onto the undo stack and clears the redo stack.
   */
  public recordCommand(command: ICommand): void {
    this.undoStack.push(command);
    this.redoStack = [];

    // Limit maximum history depth
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.notify();
  }

  public undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;

    command.undo();
    this.redoStack.push(command);
    this.notify();
  }

  public redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;

    command.redo();
    this.undoStack.push(command);
    this.notify();
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public getState(): HistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  public setOnStateChange(cb: (state: HistoryState) => void): void {
    this.onStateChange = cb;
  }

  private notify(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}
