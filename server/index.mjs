import 'dotenv/config';
import { existsSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
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
const assessmentSessions = new Map();
const assessmentSessionTtlMs = 24 * 60 * 60 * 1000;
const allowedOrigins = new Set(
  (process.env.HANDWRITING_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const transcriptionInstructions = `You are a precise handwriting transcription system for a classroom whiteboard.
Read every handwritten word in the image and preserve line breaks where they are clear.
Ignore non-text ink such as boxes, circles, underlines, arrows, scribbles, diagrams, and decorative marks.
Return only the transcription. Do not add a label, quotes, Markdown, explanation, or a confidence score.
If there is no legible writing, return an empty response.`;

app.disable('x-powered-by');
if (process.env.TRUST_PROXY) {
  const value = /^\d+$/.test(process.env.TRUST_PROXY)
    ? Number.parseInt(process.env.TRUST_PROXY, 10)
    : process.env.TRUST_PROXY;
  app.set('trust proxy', value);
}
app.use((request, response, next) => {
  response.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });

  const origin = request.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    response.set({
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    });
  }
  if (request.method === 'OPTIONS') {
    response.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
    return;
  }
  next();
});
app.use(express.json({ limit: '6mb', type: 'application/json' }));

const validImageDataUrl = (value) =>
  typeof value === 'string' &&
  value.length <= 6 * 1024 * 1024 &&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

const rateLimit = (request, response, next) => {
  const now = Date.now();
  const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
  const current = requestsByIp.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + requestWindowMs }
    : current;

  if (bucket.count >= requestLimit) {
    response.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    response.status(429).json({ error: 'Too many handwriting requests. Please try again in a minute.' });
    return;
  }

  bucket.count += 1;
  requestsByIp.set(key, bucket);
  next();
};

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of requestsByIp) {
    if (bucket.resetAt <= now) requestsByIp.delete(key);
  }
}, requestWindowMs);
cleanupTimer.unref();

app.get('/api/health', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json({ ok: true, handwritingConfigured: Boolean(process.env.GEMINI_API_KEY), liveAssessment: true });
});

const cleanText = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const assessmentCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    const bytes = randomBytes(6);
    code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  } while (assessmentSessions.has(code));
  return code;
};

const validateAssessment = (value) => {
  if (!value || typeof value !== 'object') return null;
  const title = cleanText(value.title, 120);
  const kind = value.kind === 'poll' ? 'poll' : value.kind === 'quiz' ? 'quiz' : null;
  if (!title || !kind || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 20) return null;
  const questions = [];
  for (let index = 0; index < value.questions.length; index++) {
    const source = value.questions[index];
    const prompt = cleanText(source?.prompt, 500);
    const type = ['multiple-choice', 'true-false', 'short-answer'].includes(source?.type) ? source.type : null;
    if (!prompt || !type) return null;
    const options = type === 'short-answer' ? [] : Array.isArray(source.options)
      ? source.options.slice(0, 8).map((option, optionIndex) => ({
          id: cleanText(option?.id, 80) || `option-${optionIndex + 1}`,
          text: cleanText(option?.text, 200),
        })).filter((option) => option.text)
      : [];
    if (type !== 'short-answer' && options.length < 2) return null;
    const correctOptionId = cleanText(source.correctOptionId, 80);
    const correctText = cleanText(source.correctText, 300);
    if (kind === 'quiz' && type !== 'short-answer' && !options.some((option) => option.id === correctOptionId)) return null;
    if (kind === 'quiz' && type === 'short-answer' && !correctText) return null;
    questions.push({
      id: cleanText(source.id, 80) || `question-${index + 1}`,
      prompt,
      type,
      options,
      correctOptionId: kind === 'quiz' && type !== 'short-answer' ? correctOptionId : undefined,
      correctText: kind === 'quiz' && type === 'short-answer' ? correctText : undefined,
      points: kind === 'quiz' ? Math.max(1, Math.min(100, Number(source.points) || 1)) : 0,
    });
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) return null;
  return { id: cleanText(value.id, 100) || randomUUID(), title, description: cleanText(value.description, 500), kind, questions };
};

