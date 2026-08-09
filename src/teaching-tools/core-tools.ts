import { PenTool, Focus } from 'lucide-react';
import { TeachingToolRegistry } from './TeachingToolRegistry';
import { useWhiteboardStore } from '../store';

// Initialize core pointer tools
export const registerCoreTeachingTools = () => {
  TeachingToolRegistry.register({
    id: 'laser-pointer',
    name: 'Laser Pointer',
    icon: PenTool,
    category: 'PRESENTATION',
    type: 'pointer-tool',
    description: 'Use a temporary laser pointer that disappears.',
    onActivate: () => {
      useWhiteboardStore.getState().setTool('laser');
    }
  });

  TeachingToolRegistry.register({
    id: 'spotlight',
    name: 'Spotlight',
    icon: Focus,
    category: 'PRESENTATION',
    type: 'pointer-tool',
    description: 'Darken the screen and highlight a specific area.',
    onActivate: () => {
      useWhiteboardStore.getState().setTool('spotlight');
    }
  });
};
