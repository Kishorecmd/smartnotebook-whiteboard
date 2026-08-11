import type { SelectionSlice, SliceCreator } from '../types';

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  selectedIds: [],
  interactiveVideoId: null,
  editingText: null,

  setSelectedIds: (ids) => {
    set({ selectedIds: ids });
    // Clear interactive video if not selected
    const { interactiveVideoId } = get();
    if (interactiveVideoId && !ids.includes(interactiveVideoId)) {
      set({ interactiveVideoId: null });
    }
  },

  setInteractiveVideoId: (id) => set({ interactiveVideoId: id }),

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
