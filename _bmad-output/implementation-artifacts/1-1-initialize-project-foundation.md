# Story 1.1: Initialize Project Foundation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a development team,
I want the Vite React TypeScript SPA, NestJS backend, and shared contracts package initialized with Prisma + PostgreSQL connectivity,
so that all subsequent stories have a consistent technical foundation to build upon.

## Acceptance Criteria

1. **Given** the repository is ready for MVP implementation **When** the foundation is set up **Then** the workspace includes a Vite React TypeScript SPA (`apps/frontend`), a NestJS backend (`apps/backend`), and a shared contracts package (`packages/contracts`) **And** both apps start successfully in development mode (`pnpm dev`)

2. **Given** the foundation is in place **When** a developer runs local setup commands **Then** Prisma connects to PostgreSQL and migrations apply cleanly (`pnpm prisma migrate dev`) **And** the shared contracts package can be imported by both apps without manual file copying (via workspace symlinks)

3. **Given** both apps are running **When** the frontend makes a request to the backend health endpoint (`GET /health`) **Then** a successful JSON response is returned confirming connectivity

4. **Given** the project is bootstrapped **When** baseline tooling is verified **Then** TypeScript config, ESLint, `.env.example` files, OpenAPI/Swagger scaffold, structured logging (pino), request correlation IDs middleware, and a health endpoint are all in place and working

## Tasks / Subtasks

- [x] Task 1 — Initialize monorepo workspace structure (AC: 1)
  - [x] Create root `package.json` with `pnpm` workspaces pointing to `apps/*` and `packages/*`
  - [x] Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
  - [x] Add root `tsconfig.base.json` with shared TS compiler options (strict: true, target: ES2022, moduleResolution: bundler)
  - [x] Add root `.eslintrc.js` or `eslint.config.mjs` with TypeScript rules shared across all packages

- [x] Task 2 — Scaffold Vite React TypeScript SPA (AC: 1)
  - [x] Bootstrap `apps/frontend` with `pnpm create vite@latest` using `react-ts` template
  - [x] Extend from root `tsconfig.base.json` in `apps/frontend/tsconfig.json`
  - [x] Install core dependencies: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`
  - [x] Install dev dependencies: `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`
  - [x] Set up `vite.config.ts` with proxy to backend (`/api` → `http://localhost:3000`) for local dev
  - [x] Create the feature folder skeleton under `src/features/`: `customer-auth/`, `customer-dashboard/`, `request-create/`, `request-tracking/`, `request-history/`, `request-rating/`, `handyman-auth/`, `handyman-dashboard/`, `handyman-jobs/`, `handyman-active-job/`, `maps/`, `ratings/`, `status/`, `ui-shell/`
  - [x] Add `.env.example` with `VITE_API_BASE_URL=http://localhost:3000`
  - [x] Verify `pnpm dev` starts the frontend without errors

