export * from './types';
export * from './TeachingToolRegistry';
export * from './TeachingToolsPanel';
export * from './components/TeachingToolsOverlay';

export * from './timer/Timer';
export * from './random-picker/RandomPicker';
export * from './compass/CompassTool';
export * from './clock/ClockTool';
export * from './dice/DiceTool';
export * from './traffic-light/TrafficLightTool';
export * from './sticky-note/StickyNoteBoardTool';
export * from './periodic-table/PeriodicTableTool';
export * from './screen-shade/ScreenShadeTool';
export * from './color-picker/ColorPickerTool';
export * from './fraction-tool/FractionTool';
export * from './geometry-shapes/GeometryShapesTool';

import { registerCoreTeachingTools } from './core-tools';
import { registerCalculator } from './calculator/Calculator';
import { registerTimer } from './timer/Timer';
import { registerRandomPicker } from './random-picker/RandomPicker';
import { registerBackgroundTools } from './backgrounds';
import { registerRulerTool } from './ruler/RulerTool';
import { registerProtractorTool } from './protractor/ProtractorTool';
import { registerNumberLineTool } from './number-line/NumberLineTool';
import { registerCompassTool } from './compass/CompassTool';
import { registerClockTool } from './clock/ClockTool';
import { registerDiceTool } from './dice/DiceTool';
import { registerTrafficLightTool } from './traffic-light/TrafficLightTool';
import { registerStickyNoteTool } from './sticky-note/StickyNoteBoardTool';
import { registerPeriodicTableTool } from './periodic-table/PeriodicTableTool';
import { registerScreenShadeTool } from './screen-shade/ScreenShadeTool';
import { registerColorPickerTool } from './color-picker/ColorPickerTool';
import { registerFractionTool } from './fraction-tool/FractionTool';
import { registerGeometryShapesTool } from './geometry-shapes/GeometryShapesTool';

let initialized = false;
export function initializeTeachingTools() {
  if (initialized) return;
  initialized = true;
  
  registerCoreTeachingTools();
  registerCalculator();
  registerTimer();
  registerRandomPicker();
  registerBackgroundTools();
  registerRulerTool();
  registerProtractorTool();
  registerNumberLineTool();
  registerCompassTool();
  registerClockTool();
  registerDiceTool();
  registerTrafficLightTool();
  registerStickyNoteTool();
  registerPeriodicTableTool();
  registerScreenShadeTool();
  registerColorPickerTool();
  registerFractionTool();
  registerGeometryShapesTool();
}
