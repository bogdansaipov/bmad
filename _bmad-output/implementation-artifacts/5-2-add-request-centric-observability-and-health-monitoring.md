# Story 5.2: Add Request-Centric Observability and Health Monitoring

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an MVP operations team,
I want structured logs, correlation IDs, health checks, and error monitoring foundations,
so that we can detect issues and trace request failures before trust erodes.

## Acceptance Criteria

1. Given the backend handles customer and internal request workflows, when meaningful application events occur, then the system emits structured logs that support operational debugging, and request processing can be traced with correlation or request identifiers.
2. Given the MVP must be monitored in deployed environments, when the platform is running, then health endpoints or equivalent readiness checks are available, and failures can be detected without relying solely on user reports.
3. Given unexpected errors occur in customer or internal flows, when those errors are captured, then the monitoring foundation preserves enough context to investigate lifecycle-impacting failures, and observability remains aligned with the request-centric architecture rather than generic undifferentiated logging.
4. Given the MVP must later prove product and operational outcomes, when key lifecycle events occur across intake, confirmation, tracking, assignment, fulfillment, cancellation, support contact, and recovery states, then the platform emits structured instrumentation events or metrics for those milestones, and the data foundation supports measurement of confirmation conversion, time-to-confirmation, fulfillment within promised windows, support-contact rate, and cancellation trends.

## Tasks / Subtasks

- [x] Establish a backend observability foundation that fits the current NestJS API seams instead of layering logging ad hoc inside individual controllers (AC: 1, 3)
  - [x] Add the chosen structured logging stack to `apps/handrix-api/package.json` and wire it at bootstrap in `apps/handrix-api/src/main.ts`.
  - [x] Introduce a reusable observability area under `apps/handrix-api/src/common/` or `apps/handrix-api/src/modules/observability/` for request-context propagation, logger access, and shared monitoring helpers.
  - [x] Generate or honor a per-request correlation ID for every inbound request, prefer an inbound header if present, and include it in logs and error responses without changing existing response body contracts.
  - [x] Ensure request logging distinguishes public customer flows from protected ops/support flows and avoids logging raw credentials, tracking tokens, or unnecessary customer payload bodies.

- [x] Upgrade health monitoring from the current static readiness endpoint to deployment-credible health surfaces (AC: 2)
  - [x] Evolve `apps/handrix-api/src/modules/health/health.controller.ts` and `health.module.ts` so health responses can verify app readiness, database connectivity through `PrismaService`, and a lightweight liveness signal.
  - [x] Keep the shared success-envelope pattern intact while extending the health payload in `packages/shared-contracts` only as needed for stable, customer-safe operational checks.
  - [x] Preserve `/health` for backward compatibility unless a new route is added alongside it; do not break existing tests or documentation consumers.
  - [x] Update Swagger and any health-specific tests so the health contract stays explicit and verifiable.

- [x] Capture request-centric lifecycle instrumentation at the existing domain service boundaries instead of creating a detached analytics pipeline (AC: 1, 4)
  - [x] Instrument request milestones in `apps/handrix-api/src/modules/requests/requests.service.ts`, `ops/ops.service.ts`, and `support/support.service.ts` around intake evaluation, review summary generation, request confirmation, status lookup, assignment, lifecycle transitions, and support interventions.
  - [x] Define a small internal event or metric shape that records event name, occurred-at timestamp, correlation ID, public request ID when available, lifecycle/public-status context, actor context, and outcome classification.
  - [x] Persist only the minimum durable observability data required for later measurement if persistence is needed; avoid introducing a full analytics warehouse or cross-service event bus in this story.
  - [x] Make the emitted milestones map cleanly to the future product metrics named in the epic without implementing dashboards or business reporting in this story.

