# Story 5.3: Instrument Observability and Validate Deployment Readiness

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a delivery team,
I want structured logging, correlation IDs, health checks, typed environment config, and CI/CD quality gates in place,
so that the platform can be deployed consistently and failures can be traced before users report them.

## Acceptance Criteria

1. **Given** the backend handles requests across all MVP flows **When** meaningful application events occur **Then** structured logs are emitted with request correlation IDs that tie log entries to specific user actions **And** the logs are sufficient to trace a request lifecycle failure without relying on raw unstructured output.

2. **Given** the platform is running in a deployed environment **When** a health check is performed **Then** the health endpoint returns readiness status covering database connectivity and critical service dependencies **And** failures are detectable before users report them.

3. **Given** the frontend and backend run across local, staging, and production environments **When** each environment starts **Then** environment variables are validated through typed configuration at startup **And** invalid or missing configuration fails fast with a clear error rather than a hidden runtime defect.

4. **Given** code changes are prepared for integration **When** the CI/CD pipeline runs **Then** lint, type checks, tests, and migration verification run as deployment gates **And** the pipeline supports separate frontend and backend builds without breaking the shared contracts package.

## Tasks / Subtasks

- [x] Task 1 — Add domain-level structured logging to key service methods (AC: 1)
  - [x] In `apps/backend/src/modules/requests/requests.service.ts`, add `private readonly logger = new Logger(RequestsService.name)` and emit log entries for:
    - `createRequest`: `this.logger.log({ event: 'request.created', requestId: created.id, customerId, categoryId })` after successful creation
    - `findAllForCustomer`: log a warning if the result includes any request where `assignedHandymanId` is non-null but `assignedHandymanDisplayName` is null (deferred data-inconsistency flag from 2-1 review)
    - Error paths: `this.logger.error({ event: 'request.create.failed', customerId }, err.message)` in catch blocks
  - [x] In `apps/backend/src/modules/assignments/assignments.service.ts`, add `private readonly logger = new Logger(AssignmentsService.name)` and emit:
    - `acceptJob`: log `{ event: 'job.accepted', offerId, handymanId, requestId }` on success; log `{ event: 'job.accept.conflict', offerId, handymanId }` on already-assigned path
    - `declineJob`: log `{ event: 'job.declined', offerId, handymanId }`
  - [x] In `apps/backend/src/modules/matching/matching.service.ts`, add Logger and emit:
    - `findAndOfferHandymen`: log `{ event: 'matching.offers.created', requestId, handymanCount: N }` after creating offer records; log `{ event: 'matching.no_eligible_handymen', requestId }` if count is zero
  - [x] In `apps/backend/src/modules/ratings/ratings.service.ts`, add Logger and emit:
    - `submitRating`: log `{ event: 'rating.submitted', requestId, handymanId, stars }` on success; log `{ event: 'rating.duplicate', requestId }` when P2002 is caught
  - [x] In `apps/backend/src/modules/realtime/realtime.service.ts`, add Logger and emit:
    - `emitStatusUpdate`: log `{ event: 'realtime.status.emitted', requestId, status }` before `this.server.to(...).emit(...)`
  - [x] **Import pattern**: `import { Logger } from '@nestjs/common'` — same as `AllExceptionsFilter` at `apps/backend/src/common/filters/all-exceptions.filter.ts`. DO NOT install any new logging library. Do NOT import from `nestjs-pino` directly in services.

- [x] Task 2 — Verify and extend the health endpoint (AC: 2)
  - [x] Read `apps/backend/src/modules/health/health.controller.ts` and `prisma-health.indicator.ts` — these are already implemented with `@nestjs/terminus` and do `SELECT 1` against Postgres
  - [x] **The DB check is sufficient for MVP.** Do NOT add storage/disk health checks — upload directory writability is a startup concern already covered by `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` in `main.ts`
  - [x] Verify the health response includes `status`, `database`, and `timestamp` — it already does. No code changes needed to the health controller unless a gap is found during review
  - [x] Confirm `@SkipThrottle()` is applied so monitoring probes never get 429 — already in place from Story 5.2

