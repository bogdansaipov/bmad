# Story 5.6: Instrument MVP Success Measurement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product team,
I want the MVP to capture the core funnel and operational signals defined in the PRD,
so that we can verify whether Handrix actually reduces uncertainty and fulfills requests credibly after launch.

## Acceptance Criteria

1. Given the PRD defines measurable MVP outcomes, when the implementation is prepared for launch, then the product records the key events needed to measure flow start, issue selection, request confirmation, tracking revisits, fulfillment outcome, cancellation, and support contact, and event naming and payloads stay consistent with the shared contract and lifecycle model.
2. Given the product promise depends on speed and credibility, when lifecycle timestamps are stored or emitted, then the team can calculate median time from flow start to confirmation and fulfillment performance against promised response windows, and the measurement approach does not rely on manual reconstruction from raw logs alone.
3. Given the PRD includes stress-reduction and trust-oriented outcomes, when the MVP measurement foundation is defined, then there is an explicit implementation path for capturing post-service feedback or equivalent outcome signals tied to completed requests, and the resulting data is sufficient to evaluate whether the product reduced uncertainty without requiring a later analytics redesign.

## Tasks / Subtasks

- [x] Define a stable event-name enum in shared contracts so event names are consistent across backend and any future frontend instrumentation (AC: 1)
  - [x] Create `packages/shared-contracts/src/observability/observability-event-names.ts` with a typed `ObservabilityEventName` enum or const object covering all MVP milestone events: `flow.started`, `issue.selected`, `request.intake.evaluated`, `request.confirmed`, `tracking.revisit`, `request.cancelled`, `fulfillment.outcome_recorded`, `support.contact.initiated`, `support.request.intervention_recorded`.
  - [x] Export new types from `packages/shared-contracts/src/index.ts`.
  - [x] Do NOT rename events that `ObservabilityService` already emits (e.g. `request.confirmed`, `request.intake.evaluated`, `request.status.looked_up`) — add constants for existing names to avoid drift, not to replace them.

- [x] Instrument missing backend funnel events in existing service boundaries (AC: 1)
  - [x] In `apps/handrix-api/src/modules/requests/requests.service.ts`, emit `issue.selected` on intake evaluation entry (distinct from the existing `request.intake.evaluated` — fire it before classification with `{ issueTypeId, issueLabel }`). Emit `request.cancelled` when a request transitions to `unfulfilled` state via `ops.service.ts` status update.
  - [x] In `apps/handrix-api/src/modules/requests/requests.service.ts`, rename/alias `request.status.looked_up` to emit alongside the new constant `tracking.revisit` (or simply align the existing event name to the constant — use the constant, emit same logical event).
  - [x] In `apps/handrix-api/src/modules/support/support.service.ts`, ensure `support.contact.initiated` is emitted when support opens a request detail (distinct from `support.request.opened` if needed), capturing `{ publicId, actorType: 'support', lifecycleState, outcome: 'success' }`.
  - [x] All new events must use `ObservabilityService.recordEvent()` with proper `routeScope`, `actorType`, `lifecycleState`, `publicStatus`, and `outcome` fields — consistent with existing patterns.

- [x] Add explicit lifecycle timestamps to ServiceRequest for query-efficient measurement (AC: 2)
  - [x] Add `confirmed_at`, `fulfilled_at`, and `cancelled_at` nullable `DateTime @db.Timestamptz(6)` columns to the `ServiceRequest` Prisma model (do not remove reliance on `RequestStatusHistory` for auditing — these are denormalized query helpers only).
  - [x] Create a Prisma migration: `apps/handrix-api/prisma/migrations/20260422180000_add_lifecycle_timestamps/migration.sql`.
  - [x] Populate `confirmed_at` when `request.confirmed` event fires in `requests.service.ts` (when request is first created and moves to `intake_in_review`).
  - [x] Populate `fulfilled_at` when ops transitions lifecycle to `completed` in `ops.service.ts`.
  - [x] Populate `cancelled_at` when lifecycle transitions to `unfulfilled` in `ops.service.ts`.
  - [x] Add a backend query helper (in `apps/handrix-api/src/modules/requests/` or a new `measurement/` subfolder) that returns time-to-confirmation and fulfillment-window metrics from these columns without reconstructing from raw history.