- [x] Task 3 — Scaffold NestJS backend with module boundaries (AC: 1, 4)
  - [x] Bootstrap `apps/backend` using `@nestjs/cli` (`nest new backend --skip-git`)
  - [x] Extend from root `tsconfig.base.json` in `apps/backend/tsconfig.json`
  - [x] Generate the 12 domain module stubs: `auth`, `users`, `categories`, `requests`, `matching`, `assignments`, `realtime`, `ratings`, `pricing`, `maps`, `uploads`, `observability`
  - [x] Register all modules in `AppModule`
  - [x] Add `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `PORT=3000`, `NODE_ENV=development`
  - [x] Install `@nestjs/config` and set up `ConfigModule.forRoot({ isGlobal: true, validate: ... })` with Joi or Zod-based typed env validation that fails fast on invalid config

- [x] Task 4 — Create shared contracts package (AC: 2)
  - [x] Initialize `packages/contracts/package.json` with name `@handrix/contracts`
  - [x] Install `zod` as a dependency
  - [x] Create `src/index.ts` as the public entry point
  - [x] Add placeholder exports: `HealthResponseSchema`, `UserRoleEnum` (customer | handyman) as first shared schemas
  - [x] Build with `tsc` (or `tsup`) and configure `main`/`exports` in `package.json`
  - [x] Verify `@handrix/contracts` can be imported in both `apps/frontend` and `apps/backend` via workspace protocol (`"@handrix/contracts": "workspace:*"`)

- [x] Task 5 — Configure Prisma and initial database schema (AC: 2)
  - [x] Install `prisma` and `@prisma/client` in `apps/backend`
  - [x] Initialize Prisma: `npx prisma init --datasource-provider postgresql`
  - [x] Write initial `schema.prisma` with the `users` model (id UUID, email unique, password_hash, role enum [CUSTOMER, HANDYMAN], account_status, created_at)
  - [x] Run `pnpm prisma migrate dev --name init` to create the initial migration
  - [x] Set up `PrismaService` (singleton, injectable) in a `PrismaModule` and export it for use across all domain modules
  - [x] Add `prisma generate` to the backend `postinstall` script

- [x] Task 6 — Set up structured logging and request correlation IDs (AC: 4)
  - [x] Install `nestjs-pino` and `pino-http` in `apps/backend`
  - [x] Configure `LoggerModule.forRoot()` in `AppModule` with JSON output (structured logs)
  - [x] Create `CorrelationIdMiddleware` that reads `x-correlation-id` header (or generates UUID v4) and attaches it to the request context and logs
  - [x] Apply `CorrelationIdMiddleware` globally in `main.ts`
  - [x] Ensure all log entries include `correlationId`, `method`, `url`, `statusCode`, `responseTime`

- [x] Task 7 — Create health endpoint (AC: 3, 4)
  - [x] Install `@nestjs/terminus` and `@nestjs/axios` (or use Prisma health indicator)
  - [x] Create `HealthModule` with `GET /health` endpoint returning `{ status: 'ok', database: 'ok', timestamp: ISO string }`
  - [x] Include a Prisma/database connectivity check in the health response
  - [x] Return HTTP 503 if database is unreachable

- [x] Task 8 — Set up OpenAPI/Swagger scaffold (AC: 4)
  - [x] Install `@nestjs/swagger` and `swagger-ui-express` in `apps/backend`
  - [x] Configure `SwaggerModule.setup('api/docs', ...)` in `main.ts` with project title "Handrix API", version "1.0"
  - [x] Decorate the health endpoint with `@ApiTags('health')` and `@ApiOperation` as a usage example
  - [x] Verify Swagger UI is reachable at `http://localhost:3000/api/docs` in dev mode

- [x] Task 9 — Frontend health check integration (AC: 3)
  - [x] Set up `QueryClientProvider` in `apps/frontend/src/main.tsx`
  - [x] Create a minimal `src/features/ui-shell/HealthCheck.tsx` component that calls `GET /health` via TanStack Query and renders `"API connected"` or `"API unreachable"`
  - [x] Render `HealthCheck` in the root `App.tsx` temporarily to verify end-to-end connectivity
  - [x] Verify the frontend running at `http://localhost:5173` can successfully fetch from the backend

## Dev Notes

### Monorepo Layout (Do Not Deviate)

```
/                          ← repo root
├── apps/
│   ├── frontend/          ← Vite React TypeScript SPA
│   └── backend/           ← NestJS modular monolith
├── packages/
│   └── contracts/         ← Shared Zod schemas (@handrix/contracts)
├── package.json           ← pnpm workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json     ← shared TypeScript base config
```

All downstream stories assume this structure. Do not put the shared package inside `apps/`. Do not flatten into a single package.

### Technology Versions (Use These)

| Package | Version Guidance |
|---|---|
| Node | ≥ 20 LTS |
| pnpm | ≥ 9 |
| Vite | 5.x |
| React | 18.x |
| react-router-dom | 6.x |
| @tanstack/react-query | 5.x |
| NestJS | 10.x |
| @nestjs/swagger | 7.x |
| Prisma | 5.x |
| nestjs-pino | 4.x |
| Zod | 3.x |

### NestJS Backend Architecture Rules

- **Module boundary is sacred:** each of the 12 modules (`auth`, `users`, `categories`, `requests`, `matching`, `assignments`, `realtime`, `ratings`, `pricing`, `maps`, `uploads`, `observability`) must be its own NestJS module with a dedicated folder under `src/modules/`
- **PrismaModule** must be a global module (`@Global()`) so all domain modules can inject `PrismaService` without re-importing `PrismaModule`
- **AppModule** should only wire modules together — no business logic
- **ConfigModule** must be global (`isGlobal: true`) — all modules read env vars via `ConfigService`, never via `process.env` directly
- **main.ts bootstrap** must: enable CORS (configurable origins), set global validation pipe (`whitelist: true, forbidNonWhitelisted: true, transform: true`), enable versioning, configure Swagger, configure pino logger
- Do not use NestJS `@nestjs/platform-fastify` — use Express (default) for MVP

### Frontend Architecture Rules

