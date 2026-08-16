import { pipeline, type ProgressInfo } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/trocr-small-handwritten';

type TrOCRPipeline = Awaited<ReturnType<typeof pipeline<'image-to-text'>>>;

interface RecognitionRequest {
  type: 'recognize';
  requestId: number;
  imageDataUrl: string;
}

let recognizerPromise: Promise<TrOCRPipeline> | null = null;

const sendProgress = (requestId: number, info: ProgressInfo): void => {
  if (info.status === 'progress' || info.status === 'progress_total') {
    self.postMessage({
      type: 'progress',
      requestId,
      progress: Math.max(5, Math.min(85, Math.round(5 + info.progress * 0.8))),
      status: 'Downloading handwriting model…',
    });
  } else if (info.status === 'ready') {
    self.postMessage({
      type: 'progress',
      requestId,
      progress: 85,
      status: 'Preparing handwriting model…',
    });
  }
};

const getRecognizer = (requestId: number): Promise<TrOCRPipeline> => {
  if (!recognizerPromise) {
    recognizerPromise = pipeline('image-to-text', MODEL_ID, {
      progress_callback: (info) => sendProgress(requestId, info),
    });
  }
  return recognizerPromise;
};

self.addEventListener('message', async (event: MessageEvent<RecognitionRequest>) => {
  const { type, requestId, imageDataUrl } = event.data;
  if (type !== 'recognize') return;

  try {
    const recognizer = await getRecognizer(requestId);
    self.postMessage({
      type: 'progress',
      requestId,
      progress: 90,
      status: 'Reading handwriting on this device…',
    });

    const output = await recognizer(imageDataUrl, {
      max_new_tokens: 128,
      num_beams: 4,
    });
    const text = output[0]?.generated_text?.trim() || '';

    self.postMessage({ type: 'result', requestId, text });
  } catch (error) {
    // A model download can fail halfway through. Allow the next action to make a
    // clean attempt instead of retaining a rejected initialization promise.
    recognizerPromise = null;
    self.postMessage({
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : 'Could not load the handwriting model.',
    });
  }
});
