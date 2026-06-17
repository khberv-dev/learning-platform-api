# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev       # dev server with watch mode
npm run build           # production build (nest build → dist/)
npm run start:prod      # run the compiled dist/main

npm run test            # unit tests (jest)
npm run test:e2e        # e2e tests (test/jest-e2e.json)
npm run test:cov        # coverage report

npx jest --testPathPattern="<pattern>"   # run a single spec file
npx jest src/core/auth/auth.service.spec.ts  # by path

npm run lint            # eslint with autofix
npm run format          # prettier format
```

## Environment

Copy `.env` and populate these variables before running:

| Variable | Notes |
|---|---|
| `PORT` | HTTP port |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` | e.g. `15m` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` | e.g. `7d` |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TTS_MODEL` | Google Gemini |
| `GEMINI_TTS_VOICE` | optional, defaults to `Kore` |
| `GEMINI_PROXY_URL` | optional outbound proxy for Gemini calls |

TypeORM runs with `synchronize: true` — schema is auto-migrated in dev. The data source reads from `dist/**/*.entity.js`, so the app must be built (or running via `nest start`) before the DB is used.

Uploaded files land in `./uploads/` and are served as static assets at `/public/*`.

Swagger docs are at `/docs`. All REST routes carry the prefix `/api`.

## Architecture

```
src/
├── app.module.ts           # root module; wires global guards
├── main.ts                 # bootstrap, Swagger setup, global pipe
├── common/
│   ├── decorators/         # @CurrentUser(), @Public(), @Roles()
│   ├── dto/                # PaginationQuery + paginate() helper
│   ├── guards/             # JwtAccessGuard, RolesGuard (both global via APP_GUARD)
│   └── pipes/              # global ValidationPipe
├── core/                   # feature modules
│   ├── auth/               # sign-up, sign-in, refresh
│   ├── user/               # User, Student, Teacher, Admin entities; avatar upload
│   ├── course/             # Course → Unit → Lesson hierarchy
│   ├── enrollment/         # Enrollment + Progress per Lesson
│   ├── assignment/         # Assignments for teachers to post
│   ├── group/              # Teacher-owned groups with M2M student members
│   ├── chat/               # Chat rooms, members, messages + Socket.io gateway
│   ├── live-lesson/        # Scheduled lessons with meet link
│   ├── assessment/         # AI speaking partner (Gemini audio + TTS)
│   ├── match/              # In-memory peer matchmaking
│   └── call/               # Call record (start/end/duration)
└── shared/
    ├── config/             # TypeORM DataSource config
    └── utils/              # bcrypt hash helpers
```

### Path alias

`@/` maps to `src/` (configured in `tsconfig.json`). Use it for all internal imports.

### Auth & authorization

`JwtAccessGuard` and `RolesGuard` are registered as global `APP_GUARD` providers, so every route is protected by default.

- Opt out of JWT with `@Public()` on the handler or controller.
- Restrict by role with `@Roles(UserRole.TEACHER)` (or STUDENT / ADMIN).
- Extract the authenticated user in a controller with `@CurrentUser()`.

JWT payload is `{ sub: userId }`. The access strategy resolves the full `User` entity on every request via `UserService.findById`.

Roles are not a column — they are derived from which of the three profile entities (`student`, `teacher`, `admin`) exist for that user (see `User.roles()` in `user.entity.ts`).

### User / role model

`User` has three optional one-to-one relations (`student`, `teacher`, `admin`). Presence of a relation means the user has that role. New sign-ups automatically get a `Student` profile created.

### WebSocket gateways

Two Socket.io namespaces authenticate via a JWT the client passes in `handshake.auth.token` or `Authorization: Bearer <token>`:

- `/chat` — room-based messaging; gateway writes to DB via `ChatService`, then broadcasts with `broadcastMessage`.
- `/match` — in-memory peer-to-peer matchmaking; paired users exchange WebRTC signals via `onSignal`. Match state is not persisted — only the resulting `Call` record is saved.

### Assessment module

Students upload audio clips via REST (`POST /api/assessment/conversations/:id/turns`). `AssessmentService` passes the audio to `GeminiService.converse()` (transcript + reply text), then synthesizes the reply with `GeminiService.synthesizeSpeech()` (raw PCM → WAV wrapper). Both audio files are stored under `uploads/assessment/`.

`GeminiService` reads its models and API key on `onModuleInit`. If `GEMINI_PROXY_URL` is set, it applies a process-wide proxy via `undici.setGlobalDispatcher`.

### File storage pattern

Each module that accepts uploads defines a `*.storage.ts` file that configures a `multer.diskStorage` destination and exposes a path-to-URL helper (e.g. `toAvatarPath`). Static serving maps `uploads/` → `/public/`.
