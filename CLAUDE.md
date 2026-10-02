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
| `GOOGLE_CLOUD_STORAGE_JSON` | Google Cloud Storage service account key, same format as `GOOGLE_SERVICES_JSON` (base64 or single-line raw JSON) but a separate variable. Used for uploads, deletes, and signing the read URLs every response carries (buckets are private). Read lazily from `process.env`; unset or unparseable makes an upload answer `503` and turns file paths in responses into `null` (logged) |
| `ENVIRONMENT` | `DEVELOPMENT` or `DEPLOYMENT`; anything else (including unset) resolves to `DEPLOYMENT`. See "Environment switches" below |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` | e.g. `1h` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` | e.g. `7d` |
| `ASSEMBLYAI_API_KEY` | handed to the student app by `GET /api/student/assessments/assembly-ai-key`; read with `getOrThrow`, so an unset key 500s that route only |
| `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` | Click Merchant API; the secret signs `sign_string` on the prepare/complete webhooks |
| `PAYME_MERCHANT_KEY` | Payme (Paycom) Merchant API; the password half of the `Basic` header Payme sends. Unset rejects every request with `-32504` |
| `PAYME_ACCOUNT_FIELD` | optional, defaults to `payment_id` — the account field name configured in the Payme cabinet |
| `ESKIZ_API_URL`, `ESKIZ_API_USER`, `ESKIZ_API_KEY` | Eskiz SMS gateway, used for registration / password-recovery OTP codes |
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
- Uploads go to Google Cloud Storage — `learning_platform_lessons` for lesson videos, `learning_platform_general` for everything else. Both buckets are private; clients only ever receive short-lived signed URLs. Nothing is written to local disk and there is no `/public/*` static route anymore.

## Conventions

- **Never use a local `uploads/` folder (or any local disk) for files.** Every uploaded, generated, or seeded file goes to Google Cloud Storage through `src/common/storage/gcs.storage.ts` — `learning_platform_lessons` for lesson videos, `learning_platform_general` for everything else. No `diskStorage`, `mkdirSync`, or static-file serving for app files.
- **History tables are singular:** `enrollment_history`, `mentor_status_history`, `assignment_history` — never `*_histories`. Entity classes and relation properties keep their normal names (`EnrollmentHistory`, `enrollment.histories`); only the `@Entity('…')` table name follows this. Since `synchronize` treats a renamed table as a brand-new one, renaming an existing table needs an `ALTER TABLE … RENAME TO …` run **before** the code that uses the new name boots, or the data is left behind in the orphaned old table.
- **No comments in code.** The codebase carries none — do not add any, including JSDoc. Let names and structure carry the explanation.
- **User-facing messages are written in Uzbek.** Exception messages (`throw new NotFoundException("To'lov topilmadi")`) and log lines follow this. Match it when adding code; identifiers and types stay in English.
- `@/` maps to `src/` (`tsconfig.json` paths). Use it for all internal imports, including within the same module.
- Module layout is `controllers/`, `services/`, `entity/`, `dto/`, `enum/`, `storage/`, `utils/` under `src/core/<feature>/`.
- Controllers are split by audience, not by resource: `admin-payment.controller.ts` serves `/api/admin/payments`, `payment.controller.ts` serves `/api/student/payments`. Same pattern for course, enrollment, material, plan, group, live-lesson (admin/student/mentor), and user (admin-student, admin-mentor, student, mentor). A controller that mixed two audiences under one path via per-method `@Roles` overrides (the old `course.controller.ts`, `task-submission.controller.ts`, `mentor.controller.ts`, `live-lesson.controller.ts`, `live-lesson-recording.controller.ts`) has been split one file per audience instead, since a class can't live at two role-prefixed base paths for different methods.
- Prettier: single quotes, trailing commas, `printWidth: 120`.
- `strictNullChecks` is on but `noImplicitAny` is off; `@typescript-eslint/no-explicit-any`, `no-floating-promises`, and `no-unused-vars` are disabled in `eslint.config.mjs`.
- **Every `GET` that returns a list of items must be paginated** — `@Query() query: PaginationQuery` (or a subclass adding filters/sort, e.g. `MentorQuery`, `GroupQuery`) on the controller, `Promise<Paginated<T>>` from the service, built with `paginate(data, total, query)` (`src/common/dto/pagination-query.dto.ts`), never a bare array. This applies to new endpoints too, no matter how small or admin-curated the list looks today — "it's always small" is exactly the assumption that stops holding once real data accumulates, and retrofitting pagination later is a breaking response-shape change for every existing client. The one common wrinkle: if a list gets filtered *after* the DB fetch (e.g. excluding courses a student already owns), paginating the DB query directly can return a page with fewer than `limit` items even when more exist beyond it — filter first, *then* paginate the final in-memory array with `paginateInMemory(items, query)` (same file), as `EnrollmentService.getAvailableCourses`/`getMyCourses` and `CourseService.findActiveCoursesPaginated` do.

## Architecture

### Environment switches

`src/shared/config/environment.config.ts` resolves `ENVIRONMENT` into `AppEnvironment`. `resolveEnvironment` returns `DEPLOYMENT` for **any** value other than a literal `DEVELOPMENT` (case-insensitive, trimmed) — an unset or misspelled variable must never hand a live server the fixed OTP. The resolved value is logged at boot.

| Behavior | `DEVELOPMENT` | `DEPLOYMENT` |
|---|---|---|
| OTP code (`AuthService.sendOtp`) | always `666666` | `crypto.randomInt` |
| Eskiz SMS (`EskizService.sendSms`) | skipped, message logged | sent |
| Request/response body logging (`LoggingInterceptor`) | on | off |
| GCS buckets (`bucketForPath`) | `test-learning_platform_lessons` / `test-learning_platform_general` | `learning_platform_lessons` / `learning_platform_general` |

The gate lives at the outermost sensible layer in each case: `EskizService.sendSms` (so every caller, not just OTP, is covered) and a global `APP_INTERCEPTOR` that returns early. `LoggingInterceptor` redacts keys matching `password|token|secret|authorization|sign_string|fcmToken|apiKey` and truncates bodies at 2000 chars.

### Auth & authorization