- [x] Add post-service feedback schema and endpoint (AC: 3)
  - [x] Add `RequestFeedback` Prisma model to `apps/handrix-api/prisma/schema.prisma`.
  - [x] Add `RequestFeedbackSchema` and `SubmitFeedbackDto` to `packages/shared-contracts/src/requests/request-feedback.schemas.ts`. Export from `packages/shared-contracts/src/index.ts`.
  - [x] Create a public POST endpoint `POST /requests/:publicId/feedback` in `apps/handrix-api/src/modules/requests/requests.controller.ts` (no auth required — validated by tracking token). Accept `{ satisfactionRating, reducedUncertainty?, freeText? }`.
  - [x] Validate request is in `completed` or `unfulfilled` state before accepting feedback (feedback only valid after resolution). Return `400` with structured error envelope otherwise.
  - [x] Emit `fulfillment.outcome_recorded` event via `ObservabilityService.recordEvent()` when feedback is submitted, with `{ satisfactionRating, reducedUncertainty, outcome: 'success' }` in metadata.
  - [x] Create a Prisma migration: `apps/handrix-api/prisma/migrations/20260422180100_add_request_feedback/migration.sql`.

- [x] Add a measurement query API for internal use (AC: 2, 3)
  - [x] Create `apps/handrix-api/src/modules/measurement/measurement.service.ts` and `measurement.module.ts` with aggregate methods for conversion rate, median time-to-confirmation, fulfillment-window compliance, support-contact rate, cancellation rate, and feedback summary.
  - [x] Expose measurement endpoints under a protected `GET /internal/measurement/*` route with ops-level JWT guard.
  - [x] Do NOT build dashboards or reporting UI in this story — this is the data layer only.

- [x] Add `flow.started` frontend event via backend API call (AC: 1)
  - [x] Add `POST /requests/events` public endpoint in `requests.controller.ts` accepting `{ eventName: 'flow.started', metadata?: object }`. No auth required; rate-limited by the existing rate limiter from Story 5.3. Store via `ObservabilityService.recordEvent()`.
  - [x] In `apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx`, call this endpoint once on initial mount (use a ref flag to prevent double-fire in React StrictMode). Pass no PII.
  - [x] Keep frontend logic minimal: fire-and-forget, no retry, no blocking the UX on failure.

- [x] Validate with automated tests and verify release gates pass (AC: 1, 2, 3)
  - [x] Add unit tests for `MeasurementService` methods covering conversion rate, time-to-confirmation calculation, and feedback summary aggregation.
  - [x] Add spec coverage for the new `POST /requests/:publicId/feedback` endpoint: valid submission, invalid state rejection, schema validation.
  - [x] Add spec coverage for the `POST /requests/events` event ingestion endpoint.
  - [x] Verify the full repo release gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

## Dev Notes

### Context: What Stories 5.1–5.5 Already Built

Do NOT reinvent anything from prior stories. Story 5.6 extends seams that are fully operational:

- **ObservabilityService** (`apps/handrix-api/src/common/observability/observability.service.ts`) — `recordEvent(input: ObservabilityEventInput)` is the single entry point for all instrumentation. Use it directly. Do not create a parallel event bus.
- **ObservabilityEvent Prisma model** — already in the schema with indexes on `(eventName, occurredAt)` and `(publicId, occurredAt)`. Story 5.2 persists all events durably here.
- **Correlation IDs and request context** — already propagated via AsyncLocalStorage through `RequestContextMiddleware`. All events automatically inherit `correlationId` from the current request scope.
- **Shared contracts** (`packages/shared-contracts`) — Zod schemas are the source of truth. Story 5.5 stabilized the contract surface. Add new schemas without altering existing ones unless required by an AC.
- **State machine** (`apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`) — the authoritative guard for lifecycle transitions. Do not add transition logic elsewhere.
- **Public status mapper** (`apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts`) — the only place `PublicRequestStatus` is derived. Do not duplicate in MeasurementService.
- **Prisma ORM** — all persistence goes through `PrismaService`. Do not add a second ORM or raw SQL outside migrations.
- **Error envelopes** — always use `createErrorResponse` / `createSuccessResponse` from shared contracts. Do not return raw HTTP status text.

