export interface ColorPreset {
  name: string;
  value: string;
  textColor?: string;
}

export const CLASSROOM_PALETTE: ColorPreset[] = [
  { name: 'Black', value: '#1e293b' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Crimson Red', value: '#dc2626' },
  { name: 'Emerald Green', value: '#16a34a' },
  { name: 'Amber Yellow', value: '#d97706' },
  { name: 'Vibrant Orange', value: '#ea580c' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Rose Pink', value: '#db2777' },
  { name: 'Slate Gray', value: '#64748b' },
  { name: 'Chalk Green', value: '#14532d' },
];

export const MARKER_PALETTE: ColorPreset[] = [
  { name: 'Highlighter Yellow', value: '#facc15' },
  { name: 'Highlighter Green', value: '#4ade80' },
  { name: 'Highlighter Cyan', value: '#38bdf8' },
  { name: 'Highlighter Pink', value: '#f472b6' },
  { name: 'Highlighter Orange', value: '#fb923c' },
  { name: 'Highlighter Purple', value: '#c084fc' },
];

export function hexToRgba(hex: string, alpha: number = 1): string {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isLightColor(hex: string): boolean {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6) return false;
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160;
}