There is no `User` entity. `Student`, `Mentor`, and `Admin` (`src/core/user/entity/`) are three fully independent accounts, each owning its own login credentials — one account, one role, permanently. A person needing two roles gets two separate accounts; there is no mechanism to add a second role to an existing login. Only `Student` has both `email` and `phoneNumber`; `Mentor` has `phoneNumber` only (no email login), `Admin` has `email` only (no phone login) — all three otherwise share `firstName`, `lastName`, `avatar`, `password`, `isActive`. `Student` and `Mentor` additionally carry `gender` (`Gender`: `male` | `female`, default `male`) — `Admin` has no such column. A student sets it once at registration (`RegisterDto.gender`, optional); there's no route to change it afterward. An admin sets/changes a mentor's via `CreateMentorDto`/`UpdateMentorDto`.

`JwtAccessGuard` and `RolesGuard` are global `APP_GUARD` providers in `app.module.ts` — every route is authenticated by default.

- `@Public()` opts a handler or controller out of the JWT guard.
- `@Roles(UserRole.MENTOR)` restricts by role; without it, any authenticated user passes.
- `@CurrentUser()` injects the request user, typed `AuthUser` (`src/common/utils/role-owner.util.ts`): `{ id, role, firstName, lastName, avatar, email, phoneNumber, isActive, isSuperadmin }` — `email`/`phoneNumber` are `null` for a role whose entity doesn't have that column (see above), not just when unset.

`RolesGuard` resolves roles with `getAllAndOverride`, so a method-level `@Roles` **replaces** the controller-level one rather than adding to it. `TaskSubmissionController` relies on this: the class is `@Roles(STUDENT)` and the admin read-through route re-declares `@Roles(ADMIN)`.

**Superadmin.** `Admin.isSuperadmin` (default `false`) marks admins who manage other admins. It's on `AuthUser` (`false` for every student/mentor), so `GET admin/me` exposes it, and because `JwtAccessStrategy.validate` re-reads the account on every request, promoting or demoting someone takes effect on their very next call — no re-login. `SuperadminGuard` (`src/common/guards/superadmin.guard.ts`, 403 `Faqat superadmin uchun`) is applied with `@UseGuards` on top of `@Roles(ADMIN)` — it is **not** global. The only superadmin-gated surface is `admin/admins` (`admin-admin.controller.ts`, `AdminService`): paginated `GET` (`?search=` over name/email, `?isActive=`, `?isSuperadmin=`), `GET :id`, `POST { firstName, lastName?, email, password, isSuperadmin? }`, `PATCH :id` (any of those plus `isActive`). Emails are trimmed and lowercased on write and uniqueness is checked case-insensitively, matching admin sign-in. A superadmin cannot set their **own** `isSuperadmin: false` or `isActive: false` (400), which also guarantees at least one superadmin always remains. There is no delete. `db:seed` marks the seeded admin as superadmin; on a fresh production DB, promote the first one by hand (`UPDATE admins SET is_superadmin = true WHERE email = '…'`). Deactivating any account (`isActive: false`) blocks new sign-ins only — an already-issued access token keeps working until it expires, since `validate` doesn't check `isActive`.

JWT payload is `{ sub: id, role }`. `JwtAccessStrategy.validate` calls `UserService.findAuthUser(id, role)`, which looks the id up in whichever of `Student`/`Mentor`/`Admin` the role points at and returns an `AuthUser`. `RolesGuard` checks `requiredRoles.includes(user.role)` — `role` is singular, not an array.

Because each role is its own table with its own primary key, the id in the JWT **is** the row id — `Student.id` for a student token, no separate "user id" to join through. Every service that used to resolve "the JWT id" into "the profile row" now just uses the id directly (e.g. `EnrollmentService.getMyCourses(studentId)`, `TaskSubmissionService.getLessonResults(studentId, …)`). The one place two id spaces still matter is `AuthService.signIn`: since `Student`/`Mentor`/`Admin` are separate tables, sign-in tries every role that could plausibly own the given identity — an email search checks `Student` then `Admin` (skipping `Mentor`, which has no email column); a phone search checks `Student` then `Mentor` (skipping `Admin`).

### User activity, analytics, and streaks

`GET /api/student/me` records one `activities` row (`StudentActivity`, `user/entity/student-activity.entity.ts`) per authenticated student per UTC calendar day; `POST /api/student/me/activity` records it explicitly and returns `{ activityDate, hasCourse, recorded }`, where `recorded` is `false` if today's row already existed. `student.controller.ts`, `mentor.controller.ts`, and `admin.controller.ts` all still have a `me`/`me/avatar` pair, but activity tracking itself is **student-only**: `mentor.controller.ts`/`admin.controller.ts` have no `me/activity` or `me/streak` routes, and their `me` has no recording side effect — only `student.controller.ts`'s does. `StudentActivity` has a single required `student` FK, not the nullable student/mentor/admin trio other owner-pattern tables use — there's nothing to disambiguate since only a student can ever have a row. A unique constraint on `(student, activityDate)` makes repeated calls — across `me` and `me/activity` — idempotent. Each row carries `hasCourse`: whether the student had an active enrolment (access is permanent, so this is just "any `active` row") when it was recorded. The upsert only ever raises it `false → true` within a day (buying a course mid-day counts), never back down.

**"Users" in stats means students only** — `mentors` is already its own separate business metric, and admins were never counted here. `GET /api/admin/stats/summary`'s `users` is `COUNT(*) FROM students`, and every DAU/WAU/MAU query (`StatsService`) reads straight from `activities`, which can only ever hold student rows now that mentors/admins have no activity tracking at all.

`GET /api/admin/stats/summary` keeps its flat `dau`/`wau`/`mau` totals and adds `activeCourseUserMetrics` / `activeCourselessUserMetrics` objects with the same three keys. The stats series returns `activeUserMetrics` alongside `activeCourseUserMetrics` and `activeCourselessUserMetrics`, all with the same `dau`/`wau`/`mau` shape. Within a bucket a user is a course user if **any** of their activity days in it had `hasCourse`, otherwise courseless — so the two splits always sum to the total. Rows recorded before the column existed default to `false`. Admin `GET /api/admin/stats/summary` includes DAU (today), WAU (today plus the previous 6 days), and MAU (today plus the previous 29 days). `GET /api/admin/stats/series` and the backwards-compatible `/timeseries` separate `businessMetrics` (`{ date, users, enrollments }` per day — new students and new enrollments only, for the requested 7, 14, or 30 days) from `activeUserMetrics`: DAU has one point per elapsed day of the current UTC month, WAU uses consecutive seven-day buckets within the current month, and MAU has one point for each of the latest six calendar months.

