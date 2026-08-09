

export type PointerType = 'mouse' | 'pen' | 'touch';

export interface PointerState {
  pointerId: number;
  pointerType: PointerType;
  
  // Current position (Screen Coordinates)
  x: number;
  y: number;
  
  // Previous position (Screen Coordinates)
  previousX: number;
  previousY: number;
  
  // Gesture start position (Screen Coordinates)
  startX: number;
  startY: number;
  
  pressure: number;
  buttons: number;
  timestamp: number;
  
  target: EventTarget | null;
  isPrimary: boolean;
  
  // Custom states for tracking
  hasMovedSignificantly: boolean;
  isActive: boolean;
}

export function createPointerState(e: PointerEvent, screenX: number, screenY: number): PointerState {
  let pressure = 0.5; // Default for mouse/touch
  if (e.pointerType === 'pen' && e.pressure > 0) {
    pressure = e.pressure;
  } else if (e.pointerType === 'touch' && e.pressure > 0) {
    // Some touch devices report pressure, use it or default it
    pressure = e.pressure;
  }

  return {
    pointerId: e.pointerId,
    pointerType: (e.pointerType as PointerType) || 'mouse',
    x: screenX,
    y: screenY,
    previousX: screenX,
    previousY: screenY,
    startX: screenX,
    startY: screenY,
    pressure,
    buttons: e.buttons,
    timestamp: e.timeStamp || Date.now(),
    target: e.target,
    isPrimary: e.isPrimary,
    hasMovedSignificantly: false,
    isActive: true,
  };
}
