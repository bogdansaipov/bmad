# Story 5.3: Enforce Security, Rate Limiting, and Data Protection Baselines

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product platform,
I want the MVP protected by baseline transport, access, and abuse controls,
so that customer and internal data remain secure without overengineering.

## Acceptance Criteria

1. Given the platform exposes public intake and tracking endpoints plus internal staff tooling, when security baselines are applied, then data is protected in transit and internal access is role-restricted, and the implementation avoids collecting unnecessary sensitive customer data.
2. Given the public request flow can be abused or overused, when rate-limiting protections are enabled, then the system can reduce abuse risk on intake and polling endpoints, and legitimate customer behavior remains supported for the MVP use case.
3. Given internal and external request data is stored or retrieved, when data protection controls are reviewed, then access boundaries, storage practices, and auditability align with the security requirements in the PRD and architecture, and the security baseline leaves a clean path for future hardening if scale or risk increases.

## Tasks / Subtasks

- [x] Add a baseline HTTP security layer at bootstrap and config level without breaking the current SPA and Swagger workflows (AC: 1, 3)
  - [x] Add the required backend dependencies in `apps/handrix-api/package.json` for security middleware and throttling, keeping them compatible with NestJS 11.
  - [x] Update `apps/handrix-api/src/main.ts` to register security middleware in the correct order before route setup, while preserving the existing CORS and Swagger behavior.
  - [x] Extend `apps/handrix-api/src/config/env.validation.ts` and `apps/handrix-api/.env.example` with any security-related typed config needed for origin allowlists, proxy awareness, or rate-limit tuning.
  - [x] Keep local development and the current docs surface usable; if Swagger or SPA assets need narrower middleware exceptions, make them explicit instead of weakening the whole baseline.

- [x] Introduce request-aware rate limiting for public endpoints and safe bypasses for internal-only or non-abusive paths (AC: 2)
  - [x] Add `@nestjs/throttler` using an app-level configuration that can support multiple throttling profiles instead of a single hard-coded global limit.
  - [x] Apply stronger throttles to the public abuse-prone routes in `apps/handrix-api/src/modules/requests/requests.controller.ts` such as intake evaluation, review summary creation, request confirmation, and status lookup.
  - [x] Decide deliberately whether `/health` and `auth/internal-sessions` should use default throttling, custom throttling, or explicit skips, and document that choice in code and tests.
  - [x] Make rate limiting work correctly when the app sits behind a proxy by aligning tracker behavior with the deployment assumptions already captured in the architecture.

- [x] Tighten internal access and secret-handling seams without redesigning the MVP auth model (AC: 1, 3)
  - [x] Review `apps/handrix-api/src/modules/auth/` so signed internal sessions, role guards, and seeded internal users remain the only path into ops/support routes.
  - [x] Ensure auth and observability paths do not log raw passwords, bearer tokens, tracking tokens, or similar secrets now that Story 5.2 added structured logging and correlation IDs.
  - [x] Fail fast in production if insecure fallback secrets or unsafe default credential assumptions would remain active, while preserving workable local defaults for development and test.
  - [x] Keep customer-facing behavior unchanged: anonymous request creation still uses signed tracking credentials rather than introducing customer accounts.

- [x] Enforce data-minimization and audit-friendly storage practices at the current request persistence seam (AC: 1, 3)
  - [x] Review the persisted request, internal-user, and observability models in `apps/handrix-api/prisma/schema.prisma` and related services to confirm only necessary fulfillment/support data is stored.
  - [x] Avoid persisting raw authentication secrets, redundant status projections, or request payload copies that are no longer needed after validation.
  - [x] If a schema or repository adjustment is needed for safer storage or auditability, implement it through Prisma migrations and the existing service/repository boundaries rather than ad hoc writes.
  - [x] Preserve the append-only request history and intervention audit behavior already established in earlier stories.

- [x] Add focused automated coverage and verification for the new security baseline (AC: 1, 2, 3)
  - [x] Add backend unit or integration tests covering rate-limit behavior, protected-route access boundaries, and production-oriented config validation failures.
  - [x] Extend `apps/handrix-api/test/app.e2e-spec.ts` or adjacent e2e coverage to prove at least one public route is throttled as intended and one protected route still requires valid internal auth plus role access.
  - [x] Verify headers or middleware behavior in a way that is resilient to framework defaults rather than snapshotting the entire response surface.
  - [x] Run `pnpm --filter handrix-api typecheck`, `pnpm --filter handrix-api lint`, `pnpm --filter handrix-api test`, `pnpm --filter handrix-api test:e2e`, and any new package-specific verification introduced by the story.

