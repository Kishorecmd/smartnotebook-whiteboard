import React from 'react';
import { TeachingToolObject, Point, BoundingBox } from '../types';

export type ToolCategory = 'MATHEMATICS' | 'SCIENCE' | 'CLASSROOM' | 'PRESENTATION';
export type ToolType = 'canvas-object' | 'overlay-ui' | 'pointer-tool' | 'background';

export interface ITeachingToolDef {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  category: ToolCategory;
  type: ToolType;
  description: string;
  
  // For overlay-ui tools
  component?: React.ComponentType<any>;
  
  // For pointer-tool tools
  onActivate?: (engine: any) => void;
  
  // For canvas-object tools
  objectFactory?: (center: Point) => TeachingToolObject;
  renderer?: (ctx: CanvasRenderingContext2D, obj: TeachingToolObject, zoom: number) => void;
  hitTest?: (obj: TeachingToolObject, point: Point, zoom: number) => boolean | string; // returns true or handle ID
  getBoundingBox?: (obj: TeachingToolObject) => BoundingBox;
}
