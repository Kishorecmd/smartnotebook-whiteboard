import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MousePointer, Hand, Pen, Highlighter, Eraser, Shapes, Type, Image as ImageIcon,
  Sliders, Undo2, Redo2, Trash2, GraduationCap, MoreHorizontal
} from 'lucide-react';
import { ToolButton } from './ToolButton';
import { SplitToolButton } from './SplitToolButton';
import { ContextToolbar, PopoverType } from './ContextToolbar';
import { MoreToolbarModal } from './MoreToolbarModal';
import { PenRegistry } from '../../drawing/pens';
import { useWhiteboardStore } from '../../store';
import { FileImportService } from '../../services/FileImportService';
import { visibleWorldBox } from '../../utils';
import { ToolType } from '../../types';

type ToolbarItemId = 'select' | 'pan' | 'pen' | 'marker' | 'eraser' | 'shape' | 'text' | 'media' | 'teaching' | 'color' | 'properties' | 'undo' | 'redo' | 'delete' | 'divider1' | 'divider2' | 'divider3' | 'divider4';

interface ToolbarItemDef {
  id: ToolbarItemId;
  priority: number; // 1 = always visible, 4 = lowest priority (drops to "more" first)
  minWidth: number; // Estimated width
  isDivider?: boolean;
}

const TOOLBAR_CONFIG: ToolbarItemDef[] = [
  { id: 'select', priority: 1, minWidth: 60 },
  { id: 'pan', priority: 3, minWidth: 60 },
  { id: 'divider1', priority: 3, minWidth: 10, isDivider: true },
  { id: 'pen', priority: 1, minWidth: 80 },
  { id: 'marker', priority: 2, minWidth: 80 },
  { id: 'eraser', priority: 1, minWidth: 80 },
  { id: 'divider2', priority: 2, minWidth: 10, isDivider: true },
  { id: 'shape', priority: 2, minWidth: 60 },
  { id: 'text', priority: 2, minWidth: 60 },
  { id: 'media', priority: 3, minWidth: 60 },
  { id: 'divider3', priority: 3, minWidth: 10, isDivider: true },
  { id: 'teaching', priority: 2, minWidth: 60 },
  { id: 'divider4', priority: 4, minWidth: 10, isDivider: true },
  { id: 'color', priority: 4, minWidth: 60 },
  { id: 'properties', priority: 4, minWidth: 60 },
  { id: 'undo', priority: 3, minWidth: 60 },
  { id: 'redo', priority: 4, minWidth: 60 },
  { id: 'delete', priority: 3, minWidth: 60 },
];

