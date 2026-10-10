# Jaihind International School — Smart Classroom

## Professional UI/UX & Development Specification

**Version:** 1.0 · **Platforms:** Android TV + Web · **Primary display:** 1280 × 720

| | |
|---|---|
| **Project** | Jaihind Smart Classroom |
| **Primary users** | Teachers, students, coordinators and school administrators |
| **Target** | Interactive touchscreen smartboards, Android TV displays, Windows touchscreens and web browsers |
| **Design approach** | Touch-first, child-friendly, professional, fast and classroom-focused |

The objective is to transform the current welcome screen into a Smart Classroom Operating System that connects the whiteboard, timetable, attendance, lesson planning, student activities, classroom widgets, school ERP and parent application.

The teacher should be able to enter the classroom, sign in, view the current period and begin teaching in approximately two or three touches.

---

## 1. Core product architecture

**Smart Classroom Dashboard** — unified teacher and student experience:

- Dashboard
- Timetable & Lessons
- Attendance & Students
- Whiteboard & Tools
- Learning Games
- AI Assistant
- Presentation Modes
- Resources Library

**Integration & Synchronization Layer** — API · Authentication · Local Cache · Offline Queue, connecting to:

- School ERP
- Parent App
- Cloud Storage

All modules should use one shared authentication system, classroom context, timetable service, resource library and synchronization engine. Avoid building separate disconnected applications for each feature.

---

## 2. Dashboard layout specification

**Primary target: 1280 × 720 landscape**

Illustrative layout (the production design uses the full 1280 × 720 canvas):

```
JAIHIND INTERNATIONAL SCHOOL                                   09:37
SMART CLASSROOM • LKG A

Good morning, LKG!
Ready for another exciting day of learning?

┌─────────────┐ ┌─────────────────┐ ┌────────────────┐
│ Attendance  │ │ Current lesson  │ │ Next period    │
│ 22/24       │ │ Phonics         │ │ Numbers        │
│ Present     │ │ Letter sounds   │ │ 10:45 AM       │
│ today       │ │                 │ │                │
└─────────────┘ └─────────────────┘ └────────────────┘

Today's learning
Recognize, say and write letter sounds        [ Start Lesson ]

[ Timer ]  [ Dice ]  [ Groups ]  [ Sound ]  [ Draw ]
```

The screen should use these zones:

| Region | Desktop TV specification |
|---|---|
| Header | 64 px fixed height |
| Left navigation | 76 px expanded icon rail |
| Main content | Flexible, approximately 1,204 px wide |
| Welcome strip | 96–120 px |
| Dashboard cards | 2–3 columns, based on available width |
| Quick tools dock | 72–84 px |
| Touch controls | 56 px preferred minimum |

The dock should never cover classroom content. The timetable should remain accessible without navigating away from the home screen.

> **Important:** The detailed, colorful mockup can be the visual inspiration, but the production 1280×720 interface should be less crowded. Use a compact home screen with secondary information available through drawers and panels.

---

## 3. Module specifications

### A. Redesigned welcome dashboard

The dashboard must display useful information immediately, without waiting for teacher authentication.

- **Public classroom view:** School name, classroom, date, time, weather, current period, next period, general announcements and access to offline whiteboard tools.
- **Authenticated teacher view:** Attendance, student information, detailed timetable, lesson resources, saved boards, assessments, teaching objectives and classroom controls.

#### Component states

| Component | Default | Other states |
|---|---|---|
| Teacher login | Sign in | Loading, authenticated, expired, failed |
| Attendance | Today's totals | Unmarked, saved, syncing, conflict |
| Current lesson | Scheduled subject | No class, substitute, cancelled, completed |
| Timetable | Current period | Break, holiday, changed, unavailable |
| ERP indicator | Connected | Offline, syncing, error |
| Weather | Latest reading | Loading, stale, unavailable |
| Quick tools | Ready | Active, minimized, disabled |

**Dashboard behavior:** The system should automatically highlight the current period, update the clock, refresh information in the background and preserve the teacher's current work when returning from the whiteboard.

### B. Live timetable and lesson launcher

Timetable interaction prototype:

| Time | Subject | Description | |
|---|---|---|---|
| 09:00–09:40 | Circle Time | Morning welcome and conversation | |
| 10:00–10:40 | Phonics | Letter sounds and picture matching | **Now** |
| 10:45–11:25 | Numbers | Counting and number recognition | |
| 11:25–12:05 | Art & Craft | Creative activity | |

Selecting the current period shows a preview — e.g. *Phonics — Lesson Preview: Letter sounds and picture matching* — with an **Open Lesson Workspace** action.

