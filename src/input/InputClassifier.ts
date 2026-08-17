import type { InputSettings } from './InputSettings';
import { PalmDetector } from './PalmDetector';
import type { InputClassification, PointerState } from './PointerState';

export class InputClassifier {
  constructor(private readonly palmDetector = new PalmDetector()) {}

  public classify(pointer: PointerState, settings: InputSettings, activePointers: PointerState[]): InputClassification {
    if (pointer.pointerType === 'pen') return 'STYLUS';
    if (pointer.pointerType === 'mouse') return 'MOUSE';
    if (pointer.pointerType !== 'touch') return 'UNKNOWN';
    return this.palmDetector.classify(pointer, settings, {
      stylusActive: activePointers.some((item) => item.pointerType === 'pen' && item.isActive),
    });
  }
}