## Dev Notes

- Story 5.1 established PostgreSQL and Prisma as the durable source of truth, and Story 5.2 added structured logs, correlation IDs, a global exception filter, health readiness checks, and durable observability events. Story 5.3 should harden those existing seams instead of creating parallel security plumbing.
- The current API already has the basic internal access model:
  - `AuthService` issues signed internal sessions.
  - `InternalAuthGuard` validates bearer tokens.
  - `InternalRolesGuard` enforces `ops` and `support` access.
  Story 5.3 should strengthen those boundaries and config guarantees, not replace them with Passport, OAuth, or a full identity provider integration.
- Public customer routes live in `requests.controller.ts` and are the main abuse surface for rate limiting because they support anonymous intake, confirmation, and polling-style status lookups. Internal routes in `ops` and `support` are already guarded, but they still need safe defaults and secret-safe logging.
- The architecture explicitly calls for standard NestJS security middleware plus `@nestjs/throttler`, encrypted transport, role-restricted internal access, signed customer tracking tokens, and minimal data collection. Keep the implementation aligned with those choices so Story 5.4 can focus on environment/deployment readiness and Story 5.5 can focus on long-term contract stability.
- This story is about baseline application hardening, not infrastructure ownership. Do not attempt to implement TLS termination inside Nest, build a WAF, add Redis-backed distributed throttling, or replace the current MVP auth/storage model.

### Technical Requirements

- Keep the modular monolith boundaries intact:
  - `requests` owns public customer request workflows.
  - `auth` owns internal session issuance and validation.
  - `ops` and `support` own their protected workflows.
  - `prisma` remains the only persistence path.
- Preserve existing API response envelope conventions from `@handrix/shared-contracts`. Security failures may need new error codes or safer messages, but they should still follow `{ error: { ... } }`.
- Rate limiting should be targeted and explainable. Use explicit throttling profiles or route decorators rather than a single opaque blanket rule that could degrade the customer MVP flow.
- Treat customer request tracking tokens, internal bearer tokens, passwords, and secrets as sensitive. They may be parsed for validation, but they must not be logged or persisted in raw form.
- Any persistence changes must keep `snake_case` naming in Prisma-backed tables and `camelCase` naming at the API and TypeScript boundaries.
- Maintain auditability. Existing request history and observability events should remain useful for diagnosing security-relevant actions without storing unnecessary personal or credential data.

### Architecture Compliance

- Architecture requires:
  - JWT-based internal auth with role-based access control for `ops` and `support`.
  - standard NestJS security middleware plus rate limiting using `@nestjs/throttler`.
  - TLS in transit and managed encryption at rest through the database platform.
  - signed anonymous customer tracking tokens for request revisits.
  - minimal storage of nonessential personal data.
- Keep lifecycle truth in `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts` and the Prisma-backed request store. Security hardening must not create a competing source of lifecycle truth.
- Preserve Story 5.2 observability behavior while redacting or excluding sensitive fields from logs and failure paths.
- Leave deployment-specific secret rotation, multi-environment gate enforcement, and CI/CD rollout policy to Story 5.4 unless a small prerequisite is essential for safe defaults now.

### Library / Framework Requirements

- Backend runtime remains NestJS 11 in `apps/handrix-api`.
- Use `@nestjs/throttler` for application-layer rate limiting, consistent with the architecture and current NestJS documentation.
- If HTTP security headers are added, use the standard `helmet` middleware in the Nest/Express bootstrap path and register it before routes so headers apply consistently.
- Continue using Prisma Client v6 and PostgreSQL for durable data access.
- Reuse the existing observability foundation under `apps/handrix-api/src/common/observability/` rather than introducing a separate logging stack.

### File Structure Requirements

