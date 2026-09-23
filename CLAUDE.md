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
| `FILES_BASE_URL` | required; public base URL uploaded files are served from, e.g. `http://localhost:8000` — read with `getOrThrow` by `expandFileUrls` (`FileUrlInterceptor` for HTTP, `ChatGateway`/`MatchGateway` for their Socket.io emits), but only once a string is found that actually needs expanding, so an unset value only breaks the response/emit that contains one |
| `ENVIRONMENT` | `DEVELOPMENT` or `DEPLOYMENT`; anything else (including unset) resolves to `DEPLOYMENT`. See "Environment switches" below |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` | e.g. `1h` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` | e.g. `7d` |
| `ASSEMBLYAI_API_KEY` | handed to the student app by `GET /api/student/assessments/assembly-ai-key`; read with `getOrThrow`, so an unset key 500s that route only |
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
- All REST routes carry the global prefix `/api/v{N}`, `N` a hardcoded `API_VERSION` constant at the top of `main.ts` (not an env var — bump it and redeploy to cut a new version) — every path in this file omits the version segment for brevity, so `/api/student/me` below means `/api/v{N}/student/me` on the wire. Every authenticated route additionally carries a role segment — `/api/student/...`, `/api/mentor/...`, `/api/admin/...` — matching `UserRole`'s values. Routes with no authenticated role stay unprefixed: `/api/auth/*` (pre-login), `/api/external/*` (`X-Auth` key, not JWT), `/api/payment/click/*` and `/api/payment/payme` (provider webhooks), `/api/app-reports` (no auth at all, see "App reports" below).
- A handler usable by more than one role is a controller mounted at more than one prefix (`@Controller(['student/chat', 'mentor/chat', 'admin/chat'])`), not a single unprefixed path. Where a shared route would collide with a role's own dedicated endpoint over the same data (e.g. the read-only student/mentor plan and material lists vs. `admin-plan`/`admin-material`'s fuller CRUD versions), the shared controller simply isn't mounted under that role's prefix — the dedicated one already covers it as a superset.
- Uploads land in `./uploads/` and are served statically at `/public/*`.

## Conventions

