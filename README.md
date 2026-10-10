# Jaihind SmartNotebook

An interactive classroom whiteboard built with React, TypeScript, Canvas, Zustand and IndexedDB. It supports multi-page lessons, drawing and text tools, images, PDFs, audio/video, image-plus-audio objects, YouTube/web embeds, teaching tools, lesson templates, reusable content, a searchable asset library, portable `.jhw` files and Gemini handwriting recognition.

## Live classroom home

The home screen follows [docs/SMART_CLASSROOM_SPEC.md](docs/SMART_CLASSROOM_SPEC.md) (phase 1). At 1280×720 it has a 64 px header (class, ERP status with last sync time, weather, clock, Student mode), a 76 px navigation rail (Home, Board, Screens, Attendance, Library, More), and an 84 px quick-tools dock. The content shows today's attendance, the current lesson with time left, the next period, a timetable strip with the current period highlighted, today's learning goal and **Start lesson**, which opens the whiteboard. Larger screens get bigger cards; on phones the cards stack and the rail moves to the bottom.

**Preview the layout** uses clearly labelled fictitious data for KG and Grades 1–4, including attendance, break, holiday and offline states. **Student mode** hides attendance, student lists, teacher notes, teacher-only notices and the rail and dock; it keeps the lesson, timetable, learning goal and public notices. When a teacher is signed in, returning to teacher mode needs their ERP password (Escape opens the same prompt). **More** holds the QR code, website, YouTube, smartboard setup and today's notices.

Open **Classroom → Connect classroom**, sign in with the existing **class teacher ERP account**, then choose the assigned class and section and select **Open my classroom**. **Take attendance** on the attendance card then marks today's register directly in the ERP; saving sends the school's absence alert to families of students newly marked absent. No administrator login is needed. Antigravity's class teacher assignments are checked on the server before reading classroom data. See [docs/CLASSROOM_API.md](docs/CLASSROOM_API.md) for verified routes and missing ERP capabilities. Both ERP and weather require the Node server. Tests use sample records; live ERP sign-in still needs a real class teacher browser check. Preview figures are never live attendance.

## Jaihind LMS lesson whiteboards

Jaihind LMS (lms.jaihind.school) embeds Smartnotebook to build and show lesson content. `/?lms=edit` is the full editor with **Save to LMS**, **My boards** (use a board already saved on this device) and **Library**; `/?lms=view` is a read-only student viewer with page navigation, pointer, pen, marker, eraser and **Reset**. The LMS checks ERP sign-in and course access on its server, then hands the board to the iframe through `postMessage` (contract in `src/lms/bridge.ts`); Smartnotebook holds no LMS credentials and ignores messages from other origins (`VITE_LMS_ORIGINS`). An LMS board autosaves to its own slot and never creates or prunes this device's recovery checkpoints, so a teacher's own boards are untouched. Saved media, boards and the library stay shared.

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

To sign in against a local XAMPP copy of Antigravity instead of the production ERP, also set `CLASSROOM_ERP_BASE_URL=http://localhost/Antigravity/public/index.php` in `.env` (plain HTTP is accepted only for localhost).

Set `GEMINI_API_KEY` in `.env`. Vite runs the frontend on port 3000 and proxies `/api` to the Express server on port 8787.

Useful checks:

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## Production deployment

Class teacher sign-in, live ERP data, weather and Gemini recognition require the Node server. Build the frontend and run the Express server:

```bash
npm ci
npm run build
npm start
```

The Node process serves both `dist/` and the classroom/handwriting APIs. Configure `PORT` and, for handwriting recognition, `GEMINI_API_KEY` in the hosting environment. The health check is available at `/api/health`. A GitHub-to-Hostinger static deployment only updates the interface; classroom login needs a Node application with build command `npm run build` and start command `npm start`, served on the same origin. Keep secrets in the hosting environment, not the repository.

If the frontend and API are hosted separately, build the frontend with `VITE_HANDWRITING_API_BASE_URL=https://your-api-host.example`. Set `HANDWRITING_ALLOWED_ORIGINS` on the API server to the comma-separated frontend origins.