- Most likely backend touch points:
  - `apps/handrix-api/package.json`
  - `apps/handrix-api/.env.example`
  - `apps/handrix-api/src/main.ts`
  - `apps/handrix-api/src/app.module.ts`
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/modules/auth/auth.controller.ts`
  - `apps/handrix-api/src/modules/auth/auth.service.ts`
  - `apps/handrix-api/src/modules/auth/internal-auth.guard.ts`
  - `apps/handrix-api/src/modules/auth/internal-roles.guard.ts`
  - `apps/handrix-api/src/modules/requests/requests.controller.ts`
  - `apps/handrix-api/src/modules/health/health.controller.ts`
  - `apps/handrix-api/src/common/observability/*`
  - `apps/handrix-api/prisma/schema.prisma`
  - `apps/handrix-api/prisma/migrations/` if persistence changes are required
- Most likely test touch points:
  - `apps/handrix-api/src/modules/auth/*.spec.ts`
  - `apps/handrix-api/src/modules/requests/*.spec.ts`
  - `apps/handrix-api/test/app.e2e-spec.ts`
  - new throttling or security middleware specs if extracted into dedicated providers
- Avoid these structural mistakes:
  - adding security logic ad hoc inside every controller method
  - replacing existing guards with a brand-new auth architecture
  - persisting secrets or raw credential artifacts for debugging convenience
  - adding deployment-only dependencies that make local and CI execution fragile

### Testing Requirements

- Prove both behavior and boundaries:
  - public rate limits trigger when expected
  - protected routes still require valid signed internal auth
  - role-restricted routes still reject the wrong staff role
  - production-oriented config rejects unsafe secrets or invalid values
  - sensitive values are not emitted in structured logs or error bodies where coverage is practical
- Keep tests deterministic by controlling repeated request counts and any time-based throttling windows.
- Do not rely only on unit tests. At least one e2e path should prove the throttling and access-control behavior through the full Nest app.
- Preserve existing repo verification expectations and keep any new assertions compatible with the current PostgreSQL-backed test setup.

### Previous Story Intelligence

- Story 5.1 moved the system onto Prisma/PostgreSQL and preserved append-only request history, internal-user persistence, and existing module boundaries. Story 5.3 should use those persistence seams if any storage hardening is required.
- Story 5.2 added:
  - `pino`-backed structured logging
  - request correlation IDs
  - global exception handling
  - richer `/health` responses
  - durable `observability_events`
  Story 5.3 must review those additions carefully so security hardening does not leak secrets through logs, correlation metadata, or error handling.
- Story 5.2 also preserved the shared response envelopes and current route contracts. Story 5.3 should keep those stable unless a narrowly scoped security correction is unavoidable.

### Git Intelligence Summary

- Recent commit messages are too coarse to use as implementation guidance, so the live repo remains the authoritative source of patterns.
- The current backend already exposes the right seams for this story:
  - bootstrap wiring in `src/main.ts`
  - module composition in `src/app.module.ts`
  - internal auth and role guards in `src/modules/auth/`
  - anonymous public request routes in `src/modules/requests/`
  - structured logging and exception capture in `src/common/observability/`
- There is no existing throttling dependency or explicit HTTP security middleware in `apps/handrix-api/package.json`, so Story 5.3 should add them intentionally rather than assuming they already exist.

### Latest Technical Notes

- NestJS’s current rate-limiting docs show `@nestjs/throttler` configured through `ThrottlerModule` with support for multiple named throttling definitions and per-route `@Throttle()` / `@SkipThrottle()` overrides. That fits this codebase better than hard-coding one global limit because public anonymous intake and protected internal routes have different abuse profiles.
- NestJS’s current Helmet guidance notes that `helmet` should be registered before other middleware/routes so security headers apply consistently. In this repo, that means being careful about the ordering in `apps/handrix-api/src/main.ts` relative to CORS and Swagger setup.
- Current NestJS docs also call out proxy-aware tracker behavior for throttling behind forwarded headers. If this app is expected to sit behind a proxy in staging or production, the throttling tracker and any `trust proxy` behavior should be implemented deliberately rather than left to defaults.

### Project Structure Notes

- Keep this story backend-only unless a contract-safe error-code change requires a shared-contract update.
- Prefer focused additions to the existing modules over inventing a new top-level `security` domain unless the extracted code is truly cross-cutting and reusable.
- If config grows beyond a couple of values, keep it in `env.validation.ts` and thread it through existing bootstrap/module seams rather than scattering `process.env` reads across guards and controllers.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 5.3: Enforce Security, Rate Limiting, and Data Protection Baselines]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Non-Functional Requirements Coverage]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-1-establish-durable-persistence-and-schema-management.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-2-add-request-centric-observability-and-health-monitoring.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/main.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/app.module.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/config/env.validation.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/auth/auth.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/auth/auth.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/auth/internal-auth.guard.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/auth/internal-roles.guard.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/common/observability/request-context.middleware.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/common/observability/global-exception.filter.ts]
- [Source: https://docs.nestjs.com/security/rate-limiting]
- [Source: https://docs.nestjs.com/security/helmet]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-22: Selected `5-3-enforce-security-rate-limiting-and-data-protection-baselines` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-22: Loaded the BMAD create-story workflow, template, checklist, config, sprint status, Epic 5 planning context, PRD security requirements, architecture security guidance, and the latest Epic 5 implementation artifacts for continuity.
- 2026-04-22: Inspected the live backend seams in `main.ts`, `app.module.ts`, `env.validation.ts`, `modules/auth/`, `modules/requests/`, and `common/observability/` to anchor the story in the current codebase rather than generic NestJS advice.
- 2026-04-22: Reviewed current NestJS security documentation for `@nestjs/throttler` and `helmet` to keep the story aligned with current primary-source guidance.
- 2026-04-22: Added `helmet` bootstrap wiring, extracted shared app configuration to `src/app.bootstrap.ts`, and introduced typed security config for proxy trust, request-token secrets, rate-limit defaults, and stricter production fallback validation.
- 2026-04-22: Added application-level throttling through `@nestjs/throttler` with a custom proxy-aware guard, explicit public-write/public-poll/internal-auth policies, and a shared `RATE_LIMIT_EXCEEDED` error envelope.
- 2026-04-22: Reworked request tracking credential storage so the API persists only a one-way token digest plus expiry, while reconstructing signed customer tokens at read time and preserving anonymous tracking behavior.
- 2026-04-22: Verified the implementation with `pnpm --filter handrix-api prisma:generate`, `pnpm --filter handrix-api typecheck`, `pnpm --filter handrix-api test`, `pnpm --filter handrix-api test:e2e`, `pnpm --filter handrix-api lint`, `pnpm --filter handrix-api build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Added a shared bootstrap configuration path with `helmet`, proxy-aware server setup, Swagger/CORS preservation, and typed security config for trust-proxy, request-token secrets, and rate-limit defaults.
- Added a custom throttling baseline using `@nestjs/throttler`, a shared application guard, explicit policies for public write routes, public polling routes, internal auth, and a skipped `/health` path with a customer-safe 429 envelope.
- Hardened production security defaults by rejecting fallback internal secrets and seed passwords in production-oriented config parsing, while keeping local and test defaults usable.
- Stopped persisting raw request-tracking tokens by migrating storage to a one-way digest plus expiry and reconstructing signed customer tokens only when responses are generated.
- Added focused security coverage for config validation, secret-safe request logging, throttle behavior, security headers, and digest-based tracking-token storage.
- Repo lint still reports the pre-existing `no-unsafe-argument` warnings in `apps/handrix-api/test/app.e2e-spec.ts`, but no lint errors, test failures, or build failures remain.

### File List

- _bmad-output/implementation-artifacts/5-3-enforce-security-rate-limiting-and-data-protection-baselines.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/.env.example
- apps/handrix-api/package.json
- apps/handrix-api/prisma/migrations/20260422173000_hash_tracking_tokens/migration.sql
- apps/handrix-api/prisma/schema.prisma
- apps/handrix-api/src/app.bootstrap.ts
- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/common/observability/request-context.middleware.spec.ts
- apps/handrix-api/src/common/security/app-throttler.guard.ts
- apps/handrix-api/src/common/security/throttle-policies.ts
- apps/handrix-api/src/config/env.validation.spec.ts
- apps/handrix-api/src/config/env.validation.ts
- apps/handrix-api/src/main.ts
- apps/handrix-api/src/modules/auth/auth.controller.ts
- apps/handrix-api/src/modules/auth/auth.service.spec.ts
- apps/handrix-api/src/modules/health/health.controller.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/request-tracking-credential.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- pnpm-lock.yaml

## Change Log

- 2026-04-22: Implemented Story 5.3 and moved it to review after adding bootstrap security middleware, request-aware throttling, production-safe secret validation, digest-based tracking-token storage, and focused verification coverage.