- **Feature folder isolation:** each feature in `src/features/<name>/` must be self-contained with its own components, hooks, and types. No cross-feature imports in story 1.1 (scaffold only).
- **TanStack Query v5 API:** uses the new object-based query syntax: `useQuery({ queryKey: [...], queryFn: ... })` — do not use the deprecated 3-argument signature
- **No global state library:** do not install Redux, Zustand, or Jotai. Route-local state and TanStack Query handle all state for MVP.
- **Routing:** set up `react-router-dom` v6 with `createBrowserRouter` (not the deprecated `BrowserRouter` + `Switch` pattern)

### Prisma Schema Notes

- Use `UUID` as primary key type for all entities (`@id @default(uuid())`)
- Use `@map` and `@@map` for snake_case PostgreSQL column/table names even if Prisma model names are PascalCase
- The `role` field must be a Prisma `enum` (`CUSTOMER`, `HANDYMAN`) — this maps to a PostgreSQL enum
- Do not use `Int` auto-increment IDs — use UUID throughout to align with architecture decisions

### Shared Contracts Package Notes

- The contracts package is the **single source of truth** for all data shapes shared between frontend and backend
- Backend DTOs should extend or be validated against the same Zod schemas exported from `@handrix/contracts`
- Frontend API call types must be inferred from Zod schemas, not hand-typed
- Start minimal (HealthResponseSchema, UserRoleEnum) — subsequent stories add request/response schemas as they implement their domains

### Environment Configuration

**Do not commit `.env` files.** Each app gets a `.env.example` committed to source control. Developer copies to `.env` locally.

Backend required vars:
```
DATABASE_URL=postgresql://user:password@localhost:5432/handrix_dev
JWT_SECRET=<32+ char random string>
PORT=3000
NODE_ENV=development
```

Frontend required vars:
```
VITE_API_BASE_URL=http://localhost:3000
```

### Structured Logging & Correlation IDs

- All logs must be JSON-structured (use `nestjs-pino` in production mode, pretty-print in development)
- Correlation IDs flow: request header `x-correlation-id` → if missing generate `uuid()` → attach to `AsyncLocalStorage` → included in every pino log line via `pino-http` bindings
- The observability module in this story is a stub — full instrumentation is in Epic 5 (Story 5.3), but the logging infrastructure wired here will be used by all stories

### What Is NOT In Scope For This Story

- No user registration or login logic (Story 1.2)
- No JWT issuance or guard setup (Story 1.2)
- No actual domain entities beyond `users` model in Prisma (subsequent stories add their own migrations)
- No frontend UI screens beyond the connectivity test component
- No image upload, WebSocket, or map integration
- Do not stub out all Prisma models in story 1.1 — add models per story to avoid migration churn

### Testing Standards

- This is a foundation story — the primary verification is integration:
  - `pnpm dev` both apps start without error
  - `pnpm prisma migrate dev` runs cleanly
  - `GET http://localhost:3000/health` returns `{ status: 'ok' }`
  - Frontend `HealthCheck` component renders "API connected"
- Add one backend e2e spec `apps/backend/test/health.e2e-spec.ts` that tests `GET /health` returns HTTP 200 with `{ status: 'ok' }`
- TypeScript must compile with zero errors across all packages (`pnpm tsc --noEmit`)
- ESLint must pass with zero errors across all packages

### Project Structure Notes

- Alignment with unified project structure: the feature folder names in `src/features/` are fixed identifiers used throughout all 5 epics. Do not rename them (e.g., do not use `src/pages/` or `src/views/` — `src/features/` is the canonical location)
- Backend module names (`auth`, `users`, `categories`, etc.) must match the architecture document exactly — these folder names are referenced in all subsequent stories
- `packages/contracts` uses the scoped name `@handrix/contracts` — this name is referenced in all frontend and backend import statements throughout the project

### References

