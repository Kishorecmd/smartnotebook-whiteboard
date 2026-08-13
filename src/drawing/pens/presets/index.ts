export * from './quickPens';
export * from './morePens';

import { QUICK_PENS } from './quickPens';
import { MORE_PENS } from './morePens';
import { PenPreset } from '../PenPreset';

/** Registration order, which is also the order shown in the selector. */
export const BUILT_IN_PENS: PenPreset[] = [...QUICK_PENS, ...MORE_PENS];