- [x] Add centralized error-context capture so failures across customer, ops, and support flows are diagnosable and consistently logged (AC: 1, 3)
  - [x] Introduce a global exception filter or equivalent NestJS mechanism that logs structured error context once, with correlation ID, route, actor type, request ID/public ID when known, and safe error classification.
  - [x] Preserve the current customer-safe error envelopes from `createErrorResponse` and avoid leaking internal stack traces or secrets in API responses.
  - [x] Normalize custom operational errors such as `OpsAssignmentError`, `OpsStatusUpdateError`, and `SupportInterventionError` into loggable categories that support debugging and alerting.
  - [x] Make sure unexpected Prisma or startup failures are surfaced in a way that supports investigation during local, test, and deployed execution.

- [x] Validate the new observability behavior with focused automated coverage and developer workflows (AC: 1, 2, 3, 4)
  - [x] Add unit or integration coverage for correlation ID propagation, health checks, structured error capture, and request-centric instrumentation helpers.
  - [x] Extend e2e coverage in `apps/handrix-api/test/app.e2e-spec.ts` or nearby tests to prove the health endpoint and at least one public and one protected workflow include the expected monitoring behavior.
  - [x] Verify repo checks with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, plus any new package-specific commands introduced for the logging stack.
  - [x] Keep test assertions resilient to timestamps and generated IDs while still proving the new observability contract.

## Dev Notes

- Story 5.1 already established PostgreSQL and Prisma as the durable backend foundation, and the API now runs with a global `PrismaModule`, validated `HANDRIX_DATABASE_URL`, and a real database-backed `RequestStoreService`. Story 5.2 should build on that baseline rather than creating a separate health or monitoring path that bypasses Prisma-backed reality.
- The backend already exposes a minimal `/health` endpoint through `apps/handrix-api/src/modules/health/health.controller.ts`, but it is currently a static readiness response that does not verify database reachability or richer deployment health. Treat it as the extension point, not a throwaway placeholder.
- There is no structured logging, request correlation middleware, global exception filter, or monitoring package in the current API. `main.ts` creates the Nest app, enables CORS, registers Swagger, and listens; this is the natural place to register cross-cutting observability behavior.
- Public request flow entry points live in `apps/handrix-api/src/modules/requests/requests.controller.ts` and `requests.service.ts`. Protected ops and support workflows live in `ops.controller.ts` / `ops.service.ts` and `support.controller.ts` / `support.service.ts`. Instrument these existing domain boundaries instead of duplicating lifecycle knowledge in a parallel module.
- Keep observability aligned with the request-centric lifecycle model. When possible, logs and metrics should reference `publicId`, lifecycle state, derived public status, actor type, and operation outcome rather than generic route-only messages.
- Story 5.2 should provide the monitoring foundation, not the final deployment hardening plan. Leave environment-matrix validation and deployment readiness gating to Story 5.4, and leave product KPI reporting surfaces or dashboards to Story 5.6.

### Technical Requirements

- Prefer a mature structured logger that works cleanly with NestJS 11 and current repo constraints. Keep the integration small, explicit, and testable.
- Correlation IDs must be available throughout the request lifecycle, including controller, service, repository, and exception paths. Use request-scoped context propagation or AsyncLocalStorage-backed helpers rather than manually threading IDs through every method signature unless the existing code already requires it.
- Treat inbound request identifiers as sensitive operational metadata. They may appear in logs and internal telemetry, but tracking tokens, passwords, auth secrets, and full raw request bodies should not.
- If instrumentation events need durability for later measurement, persist them in a way that preserves the request-centric architecture and Prisma ownership inside the API app. Do not add an external telemetry service dependency that becomes a hard runtime requirement for local development.
- Health checks should distinguish liveness from readiness where practical. Database-backed readiness should fail if Prisma cannot reach the configured Postgres database.
- Extend shared contracts carefully. If `HealthPayload` or a new observability-facing internal schema changes, keep JSON field naming in `camelCase` and persistence naming in `snake_case`.

### Architecture Compliance

