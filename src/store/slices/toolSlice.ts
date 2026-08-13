import { ShapeType, StrokeStyle } from '../../types';
import { PenRegistry } from '../../drawing/pens';
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
    activePenId: 'fine',
  },

  setActivePen: (penId) => {
    const { engine, toolSettings } = get();
    const preset = PenRegistry.get(penId);
    if (!preset) return;

    // Switching pens clears the previous pen's size/opacity tweaks and adopts the
    // new preset's defaults. Colour is deliberately preserved unless the preset
    // pins one of its own.
    const updated = {
      ...toolSettings,
      tool: 'pen' as const,
      activePenId: penId,
      penSizeOverride: undefined,
      penOpacityOverride: undefined,
      penColorOverride: preset.color ?? undefined,
    };

    set({ toolSettings: updated, lastSelectedPenName: preset.name });
    if (engine) {
      engine.updateToolSettings(updated);
      engine.setTool('pen');
    }
  },

  setPenSize: (size) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, penSizeOverride: size };
    set({ toolSettings: updated });
    if (engine) engine.updateToolSettings(updated);
  },

  setPenOpacity: (opacity) => {
    const { engine, toolSettings } = get();
    const updated = { ...toolSettings, penOpacityOverride: opacity };
    set({ toolSettings: updated });
    if (engine) engine.updateToolSettings(updated);
  },

  setPenColor: (color) => {
    const { engine, toolSettings } = get();
    // Written to both so the shared colour system and the pen stay in step.
    const updated = { ...toolSettings, color, penColorOverride: color };
    set({ toolSettings: updated });
    if (engine) engine.updateToolSettings(updated);
  },

  lastSelectedPenName: null,
  clearLastSelectedPenName: () => set({ lastSelectedPenName: null }),

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