**Required behavior:** Selecting a period opens a preview containing the subject, assigned teacher, objectives, lesson plan, resources, teaching duration and previous progress.

The **Start Lesson** action must:

1. Create or resume a lesson session.
2. Load the saved whiteboard and attached resources.
3. Start an optional lesson timer.
4. Keep the timetable context available in a collapsible panel.
5. Save progress automatically and offer a lesson-completion summary.

Teachers must be able to start a different lesson without modifying the official timetable. Any timetable changes require authorized ERP updates.

### C. Attendance and student information

The attendance module must support teacher-friendly, fast entry.

| Feature | Expected behavior |
|---|---|
| Student roster | Photo, name, roll number and class |
| Attendance marking | Present, absent, late, excused |
| Bulk marking | Mark all present, then edit exceptions |
| Search | Find student by name or roll number |
| Attendance summary | Totals and pending count |
| ERP synchronization | Save with server confirmation |
| Offline attendance | Store pending changes securely |
| Corrections | Permission-controlled changes with audit history |

> **Privacy requirement:** The classroom display must not expose parent phone numbers, addresses, medical information, fee balances or confidential student records. Such information belongs in restricted administrative views.

### D. Touchscreen whiteboard and widgets

The whiteboard should be the central teaching workspace, not a separate disconnected tool.

**Whiteboard tool architecture:** Pen · Eraser · Highlighter · Shapes · Text · Ruler · Compass · Undo · Media · Timer · Dice · Groups

- **Drawing engine requirements:** Smooth low-latency strokes, pressure sensitivity when hardware supports it, pen/crayon/highlighter textures, palm rejection where supported, shape recognition, multi-touch manipulation, undo/redo, object grouping, locking, copying and infinite or paginated canvas options.
- **Teaching instruments:** Ruler, protractor, compass, straight line, geometry shapes, graph paper, handwriting guides and coordinate grid.
- **Media support:** Images, PDFs, audio, video, YouTube embedding where supported and safe website embeds.
- **Widget system:** Timer, stopwatch, digital clock, traffic light, random student picker, group maker, dice, spinner, scoreboard, sound meter and sticky notes. Widgets must be draggable, resizable, minimizable and optionally pinned above the canvas.

### E. Interactive student learning games

Games should be organized by age, class, subject and skill.

| Category | Activities |
|---|---|
| Phonics & Language | Letter sounds, blending, sight words, picture matching and word building |
| Maths & Numbers | Counting, number tracing, sequencing, shapes and simple operations |
| Memory & Puzzles | Memory cards, sorting, sequencing, matching and drag-and-drop puzzles |
| Creative Activities | Colouring, drawing, tracing, painting and interactive storytelling |

Every activity must provide a teacher preview, full-screen play mode, reset, sound controls, optional hints and a completion summary. Avoid competitive public rankings for younger students; use encouraging feedback instead.

### F. Teacher and student modes

Two modes: **Teacher Mode** and **Student Mode**.

**Teacher workspace:** Attendance · Lesson plans · Student roster · Classroom tools · Resources · AI Assistant · Save and publish. Authenticated teacher access with permission checks.

Switching into student mode should be easy. Returning to teacher mode should require the teacher's PIN or authenticated session confirmation, rather than an unrestricted button.

### G. AI teaching assistant

The AI assistant should operate as an optional teacher-controlled side panel.

- **Capabilities:** Suggest lesson plans, explain concepts, generate phonics activities, produce age-appropriate quiz questions, create worksheet drafts, recommend classroom games and summarize completed lessons.
- **Safeguards:** AI-generated teaching material must be reviewed by the teacher before display or publication. Do not automatically upload identifiable student records to an AI provider. Provide clear source labels, error handling and an option to disable AI features entirely.

For the initial release, AI should use teacher-selected subject, class, topic and learning objective rather than unrestricted access to the full ERP.

---

## 4. Responsive layout and interaction rules

Use adaptive layouts rather than scaling the same dashboard uniformly across every screen. Android's large-screen recommendations support navigation rails, multipane layouts and appropriately sized touch targets.

| Display | Layout behavior |
|---|---|
| 1280×720 | Primary fixed-height classroom dashboard; compact cards |
| 1920×1080 | More information visible, larger cards and typography |
| 2560×1440 / 4K | Scale for physical readability, not simply pixel count |
| Desktop browser | Responsive navigation rail, mouse and keyboard support |
| Tablet | Collapsible navigation and two-column content |
| Mobile browser | Single-column teacher companion view |

### Touch and gesture specifications

