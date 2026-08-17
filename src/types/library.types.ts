import type { Page, WhiteboardObject } from './whiteboard.types';

export type LessonTemplateCategory =
  | 'general'
  | 'language'
  | 'mathematics'
  | 'science'
  | 'assessment';

export interface LessonTemplate {
  id: string;
  title: string;
  description: string;
  category: LessonTemplateCategory;
  tags: string[];
  pages: Page[];
  builtIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ReusableContentItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  objects: WhiteboardObject[];
  createdAt: number;
  updatedAt: number;
}