- [x] Task 3 — Verify env validation completeness and document env vars (AC: 3)
  - [x] Read `apps/backend/src/config/env.validation.ts` — already validates: `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN` (default `7d`), `PORT` (default 3000), `NODE_ENV` (enum), `CORS_ORIGIN` (required, min 1)
  - [x] Read `apps/backend/.env.example` — verify all vars from the Zod schema are present with sensible dev defaults
  - [x] Read `apps/frontend/.env.example` — currently only has `VITE_API_BASE_URL=http://localhost:3000`. Verify this is the only env var the frontend Vite config reads. If Vite reads other `VITE_*` vars, add them to `.env.example`
  - [x] **No schema changes are required** unless a required var is missing from the schema. The startup fail-fast behavior is already in place via `ConfigModule.forRoot({ isGlobal: true, validate })` in `app.module.ts`

- [x] Task 4 — Fix CI/CD pipeline env vars and package filter names (AC: 4)
  - [x] **Read `.github/workflows/ci.yml` carefully.** The current file has STALE env vars from the OLD project (HANDRIX_* prefix). These must be replaced with the current env var names from `apps/backend/src/config/env.validation.ts` and `apps/frontend/.env.example`
  - [x] Replace the `env:` block in `ci.yml` with the correct vars:
    ```yaml
    env:
      # Backend
      DATABASE_URL: postgresql://handrix:handrix@127.0.0.1:5432/handrix?schema=public
      JWT_SECRET: ci-jwt-secret-at-least-32-characters-long
      JWT_EXPIRES_IN: 7d
      PORT: 3000
      NODE_ENV: test
      CORS_ORIGIN: http://localhost:5173
      # Frontend
      VITE_API_BASE_URL: http://localhost:3000
    ```
  - [x] **Read root `package.json`** scripts. The `ci:backend`, `ci:frontend`, `ci:contracts` scripts use WRONG filter names:
    - `--filter handrix-api` should be `--filter handrix-backend` (the backend package is named `handrix-backend` in `apps/backend/package.json`)
    - `--filter handrix-web` should be `--filter handrix-frontend` (the frontend package is named `handrix-frontend` in `apps/frontend/package.json`)
    - `--filter @handrix/shared-contracts` should be `--filter @handrix/contracts` (the contracts package is named `@handrix/contracts` in `packages/contracts/package.json`)
  - [x] Update root `package.json` scripts:
    ```json
    "ci:contracts": "pnpm --filter @handrix/contracts build",
    "ci:backend": "pnpm --filter @handrix/contracts build && pnpm --filter handrix-backend prisma:generate && pnpm --filter handrix-backend prisma:validate && pnpm --filter handrix-backend prisma:migrate:deploy && pnpm --filter handrix-backend typecheck && pnpm --filter handrix-backend lint && pnpm --filter handrix-backend build",
    "ci:frontend": "pnpm --filter @handrix/contracts build && pnpm --filter handrix-frontend typecheck && pnpm --filter handrix-frontend lint && pnpm --filter handrix-frontend build",
    "verify:ci": "pnpm ci:contracts && pnpm ci:frontend && pnpm ci:backend"
    ```
  - [x] Note: `test:ci` and `test:e2e:ci` are intentionally removed from `ci:backend` — the project has no tests (they were intentionally removed). Do NOT add test steps back
  - [x] Verify the CI workflow steps `pnpm ci:contracts`, `pnpm ci:frontend`, `pnpm ci:backend` match the updated root scripts
  - [x] The PostgreSQL service container in `ci.yml` is correct (postgres:17-alpine, user/pass/db all `handrix`) — do NOT change it

## Dev Notes

### What Is Already In Place — Do Not Rebuild

**Structured logging infrastructure is fully wired (AC1 baseline done):**
- `nestjs-pino` (`LoggerModule.forRoot`) is registered in `app.module.ts` lines 31-46. It auto-logs every HTTP request/response with `{ method, url, correlationId }` in the log entry's custom props
- `CorrelationIdMiddleware` (`apps/backend/src/common/middleware/correlation-id.middleware.ts`) is applied to all routes. It reads or generates a UUID v4 as `x-correlation-id`, sets it on the request header, and echoes it in the response header
- `main.ts` uses `bufferLogs: true` + `app.useLogger(app.get(Logger))` so NestJS native Logger calls are piped through pino

