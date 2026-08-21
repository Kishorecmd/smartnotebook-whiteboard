import type { ToolType } from '../types';

export type PalmSensitivity = 'automatic' | 'low' | 'medium' | 'high' | 'off';
export type FingerDrawMode = 'auto' | 'on' | 'off';
export type PalmEraserSize = 'auto' | 'small' | 'medium' | 'large';
export type PalmEraserTarget = 'ink' | 'ink-shapes' | 'all';

export interface InputSettings {
  fingerDraw: FingerDrawMode;
  /** Set once this device has actually produced a stylus pointer. */
  stylusSeen: boolean;
  palmSensitivity: PalmSensitivity;
  palmContactThreshold: number;
  palmMovementThreshold: number;
  palmEraserSize: PalmEraserSize;
  palmEraserTarget: PalmEraserTarget;
  touchSlop: number;
  stylusSlop: number;
  rotationThresholdDegrees: number;
  minZoom: number;
  maxZoom: number;
  longPressMs: number;
  advancedGestures: boolean;
  threeFingerSwipe: boolean;
  fourFingerFocus: boolean;
  twoFingerDoubleTapFit: boolean;
  debugOverlay: boolean;
  lastStylusTool: ToolType;
}

export const INPUT_SETTINGS_STORAGE_KEY = 'jhw_input_settings_v1';

export const DEFAULT_INPUT_SETTINGS: InputSettings = {
  fingerDraw: 'auto',
  stylusSeen: false,
  palmSensitivity: 'automatic',
  palmContactThreshold: 48,
  palmMovementThreshold: 10,
  palmEraserSize: 'auto',
  palmEraserTarget: 'ink',
  touchSlop: 8,
  stylusSlop: 3,
  rotationThresholdDegrees: 4,
  minZoom: 0.25,
  maxZoom: 5,
  longPressMs: 550,
  advancedGestures: true,
  threeFingerSwipe: true,
  fourFingerFocus: true,
  twoFingerDoubleTapFit: true,
  debugOverlay: false,
  lastStylusTool: 'pen',
};

const sensitivityThreshold = (settings: InputSettings): number => {
  switch (settings.palmSensitivity) {
    case 'high':
      return Math.max(34, settings.palmContactThreshold - 10);
    case 'low':
      return settings.palmContactThreshold + 12;
    case 'medium':
      return settings.palmContactThreshold;
    case 'off':
      return Number.POSITIVE_INFINITY;
    default:
      return settings.palmContactThreshold;
  }
};

export const getPalmThreshold = (settings: InputSettings): number => sensitivityThreshold(settings);

/**
 * A Smartboard pairs a stylus with finger-to-select, but a phone or tablet has
 * no stylus at all, so there a finger that only selects can never write.
 *
 * '(any-pointer: fine)' looked like the way to tell those apart and is not: an
 * HONOR tablet with no stylus reports it true while a OnePlus phone reports it
 * false, so it disabled finger drawing on exactly the hardware that needed it.
 * The only dependable evidence that a stylus exists is a stylus event, so
 * 'auto' lets a finger draw on a touch-first device until one arrives, then
 * hands writing back to the pen for good.
 */
export const shouldFingerDraw = (settings: InputSettings): boolean => {
  if (settings.fingerDraw === 'on') return true;
  if (settings.fingerDraw === 'off') return false;
  if (settings.stylusSeen) return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
};

export const loadInputSettings = (): InputSettings => {
  try {
    const stored = localStorage.getItem(INPUT_SETTINGS_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_INPUT_SETTINGS };
    return { ...DEFAULT_INPUT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_INPUT_SETTINGS };
  }
};

export const saveInputSettings = (patch: Partial<InputSettings>): InputSettings => {
  const next = { ...loadInputSettings(), ...patch };
  try {
    localStorage.setItem(INPUT_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent<InputSettings>('jhw-input-settings-change', { detail: next }));
  } catch {
    // Device preferences are best-effort and must never stop board input.
  }
  return next;
};

export const calibratePalmThreshold = (fingerSamples: number[], palmSamples: number[]): number => {
  if (fingerSamples.length === 0 || palmSamples.length === 0) {
    return DEFAULT_INPUT_SETTINGS.palmContactThreshold;
  }
  const fingerMax = Math.max(...fingerSamples);
  const palmMin = Math.min(...palmSamples);
  if (palmMin <= fingerMax) return Math.round(Math.max(40, fingerMax + 8));
  return Math.round((fingerMax + palmMin) / 2);
};

export const palmEraserRadius = (
  settings: InputSettings,
  contactWidth: number,
  contactHeight: number,
): number => {
  switch (settings.palmEraserSize) {
    case 'small': return 22;
    case 'medium': return 34;
    case 'large': return 50;
    default:
      return Math.min(60, Math.max(18, Math.max(contactWidth, contactHeight) * 0.55));
  }
};

export const isStylusTool = (tool: ToolType): boolean =>
  ['pen', 'pencil', 'brush', 'crayon', 'highlighter', 'marker', 'magic_pen'].includes(tool);
