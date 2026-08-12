import type { SelectionSlice, SliceCreator } from '../types';

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  selectedIds: [],
  editingText: null,

  setSelectedIds: (ids) => {
    set({ selectedIds: ids });

    // Mirror into the engine, which owns the selection the tools and commands act
    // on. Guarded by a same-contents check because the engine calls back into here
    // via onSelectionChange, which would otherwise loop.
    const { engine } = get();
    if (!engine) return;
    const current = engine.getSelectedIds();
    const same = current.length === ids.length && current.every((id) => ids.includes(id));
    if (!same) engine.setSelectedIds(ids);
  },

  deleteSelected: () => {
    const { engine } = get();
    if (engine) engine.deleteSelected();
  },

  duplicateSelected: () => {
    const { engine } = get();
    if (engine) engine.duplicateSelected();
  },

  reorderSelected: (action) => {
    const { engine } = get();
    if (engine) engine.reorderSelected(action);
  },

  applySelectedStyle: (patch) => {
    const { engine } = get();
    if (engine) engine.applySelectedStyle(patch);
  },

  startTextEditing: (editingText) => set({ editingText }),

  commitTextEdit: (params) => {
    const { engine } = get();
    if (engine) {
      engine.commitTextEdit(params);
    }
    set({ editingText: null });
  },

  cancelTextEdit: () => set({ editingText: null }),
});
