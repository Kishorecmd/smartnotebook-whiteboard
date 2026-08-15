import { StateCreator } from 'zustand';
import { WhiteboardStoreState, ResponsiveSlice } from '../types';
import { ResponsiveLayoutManager } from '../../core/responsive';

export const createResponsiveSlice: StateCreator<
  WhiteboardStoreState,
  [],
  [],
  ResponsiveSlice
> = (set) => ({
  responsiveState: ResponsiveLayoutManager.getInstance().getState(),
  setResponsiveState: (state) => set({ responsiveState: state }),
});