### Events Already Emitted (Do Not Duplicate)

| Existing Event Name | Where Emitted | Notes |
|---|---|---|
| `request.intake.evaluated` | `requests.service.ts` | Keep as-is; add `issue.selected` as a _preceding_ event |
| `request.review.summary.generated` | `requests.service.ts` | Keep |
| `request.review.summary.rejected` | `requests.service.ts` | Keep |
| `request.confirmed` | `requests.service.ts` | Keep; populate `confirmed_at` here |
| `request.status.looked_up` | `requests.service.ts` | Align to constant `tracking.revisit` via shared enum |
| `ops.queue.viewed` | `ops.service.ts` | Keep |
| `ops.request.opened` | `ops.service.ts` | Keep |
| `ops.request.assigned` | `ops.service.ts` | Keep |
| `ops.request.status_updated` | `ops.service.ts` | Populate `fulfilled_at`/`cancelled_at` here |
| `support.request.intervention_recorded` | `support.service.ts` | Keep |
| `health.readiness.checked` | `health.service.ts` | Keep |

### Measurement Without Raw Log Reconstruction

The PRD requires the team can calculate median time-to-confirmation without reconstructing from raw logs. The approach:
1. `ServiceRequest.confirmed_at` (new column) minus `ServiceRequest.created_at` (existing column) — both on the same model row. Single query, no join to history.
2. `ServiceRequest.fulfilled_at` minus `ServiceRequest.confirmed_at` — fulfillment window. Single row comparison.
3. `ObservabilityEvent` with `eventName = 'flow.started'` provides the denominator for conversion rate.
4. These queries live in `MeasurementService`, not scattered across controller handlers.

### Post-Service Feedback Strategy

The PRD outcome "post-service feedback shows users strongly agree Handrix reduced stress" requires an explicit capture path. Story 5.6 provides the minimal viable path:
- A backend endpoint customers can call once their request is `completed` or `unfulfilled`.
- The frontend tracking screen (`request-tracking-screen.tsx`) should present a feedback prompt when the timeline shows the request has resolved — this is a frontend task for the dev agent.
- Feedback is lightweight: a 1–5 rating and a boolean "Did Handrix reduce your uncertainty?" — no external survey tool needed.
- `RequestFeedback` is a new Prisma model. The `POST /requests/:publicId/feedback` endpoint validates the request state using the existing `RequestStoreService` before accepting feedback. Use the tracking-token validation pattern already established in `requests.service.ts` for status lookup.

### Architecture Compliance

- All new backend modules follow the same NestJS module pattern (Module, Service, Controller) established across Epic 1–4 and used in Epics 3–5.
- `MeasurementModule` is protected by existing JWT + role guard. Reuse `JwtAuthGuard` and `RolesGuard` from `apps/handrix-api/src/common/guards/`.
- The `flow.started` event endpoint is public but rate-limited. Wire into the existing `ThrottlerModule` configured in Story 5.3 — do not add a second rate limiter.
- Feedback endpoint uses tracking-token validation (not account auth) consistent with the anonymous request model established in Story 1.6.
- No external analytics service dependency (Segment, Mixpanel, etc.) — all events persist to `ObservabilityEvent` in the existing Postgres DB.

### File Structure Requirements

**New files to create:**
- `packages/shared-contracts/src/observability/observability-event-names.ts`
- `packages/shared-contracts/src/requests/request-feedback.schemas.ts`
- `apps/handrix-api/src/modules/measurement/measurement.service.ts`
- `apps/handrix-api/src/modules/measurement/measurement.module.ts`
- `apps/handrix-api/src/modules/measurement/measurement.controller.ts`
- `apps/handrix-api/src/modules/measurement/measurement.service.spec.ts`
- `apps/handrix-api/prisma/migrations/20260422_add_lifecycle_timestamps/migration.sql`
- `apps/handrix-api/prisma/migrations/20260422_add_request_feedback/migration.sql`