- **No comments in code.** The codebase carries none — do not add any, including JSDoc. Let names and structure carry the explanation.
- **User-facing messages are written in Uzbek.** Exception messages (`throw new NotFoundException("To'lov topilmadi")`) and log lines follow this. Match it when adding code; identifiers and types stay in English.
- `@/` maps to `src/` (`tsconfig.json` paths). Use it for all internal imports, including within the same module.
- Module layout is `controllers/`, `services/`, `entity/`, `dto/`, `enum/`, `storage/`, `utils/` under `src/core/<feature>/`.
- Controllers are split by audience, not by resource: `admin-payment.controller.ts` serves `/api/admin/payments`, `payment.controller.ts` serves `/api/student/payments`. Same pattern for course, enrollment, material, plan, group, live-lesson (admin/student/mentor), and user (admin-student, admin-mentor, student, mentor). A controller that mixed two audiences under one path via per-method `@Roles` overrides (the old `course.controller.ts`, `task-submission.controller.ts`, `mentor.controller.ts`, `live-lesson.controller.ts`, `live-lesson-recording.controller.ts`) has been split one file per audience instead, since a class can't live at two role-prefixed base paths for different methods.
- Prettier: single quotes, trailing commas, `printWidth: 120`.
- `strictNullChecks` is on but `noImplicitAny` is off; `@typescript-eslint/no-explicit-any`, `no-floating-promises`, and `no-unused-vars` are disabled in `eslint.config.mjs`.
- **Every `GET` that returns a list of items must be paginated** — `@Query() query: PaginationQuery` (or a subclass adding filters/sort, e.g. `MentorQuery`, `GroupQuery`) on the controller, `Promise<Paginated<T>>` from the service, built with `paginate(data, total, query)` (`src/common/dto/pagination-query.dto.ts`), never a bare array. This applies to new endpoints too, no matter how small or admin-curated the list looks today — "it's always small" is exactly the assumption that stops holding once real data accumulates, and retrofitting pagination later is a breaking response-shape change for every existing client. The one common wrinkle: if a list gets filtered *after* the DB fetch (e.g. excluding courses a student already owns, or an application-layer expiry check that can't be pushed into `WHERE`), paginating the DB query directly can return a page with fewer than `limit` items even when more exist beyond it — filter first, *then* paginate the final in-memory array with `paginateInMemory(items, query)` (same file), as `EnrollmentService.getAvailableCourses`/`getMyCourses` and `CourseService.findActiveCoursesPaginated` do.

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

There is no `User` entity. `Student`, `Mentor`, and `Admin` (`src/core/user/entity/`) are three fully independent accounts, each owning its own login credentials — one account, one role, permanently. A person needing two roles gets two separate accounts; there is no mechanism to add a second role to an existing login. Only `Student` has both `email` and `phoneNumber`; `Mentor` has `phoneNumber` only (no email login), `Admin` has `email` only (no phone login) — all three otherwise share `firstName`, `lastName`, `avatar`, `password`, `isActive`.

`JwtAccessGuard` and `RolesGuard` are global `APP_GUARD` providers in `app.module.ts` — every route is authenticated by default.

- `@Public()` opts a handler or controller out of the JWT guard.
- `@Roles(UserRole.MENTOR)` restricts by role; without it, any authenticated user passes.
- `@CurrentUser()` injects the request user, typed `AuthUser` (`src/common/utils/role-owner.util.ts`): `{ id, role, firstName, lastName, avatar, email, phoneNumber, isActive }` — `email`/`phoneNumber` are `null` for a role whose entity doesn't have that column (see above), not just when unset.

`RolesGuard` resolves roles with `getAllAndOverride`, so a method-level `@Roles` **replaces** the controller-level one rather than adding to it. `TaskSubmissionController` relies on this: the class is `@Roles(STUDENT)` and the admin read-through route re-declares `@Roles(ADMIN)`.

JWT payload is `{ sub: id, role }`. `JwtAccessStrategy.validate` calls `UserService.findAuthUser(id, role)`, which looks the id up in whichever of `Student`/`Mentor`/`Admin` the role points at and returns an `AuthUser`. `RolesGuard` checks `requiredRoles.includes(user.role)` — `role` is singular, not an array.

Because each role is its own table with its own primary key, the id in the JWT **is** the row id — `Student.id` for a student token, no separate "user id" to join through. Every service that used to resolve "the JWT id" into "the profile row" now just uses the id directly (e.g. `EnrollmentService.getMyCourses(studentId)`, `TaskSubmissionService.getLessonResults(studentId, …)`). The one place two id spaces still matter is `AuthService.signIn`: since `Student`/`Mentor`/`Admin` are separate tables, sign-in tries every role that could plausibly own the given identity — an email search checks `Student` then `Admin` (skipping `Mentor`, which has no email column); a phone search checks `Student` then `Mentor` (skipping `Admin`).

### User activity, analytics, and streaks

`GET /api/student/me` records one `activities` row (`StudentActivity`, `user/entity/student-activity.entity.ts`) per authenticated student per UTC calendar day; `POST /api/student/me/activity` records it explicitly and returns `{ activityDate, hasCourse, recorded }`, where `recorded` is `false` if today's row already existed. `student.controller.ts`, `mentor.controller.ts`, and `admin.controller.ts` all still have a `me`/`me/avatar` pair, but activity tracking itself is **student-only**: `mentor.controller.ts`/`admin.controller.ts` have no `me/activity` or `me/streak` routes, and their `me` has no recording side effect — only `student.controller.ts`'s does. `StudentActivity` has a single required `student` FK, not the nullable student/mentor/admin trio other owner-pattern tables use — there's nothing to disambiguate since only a student can ever have a row. A unique constraint on `(student, activityDate)` makes repeated calls — across `me` and `me/activity` — idempotent. Each row carries `hasCourse`: whether the student had an active, unexpired enrolment when it was recorded. The upsert only ever raises it `false → true` within a day (buying a course mid-day counts), never back down.

**"Users" in stats means students only** — `mentors` is already its own separate business metric, and admins were never counted here. `GET /api/admin/stats/summary`'s `users` is `COUNT(*) FROM students`, and every DAU/WAU/MAU query (`StatsService`) reads straight from `activities`, which can only ever hold student rows now that mentors/admins have no activity tracking at all.

`GET /api/admin/stats/summary` keeps its flat `dau`/`wau`/`mau` totals and adds `activeCourseUserMetrics` / `activeCourselessUserMetrics` objects with the same three keys. The stats series returns `activeUserMetrics` alongside `activeCourseUserMetrics` and `activeCourselessUserMetrics`, all with the same `dau`/`wau`/`mau` shape. Within a bucket a user is a course user if **any** of their activity days in it had `hasCourse`, otherwise courseless — so the two splits always sum to the total. Rows recorded before the column existed default to `false`. Admin `GET /api/admin/stats/summary` includes DAU (today), WAU (today plus the previous 6 days), and MAU (today plus the previous 29 days). `GET /api/admin/stats/series` and the backwards-compatible `/timeseries` separate `businessMetrics` (`{ date, users, enrollments }` per day — new students and new enrollments only, for the requested 7, 14, or 30 days) from `activeUserMetrics`: DAU has one point per elapsed day of the current UTC month, WAU uses consecutive seven-day buckets within the current month, and MAU has one point for each of the latest six calendar months.

`GET /api/student/me/streak` derives streaks from these daily rows. It returns `currentStreak`, `longestStreak`, `totalActiveDays`, `activeToday`, and `lastActiveDate`; a latest activity of yesterday still keeps the current streak alive until the user records today's activity.

### Sign-up / OTP

`AuthService` owns the OTP flow end to end (no separate OTP service). Registration and password recovery accept exactly one identity: `phoneNumber` or `email`. Codes are 6 digits from `crypto.randomInt`, stored in the `otps` table with a 5-minute TTL, purpose, used flag, and attempt count, and delivered through `NotificationService` to Eskiz (SMS) or Resend (email). A code is bound to its purpose, a resend invalidates older codes for that identity and purpose, and five wrong verification attempts invalidate the code. Three send limits stack: a 60s per-recipient resend cooldown, 5 sends per recipient per hour, and an optional per-IP hourly cap via `SlidingWindowLimiter` (in-memory, so it resets on restart and is per-process).

`POST /auth/otp/send` carries an optional `purpose` (`OtpPurpose`) that **defaults to `registration`**, which refuses a phone or email that is already taken; `recover` does not (password reset targets an existing account by definition). Because the default is the strict branch, a password-reset caller *must* send `purpose: "recover"` explicitly. "Taken" means *a `Student` row already exists with that identity* — `signUp` only ever creates a `Student`, so only the `Student` table is checked (`UserService.hasStudentProfile(ByEmail)`); a phone or email already in use by a `Mentor` or `Admin` account does not block registration, since those are unrelated accounts.

The taken-phone check runs **after** `assertOtpAllowed`, so probing numbers to discover which are registered still burns the per-IP and per-phone budget. The rejection reuses `signUp`'s exact wording (`Bu telefon raqam allaqachon ro'yxatdan o'tgan`) so the two entry points can't drift apart.

### Payment & enrollment lifecycle

This is the most interconnected part of the codebase — `plan`, `payment`, and `enrollment` are coupled.

1. A `Plan` belongs to a `Course` and carries `price`, `month` (duration), and `hasMentor`. Courses have no price of their own.
2. `POST /api/student/payments/request { planId }` creates an `Enrollment` (`created`) and a `Payment` (`created`), and returns the active `PaymentType`s. Repeating the request reuses the pending payment, updating its plan/amount if the user picked a different plan.
3. `Payment.amount` snapshots `plan.price` at creation time, so later price changes don't affect pending or historical payments. Click amount verification compares against this snapshot.
4. Confirmation (`markPaid`) flips the enrollment to `active`, sets `start`/`end` (`end` defaults to `start + plan.month`), and appends an `EnrollmentHistory` row. Cancellation cascades to the enrollment.
5. Admins have **read-only** access to payments (`GET /api/admin/payments`, `GET /api/admin/payments/:id`) — there is no approve, reject, or delete endpoint. Payment status changes only through the Click webhooks. For cash/transfer cases, admins bypass payments entirely via `POST /api/admin/enrollments`, which opens an enrollment directly.

Re-purchasing an expired enrollment reuses the existing row: it is reset to `created` with null dates, and the previous term survives in `enrollment_histories`.

**Expiry is derived, not stored.** `EnrollmentStatus.ACTIVE` with an `end` date in the past is expired (`isEnrollmentExpired` in `enrollment/utils/enrollment.util.ts`); no job flips the column. Every read path that means "currently entitled" must apply that check itself — student-facing enrollment lists filter it out, and course-content access goes through `assertActiveEnrollmentForLesson`.

`PaymentType.url` is a **template** containing `$placeholder` tokens (`$paymentId`, `$userFullName`, `$amount`, `$courseTitle`, …) resolved per payment by `buildPaymentUrl` (`payment/utils/payment-url.util.ts`). Values are URI-encoded; unknown `$tokens` are left verbatim so template typos are visible. The stored template is never mutated — resolution happens on read.

### Click webhooks

`/api/payment/click/prepare` and `/complete` are `@Public()` — called by Click's servers, not clients. Authenticity rests entirely on the md5 `sign_string` check in `ClickService.verifySign`; if `CLICK_SECRET_KEY` is unset, all requests are rejected. Both directions are logged, never including the secret.

`merchant_trans_id` may be either a payment id or a student id (`Payment.student`) depending on what the payment page puts in `transaction_param`, so lookup tries payment id first, then falls back to that student's pending payments.

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

`POST /api/student/task-submissions` grades in one `dataSource.transaction`; if any task id is unknown the whole submission rolls back rather than half-saving.

- **Grading is fuzzy.** `taskAnswersMatch` (`course/utils/task-answer.util.ts`) NFKC-normalizes, lowercases, and strips every non-letter (`\p{L}`) from both sides, so punctuation and spacing never fail a student. An empty correct answer matches nothing.
- **A task passes at 80%**, not 100% (`PASS_PERCENT`). The comparison is done in integers (`correct * 100 >= total * PASS_PERCENT`) to avoid float error at ratios like 16/20. A task with zero questions can never pass.
- **Rewards are once-only and race-safe.** Coins/points (`5`/`10`) are granted by `claimReward`, a conditional `UPDATE … WHERE is_correct AND NOT rewarded` whose `affected === 1` decides the grant — so concurrent submissions can't double-pay. The submission itself is an upsert on `(student_id, task_id)` that deliberately does not touch `rewarded`.
- **Lesson progress** is the share of that lesson's *answerable* tasks passed; tasks with an empty `questions` array are excluded from the denominator (`jsonb_array_length > 0`), so a lesson padded with contentless tasks can still reach 100.

**Sequential unlocking is currently switched off.** `LESSON_LOCKING_ENABLED` at the top of `course.service.ts` is `false`, so every lesson comes back `isLocked: false`. The field is still on the payload because clients read it, and the rule it encodes is intact: `withLessonsCount` marks a lesson locked when the **previous** lesson has tasks and its progress is under `LESSON_UNLOCK_PERCENT` (80); a previous lesson with no tasks never blocks, otherwise a video-only lesson would be an impassable wall. Flipping the constant to `true` restores it — `lockContext` also skips the progress and task-count aggregate queries while the flag is off, since nothing consumes them.

Correct answers are stripped from every student-facing response (`stripAnswer`). The one exception is the admin read-through, `GET /api/admin/task-submissions/students/:studentId/lessons/:lessonId` (`admin-task-submission.controller.ts`, split out from the student-facing `task-submission.controller.ts` since it's the only admin-only method in that resource), which returns `answer` alongside `studentAnswer` — an admin can't judge a result without the key. That route also **skips the enrollment check** on purpose, so an expired or cancelled enrollment's results stay readable; an unsubmitted task reports `isCorrect: null` rather than `false`.

Admins track a student through `GET /api/admin/enrollments/:enrollmentId/students/:studentId/progress`, which verifies the enrollment belongs to that student.

### External API

`/api/external/*` (student search, course/plan listing, direct enrollment, enrollment requests) is for other services — CRM, terminals, billing. It uses a shared secret instead of JWT: `@ApiKeyAuth()` composes `@Public()` (to skip the global JWT guard) with `ApiKeyGuard`, which compares the `X-Auth` header against `EXTERNAL_API_KEY` using `timingSafeEqual`. Rotating the key means editing `.env` and restarting; there is one key for all consumers.

External services have two ways to enrol a student, and they differ in who decides:

- `POST /api/external/enrollments` — immediate. The enrolment opens `active` in one call, no `Payment` row.
- `POST /api/external/pending-enrollments` — queued. Writes a `pending_enrollments` row (`student`, `course`, `start`, `end`, `status`) that an admin resolves via `PATCH /api/admin/pending-enrollments/:id/accept|reject`. The plan is deliberately *not* on the pending row: the admin picks `planId` when accepting, since price and duration are only settled then. Accepting runs inside one `dataSource.transaction` — enrolment `active`, an `enrollment_histories` row, and a `paid` `Payment` (`amount` defaults to `plan.price`) all commit together, which is why `EnrollmentService.createEnrollment` takes an optional `EntityManager`. Only a `created` request can be accepted or rejected, and repeating the external POST for the same student+course updates the queued row rather than adding a second one. The DTO field is still called `userId` (kept for external-client compatibility) but now resolves directly to `Student.id` — there's no separate user id to distinguish it from.

### Push notifications (FCM)

Three layers under `src/core/notification/`: `FirebaseService` is the transport (lazy `initializeApp` from `GOOGLE_SERVICES_JSON`, chunks tokens at FCM's 500-per-call limit), `PushService` decides the audience and calls it, and `push-message.util.ts` holds every user-visible string — all four events' Uzbek text lives in that one file.

Device tokens were already there: `Session.fcmToken`, one row per device. `Session`, `StudentActivity`, and `StudentNotification` are all **student-only** now — a single required `student` FK each, not a nullable student/mentor/admin trio; `ChatMessage` is the one remaining table using that trio (its sender can be any of the three roles, per the Groups chat model above). `SessionController` is mounted only at `student/sessions`, and `PushService` looks up tokens by `session.student` alone. `PushService` reads sessions directly and **deletes** ones FCM reports as `registration-token-not-registered` / `invalid-registration-token` / `invalid-argument`, so dead devices don't accumulate.

| Event | Fires from | Audience |
|---|---|---|
| `course_enrolled` | `EnrollmentService.createEnrollment`, `PaymentService.markPaid`, `PendingEnrollmentService.acceptPending` | the one student |
| `course_created` | `CourseService.createCourse` / `updateCourse` | every student |
| `lesson_added` | `LessonService.createLesson` | students with a live, unexpired enrolment in that course |
| `group_joined` | `GroupService.addStudents`, `GroupService.swapStudent` | the student(s) newly placed in that group |
| `live_lesson_created` | `LiveLessonService.create` | every student currently in that group |

Four things that are load-bearing:

- **Push never breaks the business action.** `PushService` methods swallow their own errors, so call sites use `void` and never await. A missing key, a network fault, or a bad token cannot fail an enrolment, a payment webhook, or a lesson upload.
- **`createEnrollment` skips the push when it runs inside a caller's transaction** (`manager` is set), because the rows may not be committed yet. `acceptPending` and `GroupService.addStudents`/`swapStudent` all send after their transaction commits instead — otherwise a rollback would still have notified the student.
- **"New course" is announced when the course becomes *visible*, not when the row is inserted.** Courses default to `isActive: false`, so announcing on insert would advertise drafts. `Course.announcedAt` records the broadcast, so toggling a course off and on again does not re-spam every student.
- Payloads carry `data.event` plus the relevant id (`courseId` or `groupId`) for deep-linking; FCM data values must be strings.

Beyond those automatic events, admins send messages by hand through `POST /api/admin/notifications/push` (`AdminPushController`, admin-only). `audience` is **required** — `all`, `students`, `mentors`, or `phones` with a `phoneNumbers` list — so a blast to everyone can never be the result of a forgotten field. The same endpoint covers one recipient and a mass send; "individual" is just a one-element `phones` list. `phones` only searches `Student` and `Mentor` — admins are never a phone-targeted push audience.

Manual pushes accept `isPermanent` (default `false`). When true, one `notifications` row (`StudentNotification`) is stored per resolved user even if that user has no active device session — but only for students, since `StudentNotification` has no mentor/admin column: `savePermanent` filters the resolved audience down to students before inserting, so a manual push to `mentors` or `all` still reaches mentor devices live but leaves no history row for them. Course-enrollment, group-joined, and live-lesson-created notifications are always permanent (all student-only events). New rows default to `isRead: false`. Students read their history through paginated `GET /api/student/notifications`, unread rows through `GET /api/student/notifications/unread`, and mark an owned row through `PATCH /api/student/notifications/:id/read`; rows are newest-first and contain the push title, body, and `data` payload used for deep-linking.

Two things distinguish the manual path from the event path. It **awaits** the send and returns a report (`devices`, `sent`, `failed`, `removedTokens`), and for `phones` it splits the misses into `notFound` (no such user) and `withoutDevice` (user exists, never opened the app) — an admin needs to tell a wrong number from an uninstalled app. And it answers **503** when `GOOGLE_SERVICES_JSON` is missing or unparseable, instead of the silent skip the event path uses: a human who pressed Send deserves an error, not a report of zero. Because delivery happens inside the request, a very large audience makes for a long request; chunks of 500 go sequentially.

Unlike Eskiz SMS, push is **not** gated on `ENVIRONMENT` — a dev box sends real pushes to whatever tokens its own database holds. FCM costs nothing per message and dev usually points at a separate database, so the gate would only make the feature untestable.

### WebSocket gateways

Two Socket.io namespaces, each authenticating from `handshake.auth.token` or an `Authorization: Bearer` header:

- `/chat` — room-based messaging; the gateway persists via `ChatService`, then broadcasts. Every room is a group's chat (see "Groups" below) — there is no other kind of room.
- `/match` — in-memory peer matchmaking; paired users exchange WebRTC signals. Match state is never persisted — only the resulting `Call` record is.

### Live lessons

`src/core/live-lesson/` is a **create-only broadcast**, not a schedulable resource — a `LiveLesson` is just `name` + `meetLink` (plus its `group` and `mentor` FKs and `createdAt`; no `startTime`/`endTime`, no update or delete). `POST mentor/live-lessons` is the only mentor route, and `LiveLessonService.create` requires the calling mentor to currently hold the `primary` `GroupMentor` role for the target group — this is the "go live now" action, not a calendar booking. Right after saving, it fires `PushService.notifyLiveLessonCreated` (`void`, never awaited — same "push never breaks the business action" rule as everywhere else) to every student currently in that group. Students only ever want *right now*: `GET student/live-lessons/latest` returns the single newest `LiveLesson` for the student's current group (`null` if ungrouped or none yet) — there's no list/history endpoint. Recordings are a separate, unrelated entity keyed by `group` the same way (`mentor/live-lesson-recordings` to upload, `student/live-lesson-recordings` to read, with pagination/history intact there) with their own upload storage. This whole module is unrelated to `Lesson` under `course/`, which is prerecorded course content.

There is no more student-initiated pairing — the `assignment` module (student picks a mentor and books a slot against the mentor's published schedule) has been removed entirely, along with `Mentor.schedule`. A student's mentor relationship now exists only through their current `Group` membership; `LiveLesson`/`LiveLessonRecording` moved from `Assignment` to `Group` accordingly.

### Groups

`src/core/group/` is now the **only** mentor↔student pairing mechanism — a named cohort (`Group`:
`title`, `schedule` — a `Record<Weekday, string[]>` validated only for weekday keys and non-empty
string values (`validateGroupScheduleShape`, `group/utils/group-schedule.util.ts`); the time
values themselves are free text, not matched against any booking slots — `isActive`) with a small
mentor team and a student roster, fully admin-managed at `admin/groups`. `LiveLesson` and
`LiveLessonRecording` (see "Live lessons" below) hang off `Group`.

A student is in **at most one group at a time** — `Student.group` is a direct nullable FK, the
single source of truth for "current group." `GroupMembership` is an append-only history log
(`group`, `student`, `joinedAt`, `leftAt`) mirroring `Enrollment` / `EnrollmentHistory`: the FK
says where a student is *now*, the log says how they got there. `GroupMentor` is the mentor-side
join table, one row per `(group, mentor)` with a `role` of `primary` or `support` — a partial
unique index (`role = 'primary'`) keeps at most one primary per group at the DB level, on top of
`GroupService.assignPrimaryMentor` replacing whichever row currently holds that role (promoting an
existing support-mentor row rather than erroring on the `(group, mentor)` uniqueness if that
mentor is already on the team).

`Mentor.role` (same `GroupMentorRole` enum, `group/enum/group-mentor-role.enum.ts` — reused
directly rather than duplicated) is a fixed classification set on the mentor's own profile
(replaces the old free-text `profession` field), independent of any one group. It gates group
assignment: `assignPrimaryMentor` rejects a mentor whose `role` isn't `primary`, and
`addSupportMentor` rejects one whose `role` isn't `support` — a mentor's global classification and
their per-group `GroupMentor.role` always agree, so a `support`-classified mentor can never become
a group's primary regardless of team composition.

Three controllers, one per audience, all in this module (same split as `course`/`live-lesson`):
`admin-group.controller.ts` (`admin/groups` — create, activate/deactivate, add/remove/swap
students, assign primary mentor, add/remove mentors; `GET admin/groups` fetches every page's
`GroupMentor` primary rows in one extra query and attaches each group's `primaryMentor` — `null`
if unassigned — rather than the fuller per-team `mentors` array `GET admin/groups/:id` returns),
`student-group.controller.ts` (`GET student/groups/me`, `null` if ungrouped),
`mentor-group.controller.ts` (paginated `GET mentor/groups/me`, every group that mentor is primary
or support for — same `Group & primaryMentor` shape `GET admin/groups` returns, plus the calling
mentor's own `role` in each group; `GET mentor/groups/:id` returns the same full detail
`GET admin/groups/:id` does — mentors/students, not just `primaryMentor` — but 403s unless the
caller is on that group's team, primary or support).

"Add" a student only works if they currently have no group (`400` otherwise, naming the student) —
moving an already-placed student is "swap" (`PATCH admin/groups/:id/students/:studentId/swap`,
body `{ toGroupId }`), which closes the old `GroupMembership` row and opens a new one in the same
transaction as the FK update. "Remove" only works for a student currently in that specific group.

**Chat is a property of the group, not a separately managed resource.** `GroupService.createGroup`
calls `ChatService.createRoomForGroup` right after saving the row, so every group gets exactly one
`ChatRoom` (`chat/entity/chat-room.entity.ts`, a `OneToOne` on `group`) the moment it's created —
there's no admin action to open or close a room, and it outlives membership churn instead of being
recreated per pairing. `ChatService` has no `ChatMember` table to keep in sync as the roster
changes; access is derived on every call, the same "derived, not stored" approach
`isEnrollmentExpired` uses for enrollments — a student may read/send iff `Student.group` currently
points at that room's group, a mentor iff they hold the `primary` `GroupMentor` row for it (a
`support` mentor has **no** access, read or write), and any admin always passes (no membership row
needed, unlike the other two roles). `ChatService.hasAccess` is the single gate every read and
write method calls, so promoting/demoting a mentor or moving a student immediately changes who can
use the room, with nothing left to reconcile.

`addStudents` and `swapStudent` each fire a `group_joined` push (see "Push notifications" above)
for every student newly placed in a group, after their transaction commits.

### Assessment (speaking practice)

There is no server-side AI conversation anymore — Gemini (`GeminiService`, the `converse`/`synthesizeSpeech` round-trip, and the `Conversation`/`ConversationMessage` entities that backed it) has been removed entirely. `src/core/assessment/` is now a single route: `GET /api/student/assessments/assembly-ai-key` hands the student app the raw `ASSEMBLYAI_API_KEY` for on-device streaming transcription — AssemblyAI does the speech-to-text work directly on the client, with nothing round-tripping through this API. It is student-authenticated, and `apiKey` is in the `LoggingInterceptor` redaction list so the response body never reaches the logs.

`AssessmentController` has no service or entities behind it — just `ConfigService`. The `conversations` / `conversation_messages` tables from the old Gemini flow are orphaned in the database (`synchronize: true` adds/alters columns for known entities but never drops a table whose entity was deleted) — they're safe to drop by hand if wanted, nothing reads or writes them anymore.

### App reports

`src/core/app-report/` is a single `@Public() POST /api/app-reports` endpoint (`device`, `message`) for the mobile app to self-report crashes/bugs — reachable even from a crash screen before sign-in, so it isn't behind the JWT guard like everything else. `AppReport.userId` is a plain nullable string column, not a relation — there's no per-role FK here because the caller may not be authenticated at all. Since `@Public()` skips `JwtAccessGuard` entirely, `@CurrentUser()` never populates; `AppReportService` instead reads the raw `Authorization` header itself and tries `JwtService.verifyAsync` against it, filling `userId` from the token's `sub` on success and leaving it `null` on a missing/invalid/expired token rather than rejecting the request — a broken or absent token should never stop a report from being saved. There is currently no read endpoint for these rows.

### File uploads

Each module that accepts files has a `storage/*.storage.ts` defining a `multer.diskStorage` destination (created with `mkdirSync` at import time), a UUID filename, an optional mime filter, and a path helper (`toMaterialPath`, `toAvatarPath`, …) that produces the *relative* path stored in the DB column — no leading slash, e.g. `avatar/<uuid>.png`. `uploads/` maps to `/public/`.

That relative path never reaches a client as-is. `expandFileUrls` (`src/common/utils/file-url.util.ts`) walks any JSON-shaped value recursively and rewrites any string matching `<known-upload-folder>/<uuid>.<ext>` into `{FILES_BASE_URL}/public/<path>` — so `Student.avatar`, `Course.image`, `ChatMessage.filePath`, `PaymentType.icon`, and every other stored file path come back as full URLs, while the DB keeps only the portable relative form. `UPLOAD_FOLDERS` in that file is the exact, closed list of recognized prefixes (`avatar`, `course`, `lesson`, `chat`, `task-audio`, `task-picture`, `payment-type`, `live-lesson-recording`, `mentor-intro`, `material`) — the UUID-shaped match keeps it from ever touching unrelated strings (e.g. Click's `PaymentType.url` templates, chat message text). Adding a new upload type means adding its folder name to that list, nothing else. The match tolerates an optional leading slash (`/avatar/<uuid>.png` as well as `avatar/<uuid>.png`) — the storage helpers only ever write the slash-less form, but rows written before that convention existed still have one, and there's no migration to backfill them.

Three call sites share that one function rather than duplicating the regex: `FileUrlInterceptor` (global `APP_INTERCEPTOR`, HTTP responses only — Nest's interceptor pipeline never runs for WebSocket gateway handlers), and the two Socket.io gateways, which call it directly on what they're about to emit — `ChatGateway.broadcastMessage` on the outgoing `ChatMessage`, `MatchGateway.onSearch` on each `peer` object (its `avatar`) before the `matched` event. All three take `getBaseUrl: () => string` rather than a resolved string, preserving the interceptor's original laziness: `FILES_BASE_URL` is only actually read (and can only throw via `getOrThrow`) once a string is found that matches the upload-path shape, so an unset value doesn't break a response/emit that carries no files.

Admin lesson media can be replaced with `PATCH /api/admin/courses/:courseId/units/:unitId/lessons/:lessonId/media` or removed without deleting the lesson through `DELETE` on the same path. Replacement, media deletion, and lesson deletion clean up locally managed `/lesson/*` files after the database write; cleanup is path-restricted and a filesystem failure is logged without reverting the database result.

## Docs

There is no `docs/` folder — don't create one. `student-app-docs.md` at the repo root is the
hand-written API guide for the student mobile app (every `/api/v{N}/student/*` and
`/api/v{N}/auth/*` route it depends on). Keep it in sync when changing any endpoint it
describes.
