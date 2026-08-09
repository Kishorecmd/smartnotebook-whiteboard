import { Page } from './whiteboard.types';

export interface JHWDocument {
  version: 1;
  id: string;
  title: string;
  pages: Page[];
  activePageIndex: number;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    author?: string;
    appVersion?: string;
    description?: string;
  };
}

export type WhiteboardDocument = JHWDocument;
export type WhiteboardPage = Page;

export interface DocumentSummary {
  id: string;
  title: string;
  pageCount: number;
  updatedAt: number;
}
