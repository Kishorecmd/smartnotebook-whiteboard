import React from 'react';
import { useWhiteboardStore } from '../../store';
import { TeachingToolRegistry } from '../TeachingToolRegistry';

export const TeachingToolsOverlay: React.FC = () => {
  const { activeOverlayTools } = useWhiteboardStore();

  if (activeOverlayTools.length === 0) return null;

  return (
    <>
      {activeOverlayTools.map((toolId) => {
        const toolDef = TeachingToolRegistry.getTool(toolId);
        if (toolDef && toolDef.component) {
          const ToolComponent = toolDef.component;
          return <ToolComponent key={toolId} />;
        }
        return null;
      })}
    </>
  );
};
