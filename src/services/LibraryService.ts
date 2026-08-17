import {
  LessonTemplate,
  LessonTemplateCategory,
  Page,
  Point,
  ReusableContentItem,
  WhiteboardDocument,
  WhiteboardObject,
} from '../types';
import type { MediaAssetRecord } from '../media/MediaTypes';
import { createDefaultDocument, createPageObject, createTextObject } from '../models';
import { generateId } from '../utils';

function copy<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function shiftObject(object: WhiteboardObject, dx: number, dy: number): WhiteboardObject {
  const shifted: any = { ...copy(object), x: object.x + dx, y: object.y + dy };
  if ('points' in shifted && Array.isArray(shifted.points)) {
    shifted.points = shifted.points.map((point: Point) => ({
      ...point,
      x: point.x + dx,
      y: point.y + dy,
    }));
  }
  if (typeof shifted.centerX === 'number') shifted.centerX += dx;
  if (typeof shifted.centerY === 'number') shifted.centerY += dy;
  return shifted as WhiteboardObject;
}

export function cloneLibraryObjects(
  objects: WhiteboardObject[],
  dx = 0,
  dy = 0,
  startingZIndex?: number
): WhiteboardObject[] {
  const idMap = new Map(objects.map((object) => [object.id, generateId(object.type)]));
  const now = Date.now();
  return objects.map((object, index) => {
    const shifted: any = shiftObject(object, dx, dy);
    shifted.id = idMap.get(object.id)!;
    shifted.createdAt = now;
    shifted.updatedAt = now;
    if (startingZIndex !== undefined) shifted.zIndex = startingZIndex + index;
    if (shifted.parentGroupId) shifted.parentGroupId = idMap.get(shifted.parentGroupId);
    if (shifted.type === 'group') {
      shifted.children = shifted.children
        .map((id: string) => idMap.get(id))
        .filter((id: string | undefined): id is string => Boolean(id));
    }
    return shifted as WhiteboardObject;
  });
}