**Files to modify:**
- `packages/shared-contracts/src/index.ts` — export new schemas
- `apps/handrix-api/prisma/schema.prisma` — add `confirmed_at`, `fulfilled_at`, `cancelled_at` to `ServiceRequest`; add `RequestFeedback` model
- `apps/handrix-api/src/modules/requests/requests.service.ts` — emit `issue.selected`, populate `confirmed_at`, alias `tracking.revisit`
- `apps/handrix-api/src/modules/requests/requests.controller.ts` — add `POST /requests/events` and `POST /requests/:publicId/feedback`
- `apps/handrix-api/src/modules/ops/ops.service.ts` — populate `fulfilled_at`/`cancelled_at` on transition; emit `request.cancelled`
- `apps/handrix-api/src/modules/support/support.service.ts` — emit `support.contact.initiated` on request open
- `apps/handrix-api/src/app.module.ts` — import `MeasurementModule`
- `apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx` — fire-and-forget `flow.started` API call on mount

**Avoid these mistakes:**
- Adding lifecycle transition logic outside `request-state-machine.ts`
- Deriving `PublicRequestStatus` outside `public-status-mapper.ts`
- Storing a second copy of request state in `MeasurementService`
- Making `flow.started` emission block the UI render
- Creating a new Prisma client instance outside `PrismaService`
- Using raw SQL instead of Prisma query builder for measurement queries

### Library / Framework Requirements

- NestJS 11 for all new modules — same bootstrap pattern as `health.module.ts`, `requests.module.ts`
- Prisma Client v6 for all DB queries — use `this.prisma.$queryRaw` only if Prisma query builder cannot express the aggregation (prefer Prisma where possible)
- Zod for all new shared contract schemas — match patterns in `packages/shared-contracts/src/requests/request.schemas.ts`
- No new npm dependencies unless the build cannot proceed without one. `ObservabilityService` is already available; do not add Mixpanel, Amplitude, or equivalent SDKs.

### Testing Requirements

- Preserve the existing backend verification pattern: unit/spec coverage + e2e proofs
- `MeasurementService` unit tests: mock `PrismaService`, verify aggregation logic for each metric
- Feedback endpoint spec: test valid submission, state-gate rejection (request still `in_review` → 400), schema validation rejection
- Event ingestion endpoint spec: test `flow.started` accepted, unknown event name rejected (validate against enum)
- Run full gate before marking done: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

### Previous Story Intelligence

- Story 5.2 added durable `observability_events` persistence, `pino` structured logging, correlation IDs, and `ObservabilityService` as the unified instrumentation entry point. **This story builds on that foundation — do not introduce a second logging or event pipeline.**
- Story 5.3 added rate limiting via `ThrottlerModule`. The new public `POST /requests/events` endpoint should be covered by the existing throttler.
- Story 5.4 added typed env validation and CI gates. No new env vars should be needed for this story (all measurement is DB-local).
- Story 5.5 moved `RequestLifecycleState` into `packages/shared-contracts/src/requests/request-lifecycle.schemas.ts` and stabilized the export surface. Import from there — not from `health.schemas.ts` (that re-export exists for backward compat only).
- Across Epic 5, the consistent pattern has been: small, explicit, testable seams — no hidden fallbacks, no undocumented divergence. Apply that same discipline here.

### Project Structure Notes