- Architecture explicitly calls for structured application logs, request correlation IDs, health endpoints, and error monitoring from the first release.
- API boundaries remain unchanged:
  - `requests` owns public customer workflows and customer-safe status retrieval.
  - `ops` owns protected queue, assignment, and lifecycle orchestration.
  - `support` owns protected search, request visibility, and intervention workflows.
- Do not move lifecycle truth away from `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts` or persist public status as an independent source of truth just for metrics.
- Observability must remain part of the modular monolith. Avoid introducing a microservice, event bus, or external queue to satisfy this story.
- Preserve the shared envelope and contract approach already used by controllers through `createSuccessResponse` and `createErrorResponse`.

### Library / Framework Requirements

- Backend framework: NestJS 11 in `apps/handrix-api`.
- Persistence and readiness dependency: Prisma Client v6 with PostgreSQL, via `apps/handrix-api/src/prisma/prisma.service.ts`.
- Shared contract layer: `@handrix/shared-contracts` for health and API envelope types.
- Any new logging dependency must coexist with the current Jest, ESLint, and Nest bootstrap setup without forcing a repo-wide architecture change.

### File Structure Requirements

- Likely backend touch points:
  - `apps/handrix-api/package.json`
  - `apps/handrix-api/.env.example`
  - `apps/handrix-api/src/main.ts`
  - `apps/handrix-api/src/app.module.ts`
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/modules/health/health.controller.ts`
  - `apps/handrix-api/src/modules/health/health.module.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/src/prisma/prisma.service.ts`
  - new files under a focused observability location such as `apps/handrix-api/src/common/interceptors/`, `src/common/filters/`, `src/common/middleware/`, or `src/modules/observability/`
- Likely shared-contract touch points:
  - `packages/shared-contracts/src/health/health.schemas.ts`
  - `packages/shared-contracts/src/index.ts` or adjacent exports if health schema shape changes
- Likely test touch points:
  - `apps/handrix-api/src/modules/health/health.controller.spec.ts`
  - controller or service specs covering observability helpers
  - `apps/handrix-api/test/app.e2e-spec.ts`
- Avoid these structural mistakes:
  - adding observability logic independently inside every controller method
  - hard-coding per-route log formats with no shared helper or filter
  - creating a new persistence subsystem outside Prisma for health or metrics
  - coupling Story 5.2 to deployment-only infrastructure that local tests cannot run

### Testing Requirements

- Preserve the repo’s existing backend verification style: targeted unit/spec coverage plus e2e verification through the Nest application module.
- Health tests should prove both success and degraded/failure behavior where feasible, especially for Prisma-backed readiness.
- Observability tests should verify behavior, not just implementation details:
  - correlation ID is attached and propagated
  - structured logs or event payloads include request-centric identifiers
  - exception handling logs once and still returns the expected envelope
- Keep tests deterministic by stubbing clock, request ID generation, or logging sinks when necessary.

### Previous Story Intelligence

- Story 5.1 replaced the JSON file request store with a Prisma-backed `RequestStoreService` and added Postgres-backed test infrastructure. Reuse that infrastructure for health readiness checks and any durable observability persistence instead of introducing test-only shortcuts.
- Story 5.1 intentionally preserved controller/service contracts across requests, ops, and support. Story 5.2 should keep those user-facing contracts stable while adding logging, monitoring, and error-capture cross-cutting behavior underneath them.
- Internal user seeding remains env-driven and startup-based in the current auth flow. Observability should help diagnose failures there, but this story should not redesign auth storage or deployment configuration.

### Git Intelligence Summary

- Recent commits are sparse and broad (`finish until review 4.2`, `feat:almost done with epic3`, `feat: epic2 is almost done`), so local code inspection is more reliable than commit messages for current implementation guidance.
- The live codebase already contains the concrete seams for this story:
  - a minimal `HealthModule`
  - request, ops, and support service boundaries
  - Prisma-backed persistence
  - no existing structured logging or exception-filter infrastructure

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 5.2: Add Request-Centric Observability and Health Monitoring]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-1-establish-durable-persistence-and-schema-management.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/main.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/app.module.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/health/health.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/prisma/prisma.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/common/api-envelope.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/health/health.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-22: Selected `5-2-add-request-centric-observability-and-health-monitoring` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-22: Loaded the BMAD create-story skill workflow, config, sprint status, Epic 5 planning slice, Story 5.1 implementation artifact, architecture monitoring guidance, and current backend code seams.
- 2026-04-22: Confirmed the API already has a minimal `HealthModule` and Prisma-backed persistence, but does not yet have structured logging, correlation IDs, or centralized exception monitoring.
- 2026-04-22: Added a shared observability foundation under `apps/handrix-api/src/common/observability/` with `pino` logging, AsyncLocalStorage-backed request context, per-request correlation IDs, request completion logging, and a global exception filter.
- 2026-04-22: Extended health monitoring with a new `HealthService`, richer shared-contract health checks, database readiness verification through Prisma, and backward-compatible `/health` behavior.
- 2026-04-22: Added durable `observability_events` persistence via Prisma schema and migration updates, then instrumented request, ops, support, and health flows with request-centric events.
- 2026-04-22: Verified the implementation with `pnpm --filter handrix-api prisma:generate`, `pnpm --filter @handrix/shared-contracts build`, `pnpm --filter handrix-api typecheck`, `pnpm --filter handrix-api lint`, `pnpm --filter handrix-api test`, `pnpm --filter handrix-api test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

