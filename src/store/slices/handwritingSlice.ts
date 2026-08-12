import { FreehandStroke } from '../../types';
import { HandwritingRecognitionService } from '../../services/HandwritingRecognitionService';
import { AzureInkRecognitionService } from '../../services/AzureInkRecognitionService';
import type { HandwritingSlice, RecognitionEngine, SliceCreator } from '../types';

const ENGINE_KEY = 'jhw_recognition_engine';

const loadEngine = (): RecognitionEngine => {
  try {
    return localStorage.getItem(ENGINE_KEY) === 'azure' ? 'azure' : 'tesseract';
  } catch {
    return 'tesseract';
  }
};

export const createHandwritingSlice: SliceCreator<HandwritingSlice> = (set, get) => ({
  isHandwritingModalOpen: false,
  isRecognizingHandwriting: false,
  handwritingProgress: 0,
  handwritingStatus: '',
  handwritingResult: null,
  recognitionEngine: loadEngine(),
  azureCredentials: AzureInkRecognitionService.loadCredentials(),
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

  setAzureCredentials: (azureCredentials) => {
    AzureInkRecognitionService.saveCredentials(azureCredentials);
    set({ azureCredentials });
  },

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
      recognitionError: null,
    });

    const onProgress = (progress: number, status: string) =>
      set({ handwritingProgress: progress, handwritingStatus: status });

    const runTesseract = () =>
      HandwritingRecognitionService.recognizeStrokes(selectedStrokes, onProgress);

    try {
      let result = null;
      const useAzure = get().recognitionEngine === 'azure';

      if (useAzure) {
        try {
          result = await AzureInkRecognitionService.recognizeStrokes(selectedStrokes, onProgress);
        } catch (azureErr) {
          // Cloud recognition is best-effort: fall back to the offline engine so a
          // bad key or a dropped connection still yields something usable.
          const message = azureErr instanceof Error ? azureErr.message : String(azureErr);
          console.warn('Azure recognition failed, falling back to offline engine:', message);
          set({ recognitionError: `${message} Fell back to offline recognition.` });
          result = await runTesseract();
        }
      } else {
        result = await runTesseract();
      }

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
