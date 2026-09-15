# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NestJS 11 + TypeORM + PostgreSQL API for the iTeach learning platform.

## Commands

```bash
npm run start:dev       # dev server with watch mode
npm run build           # production build (nest build → dist/)
npm run start:prod      # run the compiled dist/main

npm run lint            # eslint with autofix
npm run format          # prettier

npm test                # jest
npm run test:cov        # with coverage

npm run db:clear        # typeorm schema:drop — destructive
```

Jest is configured in `package.json` with `rootDir: src` and `testRegex: .*\.spec\.ts$`; specs are colocated with the unit under test. Run one file with `npx jest src/core/course/utils/task-answer.util.spec.ts`, or one case with `-t 'name'`.

Coverage is thin and deliberate — the specs cover pure logic and branch-heavy service paths (`task-answer.util`, `task-submission.service`, `enrollment.service`, `assessment.controller`), not controllers-with-a-database. `npm run test:e2e` **fails**: there is no `test/` directory and no `test/jest-e2e.json`.

## Environment

| Variable | Notes |
|---|---|
| `PORT` | HTTP port |
| `ENVIRONMENT` | `DEVELOPMENT` or `DEPLOYMENT`; anything else (including unset) resolves to `DEPLOYMENT`. See "Environment switches" below |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` | e.g. `1h` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` | e.g. `7d` |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TTS_MODEL` | Google Gemini |
| `GEMINI_TTS_VOICE` | optional, defaults to `Kore` |
| `GEMINI_PROXY_URL` | optional outbound proxy, applied process-wide via `undici.setGlobalDispatcher` |
| `ASSEMBLYAI_API_KEY` | handed to the student app by `GET /api/assessments/assembly-ai-key`; read with `getOrThrow`, so an unset key 500s that route only |
| `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` | Click Merchant API; the secret signs `sign_string` on the prepare/complete webhooks |
| `PAYME_MERCHANT_KEY` | Payme (Paycom) Merchant API; the password half of the `Basic` header Payme sends. Unset rejects every request with `-32504` |
| `PAYME_ACCOUNT_FIELD` | optional, defaults to `payment_id` — the account field name configured in the Payme cabinet |
| `ESKIZ_API_URL`, `ESKIZ_API_USER`, `ESKIZ_API_KEY` | Eskiz SMS gateway, used for sign-up / password-recovery OTP codes |
| `RESEND_API_KEY`, `RESEND_FROM` | Resend email gateway and verified sender, used for email OTP codes |
| `GOOGLE_SERVICES_JSON` | Firebase service account key for FCM push, as base64 or single-line raw JSON. Unset means push is skipped (warned once, never throws) |
| `OTP_MAX_PER_IP_PER_HOUR` | optional per-IP cap on `POST /auth/otp/send`; unset disables it (needs `trust proxy` behind a reverse proxy, otherwise all requests look like one IP) |
| `EXTERNAL_API_KEY` | shared secret other services send as `X-Auth` to reach `/api/external/*` |

`.env.example` is the source of truth for the list.

- TypeORM runs with `synchronize: true` — no migrations; schema is derived from entities on boot. Entity changes apply on restart, and removing a column drops it.
- The DataSource loads entities from `dist/**/*.entity.js`, so the app must be built (or running under `nest start`) before the DB is usable.
- `SnakeNamingStrategy` (`src/shared/config/snake-naming.strategy.ts`) maps camelCase properties to snake_case columns. Explicit `@Column({ name: ... })` wins — e.g. `Enrollment.start` → `start_date`.
- All REST routes carry the global prefix `/api`.
- Uploads land in `./uploads/` and are served statically at `/public/*`.

## Conventions

- **Comments and user-facing messages are written in Uzbek.** Exception messages (`throw new NotFoundException("To'lov topilmadi")`), log lines, and doc comments all follow this. Match it when adding code; identifiers and types stay in English.
- `@/` maps to `src/` (`tsconfig.json` paths). Use it for all internal imports, including within the same module.
- Module layout is `controllers/`, `services/`, `entity/`, `dto/`, `enum/`, `storage/`, `utils/` under `src/core/<feature>/`.
- Controllers are split by audience, not by resource: `admin-payment.controller.ts` serves `/api/admin/payments`, `payment.controller.ts` serves `/api/payments`. Same pattern for course, enrollment, material, plan, assignment (admin/student/teacher), and user (admin-student, admin-teacher, student, teacher).
- Prettier: single quotes, trailing commas, `printWidth: 120`.
- `strictNullChecks` is on but `noImplicitAny` is off; `@typescript-eslint/no-explicit-any`, `no-floating-promises`, and `no-unused-vars` are disabled in `eslint.config.mjs`.

## Architecture

### Environment switches

`src/shared/config/environment.config.ts` resolves `ENVIRONMENT` into `AppEnvironment`. `resolveEnvironment` returns `DEPLOYMENT` for **any** value other than a literal `DEVELOPMENT` (case-insensitive, trimmed) — an unset or misspelled variable must never hand a live server the fixed OTP. The resolved value is logged at boot.

| Behavior | `DEVELOPMENT` | `DEPLOYMENT` |
|---|---|---|
| OTP code (`AuthService.sendOtp`) | always `666666` | `crypto.randomInt` |
| Eskiz SMS (`EskizService.sendSms`) | skipped, message logged | sent |
| Request/response body logging (`LoggingInterceptor`) | on | off |

The gate lives at the outermost sensible layer in each case: `EskizService.sendSms` (so every caller, not just OTP, is covered) and a global `APP_INTERCEPTOR` that returns early. `LoggingInterceptor` redacts keys matching `password|token|secret|authorization|sign_string|fcmToken|apiKey` and truncates bodies at 2000 chars.

### Auth & authorization

`JwtAccessGuard` and `RolesGuard` are global `APP_GUARD` providers in `app.module.ts` — every route is authenticated by default.

- `@Public()` opts a handler or controller out of the JWT guard.
- `@Roles(UserRole.TEACHER)` restricts by role; without it, any authenticated user passes.
- `@CurrentUser()` injects the request user.

`RolesGuard` resolves roles with `getAllAndOverride`, so a method-level `@Roles` **replaces** the controller-level one rather than adding to it. `TaskSubmissionController` relies on this: the class is `@Roles(STUDENT)` and the admin read-through route re-declares `@Roles(ADMIN)`.

JWT payload is `{ sub: userId }`. `JwtAccessStrategy.validate` calls `UserService.findById`, which **does not return a `User` entity** — it strips the `student` / `teacher` / `admin` relations and returns a plain object with a `roles: UserRole[]` array. `RolesGuard` and `@CurrentUser()` both see that shape, so `user.roles` is an array, while `User.roles()` on the entity is a method.

Roles are not a column: a user has a role iff the corresponding one-to-one profile entity exists (`User.roles()` in `user.entity.ts`). New sign-ups get a `Student` profile.

Note the two id spaces. `User.id` is what a JWT carries and what `@CurrentUser()` yields; `Student.id` is the profile row. Admin-facing endpoints address students by **`Student.id`** (that is what the admin panel holds), student-facing ones by the authenticated user id — so `TaskSubmissionService` has both `getLessonResults(studentUserId, …)` and `getStudentLessonResults(studentId, …)`.

### User activity, analytics, and streaks

`GET /api/user/me` and `GET /api/students/me` record one `user_activities` row per authenticated user per UTC calendar day; `POST /api/user/me/activity` records it explicitly (any role) and returns `{ activityDate, hasCourse, recorded }`, where `recorded` is `false` if today's row already existed. A unique constraint on `(user, activityDate)` makes repeated calls—across any of these endpoints—idempotent. Each row carries `hasCourse`: whether the user had an active, unexpired enrolment when it was recorded. The upsert only ever raises it `false → true` within a day (buying a course mid-day counts), never back down.

`GET /api/stats/summary` keeps its flat `dau`/`wau`/`mau` totals and adds `activeCourseUserMetrics` / `activeCourselessUserMetrics` objects with the same three keys. The stats series returns `activeUserMetrics` alongside `activeCourseUserMetrics` and `activeCourselessUserMetrics`, all with the same `dau`/`wau`/`mau` shape. Within a bucket a user is a course user if **any** of their activity days in it had `hasCourse`, otherwise courseless — so the two splits always sum to the total. Rows recorded before the column existed default to `false`. Admin `GET /api/stats/summary` includes DAU (today), WAU (today plus the previous 6 days), and MAU (today plus the previous 29 days). `GET /api/stats/series` and the backwards-compatible `/timeseries` separate `businessMetrics` (new users/assignments/enrollments/mentors for the requested 7, 14, or 30 days) from `activeUserMetrics`: DAU has one point per elapsed day of the current UTC month, WAU uses consecutive seven-day buckets within the current month, and MAU has one point for each of the latest six calendar months.

`GET /api/user/me/streak` derives streaks from these daily rows. It returns `currentStreak`, `longestStreak`, `totalActiveDays`, `activeToday`, and `lastActiveDate`; a latest activity of yesterday still keeps the current streak alive until the user records today's activity.

### Sign-up / OTP

`AuthService` owns the OTP flow end to end (no separate OTP service). Registration and password recovery accept exactly one identity: `phoneNumber` or `email`. Codes are 6 digits from `crypto.randomInt`, stored in the `otps` table with a 5-minute TTL, purpose, used flag, and attempt count, and delivered through `NotificationService` to Eskiz (SMS) or Resend (email). A code is bound to its purpose, a resend invalidates older codes for that identity and purpose, and five wrong verification attempts invalidate the code. Three send limits stack: a 60s per-recipient resend cooldown, 5 sends per recipient per hour, and an optional per-IP hourly cap via `SlidingWindowLimiter` (in-memory, so it resets on restart and is per-process).

`POST /auth/otp/send` carries an optional `purpose` (`OtpPurpose`) that **defaults to `registration`**, which refuses a phone or email that is already taken; `recover` does not (password reset targets an existing account by definition). Because the default is the strict branch, a password-reset caller *must* send `purpose: "recover"` explicitly. "Taken" means *a user with that identity already has a `student` profile* — not merely that the user row exists. That distinction is load-bearing: `signUp` lets an existing teacher/admin account add a student role by supplying its password (`addStudentRole`), and a blanket existence check would make that branch unreachable.

The taken-phone check runs **after** `assertOtpAllowed`, so probing numbers to discover which are registered still burns the per-IP and per-phone budget. The rejection reuses `signUp`'s exact wording (`Bu telefon raqam allaqachon ro'yxatdan o'tgan`) so the two entry points can't drift apart.

### Payment & enrollment lifecycle

This is the most interconnected part of the codebase — `plan`, `payment`, and `enrollment` are coupled.

1. A `Plan` belongs to a `Course` and carries `price`, `month` (duration), and `hasMentor`. Courses have no price of their own.
2. `POST /api/payments/request { planId }` creates an `Enrollment` (`created`) and a `Payment` (`created`), and returns the active `PaymentType`s. Repeating the request reuses the pending payment, updating its plan/amount if the user picked a different plan.
3. `Payment.amount` snapshots `plan.price` at creation time, so later price changes don't affect pending or historical payments. Click amount verification compares against this snapshot.
4. Confirmation (`markPaid`) flips the enrollment to `active`, sets `start`/`end` (`end` defaults to `start + plan.month`), and appends an `EnrollmentHistory` row. Cancellation cascades to the enrollment.
5. Admins have **read-only** access to payments (`GET /api/admin/payments`, `GET /api/admin/payments/:id`) — there is no approve, reject, or delete endpoint. Payment status changes only through the Click webhooks. For cash/transfer cases, admins bypass payments entirely via `POST /api/admin/enrollments`, which opens an enrollment directly.

Re-purchasing an expired enrollment reuses the existing row: it is reset to `created` with null dates, and the previous term survives in `enrollment_histories`.

**Expiry is derived, not stored.** `EnrollmentStatus.ACTIVE` with an `end` date in the past is expired (`isEnrollmentExpired` in `enrollment/utils/enrollment.util.ts`); no job flips the column. Every read path that means "currently entitled" must apply that check itself — student-facing enrollment lists filter it out, and course-content access goes through `assertActiveEnrollmentForLesson`.

`PaymentType.url` is a **template** containing `$placeholder` tokens (`$paymentId`, `$userFullName`, `$amount`, `$courseTitle`, …) resolved per payment by `buildPaymentUrl` (`payment/utils/payment-url.util.ts`). Values are URI-encoded; unknown `$tokens` are left verbatim so template typos are visible. The stored template is never mutated — resolution happens on read.

### Click webhooks

`/api/payment/click/prepare` and `/complete` are `@Public()` — called by Click's servers, not clients. Authenticity rests entirely on the md5 `sign_string` check in `ClickService.verifySign`; if `CLICK_SECRET_KEY` is unset, all requests are rejected. Both directions are logged, never including the secret.

`merchant_trans_id` may be either a payment id or a user id depending on what the payment page puts in `transaction_param`, so lookup tries payment id first, then falls back to the user's pending payments.

### Payme webhooks

`/api/payment/payme` is a single `@Public()` JSON-RPC 2.0 endpoint carrying all seven Paycom methods (`CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`, `SetFiscalData`). Authenticity rests on the `Authorization: Basic base64("Paycom:<PAYME_MERCHANT_KEY>")` header, compared with `timingSafeEqual`; if the key is unset, all requests are rejected. The route is `@All()`, not `@Post()`, because the spec wants `-32300` for a non-POST rather than Nest's 404.

Payme drives a transaction across several calls and expects the *same* answer on repeats, so state lives in its own `payme_transactions` table (`transactionId` unique, `state` per the Paycom spec: `1` created, `2` performed, `-1`/`-2` cancelled) rather than on `Payment`. Amounts arrive in **tiyin** — compared against `payment.amount * 100`. Pending transactions expire after 12 hours.

The body is typed as an `interface` (not a DTO class) and read with `import type`, so the global `ValidationPipe` skips it: Payme expects every failure as an in-band JSON-RPC `error`, never an HTTP 400. The handler always returns HTTP 200.

Cancelling an **unpaid** transaction leaves the payment `created` so the student can retry and keep their enrollment progress; cancelling a **performed** one (refund) runs `markCancelled`, which also cancels the enrollment — unless the enrollment term has already elapsed (`isEnrollmentExpired`), which counts as the service being fully delivered and answers `-31007`.

Three details that are easy to get wrong and are load-bearing:

- `GetStatement` filters on `paymeTime` (Payme's own `time`), **not** the merchant-side `createTime` — reconciliation is keyed to Payme's clock.
- `PerformTransaction` skips `markPaid` when the payment is already `paid`, so a Payme retry after a half-completed write can't append a second `enrollment_histories` row or extend the term again.
- Unexpected exceptions answer `-32400` (system error), never `-31008` — the latter tells Payme the business state permanently forbids the operation, which would be wrong for a transient DB fault.

Fiscalization is opt-in per plan: `Plan.ikpu` / `packageCode` / `vatPercent` feed the optional `detail` receipt block on `CheckPerformTransaction`, and `detail` is omitted entirely when `ikpu` is empty. `receivers` and `additional` are deliberately not sent.

### Course content: tasks, submissions, progress, locks

A course is `Course → Unit → Lesson → Task`, ordered by an admin-set `index` with `createdAt` as tiebreak (`COURSE_ORDER` in `course.service.ts`). A `Task` holds its questions as a jsonb array of `{ question, options, answer }`.

`POST /api/task-submissions` grades in one `dataSource.transaction`; if any task id is unknown the whole submission rolls back rather than half-saving.

- **Grading is fuzzy.** `taskAnswersMatch` (`course/utils/task-answer.util.ts`) NFKC-normalizes, lowercases, and strips every non-letter (`\p{L}`) from both sides, so punctuation and spacing never fail a student. An empty correct answer matches nothing.
- **A task passes at 80%**, not 100% (`PASS_PERCENT`). The comparison is done in integers (`correct * 100 >= total * PASS_PERCENT`) to avoid float error at ratios like 16/20. A task with zero questions can never pass.
- **Rewards are once-only and race-safe.** Coins/points (`5`/`10`) are granted by `claimReward`, a conditional `UPDATE … WHERE is_correct AND NOT rewarded` whose `affected === 1` decides the grant — so concurrent submissions can't double-pay. The submission itself is an upsert on `(student_id, task_id)` that deliberately does not touch `rewarded`.
- **Lesson progress** is the share of that lesson's *answerable* tasks passed; tasks with an empty `questions` array are excluded from the denominator (`jsonb_array_length > 0`), so a lesson padded with contentless tasks can still reach 100.

**Sequential unlocking is currently switched off.** `LESSON_LOCKING_ENABLED` at the top of `course.service.ts` is `false`, so every lesson comes back `isLocked: false`. The field is still on the payload because clients read it, and the rule it encodes is intact: `withLessonsCount` marks a lesson locked when the **previous** lesson has tasks and its progress is under `LESSON_UNLOCK_PERCENT` (80); a previous lesson with no tasks never blocks, otherwise a video-only lesson would be an impassable wall. Flipping the constant to `true` restores it — `lockContext` also skips the progress and task-count aggregate queries while the flag is off, since nothing consumes them.

Correct answers are stripped from every student-facing response (`stripAnswer`). The one exception is the admin read-through, `GET /api/task-submissions/students/:studentId/lessons/:lessonId`, which returns `answer` alongside `studentAnswer` — an admin can't judge a result without the key. That route also **skips the enrollment check** on purpose, so an expired or cancelled enrollment's results stay readable; an unsubmitted task reports `isCorrect: null` rather than `false`.

Admins track a student through `GET /api/admin/enrollments/:enrollmentId/students/:studentId/progress`, which verifies the enrollment belongs to that student. `AdminEnrollmentController` is mounted at **both** `admin/enrollments` and `enrollments` for backwards compatibility; both paths are admin-only.

### External API

`/api/external/*` (student search, course/plan listing, direct enrollment, enrollment requests) is for other services — CRM, terminals, billing. It uses a shared secret instead of JWT: `@ApiKeyAuth()` composes `@Public()` (to skip the global JWT guard) with `ApiKeyGuard`, which compares the `X-Auth` header against `EXTERNAL_API_KEY` using `timingSafeEqual`. Rotating the key means editing `.env` and restarting; there is one key for all consumers.

External services have two ways to enrol a student, and they differ in who decides:

- `POST /api/external/enrollments` — immediate. The enrolment opens `active` in one call, no `Payment` row.
- `POST /api/external/pending-enrollments` — queued. Writes a `pending_enrollments` row (`user`, `course`, `start`, `end`, `status`) that an admin resolves via `PATCH /api/admin/pending-enrollments/:id/accept|reject`. The plan is deliberately *not* on the pending row: the admin picks `planId` when accepting, since price and duration are only settled then. Accepting runs inside one `dataSource.transaction` — enrolment `active`, an `enrollment_histories` row, and a `paid` `Payment` (`amount` defaults to `plan.price`) all commit together, which is why `EnrollmentService.createEnrollment` takes an optional `EntityManager`. Only a `created` request can be accepted or rejected, and repeating the external POST for the same user+course updates the queued row rather than adding a second one.

### Push notifications (FCM)

Three layers under `src/core/notification/`: `FirebaseService` is the transport (lazy `initializeApp` from `GOOGLE_SERVICES_JSON`, chunks tokens at FCM's 500-per-call limit), `PushService` decides the audience and calls it, and `push-message.util.ts` holds every user-visible string — all four events' Uzbek text lives in that one file.

Device tokens were already there: `Session.fcmToken`, one row per device. `PushService` reads them directly and **deletes** sessions FCM reports as `registration-token-not-registered` / `invalid-registration-token` / `invalid-argument`, so dead devices don't accumulate.

| Event | Fires from | Audience |
|---|---|---|
| `course_enrolled` | `EnrollmentService.createEnrollment`, `PaymentService.markPaid`, `PendingEnrollmentService.acceptPending` | the one student |
| `teacher_assigned` | `AssignmentService.accept` | the student whose offer was accepted |
| `course_created` | `CourseService.createCourse` / `updateCourse` | every user with a student profile |
| `lesson_added` | `LessonService.createLesson` | students with a live, unexpired enrolment in that course |

Four things that are load-bearing:

- **Push never breaks the business action.** `PushService` methods swallow their own errors, so call sites use `void` and never await. A missing key, a network fault, or a bad token cannot fail an enrolment, a payment webhook, or a lesson upload.
- **`createEnrollment` skips the push when it runs inside a caller's transaction** (`manager` is set), because the rows may not be committed yet. `acceptPending` sends after its transaction commits instead — otherwise a rollback would still have notified the student.
- **"New course" is announced when the course becomes *visible*, not when the row is inserted.** Courses default to `isActive: false`, so announcing on insert would advertise drafts. `Course.announcedAt` records the broadcast, so toggling a course off and on again does not re-spam every student.
- Payloads carry `data.event` plus the relevant id (`courseId` / `assignmentId`) for deep-linking; FCM data values must be strings.

Beyond those automatic events, admins send messages by hand through `POST /api/admin/notifications/push` (`AdminPushController`, admin-only). `audience` is **required** — `all`, `students`, `teachers`, or `phones` with a `phoneNumbers` list — so a blast to everyone can never be the result of a forgotten field. The same endpoint covers one recipient and a mass send; "individual" is just a one-element `phones` list.

Manual pushes accept `isPermanent` (default `false`). When true, one `user_notifications` row is stored per resolved user even if that user has no active device session. Course-enrollment notifications are always permanent. New rows default to `isRead: false`. Students read their history through paginated `GET /api/notifications`, unread rows through `GET /api/notifications/unread`, and mark an owned row through `PATCH /api/notifications/:id/read`; rows are newest-first and contain the push title, body, and `data` payload used for deep-linking.

Two things distinguish the manual path from the event path. It **awaits** the send and returns a report (`devices`, `sent`, `failed`, `removedTokens`), and for `phones` it splits the misses into `notFound` (no such user) and `withoutDevice` (user exists, never opened the app) — an admin needs to tell a wrong number from an uninstalled app. And it answers **503** when `GOOGLE_SERVICES_JSON` is missing or unparseable, instead of the silent skip the event path uses: a human who pressed Send deserves an error, not a report of zero. Because delivery happens inside the request, a very large audience makes for a long request; chunks of 500 go sequentially.

Unlike Eskiz SMS, push is **not** gated on `ENVIRONMENT` — a dev box sends real pushes to whatever tokens its own database holds. FCM costs nothing per message and dev usually points at a separate database, so the gate would only make the feature untestable.

### WebSocket gateways

Two Socket.io namespaces, each authenticating from `handshake.auth.token` or an `Authorization: Bearer` header:

- `/chat` — room-based messaging; the gateway persists via `ChatService`, then broadcasts.
- `/match` — in-memory peer matchmaking; paired users exchange WebRTC signals. Match state is never persisted — only the resulting `Call` record is.

### Live lessons

`src/core/live-lesson/` covers scheduled 1:1 sessions between a teacher and their assigned student — a `LiveLesson` (name, `meetLink`, start/end) hangs off an `Assignment`, and every mutation re-checks that the assignment belongs to the calling teacher. Recordings are a separate entity and controller (`/api/live-lesson-recordings`) with their own upload storage. This is unrelated to `Lesson` under `course/`, which is prerecorded course content.

### Assessment (AI speaking partner)

Students `POST /api/assessments/conversations/:id/messages` with an audio clip. `AssessmentService` sends it to `GeminiService.converse()` (returns transcript + reply), then `synthesizeSpeech()` renders the reply (raw PCM wrapped as WAV). Uploads go to `uploads/assessment-input/`, generated audio to `uploads/assessment-output/`. The persona prompt lives at the top of `gemini.service.ts`; the model is instructed to stay in character as a human, never a bot.

`GET /api/assessments/assembly-ai-key` hands the student app the raw `ASSEMBLYAI_API_KEY` for on-device streaming transcription. It is student-authenticated, and `apiKey` is in the `LoggingInterceptor` redaction list so the response body never reaches the logs.

### File uploads

Each module that accepts files has a `storage/*.storage.ts` defining a `multer.diskStorage` destination (created with `mkdirSync` at import time), a UUID filename, an optional mime filter, and a path helper (`toMaterialPath`, `toAvatarPath`, …) that produces the public URL. `uploads/` maps to `/public/`.

Admin lesson media can be replaced with `PATCH /api/admin/courses/:courseId/units/:unitId/lessons/:lessonId/media` or removed without deleting the lesson through `DELETE` on the same path. Replacement, media deletion, and lesson deletion clean up locally managed `/lesson/*` files after the database write; cleanup is path-restricted and a filesystem failure is logged without reverting the database result.

## Docs

`docs/` holds hand-written API guides, mostly in Uzbek. Keep them in sync when changing the endpoints they describe:

- `payment-api.md` — client-facing plan → payment → Click flow with status tables
- `external-api.md` — the `X-Auth` API
- `task-submission-api.md` — task submission reads, including the admin read-through
- `student-enrollment-pogress-track-for-admin.md` — admin progress endpoint (filename typo is intentional; it is the committed name)
- `privacy-policy.html` — served as-is