| Interaction | Behavior |
|---|---|
| Single tap | Select tool, card or action |
| Double tap | Context-specific zoom or open, never ambiguous |
| Long press | Object options or contextual menu |
| One-finger drag | Move objects when selected; draw in pen mode |
| Two-finger pinch | Zoom whiteboard |
| Two-finger drag | Pan canvas |
| Stylus contact | Draw or interact based on active tool |
| Palm contact | Ignore when reliably identified by hardware |
| Three-finger gestures | Optional and configurable |
| Physical keyboard | Shortcuts, Tab navigation and Escape |
| Remote/D-pad | Focus navigation and activation where supported |

A key requirement is **input arbitration**: drawing, scrolling, dragging objects and moving geometry tools must not interfere with one another. Input events should be routed according to the active tool and supported hardware capabilities.

Android recommends at least 48dp touch targets; for classroom controls, aim for 56–64dp with adequate spacing. Use WCAG 2.2 AA as the web accessibility baseline.

---

## 5. Accessibility and visual design system

### Recommended design tokens

| Token | Colour |
|---|---|
| Primary | `#164A44` |
| Background | `#F7F8F2` |
| Success | `#DCEEE4` |
| Activity | `#7053CE` |
| Accent | `#E9B653` |

Use a readable sans-serif font such as Noto Sans or Inter for operational UI, with optional playful typography restricted to welcome banners and activities.

**Recommended typography:** 24–32 px for primary dashboard headings, 18–22 px for section headings, 16–18 px for essential classroom information and 14 px for secondary metadata. Increase these values on physically larger screens when necessary.

Accessibility requirements include keyboard focus visibility, screen-reader labels, text resizing, non-colour status indicators, reduced-motion support, captions for audio/video, contrast testing and alternatives to drag-only interactions.

---

## 6. Offline-first behavior

The smartboard must remain useful when school internet connectivity is interrupted.

| Feature | Offline behavior |
|---|---|
| Whiteboard | Fully operational; local autosave |
| Drawing instruments | Fully operational |
| Timer, dice, spinner | Fully operational |
| Downloaded games | Fully operational |
| Timetable | Last synchronized copy, clearly labeled |
| Attendance | Encrypted local draft and queued submission |
| Lesson resources | Available if previously downloaded |
| Weather | Last reading with timestamp |
| AI Assistant | Unavailable unless a local model is deployed |
| Parent app publishing | Queued until connection returns |

**Synchronization strategy:** Use a persistent local database, unique mutation IDs, idempotent server requests, retry with exponential backoff and clear conflict handling.

For attendance, a teacher must never see a misleading "Saved to ERP" message before server confirmation. Use distinct statuses: **Saved locally**, **Syncing**, **Synced** and **Needs review**.

Keep offline data encrypted, scoped to the authenticated teacher/device and protected by retention policies.

---

## 7. ERP and parent application integration

```
Jaihind Smart Classroom
(Touchscreen + Web Client)
            │
            ▼
Classroom API / Backend-for-Frontend
(Authentication • Authorization • Validation • Audit Logs)
            │
     ┌──────┴──────┐
     ▼             ▼
School ERP     Parent Application
(Timetable,    (Homework, approved
attendance,    updates, notices
roster,        and activities)
lessons,
announcements)
```

### Data ownership

- The **ERP** should remain the source of truth for student enrollment, class allocation, timetable, attendance records and official academic information.
- The **classroom system** should own whiteboard documents, local tool settings, classroom widget configurations and temporary teaching sessions.
- The **parent application** should receive only approved information through backend publishing workflows, not direct unrestricted writes from the touchscreen.

### Proposed API contract

