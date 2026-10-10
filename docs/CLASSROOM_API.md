# Jaihind Smart Classroom integration

Updated: 28 September 2026.

## Class teacher authorization

Choose **Classroom → Connect classroom → Class teacher sign in → Open my classroom**. Use the existing ERP username/email and password. Only assigned class teacher sections appear; a single assignment is preselected. No administrator login is needed.

The Node server sends credentials only to `https://erp.jaihind.school/public/index.php?url=teacher-app/login`, then validates the teacher token with `teacher-app/diary/sections`. Empty assignments deny access and revoke the token. This is stricter than `teacher-app/classes`, which includes subject teachers. Assignments are checked again for session restoration, class lists, mapping and each snapshot. Editing browser storage cannot authorize another class.

Verified source: `C:/xampp/htdocs/Antigravity/modules/teacher/routes.php`, `controllers/TeacherApiController.php`, `models/TeacherModel.php`, and `modules/diary/models/DiaryEntryModel.php`. The diary model uses the running year, active sections and either `sections.class_teacher_id` or the matching `class_teachers` assignment. The existing teacher app's `lib/config/api_config.dart` confirms the production base.

The proxy is now implemented and enabled locally following the class teacher authorization instruction. Tests use sample records, never real credentials or student data. Live ERP compatibility and browser sign-in verification remain pending. No deployment or ERP source changes were made.

## Verified ERP routes used

All routes use `https://erp.jaihind.school/public/index.php?url=ROUTE` by default. `CLASSROOM_ERP_BASE_URL` overrides the base, for example `http://localhost/Antigravity/public/index.php` for local XAMPP; the server refuses to start with a non-HTTPS base unless it is localhost, 127.0.0.1 or [::1], because teacher passwords are forwarded to it. `/api/health` reports the configured base as `erpBase`, and the dashboard's Mark Attendance and Open school ERP links use it, falling back to production when it is missing (for example on PHP-only hosting). Except login, requests use the teacher Bearer token server-side. Hosts/routes are allowlisted; redirects are rejected.

| ERP route | Request | Scope / data |
|---|---|---|
| `teacher-app/login` | POST username, password, device_info | Teacher authentication; token and name retained in server memory |
| `teacher-app/logout` | POST | Token revocation on logout, rejected assignment, replacement or expiry |
| `teacher-app/diary/sections` | GET | Authoritative class teacher assignments; discard diary metadata/statistics |
| `teacher-app/profile` | GET | Current academic year ID; discard contacts and other profile details |
| `teacher-app/students` | GET class_id, section_id | ID/name/birthday-today boolean; discard DOB, contacts and admission details |
| `teacher-app/attendance` | GET class_id, section_id, date | Names/status/totals with explicit unmarked state |
| `teacher-app/timetable` | GET | Signed-in teacher's own lessons filtered by class/section; labelled partial |
| `teacher-app/homework` | GET limit=100 | Teacher's latest homework filtered by class/section names and today's assigned date |
| `teacher-app/notices` | GET limit=20 | Teacher/school notices; only explicit target_scope=all can be presented |
| `teacher-app/attendance/save` | POST class_id, section_id, date, records | Today's register for the class teacher's own class (see below). The ERP sends its absence alert to families of students newly marked absent |
| `teacher-portal/attendance` | Browser navigation | Existing ERP web editor, linked when no class is connected |

Student and teacher photos are shown through `/api/classroom/photo/:id`, never as ERP URLs. Each snapshot gives every photo a random address tied to that sign-in; the server resolves the ERP path (`uploads/photos/x.jpg` relative to the site root, or a bare file name in that folder), accepts only JPEG, PNG, WebP or GIF up to 3 MB from the ERP's own site, and returns it with `Cache-Control: no-store, private`, so nothing stays in a shared board's cache. The addresses stop working at sign-out or session expiry, and another teacher's session cannot use them. A missing or failed photo falls back to the initial. The ERP itself still serves `uploads/photos` publicly; restricting that is an ERP change. Full dates of birth never reach the browser. Homework is limited to the teacher's latest 100 items and is not a complete class-wide feed; the ERP response currently omits class/section IDs.

## Smartnotebook server routes

Implemented in `server/classroom.mjs`. These are new whiteboard routes, not ERP endpoints.

| Endpoint | Request | Response / authorization |
|---|---|---|
| `/api/classroom/login` | POST credential, password | role=teacher, name, classes after login and class teacher validation |
| `/api/classroom/session` | GET | Minimal session after fresh assignment validation |
| `/api/classroom/classes` | GET | Only this class teacher's assignments |
| `/api/classroom/mapping` | POST classId, sectionId, device, timezone | Canonical labels after fresh assignment validation |
| `/api/classroom/snapshot` | POST mapping | Authorized current-day minimal data |
| `/api/classroom/attendance` | POST mapping, records [{id, status}] | Saves today's register after fresh assignment validation; returns date, saved, newlyAbsent |
| `/api/classroom/logout` | POST empty object | Invalidate local session, clear cookie, attempt ERP token revocation |