const publicSession = (session) => ({
  code: session.code,
  status: session.status,
  title: session.assessment.title,
  description: session.assessment.description,
  kind: session.assessment.kind,
  questions: session.assessment.questions.map(({ correctOptionId: _option, correctText: _text, ...question }) => question),
  participantCount: session.participants.size,
  responseCount: Array.from(session.responses.values()).reduce((total, answers) => total + answers.size, 0),
  createdAt: session.createdAt,
});

const normaliseAnswer = (value) => cleanText(value, 1000).toLocaleLowerCase().replace(/\s+/g, ' ');
const scoreAnswer = (assessment, question, answer) => {
  if (assessment.kind !== 'quiz') return { correct: null, pointsAwarded: 0 };
  const correct = question.type === 'short-answer'
    ? question.correctText.split('|').some((accepted) => normaliseAnswer(accepted) === normaliseAnswer(answer))
    : question.correctOptionId === answer;
  return { correct, pointsAwarded: correct ? question.points : 0 };
};

const buildAssessmentReport = (session) => {
  const questions = session.assessment.questions.map((question) => {
    const answers = Array.from(session.responses.values()).map((responses) => responses.get(question.id)?.answer).filter(Boolean);
    const optionCounts = new Map(question.options.map((option) => [option.id, 0]));
    const shortCounts = new Map();
    let correctCount = 0;
    for (const answer of answers) {
      if (question.type === 'short-answer') shortCounts.set(answer, (shortCounts.get(answer) || 0) + 1);
      else optionCounts.set(answer, (optionCounts.get(answer) || 0) + 1);
      if (scoreAnswer(session.assessment, question, answer).correct) correctCount += 1;
    }
    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      responseCount: answers.length,
      correctCount: session.assessment.kind === 'quiz' ? correctCount : null,
      accuracy: session.assessment.kind === 'quiz' && answers.length ? Math.round(correctCount / answers.length * 1000) / 10 : null,
      options: question.options.map((option) => ({
        ...option,
        count: optionCounts.get(option.id) || 0,
        percentage: answers.length ? Math.round((optionCounts.get(option.id) || 0) / answers.length * 1000) / 10 : 0,
        isCorrect: session.assessment.kind === 'quiz' && option.id === question.correctOptionId,
      })),
      shortAnswers: Array.from(shortCounts, ([answer, count]) => ({ answer, count })).sort((a, b) => b.count - a.count),
    };
  });
  const maxScore = session.assessment.kind === 'quiz'
    ? session.assessment.questions.reduce((total, question) => total + question.points, 0)
    : 0;
  const participants = Array.from(session.participants.values()).map((participant) => {
    const responses = session.responses.get(participant.id) || new Map();
    let score = 0;
    const answers = session.assessment.questions.flatMap((question) => {
      const response = responses.get(question.id);
      if (!response) return [];
      const scored = scoreAnswer(session.assessment, question, response.answer);
      score += scored.pointsAwarded;
      return [{ questionId: question.id, answer: response.answer, ...scored }];
    });
    return {
      participantId: participant.id,
      name: participant.name,
      answeredCount: responses.size,
      score,
      maxScore,
      percentage: session.assessment.kind === 'quiz' && maxScore ? Math.round(score / maxScore * 1000) / 10 : null,
      answers,
    };
  }).sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || a.name.localeCompare(b.name));
  const scored = participants.map((participant) => participant.percentage).filter((value) => value !== null);
  return {
    id: `report-${session.code}`,
    code: session.code,
    title: session.assessment.title,
    kind: session.assessment.kind,
    status: session.status,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    participantCount: participants.length,
    responseCount: questions.reduce((total, question) => total + question.responseCount, 0),
    averagePercentage: scored.length ? Math.round(scored.reduce((total, value) => total + value, 0) / scored.length * 10) / 10 : null,
    questions,
    participants,
  };
};

