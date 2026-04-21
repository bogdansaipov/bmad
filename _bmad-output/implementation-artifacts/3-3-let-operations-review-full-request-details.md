# Story 3.3: Let Operations Review Full Request Details

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations coordinator,
I want to open a request and inspect issue details, serviceability context, and customer-facing guidance,
so that I can make a confident assignment decision without guessing.

## Acceptance Criteria

1. Given an operations coordinator selects a request from the queue, when the request detail view loads, then they can see the full intake details needed for fulfillment review, and the detail view includes issue classification, service location, current lifecycle state, and request history context.
2. Given a request has already shown guidance or expectation-setting to the customer, when operations reviews the record, then the coordinator can see what containment guidance, status, and expectations the customer has already received, and this context is presented clearly enough to avoid conflicting follow-up actions.
3. Given a request may be in or out of scope, when the coordinator reviews serviceability information, then they can understand the factors affecting dispatch readiness, and they can distinguish between serviceable, clarification-needed, and unavailable scenarios.

## Tasks / Subtasks

- [x] Add a protected ops request-detail read model and endpoint in the NestJS API (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/ops/` with a detail-oriented read path under the existing ops auth boundary instead of exposing internal review data from public `requests` endpoints.
  - [x] Define a shared request-detail response contract in `packages/shared-contracts/src/` for the detail payload, including request identity, intake answers, classification, service location, current lifecycle state, request history, and customer-facing context.
  - [x] Reuse `RequestStoreService.getByPublicId()` as the source of record for the detail read model and return a stable not-found error shape for unknown or inaccessible request IDs.
  - [x] Keep the endpoint read-only; do not implement assignment mutations, lifecycle writes, or dispatch-owner persistence in this story.

- [x] Expose the full fulfillment-review context from the persisted request record without inventing a second source of truth (AC: 1, 2, 3)
  - [x] Build the detail payload from the persisted request record fields that already exist today: `issueTypeId`, `issueLabel`, `answers`, `serviceLocation`, `classification`, `lifecycleState`, `publicStatus`, `createdAt`, and append-only `history`.
  - [x] Include request-history entries with enough operational context for review, such as `occurredAt`, `actorType`, lifecycle/public-status transition details, `changeSummary`, and the recorded `customerSnapshot`.
  - [x] Surface current serviceability context explicitly from `classification` and current lifecycle/public status so operators can tell whether the request is serviceable, needs clarification, is delayed, or is unavailable.
  - [x] Continue to keep customer-safe projection logic backend-owned; the frontend should render the provided detail model rather than deriving its own lifecycle truth.

- [x] Make previously shown customer guidance and expectation-setting visible to operations in a durable, reviewable way (AC: 2)
  - [x] Verify whether the currently persisted request record already captures the exact containment guidance and review-summary expectations shown before confirmation.
  - [x] If that customer-facing context is not yet durably stored, add the smallest future-compatible persistence/read-model extension needed so ops can review what the customer actually saw rather than reconstructing it from current reference data.
  - [x] Preserve a distinction between "current recommended guidance" and "guidance/expectations already shown to the customer" so future rule changes do not rewrite historical context.
  - [x] Do not expose internal-only secrets such as tracking tokens, idempotency keys, or hidden operational metadata that the detail screen does not need.

- [x] Add the minimal frontend navigation and protected detail screen needed to open a request from the queue (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-web/src/features/ops-queue/` so queue items can open a protected request-detail view from the existing queue without collapsing Story 3.4 assignment scope into this story.
  - [x] Introduce a feature-local API client for loading the request detail payload and keep API access separate from UI components.
  - [x] Add a detail screen that presents intake answers, issue classification, location details, lifecycle/history context, and customer-facing guidance/expectation sections in a fast-scanning operational layout.
  - [x] Keep routing changes minimal and compatible with the current manual app-level path handling in `apps/handrix-web/src/app/App.tsx`; if a new path is introduced, keep it focused on protected ops detail navigation only.

- [x] Design the detail view for confident operational review, not customer reassurance (AC: 1, 2, 3)
  - [x] Keep the queue-to-detail transition clear and low-friction, with an obvious way to return to the queue.
  - [x] Group the screen into high-signal review sections such as request snapshot, serviceability and readiness, customer-visible context, and request history.
  - [x] Use explicit labels and textual state descriptions rather than color-only cues so serviceable, clarification-needed, delayed, and unavailable scenarios are easy to distinguish.
  - [x] Preserve the internal operational tone of the ops area while keeping the UI readable at mobile and desktop widths with strong keyboard/focus behavior.

- [x] Protect the boundary between Story 3.3 detail review and later Epic 3 stories (AC: 1, 2, 3)
  - [x] Do not implement provider selection, internal owner assignment, or assignment persistence from Story 3.4 here.
  - [x] Do not add lifecycle mutation controls from Story 3.5 in this story unless the UI needs a clearly disabled placeholder that does not imply working write behavior.
  - [x] Keep support-oriented tooling out of this story; this is an ops review screen, not the Epic 4 support view.
  - [x] Preserve the existing anonymous customer request flow and protected ops auth flow without mixing storage, contracts, or route assumptions.

- [x] Add automated coverage for protected request-detail loading, context mapping, and regression safety (AC: 1, 2, 3)
  - [x] Add backend tests for authorized detail access, unauthorized and forbidden access, not-found behavior, and detail-payload mapping from realistic persisted request fixtures.
  - [x] Add backend tests that prove the detail model exposes customer-visible guidance/history context without leaking anonymous tracking credentials or unrelated internal-only fields.
  - [x] Add frontend tests for queue-item navigation, protected detail loading, back-to-queue behavior, and the rendering of serviceability, guidance, expectation, and history sections.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and any existing API e2e coverage relevant to protected ops routes.

## Dev Notes

- Story 3.2 already established the protected queue and active request summaries. Story 3.3 should extend that seam into a read-only detail view rather than introducing a parallel internal request-review surface.
- The current persisted request model is richer than the public customer response shape. It already contains answers, classification, service location, internal lifecycle state, and append-only history with customer snapshots. That makes the file-backed store a workable source for the detail read model even before Epic 5 persistence hardening.
- The main modeling risk for this story is customer-context reconstruction. Operations need to see what the customer was actually shown, not what current rules would generate today if issue templates or expectation copy change later.
- The second modeling risk is scope bleed. This story is about review confidence and visibility. Assignment ownership, dispatch actions, and lifecycle mutations belong to later stories.

### Technical Requirements

- Keep backend authorization inside the existing internal auth boundary:
  - protected detail APIs stay under `apps/handrix-api/src/modules/ops/`
  - reuse `InternalAuthGuard` and `InternalRolesGuard`
  - do not expose internal review details from the public `requests` controller
- Reuse the current file-backed request store and persisted request model:
  - use `RequestStoreService.getByPublicId()`
  - use the existing `PersistedServiceRequest` and `PersistedRequestHistoryEntry` data first
  - avoid adding a second request-detail source that can drift from queue or tracking data
- Keep contracts shared when both apps consume them:
  - define the detail schema in `packages/shared-contracts/src/`
  - keep JSON `camelCase`
  - use ISO 8601 timestamps
  - continue using the shared `{ data, meta? }` and `{ error: { code, message, details?, retryable? } }` API envelope conventions
- Model the customer-visible context explicitly:
  - include the current public-status snapshot and request-history `customerSnapshot` values
  - if containment guidance or review expectations were shown before confirmation but are not yet durably stored, add a minimal persisted snapshot for that historical context
  - do not fake "shown to customer" context by recomputing it from current reference-data rules alone
- Keep this story read-focused:
  - no assignment write APIs
  - no dispatch workflow module
  - no status mutation controls that imply finished lifecycle management

### Architecture Compliance

- Follow the architecture boundary that says:
  - public customer APIs live under `requests`
  - internal ops APIs live under `ops`
  - shared Zod contracts define request and response boundaries between frontend and backend
- Respect the current repo reality:
  - `apps/handrix-api/src/modules/ops/` already owns protected session and queue endpoints
  - `apps/handrix-web/src/features/ops-queue/` already contains the ops login and queue UI
  - `apps/handrix-web/src/app/App.tsx` still uses manual path handling rather than a full React Router migration
- Keep the lifecycle truth backend-owned:
  - `requests` remains the source of request lifecycle and public-status projection
  - the ops detail surface should present that truth for operators, not redefine it in the frontend
- Avoid premature architecture work:
  - no Prisma repository layer just for this story
  - no `dispatch` write workflow pulled forward from Story 3.4
  - no support-module read surface pulled forward from Epic 4

### Library / Framework Requirements

- Use the existing project stack already present in the repo:
  - React 19 + Vite on the frontend
  - NestJS 11 on the backend
  - TypeScript across the workspace
  - pnpm workspace scripts for validation
- Reuse the current testing approach:
  - Jest and Nest testing patterns for API and service coverage
  - Vitest and React Testing Library for frontend behavior
- Prefer extending current local feature patterns over introducing major new dependencies for detail fetching or routing.

### UX / Interaction Guardrails

- Treat the detail screen as an operational review workspace:
  - prioritize scannable sections and decision-relevant data
  - keep the visual language aligned with the existing ops area, not the customer reassurance flow
- Include the content operators need to avoid contradictions:
  - issue details and intake answers
  - service location and access notes
  - current lifecycle and public-status context
  - customer-visible guidance and expectation snapshots
  - append-only history with timestamps and change summaries
- Keep the queue interaction focused:
  - queue items should open the detail view directly
  - the user should be able to return to the queue without losing orientation
  - do not require operators to memorize queue context across navigation
- Keep accessibility strong:
  - readable density and contrast
  - keyboard focus for queue-to-detail navigation
  - no color-only meaning for request readiness or risk states

### Testing Requirements

- Backend coverage should prove:
  - ops-authenticated users can load request details
  - unauthenticated requests are rejected
  - non-ops roles are forbidden
  - unknown request IDs return a stable protected not-found response
  - detail responses include the needed review context without leaking tracking secrets
- Frontend coverage should prove:
  - selecting a queue item loads the protected detail screen
  - loading, error, and not-found states render clearly
  - the detail view shows serviceability, guidance, expectation, and history sections
  - returning to the queue preserves a calm, understandable navigation flow
- Regression coverage should confirm:
  - the existing ops login and queue flows still work
  - public customer request creation and tracking remain unaffected
  - ops session storage remains separate from anonymous request-tracking storage

### Previous Story Intelligence

- Story 3.1 created the protected ops auth boundary, session verification endpoint, and the separation between internal staff auth and anonymous customer tracking. Story 3.3 should continue to build entirely inside that boundary.
- Story 3.2 established the queue as the entry point for operations work and derived its summary state from the same persisted request records used by the public tracking model. The request-detail view should follow that same backend-owned-truth pattern.
- The current `OpsService` queue read model already depends on `PersistedServiceRequest` fields such as `issueLabel`, `serviceLocation`, `lifecycleState`, `publicStatus`, `createdAt`, and append-only `history`. Story 3.3 should extend, not duplicate, that understanding of the record.
- The current source tree shows a meaningful gap: there is no shared ops request-detail contract, no protected detail endpoint, and no queue-to-detail route yet. This story should fill that gap without introducing assignment or support workflows ahead of schedule.

### Git Intelligence Summary

- Recent git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so commit titles add little implementation guidance.
- The strongest continuity signals come from the current source tree:
  - `apps/handrix-api/src/modules/ops/ops.controller.ts` currently exposes only protected session and queue reads
  - `apps/handrix-api/src/modules/ops/ops.service.ts` already builds queue data from the persisted request store
  - `apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx` renders queue items but does not yet open a request detail view
  - `apps/handrix-web/src/app/App.tsx` uses manual path handling, so route additions should stay minimal and targeted
  - `apps/handrix-api/src/modules/requests/request-store.service.ts` already persists the detail fields and request history context that this story needs to surface

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/ops/`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts` only if customer-shown guidance or expectation snapshots need durable persistence support
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/ops-queue/`
  - `apps/handrix-web/src/app/App.tsx`
  - `apps/handrix-web/src/styles/globals.css` if the detail layout needs new ops-specific styling
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/ops/`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding internal detail reads to public request controllers
  - reconstructing "shown to customer" context only from current rule engines
  - leaking tracking tokens, idempotency keys, or raw internal identifiers into the ops UI
  - pulling Story 3.4 assignment behavior or Epic 4 support scope into this review story

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.3: Let Operations Review Full Request Details]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Request Queue Item]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-1-enable-operations-staff-authentication-and-access.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-2-show-an-operations-request-queue.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-routes.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-queue.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected Story 3.3 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, config, template, checklist, sprint artifact, and Epic 3 planning inputs.
- 2026-04-21: Analyzed Stories 3.1 and 3.2 to preserve the existing ops auth boundary, protected queue behavior, and current repo seams.
- 2026-04-21: Reviewed the architecture, UX, request-store model, queue contracts, current ops UI, and current requests service to ground this story in the live codebase.
- 2026-04-21: Identified a key implementation guardrail for Story 3.3: operators need historical customer-visible guidance and expectation context, so the eventual implementation should persist or expose "shown to customer" data explicitly instead of reconstructing it from current rules only.
- 2026-04-21: Created this implementation-ready story artifact and updated sprint tracking to `ready-for-dev`.
- 2026-04-21: Marked Story 3.3 as `in-progress`, added shared ops request-detail schemas, and extended anonymous request creation to persist the customer-shown containment and review snapshots.
- 2026-04-21: Implemented a protected `GET /ops/requests/:publicId` read-only endpoint plus an `OpsService` detail read model that exposes intake answers, lifecycle context, serviceability/readiness summaries, and append-only history without leaking tracking secrets.
- 2026-04-21: Added queue-to-detail navigation, a protected operations request-detail screen, feature-local detail API loading, and ops-specific styling for the new review surface.
- 2026-04-21: Verified the implementation with targeted frontend/backend specs, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm --filter handrix-api test:e2e`, then moved the story to `review`.

### Completion Notes List

- Created an implementation-ready story for the next Epic 3 item with explicit read-model, contract, routing, UX, and regression guardrails.
- Grounded the story in the current repo state, where protected ops queue access exists but no request-detail API contract or queue-to-detail route exists yet.
- Preserved BMAD continuity by carrying forward the internal auth boundary from Story 3.1 and the queue read-model patterns from Story 3.2.
- Added a specific guardrail around customer-facing context durability so future implementation does not guess at containment guidance or expectation copy after rules evolve.
- Implemented protected ops request-detail contracts, controller/service read paths, and request-store backed mapping for intake answers, serviceability, customer-visible context, and append-only history.
- Persisted customer-shown containment guidance and request-review summary snapshots during anonymous request confirmation so operations detail reads reflect what the customer actually saw.
- Added queue-item navigation to a new protected ops request-detail screen with back-to-queue flow, explicit review sections, and calm internal styling for mobile and desktop.
- Verified the story with backend/controller/service tests, frontend queue/detail tests, full workspace tests, lint, build, typecheck, and API e2e coverage.

### File List

- _bmad-output/implementation-artifacts/3-3-let-operations-review-full-request-details.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.controller.spec.ts
- apps/handrix-api/src/modules/ops/ops.module.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.tsx
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-routes.ts
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts
- packages/shared-contracts/src/requests/request.schemas.ts

### Change Log

- 2026-04-21: Implemented Story 3.3 with a protected ops request-detail endpoint, durable customer-context snapshots, queue-to-detail navigation, a new ops detail screen, and full validation across tests, lint, build, and typecheck.