Cookies are opaque, HttpOnly, SameSite=Strict, scoped to /api/classroom, and Secure over HTTPS. ERP tokens never reach the browser. Sessions expire after 30 minutes without requests or eight hours total. Five login attempts per IP per five minutes, bounded maps and eight-second upstream timeouts are enforced. No credentials or private payloads are logged or persisted.

HTTPS and origin checks are mandatory except loopback development. Production origin is fixed to https://whiteboard.jaihind.school. Configure existing TRUST_PROXY only for a trusted TLS proxy forwarding protocol/client IP. Multiple Node replicas require session affinity or a reviewed shared session store. Restarting Node signs out all classroom sessions.

Logout invalidates local access even when ERP revocation fails; an unreachable ERP may retain its token until ERP expiry, but it is no longer accessible through this session. Private responses have Cache-Control: no-store, private. Service-worker navigation caching excludes /api/; ordinary API fetches have no cache route.

Only class choice/device label/timezone are saved in localStorage. These are preferences, not authorization. Old choices are not queried unless assigned to the current teacher. Student snapshots and roster widget results stay in memory, never in saved screen layouts/exports. In-flight responses cannot restore a signed-out snapshot.

## Taking attendance

**Take attendance** on the attendance card (and in Quick actions) opens today's register for the connected class. Unmarked students start as present; statuses are present, absent, late, leave and half day. Before saving, the dialog states how many families will receive the school's absence alert.

The server fetches today's ERP register first and saves only if the records cover exactly those students, once each, with a valid status; otherwise it returns ATTENDANCE_INCOMPLETE and saves nothing. The date is always today in the board's timezone, chosen by the server. Existing ERP remarks are carried over because the ERP overwrites them on save, and they never reach the browser. Half day is sent in the ERP's spelling (`half day`), which it also reports on reads. Saving again is safe: the ERP updates the day's rows and alerts only students not already stored as absent. Present Mode closes and hides the register. Live saving has been verified against a local fictional ERP only, never with real students.

Errors include ATTENDANCE_INCOMPLETE, SIGN_IN_REQUIRED, CLASS_TEACHER_REQUIRED, CLASS_ACCESS_DENIED, TRY_LATER, ERP_UNAVAILABLE, ORIGIN_DENIED and HTTPS_REQUIRED. No upstream stack traces are returned. Authentication errors clear the session and private snapshot. Other feed errors clear the snapshot while tools stay available. Optional timetable/homework/notices failures do not block attendance, but an auth failure from any feed invalidates access.

Snapshot fields: date, updatedAt, academicYearId, teacher, attendance totals and minimal students (ID/name/photo address/status), roster (ID/name/photo address/birthday boolean), teacherPhoto, partial timetable, homework and notices. Late counts as present and separately as late; leave/half-day are not silently counted absent. Malformed/wrong-date attendance fails instead of fabricating totals.

## Refresh and presentation

Classroom data refreshes every 90 seconds while visible, on focus and at period boundaries. Each snapshot reads fresh ERP data; no private server cache exists. Clock evaluation runs locally each second in the selected timezone, default Asia/Kolkata. A date change hides the previous day's snapshot.

Present Mode does not mount attendance, student dialogs, birthdays, teacher notes, account setup or roster/team widgets. Only public notices appear. Manual objectives/notes remain session-local; objectives may be presented. Sample mode is visibly labelled, including during presentation.

## Public weather

GET /api/classroom/weather uses server/classroom-weather.mjs, with no credentials/student data. Public Trichy coordinates (10.7905, 78.7047) go to Open-Meteo. Cache: 20 minutes, concurrent-request coalescing, 60-second failure backoff, eight-second timeout. Response: city, temperature, feelsLike, code, high, low, rain, updatedAt. Rain means today's maximum precipitation probability. Attribution is visible; verify provider terms for deployment volume. Contract: https://open-meteo.com/en/docs.

/api/health advertises classroomAPI:true,classroomWeather:true. These indicate installed routes, not upstream availability. Static hosting alone is insufficient; run the Node server.

## ERP capabilities still needed

1. Full class-day timetable with other teachers, breaks/lunch/ECA, authoritative holidays and substitutions. Existing teacher timetable is partial.
2. Academic year label and classroom context; year ID is available today.
3. Corrected calendar scope: inspected teacher-app/calendar calls requireToken() without assigning $auth before using its teacher ID. Do not consume until corrected and audience/holiday semantics are verified.
4. Lesson plans/current objectives linked to class/date/period. The existing lesson library and manual session-only objective remain available.
5. Restrict the ERP's public `uploads/photos` folder; the board already serves photos only to the signed-in class teacher.
6. Homework class/section IDs and a complete class-scoped feed instead of name matching against recent teacher items.

Admin APIs, admin-session api/academic_years.php and insufficiently authenticated api/v1/homework.php are not used.
