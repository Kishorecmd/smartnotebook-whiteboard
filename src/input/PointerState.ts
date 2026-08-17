

export type PointerType = 'mouse' | 'pen' | 'touch';
export type InputClassification =
  | 'STYLUS'
  | 'FINGER'
  | 'PALM_CANDIDATE'
  | 'PALM_ERASER'
  | 'ACCIDENTAL_PALM'
  | 'MOUSE'
  | 'UNKNOWN';

export type PointerAction =
  | 'DRAW'
  | 'ERASE'
  | 'SELECT'
  | 'PAN_ZOOM'
  | 'OBJECT_TRANSFORM'
  | 'CONTEXT_MENU'
  | 'IGNORE'
  | 'MOUSE_TOOL';

export interface InputSample {
  pointerId: number;
  pointerType: PointerType;
  isPrimary: boolean;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  pressure: number;
  width: number;
  height: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  buttons: number;
  timestamp: number;
}

export interface PointerState extends InputSample {
  
  // Current position (Screen Coordinates)
  x: number;
  y: number;
  
  // Previous position (Screen Coordinates)
  previousX: number;
  previousY: number;
  
  // Gesture start position (Screen Coordinates)
  startX: number;
  startY: number;
  
  classification: InputClassification;
  action: PointerAction;
  
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
    width: e.width || 1,
    height: e.height || 1,
    tiltX: e.tiltX || 0,
    tiltY: e.tiltY || 0,
    twist: e.twist || 0,
    buttons: e.buttons,
    timestamp: e.timeStamp || Date.now(),
    target: e.target,
    isPrimary: e.isPrimary,
    hasMovedSignificantly: false,
    isActive: true,
    classification: 'UNKNOWN',
    action: 'IGNORE',
  };
}