**Recommended implementation order:**
1. Add `ObservabilityEventName` enum to shared contracts and export. Build first — everything else depends on it.
2. Add Prisma schema changes (`confirmed_at`, `fulfilled_at`, `cancelled_at`, `RequestFeedback`) and run `prisma migrate dev`.
3. Instrument missing backend events (`issue.selected`, `request.cancelled`, `support.contact.initiated`, `flow.started` endpoint, timestamp population).
4. Implement `MeasurementService` and protected measurement endpoints.
5. Implement public feedback endpoint and `RequestFeedback` persistence.
6. Add frontend `flow.started` fire-and-forget call in `issue-intake-screen.tsx`.
7. Add tests for all new surfaces. Run full release gate.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.6: Instrument MVP Success Measurement]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: _bmad-output/planning-artifacts/prd.md#Measurable Outcomes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Performance requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structured logs, request IDs, and auditable status history from day one]
- [Source: _bmad-output/implementation-artifacts/5-2-add-request-centric-observability-and-health-monitoring.md]
- [Source: _bmad-output/implementation-artifacts/5-5-protect-future-expansion-through-stable-contracts-and-lifecycle-boundaries.md]
- [Source: apps/handrix-api/src/common/observability/observability.service.ts]
- [Source: apps/handrix-api/src/common/observability/request-context.ts]
- [Source: apps/handrix-api/prisma/schema.prisma]
- [Source: apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: apps/handrix-api/src/modules/support/support.service.ts]
- [Source: apps/handrix-api/src/modules/requests/domain/request-state-machine.ts]
- [Source: apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts]
- [Source: packages/shared-contracts/src/requests/request-lifecycle.schemas.ts]
- [Source: packages/shared-contracts/src/requests/request-status.schemas.ts]
- [Source: packages/shared-contracts/src/common/api-envelope.ts]
- [Source: apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx]
- [Source: apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 2026-04-22: Read sprint-status.yaml — identified `5-6-instrument-mvp-success-measurement` as the first `backlog` story in epic-5.
- 2026-04-22: Loaded epics.md and extracted full Story 5.6 acceptance criteria and Epic 5 context.
- 2026-04-22: Loaded stories 5-2 and 5-5 implementation artifacts for previous-story intelligence.
- 2026-04-22: Used Explore subagent to inventory ObservabilityService API, Prisma schema, existing event emissions, shared contracts, frontend flow, PRD measurable outcomes, and UX spec.
- 2026-04-22: Identified critical gaps: missing `flow.started`, `issue.selected`, `request.cancelled`, `support.contact.initiated` events; missing lifecycle timestamp columns; no feedback schema or endpoint.
- 2026-04-22: Authored comprehensive story 5.6 file with all tasks, dev notes, and guardrails.
- 2026-04-22: Implemented shared contracts: `ObservabilityEventName` constants + schema, public event-ingestion schema, `SubmitFeedbackDto`, `MeasurementSummary`.
- 2026-04-22: Added Prisma schema fields (`confirmed_at`, `fulfilled_at`, `cancelled_at`) and `RequestFeedback` model with two migrations (including backfill for existing confirmed rows).
- 2026-04-22: Extended `RequestStoreService` to populate lifecycle timestamps automatically during confirmation and lifecycle transitions.
- 2026-04-22: Emitted `issue.selected` before classification, `tracking.revisit` alongside existing status-lookup event, `support.contact.initiated` on support request open, and `request.cancelled` on ops transition to `unfulfilled`.
- 2026-04-22: Built `MeasurementService` + `MeasurementController` with ops-guarded `GET /internal/measurement/summary`, supporting `?since=` and `?promisedResponseMinutes=` query params.
- 2026-04-22: Added public `POST /requests/events` (ingestion) and `POST /requests/:publicId/feedback` endpoints with tracking-token auth, state-gate rejection, and structured error envelopes.
- 2026-04-22: Added fire-and-forget `reportFlowStarted()` in `issue-intake-screen.tsx` guarded by a ref against StrictMode double-fire.
- 2026-04-22: Authored `MeasurementService` spec with Prisma mocks and extended `RequestsController` spec with feedback / event-ingestion coverage.
- 2026-04-22: Full release gate green: `pnpm typecheck`, `pnpm lint`, `pnpm test` (147 API unit + 27 e2e + 60 web), `pnpm build`.

### Completion Notes List

- Implemented the full MVP measurement seams end-to-end: backend event coverage, lifecycle-timestamp denormalization, feedback capture, internal measurement API, and frontend flow-start ingestion — all built on the existing `ObservabilityService` + Prisma seams (no parallel logger, ORM, or analytics SDK introduced).
- Event names are now centralized in `@handrix/shared-contracts` so backend emitters and any future frontend consumers stay in lockstep. Constants do not rename existing events — they align to preserve backwards compatibility with persisted `observability_events`.
- `confirmed_at` is set at request creation (rows always move through `intake_in_review`); backfill clause populates the column for historical rows in any non-awaiting lifecycle state. `fulfilled_at` / `cancelled_at` are idempotent (only set on first transition into `completed` / `unfulfilled`).
- Measurement queries avoid `RequestStatusHistory` joins — every metric either reads a single denormalized column or aggregates `observability_events` directly, so median-time-to-confirmation and fulfillment-window compliance are single-table scans.
- Feedback endpoint reuses the tracking-token validation pattern from status-lookup — no account auth needed, state gate enforced before write.
- Frontend `flow.started` fires once per component mount via a `useRef` guard; failures are swallowed so first-paint UX is never blocked.
- No new npm dependencies were added. No changes to rate-limit policy (public write throttle covers the new public routes). No UI for internal measurement endpoints in this story (data-layer only, per AC guardrails).

### File List

**New files:**
- `packages/shared-contracts/src/observability/observability-event-names.ts`
- `packages/shared-contracts/src/requests/request-feedback.schemas.ts`
- `packages/shared-contracts/src/measurement/measurement.schemas.ts`
- `apps/handrix-api/src/modules/measurement/measurement.service.ts`
- `apps/handrix-api/src/modules/measurement/measurement.controller.ts`
- `apps/handrix-api/src/modules/measurement/measurement.module.ts`
- `apps/handrix-api/src/modules/measurement/measurement.service.spec.ts`
- `apps/handrix-api/prisma/migrations/20260422180000_add_lifecycle_timestamps/migration.sql`
- `apps/handrix-api/prisma/migrations/20260422180100_add_request_feedback/migration.sql`
- `apps/handrix-web/src/features/issue-intake/observability-events-api.ts`

**Modified files:**
- `packages/shared-contracts/src/index.ts`
- `apps/handrix-api/prisma/schema.prisma`
- `apps/handrix-api/src/app.module.ts`
- `apps/handrix-api/src/modules/requests/request-store.service.ts`
- `apps/handrix-api/src/modules/requests/requests.service.ts`
- `apps/handrix-api/src/modules/requests/requests.controller.ts`
- `apps/handrix-api/src/modules/requests/requests.controller.spec.ts`
- `apps/handrix-api/src/modules/ops/ops.service.ts`
- `apps/handrix-api/src/modules/support/support.service.ts`
- `apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx`

## Change Log

| Date       | Author                | Summary                                                                                               |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-04-22 | claude-opus-4-7[1m]   | Implemented MVP success measurement: event constants, lifecycle timestamps, feedback endpoint, measurement API, flow.started instrumentation. |

### Review Findings

_Code review run 2026-04-22 using bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)._