**What's missing for AC1**: Key domain services currently have NO Logger calls. pino-http logs HTTP pairs but doesn't log domain events like "request accepted", "handyman matched", "rating submitted". Task 1 adds those.

**How correlationId propagates to Logger calls in services:**
- pino-http stores correlationId in the request-level child logger and in the HTTP log entry
- `new Logger('ServiceName').log(...)` calls go through the global pino root logger — they do NOT automatically carry the request's correlationId in the log body
- **This is acceptable for MVP**: the HTTP log (with correlationId) plus service domain logs (with entity IDs like requestId, handymanId) together provide sufficient traceability. An SRE can grep by requestId across both log types to reconstruct a failure timeline
- Do NOT attempt to implement request-scoped pino child loggers or AsyncLocalStorage correlationId propagation — that is out of scope for this story

**Health endpoint is complete (AC2 done):**
- `GET /api/health` via `HealthController` at `apps/backend/src/modules/health/health.controller.ts`
- Uses `@nestjs/terminus` + `PrismaHealthIndicator` (does `SELECT 1`) + `HealthCheckService`
- `@SkipThrottle()` applied — monitoring probes never get 429
- Returns `{ status: 'ok', database: 'ok' | 'error', timestamp: ISO }`
- No code changes needed here

**Env validation is complete (AC3 done):**
- `apps/backend/src/config/env.validation.ts` validates all required vars at startup via Zod
- `ConfigModule.forRoot({ isGlobal: true, validate })` in `app.module.ts` runs `validate()` before the app starts — invalid config throws immediately with a clear Zod error message
- The frontend has no startup validation (Vite bakes env vars at build time) — `VITE_*` vars missing at build become `undefined` strings, not startup failures

**CI file exists but is broken (AC4 needs fixing):**
- `.github/workflows/ci.yml` exists and has the correct structure (postgres service, pnpm setup, node 22, install, verify steps)
- The `env:` block has STALE env vars from the previous project (HANDRIX_* prefix) — these do nothing for the current project
- The root `package.json` ci scripts use WRONG package filter names — `handrix-api`, `handrix-web`, `@handrix/shared-contracts` all point to old artifacts

**ObservabilityModule is an empty shell:**
- `apps/backend/src/modules/observability/observability.module.ts` is registered in `app.module.ts` but contains only `@Module({}) export class ObservabilityModule {}`
- It is not a gap — pino/correlation/health are handled elsewhere. Do NOT add complexity to it in this story. Leave it as-is

### Logger Import and Usage Pattern

```ts
import { Logger } from '@nestjs/common';

@Injectable()
export class SomeService {
  private readonly logger = new Logger(SomeService.name);

  async someMethod(id: string): Promise<void> {
    // Structured object log — pino serializes this as JSON
    this.logger.log({ event: 'some.event', entityId: id });
    // Error with context
    this.logger.error({ event: 'some.event.failed', entityId: id }, error.message);
  }
}
```

- Use object as first arg for structured fields, string as second arg for message (pino convention)
- Event names: use dot-separated reverse-domain style: `request.created`, `job.accepted`, `rating.submitted`
- Entity IDs are the key correlation fields: `requestId`, `handymanId`, `customerId`, `offerId`
- Do NOT log sensitive fields: password hashes, JWT tokens, full user objects, lat/lng (location privacy)

### CI Package Filter Names (Critical)

| Script filter used (old) | Actual package name | Correct filter |
|---|---|---|
| `handrix-api` | `handrix-backend` (`apps/backend/package.json`) | `handrix-backend` |
| `handrix-web` | `handrix-frontend` (`apps/frontend/package.json`) | `handrix-frontend` |
| `@handrix/shared-contracts` | `@handrix/contracts` (`packages/contracts/package.json`) | `@handrix/contracts` |

Verify by reading each `package.json`'s `"name"` field before updating. pnpm filter matching is by exact package name.

### CI Env Var Mapping (Old → New)

| Old HANDRIX_* var (remove) | New correct var |
|---|---|
| `HANDRIX_DATABASE_URL` | `DATABASE_URL` |
| `HANDRIX_API_PORT` | `PORT` |
| `HANDRIX_API_CORS_ORIGIN` | `CORS_ORIGIN` |
| `HANDRIX_ENV` | `NODE_ENV` |
| `VITE_HANDRIX_ENV` | (remove — not used) |
| `VITE_API_BASE_URL` | `VITE_API_BASE_URL` (keep, already correct name) |
| `HANDRIX_INTERNAL_AUTH_SECRET` etc. | (remove — old project vars, not applicable) |

