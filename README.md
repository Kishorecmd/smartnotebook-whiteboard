# Jaihind SmartNotebook

An interactive classroom whiteboard built with React, TypeScript, Canvas, Zustand and IndexedDB. It supports multi-page lessons, drawing and text tools, images, PDFs, audio/video, image-plus-audio objects, YouTube/web embeds, teaching tools, portable `.jhw` files and Gemini handwriting recognition.

## Requirements

- Node.js 22 or newer
- npm
- A Gemini API key for cloud handwriting recognition

## Local development

```bash
npm install
copy .env.example .env
npm run server
npm run dev
```

Set `GEMINI_API_KEY` in `.env`. Vite runs the frontend on port 3000 and proxies `/api` to the Express server on port 8787.

Useful checks:

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## Production deployment

This is not a static-only application when Gemini recognition is enabled. Build the frontend and run the Express server:

```bash
npm ci
npm run build
npm start
```

The Node process serves both `dist/` and `/api/handwriting-recognition`. Configure `PORT` and `GEMINI_API_KEY` in the hosting environment. The health check is available at `/api/health`.

If the frontend and API are hosted separately, build the frontend with `VITE_HANDWRITING_API_BASE_URL=https://your-api-host.example`. Set `HANDWRITING_ALLOWED_ORIGINS` on the API server to the comma-separated frontend origins.

A Hostinger static-file deployment by itself will return 404 for handwriting requests. Use a Hostinger Node application or another Node host and point the frontend at it. For a reverse proxy, preserve the client IP and set `TRUST_PROXY` appropriately so per-IP rate limiting works.

## Android

For a packaged Android app, set `VITE_HANDWRITING_API_BASE_URL` to the public HTTPS API before building, include `capacitor://localhost` in `HANDWRITING_ALLOWED_ORIGINS`, then run:

```bash
npm run build
npx cap sync android
```

## Storage and files

- Documents, autosave data and media are stored locally in IndexedDB.
- Local saves do not synchronize between devices.
- `.jhw` export packages referenced media bytes so the file can be moved to another device.
- Unreferenced media is reclaimed when document history is cleared or on startup.
- PNG/JPEG and print export render static representations of media objects; live web/video behavior is not preserved in a flat image.

## Handwriting privacy

Gemini recognition sends an image of only the selected ink to the configured Node server and Google Gemini. The Gemini key stays on the server. Do not put it in a `VITE_*` variable. Tesseract is available as a browser-local fallback for printed or block lettering.

Rotate any API key that has been pasted into chat, source control, screenshots or client-side configuration.

## Main structure

- `src/canvas` – rendering and coordinate transforms
- `src/engine` – tools, commands, undo/redo and hit testing
- `src/store` – Zustand application slices
- `src/services` – storage, import/export and handwriting clients
- `src/media` – audio, video and PDF support
- `src/teaching-tools` – classroom overlays and instruments
- `server` – Express/Gemini backend
- `android` – Capacitor Android wrapper

CI runs tests, lint, production build and the production dependency audit.