- [x] [Review][Decision] `confirmedAt` stamped at creation makes time-to-confirmation structurally ~0 — `RequestStoreService` sets `confirmedAt = createdAt` on insert (request-store.service.ts:484) and the migration backfills the same for existing rows. `MeasurementService.getMedianTimeToConfirmation` subtracts `confirmedAt - createdAt`, so the median will always be ~0. Spec literally says "Populate `confirmed_at` when request is first created and moves to `intake_in_review`" — dev followed the spec, but the resulting KPI is meaningless. Decide: (a) keep as "request-recorded" metric and rename the KPI, or (b) redefine `confirmed_at` to stamp only on a later lifecycle transition (and update spec/backfill).
- [x] [Review][Decision] `flow.started` denominator is trivially inflatable and re-fires on every page reload — public anonymous endpoint with no dedup; frontend `useRef` guard resets on remount/navigation. Decide: accept as a noisy upper-bound, or add sessionStorage/cookie-scoped dedup + server-side correlation id.
- [x] [Review][Decision] `support.contact.initiated` fires on every support "open request detail", not on an explicit contact action (support.service.ts) — matches spec wording ("when support opens a request detail") but the metric name implies action. Decide: keep as "view" semantics (rename for clarity), or tie emission to an explicit action (e.g., phone/email button).
- [x] [Review][Decision] Double emission of `request.status.looked_up` AND `tracking.revisit` for every status lookup (requests.service.ts) — spec allows either "emit alongside" or "align existing event name". Current impl emits both, doubling observability-event volume and making "revisit" indistinguishable from initial lookup. Decide: keep both, or drop `request.status.looked_up` in favor of `tracking.revisit` only.
- [x] [Review][Patch] `POST /requests/events` metadata has no size/depth/key-count bound — public anonymous endpoint; storage-poisoning / DoS risk [packages/shared-contracts/src/observability/observability-event-names.ts:35-38, apps/handrix-api/src/modules/requests/requests.service.ts:360]
- [x] [Review][Patch] Conversion / support-contact / cancellation rates can exceed 1.0, violating `z.number().min(0).max(1)` on the response schema [apps/handrix-api/src/modules/measurement/measurement.service.ts:15-32, 109-133, 136-154]
- [x] [Review][Patch] `findMany` without `take` + no negative-duration guard in median/fulfillment-window calculations — clock skew or data corruption silently skews aggregates [apps/handrix-api/src/modules/measurement/measurement.service.ts:35-98]
- [x] [Review][Patch] Lifecycle-timestamp backfill migration skips historical `fulfilled_at`/`cancelled_at` for completed/unfulfilled rows, and `awaiting_confirmation` rows never get `confirmed_at` populated [apps/handrix-api/prisma/migrations/20260422180000_add_lifecycle_timestamps/migration.sql:7-17]
- [x] [Review][Patch] Support-driven cancellation path doesn't emit `request.cancelled` event — only ops path emits it, so support-initiated cancellations are under-counted in event stream [apps/handrix-api/src/modules/support/support.service.ts:632-683]
- [x] [Review][Patch] `POST /requests/:publicId/feedback` returns 404 for unknown publicId but 400 for bad token on existing publicId — publicId enumeration oracle; status lookup elsewhere collapses both into same response [apps/handrix-api/src/modules/requests/requests.service.ts:381-401]
- [x] [Review][Patch] Feedback `upsert` silently overwrites prior submission and emits `fulfillment.outcome_recorded` on every call — replay/overwrite risk, double-counts event [apps/handrix-api/src/modules/requests/requests.service.ts:451-466]
- [x] [Review][Patch] `@Optional() PrismaService` on `RequestsService` makes feedback silently 503 on misconfiguration; it's a test-time shortcut [apps/handrix-api/src/modules/requests/requests.service.ts:1356]
- [x] [Review][Patch] Controller spec reaches into private `RequestStoreService` internals via `as unknown as { prisma }` — refactor test to wire Prisma through the module [apps/handrix-api/src/modules/requests/requests.controller.spec.ts]
- [x] [Review][Patch] `parseSinceQueryParam` accepts non-ISO / naive ISO / array values and silently falls back to default — ops dashboards get wrong windows [apps/handrix-api/src/modules/measurement/measurement.controller.ts:10-25]
- [x] [Review][Patch] Default `since` window drifts minute-by-minute (`setUTCDate(… - 30)` at current wall clock) — adjacent polls return different numerators/denominators over a static dataset [apps/handrix-api/src/modules/measurement/measurement.controller.ts:39-41]
- [x] [Review][Patch] `OBSERVABILITY_EVENT_NAMES` const, `observabilityEventNameSchema`, and `publicObservabilityEventIngestionSchema.eventName` are three hand-maintained lists — derive schema from `Object.values(OBSERVABILITY_EVENT_NAMES)` [packages/shared-contracts/src/observability/observability-event-names.ts]
- [x] [Review][Patch] `issue.selected` emitted even when `issueTypeId` is unknown (reference-data lookup returns null) — pollutes metric with invalid selections [apps/handrix-api/src/modules/requests/requests.service.ts:64-76]
- [x] [Review][Patch] Feedback `freeText` of pure whitespace persists as empty string, not NULL — inconsistent with "no free text" semantic [packages/shared-contracts/src/requests/request-feedback.schemas.ts, apps/handrix-api/src/modules/requests/requests.service.ts:458]
- [x] [Review][Defer] Feedback endpoint doesn't pass `expectedTokenDigest` to `validateRequestTrackingCredential` [apps/handrix-api/src/modules/requests/requests.service.ts:391] — deferred, pre-existing (status-lookup path follows the same pattern)
- [x] [Review][Defer] Concurrent lifecycle transitions can overwrite `fulfilled_at`/`cancelled_at` timestamps [apps/handrix-api/src/modules/requests/request-store.service.ts:651-740] — deferred, pre-existing concurrency model; needs broader isolation/conditional-update design
- [x] [Review][Defer] `MeasurementService` returns ratios without minimum-sample-size gate [apps/handrix-api/src/modules/measurement/measurement.service.ts] — deferred, spec explicitly scopes this story as "data layer only"
- [x] [Review][Defer] No separate "no-flow-started" flag when numerator > 0 but denominator = 0 [apps/handrix-api/src/modules/measurement/measurement.service.ts:29-30] — deferred, enhancement beyond MVP data-layer scope
