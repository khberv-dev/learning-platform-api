# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS 11 API backed by TypeORM and PostgreSQL. Application code lives in `src/`; `main.ts` bootstraps the server and `app.module.ts` wires the modules together. Business features are grouped under `src/core/<feature>/`, typically into `controllers/`, `services/`, `entity/`, `dto/`, `enum/`, and `storage/`. Cross-cutting guards, decorators, pipes, and interceptors belong in `src/common/`; shared configuration and utilities belong in `src/shared/`. Hand-written API guides live in `docs/`. Runtime uploads are stored in `uploads/`, and compiled output goes to `dist/`; do not hand-edit either.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run start:dev` runs the API in watch mode.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run start:prod` runs the compiled application.
- `npm run lint` applies ESLint fixes; review resulting changes.
- `npm run format` formats TypeScript with Prettier.
- `npm test` runs Jest unit tests; `npm run test:cov` adds coverage.

Copy `.env.example` to `.env` and provide PostgreSQL and integration credentials before local development. Never commit secrets. Avoid `npm run db:clear` unless intentionally dropping the configured database schema.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single quotes, trailing commas, and a 120-character print width. Run lint and formatting before submitting. Use the `@/` alias for internal imports. Name files by responsibility, such as `payment.service.ts`, `create-plan.dto.ts`, and `admin-course.controller.ts`; use PascalCase for classes and camelCase for properties and methods. Keep identifiers in English, while matching the existing Uzbek style for comments and user-facing messages.

## Testing Guidelines

Jest discovers `src/**/*.spec.ts`; colocate tests with the unit under test and use names such as `auth.service.spec.ts`. Add focused tests for service logic, authorization, payment state transitions, and validation edge cases. No spec files currently exist, and `npm run test:e2e` is not usable until `test/jest-e2e.json` is added. Do not treat a vacuously passing test run as coverage.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit prefixes, especially `feat:` and `refactor:`. Use concise, imperative subjects, for example `fix: reject expired enrollment payment`. Pull requests should explain behavior changes, list verification commands, link relevant issues, and update `docs/` when endpoints or flows change. Include request/response examples for API contract changes.
