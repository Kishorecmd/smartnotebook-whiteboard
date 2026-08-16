import React, { useEffect, useRef } from 'react';
import { WhiteboardEngine } from '../../engine';
import { useWhiteboardStore } from '../../store';
import { SelectionActionBar } from '../Toolbar/SelectionActionBar';
import { CanvasTextEditor } from './CanvasTextEditor';
import { MultitouchDebugOverlay } from '../MultitouchDebugOverlay';
import { FileImportService } from '../../services';
import { visibleWorldBox } from '../../utils';
import { Point } from '../../types';
import { ObjectContextMenu, ContextMenuPosition } from '../context-menu/ObjectContextMenu';
import { CanvasContextMenu as CanvasMenu } from '../context-menu/CanvasContextMenu';
import { HitTest } from '../../engine/HitTest';
import { MediaLayer } from '../Media/MediaLayer';

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
    engine,
  } = useWhiteboardStore();

  const [objectContextMenuPos, setObjectContextMenuPos] = React.useState<ContextMenuPosition | null>(null);
  const [canvasContextMenuPos, setCanvasContextMenuPos] = React.useState<ContextMenuPosition | null>(null);

  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  useEffect(() => {
    if (!canvasRef.current || !overlayCanvasRef.current || !containerRef.current) return;

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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        engine.getObjectManager().copy(engine.getSelectedIds());
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        engine.getObjectManager().cut(engine.getSelectedIds());
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        engine.selectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.getObjectManager().ungroupObjects(engine.getSelectedIds());
        } else {
          engine.getObjectManager().groupObjects(engine.getSelectedIds());
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (e.shiftKey) {
          const selected = engine.getSelectedObjects();
          if (selected.some(o => !o.locked)) {
            engine.getObjectManager().lockObjects(engine.getSelectedIds());
          } else {
            engine.getObjectManager().unlockObjects(engine.getSelectedIds());
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        // Duplicate selected
        e.preventDefault();
        engine.getObjectManager().duplicate(engine.getSelectedIds());
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
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'v' || e.key === 'V')) {
        useWhiteboardStore.getState().setTool('select');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T')) {
        useWhiteboardStore.getState().setTool('text');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'u' || e.key === 'U')) {
        useWhiteboardStore.getState().setTool('shape');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P')) {
        useWhiteboardStore.getState().setTool('pen');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'm' || e.key === 'M')) {
        useWhiteboardStore.getState().setTool('marker');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'e' || e.key === 'E')) {
        useWhiteboardStore.getState().setTool('eraser');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'h' || e.key === 'H')) {
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
      } else if (e.key.startsWith('Arrow')) {
        if (engine.getSelectedIds().length > 0) {
          e.preventDefault();
          const amount = e.shiftKey ? 10 : 1;
          const zoom = engine.getTransformer().getZoom();
          const d = amount / zoom;
          switch (e.key) {
            case 'ArrowUp': engine.nudgeSelected(0, -d); break;
            case 'ArrowDown': engine.nudgeSelected(0, d); break;
            case 'ArrowLeft': engine.nudgeSelected(-d, 0); break;
            case 'ArrowRight': engine.nudgeSelected(d, 0); break;
          }
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

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      engine.getObjectManager().paste(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      resizeObserver.disconnect();
      engine.dispose();
      setEngine(null);
    };
    // Mount-once. `doc.pages` used to be a dependency, but it gets a fresh array
    // reference on every stroke (onDocumentChange -> setPageObjects), so the engine
    // was disposed and rebuilt after each edit -- taking the undo history with it.
    // Page switches and background changes are pushed into the live engine by the
    // store actions and the effect below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEngine]);

  // Keep the live engine's background in step with the active page.
  useEffect(() => {
    const engine = useWhiteboardStore.getState().engine;
    if (engine) {
      engine.setBackground(activePage.background, activePage.backgroundType);
    }
  }, [activePage.background, activePage.backgroundType]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none"
      style={{
        cursor: toolSettings.tool === 'pan' ? 'grab' : 'crosshair',
        backgroundColor: activePage.background,
      }}
      tabIndex={0}
      onContextMenu={(e) => {
        e.preventDefault();
        const engine = useWhiteboardStore.getState().engine;
        if (!engine || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const worldPoint = engine.getTransformer().screenToWorld(screenPoint);
        const zoom = engine.getTransformer().getZoom();
        
        const hitObj = HitTest.findObjectAtPoint(worldPoint, engine.getObjects(), 8 / zoom);
        
        if (hitObj) {
          if (!engine.isSelected(hitObj.id)) {
            engine.setSelectedIds([hitObj.id]);
          }
          setObjectContextMenuPos({ x: e.clientX, y: e.clientY });
          setCanvasContextMenuPos(null);
        } else {
          engine.clearSelection();
          setCanvasContextMenuPos({ x: e.clientX, y: e.clientY });
          setObjectContextMenuPos(null);
        }
      }}
      onClick={() => {
        setObjectContextMenuPos(null);
        setCanvasContextMenuPos(null);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const engine = useWhiteboardStore.getState().engine;
        const showToast = useWhiteboardStore.getState().showToast;
        
        if (!engine) return;

        // Get drop coordinates in screen space, convert to world space
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dropPoint: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        const worldPoint = engine.getTransformer().screenToWorld(dropPoint);
        const maxDisplaySize = visibleWorldBox(engine.getTransformer().getTransform().zoom, rect.width, rect.height);
        
        let handled = false;

        if (files.length > 0) {
          for (const file of files) {
            if (file.type.startsWith('image/')) {
              try {
                const imgObj = await FileImportService.importImageBlob(
                  file,
                  worldPoint,
                  maxDisplaySize
                );
                engine.addObject(imgObj);
                engine.setSelectedIds([imgObj.id]);
                handled = true;
              } catch (err: any) {
                console.error("Failed to import dropped image", err);
                showToast(err.message || 'Failed to import dropped image.');
              }
            } else if (file.type === 'application/pdf') {
              try {
                const images = await FileImportService.importPdfAsImages(file, worldPoint, 2.0);
                if (images.length > 0) {
                  setPdfImportModalOpen(true, images);
                  handled = true;
                }
              } catch (err) {
                console.error("Failed to import PDF", err);
              }
            }
          }
        }

        if (!handled) {
          const htmlData = e.dataTransfer.getData('text/html');
          const uriData = e.dataTransfer.getData('text/uri-list');
          const textData = e.dataTransfer.getData('text/plain');

          // Check HTML first
          if (htmlData) {
            try {
               const doc = new DOMParser().parseFromString(htmlData, "text/html");
               const img = doc.querySelector('img[src], img[srcset]');
               if (img) {
                 let src = img.getAttribute('src');
                 const srcset = img.getAttribute('srcset');
                 
                 if (srcset) {
                    const candidates = srcset.split(',').map(s => s.trim().split(/\s+/));
                    if (candidates.length > 0) {
                        src = candidates[candidates.length - 1][0];
                    }
                 }
                 
                 if (src && (src.startsWith('http:') || src.startsWith('https:') || src.startsWith('data:'))) {
                     try {
                        const imageObj = await FileImportService.importImageUrl(src, worldPoint, maxDisplaySize);
                        engine.addObject(imageObj);
                        engine.setSelectedIds([imageObj.id]);
                        handled = true;
                     } catch (err: any) {
                        showToast(err.message || 'Failed to fetch image from dropped HTML.');
                     }
                 }
               }
            } catch (err) {
               console.error('Failed to parse dropped HTML payload', err);
            }
          }

          // Check direct URL fallback
          if (!handled && (uriData || textData)) {
            const urlToCheck = uriData ? uriData.split('\n')[0].trim() : textData.trim();
            const isImageUrl = /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(urlToCheck);
            if (isImageUrl) {
                try {
                    const imageObj = await FileImportService.importImageUrl(urlToCheck, worldPoint, maxDisplaySize);
                    engine.addObject(imageObj);
                    engine.setSelectedIds([imageObj.id]);
                    handled = true;
                } catch (err: any) {
                    showToast(err.message || 'Failed to fetch dropped image URL.');
                }
            }
          }
        }

        if (handled) {
            showToast("Image imported");
        }
      }}
    >
      {/* Floating Contextual Selection Action Bar */}
      <SelectionActionBar />

      {/* Floating in-place Text Editor when typing or editing */}
      <CanvasTextEditor />

      {/* Multitouch Debugger */}
      {engine && <MultitouchDebugOverlay engine={engine} />}

      {/* Context Menus */}
      {engine && (
        <>
          <ObjectContextMenu
            position={objectContextMenuPos}
            onClose={() => setObjectContextMenuPos(null)}
            selectedIds={engine.getSelectedIds()}
            objectManager={engine.getObjectManager()}
          />
          <CanvasMenu
            position={canvasContextMenuPos}
            onClose={() => setCanvasContextMenuPos(null)}
            objectManager={engine.getObjectManager()}
            onSelectAll={() => engine.selectAll()}
          />
          
          {/* Media layer for interactive DOM objects like YouTube videos */}
          <MediaLayer engine={engine} />
        </>
      )}

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

