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

npm run db:clear        # typeorm schema:drop — destructive
```

There are currently **no test files** in the repo (`*.spec.ts`), and `test/jest-e2e.json` does not exist, so `npm run test:e2e` fails. `npm run test` passes vacuously. Jest is configured with `rootDir: src` and `testRegex: .*\.spec\.ts$`; to run a single spec once specs exist: `npx jest src/core/auth/auth.service.spec.ts`.

## Environment

| Variable | Notes |
|---|---|
| `PORT` | HTTP port |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` | e.g. `1h` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` | e.g. `7d` |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TTS_MODEL` | Google Gemini |
| `GEMINI_TTS_VOICE` | optional, defaults to `Kore` |
| `GEMINI_PROXY_URL` | optional outbound proxy, applied process-wide via `undici.setGlobalDispatcher` |
| `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` | Click Merchant API; the secret signs `sign_string` on the prepare/complete webhooks |
| `ESKIZ_API_URL`, `ESKIZ_API_USER`, `ESKIZ_API_KEY` | Eskiz SMS gateway, used for sign-up / password-recovery OTP codes |
| `OTP_MAX_PER_IP_PER_HOUR` | optional per-IP cap on `POST /auth/otp/send`; unset disables it (needs `trust proxy` behind a reverse proxy, otherwise all requests look like one IP) |
| `EXTERNAL_API_KEY` | shared secret other services send as `X-Auth` to reach `/api/external/*` |

`.env.example` is the source of truth for the list.

- TypeORM runs with `synchronize: true` — no migrations; schema is derived from entities on boot. Entity changes apply on restart, and removing a column drops it.
- The DataSource loads entities from `dist/**/*.entity.js`, so the app must be built (or running under `nest start`) before the DB is usable.
- `SnakeNamingStrategy` (`src/shared/config/snake-naming.strategy.ts`) maps camelCase properties to snake_case columns. Explicit `@Column({ name: ... })` wins — e.g. `Enrollment.start` → `start_date`.
- All REST routes carry the global prefix `/api`. Swagger UI is at `/docs`.
- Uploads land in `./uploads/` and are served statically at `/public/*`.

## Conventions

- **Comments and user-facing messages are written in Uzbek.** Exception messages (`throw new NotFoundException("To'lov topilmadi")`), log lines, and doc comments all follow this. Match it when adding code; identifiers and types stay in English.
- `@/` maps to `src/` (`tsconfig.json` paths). Use it for all internal imports, including within the same module.
- Module layout is `controllers/`, `services/`, `entity/`, `dto/`, `enum/`, `storage/`, `utils/` under `src/core/<feature>/`.
- Controllers are split by audience, not by resource: `admin-payment.controller.ts` serves `/api/admin/payments`, `payment.controller.ts` serves `/api/payments`. Same pattern for course, enrollment, material, plan, assignment (admin/student/teacher), and user (admin-student, admin-teacher, student, teacher).
- Prettier: single quotes, trailing commas, `printWidth: 120`.
- `strictNullChecks` is on but `noImplicitAny` is off; `@typescript-eslint/no-explicit-any` and `no-floating-promises` are disabled in `eslint.config.mjs`.

## Architecture

### Auth & authorization

`JwtAccessGuard` and `RolesGuard` are global `APP_GUARD` providers in `app.module.ts` — every route is authenticated by default.

- `@Public()` opts a handler or controller out of the JWT guard.
- `@Roles(UserRole.TEACHER)` restricts by role; without it, any authenticated user passes.
- `@CurrentUser()` injects the request user.

JWT payload is `{ sub: userId }`. `JwtAccessStrategy.validate` calls `UserService.findById`, which **does not return a `User` entity** — it strips the `student` / `teacher` / `admin` relations and returns a plain object with a `roles: UserRole[]` array. `RolesGuard` and `@CurrentUser()` both see that shape, so `user.roles` is an array, while `User.roles()` on the entity is a method.

Roles are not a column: a user has a role iff the corresponding one-to-one profile entity exists (`User.roles()` in `user.entity.ts`). New sign-ups get a `Student` profile.

### Sign-up / OTP

