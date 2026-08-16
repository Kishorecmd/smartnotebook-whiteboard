import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number.parseInt(process.env.PORT ?? '8787', 10);
const model = process.env.GEMINI_HANDWRITING_MODEL ?? 'gemini-3.6-flash';
const requestWindowMs = 60_000;
const requestLimit = Number.parseInt(process.env.HANDWRITING_RATE_LIMIT_MAX ?? '60', 10);
const requestsByIp = new Map();

const transcriptionInstructions = `You are a precise handwriting transcription system for a classroom whiteboard.
Read every handwritten word in the image and preserve line breaks where they are clear.
Ignore non-text ink such as boxes, circles, underlines, arrows, scribbles, diagrams, and decorative marks.
Return only the transcription. Do not add a label, quotes, Markdown, explanation, or a confidence score.
If there is no legible writing, return an empty response.`;

app.disable('x-powered-by');
app.use(express.json({ limit: '6mb', type: 'application/json' }));

const validImageDataUrl = (value) =>
  typeof value === 'string' &&
  value.length <= 6 * 1024 * 1024 &&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

const rateLimit = (request, response, next) => {
  const now = Date.now();
  const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
  const recent = (requestsByIp.get(key) ?? []).filter((time) => now - time < requestWindowMs);

  if (recent.length >= requestLimit) {
    response.status(429).json({ error: 'Too many handwriting requests. Please try again in a minute.' });
    return;
  }

  recent.push(now);
  requestsByIp.set(key, recent);
  next();
};

app.post('/api/handwriting-recognition', rateLimit, async (request, response) => {
  const { imageDataUrl } = request.body ?? {};

  if (!validImageDataUrl(imageDataUrl)) {
    response.status(400).json({ error: 'A PNG, JPEG, or WebP handwriting image is required.' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    response.status(503).json({
      error: 'Gemini handwriting recognition is not configured. Add GEMINI_API_KEY to the server environment.',
    });
    return;
  }

  try {
    const [dataUrlHeader, imageData] = imageDataUrl.split(',', 2);
    const mimeType = dataUrlHeader.slice(5, dataUrlHeader.indexOf(';'));
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await client.models.generateContent({
      model,
      contents: [
        {
          text: transcriptionInstructions,
        },
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
      ],
      config: { maxOutputTokens: 300 },
    });

    const text = result.text?.trim();
    if (!text) {
      response.status(422).json({
        error: 'Gemini could not read text in that selection. Select a single, clear line and try again.',
      });
      return;
    }

    response.set('Cache-Control', 'no-store');
    response.json({ text });
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    console.error('Gemini handwriting recognition failed:', status ?? error);

    response.status(status === 401 || status === 403 ? 503 : 502).json({
      error:
        status === 401 || status === 403
          ? 'Gemini handwriting recognition is not configured correctly on the server.'
          : 'Gemini handwriting recognition is temporarily unavailable. Please try again.',
    });
  }
});

const distDirectory = path.resolve(__dirname, '..', 'dist');
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory, { index: false }));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) {
      next();
      return;
    }
    response.sendFile(path.join(distDirectory, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`SmartNotebook server listening on http://localhost:${port}`);
});
