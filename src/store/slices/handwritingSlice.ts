import { FreehandStroke } from '../../types';
import { HandwritingRecognitionService } from '../../services/HandwritingRecognitionService';
import { TrOCRRecognitionService } from '../../services/TrOCRRecognitionService';
import type { HandwritingSlice, RecognitionEngine, SliceCreator } from '../types';

const ENGINE_KEY = 'jhw_recognition_engine';

const loadEngine = (): RecognitionEngine => {
  try {
    return localStorage.getItem(ENGINE_KEY) === 'tesseract' ? 'tesseract' : 'trocr';
  } catch {
    return 'trocr';
  }
};

export const createHandwritingSlice: SliceCreator<HandwritingSlice> = (set, get) => ({
  isHandwritingModalOpen: false,
  isRecognizingHandwriting: false,
  handwritingProgress: 0,
  handwritingStatus: '',
  handwritingResult: null,
  recognitionEngine: loadEngine(),
  recognitionError: null,

  setHandwritingModalOpen: (isHandwritingModalOpen) => set({ isHandwritingModalOpen }),

  setRecognitionEngine: (recognitionEngine) => {
    try {
      localStorage.setItem(ENGINE_KEY, recognitionEngine);
    } catch {
      // best effort
    }
    set({ recognitionEngine });
  },

  recognizeHandwritingForSelected: async () => {
    const { engine } = get();
    if (!engine) return;

    // The engine is the source of truth for selection and objects. Reading the
    // Zustand document/selection here can race the selection callback when the
    // keyboard shortcut is pressed immediately after selecting ink.
    const selectedStrokes = engine
      .getSelectedObjects()
      .filter((obj): obj is FreehandStroke => obj.type === 'stroke');

    if (selectedStrokes.length === 0) {
      get().showToast('Select one or more handwriting strokes before converting to text.');
      return;
    }

    set({
      isHandwritingModalOpen: true,
      isRecognizingHandwriting: true,
      handwritingProgress: 10,
      handwritingStatus: 'Initializing handwriting recognition...',
      handwritingResult: null,
      recognitionError: null,
    });

    const onProgress = (progress: number, status: string) =>
      set({ handwritingProgress: progress, handwritingStatus: status });

    try {
      const useTesseract = get().recognitionEngine === 'tesseract';
      const result = useTesseract
        ? await HandwritingRecognitionService.recognizeStrokes(selectedStrokes, onProgress)
        : await TrOCRRecognitionService.recognizeStrokes(selectedStrokes, onProgress);

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
        recognitionError: err instanceof Error ? err.message : 'Recognition failed.',
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
