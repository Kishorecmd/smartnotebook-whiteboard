import { FreehandStroke } from '../../types';
import { HandwritingRecognitionService } from '../../services/HandwritingRecognitionService';
import type { HandwritingSlice, SliceCreator } from '../types';

export const createHandwritingSlice: SliceCreator<HandwritingSlice> = (set, get) => ({
  isHandwritingModalOpen: false,
  isRecognizingHandwriting: false,
  handwritingProgress: 0,
  handwritingStatus: '',
  handwritingResult: null,

  setHandwritingModalOpen: (isHandwritingModalOpen) => set({ isHandwritingModalOpen }),

  recognizeHandwritingForSelected: async () => {
    const { document, activePageIndex, selectedIds, engine } = get();
    if (!engine) return;

    const page = document.pages[activePageIndex];
    if (!page) return;

    const selectedStrokes = page.objects.filter(
      (obj): obj is FreehandStroke => obj.type === 'stroke' && selectedIds.includes(obj.id)
    );

    if (selectedStrokes.length === 0) return;

    set({
      isHandwritingModalOpen: true,
      isRecognizingHandwriting: true,
      handwritingProgress: 10,
      handwritingStatus: 'Initializing handwriting recognition...',
      handwritingResult: null,
    });

    try {
      const result = await HandwritingRecognitionService.recognizeStrokes(
        selectedStrokes,
        (progress, status) => {
          set({
            handwritingProgress: progress,
            handwritingStatus: status,
          });
        }
      );

      if (result) {
        set({
          isRecognizingHandwriting: false,
          handwritingResult: result,
          handwritingProgress: 100,
          handwritingStatus: 'Recognition complete!',
        });
      } else {
        set({
          isRecognizingHandwriting: false,
          isHandwritingModalOpen: false,
        });
      }
    } catch (err) {
      console.error('Handwriting recognition failed:', err);
      set({
        isRecognizingHandwriting: false,
        handwritingStatus: 'Recognition error. Please try again.',
      });
    }
  },

  applyHandwritingRecognition: (params) => {
    const { handwritingResult, engine } = get();
    if (!engine || !handwritingResult) return;

    engine.convertStrokesToText({
      strokeIds: handwritingResult.strokeIds,
      text: params.text,
      fontSize: params.fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      fontStyle: params.fontStyle,
      underline: params.underline,
      textAlign: params.textAlign,
      color: params.color,
      replace: params.replace,
    });

    set({
      isHandwritingModalOpen: false,
      handwritingResult: null,
    });
  },
});
