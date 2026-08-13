import { ShapeType, StrokeStyle } from '../../types';
import { PenRegistry } from '../../drawing/pens';
import type { PenOverrides, SliceCreator, ToolSlice } from '../types';

const ACTIVE_PEN_KEY = 'jhw_active_pen';
const PEN_OVERRIDES_KEY = 'jhw_pen_overrides';

/**
 * The pen in hand and each pen's tweaks persist, so a teacher who writes with a
 * 12px marker finds a 12px marker tomorrow rather than the factory 6px.
 */
const loadActivePen = (): string => {
  try {
    const saved = localStorage.getItem(ACTIVE_PEN_KEY);
    return saved && PenRegistry.has(saved) ? saved : 'fine';
  } catch {
    return 'fine';
  }
};

const loadPenOverrides = (): PenOverrides => {
  try {
    const saved = localStorage.getItem(PEN_OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const persist = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Storage unavailable; preferences simply won't survive the session.
  }
};

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
    activePenId: loadActivePen(),
    magicPenMode: 'ink',
    magicPenDuration: 3000,
    magicPenMagnification: 2.0,
    magicPenPermanent: false,
    ...(() => {
      const remembered = loadPenOverrides()[loadActivePen()];
      return {
        penSizeOverride: remembered?.size,
        penOpacityOverride: remembered?.opacity,
        penColorOverride: remembered?.color ?? PenRegistry.getOrDefault(loadActivePen()).color ?? undefined,
      };
    })(),
  },

  penOverrides: loadPenOverrides(),

  setActivePen: (penId) => {
    const { engine, toolSettings, penOverrides } = get();
    const preset = PenRegistry.get(penId);
    if (!preset) return;

    // Each pen keeps its own tweaks, so returning to the marker restores the size
    // it was last used at rather than resetting to the factory value. Colour is
    // preserved unless the pen pins one of its own.
    const remembered = penOverrides[penId];
    const updated = {
      ...toolSettings,
      tool: 'pen' as const,
      activePenId: penId,
      penSizeOverride: remembered?.size,
      penOpacityOverride: remembered?.opacity,
      penColorOverride: remembered?.color ?? preset.color ?? undefined,
    };

    persist(ACTIVE_PEN_KEY, penId);
    set({ toolSettings: updated, lastSelectedPenName: preset.name });
    if (engine) {
      engine.updateToolSettings(updated);
      engine.setTool('pen');
    }
  },

  /**
   * Re-selects the remembered pen without opening the selector. This is what the
   * Pen button itself does, so writing is one tap.
   */
  activateLastPen: () => {
    const { engine, toolSettings } = get();
    const preset = PenRegistry.getOrDefault(toolSettings.activePenId);
    const updated = { ...toolSettings, tool: 'pen' as const };
    set({ toolSettings: updated, lastSelectedPenName: preset.name });
    if (engine) {
      engine.updateToolSettings(updated);
      engine.setTool('pen');
    }
  },

  setPenSize: (size) => {
    const { engine, toolSettings, penOverrides } = get();
    const updated = { ...toolSettings, penSizeOverride: size };
    const nextOverrides = {
      ...penOverrides,
      [toolSettings.activePenId]: { ...penOverrides[toolSettings.activePenId], size },
    };
    persist(PEN_OVERRIDES_KEY, nextOverrides);
    set({ toolSettings: updated, penOverrides: nextOverrides });
    if (engine) engine.updateToolSettings(updated);
  },

  setPenOpacity: (opacity) => {
    const { engine, toolSettings, penOverrides } = get();
    const updated = { ...toolSettings, penOpacityOverride: opacity };
    const nextOverrides = {
      ...penOverrides,
      [toolSettings.activePenId]: { ...penOverrides[toolSettings.activePenId], opacity },
    };
    persist(PEN_OVERRIDES_KEY, nextOverrides);
    set({ toolSettings: updated, penOverrides: nextOverrides });
    if (engine) engine.updateToolSettings(updated);
  },

  setPenColor: (color) => {
    const { engine, toolSettings, penOverrides } = get();
    // Written to both so the shared colour system and the pen stay in step.
    const updated = { ...toolSettings, color, penColorOverride: color };
    const nextOverrides = {
      ...penOverrides,
      [toolSettings.activePenId]: { ...penOverrides[toolSettings.activePenId], color },
    };
    persist(PEN_OVERRIDES_KEY, nextOverrides);
    set({ toolSettings: updated, penOverrides: nextOverrides });
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
