import type { SliceCreator, UiSlice } from '../types';

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  isPageDrawerOpen: false,
  isExportModalOpen: false,
  isSavedDocsModalOpen: false,
  isKeyboardShortcutsOpen: false,
  isClearDialogOpen: false,
  isYouTubeDialogOpen: false,
  isWebAppDialogOpen: false,
  isDocTitleEditing: false,
  isPresenterMode: false,
  isTeachingPanelOpen: false,
  toastMessage: null,

  activeOverlayTools: [],

  togglePageDrawer: () => set((state) => ({ isPageDrawerOpen: !state.isPageDrawerOpen })),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setSavedDocsModalOpen: (isSavedDocsModalOpen) => set({ isSavedDocsModalOpen }),
  setKeyboardShortcutsOpen: (open) => set({ isKeyboardShortcutsOpen: open }),
  setClearDialogOpen: (open) => set({ isClearDialogOpen: open }),
  setYouTubeDialogOpen: (open) => set({ isYouTubeDialogOpen: open }),
  setWebAppDialogOpen: (open) => set({ isWebAppDialogOpen: open }),
  setDocTitleEditing: (editing) => set({ isDocTitleEditing: editing }),
  setPresenterMode: (active) => set({ isPresenterMode: active }),
  setTeachingPanelOpen: (open) => set({ isTeachingPanelOpen: open }),

  toggleOverlayTool: (toolId) => set((state) => {
    const isActive = state.activeOverlayTools.includes(toolId);
    return {
      activeOverlayTools: isActive
        ? state.activeOverlayTools.filter(id => id !== toolId)
        : [...state.activeOverlayTools, toolId]
    };
  }),

  showToast: (message: string) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set((state) => (state.toastMessage === message ? { toastMessage: null } : {}));
    }, 3000);
  },
});
