import React, { useEffect, useRef } from 'react';
import { WhiteboardEngine } from '../../engine';
import { useWhiteboardStore } from '../../store';
import { SelectionActionBar } from '../Toolbar/SelectionActionBar';
import { CanvasTextEditor } from './CanvasTextEditor';
import { MultitouchDebugOverlay } from '../MultitouchDebugOverlay';
import { FileImportService } from '../../services';
import { Point, YouTubeVideoObject } from '../../types';
import { YouTubeVideo } from '../../media/youtube/YouTubeVideo';

export const WhiteboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    document: doc,
    activePageIndex,
    toolSettings,
    setEngine,
    setViewport,
    setHistoryState,
    setPageObjects,
    setSelectedIds,
    startTextEditing,
    setPdfImportModalOpen,
  } = useWhiteboardStore();

  useEffect(() => {
    if (!canvasRef.current || !overlayCanvasRef.current || !containerRef.current) return;

    const activePage = doc.pages[activePageIndex] || doc.pages[0];

    // Instantiate WhiteboardEngine
    const engine = new WhiteboardEngine({
      canvas: canvasRef.current,
      overlayCanvas: overlayCanvasRef.current,
      initialObjects: activePage.objects,
      initialSettings: toolSettings,
      callbacks: {
        onDocumentChange: (objects) => {
          setPageObjects(useWhiteboardStore.getState().activePageIndex, objects);
        },
        onHistoryChange: (history) => {
          setHistoryState(history);
        },
        onViewportChange: (vp) => {
          setViewport(vp);
        },
        onSelectionChange: (ids) => {
          setSelectedIds(ids);
        },
        onStartTextEditing: (req) => {
          startTextEditing(req);
        },
      },
    });

    engine.setBackground(activePage.background, activePage.backgroundType);
    setEngine(engine);

    // Initial resize to container size
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      engine.resize(clientWidth, clientHeight);
    };

    resizeCanvas();

    // ResizeObserver for responsive layout updates
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(containerRef.current);

    // Global keyboard listener for Space pan & keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        engine.setSpacePressed(true);
      }

      // Hotkeys
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engine.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        // Duplicate selected
        e.preventDefault();
        engine.duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.altKey || e.shiftKey) && e.key.toLowerCase() === 't') {
        // Convert handwriting to text
        e.preventDefault();
        useWhiteboardStore.getState().recognizeHandwritingForSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected objects if any
        if (engine.getSelectedIds().length > 0) {
          e.preventDefault();
          engine.deleteSelected();
        }
      } else if (e.key === 'Escape') {
        if (useWhiteboardStore.getState().isPresenterMode) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.warn(err));
          }
          useWhiteboardStore.getState().setPresenterMode(false);
        } else {
          engine.clearSelection();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        useWhiteboardStore.getState().setTool('select');
      } else if (e.key === 't' || e.key === 'T') {
        useWhiteboardStore.getState().setTool('text');
      } else if (e.key === 'u' || e.key === 'U') {
        useWhiteboardStore.getState().setTool('shape');
      } else if (e.key === 'p' || e.key === 'P') {
        useWhiteboardStore.getState().setTool('pen');
      } else if (e.key === 'm' || e.key === 'M') {
        useWhiteboardStore.getState().setTool('marker');
      } else if (e.key === 'e' || e.key === 'E') {
        useWhiteboardStore.getState().setTool('eraser');
      } else if (e.key === 'h' || e.key === 'H') {
        useWhiteboardStore.getState().setTool('pan');
      } else if (e.key === ']') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          engine.reorderSelected('bringToFront');
        } else {
          engine.reorderSelected('bringForward');
        }
      } else if (e.key === '[') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          engine.reorderSelected('sendToBack');
        } else {
          engine.reorderSelected('sendBackward');
        }
      } else if (e.key === '+' || e.key === '=') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          engine.zoomIn();
        }
      } else if (e.key === '-' || e.key === '_') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          engine.zoomOut();
        }
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        engine.resetZoom();
      }

      // Presenter Mode Page Navigation Hotkeys
      if (useWhiteboardStore.getState().isPresenterMode) {
        const store = useWhiteboardStore.getState();
        const currentIndex = store.activePageIndex;
        const total = store.document.pages.length;

        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          if (currentIndex < total - 1) {
            store.setActivePageIndex(currentIndex + 1);
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          if (currentIndex > 0) {
            store.setActivePageIndex(currentIndex - 1);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        engine.setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      engine.dispose();
      setEngine(null);
    };
    // We no longer draw the solid background on the canvas itself if we have media behind it.
    // However, to keep it simple, we just set the backgroundColor of the container.
    // The CanvasRenderer will still clearRect for YouTube videos to punch holes.
  }, [activePage.background]);

  // Extract youtube videos to render them in the DOM layer
  const youtubeVideos = (doc.pages[activePageIndex] || doc.pages[0]).objects.filter(obj => obj.type === 'youtubeVideo') as YouTubeVideoObject[];
  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none"
      style={{
        cursor: toolSettings.activeTool === 'pan' ? (useWhiteboardStore.getState().isSpacePressed ? 'grabbing' : 'grab') : 'crosshair',
        backgroundColor: activePage.background,
      }}
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const engine = useWhiteboardStore.getState().engine;
        
        if (files.length > 0 && engine) {
          // Get drop coordinates in screen space, convert to world space
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const dropPoint: Point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
          const worldPoint = engine.getTransformer().screenToWorld(dropPoint);

          for (const file of files) {
            if (file.type.startsWith('image/')) {
              try {
                const imgObj = await FileImportService.importImage(file, worldPoint);
                engine.addObject(imgObj);
              } catch (err) {
                console.error("Failed to import image", err);
              }
            } else if (file.type === 'application/pdf') {
              try {
                const images = await FileImportService.importPdfAsImages(file, worldPoint, 2.0);
                if (images.length > 0) {
                  setPdfImportModalOpen(true, images);
                }
              } catch (err) {
                console.error("Failed to import PDF", err);
              }
            }
          }
        }
      }}
    >
      {/* Floating Contextual Selection Action Bar */}
      <SelectionActionBar />

      {/* Floating in-place Text Editor when typing or editing */}
      <CanvasTextEditor />

      {/* Multitouch Debugger */}
      {useWhiteboardStore.getState().engine && <MultitouchDebugOverlay engine={useWhiteboardStore.getState().engine!} />}

      {/* DOM Media Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {youtubeVideos.map(video => (
          <YouTubeVideo key={video.id} video={video} />
        ))}
      </div>

      {/* Primary persistent objects canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full touch-none"
        style={{ zIndex: 10 }}
      />

      {/* Overlay canvas for active in-progress stroke & cursor previews */}
      <canvas
        ref={overlayCanvasRef}
        className={`absolute inset-0 block w-full h-full pointer-events-auto touch-none ${
          toolSettings.tool === 'pan' 
            ? 'cursor-grab active:cursor-grabbing' 
            : toolSettings.tool === 'text' 
              ? 'cursor-text' 
              : toolSettings.tool === 'select'
                ? 'cursor-default'
                : 'cursor-default' // Always use default mouse pointer for drawing tools as requested
        }`}
        style={{ zIndex: 20 }}
      />
    </div>
  );
};