### Completion Notes List

- Added a shared observability foundation with `pino`-backed structured logs, inbound or generated correlation IDs, request-scoped context propagation, request completion logs, and centralized exception logging that preserves existing error envelopes.
- Upgraded `/health` from a static payload to liveness/readiness reporting with Prisma-backed database readiness checks and an expanded shared `HealthPayload` contract.
- Added a minimal durable `observability_events` table plus request-centric instrumentation across request intake, confirmation, status lookup, ops queue/detail/actions, support search/detail/interventions, and health checks.
- Added focused observability tests for middleware, exception filtering, health degradation behavior, and e2e verification of correlation headers plus persisted observability events.
- Verified the story end to end with repo-wide typecheck, lint, test, and build commands; root lint still reports pre-existing `no-unsafe-argument` warnings in `apps/handrix-api/test/app.e2e-spec.ts`, but no errors remain.

### File List

- _bmad-output/implementation-artifacts/5-2-add-request-centric-observability-and-health-monitoring.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/package.json
- apps/handrix-api/prisma/schema.prisma
- apps/handrix-api/prisma/migrations/20260422004000_add_observability_events/migration.sql
- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/common/observability/app-logger.ts
- apps/handrix-api/src/common/observability/global-exception.filter.spec.ts
- apps/handrix-api/src/common/observability/global-exception.filter.ts
- apps/handrix-api/src/common/observability/observability.helpers.ts
- apps/handrix-api/src/common/observability/observability.module.ts
- apps/handrix-api/src/common/observability/observability.service.ts
- apps/handrix-api/src/common/observability/request-context.middleware.spec.ts
- apps/handrix-api/src/common/observability/request-context.middleware.ts
- apps/handrix-api/src/common/observability/request-context.ts
- apps/handrix-api/src/main.ts
- apps/handrix-api/src/modules/auth/internal-auth.types.ts
- apps/handrix-api/src/modules/health/health.controller.spec.ts
- apps/handrix-api/src/modules/health/health.controller.ts
- apps/handrix-api/src/modules/health/health.module.ts
- apps/handrix-api/src/modules/health/health.service.spec.ts
- apps/handrix-api/src/modules/health/health.service.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/src/modules/support/support.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-api/test/support/postgres-test-helpers.ts
- packages/shared-contracts/src/health/health.schemas.ts
- pnpm-lock.yaml

## Change Log

- 2026-04-22: Implemented Story 5.2 and moved it to review after adding structured observability, readiness checks, durable instrumentation events, and automated verification.
