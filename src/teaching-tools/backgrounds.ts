import { Grid3X3 } from 'lucide-react';
import { TeachingToolRegistry } from './TeachingToolRegistry';
import { useWhiteboardStore } from '../store';

export const registerBackgroundTools = () => {
  TeachingToolRegistry.register({
    id: 'grid-bg',
    name: 'Grid',
    icon: Grid3X3,
    category: 'MATHEMATICS',
    type: 'background',
    description: 'Applies a square grid to the page background.',
    onActivate: () => {
      useWhiteboardStore.getState().updateActivePageBackground('#ffffff', 'grid');
    }
  });

  TeachingToolRegistry.register({
    id: 'graph-paper',
    name: 'Graph Paper',
    icon: Grid3X3,
    category: 'MATHEMATICS',
    type: 'background',
    description: 'Set a graph paper background for math and plotting.',
    onActivate: () => {
      const { updateActivePageBackground } = useWhiteboardStore.getState();
      // 'lines' or 'grid' depending on what looks best for graph paper
      updateActivePageBackground('#ffffff', 'grid');
    }
  });
};
