export enum LayoutMode {
  SMARTBOARD = 'SMARTBOARD',
  DESKTOP = 'DESKTOP',
  TABLET = 'TABLET',
  MOBILE = 'MOBILE'
}

export interface ResponsiveState {
  mode: LayoutMode;
  orientation: 'landscape' | 'portrait';
  uiScale: number;
  viewportWidth: number;
  viewportHeight: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
