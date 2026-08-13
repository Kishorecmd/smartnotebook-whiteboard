import { PenPreset } from '../PenPreset';

/** The five pens on the front row of the selector: everyday classroom writing. */

export const FINE_PEN: PenPreset = {
  id: 'fine',
  name: 'Fine Pen',
  type: 'fine',
  icon: '✏',
  group: 'quick',
  color: null, // keeps the user's current colour
  size: 2.5,
  opacity: 1,
  smoothing: 'medium',
  pressureSensitivity: 'off', // consistent width is the whole point of this pen
  renderMode: 'solid',
  compositeMode: 'source-over',
  lineCap: 'round',
  sizePresets: [1, 2, 2.5, 3, 5],
  supportsSnapping: true,
  availableInChildMode: false,
  legacyTool: 'pen',
};

export const BALLPOINT_PEN: PenPreset = {
  id: 'ballpoint',
  name: 'Ballpoint',
  type: 'ballpoint',
  icon: '●',
  group: 'quick',
  color: null,
  size: 3,
  opacity: 1,
  smoothing: 'medium',
  // Deliberately restrained: handwriting should breathe, not wobble.
  pressureSensitivity: 'low',
  renderMode: 'tapered',
  compositeMode: 'source-over',
  lineCap: 'round',
  minWidthRatio: 0.8,
  maxWidthRatio: 1.2,
  sizePresets: [2, 3, 5, 8],
  supportsSnapping: true,
  availableInChildMode: false,
  legacyTool: 'pen',
};

export const MARKER_PEN: PenPreset = {
  id: 'marker',
  name: 'Marker',
  type: 'marker',
  icon: '🖊',
  group: 'quick',
  color: null,
  size: 6,
  opacity: 0.9,
  smoothing: 'medium',
  pressureSensitivity: 'off',
  renderMode: 'solid',
  compositeMode: 'multiply',
  lineCap: 'round',
  sizePresets: [4, 6, 8, 12, 20],
  supportsSnapping: true,
  availableInChildMode: true,
  legacyTool: 'marker',
};

export const HIGHLIGHTER_PEN: PenPreset = {
  id: 'highlighter',
  name: 'Highlighter',
  type: 'highlighter',
  icon: '🖍',
  group: 'quick',
  color: '#facc15',
  size: 18,
  opacity: 0.45,
  smoothing: 'low',
  pressureSensitivity: 'off',
  renderMode: 'solid',
  // multiply keeps underlying writing readable instead of painting over it
  compositeMode: 'multiply',
  lineCap: 'butt',
  sizePresets: [12, 18, 24, 30],
  colorPresets: ['#facc15', '#4ade80', '#60a5fa', '#f472b6', '#fb923c'],
  supportsSnapping: true,
  availableInChildMode: true,
  legacyTool: 'highlighter',
};

export const PENCIL_PEN: PenPreset = {
  id: 'pencil',
  name: 'Pencil',
  type: 'pencil',
  icon: '✎',
  group: 'quick',
  color: null,
  size: 2,
  opacity: 0.8,
  smoothing: 'medium',
  pressureSensitivity: 'medium',
  renderMode: 'textured',
  compositeMode: 'source-over',
  lineCap: 'round',
  texture: 0.35,
  minWidthRatio: 0.7,
  maxWidthRatio: 1.25,
  sizePresets: [1, 2, 3, 5, 8],
  supportsSnapping: true,
  availableInChildMode: true,
  legacyTool: 'pencil',
};

export const QUICK_PENS: PenPreset[] = [
  FINE_PEN,
  BALLPOINT_PEN,
  MARKER_PEN,
  HIGHLIGHTER_PEN,
  PENCIL_PEN,
];
