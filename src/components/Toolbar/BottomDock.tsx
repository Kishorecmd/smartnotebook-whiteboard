import React from 'react';
import { MainToolbar } from './MainToolbar';
import { AutoGroupingControl } from './AutoGroupingControl';
import { PageNavigationFooter } from '../Pages/PageNavigationFooter';
import { ZoomControls } from '../Zoom/ZoomControls';
import { useWhiteboardStore } from '../../store';
import { Palette } from 'lucide-react';

export const BottomDock: React.FC = () => {
  const { childFriendlyMode, isPresenterMode, toolSettings, togglePageDrawer } = useWhiteboardStore();
  if (childFriendlyMode || isPresenterMode) return null;
  const drawing = ['pen', 'pencil', 'brush', 'crayon', 'marker'].includes(toolSettings.tool);
  const hint = toolSettings.tool === 'select' ? 'Click an object, or drag around several to select.'
    : toolSettings.tool === 'pan' ? 'Drag to move around your page.'
    : toolSettings.tool === 'text' ? 'Click anywhere on the page to type.'
    : toolSettings.tool === 'shape' ? 'Choose a shape, then drag to draw it.'
    : toolSettings.tool === 'eraser' ? 'Drag over the writing you want to erase.'
    : toolSettings.tool === 'laser' ? 'Draw a temporary pointer. It fades automatically.'
    : toolSettings.tool === 'spotlight' || toolSettings.tool === 'magic_pen' ? 'Drag to move the focus. Choose Select to close it.'
    : 'Make room for your next idea.';
  return <div className="wb-dock wb-ui">
    <div className="wb-dock-context">
      <div className="wb-page-controls"><PageNavigationFooter /><button className="wb-background-button" title="Page background and paper styles" aria-label="Page background" onClick={togglePageDrawer}><Palette size={16} /><span>Background</span></button></div>
      <div className="wb-tool-help">{drawing ? <AutoGroupingControl /> : <span>{hint}</span>}</div>
      <ZoomControls />
    </div>
    <MainToolbar />
    <div className="wb-dock-caption">YOUR SPACE TO THINK, WRITE & DISCOVER</div>
  </div>;
};