A Hostinger static-file deployment by itself will return 404 for handwriting requests. Use a Hostinger Node application or another Node host and point the frontend at it. For a reverse proxy, preserve the client IP and set `TRUST_PROXY` appropriately so per-IP rate limiting works.

## Classroom sound level

Open **Sound level** from the classroom dock, or **Teaching Tools → Sound Level** on the whiteboard. Set **Max. noise**, optionally enable the bell, then choose **Start microphone**. The meter uses a relative 0–100 scale, not calibrated decibels. Sensitivity can be adjusted for the room and microphone.

An alert requires sustained noise, and another alert only follows a quiet period and a cooldown. Sound is processed on the device; it is not recorded or uploaded. Stopping, closing the monitor, or leaving the page releases the microphone. Classroom screens save the threshold, sensitivity and bell preference, but never automatically restart listening.

Microphone access requires HTTPS (or localhost), browser permission and a hosting policy that permits microphone use. The Node server allows the microphone for the site's own origin only (`microphone=(self)`); embedded pages from other origins cannot use it, and camera and geolocation stay blocked. A static-only host that sends a stricter policy makes the monitor show a hosting-settings message when started.

## Android

For a packaged Android app, set `VITE_HANDWRITING_API_BASE_URL` to the public HTTPS API before building, include `capacitor://localhost` in `HANDWRITING_ALLOWED_ORIGINS`, then run:

```bash
npm run build
npx cap sync android
```

## Storage and files

- While writing, the **Auto-group** control above the toolbar offers **Words** (default), **Sentences**, or **Off**. This preference is saved on the device.
- Automatic grouping joins nearby pen, pencil, brush, and crayon strokes using spacing and pauses; it does not recognize text. Word mode starts a new group after a pause of about 1.8 seconds, sentence mode after about 3.5 seconds. New lines, wider gaps, tool changes, and edits also start a new group. Use Off for free drawing or Ungroup to separate strokes again.
- Each stroke still has its own undo step. Existing handwriting is not regrouped automatically, and groups survive saving and reopening a board.

- Documents, serialized autosaves, recovery checkpoints and media are stored locally in IndexedDB.
- Version History keeps up to 30 checkpoints per board, including up to 15 periodic automatic recovery points. Manual saves, explicit checkpoints and pre-restore safety points are retained preferentially.
- Restoring a version first captures the current board, then loads the selected checkpoint as an unsaved change so the user can review it before saving.
- If the primary autosave is missing or corrupt, startup falls back to the newest valid recovery checkpoint.
- Local saves do not synchronize between devices.
- Checkpoint history is device-local and is not included in `.jhw` exports; the exported board itself remains portable.
- `.jhw` export packages referenced media bytes so the file can be moved to another device.
- Media referenced by any retained checkpoint is protected. Unreferenced media is reclaimed after checkpoint/document deletion or on startup.
- The Lesson Library includes built-in classroom templates and locally saved templates. Starting from a template captures unsaved work as a recovery checkpoint first.
- Selected canvas objects can be saved as reusable content. Group relationships and relative positioning are preserved when the content is inserted on another page.
- Imported images, audio, video and PDFs are indexed in the searchable Assets tab. Removing an asset from the library does not break boards or templates that still reference it.
- Templates, reusable content and asset metadata are device-local. Boards exported as `.jhw` still package the media used by that board.
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

## Classroom screen

Smartnotebook opens with a classroom workspace: movable, resizable widgets, a labeled bottom toolbar, five backgrounds, and welcome, focus, and team templates. Add instructions, countdown timers, clocks, random name pickers, group makers, work symbols, traffic lights, dice, and scoreboards. On narrow screens widgets form a scrollable layout. Present hides the editing frame; Escape returns to editing.

Use **Whiteboard** or **Draw** for handwriting and the existing teaching tools. Use **Classroom** in the whiteboard header to return. The board is saved before switching. Your most recently used workspace opens next time.

Classroom screens save automatically in this browser, separately from whiteboard documents. Running timers use a deadline and keep time across screen changes and reloads. Open the screen list to switch screens, create one, download a JSON backup, or import a backup. Imports add screens without replacing existing ones. Screen backups do not include whiteboard documents; export those separately as `.jhw`.
