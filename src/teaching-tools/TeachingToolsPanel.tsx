import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Star, Clock, Target, Beaker, Brush, Users, Presentation, Gamepad2, Wrench, GraduationCap, ArrowUpRight, Check } from 'lucide-react';
import { useWhiteboardStore } from '../store';
import { TeachingToolRegistry } from './TeachingToolRegistry';
import { ToolCategory } from './types';
import './teaching-tools.css';

type Category = ToolCategory | 'ALL';
const categories = [
  { id: 'ALL', label: 'All tools', icon: Target },
  { id: 'FAVORITES', label: 'Favorites', icon: Star },
  { id: 'RECENT', label: 'Recent', icon: Clock },
  { id: 'MATHEMATICS', label: 'Mathematics', icon: Target },
  { id: 'SCIENCE', label: 'Science', icon: Beaker },
  { id: 'DRAWING', label: 'Drawing', icon: Brush },
  { id: 'CLASSROOM', label: 'Classroom', icon: Users },
  { id: 'PRESENTATION', label: 'Presentation', icon: Presentation },
  { id: 'GAMES', label: 'Games', icon: Gamepad2 },
  { id: 'UTILITIES', label: 'Utilities', icon: Wrench },
] as const;
const actions = { 'pointer-tool': 'Use on board', 'overlay-ui': 'Open tool', 'canvas-object': 'Add to board', background: 'Apply background' };

