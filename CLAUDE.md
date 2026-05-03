# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev      # run with hot reload (development)
npm run build          # compile TypeScript to dist/
npm run start:prod     # run compiled output
npm run test           # unit tests (Jest, rootDir: src, pattern: *.spec.ts)
npm run test:e2e       # end-to-end tests (test/jest-e2e.json config)
npm run test:cov       # test coverage
npm run lint           # ESLint with auto-fix
npm run format         # Prettier format
```

Run a single test file:
```bash
npx jest src/core/auth/auth.service.spec.ts
```

## Environment Variables

Copy `.env` and set:
- `PORT` — server port
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` — access token config
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` — refresh token config
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` — PostgreSQL connection
- `INIT_ADMIN_LOGIN`, `INIT_ADMIN_PASSWORD` — initial admin seed credentials
- `GEMINI_API_KEY` — Google Gen AI API key (used by `assessment` module)
- `GEMINI_MODEL` — Gemini model for audio analysis (e.g. `gemini-2.5-flash`)
- `GEMINI_TTS_MODEL` — Gemini TTS model for spoken feedback (e.g. `gemini-2.5-flash-preview-tts`)
- `GEMINI_TTS_VOICE` — optional, prebuilt voice name (default `Kore`)

## Architecture

**Module layout:**
- `src/core/` — domain feature modules. Each module folder contains one `<feature>.module.ts` file at the root plus typed subfolders:
  - `dto/` — request/response DTOs
  - `entity/` — TypeORM entity classes
  - `services/` — one service file per logical resource (e.g. `course.service.ts`, `unit.service.ts`, `lesson.service.ts`)
  - `controllers/` — one controller file per logical resource (e.g. `course.controller.ts`, `admin-course.controller.ts`)
  - `storage/` — Multer `diskStorage` configs and file-filter helpers (only when the feature handles uploads)
  - additional resource folders as needed (e.g. `strategies/` in auth)
  - the module file lives at the feature root, not in a subfolder
- `src/common/` — app-wide NestJS primitives (guards, decorators, pipes). Guards (`jwt-access.guard.ts`, `jwt-refresh.guard.ts`) wrap `@nestjs/passport` strategies named `jwt-access` / `jwt-refresh`.
- `src/shared/` — framework-agnostic utilities and config (`database.config.ts`, `hash.util.ts`).

**UserRole enum** lives at `src/core/user/enum/user-role.enum.ts` — import from there everywhere.

**Path alias:** `@/*` resolves to `src/*` (configured in `tsconfig.json` and supported via `tsconfig-paths` at runtime).

**Naming convention:** All TypeScript/application properties use **camelCase**; all database column names use **snake_case**. Enforce this explicitly on every entity column and relation with the `name:` option — e.g. `@Column({ name: 'is_active' })`, `@CreateDateColumn({ name: 'created_at' })`, `@JoinColumn({ name: 'course_id' })`. Never rely on TypeORM's default column naming.

**Database:** TypeORM with PostgreSQL. `dataSource` in `shared/config/database.config.ts` is used both for the NestJS module root (`TypeOrmModule.forRoot`) and can be used for CLI migrations. `synchronize: true` — schema is auto-synced from compiled entities in `dist/**/*.entity.js`, so **always build before running** if entities changed.

**User model:** A single `User` entity holds credentials and profile fields. Role is expressed via three optional `OneToOne` relations — `Student`, `Teacher`, `Admin` — rather than a column. A user's role is determined by which relation is populated. The `UserRole` enum (`src/common/enum/user-role.enum.ts`) is the canonical list of roles.

**Auth flow:** `POST /api/auth/sign-up` creates a `User` + `Student` record and returns `{ accessToken, refreshToken }`. Tokens are signed JWTs; access/refresh secrets and expiries come from config. Password hashing uses bcrypt with cost factor 15 (`hash.util.ts`).

**Validation:** A global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) is applied at bootstrap. DTOs use `class-validator` decorators. User-facing error messages are written in Uzbek.

**New feature checklist:** create `src/core/<feature>/` with `<feature>.module.ts` at the root; add `dto/`, `entity/`, `services/` subfolders (plus `storage/` if uploads are needed); register the module in `AppModule`; register entities with `TypeOrmModule.forFeature` inside the feature module; export services that other modules need to inject.

## API Documentation

Swagger UI is served at `http://localhost:<PORT>/docs` (powered by `@nestjs/swagger`). The spec is generated at runtime — no static file to maintain.

