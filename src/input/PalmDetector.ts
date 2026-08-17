import type { InputSettings } from './InputSettings';
import { getPalmThreshold } from './InputSettings';
import type { InputClassification, PointerState } from './PointerState';

export interface PalmContext {
  stylusActive: boolean;
}

/** Browser palm flags are inconsistent, so contact geometry starts a candidate and movement confirms intent. */
export class PalmDetector {
  public classify(pointer: PointerState, settings: InputSettings, context: PalmContext): InputClassification {
    if (pointer.pointerType !== 'touch' || settings.palmSensitivity === 'off') return 'FINGER';
    const contact = Math.max(pointer.width, pointer.height);
    const minorContact = Math.min(pointer.width, pointer.height);
    const contactArea = Math.max(1, pointer.width) * Math.max(1, pointer.height);
    const threshold = getPalmThreshold(settings) - (context.stylusActive ? 4 : 0);
    const broadPalm = contact >= threshold * 0.7
      && minorContact >= threshold * 0.5
      && contactArea >= threshold * threshold * 0.4;
    const sidePalm = contact >= threshold * 0.75
      && contact / Math.max(1, minorContact) >= 1.6;
    if (contact < threshold && !broadPalm && !sidePalm) return 'FINGER';

    const movement = Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY);
    if (movement >= settings.palmMovementThreshold) return 'PALM_ERASER';
    return context.stylusActive ? 'ACCIDENTAL_PALM' : 'PALM_CANDIDATE';
  }
}