`JWT_SECRET` and `JWT_EXPIRES_IN` had no HANDRIX_ equivalent — add them fresh.

### Scope Boundary — Do NOT Touch

- Do NOT modify `nestjs-pino` configuration in `app.module.ts` — existing HTTP logging is correct
- Do NOT add AsyncLocalStorage / request-scoped pino child logger propagation — out of scope
- Do NOT add new health indicators beyond the existing DB check — upload directory is covered by `mkdirSync` in `main.ts`
- Do NOT modify `env.validation.ts` schema unless a genuinely missing required var is found
- Do NOT add test files or e2e specs — tests were intentionally removed from this project
- Do NOT touch `ObservabilityModule` — leave it as the empty shell it is
- Do NOT change the PostgreSQL service container configuration in `ci.yml`
- Do NOT modify any existing pino-http serializers or `customProps` in `app.module.ts`
- Do NOT add OpenAPI decorators — deferred from earlier reviews

### How to Verify After Implementation

**AC1 — Structured logs with correlation IDs:**
```bash
# Start backend in dev mode
cd apps/backend && pnpm dev

# In another terminal, create a request (get a JWT first via POST /api/auth/login)
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer <customer-jwt>" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-corr-id-1234" \
  -d '{ ... }'

# Expected in pino-pretty output:
# - HTTP log with correlationId: "test-corr-id-1234"
# - Service log: { event: "request.created", requestId: "...", customerId: "...", ... }
```

**AC2 — Health check:**
```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "database": "ok", "timestamp": "..." }

# With DB down:
# Expected: 503 with database: "error"
```

**AC3 — Env validation:**
```bash
# Test fail-fast: unset a required env var
DATABASE_URL="" node dist/main.js
# Expected: Config validation error: ... DATABASE_URL ...
# Expected exit code: non-zero
```

**AC4 — CI pipeline:**
```bash
# From repo root, test the scripts locally (requires DB running)
pnpm ci:contracts    # should build @handrix/contracts
pnpm ci:backend      # should typecheck + lint + build handrix-backend

# Verify filter names resolve correctly:
pnpm --filter handrix-backend run typecheck   # should work
pnpm --filter handrix-frontend run typecheck  # should work
pnpm --filter @handrix/contracts run build    # should work
```

### Project Structure — Files to Touch

```
# Task 1 — add Logger calls
apps/backend/src/modules/requests/requests.service.ts          ← add Logger + log events
apps/backend/src/modules/assignments/assignments.service.ts     ← add Logger + log events
apps/backend/src/modules/matching/matching.service.ts           ← add Logger + log events
apps/backend/src/modules/ratings/ratings.service.ts             ← add Logger + log events
apps/backend/src/modules/realtime/realtime.service.ts           ← add Logger + log emit event

# Task 2 — health check (likely no changes needed)
apps/backend/src/modules/health/health.controller.ts            ← read only (verify @SkipThrottle)
apps/backend/src/modules/health/prisma-health.indicator.ts      ← read only

# Task 3 — env validation (likely no changes needed)
apps/backend/src/config/env.validation.ts                       ← read only (verify completeness)
apps/backend/.env.example                                        ← verify/update if vars missing
apps/frontend/.env.example                                       ← verify/update if VITE_* vars missing

# Task 4 — CI/CD fix
.github/workflows/ci.yml                                         ← fix env vars block
package.json (root)                                              ← fix ci:* script filter names
```

### Previous Story Intelligence (5.2)

- **`Logger` import from `@nestjs/common`**: Story 5.2 introduced `AllExceptionsFilter` which uses `Logger` from `@nestjs/common`. Use the exact same import pattern in Task 1 services
- **`file-type@^16` restriction**: Not relevant here — no new library installs in this story
- **No migration needed**: This story adds NO schema changes. Skip all Prisma migration steps
- **DB not available locally**: Story 5.1 noted DB may not be available locally — same applies. CI pipeline handles DB via postgres service container. Local verification of AC4 scripts requires DB running

### Git Intelligence

