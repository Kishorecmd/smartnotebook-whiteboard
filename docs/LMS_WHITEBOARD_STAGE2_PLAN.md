# Stage 2 plan: choose LMS lessons inside the whiteboard

**Status:** built and tested locally (fake ERP + LMS branch `lms-whiteboard-lessons`), not deployed · **Written:** 10 October 2026
**Repos:** Smartnotebook (`whiteboard.jaihind.school`), Jaihind LMS (`lms.jaihind.school`), and one small ERP change (Antigravity)
**Builds on:** Stage 1 (live): LMS lesson page → **Teach on whiteboard** (`?lms=teach`), and the classroom rail's **Lessons** button, which opens the LMS in a new tab.

## 1. Goal

A teacher at the classroom board taps **Lessons**, sees their LMS courses and lessons inside the whiteboard, and taps **Teach** to open a lesson's board full screen. There is no second tab and no trip through the LMS website.

What stays the same:
- The ERP remains the authority on who may see and edit which course.
- Stage 1 keeps working as the fallback.

### Decisions (10 October 2026)

| Question | Decision | Effect on the design |
|---|---|---|
| Same teacher? | **Yes.** The LMS user must be the teacher signed in to the classroom board. | The whiteboard needs the teacher's ERP `users.id` from the classroom sign-in. ERP change: return `user_id` from the teacher-app login (§3.0). Connecting the LMS requires a classroom sign-in first. |
| Who can use it? | **Teachers, coordinators and administrators** *(assumed from the answer; confirm)*. | Allowed LMS roles: teacher plus the LMS's admin roles. Because of the same-teacher rule, they must also be the signed-in class teacher on that board. Parents and other staff are refused. |
| Save from the whiteboard? | **Yes: Save to lesson.** | A write route with the LMS's version check (§3.2), and a confirmation that the change is visible to students (§3.3). |
| Offline? | **Online only.** | Boards are never stored on the device. Lesson panel data and packages are in-memory and `no-store`, and teach mode uses the existing session-isolated storage. |

## 2. Why it needs new trust

The two apps sign people in separately:

| | Whiteboard | LMS |
|---|---|---|
| Sign-in | ERP teacher app (class teacher), server-side token | ERP SSO assertion (`ERP_SSO_SECRET`) |
| Identity it knows | `teacher_id`, the assigned class | ERP `users.id`, role, name |
| Session | HttpOnly cookie on `whiteboard.jaihind.school` | HttpOnly, SameSite=Lax cookie on `lms.jaihind.school` |
| Reaches lesson data | — | `ERP_API_TOKEN` + actor → `api/v1/lms/*` |

The whiteboard can't read the LMS cookie. Embedding the LMS in a frame wouldn't send it either, because browsers block third-party cookies. So the LMS has to **hand the whiteboard a proof of who the teacher is**, and the whiteboard needs a **way to ask the LMS for data on that teacher's behalf**.

## 3. Design (recommended)

```
Whiteboard browser ──(1) Connect LMS──▶ lms.jaihind.school/auth/whiteboard
                                         │ LMS session? if not, ERP SSO first (existing)
                                         │ mint signed hand-off (≤120 s, single use)
Whiteboard browser ◀─(2) auto-POST form─┘
        │
        ▼ (3) POST /api/classroom/lms/callback (whiteboard server)
  verify signature, audience, expiry, nonce, same teacher → LMS link inside the classroom session
        │
        ▼ (4) whiteboard server → LMS server: /api/whiteboard/* with WHITEBOARD_API_TOKEN + actor
  LMS server → ERP (existing ERP_API_TOKEN + actor) → the ERP decides course access
```

### 3.0 Same teacher (ERP change)
- **Antigravity `TeacherApiController::login`:** add `user_id` (the ERP `users.id`) to the response. `findByToken` already has it, and it isn't sensitive for the teacher's own session.
- **Whiteboard classroom login:** keep that `user_id` in the server-side session, never in the browser.
- **LMS callback:** require a valid classroom session, and require `assertion.user.user_id === classroom.user_id`. A mismatch shows "This LMS account is not the teacher signed in to this board" and creates no link.
- **End of the classroom sign-in** (logout, expiry, or a different teacher signing in) also ends the LMS link.
- **Deployment:** this part ships to the ERP through `scripts/deploy.ps1 -From dev`, with a dry run first, before the whiteboard change.

### 3.1 Hand-off (LMS → whiteboard)
- **New LMS route `GET /auth/whiteboard`:**
  - Requires the LMS session; if there is none, it sends the teacher through the existing ERP SSO and comes back.
  - Refuses the `parent` role and staff roles outside teacher, coordinator and administrator.
  - Builds an assertion `{ iss: 'lms.jaihind.school', aud: 'whiteboard.jaihind.school', iat, exp: iat + 120, nonce, user: { id, user_id, role, name } }` and signs it with HMAC-SHA256 using a **new** secret, `WHITEBOARD_SSO_SECRET`. This is the same format as the ERP's assertion, so the existing `verifyErpAssertion` code can be copied.
  - Returns a page that **auto-POSTs** the assertion to `https://whiteboard.jaihind.school/api/lms/callback`. A POST keeps the assertion out of URLs, browser history and server logs.