export const MainToolbar: React.FC = () => {
  const {
    toolSettings,
    history,
    setTool,
    undo,
    redo,
    setClearDialogOpen,
    setTeachingPanelOpen,
    setYouTubeDialogOpen,
    setPdfImportModalOpen,
    engine,
    activateLastPen,
  } = useWhiteboardStore();

  const [activePopover, setActivePopover] = useState<PopoverType>('none');
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const activePen = PenRegistry.getOrDefault(toolSettings.activePenId);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth - 48);

  // Measure available width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setAvailableWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Close context popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopover('none');
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const togglePopover = (type: PopoverType) => {
    setActivePopover((prev) => (prev === type ? 'none' : type));
  };

  const handleSelectTool = (type: ToolType) => {
    setTool(type);
    if (type === 'shape') setActivePopover('shape');
    else if (type === 'text') setActivePopover('text');
    else setActivePopover('none');
  };

  const insertImageFile = async (file: File) => {
    if (!engine) return;
    const rect = engine.getCanvas().getBoundingClientRect();
    const transformer = engine.getTransformer();
    const centerPoint = transformer.screenToWorld({ x: rect.width / 2, y: rect.height / 2 });
    try {
      const imageObject = await FileImportService.importImage(
        file, centerPoint, visibleWorldBox(transformer.getTransform().zoom, rect.width, rect.height)
      );
      engine.addObject(imageObject);
    } catch (err) {
      alert('That image could not be opened. Try a PNG or JPEG.');
    }
  };

  const insertVideoFile = async (file: File) => {
    if (!engine) return;
    const rect = engine.getCanvas().getBoundingClientRect();
    const transformer = engine.getTransformer();
    const centerPoint = transformer.screenToWorld({ x: rect.width / 2, y: rect.height / 2 });
    try {
      const videoObject = await FileImportService.importVideo(
        file, centerPoint, visibleWorldBox(transformer.getTransform().zoom, rect.width, rect.height)
      );
      engine.addObject(videoObject);
    } catch (err) {
      alert('That video could not be added.');
    }
  };

  const placement = () => {
    const rect = engine!.getCanvas().getBoundingClientRect();
    const transformer = engine!.getTransformer();
    return {
      centre: transformer.screenToWorld({ x: rect.width / 2, y: rect.height / 2 }),
      box: visibleWorldBox(transformer.getTransform().zoom, rect.width, rect.height),
    };
  };

  const pickFile = (accept: string): Promise<File | null> =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => resolve((e.target as HTMLInputElement).files?.[0] ?? null);
      input.click();
    });

  const insertAudioFile = async (file: File) => {
    if (!engine) return;
    try {
      const { AudioLoader } = await import('../../media/audio/AudioLoader');
      engine.addObject(await AudioLoader.importAudio(file, placement().centre));
    } catch (err) {
      alert('That audio file could not be added.');
    }
  };

  const insertImageAudioPair = async () => {
    if (!engine) return;
    const imageFile = await pickFile('image/*');
    if (!imageFile) return;
    const audioFile = await pickFile('audio/*');
    if (!audioFile) return;
    try {
      const { AudioLoader } = await import('../../media/audio/AudioLoader');
      const { centre, box } = placement();
      engine.addObject(await AudioLoader.importImageAudio(imageFile, audioFile, centre, box));
    } catch (err) {
      alert('That pair could not be added.');
    }
  };

  const insertPdfObject = async (file: File) => {
    if (!engine) return;
    try {
      const { PdfLoader } = await import('../../media/pdf/PdfLoader');
      const { centre, box } = placement();
      engine.addObject(await PdfLoader.importPdf(file, centre, box));
    } catch (err) {
      alert('That PDF could not be opened.');
    }
  };

  const handleMediaInsert = async (type: 'youtube' | 'image' | 'video' | 'audio' | 'image-audio' | 'pdf') => {
    setActivePopover('none');
    if (!engine) return;
    if (type === 'youtube') return setYouTubeDialogOpen(true);
    if (type === 'image-audio') return void insertImageAudioPair();
    if (type === 'pdf') {
      const asObject = confirm('Place the PDF on this page as a single object?\n\nOK = place on this page\nCancel = import each page as a whiteboard page');
      if (!asObject) return setPdfImportModalOpen(true);
      const file = await pickFile('application/pdf');
      if (file) void insertPdfObject(file);
      return;
    }
    const accept = type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*' : 'image/*';
    const file = await pickFile(accept);
    if (!file) return;
    if (type === 'video') void insertVideoFile(file);
    else if (type === 'audio') void insertAudioFile(file);
    else void insertImageFile(file);
  };

  const Divider = () => <div className="w-px h-8 bg-slate-500/20 mx-1 flex-shrink-0" />;

  // Calculate visible items
  const visibleItems = useMemo(() => {
    let widthRemaining = availableWidth - 80; // reserve 80px for "More" button & padding
    const visibleIds = new Set<ToolbarItemId>();
    
    // Sort by priority, then by original index
    const sortedConfig = [...TOOLBAR_CONFIG].sort((a, b) => a.priority - b.priority);

    for (const item of sortedConfig) {
      if (widthRemaining >= item.minWidth) {
        widthRemaining -= item.minWidth;
        visibleIds.add(item.id);
      }
    }

    return TOOLBAR_CONFIG.filter(item => visibleIds.has(item.id));
  }, [availableWidth]);

  const hasMoreItems = visibleItems.length < TOOLBAR_CONFIG.length;

  const renderItem = (id: ToolbarItemId) => {
    switch (id) {
      case 'select':
        return <ToolButton key={id} icon={<MousePointer className="w-6 h-6" />} label="Select" isActive={toolSettings.tool === 'select'} onClick={() => handleSelectTool('select')} />;
      case 'pan':
        return <ToolButton key={id} icon={<Hand className="w-6 h-6" />} label="Pan" isActive={toolSettings.tool === 'pan'} onClick={() => handleSelectTool('pan')} />;
      case 'pen':
        return <SplitToolButton key={id} icon={<Pen className="w-6 h-6" />} label={activePen.name} isActive={toolSettings.tool === 'pen'} isDropdownOpen={activePopover === 'pens'} onMainClick={() => { setActivePopover('none'); activateLastPen(); }} onDropdownClick={() => togglePopover('pens')} />;
      case 'marker':
        return <SplitToolButton key={id} icon={<Highlighter className="w-6 h-6" />} label="Marker" isActive={toolSettings.tool === 'marker'} isDropdownOpen={activePopover === 'width'} onMainClick={() => { setActivePopover('none'); handleSelectTool('marker'); }} onDropdownClick={() => togglePopover('width')} />;
      case 'eraser':
        return <SplitToolButton key={id} icon={<Eraser className="w-6 h-6" />} label="Eraser" isActive={toolSettings.tool === 'eraser'} isDropdownOpen={activePopover === 'eraser'} onMainClick={() => { setActivePopover('none'); handleSelectTool('eraser'); }} onDropdownClick={() => togglePopover('eraser')} />;
      case 'shape':
        return <ToolButton key={id} icon={<Shapes className="w-6 h-6" />} label="Shapes" isActive={toolSettings.tool === 'shape' || activePopover === 'shape'} onClick={() => handleSelectTool('shape')} />;
      case 'text':
        return <ToolButton key={id} icon={<Type className="w-6 h-6" />} label="Text" isActive={toolSettings.tool === 'text' || activePopover === 'text'} onClick={() => handleSelectTool('text')} />;
      case 'media':
        return <ToolButton key={id} icon={<ImageIcon className="w-6 h-6" />} label="Media" isActive={activePopover === 'media'} onClick={() => togglePopover('media')} />;
      case 'teaching':
        return <ToolButton key={id} icon={<GraduationCap className="w-6 h-6" />} label="Teaching Tools" onClick={() => { setActivePopover('none'); setTeachingPanelOpen(true); }} />;
      case 'color':
        return (
          <button key={id} className="flex items-center justify-center min-w-[var(--tool-size)] min-h-[var(--tool-size)] w-[var(--tool-size)] h-[var(--tool-size)] rounded-2xl transition-all hover:bg-slate-800 flex-shrink-0" onClick={() => togglePopover('color')} title="Colour Palette" aria-label="Colour Palette">
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 shadow-inner" style={{ backgroundColor: toolSettings.color }} />
          </button>
        );
      case 'properties':
        return <ToolButton key={id} icon={<Sliders className="w-6 h-6" />} label="Properties" isActive={false} onClick={() => alert("Object Properties coming soon")} />;
      case 'undo':
        return <ToolButton key={id} icon={<Undo2 className="w-6 h-6" />} label="Undo" onClick={undo} isDisabled={!history.canUndo} />;
      case 'redo':
        return <ToolButton key={id} icon={<Redo2 className="w-6 h-6" />} label="Redo" onClick={redo} isDisabled={!history.canRedo} />;
      case 'delete':
        return <ToolButton key={id} icon={<Trash2 className="w-6 h-6" />} label="Delete" onClick={() => setClearDialogOpen(true)} variant="danger" />;
      case 'divider1': case 'divider2': case 'divider3': case 'divider4':
        return <Divider key={id} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full flex justify-center pointer-events-none"
    >
      <div
        ref={toolbarRef}
        className="relative flex flex-col items-center select-none w-fit max-w-[calc(100vw-var(--safe-area-x)*2)] mx-auto pointer-events-auto transition-transform duration-200"
        style={{ transform: `scale(var(--ui-scale, 1))` }}
      >
        <ContextToolbar 
          activePopover={activePopover} 
          onClose={() => setActivePopover('none')}
          onMediaInsert={handleMediaInsert}
        />

        <div className="flex flex-row items-center gap-1 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-[24px] p-2 shadow-2xl overflow-hidden h-[var(--toolbar-height)]">
          
          {visibleItems.map(item => renderItem(item.id))}

          {/* More Menu (Dynamic) */}
          {hasMoreItems && (
            <div className="flex items-center ml-1">
              <ToolButton
                icon={<MoreHorizontal className="w-6 h-6" />}
                label="More Tools"
                onClick={() => setIsMoreModalOpen(true)}
              />
            </div>
          )}
        </div>

        <MoreToolbarModal
          isOpen={isMoreModalOpen}
          onClose={() => setIsMoreModalOpen(false)}
          onSelectPopover={(type) => {
            setActivePopover(type);
          }}
          hiddenItemIds={TOOLBAR_CONFIG.filter(x => !visibleItems.includes(x) && !x.isDivider).map(x => x.id)}
        />
      </div>
    </div>
  );
};
