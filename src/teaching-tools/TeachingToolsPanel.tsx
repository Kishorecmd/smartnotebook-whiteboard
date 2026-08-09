import React from 'react';
import { X } from 'lucide-react';
import { useWhiteboardStore } from '../store';
import { TeachingToolRegistry } from './TeachingToolRegistry';
import { ToolCategory } from './types';

export const TeachingToolsPanel: React.FC = () => {
  const { isTeachingPanelOpen, setTeachingPanelOpen, toggleOverlayTool } = useWhiteboardStore();

  if (!isTeachingPanelOpen) return null;

  const categories: ToolCategory[] = ['MATHEMATICS', 'SCIENCE', 'CLASSROOM', 'PRESENTATION'];
  const allTools = TeachingToolRegistry.getAllTools();

  const handleToolClick = (toolId: string) => {
    const toolDef = TeachingToolRegistry.getTool(toolId);
    if (!toolDef) return;

    if (toolDef.type === 'pointer-tool') {
      if (toolDef.onActivate) {
        toolDef.onActivate(useWhiteboardStore.getState().engine);
      }
      setTeachingPanelOpen(false);
    } else if (toolDef.type === 'overlay-ui') {
      toggleOverlayTool(toolId);
      setTeachingPanelOpen(false);
    } else if (toolDef.type === 'canvas-object') {
      // Need a way to drop this object into the center of the viewport
      const engine = useWhiteboardStore.getState().engine;
      if (engine && toolDef.objectFactory) {
        // Spawn at center of visible bounds
        const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const viewportCenter = engine.getTransformer().screenToWorld(screenCenter);
        const obj = toolDef.objectFactory(viewportCenter);
        engine.addObject(obj);
      }
      setTeachingPanelOpen(false);
    } else if (toolDef.type === 'background') {
      if (toolDef.onActivate) {
        toolDef.onActivate(useWhiteboardStore.getState().engine);
      }
      setTeachingPanelOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
      <div className="w-11/12 max-w-6xl h-5/6 bg-slate-900 border border-slate-700/50 shadow-2xl rounded-3xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-3xl font-bold text-white tracking-tight">Teaching Tools</h2>
          <button
            type="button"
            className="p-4 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors min-w-[64px] min-h-[64px] flex items-center justify-center"
            onClick={() => setTeachingPanelOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {categories.map(category => {
            const categoryTools = allTools.filter(t => t.category === category);
            if (categoryTools.length === 0) return null;

            return (
              <div key={category} className="mb-12">
                <h3 className="text-xl font-semibold text-slate-400 mb-6 tracking-widest">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {categoryTools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="group flex flex-col items-center p-6 bg-slate-800/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 border border-slate-700/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
                      >
                        <div className="w-20 h-20 mb-4 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-colors">
                          <Icon className="w-10 h-10" />
                        </div>
                        <span className="text-lg font-medium text-slate-200 text-center">{tool.name}</span>
                        <span className="text-xs text-slate-500 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {tool.type === 'canvas-object' ? 'Drops on Canvas' : tool.type === 'overlay-ui' ? 'Opens Window' : tool.type === 'background' ? 'Sets Background' : 'Overlay Effect'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {allTools.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="text-2xl mb-2">No tools registered yet.</p>
              <p>They are currently being built!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