Recent commits: `b5764f1 finish 5.2`, `dbcde1e feat: epic 4 is done`. The codebase reflects completed Epics 1–4 and Stories 5.1 + 5.2 (security baselines). No breaking changes or structural refactors in flight. Task 1 (adding Logger calls to services) is purely additive — no existing logic changes, only `Logger` field addition + `this.logger.log(...)` calls at key points.

### References

- Story definition: `_bmad-output/planning-artifacts/epics.md#Story-5.3`
- Existing correlation ID middleware: `apps/backend/src/common/middleware/correlation-id.middleware.ts`
- Existing pino config: `apps/backend/src/app.module.ts` (LoggerModule.forRoot, lines 31-46)
- Existing health implementation: `apps/backend/src/modules/health/`
- Existing env validation: `apps/backend/src/config/env.validation.ts`
- Logger pattern reference (already in use): `apps/backend/src/common/filters/all-exceptions.filter.ts`
- CI workflow: `.github/workflows/ci.yml`
- Root CI scripts: `package.json` (root)
- Backend package name: `apps/backend/package.json` → `"name": "handrix-backend"`
- Frontend package name: `apps/frontend/package.json` → `"name": "handrix-frontend"`
- Contracts package name: `packages/contracts/package.json` → `"name": "@handrix/contracts"`
- NFR relevant: NFR1 (2s dashboard loads), NFR7 (durable state history)
- Architecture: observability module boundary `apps/backend/src/modules/observability/`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: Added `Logger` from `@nestjs/common` to 4 services (assignments, matching, ratings, realtime). `requests.service.ts` already had Logger but lacked log calls — added all specified events. All 5 services now emit structured domain events with entity IDs for traceability.
- Task 2: Health endpoint verified complete — `@SkipThrottle()` present, returns `{status, database, timestamp}` via `@nestjs/terminus` + `PrismaHealthIndicator`. No changes needed.
- Task 3: `env.validation.ts` Zod schema covers all required vars. Both `.env.example` files verified complete — `apps/frontend` only reads `VITE_API_BASE_URL`. No changes needed.
- Task 4: Replaced all 17 stale `HANDRIX_*` env vars in `ci.yml` with correct 7-var block. Fixed 3 wrong pnpm filter names in root `package.json` ci scripts (`handrix-api`→`handrix-backend`, `handrix-web`→`handrix-frontend`, `@handrix/shared-contracts`→`@handrix/contracts`). Removed test steps from `ci:backend` (tests intentionally removed from project).

### File List

- apps/backend/src/modules/requests/requests.service.ts
- apps/backend/src/modules/assignments/assignments.service.ts
- apps/backend/src/modules/matching/matching.service.ts
- apps/backend/src/modules/ratings/ratings.service.ts
- apps/backend/src/modules/realtime/realtime.service.ts
- .github/workflows/ci.yml
- package.json

### Review Findings

- [x] [Review][Patch] `request.create.failed` not logged for DB/transaction failure — log fires only when `findAndOfferHandymen` rejects; a `prisma.$transaction` or `requestImage.update` failure throws unlogged [apps/backend/src/modules/requests/requests.service.ts:140]
- [x] [Review][Patch] `realtime.status.emitted` logged before `.emit()` — if gateway throws the log records a successful emission that never happened [apps/backend/src/modules/realtime/realtime.service.ts]
- [x] [Review][Patch] `logger.error` passes `err.message` as stack arg — real stack trace is lost; use `err.stack` instead [apps/backend/src/modules/requests/requests.service.ts:143]
- [x] [Review][Defer] Root `lint`/`typecheck` scripts still reference stale filter names (`handrix-web`, `handrix-api`, `@handrix/shared-contracts`) [package.json:25,27] — deferred, pre-existing, out of scope for Task 4
- [x] [Review][Defer] `data_inconsistency` warn fires on every customer list call for requests with incomplete handyman profiles — intentional per spec (scoped deferred flag from 2-1 review), low severity [apps/backend/src/modules/requests/requests.service.ts:71]

## Change Log

- 2026-05-18: Added structured domain event logging to 5 backend services; fixed stale CI env vars and pnpm filter names; verified health endpoint and env validation completeness. Story status → review.
- 2026-05-18: Code review complete — 3 patches, 2 deferred, 5 dismissed.