`AuthService` owns the OTP flow end to end (no separate OTP service). Codes are 6 digits from `crypto.randomInt`, stored in the `otps` table with a 5-minute TTL and a `used` flag, and delivered over SMS through `NotificationService` → `EskizService`. Three limits stack: a 60s per-phone resend cooldown, 5 sends per phone per hour, and an optional per-IP hourly cap via `SlidingWindowLimiter` (in-memory, so it resets on restart and is per-process).

### Payment & enrollment lifecycle

This is the most interconnected part of the codebase — `plan`, `payment`, and `enrollment` are coupled.

1. A `Plan` belongs to a `Course` and carries `price`, `month` (duration), and `hasMentor`. Courses have no price of their own.
2. `POST /api/payments/request { planId }` creates an `Enrollment` (`created`) and a `Payment` (`created`), and returns the active `PaymentType`s. Repeating the request reuses the pending payment, updating its plan/amount if the user picked a different plan.
3. `Payment.amount` snapshots `plan.price` at creation time, so later price changes don't affect pending or historical payments. Click amount verification compares against this snapshot.
4. Confirmation (`markPaid`) flips the enrollment to `active`, sets `start`/`end` (`end` defaults to `start + plan.month`), and appends an `EnrollmentHistory` row. Cancellation cascades to the enrollment.
5. Admins can confirm or cancel manually via `PATCH /api/admin/payments/{id}/status` for cash/transfer payments.

Re-purchasing an expired enrollment reuses the existing row: it is reset to `created` with null dates, and the previous term survives in `enrollment_histories`.

`PaymentType.url` is a **template** containing `$placeholder` tokens (`$paymentId`, `$userFullName`, `$amount`, `$courseTitle`, …) resolved per payment by `buildPaymentUrl` (`payment/utils/payment-url.util.ts`). Values are URI-encoded; unknown `$tokens` are left verbatim so template typos are visible. The stored template is never mutated — resolution happens on read.

### Click webhooks

`/api/payment/click/prepare` and `/complete` are `@Public()` and `@ApiExcludeController()` — called by Click's servers, not clients. Authenticity rests entirely on the md5 `sign_string` check in `ClickService.verifySign`; if `CLICK_SECRET_KEY` is unset, all requests are rejected. Both directions are logged, never including the secret.

`merchant_trans_id` may be either a payment id or a user id depending on what the payment page puts in `transaction_param`, so lookup tries payment id first, then falls back to the user's pending payments.

### External API

`/api/external/*` (student search, course/plan listing, direct enrollment) is for other services — CRM, terminals, billing. It uses a shared secret instead of JWT: `@ApiKeyAuth()` composes `@Public()` (to skip the global JWT guard) with `ApiKeyGuard`, which compares the `X-Auth` header against `EXTERNAL_API_KEY` using `timingSafeEqual`. Rotating the key means editing `.env` and restarting; there is one key for all consumers.

### WebSocket gateways

Two Socket.io namespaces, each authenticating from `handshake.auth.token` or an `Authorization: Bearer` header:

- `/chat` — room-based messaging; the gateway persists via `ChatService`, then broadcasts.
- `/match` — in-memory peer matchmaking; paired users exchange WebRTC signals. Match state is never persisted — only the resulting `Call` record is.

### Assessment (AI speaking partner)

Students `POST /api/assessments/conversations/:id/messages` with an audio clip. `AssessmentService` sends it to `GeminiService.converse()` (returns transcript + reply), then `synthesizeSpeech()` renders the reply (raw PCM wrapped as WAV). Uploads go to `uploads/assessment-input/`, generated audio to `uploads/assessment-output/`. The persona prompt lives at the top of `gemini.service.ts`; the model is instructed to stay in character as a human, never a bot.

### File uploads

Each module that accepts files has a `storage/*.storage.ts` defining a `multer.diskStorage` destination (created with `mkdirSync` at import time), a UUID filename, an optional mime filter, and a path helper (`toMaterialPath`, `toAvatarPath`, …) that produces the public URL. `uploads/` maps to `/public/`.

## Docs

`docs/` holds hand-written API guides in Uzbek that go beyond Swagger — `payment-api.md` (client-facing plan → payment → Click flow with status tables) and `external-api.md` (the `X-Auth` API). Keep them in sync when changing those endpoints.
