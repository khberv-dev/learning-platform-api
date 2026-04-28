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

## Architecture

**Module layout:**
- `src/core/` — domain feature modules. Each module folder contains one `<feature>.module.ts` file at the root plus typed subfolders:
  - `dto/` — request/response DTOs
  - `entity/` — TypeORM entity classes
  - `service/` — one service file per logical resource (e.g. `course.service.ts`, `unit.service.ts`, `lesson.service.ts`)
  - `controller/` — one controller file per logical resource (e.g. `course.controller.ts`, `admin-course.controller.ts`)
  - `storage/` — Multer `diskStorage` configs and file-filter helpers (only when the feature handles uploads)
  - additional resource folders as needed (e.g. `strategy/` in auth)
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

**New feature checklist:** create `src/core/<feature>/` with `<feature>.module.ts` at the root; add `dto/`, `entity/`, `service/` subfolders (plus `storage/` if uploads are needed); register the module in `AppModule`; register entities with `TypeOrmModule.forFeature` inside the feature module; export services that other modules need to inject.

## API Documentation

Swagger UI is served at `http://localhost:<PORT>/docs` (powered by `@nestjs/swagger`). The spec is generated at runtime — no static file to maintain.

**Conventions:**
- Every controller gets `@ApiTags('tag-name')`.
- Protected controllers/routes get `@ApiBearerAuth()`. The refresh endpoint uses `@ApiBearerAuth()` at the route level (refresh token in header), while the global access guard is documented via the top-level `addBearerAuth()` call in `main.ts`.
- DTO fields get `@ApiProperty()`. Use `example:` for fields with a constrained format (e.g. phone numbers).
- Public routes (`sign-up`, `sign-in`) need no security decorator — they have no `@ApiBearerAuth()` and the global bearer auth does not apply.