> These are proposed endpoints, not claims about the existing Jaihind ERP implementation.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/classrooms/{id}/dashboard` | Aggregated welcome data |
| GET | `/api/v1/classes/{id}/timetable` | Timetable |
| GET | `/api/v1/classes/{id}/students` | Authorized roster |
| GET | `/api/v1/classes/{id}/attendance` | Daily attendance |
| PUT | `/api/v1/classes/{id}/attendance/{date}` | Submit attendance |
| GET | `/api/v1/lessons/{id}` | Lesson details |
| POST | `/api/v1/lesson-sessions` | Start session |
| PATCH | `/api/v1/lesson-sessions/{id}` | Save progress |
| POST | `/api/v1/whiteboards/{id}/snapshots` | Save board |
| POST | `/api/v1/publications` | Submit parent-app content |
| POST | `/api/v1/ai/teaching-assist` | Teacher-reviewed AI requests |

Use role-based permissions, short-lived credentials, secure device enrollment, request validation, audit logging and server-side authorization on every protected endpoint.

---

## 8. Main user flows

**Flow 1 — Start teaching**

Welcome Screen → Teacher Sign In → Current Timetable Period → Lesson Preview → Start / Resume Lesson → Whiteboard + Resources + Widgets → Save Progress and End Session

**Flow 2 — Attendance**

Teacher sign-in → Class roster → Mark all present → Edit absences/late arrivals → Review → Submit → ERP confirmation

**Flow 3 — Student activity**

Teacher selects activity → Preview → Enter student mode → Full-screen interaction → Results → Teacher unlock → Optional save

**Flow 4 — Parent update**

Teacher completes lesson → Reviews suggested summary → Selects approved content → Submits publication → ERP/parent backend processes update → Delivery status displayed

---

## 9. Suggested technical architecture

| Layer | Recommended technology |
|---|---|
| Web interface | React + TypeScript |
| Build system | Vite |
| UI styling | Tailwind CSS + reusable design system |
| State management | Zustand or equivalent |
| Data fetching | TanStack Query |
| Whiteboard engine | Custom canvas engine with Pointer Events; evaluate Konva/Fabric where appropriate |
| Local storage | IndexedDB on web, SQLite where native |
| Android deployment | Native Android shell or evaluated WebView wrapper |
| API layer | Existing ERP backend with classroom-specific endpoints |
| Authentication | Existing school identity provider, if compatible |
| Realtime updates | WebSocket or Server-Sent Events |
| Testing | Playwright, unit tests and real-device touch testing |

The exact stack should be confirmed against your existing ERP and whiteboard codebase before development. Reusing working modules is preferable to replacing them without a technical audit.

---

## 10. Non-functional requirements and acceptance criteria

| Area | Proposed acceptance target |
|---|---|
| Dashboard loading | Cached dashboard interactive within 2 seconds on reference hardware |
| Navigation | Common teaching actions reachable within 2–3 taps |
| Whiteboard responsiveness | Pen-to-ink latency minimized and measured on actual devices |
| Autosave | Local recovery after forced app restart |
| Offline attendance | No loss of queued records after restart |
| Security | No sensitive records visible in student mode |
| Accessibility | WCAG 2.2 AA for applicable web interfaces |
| Display scaling | No clipped controls at 1280×720 and 1920×1080 |
| Session recovery | Resume last saved lesson after interruption |
| Sync integrity | Duplicate submissions do not duplicate attendance or lesson records |

Test on the actual classroom touchscreen hardware, not only a desktop browser. Device-specific touch controllers, pen input, Android WebView versions and screen scaling can significantly affect the experience.

---

## 11. Development roadmap

| Phase | Scope | Duration |
|---|---|---|
| **01 — Foundation and Dashboard** | Design system, navigation, classroom selector, login, responsive layout, dashboard states and local caching | 2–3 weeks |
| **02 — ERP, Timetable and Attendance** | API integration, current-period detection, lesson launcher, student roster, attendance, sync engine and audit handling | 3–4 weeks |
| **03 — Whiteboard and Teaching Widgets** | Canvas integration, touch gestures, teaching instruments, widget dock, persistence and session recovery | 3–5 weeks |
| **04 — Games and Student Mode** | Interactive games, activity library, student mode, teacher unlock, offline resources and results | 3–4 weeks |
| **05 — AI and Parent App Integration** | Teacher-reviewed AI features, lesson summaries, publishing approvals, parent-app integration and final testing | 3–4 weeks |

**Indicative effort:** approximately 14–20 weeks for a coordinated team, assuming the existing ERP and whiteboard can be reused and integration access is available. Actual estimates require a codebase and hardware assessment.

---

## 12. Release readiness checklist

- [ ] Dashboard fits 1280×720 without clipping
- [ ] Teacher authentication and student mode permissions verified
- [ ] Timetable handles breaks, holidays and substitutions
- [ ] Attendance works online and offline
- [ ] Whiteboard saves and restores sessions
- [ ] Multi-touch and palm rejection tested on target hardware
- [ ] All widgets support touch interaction
- [ ] Games run in student mode without exposing private data
- [ ] ERP sync and conflicts tested
- [ ] Parent-app publishing requires approval
- [ ] Accessibility and keyboard navigation tested
- [ ] AI-generated content requires teacher review

---

## Final implementation recommendation

Build the Jaihind Smart Classroom around three experiences: the **Welcome Dashboard** for classroom awareness, the **Lesson Workspace** for teaching, and **Student Mode** for interactive participation.

The most valuable architectural decision is to make the **timetable** the connection point between the ERP, teacher, lesson resources, whiteboard, activities and parent communication.

This specification provides the functional and design baseline. Before development, the next engineering deliverables should be a detailed Figma component library, annotated 1280×720 screens, API schemas, permission matrix, offline synchronization design and real-device test plan.
