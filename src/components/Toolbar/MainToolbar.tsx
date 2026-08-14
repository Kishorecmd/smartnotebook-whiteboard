import React, { useState, useRef, useEffect } from 'react';
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
    const centerPoint = transformer.screenToWorld({
      x: rect.width / 2,
      y: rect.height / 2,
    });
    try {
      const imageObject = await FileImportService.importImage(
        file,
        centerPoint,
        visibleWorldBox(transformer.getTransform().zoom, rect.width, rect.height)
      );
      engine.addObject(imageObject);
    } catch (err) {
      console.error('Failed to import image', err);
      alert('That image could not be opened. Try a PNG or JPEG.');
    }
  };

  const LARGE_VIDEO_BYTES = 100 * 1024 * 1024;
  const insertVideoFile = async (file: File) => {
    if (!engine) return;
    if (
      file.size > LARGE_VIDEO_BYTES &&
      !confirm(
        `That video is ${(file.size / (1024 * 1024)).toFixed(0)} MB. It is stored in this browser, and large files can exhaust the available space. Add it anyway?`
      )
    ) return;
    
    const rect = engine.getCanvas().getBoundingClientRect();
    const transformer = engine.getTransformer();
    const centerPoint = transformer.screenToWorld({ x: rect.width / 2, y: rect.height / 2 });
    try {
      const videoObject = await FileImportService.importVideo(
        file,
        centerPoint,
        visibleWorldBox(transformer.getTransform().zoom, rect.width, rect.height)
      );
      engine.addObject(videoObject);
    } catch (err) {
      console.error('Failed to import video', err);
      alert(err instanceof Error ? err.message : 'That video could not be added.');
    }
  };

  /** Centre of the current view plus the box media should fit inside. */
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
      console.error('Failed to import audio', err);
      alert(err instanceof Error ? err.message : 'That audio file could not be added.');
    }
  };

  /** Two pickers in sequence: the picture, then the sound that goes with it. */
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
      console.error('Failed to import image + audio', err);
      alert(err instanceof Error ? err.message : 'That pair could not be added.');
    }
  };

  const insertPdfObject = async (file: File) => {
    if (!engine) return;
    try {
      const { PdfLoader } = await import('../../media/pdf/PdfLoader');
      const { centre, box } = placement();
      engine.addObject(await PdfLoader.importPdf(file, centre, box));
    } catch (err) {
      console.error('Failed to import PDF', err);
      alert(err instanceof Error ? err.message : 'That PDF could not be opened.');
    }
  };

  const handleMediaInsert = async (type: 'youtube' | 'image' | 'video' | 'audio' | 'image-audio' | 'pdf') => {
    setActivePopover('none');
    if (!engine) return;

    if (type === 'youtube') {
      setYouTubeDialogOpen(true);
      return;
    }
    if (type === 'image-audio') {
      void insertImageAudioPair();
      return;
    }
    if (type === 'pdf') {
      // Ask which of the two PDF modes the teacher wants (§19). Placing it as an
      // object keeps it on this page; importing as slides makes one page each.
      const asObject = confirm(
        'Place the PDF on this page as a single object?\n\nOK = place on this page\nCancel = import each page as a whiteboard page'
      );
      if (!asObject) {
        setPdfImportModalOpen(true);
        return;
      }
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

  return (
    <div
      ref={toolbarRef}
      className="relative flex flex-col items-center select-none w-fit max-w-[calc(100vw-48px)] mx-auto"
    >
      <ContextToolbar 
        activePopover={activePopover} 
        onClose={() => setActivePopover('none')}
        onMediaInsert={handleMediaInsert}
      />

      <div className="flex flex-row items-center gap-1 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-[24px] p-2 shadow-2xl overflow-x-auto overflow-y-hidden custom-scrollbar w-full">
        
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<MousePointer className="w-6 h-6" />}
            label="Select"
            isActive={toolSettings.tool === 'select'}
            onClick={() => handleSelectTool('select')}
          />
          <ToolButton
            icon={<Hand className="w-6 h-6" />}
            label="Pan"
            isActive={toolSettings.tool === 'pan'}
            onClick={() => handleSelectTool('pan')}
            className="hidden md:flex" // Hide on very small screens
          />
        </div>

        <Divider />

        {/* Drawing */}
        <div className="flex items-center gap-1">
          <SplitToolButton
            icon={<Pen className="w-6 h-6" />}
            label={activePen.name}
            isActive={toolSettings.tool === 'pen'}
            isDropdownOpen={activePopover === 'pens'}
            onMainClick={() => {
              setActivePopover('none');
              activateLastPen();
            }}
            onDropdownClick={() => togglePopover('pens')}
          />
          
          <SplitToolButton
            icon={<Highlighter className="w-6 h-6" />}
            label="Marker"
            isActive={toolSettings.tool === 'marker'}
            isDropdownOpen={activePopover === 'width'}
            onMainClick={() => {
              setActivePopover('none');
              handleSelectTool('marker');
            }}
            onDropdownClick={() => togglePopover('width')}
            className="hidden sm:flex"
          />

          <SplitToolButton
            icon={<Eraser className="w-6 h-6" />}
            label="Eraser"
            isActive={toolSettings.tool === 'eraser'}
            isDropdownOpen={activePopover === 'eraser'}
            onMainClick={() => {
              setActivePopover('none');
              handleSelectTool('eraser');
            }}
            onDropdownClick={() => togglePopover('eraser')}
          />
        </div>

        <Divider />

        {/* Insert / Objects */}
        <div className="hidden sm:flex items-center gap-1">
          <ToolButton
            icon={<Shapes className="w-6 h-6" />}
            label="Shapes"
            isActive={toolSettings.tool === 'shape' || activePopover === 'shape'}
            onClick={() => handleSelectTool('shape')}
          />
          <ToolButton
            icon={<Type className="w-6 h-6" />}
            label="Text"
            isActive={toolSettings.tool === 'text' || activePopover === 'text'}
            onClick={() => handleSelectTool('text')}
          />
          <ToolButton
            icon={<ImageIcon className="w-6 h-6" />}
            label="Media"
            isActive={activePopover === 'media'}
            onClick={() => togglePopover('media')}
          />
        </div>

        <div className="hidden sm:block"><Divider /></div>

        {/* Teaching */}
        <div className="hidden sm:flex items-center gap-1">
          <ToolButton
            icon={<GraduationCap className="w-6 h-6" />}
            label="Teaching Tools"
            onClick={() => {
              setActivePopover('none');
              setTeachingPanelOpen(true);
            }}
          />
        </div>

        <div className="hidden lg:block"><Divider /></div>

        {/* Appearance */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            className="flex items-center justify-center min-w-[56px] min-h-[56px] w-[56px] h-[56px] rounded-2xl transition-all hover:bg-slate-800 flex-shrink-0"
            onClick={() => togglePopover('color')}
            title="Colour Palette"
            aria-label="Colour Palette"
          >
            <div 
              className="w-6 h-6 rounded-full border-2 border-slate-600 shadow-inner"
              style={{ backgroundColor: toolSettings.color }}
            />
          </button>
          <ToolButton
            icon={<Sliders className="w-6 h-6" />}
            label="Properties"
            isActive={false}
            onClick={() => alert("Object Properties coming soon")}
          />
        </div>

        <div className="hidden lg:block"><Divider /></div>

        {/* History & Actions */}
        <div className="hidden lg:flex items-center gap-1">
          <ToolButton
            icon={<Undo2 className="w-6 h-6" />}
            label="Undo"
            onClick={undo}
            isDisabled={!history.canUndo}
          />
          <ToolButton
            icon={<Redo2 className="w-6 h-6" />}
            label="Redo"
            onClick={redo}
            isDisabled={!history.canRedo}
          />
          <ToolButton
            icon={<Trash2 className="w-6 h-6" />}
            label="Delete"
            onClick={() => setClearDialogOpen(true)}
            variant="danger"
          />
        </div>

        {/* More Menu (Mobile & Tablet) */}
        <div className="flex lg:hidden items-center ml-1">
          <ToolButton
            icon={<MoreHorizontal className="w-6 h-6" />}
            label="More Tools"
            onClick={() => setIsMoreModalOpen(true)}
          />
        </div>
      </div>

      <MoreToolbarModal
        isOpen={isMoreModalOpen}
        onClose={() => setIsMoreModalOpen(false)}
        onSelectPopover={(type) => {
          setActivePopover(type);
          // If shape/text/media selected, they auto-handle their states in MainToolbar or ContextToolbar, 
          // but we just set the popover and let it render.
        }}
      />
    </div>
  );
};
