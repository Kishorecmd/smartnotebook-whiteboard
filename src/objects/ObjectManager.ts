import { WhiteboardObject, ICommand } from '../types';
import { SelectionManager } from './SelectionManager';
import { GroupManager } from './GroupManager';
import { ClipboardManager } from '../clipboard/ClipboardManager';
import { WhiteboardEngine } from '../engine/WhiteboardEngine';
import { GroupObjectsCommand } from '../engine/commands/GroupObjectsCommand';
import { UngroupObjectsCommand } from '../engine/commands/UngroupObjectsCommand';
import { ChangeObjectStateCommand } from '../engine/commands/ChangeObjectStateCommand';
import { ReorderObjectsCommand, ReorderAction } from '../engine/commands/ReorderObjectsCommand';
import { DeleteObjectsCommand } from '../engine/commands/DeleteObjectsCommand';

export class ObjectManager {
  private engine: WhiteboardEngine;
  private clipboard: ClipboardManager;

  constructor(engine: WhiteboardEngine) {
    this.engine = engine;
    this.clipboard = new ClipboardManager();
  }

  // --- Selection Logic ---
  
  public getEffectiveSelection(selectedIds: Set<string>): Set<string> {
    return SelectionManager.getEffectiveSelection(selectedIds, this.engine.getObjects());
  }

  public filterLocked(selectedIds: Set<string>): Set<string> {
    return SelectionManager.filterLocked(selectedIds, this.engine.getObjects());
  }

  // --- Grouping ---

  public groupObjects(selectedIds: string[]): void {
    if (selectedIds.length < 2) return;
    
    // Create group command
    const command = new GroupObjectsCommand(
      selectedIds,
      () => this.engine.getObjects(),
      (objs) => {
        this.engine.setObjects(objs);
        // After grouping, select the new group
        const newGroup = objs[objs.length - 1];
        if (newGroup.type === 'group') {
          this.engine.setSelectedIds([newGroup.id]);
        }
      }
    );
    this.engine.getCommandManager().execute(command);
  }

  public ungroupObjects(groupIds: string[]): void {
    if (groupIds.length === 0) return;
    
    // Find children to select after ungrouping
    const objects = this.engine.getObjects();
    const childrenToSelect = new Set<string>();
    for (const obj of objects) {
      if (obj.parentGroupId && groupIds.includes(obj.parentGroupId)) {
        childrenToSelect.add(obj.id);
      }
    }

    const command = new UngroupObjectsCommand(
      groupIds,
      () => this.engine.getObjects(),
      (objs) => {
        this.engine.setObjects(objs);
        // Select the children that were just ungrouped
        this.engine.setSelectedIds(Array.from(childrenToSelect));
      }
    );
    this.engine.getCommandManager().execute(command);
  }

  // --- Locking ---

  public lockObjects(selectedIds: string[]): void {
    if (selectedIds.length === 0) return;
    const command = new ChangeObjectStateCommand(
      selectedIds,
      { locked: true },
      'Lock Objects',
      () => this.engine.getObjects(),
      (objs) => {
        this.engine.setObjects(objs);
        this.engine.clearSelection(); // Locked objects can't be selected
      }
    );
    this.engine.getCommandManager().execute(command);
  }

  public unlockObjects(selectedIds: string[]): void {
    if (selectedIds.length === 0) return;
    const command = new ChangeObjectStateCommand(
      selectedIds,
      { locked: false },
      'Unlock Objects',
      () => this.engine.getObjects(),
      (objs) => this.engine.setObjects(objs)
    );
    this.engine.getCommandManager().execute(command);
  }

  // --- Layer Ordering ---

  public reorderObjects(selectedIds: string[], action: ReorderAction): void {
    if (selectedIds.length === 0) return;
    
    // Reorder should also move descendants
    const affectedObjects = GroupManager.getAllAffectedObjects(selectedIds, this.engine.getObjects());
    const affectedIds = affectedObjects.map(o => o.id);

    const command = new ReorderObjectsCommand(
      affectedIds,
      action,
      () => this.engine.getObjects(),
      (objs) => this.engine.setObjects(objs)
    );
    this.engine.getCommandManager().execute(command);
  }

  // --- Clipboard ---

  public copy(selectedIds: string[]): void {
    this.clipboard.copy(selectedIds, this.engine.getObjects());
  }

  public cut(selectedIds: string[]): void {
    this.copy(selectedIds);
    // Delete the affected objects (including descendants)
    const affectedObjects = GroupManager.getAllAffectedObjects(selectedIds, this.engine.getObjects());
    const deleteCmd = new DeleteObjectsCommand(
      affectedObjects,
      () => this.engine.getObjects(),
      (objs: WhiteboardObject[]) => this.engine.setObjects(objs)
    );
    this.engine.getCommandManager().execute(deleteCmd);
    this.engine.clearSelection();
  }

  public async paste(e?: ClipboardEvent, centerPoint?: { x: number, y: number }): Promise<void> {
    const newObjects = await this.clipboard.paste(e, centerPoint);
    if (!newObjects || newObjects.length === 0) return;

    // To make pasting undoable, we add all pasted objects in a single batch.
    const command: ICommand = {
      id: Math.random().toString(),
      name: 'Paste Objects',
      execute: () => {
        const current = this.engine.getObjects();
        this.engine.setObjects([...current, ...newObjects]);
        this.engine.setSelectedIds(newObjects.filter(o => !o.parentGroupId).map(o => o.id));
      },
      undo: () => {
        const current = this.engine.getObjects();
        const pastedIds = new Set(newObjects.map(o => o.id));
        this.engine.setObjects(current.filter(o => !pastedIds.has(o.id)));
      },
      redo: function() {
        this.execute();
      }
    };

    this.engine.getCommandManager().execute(command);
  }

  public duplicate(selectedIds: string[]): void {
    if (selectedIds.length === 0) return;
    this.copy(selectedIds);
    this.paste();
  }
}
