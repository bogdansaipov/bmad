# Story 3.4: Assign Requests to a Provider or Internal Fulfillment Owner

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations coordinator,
I want to assign each request to the right fulfillment owner,
so that active requests move into dispatch instead of stalling in review.

## Acceptance Criteria

1. Given a request is eligible for assignment, when the coordinator chooses a provider or internal fulfillment owner, then the system records the assignment against the request, and the request can move into the next appropriate lifecycle state.
2. Given an assignment is made, when the operation succeeds, then the queue and request detail views reflect the assigned owner consistently, and the assignment is captured in request history for later ops and support visibility.
3. Given a request is not ready for assignment, when the coordinator attempts to assign it in an invalid condition, then the system prevents the invalid action, and the response guides the operator toward the correct next step.

## Tasks / Subtasks

- [x] Add a protected assignment write path for operations without leaking internal mutation capability into public request APIs (AC: 1, 2, 3)
  - [x] Add an assignment action under the protected internal boundary in `apps/handrix-api/src/modules/ops/`, with role enforcement continuing to use `InternalAuthGuard` and `InternalRolesGuard`.
  - [x] Introduce a shared assignment request/response contract in `packages/shared-contracts/src/ops/` for choosing a fulfillment owner, returning the updated assignment snapshot, and preserving the existing `{ data, meta? }` / `{ error: ... }` API envelope shape.
  - [x] Keep the controller thin and push assignment validation plus state updates into backend services rather than implementing transition rules inside the controller.

- [x] Persist fulfillment-owner data on the request record in a way that can power queue, detail, and later support visibility from one source of truth (AC: 1, 2)
  - [x] Extend `PersistedServiceRequest` in `apps/handrix-api/src/modules/requests/request-store.service.ts` with the minimal durable assignment snapshot needed now, such as assignment kind, owner id, owner label, assigned-at timestamp, and optional assignment note.
  - [x] Reuse the existing file-backed request store update pattern instead of inventing a second assignment store or a frontend-only shadow state.
  - [x] Preserve backward compatibility for records created before assignment existed so older test fixtures and stored requests still read safely.

- [x] Implement backend-owned assignment rules and lifecycle updates that respect request-state truth (AC: 1, 2, 3)
  - [x] Allow assignment only from states that are operationally ready for it, and reject requests that are unavailable, completed, awaiting confirmation, or otherwise not dispatchable yet.
  - [x] When an assignment succeeds, move the request into the next lifecycle/public-status combination that matches the current state model instead of letting the frontend guess the new status.
  - [x] Append a durable history entry with `actorType: 'ops'`, assignment-specific change summary text, and any assignment-related actor information needed for later internal visibility.
  - [x] Return stable validation/not-found/conflict-style error shapes that explain why assignment was blocked and what the operator should do next.

- [x] Update the queue and protected request-detail read models so assigned ownership is visible consistently after mutation (AC: 2)
  - [x] Extend `OpsQueueItem` and the queue summary mapping so assigned requests show the selected owner rather than only a generic state label.
  - [x] Extend the protected request-detail payload to include the current assignment snapshot and the latest assignment history context.
  - [x] Keep queue and detail derivations backend-owned by reusing persisted request data instead of duplicating assignment mapping logic separately in each frontend screen.