app.post('/api/assessment-sessions', (request, response) => {
  const assessment = validateAssessment(request.body?.assessment);
  if (!assessment) {
    response.status(400).json({ error: 'A valid poll or quiz with 1–20 complete questions is required.' });
    return;
  }
  if (assessmentSessions.size >= 500) {
    const oldest = Array.from(assessmentSessions.values()).sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (oldest) assessmentSessions.delete(oldest.code);
  }
  const code = assessmentCode();
  const teacherToken = randomUUID();
  const now = Date.now();
  assessmentSessions.set(code, {
    code, teacherToken, assessment, status: 'active', createdAt: now, updatedAt: now,
    participants: new Map(), responses: new Map(),
  });
  response.status(201).json({ code, teacherToken, joinUrl: `${request.protocol}://${request.get('host')}/?join=${code}` });
});

app.get('/api/assessment-sessions/:code', (request, response) => {
  const session = assessmentSessions.get(request.params.code.toUpperCase());
  if (!session) { response.status(404).json({ error: 'Assessment session not found.' }); return; }
  response.set('Cache-Control', 'no-store');
  response.json(publicSession(session));
});

app.post('/api/assessment-sessions/:code/join', (request, response) => {
  const session = assessmentSessions.get(request.params.code.toUpperCase());
  if (!session) { response.status(404).json({ error: 'Assessment session not found.' }); return; }
  if (session.status !== 'active') { response.status(409).json({ error: 'This assessment has ended.' }); return; }
  const name = cleanText(request.body?.name, 80);
  if (!name) { response.status(400).json({ error: 'Enter your name to join.' }); return; }
  if (session.participants.size >= 500) { response.status(409).json({ error: 'This session is full.' }); return; }
  const participant = { id: randomUUID(), token: randomUUID(), name, joinedAt: Date.now() };
  session.participants.set(participant.id, participant);
  session.responses.set(participant.id, new Map());
  session.updatedAt = Date.now();
  response.status(201).json({ participantId: participant.id, participantToken: participant.token, name });
});

app.post('/api/assessment-sessions/:code/responses', (request, response) => {
  const session = assessmentSessions.get(request.params.code.toUpperCase());
  if (!session) { response.status(404).json({ error: 'Assessment session not found.' }); return; }
  if (session.status !== 'active') { response.status(409).json({ error: 'This assessment has ended.' }); return; }
  const participant = session.participants.get(cleanText(request.body?.participantId, 80));
  if (!participant || participant.token !== request.body?.participantToken) { response.status(403).json({ error: 'Join this session before responding.' }); return; }
  const question = session.assessment.questions.find((item) => item.id === request.body?.questionId);
  const answer = cleanText(request.body?.answer, 1000);
  if (!question || !answer || question.type !== 'short-answer' && !question.options.some((option) => option.id === answer)) {
    response.status(400).json({ error: 'A valid answer is required.' });
    return;
  }
  session.responses.get(participant.id).set(question.id, { answer, submittedAt: Date.now() });
  session.updatedAt = Date.now();
  response.json({ ok: true });
});

app.get('/api/assessment-sessions/:code/results', (request, response) => {
  const session = assessmentSessions.get(request.params.code.toUpperCase());
  if (!session) { response.status(404).json({ error: 'Assessment session not found.' }); return; }
  if (request.get('x-teacher-token') !== session.teacherToken) { response.status(403).json({ error: 'Teacher access is required.' }); return; }
  response.set('Cache-Control', 'no-store');
  response.json(buildAssessmentReport(session));
});

app.patch('/api/assessment-sessions/:code', (request, response) => {
  const session = assessmentSessions.get(request.params.code.toUpperCase());
  if (!session) { response.status(404).json({ error: 'Assessment session not found.' }); return; }
  if (request.get('x-teacher-token') !== session.teacherToken) { response.status(403).json({ error: 'Teacher access is required.' }); return; }
  if (request.body?.status !== 'ended') { response.status(400).json({ error: 'Only ending a live session is supported.' }); return; }
  session.status = 'ended';
  session.endedAt = Date.now();
  session.updatedAt = session.endedAt;
  response.json(buildAssessmentReport(session));
});

const assessmentCleanupTimer = setInterval(() => {
  const cutoff = Date.now() - assessmentSessionTtlMs;
  for (const [code, session] of assessmentSessions) {
    if (session.updatedAt < cutoff) assessmentSessions.delete(code);
  }
}, 60 * 60 * 1000);
assessmentCleanupTimer.unref();

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
