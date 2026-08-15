import { LayoutMode, ResponsiveState } from './LayoutMode';
import { DeviceCapabilityService } from './DeviceCapabilityService';

export class ResponsiveLayoutManager {
  private static instance: ResponsiveLayoutManager;
  private listeners: Set<(state: ResponsiveState) => void> = new Set();
  private currentState: ResponsiveState;

  private constructor() {
    this.currentState = this.calculateState();
    
    // Bind the handler to maintain context
    this.handleResize = this.handleResize.bind(this);
    
    window.addEventListener('resize', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    
    // Initial application of CSS variables
    this.applyCssVariables(this.currentState);
  }

  public static getInstance(): ResponsiveLayoutManager {
    if (!ResponsiveLayoutManager.instance) {
      ResponsiveLayoutManager.instance = new ResponsiveLayoutManager();
    }
    return ResponsiveLayoutManager.instance;
  }

  public subscribe(listener: (state: ResponsiveState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  public getState(): ResponsiveState {
    return this.currentState;
  }

  private handleResize() {
    const newState = this.calculateState();
    
    // Only dispatch if something meaningfully changed
    if (this.hasStateChanged(this.currentState, newState)) {
      this.currentState = newState;
      this.applyCssVariables(newState);
      this.listeners.forEach(listener => listener(newState));
    }
  }

  private hasStateChanged(oldState: ResponsiveState, newState: ResponsiveState): boolean {
    return oldState.mode !== newState.mode ||
           oldState.orientation !== newState.orientation ||
           oldState.uiScale !== newState.uiScale ||
           oldState.viewportWidth !== newState.viewportWidth ||
           oldState.viewportHeight !== newState.viewportHeight ||
           oldState.safeArea.top !== newState.safeArea.top ||
           oldState.safeArea.bottom !== newState.safeArea.bottom ||
           oldState.safeArea.left !== newState.safeArea.left ||
           oldState.safeArea.right !== newState.safeArea.right;
  }

  private calculateState(): ResponsiveState {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const orientation = viewportWidth >= viewportHeight ? 'landscape' : 'portrait';

    const isTouch = DeviceCapabilityService.hasTouch();
    const isCoarse = DeviceCapabilityService.isCoarsePointer();
    const hasHover = DeviceCapabilityService.hasHover();

    let mode: LayoutMode;

    if (viewportWidth < 600) {
      mode = LayoutMode.MOBILE;
    } else if (viewportWidth < 1100) {
      if (!isTouch && hasHover && viewportWidth >= 800) {
        mode = LayoutMode.DESKTOP;
      } else {
        mode = LayoutMode.TABLET;
      }
    } else {
      if (isTouch && isCoarse && viewportWidth >= 1100 && viewportHeight >= 650) {
        mode = LayoutMode.SMARTBOARD;
      } else if (!isTouch && hasHover) {
        mode = LayoutMode.DESKTOP;
      } else {
        mode = LayoutMode.SMARTBOARD; // Fallback for large touch screens
      }
    }

    // Calculate UI scale based on 1280x720 baseline
    let uiScale = 1.0;
    if (mode === LayoutMode.SMARTBOARD || mode === LayoutMode.DESKTOP) {
      // Scale linearly between 1280 and 3840, up to max 1.25
      const widthRatio = viewportWidth / 1280;
      // Let's cap the scale to prevent massive icons at 4k
      uiScale = Math.min(1.25, Math.max(1.0, widthRatio * 0.4 + 0.6));
    } else if (mode === LayoutMode.MOBILE) {
      uiScale = 0.85; // Slightly smaller base for mobile
    }

    // Attempt to calculate safe areas
    // CSS variables safe-area-inset-* are handled purely in CSS natively using env(),
    // but we can provide minimum margins here.
    const safeArea = {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8
    };

    return {
      mode,
      orientation,
      uiScale,
      viewportWidth,
      viewportHeight,
      safeArea
    };
  }

  private applyCssVariables(state: ResponsiveState) {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', state.uiScale.toString());
    root.style.setProperty('--layout-mode', `"${state.mode}"`);
  }
}
