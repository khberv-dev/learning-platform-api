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
- `src/core/` — domain feature modules (auth, user, …). Each follows the pattern: `module.ts` → `controller.ts` → `service.ts` → `dto/` → `entity/`.
- `src/common/` — app-wide NestJS primitives (guards, pipes). Guards (`jwt-access.guard.ts`, `jwt-refresh.guard.ts`) wrap `@nestjs/passport` strategies named `jwt-access` / `jwt-refresh`.
- `src/shared/` — framework-agnostic utilities and config (`database.config.ts`, `hash.util.ts`).

**Path alias:** `@/*` resolves to `src/*` (configured in `tsconfig.json` and supported via `tsconfig-paths` at runtime).

**Database:** TypeORM with PostgreSQL. `dataSource` in `shared/config/database.config.ts` is used both for the NestJS module root (`TypeOrmModule.forRoot`) and can be used for CLI migrations. `synchronize: true` — schema is auto-synced from compiled entities in `dist/**/*.entity.js`, so **always build before running** if entities changed.

**User model:** A single `User` entity holds credentials and profile fields. Role is expressed via three optional `OneToOne` relations — `Student`, `Teacher`, `Admin` — rather than a column. A user's role is determined by which relation is populated. The `UserRole` enum (`src/common/enum/user-role.enum.ts`) is the canonical list of roles.

**Auth flow:** `POST /api/auth/sign-up` creates a `User` + `Student` record and returns `{ accessToken, refreshToken }`. Tokens are signed JWTs; access/refresh secrets and expiries come from config. Password hashing uses bcrypt with cost factor 15 (`hash.util.ts`).

**Validation:** A global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) is applied at bootstrap. DTOs use `class-validator` decorators. User-facing error messages are written in Uzbek.

**New feature checklist:** create `src/core/<feature>/` with a module, controller, service, `dto/`, and `entity/` sub-directories; register the module in `AppModule`; register entities with `TypeOrmModule.forFeature` inside the feature module and export the service if other modules need it.

## API Documentation

Swagger UI is served at `http://localhost:<PORT>/docs` (powered by `@nestjs/swagger`). The spec is generated at runtime — no static file to maintain.

**Conventions:**
- Every controller gets `@ApiTags('tag-name')`.
- Protected controllers/routes get `@ApiBearerAuth()`. The refresh endpoint uses `@ApiBearerAuth()` at the route level (refresh token in header), while the global access guard is documented via the top-level `addBearerAuth()` call in `main.ts`.
- DTO fields get `@ApiProperty()`. Use `example:` for fields with a constrained format (e.g. phone numbers).
- Public routes (`sign-up`, `sign-in`) need no security decorator — they have no `@ApiBearerAuth()` and the global bearer auth does not apply.