export const TeachingToolsPanel: React.FC = () => {
  const { isTeachingPanelOpen, setTeachingPanelOpen, toggleOverlayTool, activeOverlayTools,
    favoriteTools, recentTools, toggleFavoriteTool, addRecentTool } = useWhiteboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isTeachingPanelOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    dialog?.querySelector('input')?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, [isTeachingPanelOpen]);
  useEffect(() => { resultsRef.current?.scrollTo(0, 0); }, [searchQuery, activeCategory]);
  const allTools = TeachingToolRegistry.getAllTools();
  const inCategory = (id: Category) => allTools.filter(tool =>
    id === 'ALL' || (id === 'FAVORITES' ? favoriteTools.includes(tool.id)
      : id === 'RECENT' ? recentTools.includes(tool.id) : tool.category === id));
  const filteredTools = inCategory(activeCategory).filter(tool =>
    (tool.name + ' ' + tool.description).toLowerCase().includes(searchQuery.trim().toLowerCase()));
  if (activeCategory === 'RECENT') filteredTools.sort((a, b) => recentTools.indexOf(a.id) - recentTools.indexOf(b.id));
  const categoryLabel = categories.find(category => category.id === activeCategory)?.label;
  if (!isTeachingPanelOpen) return null;

  const handleToolClick = (toolId: string) => {
    const toolDef = TeachingToolRegistry.getTool(toolId);
    if (!toolDef) return;
    addRecentTool(toolId);
    const engine = useWhiteboardStore.getState().engine;
    if (toolDef.type === 'overlay-ui') {
      // Reopening a running tool must preserve its state.
      if (!activeOverlayTools.includes(toolId)) toggleOverlayTool(toolId);
    } else if (toolDef.type === 'canvas-object' && engine && toolDef.objectFactory) {
      const rect = engine.getCanvas().getBoundingClientRect();
      const center = engine.getTransformer().screenToWorld({ x: rect.width / 2, y: Math.max(120, (rect.height - 180) / 2) });
      const object = toolDef.objectFactory(center);
      const zoom = engine.getTransformer().getZoom();
      const scale = Math.min(1, (rect.width - 40) / (object.width * zoom), Math.max(100, rect.height - 240) / (object.height * zoom));
      object.width *= scale;
      object.height *= scale;
      object.x = center.x - object.width / 2;
      object.y = center.y - object.height / 2;
      if (object.type === 'compass') object.radius *= scale;
      engine.addObject(object);
      useWhiteboardStore.getState().setTool('select');
      engine.setSelectedIds([object.id]);
    } else {
      toolDef.onActivate?.(engine);
    }
    setTeachingPanelOpen(false);
  };
  const resetFilters = () => { setSearchQuery(''); setActiveCategory('ALL'); };
  return (
    <dialog ref={dialogRef} className="tt-dialog" aria-labelledby="teaching-title"
      onCancel={event => { event.preventDefault(); setTeachingPanelOpen(false); }}
      onClick={event => { if (event.target === event.currentTarget) setTeachingPanelOpen(false); }}
      onKeyDown={event => event.stopPropagation()}>
      <div className="tt-shell">
        <header className="tt-header">
          <div className="tt-heading-icon"><GraduationCap size={26} /></div>
          <div><p className="tt-eyebrow">YOUR CLASSROOM COMPANION</p><h2 id="teaching-title">Teaching tools</h2><p>Small tools for big learning moments.</p></div>
          <button className="tt-close" aria-label="Close teaching tools" onClick={() => setTeachingPanelOpen(false)}><X size={22} /></button>
        </header>
        <div className="tt-body">
          <label className="tt-mobile-category">Browse
            <select aria-label="Teaching tool category" value={activeCategory} onChange={event => setActiveCategory(event.target.value as Category)}>
              {categories.map(category => <option key={category.id} value={category.id}>{category.label} ({inCategory(category.id).length})</option>)}
            </select>
          </label>
          <nav className="tt-categories" aria-label="Teaching tool categories">
            {categories.map(category => <button key={category.id} aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}><category.icon size={18} /><span>{category.label}</span><small>{inCategory(category.id).length}</small></button>)}
            <p className="tt-sidebar-note"><Star size={17} />Star the tools you use most to find them in Favorites.</p>
          </nav>
          <section className="tt-content">
            <div className="tt-search-row">
              <div className="tt-search"><Search size={20} /><input autoFocus type="search" aria-label="Search teaching tools"
                placeholder="Find a tool, like timer or ruler…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
                {searchQuery && <button aria-label="Clear search" onClick={() => setSearchQuery('')}><X size={17} /></button>}
              </div>
              <div className="tt-results-heading"><h3>{categoryLabel}</h3><span role="status">{filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}</span></div>
            </div>
            <div className="tt-results" ref={resultsRef}>
              <div className="tt-grid">
                {filteredTools.map(tool => {
                  const Icon = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  const isOpen = activeOverlayTools.includes(tool.id);
                  return <article className="tt-card" data-category={tool.category} key={tool.id}>
                    <button className="tt-favorite" aria-label={(isFavorite ? 'Remove ' : 'Add ') + tool.name + (isFavorite ? ' from favorites' : ' to favorites')}
                      aria-pressed={isFavorite} onClick={() => toggleFavoriteTool(tool.id)}><Star size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
                    <button className="tt-launch" onClick={() => handleToolClick(tool.id)} aria-label={(isOpen ? 'Show' : actions[tool.type]) + ': ' + tool.name}>
                      <span className="tt-card-icon"><Icon size={27} /></span>
                      <strong>{tool.name}</strong><span className="tt-description">{tool.description}</span>
                      <span className="tt-card-action">{isOpen ? <><Check size={14} />Already open · Show</> : <>{actions[tool.type]}<ArrowUpRight size={14} /></>}</span>
                    </button>
                  </article>;
                })}
              </div>
              {filteredTools.length === 0 && <div className="tt-empty"><Search size={32} />
                <h3>{activeCategory === 'FAVORITES' && !searchQuery ? 'Your favorites belong here' : activeCategory === 'RECENT' && !searchQuery ? 'Ready for your first tool?' : 'No tools found'}</h3>
                <p>{activeCategory === 'FAVORITES' && !searchQuery ? 'Tap the star on any tool to keep it close at hand.' : 'Try another category or a shorter search.'}</p>
                <button onClick={resetFilters}>Browse all tools</button>
              </div>}
            </div>
            <footer className="tt-footer"><span>Choose a tool to use it on your whiteboard.</span><span>Esc to close</span></footer>
          </section>
        </div>
      </div>
    </dialog>
  );
};