- **New whiteboard route `POST /api/classroom/lms/callback`** (as built; the plan first said `/api/lms/callback`):
  - Verifies the signature, issuer, audience and expiry (lifetime 180 s at most, no more than 30 s of clock skew).
  - Rejects nonces it has already seen; nonces are remembered until they expire.
  - Stores the **LMS link inside the classroom session** in server memory. No second cookie: the classroom cookie (path `/api/classroom`) already reaches the callback, the link inherits its 30-minute idle and 8-hour limits, and it ends with sign-out, expiry or a different teacher signing in.
  - Redirects to `/?lmsLink=connected` or `/?lmsLink=<ERROR_CODE>`; the page removes the parameter and opens the Lessons panel.

### 3.2 Data (whiteboard server → LMS server)
- **New LMS routes under `/api/whiteboard/*`:**
  - Accept only a bearer `WHITEBOARD_API_TOKEN` plus the actor fields, mirroring how the LMS calls the ERP.
  - Call the ERP with the **existing** `ERP_API_TOKEN`, so the ERP's course-access rules apply unchanged.
  - Three read routes and one write route:
    - `GET /api/whiteboard/courses`: the teacher's courses (reuses the `/api/lms/courses` logic).
    - `GET /api/whiteboard/courses/{id}`: units, lessons, and which lessons have a board (reuses `/api/lms/courses/{id}`).
    - `GET /api/whiteboard/lessons/{id}/board`: the board package and its `version` (reuses `/api/lms/lessons/{id}/whiteboard` GET).
    - `PUT /api/whiteboard/lessons/{id}/board`: **Save to lesson**, with `expected_version`. Reuses the LMS's PUT, so the ERP rechecks that this user may edit the course. A version conflict comes back as 409 "Someone else saved this whiteboard after you opened it".
- **Whiteboard routes `/api/classroom/lms/courses`, `/api/classroom/lms/courses/:id`, `/api/classroom/lms/lessons/:id/board` (GET and PUT), and `POST /api/classroom/lms/disconnect`:**
  - Check the LMS link, then forward with the token and actor.
  - Responses are `no-store, private`.
  - Boards are capped at 25 MB, like the LMS, and streamed rather than buffered twice where possible.
- **Why not call the ERP directly from the whiteboard?** That would put the ERP's `api/v1/lms/*` master token on a second server. Going through the LMS keeps a single holder of that token and a single place for LMS audit logging.

### 3.3 Whiteboard UI
- **Rail → Lessons:** when an LMS link exists, it opens an in-app **Lessons** panel: My courses → lessons, with a board marker and search. Without a link it shows **Connect to LMS**; **Open LMS in a new tab** stays as the Stage 1 fallback.
- **Teach:** loads the package into the whiteboard editor in teach mode, a standalone version of Stage 1's teach UI. The header shows "Teaching · lesson title" and that notes don't change the lesson until saved. **End lesson** returns to the classroom home.
- **Save to lesson:**
  - Shown only to users the ERP allows to edit that course.
  - Asks first: "Save your changes to the lesson? Students will see this version."
  - Sends the board with the version it was opened at. On success it shows "Saved · version N". On a conflict it offers to reload the newer version; it never overwrites silently.
  - **End lesson** with unsaved changes asks whether to save or discard.
- **Lesson flow:** the current-lesson card's **Start lesson** can offer "Choose an LMS lesson" when the link exists. A direct period → lesson link still needs ERP timetable data; it's out of scope here.
- **Student Mode** hides the Lessons panel, and taking the board into teach mode follows the same lock rules as today.
- **Status:** the header shows an "LMS connected" state, and **Settings** gets **Disconnect LMS**.

## 4. Configuration (Hostinger, never committed)

Generate each value once with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

| App | Variable | Value |
|---|---|---|
| LMS | `WHITEBOARD_SSO_SECRET` | New 32-byte secret, same on both apps |
| LMS | `WHITEBOARD_API_TOKEN` | New 32-byte token, same on both apps |
| LMS | `WHITEBOARD_CALLBACK_URL` | `https://whiteboard.jaihind.school/api/classroom/lms/callback` |
| Whiteboard | `LMS_SSO_SECRET` | Same as LMS `WHITEBOARD_SSO_SECRET` |
| Whiteboard | `LMS_API_TOKEN` | Same as LMS `WHITEBOARD_API_TOKEN` |
| Whiteboard | `LMS_BASE_URL` | `https://lms.jaihind.school` |

Both apps stay inert until the variables are set. `/api/health` reports `lmsLink: true` only when they are, so the UI can hide **Connect to LMS** until then.

