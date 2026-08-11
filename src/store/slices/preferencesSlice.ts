import type { PreferencesSlice, SliceCreator } from '../types';

const RECENT_COLORS_KEY = 'jhw_recent_colors';
const FAVORITE_COLORS_KEY = 'jhw_favorite_colors';
const FAVORITE_TOOLS_KEY = 'jhw_favorite_tools';
const RECENT_TOOLS_KEY = 'jhw_recent_tools';

const MAX_RECENT_COLORS = 12;
const MAX_RECENT_TOOLS = 8;

/** localStorage is unavailable in private mode / when quota is exhausted, so both sides fail soft. */
const readList = (key: string): string[] => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const writeList = (key: string, value: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences are best-effort; a failed write should never break the board.
  }
};

export const createPreferencesSlice: SliceCreator<PreferencesSlice> = (set) => ({
  coloringMode: false,
  childFriendlyMode: false,
  recentColors: readList(RECENT_COLORS_KEY),
  favoriteColors: readList(FAVORITE_COLORS_KEY),
  favoriteTools: readList(FAVORITE_TOOLS_KEY),
  recentTools: readList(RECENT_TOOLS_KEY),

  setColoringMode: (enabled) => set({ coloringMode: enabled }),
  setChildFriendlyMode: (enabled) => set({ childFriendlyMode: enabled }),

  addRecentColor: (color) => {
    set((state) => {
      const recent = state.recentColors.filter((c) => c !== color);
      recent.unshift(color);
      if (recent.length > MAX_RECENT_COLORS) recent.pop();
      writeList(RECENT_COLORS_KEY, recent);
      return { recentColors: recent };
    });
  },

  addFavoriteColor: (color) => {
    set((state) => {
      if (state.favoriteColors.includes(color)) return state;
      const newFavs = [...state.favoriteColors, color];
      writeList(FAVORITE_COLORS_KEY, newFavs);
      return { favoriteColors: newFavs };
    });
  },

  removeFavoriteColor: (color) => {
    set((state) => {
      const newFavs = state.favoriteColors.filter((c) => c !== color);
      writeList(FAVORITE_COLORS_KEY, newFavs);
      return { favoriteColors: newFavs };
    });
  },

  toggleFavoriteTool: (toolId) => {
    set((state) => {
      const newFavs = state.favoriteTools.includes(toolId)
        ? state.favoriteTools.filter((id) => id !== toolId)
        : [...state.favoriteTools, toolId];
      writeList(FAVORITE_TOOLS_KEY, newFavs);
      return { favoriteTools: newFavs };
    });
  },

  addRecentTool: (toolId) => {
    set((state) => {
      const filtered = state.recentTools.filter((id) => id !== toolId);
      const newRecents = [toolId, ...filtered].slice(0, MAX_RECENT_TOOLS);
      writeList(RECENT_TOOLS_KEY, newRecents);
      return { recentTools: newRecents };
    });
  },
});
