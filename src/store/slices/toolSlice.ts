import { ShapeType, StrokeStyle } from '../../types';
import type { SliceCreator, ToolSlice } from '../types';

export const createToolSlice: SliceCreator<ToolSlice> = (set, get) => ({
  toolSettings: {
    tool: 'pen',
    color: '#0f172a',
    penWidth: 4,
    pencilWidth: 2,
    brushWidth: 16,
    crayonWidth: 12,
    highlighterWidth: 24,
    markerWidth: 24,
    eraserWidth: 28,
    markerOpacity: 0.4,
    opacity: 1.0,
    smoothingLevel: 'medium',
    eraserMode: 'stroke',
    shapeType: 'rectangle' as ShapeType,
    shapeFillColor: 'transparent',
    shapeStrokeStyle: 'solid' as StrokeStyle,
    shapeStrokeWidth: 3,
    textFontSize: 28,
    textFontFamily: 'Inter, sans-serif',
    textFontWeight: 'normal',
    textFontStyle: 'normal',
    textUnderline: false,
    textAlign: 'left',
    textColor: '#0f172a',
  },

  setTool: (tool) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, tool };
    set({ toolSettings: updated });
    if (engine) {
      engine.setTool(tool);
    }
  },

  updateToolSettings: (settings) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, ...settings };
    set({ toolSettings: updated });
    if (engine) {
      engine.updateToolSettings(settings);
    }
  },
});