function contentBounds(objects: WhiteboardObject[]) {
  const minX = Math.min(...objects.map((object) => object.x));
  const minY = Math.min(...objects.map((object) => object.y));
  const maxX = Math.max(...objects.map((object) => object.x + object.width));
  const maxY = Math.max(...objects.map((object) => object.y + object.height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function templatePage(
  title: string,
  prompt: string,
  background = '#ffffff',
  backgroundType: Page['backgroundType'] = 'plain'
): Page {
  const page = createPageObject({ title, background, backgroundType });
  page.objects = [
    createTextObject({
      text: title,
      x: 72,
      y: 56,
      width: 820,
      height: 72,
      fontSize: 38,
      fontFamily: 'Sans-Serif',
      fontWeight: 'bold',
      color: background === '#0f172a' ? '#f8fafc' : '#1e293b',
      zIndex: 0,
    }),
    createTextObject({
      text: prompt,
      x: 76,
      y: 150,
      width: 760,
      height: 100,
      fontSize: 22,
      fontFamily: 'Sans-Serif',
      color: background === '#0f172a' ? '#cbd5e1' : '#475569',
      zIndex: 1,
    }),
  ];
  return page;
}

function builtInTemplate(
  id: string,
  title: string,
  description: string,
  category: LessonTemplateCategory,
  tags: string[],
  pages: Page[]
): LessonTemplate {
  return { id, title, description, category, tags, pages, builtIn: true, createdAt: 0, updatedAt: 0 };
}

export class LibraryService {
  public static getBuiltInTemplates(): LessonTemplate[] {
    return [
      builtInTemplate(
        'builtin_blank',
        'Blank Lesson',
        'A clean whiteboard ready for any subject.',
        'general',
        ['blank', 'general', 'lesson'],
        [createPageObject({ title: 'Page 1' })]
      ),
      builtInTemplate(
        'builtin_gradual_release',
        'Warm-up · Teach · Practise · Exit',
        'A complete four-stage lesson sequence.',
        'general',
        ['warm-up', 'practice', 'exit ticket', 'instruction'],
        [
          templatePage('Warm-up', 'What do learners already know? Add a short retrieval task.'),
          templatePage('Teach', 'Model the key idea, worked example, or demonstration.'),
          templatePage('Guided Practice', 'Solve together. Capture strategies and misconceptions.'),
          templatePage('Exit Ticket', 'Add one question that shows whether the objective was met.'),
        ]
      ),
      builtInTemplate(
        'builtin_math',
        'Mathematics Workshop',
        'Grid-based pages for modelling, guided work, and independent practice.',
        'mathematics',
        ['math', 'grid', 'worked example', 'practice'],
        [
          templatePage('Worked Example', 'Show each step and annotate the reasoning.', '#ffffff', 'grid'),
          templatePage('Try Together', 'Invite multiple solution strategies.', '#ffffff', 'grid'),
          templatePage('Independent Practice', 'Add differentiated questions or challenges.', '#ffffff', 'grid'),
        ]
      ),
      builtInTemplate(
        'builtin_vocabulary',
        'Vocabulary Lesson',
        'Introduce, explore, and assess important words.',
        'language',
        ['vocabulary', 'language', 'definitions', 'examples'],
        [
          templatePage('New Words', 'Add each word, a student-friendly meaning, and pronunciation.'),
          templatePage('Examples and Images', 'Connect each word to a picture, sentence, or non-example.'),
          templatePage('Use the Words', 'Ask learners to explain, sort, or use the words in context.'),
        ]
      ),
      builtInTemplate(
        'builtin_investigation',
        'Science Investigation',
        'Structure an enquiry from question to conclusion.',
        'science',
        ['science', 'investigation', 'hypothesis', 'results'],
        [
          templatePage('Question', 'What are we investigating?'),
          templatePage('Prediction', 'What do we think will happen, and why?'),
          templatePage('Method', 'List equipment, variables, and safe steps.'),
          templatePage('Results', 'Record observations, measurements, tables, or graphs.', '#ffffff', 'grid'),
          templatePage('Conclusion', 'What do the results show? Was the prediction supported?'),
        ]
      ),
      builtInTemplate(
        'builtin_exit_ticket',
        'Exit Ticket',
        'A focused one-page formative assessment.',
        'assessment',
        ['assessment', 'reflection', 'exit ticket'],
        [templatePage('Exit Ticket', '1. What did you learn?\n2. Show one example.\n3. What is still unclear?', '#0f172a', 'chalkboard')]
      ),
    ];
  }

  public static createTemplateFromDocument(
    document: WhiteboardDocument,
    title: string,
    description: string,
    category: LessonTemplateCategory,
    tags: string[]
  ): LessonTemplate {
    const now = Date.now();
    return {
      id: generateId('template'),
      title: title.trim() || document.title,
      description: description.trim(),
      category,
      tags: tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      pages: copy(document.pages),
      builtIn: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  public static createDocumentFromTemplate(template: LessonTemplate): WhiteboardDocument {
    const document = createDefaultDocument(template.title);
    document.pages = template.pages.map((page, index) => ({
      ...copy(page),
      id: generateId('page'),
      name: page.title || page.name || `Page ${index + 1}`,
      title: page.title || page.name || `Page ${index + 1}`,
      objects: cloneLibraryObjects(page.objects),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    document.activePageIndex = 0;
    document.updatedAt = Date.now();
    return document;
  }

  public static createReusableContent(
    title: string,
    description: string,
    tags: string[],
    selectedIds: string[],
    pageObjects: WhiteboardObject[]
  ): ReusableContentItem {
    const selected = new Set(selectedIds);
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const object of pageObjects) {
        if (object.type !== 'group' || !selected.has(object.id)) continue;
        for (const childId of object.children) {
          if (!selected.has(childId)) {
            selected.add(childId);
            expanded = true;
          }
        }
      }
    }
    const objects = pageObjects.filter((object) => selected.has(object.id));
    if (objects.length === 0) throw new Error('Select at least one object to save.');
    const bounds = contentBounds(objects);
    const now = Date.now();
    return {
      id: generateId('content'),
      title: title.trim() || 'Reusable content',
      description: description.trim(),
      tags: tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      objects: cloneLibraryObjects(objects, -bounds.minX, -bounds.minY),
      createdAt: now,
      updatedAt: now,
    };
  }

  public static objectsForInsertion(
    item: ReusableContentItem,
    center: Point,
    startingZIndex: number
  ): WhiteboardObject[] {
    const bounds = contentBounds(item.objects);
    return cloneLibraryObjects(
      item.objects,
      center.x - bounds.width / 2 - bounds.minX,
      center.y - bounds.height / 2 - bounds.minY,
      startingZIndex
    );
  }

  public static objectFromMediaAsset(asset: MediaAssetRecord, center: Point): WhiteboardObject {
    const now = Date.now();
    const naturalWidth = asset.naturalWidth || (asset.kind === 'audio' ? 320 : 640);
    const naturalHeight = asset.naturalHeight || (asset.kind === 'audio' ? 96 : 360);
    const scale = Math.min(1, 640 / naturalWidth, 480 / naturalHeight);
    const width = Math.max(120, Math.round(naturalWidth * scale));
    const height = Math.max(80, Math.round(naturalHeight * scale));
    const base = {
      id: generateId(asset.kind), x: center.x - width / 2, y: center.y - height / 2,
      width, height, rotation: 0, zIndex: 0, visible: true, locked: false,
      createdAt: now, updatedAt: now,
    };
    if (asset.kind === 'image') {
      return { ...base, type: 'image', assetId: asset.id, mimeType: asset.mimeType,
        originalWidth: naturalWidth, originalHeight: naturalHeight };
    }
    if (asset.kind === 'video') {
      return { ...base, type: 'video', mediaId: asset.id, mimeType: asset.mimeType,
        posterDataUrl: asset.thumbnailDataUrl || '', durationSeconds: asset.durationSeconds || 0,
        fileName: asset.fileName, muted: false, loop: false };
    }
    if (asset.kind === 'audio') {
      return { ...base, type: 'audio', mediaId: asset.id, mimeType: asset.mimeType,
        title: asset.fileName || 'Audio', durationSeconds: asset.durationSeconds || 0,
        fileName: asset.fileName, muted: false, loop: false, volume: 1, playbackRate: 1,
        autoplay: false, showVisualizer: false };
    }
    if (asset.kind === 'pdf') {
      return { ...base, type: 'pdf', assetId: asset.id, fileName: asset.fileName,
        pageCount: asset.pageCount || 1, currentPage: 1, posterDataUrl: asset.thumbnailDataUrl,
        pageWidth: naturalWidth, pageHeight: naturalHeight, pageRotation: 0, fitMode: 'fit' };
    }
    throw new Error('This asset type cannot be placed on the canvas.');
  }
}
