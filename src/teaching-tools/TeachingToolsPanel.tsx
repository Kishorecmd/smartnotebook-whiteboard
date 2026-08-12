import React, { useState, useMemo } from 'react';
import { X, Search, Star, Clock, Target, Beaker, Brush, Users, Presentation, Gamepad2, Wrench } from 'lucide-react';
import { useWhiteboardStore } from '../store';
import { TeachingToolRegistry } from './TeachingToolRegistry';
import { ToolCategory } from './types';

export const TeachingToolsPanel: React.FC = () => {
  const { 
    isTeachingPanelOpen, 
    setTeachingPanelOpen, 
    toggleOverlayTool,
    favoriteTools,
    recentTools,
    toggleFavoriteTool,
    addRecentTool
  } = useWhiteboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'FAVORITES' | 'RECENT' | 'ALL'>('ALL');

  const allTools = TeachingToolRegistry.getAllTools();

  const filteredTools = useMemo(() => {
    let tools = allTools;

    if (activeCategory === 'FAVORITES') {
      tools = tools.filter(t => favoriteTools.includes(t.id));
    } else if (activeCategory === 'RECENT') {
      tools = tools.filter(t => recentTools.includes(t.id));
      // Sort by recency
      tools.sort((a, b) => recentTools.indexOf(a.id) - recentTools.indexOf(b.id));
    } else if (activeCategory !== 'ALL') {
      tools = tools.filter(t => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q)
      );
    }

    return tools;
  }, [allTools, activeCategory, searchQuery, favoriteTools, recentTools]);

  // Must sit below every hook: returning earlier changed the hook count between
  // renders and crashed with "Rendered more hooks than during the previous render".
  if (!isTeachingPanelOpen) return null;

  const handleToolClick = (toolId: string) => {
    const toolDef = TeachingToolRegistry.getTool(toolId);
    if (!toolDef) return;

    addRecentTool(toolId);

    if (toolDef.type === 'pointer-tool') {
      if (toolDef.onActivate) {
        toolDef.onActivate(useWhiteboardStore.getState().engine);
      }
      setTeachingPanelOpen(false);
    } else if (toolDef.type === 'overlay-ui') {
      toggleOverlayTool(toolId);
      setTeachingPanelOpen(false);
    } else if (toolDef.type === 'canvas-object') {
      const engine = useWhiteboardStore.getState().engine;
      if (engine && toolDef.objectFactory) {
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

  const categories: { id: ToolCategory | 'FAVORITES' | 'RECENT' | 'ALL', label: string, icon: React.FC<any> }[] = [
    { id: 'ALL', label: 'All Tools', icon: Target },
    { id: 'FAVORITES', label: 'Favorites', icon: Star },
    { id: 'RECENT', label: 'Recent', icon: Clock },
    { id: 'MATHEMATICS', label: 'Mathematics', icon: Target },
    { id: 'SCIENCE', label: 'Science', icon: Beaker },
    { id: 'DRAWING', label: 'Drawing', icon: Brush },
    { id: 'CLASSROOM', label: 'Classroom', icon: Users },
    { id: 'PRESENTATION', label: 'Presentation', icon: Presentation },
    { id: 'GAMES', label: 'Games', icon: Gamepad2 },
    { id: 'UTILITIES', label: 'Utilities', icon: Wrench },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] md:w-[90vw] md:h-[85vh] max-w-7xl bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-slate-900/90">
          <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">Teaching Tools</h2>
          <button
            type="button"
            className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
            onClick={() => setTeachingPanelOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Two-Column Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Left Column: Categories */}
          <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 p-4 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto custom-scrollbar">
            <div className="flex md:flex-col gap-2 md:gap-0 md:space-y-1 w-max md:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex md:w-full items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-colors shrink-0 ${
                    activeCategory === cat.id 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Search & Grid */}
          <div className="flex-1 flex flex-col bg-slate-950/50 min-h-0">
            {/* Search Bar */}
            <div className="p-4 md:p-6 pb-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search teaching tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 md:py-4 md:pl-14 md:pr-6 text-base md:text-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                {filteredTools.map(tool => {
                  const Icon = tool.icon;
                  const isFav = favoriteTools.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      className="group relative flex flex-col items-center justify-between p-4 md:p-6 bg-slate-800 border border-slate-700/50 rounded-2xl hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all duration-200"
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteTool(tool.id);
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                          isFav ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400 hover:bg-slate-700'
                        }`}
                      >
                        <Star className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Tool Content */}
                      <button
                        className="flex flex-col items-center flex-1 w-full"
                        onClick={() => handleToolClick(tool.id)}
                      >
                        <div className="w-16 h-16 mb-4 rounded-full bg-slate-900 group-hover:bg-indigo-500/20 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-colors">
                          <Icon className="w-8 h-8" />
                        </div>
                        <span className="text-base font-semibold text-slate-200 text-center leading-tight mb-2">
                          {tool.name}
                        </span>
                        <span className="text-xs text-slate-500 text-center line-clamp-2">
                          {tool.description}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {filteredTools.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Target className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-xl">No tools found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