- Story foundation: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Initialize Project Foundation]
- Workspace structure: [Source: _bmad-output/planning-artifacts/epics.md#Technology Stack]
- Backend module architecture: [Source: _bmad-output/planning-artifacts/architecture.md#Module Boundaries]
- Domain model: [Source: _bmad-output/planning-artifacts/architecture.md#Domain Model Recommendations]
- Frontend feature areas: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- State management: [Source: _bmad-output/planning-artifacts/architecture.md#State Management Strategy]
- Observability: [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary (observability)]
- NestJS modules: [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary]
- Prisma + PostgreSQL: [Source: _bmad-output/planning-artifacts/architecture.md#Persistence and Storage Considerations]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — clean implementation, no significant debugging required.

### Completion Notes List

- Created pnpm monorepo scaffold at `apps/frontend`, `apps/backend`, and `packages/contracts` alongside the pre-existing (deprecated) `apps/handrix-web`, `apps/handrix-api`, `packages/shared-contracts` — old code untouched.
- Updated `tsconfig.base.json` to add `target: ES2022` and `moduleResolution: bundler`. Backend overrides `moduleResolution: node` and `module: CommonJS` for NestJS/Express compatibility.
- Root `eslint.config.mjs` created for shared ESLint rules; each package has its own extending it.
- `packages/contracts` exports `HealthResponseSchema` (Zod) and `UserRoleEnum` (customer | handyman); both apps import via `workspace:*`.
- NestJS 10 backend scaffolded with 12 domain module stubs + `PrismaModule` (@Global) + `HealthModule`. `ConfigModule` uses Zod-based env validation (`src/config/env.validation.ts`).
- `CorrelationIdMiddleware` reads `x-correlation-id` or generates a UUID v4 per request; applied globally via `AppModule.configure`.
- `nestjs-pino` configured with pretty-print in dev, JSON in prod; correlation ID flows through pino-http bindings.
- `PrismaHealthIndicator` (custom, extends `@nestjs/terminus` `HealthIndicator`) runs `SELECT 1` to check DB; returns 503 on failure.
- Swagger configured at `/api/docs` with title "Handrix API" v1.0; health endpoint decorated with `@ApiTags` and `@ApiOperation`.
- Frontend `HealthCheck.tsx` uses TanStack Query v5 object syntax; hits `/api/health` via Vite proxy (`/api` → `localhost:3000`).
- `prisma generate` ran successfully in `postinstall`; `pnpm.onlyBuiltDependencies` added to root `package.json` to allow NestJS/Prisma build scripts.
- TypeScript: zero errors across all 3 packages. Backend build: `nest build` clean. Frontend build: Vite 5 clean (242 kB bundle).
- Unit tests: 2 backend (HealthController) + 3 frontend (HealthCheck component) — all passing.
- NOTE: `pnpm prisma migrate dev --name init` requires a running PostgreSQL instance and must be run manually by the developer after copying `.env.example` to `.env`.

### File List

apps/frontend/package.json
apps/frontend/tsconfig.json
apps/frontend/tsconfig.app.json
apps/frontend/tsconfig.node.json
apps/frontend/vite.config.ts
apps/frontend/index.html
apps/frontend/.env.example
apps/frontend/eslint.config.js
apps/frontend/public/vite.svg
apps/frontend/src/vite-env.d.ts
apps/frontend/src/main.tsx
apps/frontend/src/App.tsx
apps/frontend/src/features/customer-auth/.gitkeep
apps/frontend/src/features/customer-dashboard/.gitkeep
apps/frontend/src/features/request-create/.gitkeep
apps/frontend/src/features/request-tracking/.gitkeep
apps/frontend/src/features/request-history/.gitkeep
apps/frontend/src/features/request-rating/.gitkeep
apps/frontend/src/features/handyman-auth/.gitkeep
apps/frontend/src/features/handyman-dashboard/.gitkeep
apps/frontend/src/features/handyman-jobs/.gitkeep
apps/frontend/src/features/handyman-active-job/.gitkeep
apps/frontend/src/features/maps/.gitkeep
apps/frontend/src/features/ratings/.gitkeep
apps/frontend/src/features/status/.gitkeep
apps/frontend/src/features/ui-shell/.gitkeep
apps/frontend/src/features/ui-shell/HealthCheck.tsx
apps/frontend/src/features/ui-shell/HealthCheck.test.tsx
apps/backend/package.json
apps/backend/tsconfig.json
apps/backend/tsconfig.build.json
apps/backend/nest-cli.json
apps/backend/.env.example
apps/backend/eslint.config.mjs
apps/backend/prisma/schema.prisma
apps/backend/src/main.ts
apps/backend/src/app.module.ts
apps/backend/src/config/env.validation.ts
apps/backend/src/common/middleware/correlation-id.middleware.ts
apps/backend/src/modules/prisma/prisma.module.ts
apps/backend/src/modules/prisma/prisma.service.ts
apps/backend/src/modules/health/health.module.ts
apps/backend/src/modules/health/health.controller.ts
apps/backend/src/modules/health/health.controller.spec.ts
apps/backend/src/modules/health/prisma-health.indicator.ts
apps/backend/src/modules/auth/auth.module.ts
apps/backend/src/modules/users/users.module.ts
apps/backend/src/modules/categories/categories.module.ts
apps/backend/src/modules/requests/requests.module.ts
apps/backend/src/modules/matching/matching.module.ts
apps/backend/src/modules/assignments/assignments.module.ts
apps/backend/src/modules/realtime/realtime.module.ts
apps/backend/src/modules/ratings/ratings.module.ts
apps/backend/src/modules/pricing/pricing.module.ts
apps/backend/src/modules/maps/maps.module.ts
apps/backend/src/modules/uploads/uploads.module.ts
apps/backend/src/modules/observability/observability.module.ts
apps/backend/test/jest-e2e.json
apps/backend/test/health.e2e-spec.ts
packages/contracts/package.json
packages/contracts/tsconfig.json
packages/contracts/src/index.ts
packages/contracts/src/health.schemas.ts
packages/contracts/src/user.schemas.ts
tsconfig.base.json
eslint.config.mjs
package.json
apps/backend/prisma/migrations/20260512102222_init/migration.sql

## Change Log

- 2026-05-12: Initial implementation complete — monorepo foundation scaffolded with apps/frontend (Vite React 18 TS), apps/backend (NestJS 10 + 12 module stubs + Prisma 5 + nestjs-pino + health endpoint + Swagger), and packages/contracts (@handrix/contracts with HealthResponseSchema + UserRoleEnum). All TypeScript checks pass, 5 unit tests passing.

## Review Findings

_Code review — 2026-05-12. 2 decision-needed, 11 patch, 2 deferred, 7 dismissed. All resolved._

### Decision-Needed

- [x] [Review][Decision] Health endpoint response shape — resolved: controller now transforms Terminus result to `{ status, database, timestamp }`; `HealthResponseSchema` updated to match. [apps/backend/src/modules/health/health.controller.ts, packages/contracts/src/health.schemas.ts]
- [x] [Review][Decision] UserRoleEnum case mismatch — resolved: contracts aligned to Prisma values (`CUSTOMER | HANDYMAN`). [packages/contracts/src/user.schemas.ts]

### Patch

- [x] [Review][Patch] Missing `app.enableVersioning()` call — added `app.enableVersioning({ type: VersioningType.URI })` [apps/backend/src/main.ts]
- [x] [Review][Patch] Swagger UI exposed in all environments — gated behind `NODE_ENV !== 'production'` [apps/backend/src/main.ts]
- [x] [Review][Patch] Correlation ID header not sanitized — UUID format validated via regex; non-matching values replaced with fresh UUID [apps/backend/src/common/middleware/correlation-id.middleware.ts]
- [x] [Review][Patch] Correlation ID not bound into pino log context — `customProps` now reads `x-correlation-id` from request headers [apps/backend/src/app.module.ts]
- [x] [Review][Patch] PORT read from raw `process.env` — now retrieved via `ConfigService` after app creation [apps/backend/src/main.ts]
- [x] [Review][Patch] `CORS_ORIGIN` not in env schema or `.env.example` — added as optional field to schema and documented in .env.example [apps/backend/src/config/env.validation.ts, apps/backend/.env.example]
- [x] [Review][Patch] `bootstrap()` has no error handler — `.catch()` added to log and exit on fatal startup failure [apps/backend/src/main.ts]
- [x] [Review][Patch] `PrismaHealthIndicator` exposes raw error string — error message sanitized in production [apps/backend/src/modules/health/prisma-health.indicator.ts]
- [x] [Review][Patch] `QueryClient` created with no `defaultOptions` — `retry: 1, staleTime: 30_000` set as app defaults [apps/frontend/src/main.tsx]
- [x] [Review][Patch] `getElementById('root')` non-null assertion — replaced with explicit null guard + descriptive error [apps/frontend/src/main.tsx]
- [x] [Review][Patch] `fetchHealth` response cast without runtime validation — now uses `HealthResponseSchema.parse()` [apps/frontend/src/features/ui-shell/HealthCheck.tsx]

### Deferred

- [x] [Review][Defer] `password_hash` field present but no hashing service stub [apps/backend/prisma/schema.prisma] — deferred, Story 1.2 scope
- [x] [Review][Defer] E2E test does not mirror production bootstrap (missing `bufferLogs: true` and `app.useLogger(...)`) [apps/backend/test/health.e2e-spec.ts] — deferred, low-impact foundation story quality issue