`GET /api/student/me/streak` derives streaks from these daily rows. It returns `currentStreak`, `longestStreak`, `totalActiveDays`, `activeToday`, and `lastActiveDate`; a latest activity of yesterday still keeps the current streak alive until the user records today's activity.

### Sign-up / OTP

Registration and password recovery are two independent flows, but **every OTP code either flow sends is recorded in `otps`** (`OtpPurpose.REGISTER` or `RECOVER`), one row per send, in every environment — that table is the single place to look for "what code went to whom, when". Each send marks that identity's earlier unused rows of the same purpose `used`. Registration additionally keeps its session state in `registration_sessions`, which holds no code of its own.

**Registration** (`AuthService.requestRegistrationOtp` / `verifyRegistrationOtp` / `register`) is a three-step, session-scoped flow backed by `registration_sessions` (`RegistrationSession`):

1. `POST /auth/register/otp/send { phoneNumber | email }` — rejects an identity a `Student` already owns (`UserService.hasStudentProfile(ByEmail)`; same "Student table only" rule as everywhere else — a `Mentor`/`Admin` with that identity doesn't block it), then either reuses the caller's existing non-expired session for that identity or creates a new one, and records the code as an `otps` row (`REGISTER`, `expiresAt` = the session's). A session lives **30 minutes from creation** (`REGISTRATION_SESSION_TTL_MS`) — the outer window to verify and finish registering; resending does **not** push this deadline back. Resend is capped at **once per 2 minutes**, tracked via the session's own `lastSentAt`, not a separate per-recipient table — a resend also resets `attempts` to 0 and `verified` to `false` (a fresh code invalidates whatever verification state existed for the old one). Returns `{ sessionId }`.
2. `POST /auth/register/otp/verify { sessionId, code }` — 400s (`"Sessiya topilmadi yoki muddati o'tgan"`) if the session id doesn't exist, is expired, or has hit 5 wrong attempts; the code is checked against the identity's latest unused `REGISTER` row in `otps` (missing/expired → the same session 400). A wrong code increments `attempts` on both rows and answers `"OTP noto'g'ri yoki muddati o'tgan"`; a right code marks the `otps` row `used` and sets the session's `verified: true`.
3. `POST /auth/register { sessionId, firstName, lastName?, password, level?, gender? }` — requires `verified: true` (400 `"Avval OTP kodni tasdiqlang"` otherwise) on top of the same not-expired check, then re-checks "not already taken" (race protection against two sessions for the same identity finishing concurrently). The phone/email is never sent in this call — it's read off the session record, not the request body. On success the session row is deleted; it's single-use and can't be replayed.

**Password recovery** keeps the original two-call shape (`POST /auth/otp/send` takes no `purpose` field — it always writes `RECOVER`): `POST /auth/otp/send { phoneNumber | email }` then `POST /auth/recover-password { phoneNumber | email, code, newPassword }`. Codes are 6 digits from `crypto.randomInt`, 5-minute TTL, and three stacked send limits — 60s per-recipient resend cooldown and 5 sends per recipient per hour (both counted over `RECOVER` rows only, so registration sends don't eat into them), and an optional per-IP hourly cap via `SlidingWindowLimiter` (in-memory, resets on restart, per-process).

`GET /auth/check-phone?phoneNumber=` and `GET /auth/check-email?email=` are `@Public()` and let a client ask "is this identity already registered" directly — `{ exists: boolean }`, no side effects, no OTP or registration session touched. Same "Student table only" semantics as the registration check. Unlike the OTP-send endpoints, there's no per-IP or per-recipient limiter here — it's a plain existence lookup, not a resource that costs anything to call repeatedly.

### Payment & enrollment lifecycle

`Payment` knows nothing about what it bought — no `plan`, `course`, or `enrollment` column. What a payment is for is reached through `Purchase` (`payment/entity/purchase.entity.ts`), a generic line-item join: required `payment`, nullable `plan` (what was bought), nullable `subscription` (the subscription that purchase created or extended, set only once paid and only for a subscription plan). `resolvePlan(payment)` (`payment/utils/payment-url.util.ts`) reads `purchases[0].plan` — the only link from a payment to what it bought, so any relation set that feeds `resolvePlan`/`markPaid` (`paymentRelations`, `CLICK_RELATIONS`, `PAYME_RELATIONS`) must load `purchases.plan.course`.

Access is **permanent and bought once**: `Enrollment` has no `end` column, no expiry, and no re-purchase of a course the student currently has active. Course access is `Enrollment` only — a `Subscription` never gates course content.

**Subscriptions are per `(student, course)` and opt-in per plan.** `Plan.hasSubscription` (boolean, default `false`) decides whether enrolling through that plan touches a subscription at all. `Subscription` (`payment/entity/subscription.entity.ts`: `student`, `course`, `start`, `end` — deliberately **no** `plan` column: a plan only decides *whether* a subscription is written and *how long* the term is, it is not part of the subscription) is created or extended by one helper, `applyPlanSubscription(manager, studentId, plan)` (`payment/utils/subscription.util.ts`), on **every** enrollment path: `markPaid`, `EnrollmentService.enroll` (admin, external, and `acceptPending` all go through it), whenever the resolved plan has `hasSubscription`. It finds the student's latest subscription for that plan's course: still running (`end > now`) → `end += plan.month` on the same row; none or expired → a new row `start = now`, `end = now + plan.month`. A plan without `hasSubscription`, or an enrollment with no plan (external `courseId`-only), writes no subscription. `course` is nullable only because rows predating it have none; every new row sets it. Students read theirs through paginated `GET student/subscriptions` (`SubscriptionService`, `student-subscription.controller.ts`): newest `end` first, optional `?courseId=` and `?isActive=true|false` (`end > now`), each item `{ id, course: { id, title, image }, start, end, isActive }`. Legacy placeholder rows (`start` null, from the old unpaid-payment flow) are excluded.

1. A `Plan` belongs to a `Course` and carries `price`, `month` (the subscription term length), and `hasSubscription`. Courses have no price of their own.
2. `POST /api/student/payments/request { planId }` rejects with `400 Siz allaqachon ushbu kursga yozilgansiz` if the student already has an `active` `Enrollment` for that plan's course. Otherwise it finds an existing pending `Payment` for that course (via `purchases.plan.course`) and updates its amount / the purchase's `plan`, or creates a new `Payment` (`created`) + `Purchase { payment, plan }`. No subscription row exists until the payment is confirmed. Either way it returns the active `PaymentType`s.
3. `Payment.amount` snapshots `plan.price` at creation time, so later price changes don't affect pending or historical payments. Click amount verification compares against this snapshot.
4. Confirmation (`PaymentService.markPaid`) resolves the plan and activates/reuses the `Enrollment` for `(student, plan.course)` — whatever its current status, so a refunded-then-repurchased course keeps its `Progress` history — then runs `applyPlanSubscription` and links the resulting subscription onto the purchase. `markCancelled` only touches `Enrollment` (`status: cancelled`); a subscription it created or extended is left as-is (no rollback of the extension).
5. Admins have **read-only** access to payments (`GET /api/admin/payments`, `GET /api/admin/payments/:id`, filter `planId` matches `purchases.plan`) — there is no approve, reject, or delete endpoint. Payment status changes only through the Click/Payme webhooks. For cash/transfer cases, admins bypass payments entirely via `POST /api/admin/enrollments`. `PendingEnrollmentService.acceptPending` calls `EnrollmentService.enroll` inside its transaction and records a `paid` `Payment` + `Purchase { payment, plan, subscription }`, so an externally-accepted enrollment leaves the same trail a self-serve purchase would.

`POST /api/admin/enrollments`'s `CreateEnrollmentDto` is deliberately minimal — `studentId`, `courseId`, `planId` (both required and cross-checked: `400 Tarif ko'rsatilgan kursga tegishli emas` if `planId`'s plan doesn't belong to `courseId`), and an optional `start` (defaults to now). There's no `purchaseAmount` override here — the admin path always records `plan.price` in `enrollment_history`. The External/`PendingEnrollmentService` callers use a looser internal shape (`CreateEnrollmentInput`, `courseId`/`planId` each optional, `purchaseAmount` overridable) that the admin DTO is a strict subtype of.

`EnrollmentService.enroll(dto, manager)` does the work (student/plan/course resolution, reuse-by-`(student, course)`: 400 if an `active` row exists, otherwise reuse the `cancelled` row or create one, `enrollment_history` row, `applyPlanSubscription`) and returns `{ enrollment, course, subscription }`. `createEnrollment(dto, manager?)` is the public wrapper: with a caller's `manager` it just delegates (no push — the caller's transaction may still roll back); without one it runs `enroll` in its own transaction so enrollment, history, and subscription commit together, then pushes `course_enrolled`.

`PaymentType.url` is a **template** containing `$placeholder` tokens (`$paymentId`, `$userFullName`, `$amount`, `$courseTitle`, …) resolved per payment by `buildPaymentUrl` (`payment/utils/payment-url.util.ts`); `$courseId`/`$courseTitle`/`$planId`/`$planTitle`/`$planMonth` all read from `resolvePlan(payment)`. Values are URI-encoded; unknown `$tokens` are left verbatim so template typos are visible. The stored template is never mutated — resolution happens on read.

### Click webhooks

`/api/payment/click/prepare` and `/complete` are `@Public()` — called by Click's servers, not clients. Authenticity rests entirely on the md5 `sign_string` check in `ClickService.verifySign`; if `CLICK_SECRET_KEY` is unset, all requests are rejected. Both directions are logged, never including the secret.

`merchant_trans_id` may be either a payment id or a student id (`Payment.student`) depending on what the payment page puts in `transaction_param`, so lookup tries payment id first, then falls back to that student's pending payments.

### Payme webhooks

`/api/payment/payme` is a single `@Public()` JSON-RPC 2.0 endpoint carrying all seven Paycom methods (`CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`, `SetFiscalData`). Authenticity rests on the `Authorization: Basic base64("Paycom:<PAYME_MERCHANT_KEY>")` header, compared with `timingSafeEqual`; if the key is unset, all requests are rejected. The route is `@All()`, not `@Post()`, because the spec wants `-32300` for a non-POST rather than Nest's 404.

Payme drives a transaction across several calls and expects the *same* answer on repeats, so state lives in its own `payme_transactions` table (`transactionId` unique, `state` per the Paycom spec: `1` created, `2` performed, `-1`/`-2` cancelled) rather than on `Payment`. Amounts arrive in **tiyin** — compared against `payment.amount * 100`. Pending transactions expire after 12 hours.

The body is typed as an `interface` (not a DTO class) and read with `import type`, so the global `ValidationPipe` skips it: Payme expects every failure as an in-band JSON-RPC `error`, never an HTTP 400. The handler always returns HTTP 200.

Cancelling an **unpaid** transaction leaves the payment `created` so the student can retry and keep their enrollment progress; cancelling a **performed** one (refund) runs `markCancelled`, which also cancels the enrollment. Since access is permanent (no expiry to treat as "already delivered"), a performed transaction can always be cancelled — there is no `-31007` (`UNABLE_TO_CANCEL`) path anymore.

Three details that are easy to get wrong and are load-bearing:

- `GetStatement` filters on `paymeTime` (Payme's own `time`), **not** the merchant-side `createTime` — reconciliation is keyed to Payme's clock.
- `PerformTransaction` skips `markPaid` when the payment is already `paid`, so a Payme retry after a half-completed write can't append a second `enrollment_history` row or extend the term again.
- Unexpected exceptions answer `-32400` (system error), never `-31008` — the latter tells Payme the business state permanently forbids the operation, which would be wrong for a transient DB fault.

### Course content: tasks, submissions, progress, locks

A course is `Course → Unit → Lesson → Task`, ordered by an admin-set `index` with `createdAt` as tiebreak (`UNIT_ORDER`/`LESSON_ORDER` in `course.service.ts`). A `Task` holds its questions as a jsonb array of `{ question, options, answer }`.

**The student-facing read path is a four-endpoint drill-down, not one nested tree.** `GET student/courses` returns only `{ id, title, image, totalProgress }` per active course (`totalProgress` averaged across the student's `Progress` rows for their active enrollment — `0` for a course they're not enrolled in); `GET student/courses/:id` is the same shape plus `description`. `GET student/courses/:courseId/units` returns `{ id, title, lessonsCount }`. `GET student/courses/:courseId/units/:unitId/lessons` returns `{ id, title, description, isLocked }`. `GET student/courses/:courseId/units/:unitId/lessons/:lessonId` returns `{ id, title, description, media, taskProgression: { totalTasks, completedTasks, progressPercent }, materials }` — `materials` reuses `MaterialService.listAllForLesson` (unpaginated, exported from `MaterialModule` for this cross-module call). The lesson-detail endpoint (and `GET student/lessons/:lessonId/materials`) 403s without an active enrollment in the course, same as the tasks endpoint — it's the one that hands out the lesson video and material URLs. None of these send tasks, questions, or answers — that's `GET student/courses/:courseId/units/:unitId/lessons/:lessonId/tasks` (`TaskService.listTasksForStudent`), a separate paginated call. The admin side is unchanged: `GET admin/courses/:id` still returns the full nested `units[].lessonsCount` tree in one call (`CourseService.findOneCourse`).

`POST /api/student/task-submissions` grades in one `dataSource.transaction`; if any task id is unknown the whole submission rolls back rather than half-saving.

- **Grading is fuzzy.** `taskAnswersMatch` (`course/utils/task-answer.util.ts`) NFKC-normalizes, lowercases, and strips every non-letter (`\p{L}`) from both sides, so punctuation and spacing never fail a student. An empty correct answer matches nothing.
- **A task passes at 80%**, not 100% (`PASS_PERCENT`). The comparison is done in integers (`correct * 100 >= total * PASS_PERCENT`) to avoid float error at ratios like 16/20. A task with zero questions can never pass.
- **Points are once-only; coins are unreducable but re-checked on every retry.** Points (`10`/passed task) are granted by `claimPoints`, a conditional `UPDATE … WHERE is_correct AND NOT points_rewarded` whose `affected === 1` decides the grant — first pass only, never revoked, never re-granted, concurrent submissions can't double-pay. Coins (`5`/passed task) work differently: `TaskSubmission.coinsEarned` stores what this specific submission currently contributes, and every submit — including a retry — recomputes `newCoins` (`5` if passed, `0` if not) and only ever adds `Math.max(0, newCoins - submission.coinsEarned)` to both the submission and the student's balance. A retry that now fails a previously-passed task leaves `coinsEarned` (and the student's balance) exactly where it was — coins never go down — and a retry that re-passes an already-rewarded task adds nothing more, since `newCoins - coinsEarned` is already `0`. The submission itself is an upsert on `(student_id, task_id)` that deliberately does not touch `coins_earned`/`points_rewarded`, so this read-then-conditionally-increment happens after the upsert, inside the same transaction — the upsert's row lock already serializes concurrent retries of the same submission, so no separate `FOR UPDATE` is needed.
- **Lesson progress is counted by question, not by task.** `upsertLessonProgress` sums every *answerable* task's question count in the lesson as the denominator (a task with an empty `questions` array contributes nothing, so a lesson padded with contentless tasks can still reach 100) and, for each of the student's submissions, re-runs `countCorrect` against that task's current questions as the numerator — so a task that's short of its own 80% pass bar still contributes whatever questions it *did* get right, rather than the lesson getting nothing until that one task individually clears 80%. It's read from each submission's *current* stored `answer`, not from `coinsEarned` or the task's `isCorrect` flag — a task that regresses on retry immediately counts fewer correct questions toward lesson progress (and can re-lock a later lesson) even though the coins it already paid out are untouched.

**Sequential unlocking is on.** `LessonService.findLessonsForStudent` marks a lesson locked when the **previous lesson in the same unit** has tasks and its progress is under `LESSON_UNLOCK_PERCENT` (80); `previousLessonId` resets at the start of every unit's `.map()` (`findLessonsForStudent` is called once per unit, from `GET student/courses/:courseId/units/:unitId/lessons`), so a unit's first lesson is always unlocked regardless of how the previous unit ended, and a previous lesson with no tasks never blocks either — otherwise a video-only lesson would be an impassable wall. `isLocked` is not enforced server-side on any other route (task listing, submission) — it's advisory for the client to grey out a lesson; nothing currently stops a direct `GET`/`POST` against a locked lesson's tasks.

Every student-facing submission response (`submit`, `getLessonResults`, `getTaskResult`) reveals the correct answer per question **only when the student's own answer was correct** — `questionResult()` in `task-submission.service.ts` sets `answer: isCorrect ? question.answer : null`, alongside `studentAnswer` and a per-question `isCorrect` boolean. Getting a question wrong tells the student that and nothing more, forcing an actual retry rather than reading the key off a failed attempt. The one exception is the admin read-through, `GET /api/admin/task-submissions/students/:studentId/lessons/:lessonId` (`admin-task-submission.controller.ts`, split out from the student-facing `task-submission.controller.ts` since it's the only admin-only method in that resource), which returns `answer` alongside `studentAnswer` unconditionally — an admin can't judge a result without the key. That route also **skips the enrollment check** on purpose, so a cancelled enrollment's results stay readable; an unsubmitted task reports `isCorrect: null` rather than `false`.

Admins track a student through `GET /api/admin/enrollments/:enrollmentId/students/:studentId/progress`, which verifies the enrollment belongs to that student.

### Course authors

`src/core/author/` holds `Author` (`authors`: `firstName`, `lastName`, `gender` — the shared `Gender` enum, required — nullable `avatar`, nullable text `description`). Authors are display-only people credited on a course, **not** accounts: no login, no role, no relation to `Mentor`. Admin-only CRUD at `admin/authors` (multipart, `avatar` file field through the shared `avatarStorage`, so avatars land under `avatar/` like every other avatar; list paginated; `GET admin/authors/:id` includes the author's `courses`).

`Course.authors` is a `ManyToMany` owned by `Course`, join table `course_authors` (`course_id`, `author_id`, cascade on delete from either side — deleting an author just unlinks it). A course has zero or more authors. Assignment is one idempotent replace-the-whole-set call, `PUT admin/courses/:id/authors { authorIds }` (`CourseService.setCourseAuthors`) — `[]` clears it, any unknown id 400s naming the missing ids and changes nothing. Authors come back (ordered by `lastName`, `firstName`) on `GET admin/courses/:id` and on the student `GET student/courses/:id`; the lean student course list does not carry them.

### External API

`/api/external/*` (student search, course/plan listing, direct enrollment, enrollment requests) is for other services — CRM, terminals, billing. It uses a shared secret instead of JWT: `@ApiKeyAuth()` composes `@Public()` (to skip the global JWT guard) with `ApiKeyGuard`, which compares the `X-Auth` header against `EXTERNAL_API_KEY` using `timingSafeEqual`. Rotating the key means editing `.env` and restarting; there is one key for all consumers.

External services have two ways to enrol a student, and they differ in who decides:

- `POST /api/external/enrollments` — immediate. The enrolment opens `active` in one call, no `Payment` row.
- `POST /api/external/pending-enrollments` — queued. Writes a `pending_enrollments` row (`student`, `course`, `start`, `end`, `status`) that an admin resolves via `PATCH /api/admin/pending-enrollments/:id/accept|reject`. The plan is deliberately *not* on the pending row: the admin picks `planId` when accepting, since price and duration are only settled then. Accepting runs inside one `dataSource.transaction` — enrolment `active`, an `enrollment_history` row, and a `paid` `Payment` (`amount` defaults to `plan.price`) all commit together, which is why `EnrollmentService.createEnrollment` takes an optional `EntityManager`. Only a `created` request can be accepted or rejected, and repeating the external POST for the same student+course updates the queued row rather than adding a second one. The DTO field is still called `userId` (kept for external-client compatibility) but now resolves directly to `Student.id` — there's no separate user id to distinguish it from.

### Push notifications (FCM)

Three layers under `src/core/notification/`: `FirebaseService` is the transport (lazy `initializeApp` from `GOOGLE_SERVICES_JSON`, chunks tokens at FCM's 500-per-call limit), `PushService` decides the audience and calls it, and `push-message.util.ts` holds every user-visible string — all four events' Uzbek text lives in that one file.

Device tokens were already there: `Session.fcmToken`, one row per device. `Session`, `StudentActivity`, and `StudentNotification` are all **student-only** now — a single required `student` FK each, not a nullable student/mentor/admin trio; `ChatMessage` is the one remaining table using that trio (its sender can be any of the three roles, per the Groups chat model above). `SessionController` is mounted only at `student/sessions`, and `PushService` looks up tokens by `session.student` alone. `PushService` reads sessions directly and **deletes** ones FCM reports as `registration-token-not-registered` / `invalid-registration-token` / `invalid-argument`, so dead devices don't accumulate.

| Event | Fires from | Audience |
|---|---|---|
| `course_enrolled` | `EnrollmentService.createEnrollment`, `PaymentService.markPaid`, `PendingEnrollmentService.acceptPending` | the one student |
| `course_created` | `CourseService.createCourse` / `updateCourse` | every student |
| `lesson_added` | `LessonService.createLesson` | students with a live enrolment in that course |
| `group_joined` | `GroupService.addStudents`, `GroupService.swapStudent` | the student(s) newly placed in that group |
| `live_lesson_created` | `LiveLessonService.create` | every student with an active membership in that group |

Four things that are load-bearing:

- **Push never breaks the business action.** `PushService` methods swallow their own errors, so call sites use `void` and never await. A missing key, a network fault, or a bad token cannot fail an enrolment, a payment webhook, or a lesson upload.
- **`createEnrollment` skips the push when it runs inside a caller's transaction** (`manager` is set), because the rows may not be committed yet. `acceptPending` and `GroupService.addStudents`/`swapStudent` all send after their transaction commits instead — otherwise a rollback would still have notified the student.
- **"New course" is announced when the course becomes *visible*, not when the row is inserted.** Courses default to `isActive: false`, so announcing on insert would advertise drafts. There is no record of past broadcasts: `createCourse` announces if the course is created active, and `updateCourse` announces on every `isActive` transition from `false` to `true` — so toggling a course off and on again **does** re-announce it to every student.
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

`src/core/live-lesson/` is a **create-only broadcast**, not a schedulable resource — a `LiveLesson` is just `name` + `meetLink` (plus its `group` and `mentor` FKs and `createdAt`; no `startTime`/`endTime`, no update or delete). `POST mentor/live-lessons` is the only mentor route, and `LiveLessonService.create` requires the calling mentor to be the target group's `primaryMentor` — this is the "go live now" action, not a calendar booking. Right after saving, it fires `PushService.notifyLiveLessonCreated` (`void`, never awaited — same "push never breaks the business action" rule as everywhere else) to every student with an active membership in that group. Students only ever want *right now*: `GET student/live-lessons/latest` returns the single newest `LiveLesson` across all the student's active groups (`null` if none); optional `?groupId=` narrows it to one group and 403s if the student isn't an active member of it. There's no list/history endpoint. Recordings are a separate, unrelated entity keyed by `group` the same way (`mentor/live-lesson-recordings` to upload — primary mentor only; `student/live-lesson-recordings` to read — `my` spans every active group, `groups/:groupId` and `:id` require active membership) with their own upload storage. This whole module is unrelated to `Lesson` under `course/`, which is prerecorded course content.

`LiveLesson`/`LiveLessonRecording` hang off `Group`; the 1-to-1 mentor pairing below (`Assignment`) has no live lessons or recordings of its own.

### Assignments

`src/core/assignment/` is a 1-to-1 student↔mentor pairing, separate from groups. An `Assignment` (`assignments`) has `student` (required), `subscription` (required — one of the student's own subscriptions; `@Unique(['subscription'])` allows **one assignment per subscription**), `mentor` (nullable, `SET NULL` on mentor delete), `status` (`AssignmentStatus`: `pending` | `active`), `start` (`start_date`, null until a mentor is first assigned), and `schedule`.

`schedule` is a jsonb **array of objects**, each mapping lowercase weekdays to one `HH:mm` time — `[{ "mon": "10:00", "thu": "20:00" }, { "sat": "09:30" }]` — so the same weekday can appear in more than one object. `validateAssignmentSchedule` (`assignment/utils/assignment-schedule.util.ts`) rejects an empty array, a non-object or empty element, a key outside `mon`…`sun`, or a time not matching `HH:mm` (`00:00`–`23:59`, two-digit hour). This is deliberately a different shape from `Group.schedule` (`{ Mon: string[] }`, capitalised, free-text times).

- **Student** (`student/assignments`): `POST { subscriptionId, schedule }` creates a `pending` assignment with no mentor and `start: null`. 404 if the subscription isn't the caller's, 400 if it has expired (`end <= now`) or already has an assignment. `GET` (paginated) and `GET :id` read only the caller's own.
- **Admin** (`admin/assignments`): paginated `GET` with `?status=&studentId=&mentorId=`; `GET :id` adds `histories` (with `mentor`, newest `start` first); `PATCH :id/mentor { mentorId }` assigns or reassigns. The mentor must have `status: working` (any `role`); assigning the mentor already on it 400s.
- **Mentor** (`mentor/assignments`): paginated `GET` of the assignments they currently hold. Read-only.

Assigning a mentor runs in one transaction with a `pessimistic_write` lock on the assignment row: it closes the open `AssignmentHistory` row (`end = now`), opens a new one (`mentor`, `start = now`, `end: null`), sets the assignment's `mentor` and `status: active`, and sets `start` **only the first time** — a reassignment keeps the original `start`. `assignment_history` (`assignment`, `mentor`, `start_date`, `end_date`) therefore holds one row per mentor tenure, with at most one open row per assignment. Nothing currently ends or deactivates an assignment when its subscription expires; status never goes back from `active`.

### Groups

`src/core/group/` is the **only** mentor↔student pairing mechanism — a named cohort (`Group`: `title`, `schedule` — a `Record<Weekday, string[]>` validated only for weekday keys and non-empty string values (`validateGroupScheduleShape`, `group/utils/group-schedule.util.ts`); the time values are free text — `isActive`, `course`, `primaryMentor`), fully admin-managed at `admin/groups`.

**A group belongs to a course.** `Group.course` is required on create (`CreateGroupDto.courseId`) and changeable on update; the column is nullable only so pre-existing rows survive the schema sync (`SET NULL` if the course is deleted). `GET admin/groups` accepts `?courseId=`.

**A group has one mentor, stored directly on it.** `Group.primaryMentor` is a nullable FK to `Mentor` (`SET NULL` on delete) — there is no mentor join table and no support mentors anymore (`group_mentors` is orphaned in the DB: `synchronize` never drops a table whose entity was deleted, same as the old conversation tables). `PATCH admin/groups/:id/primary-mentor { mentorId }` sets it, `DELETE` on the same path clears it. `Mentor.role` (`GroupMentorRole`, `group/enum/group-mentor-role.enum.ts`) stays as a profile classification and gates assignment: only a mentor whose `role` is `primary` can be set.

**Membership is `student → group_memberships → group`, many-to-many with history.** There is no `Student.group` column. `GroupMembership` (`group`, `student`, `joinedAt`, `leftAt`) is the single source of truth: a row with `leftAt = null` is an active membership, leaving sets `leftAt` (rows are never deleted), rejoining inserts a new row. A partial unique index (`UQ_group_membership_active`, `(group, student) WHERE left_at IS NULL`) allows one active row per student per group at the DB level. A student may be in several groups at once, but **at most one active group per course** — `addStudents`, `swapStudent`, and a course change in `updateGroup` all 400 naming the conflicting student and group. `group/utils/group-membership.util.ts` (`activeGroupIdsOfStudent`, `isActiveGroupMember`) is the shared lookup chat, live lessons, and recordings use.

- **Add** (`POST admin/groups/:id/students { studentIds }`) — 400 if a student is already active in this group or in another group of the same course.
- **Remove** (`DELETE admin/groups/:id/students/:studentId`) — only for an active member of that group; sets `leftAt`.
- **Swap** (`PATCH admin/groups/:id/students/:studentId/swap { toGroupId }`) — closes the old row and opens the new one in one transaction; the target group may be in another course.

Three controllers, one per audience: `admin-group.controller.ts` (above, plus create/update/activate/deactivate; list and detail include `course` and `primaryMentor`, detail adds `students` — active members with their `joinedAt`), `student-group.controller.ts` (paginated `GET student/groups/me` — every group with an active membership, newest join first), `mentor-group.controller.ts` (paginated `GET mentor/groups/me` — groups whose `primaryMentor` is the caller; `GET mentor/groups/:id` returns the admin detail but 403s unless the caller is that group's `primaryMentor`).

**Chat is a property of the group, not a separately managed resource.** `GroupService.createGroup` calls `ChatService.createRoomForGroup` right after saving the row, so every group gets exactly one `ChatRoom` (`chat/entity/chat-room.entity.ts`, a `OneToOne` on `group`) that outlives membership churn. Access is derived on every call — a student may read/send iff they have an active membership in that room's group, a mentor iff they are the group's `primaryMentor`, and any admin always passes. `ChatService.hasAccess` is the single gate every read and write method calls, so reassigning the mentor or moving a student immediately changes who can use the room, with nothing to reconcile.

`addStudents` and `swapStudent` each fire a `group_joined` push (see "Push notifications" above) for every student newly placed in a group, after their writes commit.

### Mentor status

`Mentor.status` (`MentorStatus`: `working` | `vacation` | `fired`, default `working`) is separate
from `Mentor.role` (the `primary`/`support` classification above) and from `isActive` (login
gate). Admins change it through `PATCH admin/mentors/:id/status` (`MentorService.changeStatus`),
which writes a `MentorStatusHistory` row (`mentor`, `oldStatus`, `newStatus`, `changedBy` — the
admin who made the change, `SET NULL` if that admin is later deleted — `changedAt`) before saving
the new status, so the row always captures the transition, not just the destination. `isActive` is
kept in lockstep as a side effect — `true` only while `status` is `working`, `false` otherwise —
rather than being settable independently through this route.

**Only a `working` mentor is student-facing.** `GET student/mentors`, `GET student/mentors/:id`,
and `POST student/mentors/:id/feedbacks` all filter/require `status: working`; a mentor on
`vacation` or `fired` simply stops appearing to students and 404s if addressed directly, with no
separate "unavailable" state to handle. This has no effect on groups — a `vacation`/`fired` mentor
stays the `primaryMentor` of whatever groups they had until an admin reassigns them; `changeStatus`
does not touch group assignment.

`GET admin/mentors/:id` eager-loads `statusHistories` (with `changedBy`) as part of the normal
mentor read, newest-first is not enforced at the query level since there's no dedicated
history-listing endpoint — the full array comes back on every mentor fetch.

### Assessment (speaking practice)

There is no server-side AI conversation anymore — Gemini (`GeminiService`, the `converse`/`synthesizeSpeech` round-trip, and the `Conversation`/`ConversationMessage` entities that backed it) has been removed entirely. `src/core/assessment/` is now a single route: `GET /api/student/assessments/assembly-ai-key` hands the student app the raw `ASSEMBLYAI_API_KEY` for on-device streaming transcription — AssemblyAI does the speech-to-text work directly on the client, with nothing round-tripping through this API. It is student-authenticated, and `apiKey` is in the `LoggingInterceptor` redaction list so the response body never reaches the logs.

`AssessmentController` has no service or entities behind it — just `ConfigService`. The `conversations` / `conversation_messages` tables from the old Gemini flow are orphaned in the database (`synchronize: true` adds/alters columns for known entities but never drops a table whose entity was deleted) — they're safe to drop by hand if wanted, nothing reads or writes them anymore.

### App reports

`src/core/app-report/` is a single `@Public() POST /api/app-reports` endpoint (`device`, `message`) for the mobile app to self-report crashes/bugs — reachable even from a crash screen before sign-in, so it isn't behind the JWT guard like everything else. `AppReport.userId` is a plain nullable string column, not a relation — there's no per-role FK here because the caller may not be authenticated at all. Since `@Public()` skips `JwtAccessGuard` entirely, `@CurrentUser()` never populates; `AppReportService` instead reads the raw `Authorization` header itself and tries `JwtService.verifyAsync` against it, filling `userId` from the token's `sub` on success and leaving it `null` on a missing/invalid/expired token rather than rejecting the request — a broken or absent token should never stop a report from being saved. There is currently no read endpoint for these rows.

### File uploads

Each module that accepts files has a `storage/*.storage.ts` whose multer storage is `gcsStorage(folder)` (`src/common/storage/gcs.storage.ts`) — a custom multer `StorageEngine`, so multer is still the multipart parser behind `FileInterceptor` but the file streams straight into a bucket instead of onto disk. It names the object `<folder>/<uuid><ext>`, sets `file.filename`/`file.path`/`file.size` like `diskStorage` did, and deletes the object again if multer later rejects the request. Each storage file also keeps its optional mime filter and path helper (`toMaterialPath`, `toAvatarPath`, …), which produces the *relative* path stored in the DB column — no leading slash, e.g. `avatar/<uuid>.png`. That path is also the object name inside the bucket. `bucketForPath` picks the bucket from the folder: `lesson/` → `learning_platform_lessons`, everything else → `learning_platform_general`. Bucket names are constants in that file, not env vars; in `DEVELOPMENT` both get a `test-` prefix (read from `process.env.ENVIRONMENT` on every call, so the seed script sees it too — `db:seed` runs with `tsconfig-paths/register` so it can import app code via `@/`).

That relative path never reaches a client as-is. `expandFileUrls` (`src/common/utils/file-url.util.ts`) walks any JSON-shaped value recursively and rewrites any string matching `<known-upload-folder>/<uuid>.<ext>` into a **V4 signed URL** (`signedFileUrl`, 6-hour expiry, signed locally with the service-account key — no network call) — so `Student.avatar`, `Course.image`, `ChatMessage.filePath`, `PaymentType.icon`, and every other stored file path come back as full URLs, while the DB keeps only the portable relative form. **Both buckets are private** — no `allUsers` access, ever. A signed URL is the only way a client reads a file, and one is minted only inside a response the caller was already authorized to receive, so file access is exactly as strict as the endpoint that returned the path. That makes every endpoint returning a file path an access-control point: e.g. lesson detail and the student materials list both require an active enrollment (`assertActiveEnrollmentForLesson`), recordings require group membership, chat files go through `ChatService.hasAccess`. A signing failure (bad/missing `GOOGLE_CLOUD_STORAGE_JSON`) logs and replaces that one path with `null` rather than failing the response. `UPLOAD_FOLDERS` in that file is the exact, closed list of recognized prefixes (`avatar`, `course`, `lesson`, `chat`, `task-audio`, `task-picture`, `payment-type`, `live-lesson-recording`, `mentor-intro`, `material`) — the UUID-shaped match keeps it from ever touching unrelated strings (e.g. Click's `PaymentType.url` templates, chat message text). Adding a new upload type means adding its folder name to that list, nothing else. The match tolerates an optional leading slash (`/avatar/<uuid>.png` as well as `avatar/<uuid>.png`) — the storage helpers only ever write the slash-less form, but rows written before that convention existed still have one, and there's no migration to backfill them.

Three call sites share that one function rather than duplicating the regex: `FileUrlInterceptor` (global `APP_INTERCEPTOR`, HTTP responses only — Nest's interceptor pipeline never runs for WebSocket gateway handlers, `concatMap`s the async expansion), and the two Socket.io gateways, which `await` it on what they're about to emit — `ChatGateway.broadcastMessage` on the outgoing `ChatMessage`, `MatchGateway.onSearch` on each `peer` object (its `avatar`) before the `matched` event. `expandFileUrls` is async: it collects every distinct matching path first, signs them in parallel, then rewrites. Signed URLs are cached in-process per bucket+path (`signedUrlCache` in `gcs.storage.ts`): an entry is reused for the first 3 hours of its 6-hour life (`SIGNED_URL_REUSE_MS`), so every URL a client receives has at least 3 hours left, and the same file yields the byte-identical URL across requests in that window — clients can cache on it. Concurrent requests for one path share a single in-flight signing promise, failed signings are not cached, `deleteStoredFile` evicts its entry, and the map is capped at 10 000 entries (expired first, then oldest). The cache is per-process and resets on restart, so two instances behind a load balancer hand out different (both valid) URLs for the same file.

Admin lesson media can be replaced with `PATCH /api/admin/courses/:courseId/units/:unitId/lessons/:lessonId/media` or removed without deleting the lesson through `DELETE` on the same path. Replacement, media deletion, and lesson deletion delete the old `lesson/*` object from `learning_platform_lessons` (`removeLessonMediaFile` → `deleteStoredFile`) after the database write; cleanup is path-restricted, and a storage failure is logged without reverting the database result. No other upload type deletes its old object when replaced.

## Docs

There is no `docs/` folder and no standalone student-app API guide file — don't create one.
