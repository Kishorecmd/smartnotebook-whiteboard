# Gemini handwriting recognition

Handwriting recognition defaults to Gemini Vision. The browser sends a high-contrast image of only the selected ink to the Node endpoint; the endpoint holds the API key and calls Gemini. The key is never sent to, stored in, or bundled with the browser application.

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` in `.env` on the machine that runs the Node server. Do not use a `VITE_` environment variable for this key.
3. Start the API server with `npm run server`.
4. For local frontend development, start Vite separately with `npm run dev`.

Vite forwards `/api` requests to `http://127.0.0.1:8787`, so the two local processes work together without exposing the API key to the browser.

For production, run `npm run build`, set the environment variables on the server, and run `npm start`. Set `PORT` to the port provided by your host if needed. The Node server serves the built application and the same-origin recognition endpoint.

`gemini-3.6-flash` is the default model. Set `GEMINI_HANDWRITING_MODEL` only if you need to choose a different Gemini vision model. The endpoint also includes an in-memory per-IP rate limit; configure it with `HANDWRITING_RATE_LIMIT_MAX` for your deployment.

Tesseract is retained as a lightweight local fallback for printed or block lettering.