**Conventions:**
- Every controller gets `@ApiTags('resource-name')` — use the plain resource name (`courses`, `teachers`, `enrollments`), never a role prefix like `admin / courses`.
- Protected controllers/routes get `@ApiBearerAuth()`. The refresh endpoint uses `@ApiBearerAuth()` at the route level (refresh token in header), while the global access guard is documented via the top-level `addBearerAuth()` call in `main.ts`.
- DTO fields get `@ApiProperty()`. Use `example:` for fields with a constrained format (e.g. phone numbers).
- Public routes (`sign-up`, `sign-in`) need no security decorator — they have no `@ApiBearerAuth()` and the global bearer auth does not apply.
- Multipart/form-data endpoints use a manual `@ApiBody({ schema: { ... } })` inline schema instead of a DTO class, since Swagger cannot introspect `multipart/form-data` from class decorators.

## Controller Routing Pattern

When two controllers share the same base path (e.g. both `@Controller('courses')`), register the **less-privileged controller first** in the module's `controllers` array. NestJS/Express routes to the first registered handler that matches — the role guard then enforces access.

Example in `CourseModule`:
```ts
controllers: [CourseController, AdminCourseController]  // student first, admin second
```

This means:
- `GET /courses` → hits `CourseController` (student) first; admin's handler at the same path is shadowed
- Routes that only exist in `AdminCourseController` (e.g. `DELETE /courses/:id`) are still reachable

For a teacher self-update route (`PATCH /teachers/me`) that must not be captured by an admin param route (`PATCH /teachers/:id`): placing `TeacherController` before `AdminTeacherController` ensures the literal `me` segment is matched first.

## Password Security

The `User.password` column has `select: false` — TypeORM excludes it from every `find`/`findOne` query by default. **Do not remove this.**

The only place that needs the hash is `AuthService.signIn`, which calls `UserService.findByPhoneNumberForAuth`. That method uses a query builder with `.addSelect('user.password')` to opt back in. All other callers use `findByPhoneNumber` (no password).

## File Uploads

Uploaded files are served as static assets at `/public/<subfolder>/<filename>` (served by `ServeStaticModule` from the `uploads/` directory at the project root).

Each upload type has its own storage config in `<module>/storage/`:
- `uploads/course/` → `/public/course/…` (course images)
- `uploads/lesson/` → `/public/lesson/…` (lesson videos)
- `uploads/teacher-intro/` → `/public/teacher-intro/…` (teacher intro videos)

Storage files export three things: a `diskStorage` instance, a file-filter function, and a `toXxxPath(filename)` helper that returns the public URL path to store in the DB.

## Role Guard

`RolesGuard` (`src/common/guards/roles.guard.ts`) reads `user.roles` (a `UserRole[]` array) from the request. This array is attached by `JwtAccessStrategy.validate` → `UserService.findById`, which calls `_user.roles()` on the loaded entity. The `roles()` method on `User` checks which of `student`, `teacher`, `admin` relations are populated.

Do **not** check `user.student`, `user.teacher`, or `user.admin` directly in the guard — those relations are stripped from the object that `findById` returns.

## Student Gamification

`Student` entity has `points: int`, `coins: int`, `level: StudentLevel` (enum: A1, A2, B1, B2, C1, C2, default A1). These are managed server-side; no public write endpoint exists yet.

## Teacher Model

`Teacher` has `status: TeacherStatus` (ACTIVE / INACTIVE), `profession: string | null`, `introVideo: string | null`, and a `feedbacks: TeacherFeedback[]` relation. `summaryRating` is computed in-memory from feedbacks — it is not stored in the DB. When `status` changes, `User.isActive` is updated accordingly so inactive teachers cannot sign in.

## Match (WebRTC signaling)

Socket.IO gateway at namespace `/match` (`MatchGateway`). Auth: pass the access token as `auth.token` in the handshake (or `Authorization: Bearer …`) — verified directly with `JwtService` (no Passport). The global HTTP `JwtAccessGuard` does not apply to sockets.

State is in-memory (`MatchService`): a FIFO queue, one socket per user (a second connection from the same user kicks the first via `replaced` then disconnect), and a `sessionId → [userA, userB]` map.

Client → server events: `search`, `cancel`, `signal` (`{ data }` is opaquely relayed — SDP/ICE), `leave`.
Server → client events: `searching`, `matched` (`{ sessionId, role: 'caller' | 'callee' }`), `signal`, `partner-left` (`{ reason: 'leave' | 'disconnect' }`), `cancelled`, `left`, `replaced`, `unauthorized`, `error`.

Pairing rule: the user already in the queue is `callee`; the newcomer is `caller` and creates the SDP offer first.