## 5. Security checklist
- **Hand-off:** signed, audience-bound, at most 120 s, single use (nonce store), sent by POST, never in URLs.
- **Tokens and secrets:** `WHITEBOARD_API_TOKEN` and both secrets are server-only. The browser only ever holds an opaque link cookie.
- **Access:** the ERP stays the authority. The LMS forwards the actor and adds no access rules of its own.
- **Request checks:** HTTPS and origin checks as on the classroom routes, rate limits on the callback (5 per IP per 5 minutes) and on data routes. A `TRUST_PROXY`-aware client IP.
- **Fail closed:** a missing secret, wrong audience or replayed nonce leads to "Connect to LMS" again, never a partial session.
- **Disconnect:** clears the link at once, and logging out of the whiteboard clears it too.
- **Same teacher:** the LMS link is bound to the classroom sign-in's ERP `user_id` and ends with it.
- **Writes:** saving needs the LMS link and a same-origin request. The version check stops lost updates, and the ERP rechecks edit rights on every save.
- **Online only:** boards are never cached on the device (no IndexedDB, no service-worker cache for `/api/lms/*`).
- **Logging:** no board contents or tokens in logs; the LMS logs actor, route and outcome.
- **Restarts:** sessions live in memory, so restarting or redeploying either server signs teachers out of the link (as with classroom sessions today).

## 6. Remaining question
- **Roles:** confirm that coordinators and administrators should be included. They still need to be the signed-in class teacher on that board, so in practice this only affects staff who are also class teachers.

## 7. Work breakdown

| # | Work | Repo | Estimate |
|---|---|---|---|
| 0 | `user_id` in the teacher-app login response, test, deploy (dry run first) | ERP | 0.5 day |
| 1 | Hand-off route with role rules, assertion signing, auto-POST page, tests | LMS | 0.5 day |
| 2 | `/api/whiteboard/*` read routes and the save route with token + actor, tests | LMS | 1.5 days |
| 3 | Callback, same-teacher check, nonce store, LMS link sessions, tests (expiry, replay, wrong audience, mismatch, rate limit) | Whiteboard server | 1 day |
| 4 | Proxy routes for courses, lessons, board read and save, size limits, tests against a fake LMS | Whiteboard server | 0.5 day |
| 5 | Lessons panel, teach mode outside the LMS frame, Save to lesson with confirm and conflict handling, connect/disconnect, Settings, Student Mode | Whiteboard UI | 2 days |
| 6 | End-to-end tests with fake ERP + fake LMS; docs; Hostinger variables | All | 0.5 day |
| | **Total** | | **about 6.5 days** |

## 8. Rollout
1. Deploy the ERP change (`user_id` in the teacher-app login). It's backward compatible; existing apps ignore the extra field.
2. Merge and deploy the LMS (new routes are inert without the secrets).
3. Merge and deploy the whiteboard (Lessons panel hidden while `lmsLink` is false).
4. Set the six variables on both Hostinger apps and redeploy both.
5. A real teacher tests: Connect to LMS → courses → Teach a lesson → **Save to lesson** on a test lesson → End lesson → Disconnect. They also try a different teacher's LMS account and should be refused.
6. If anything fails, remove the variables to switch Stage 2 off. Stage 1 keeps working.

## 9. Testing plan
- **Unit:** assertion signing and verification (expired, future-dated, wrong audience, bad signature, replayed nonce); same-teacher match and mismatch; refused roles; link session limits and ending with the classroom sign-in; proxy refusing without a link or token; package size cap; save with a stale version → conflict; no `/api/lms/*` response cached.
- **Integration:** whiteboard server against a fake LMS that checks the token and actor fields; LMS routes against a fake ERP that checks the actor is forwarded.
- **Browser:** at 1280×720, the Lessons panel fits, a lesson opens in teach mode, End lesson returns home, and Student Mode hides the panel.
- **Not automatable:** the real ERP SSO round trip and full screen on the classroom board need one manual check after deployment.

## 10. As built (10 October 2026)
- **ERP:** `TeacherApiController` login and Google login return `user_id`.
- **LMS:** `lib/whiteboard-link.ts`, `lib/whiteboard-api.ts`, `app/auth/whiteboard`, `app/api/whiteboard/*`. A teacher who is not yet signed in goes through ERP SSO and comes back to the hand-off (`jaihind_lms_next` cookie, path `/auth`). Both save routes share `saveWhiteboard()`.
- **Whiteboard server:** `server/classroom-lms.mjs` plus routes in `server/classroom.mjs`. LMS refusals never use 401/403, so they cannot end the classroom sign-in. Tests: `src/dashboard/lmsLink.test.mjs`.
- **Whiteboard UI:** Rail → Lessons opens `src/lms/LessonsDialog.tsx`, filtered to the board's class (for example LKG), with "All my courses" beside it. **Teach** opens `/?lms=lesson&id=N` (`LmsWhiteboard` in `lesson` mode, isolated storage) with Save to lesson, a version-conflict prompt and End lesson. Settings has **Disconnect LMS**. A wrong-teacher refusal offers **Sign out of the LMS**.
- **Save to lesson visibility:** for staff, the ERP's view rule equals its edit rule, so anyone who can open a lesson here can save it. The ERP still rechecks on every save.
- **Local end-to-end check:** passed for connect (with and without an LMS session), the LKG filter, teach, save, version conflict, end lesson, the device's own board untouched, disconnect, and wrong-teacher refusal.