- [x] Add assignment controls to the protected operations UI without collapsing Story 3.5 lifecycle-management scope into this story (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx` with an assignment section that lets operators choose between a provider and an internal fulfillment owner.
  - [x] Add a feature-local assignment API client beside the existing ops queue/detail clients and keep mutation handling out of presentational components.
  - [x] Reflect assignment success immediately in the detail screen and queue navigation path so operators do not need a manual refresh to confirm the handoff.
  - [x] Keep status-mutation controls out of scope except for the lifecycle change that is inseparable from a successful assignment.

- [x] Define an MVP-safe owner-selection model instead of implying a full provider marketplace that does not exist yet (AC: 1, 3)
  - [x] Source available assignees from a controlled backend-owned list or config seam that can support both provider and internal-owner options.
  - [x] Keep the option set intentionally small and explicit for the MVP; do not invent scheduling, availability scoring, or external provider integrations in this story.
  - [x] Ensure labels shown to operators are clear enough to avoid ambiguous assignment choices.

- [x] Protect scope boundaries between assignment, lifecycle control, and future support workflows (AC: 1, 2, 3)
  - [x] Do not build the full state-machine editor from Story 3.5 here.
  - [x] Do not add support search/intervention tooling from Epic 4.
  - [x] Do not introduce database, Prisma, or deployment hardening work from Epic 5 solely for assignment persistence in the current file-backed MVP architecture.

- [x] Add automated coverage for assignment success paths, invalid conditions, and regression safety (AC: 1, 2, 3)
  - [x] Add backend tests for authorized assignment success, unauthorized/forbidden access, not-found handling, invalid-state rejection, and request-history persistence.
  - [x] Add backend tests proving queue/detail read models reflect the assigned owner and lifecycle/public-status changes consistently after assignment.
  - [x] Add frontend tests for assignment controls, success feedback, blocked-action messaging, and queue/detail synchronization after mutation.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and any existing protected API/e2e coverage relevant to ops mutations.

## Dev Notes

- Story 3.3 already created the protected request-detail surface and queue-to-detail navigation. Story 3.4 should extend that seam into a write path rather than creating a second assignment workflow elsewhere in the app.
- The current file-backed persisted request model has lifecycle state, public status, customer context, and append-only history, but it does not yet store who owns fulfillment. This story should add the smallest durable assignment snapshot needed for MVP continuity.
- The biggest modeling risk is split truth. Assignment, queue state, detail state, and request history must all come from the same persisted request record so operators and later support tooling do not see contradictions.
- The second risk is invalid dispatch progression. Assignment should only happen when the request is actually ready, and any lifecycle/public-status movement should remain backend-owned.

### Technical Requirements

- Keep protected assignment APIs inside the existing internal auth boundary:
  - protected assignment entrypoints stay under `apps/handrix-api/src/modules/ops/`
  - reuse `InternalAuthGuard` and `InternalRolesGuard`
  - do not expose assignment mutations from `apps/handrix-api/src/modules/requests/requests.controller.ts`
- Reuse the current persisted request model and store seam:
  - extend `PersistedServiceRequest`
  - prefer a focused update method on `RequestStoreService` over ad hoc file writes in controllers/services
  - keep append-only history intact
- Keep lifecycle truth backend-owned:
  - assignment may trigger the next lifecycle/public-status step
  - the frontend should render returned state, not derive transitions on its own
  - if assignment is rejected, the API should explain why with a stable error code/message
- Keep contracts shared when both apps consume them:
  - define schemas in `packages/shared-contracts/src/ops/`
  - continue using JSON `camelCase` and ISO 8601 timestamps
  - export new schemas through `packages/shared-contracts/src/index.ts`
- Treat owner selection as MVP dispatch coordination, not marketplace automation:
  - support provider and internal-owner variants
  - keep owner options backend-defined
  - avoid adding scheduling, routing, or provider-capacity logic

### Architecture Compliance

- Follow the architecture boundary that says:
  - public customer APIs live under `requests`
  - internal operations APIs live under `ops`
  - assignment behavior belongs to the operational/dispatch side, not the anonymous customer flow
- Respect the current repo reality:
  - `apps/handrix-api/src/modules/ops/` already owns protected session, queue, and request-detail access
  - no `dispatch/` module exists in the live codebase yet, so avoid a large speculative refactor unless it clearly simplifies assignment ownership
  - `apps/handrix-web/src/features/ops-queue/` already contains the protected ops surfaces that should host assignment UI
- Preserve backend-owned request truth:
  - queue and detail views should both derive assignment state from the same persisted request record
  - request history remains the audit trail for later ops/support review
  - public-status projection must stay aligned with internal lifecycle changes
- Avoid premature architecture work:
  - no support module pulled forward from Epic 4
  - no database migration program pulled forward from Epic 5
  - no separate assignment micro-workflow or shadow store

### Library / Framework Requirements

- Use the existing project stack already present in the repo:
  - React 19 + Vite on the frontend
  - NestJS 11 on the backend
  - TypeScript across the workspace
  - pnpm workspace scripts for validation
- Reuse the current testing approach:
  - Jest and Nest testing patterns for protected API and service coverage
  - Vitest and React Testing Library for frontend behavior
- Prefer extending current local feature patterns over introducing new data libraries, form libraries, or routing systems solely for assignment.

### UX / Interaction Guardrails

- Treat assignment as a high-confidence operational action:
  - the screen should make the current readiness obvious before the operator commits
  - success feedback should be immediate and unambiguous
  - blocked actions should explain the reason and the next correct step
- Keep the detail screen as the assignment workspace:
  - the operator should not need to leave the protected request detail view to assign ownership
  - queue visibility should stay aligned after the action completes
  - assignment information should be easy to scan later in both queue and detail contexts
- Use explicit labels instead of hidden operational shorthand:
  - distinguish provider assignments from internal-owner assignments clearly
  - avoid color-only state meaning
  - preserve strong keyboard and focus behavior

### Testing Requirements

- Backend coverage should prove:
  - ops-authenticated users can assign eligible requests
  - unauthenticated requests are rejected
  - non-ops roles are forbidden
  - unknown request IDs return a stable protected not-found response
  - invalid lifecycle conditions reject assignment without mutating stored state
  - successful assignment updates persisted owner data, lifecycle/public status, and history together
- Frontend coverage should prove:
  - assignment controls render only in the protected ops experience
  - eligible requests can be assigned successfully from the detail screen
  - blocked requests show a clear explanatory error
  - queue/detail UI reflects the assigned owner after mutation
- Regression coverage should confirm:
  - existing ops login, queue, and request-detail flows still work
  - anonymous customer request creation and status tracking remain unaffected
  - older persisted requests without assignment data still render safely

### Previous Story Intelligence

- Story 3.1 created the protected ops auth/session boundary. Story 3.4 must remain entirely inside that boundary.
- Story 3.2 established the queue as the operational entry point and already uses backend-owned queue-state mapping from persisted requests. Assignment should update that same source instead of layering on client-only flags.
- Story 3.3 added a protected request-detail endpoint and screen under `GET /ops/requests/:publicId`, plus shared detail schemas and queue-to-detail routing. Story 3.4 should extend that exact seam with assignment writes and assignment-aware detail rendering.
- Story 3.3 also added durable customer-context persistence for what the customer was shown. Assignment changes must preserve that context and add to history rather than overwriting prior snapshots or rewriting historical meaning.

### Git Intelligence Summary

- Recent git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so commit titles add little direct assignment guidance.
- The strongest continuity signals come from the current source tree:
  - `apps/handrix-api/src/modules/ops/ops.controller.ts` already exposes protected queue/detail reads and is the natural protected entrypoint for assignment
  - `apps/handrix-api/src/modules/ops/ops.service.ts` already maps queue/detail state from persisted requests and should stay consistent with assignment writes
  - `apps/handrix-api/src/modules/requests/request-store.service.ts` already owns append-only history and request persistence, making it the right place for the minimal durable assignment extension
  - `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx` is the existing protected detail workspace and should host assignment actions

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/ops/`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/` only where lifecycle/public-status projection helpers need to be reused
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/ops-queue/`
  - `apps/handrix-web/src/app/App.tsx` only if route behavior needs a small protected-flow adjustment
  - `apps/handrix-web/src/styles/globals.css` if the assignment section needs additional ops styling
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/ops/`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding assignment mutations to public request controllers
  - creating a second assignment state store separate from persisted requests
  - letting the frontend invent lifecycle/public-status results after assignment
  - pulling in full Story 3.5 lifecycle tooling or Epic 4 support workflows

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.4: Assign Requests to a Provider or Internal Fulfillment Owner]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#FR27]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Journey: Intake to Assignment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Request Queue Item]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-3-let-operations-review-full-request-details.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-request-detail.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected Story 3.4 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, config, template, and checklist plus the Epic 3 planning artifacts.
- 2026-04-21: Reviewed Story 3.3 and the live ops/detail implementation seams to keep assignment work grounded in the existing protected operations surface.
- 2026-04-21: Analyzed the current request store, ops controller/service, shared contracts, UX assignment flow, and architecture boundaries to identify the smallest safe MVP assignment seam.
- 2026-04-21: Chose not to add external web research because this story is constrained to the repository's current stack and architecture artifacts rather than a latest-version evaluation.
- 2026-04-21: Created this implementation-ready story artifact and prepared sprint tracking for `ready-for-dev`.
- 2026-04-21: Marked Story 3.4 as `in-progress` and began implementation from the protected ops detail/queue seams.
- 2026-04-21: Added shared ops assignment contracts, durable request-assignment persistence, and protected `POST /ops/requests/:publicId/assignments` handling with readiness validation and stable protected error responses.
- 2026-04-21: Extended ops queue/detail read models plus the ops detail screen to expose assignment state, available fulfillment owners, assignment success feedback, and assigned-owner visibility.
- 2026-04-21: Verified the final implementation with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm --filter handrix-api test:e2e`, then moved the story to `review`.

### Completion Notes List

- Created an implementation-ready story for Epic 3.4 with explicit assignment persistence, lifecycle, queue/detail synchronization, and scope-boundary guardrails.
- Preserved continuity with Story 3.3 so the future implementation can extend the existing protected request-detail workflow instead of creating a parallel assignment surface.
- Implemented protected assignment writes, durable owner snapshots, and backend-owned lifecycle advancement from `inReview` to `dispatching`.
- Added assignment-aware ops contracts, queue/detail mapping, and frontend assignment controls with success/error handling.
- Covered assignment persistence, service/controller mutation rules, detail-screen behavior, and app-level ops navigation through automated tests.

### File List

- _bmad-output/implementation-artifacts/3-4-assign-requests-to-a-provider-or-internal-fulfillment-owner.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.controller.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-assignment.schemas.ts
- packages/shared-contracts/src/ops/ops-queue.schemas.ts
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts
