# Story 3.5: Manage Lifecycle Status Updates with Guardrails

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations coordinator,
I want to update request statuses through valid transitions only,
so that internal actions remain consistent with the customer-facing timeline.

## Acceptance Criteria

1. Given a request is in a known lifecycle state, when operations attempts to change its status, then only valid next transitions are permitted according to the request state machine, and invalid transitions are rejected before they create inconsistent request history.
2. Given a valid lifecycle transition occurs, when the new status is saved, then the system updates the internal state, resolves the corresponding public status, and records the transition durably, and customer-facing progress remains aligned with operational truth.
3. Given a lifecycle change impacts the customer experience, when the transition is completed, then the customer-safe status view can reflect the change through the existing tracking model, and the transition remains auditable by internal teams.

## Tasks / Subtasks

- [x] Introduce an explicit backend-owned lifecycle transition guardrail for ops status changes instead of scattering transition checks across services (AC: 1, 2, 3)
  - [x] Add a focused transition helper under `apps/handrix-api/src/modules/requests/` and preferably align it with the architecture target by introducing `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`.
  - [x] Encode the MVP transition matrix in one place and have the ops module call that source of truth before any lifecycle mutation is persisted.
  - [x] Keep assignment-driven movement from Story 3.4 compatible with the same state machine rather than leaving `assignRequest()` as a special case that can drift.
- [x] Add a dedicated protected ops status-update contract and endpoint instead of overloading the assignment API with unrelated lifecycle changes (AC: 1, 2, 3)
  - [x] Create a shared schema in `packages/shared-contracts/src/ops/` for the status-update request and any customer-safe response additions needed by the detail screen.
  - [x] Export the new schema/type from `packages/shared-contracts/src/index.ts`.
  - [x] Add a protected route in `apps/handrix-api/src/modules/ops/ops.controller.ts` for status updates, using the same shared envelope and role guards as the existing ops endpoints.
- [x] Implement backend mutation flow for valid status changes with durable history and public-status alignment (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/requests/request-store.service.ts` with a generic lifecycle transition write seam, rather than coupling all non-assignment transitions to ad hoc history appends.
  - [x] Ensure each valid change persists the next lifecycle state, the mapped public status, `occurredAt`, `actorType: 'ops'`, optional `actorId`, and a clear `changeSummary`.
  - [x] Reuse the existing customer snapshot/history model from Story 2.6 so tracking, ops detail history, and future support views stay aligned.
- [x] Keep public-status projection backend-owned and consistent with the existing tracking vocabulary (AC: 2, 3)
  - [x] Derive public status from the internal lifecycle transition through a single mapper or helper, preferably alongside the state machine in `requests/domain`.
  - [x] Preserve the current customer-safe status set in `packages/shared-contracts/src/requests/request-status.schemas.ts` and do not invent new frontend-only labels.
  - [x] Treat transitions back into review carefully so recovered requests re-enter the correct customer-facing status (`inReview`, not a misleading reset to `received`).
- [x] Extend the ops request-detail experience so coordinators can only choose allowed next statuses from the current state (AC: 1, 2)
  - [x] Add a status-update UI to `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx` that surfaces the current lifecycle state, the allowed next actions, and calm validation feedback.
  - [x] Add a feature-local API adapter in `apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts` for the new protected status-update endpoint.
  - [x] Refresh the detail view from the backend response after a successful change so current state, assignment context, and history remain in sync without frontend reconstruction.
- [x] Keep queue and detail projections coherent after state changes (AC: 2, 3)
  - [x] Update `apps/handrix-api/src/modules/ops/ops.service.ts` so queue-state summaries and detail-state presentation continue to reflect the canonical lifecycle state after valid transitions.
  - [x] Preserve existing assignment behavior: assignment ownership should not be silently dropped when a request moves into delayed or clarification-needed states unless a later story explicitly introduces reassignment/removal rules.
  - [x] Ensure completed or unavailable requests behave consistently in queue visibility and detail history after a transition is recorded.
- [x] Add regression coverage for guardrails, history, and customer-visible alignment (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/ops/ops.service.spec.ts` with valid and invalid transition scenarios, including blocked transitions from terminal states.
  - [x] Extend `apps/handrix-api/src/modules/ops/ops.controller.spec.ts` with protected endpoint validation and error-envelope coverage.
  - [x] Add focused tests in `apps/handrix-api/src/modules/requests/` for the new state machine / public-status mapper so transition rules are not only indirectly tested through controller behavior.
  - [x] Update `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx` so the UI only offers allowed actions and reflects the updated backend state after a successful transition.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Epic 3 work already established ops authentication, queue visibility, request detail visibility, and assignment handling. This story should add guarded lifecycle updates on top of those seams, not create a second parallel workflow.
- Story 2.6 already made request history durable and customer-context-aware. Story 3.5 should build directly on that append-only history model so every ops-driven transition stays auditable and immediately usable by tracking and future support surfaces.
- The architecture explicitly calls out a request lifecycle state machine and public-status mapper as cross-cutting sources of truth, but the live repo does not yet have dedicated `requests/domain` files for them. This story is the right time to introduce those focused seams if done without breaking the current module layout.
- The current codebase is authoritative about where the MVP really lives today:
  - protected ops APIs live in `apps/handrix-api/src/modules/ops/`
  - persisted lifecycle and history live in `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - customer-safe tracking vocabulary lives in `packages/shared-contracts/src/requests/request-status.schemas.ts`
  - ops detail and assignment UI live in `apps/handrix-web/src/features/ops-queue/`

### Technical Requirements

- Keep backend lifecycle rules as the only source of truth for business-critical transitions.
- Reject invalid ops transitions before mutating persistence or appending history.
- Preserve the current public/internal split:
  - internal lifecycle stays richer than customer-facing status
  - public status remains a derived projection owned by backend logic
- Record ops-driven transitions with `actorType: 'ops'` and the authenticated internal user id when available.
- Reuse the existing append-only history shape from Story 2.6 so new ops transitions appear naturally in both customer tracking and internal history views.
- Do not regress to ad hoc conditionals like "if state is X and route is Y" spread across controller and UI code; transition validity should come from one backend-owned matrix.

### Suggested MVP Transition Matrix

- Use this as the implementation baseline unless live code constraints require a tighter variant:
  - `awaiting_confirmation` -> no ops-driven transitions
  - `intake_in_review` -> `clarification_needed` | `dispatch_delayed` | `unfulfilled`
  - `dispatch_in_progress` -> `dispatch_delayed` | `clarification_needed` | `completed` | `unfulfilled`
  - `dispatch_delayed` -> `dispatch_in_progress` | `clarification_needed` | `unfulfilled`
  - `clarification_needed` -> `intake_in_review` | `dispatch_in_progress` | `unfulfilled`
  - `completed` -> terminal
  - `unfulfilled` -> terminal
- Keep assignment-driven transition to `dispatch_in_progress` from Story 3.4 valid through the same state machine, even if it is triggered by a separate endpoint.
- If the implementation discovers a safer MVP restriction, update the matrix in code and tests together rather than leaving behavior implicit.

### Public Status Mapping Guardrails

- Preserve the existing customer-safe mapping vocabulary:
  - `dispatch_in_progress` -> `dispatching`
  - `dispatch_delayed` -> `delayed`
  - `clarification_needed` -> `needsClarification`
  - `completed` -> `completed`
  - `unfulfilled` -> `unavailable`
- When a request returns to review after clarification or recovery work, map it to `inReview` rather than resetting to `received`.
- Do not let the frontend infer public statuses from raw lifecycle enums.

### Architecture Compliance

- Keep protected ops routes and orchestration in `apps/handrix-api/src/modules/ops/`.
- Keep lifecycle persistence and durable history in `apps/handrix-api/src/modules/requests/`.
- It is architecture-aligned to add dedicated lifecycle files under `apps/handrix-api/src/modules/requests/domain/` in this story if the behavior is wired back through existing modules cleanly.
- Keep shared request and ops contracts in `packages/shared-contracts/src/`.
- Keep ops UI and feature-local API adapters in `apps/handrix-web/src/features/ops-queue/`.

### Testing Requirements

- Cover valid transition paths from active states into delayed, clarification-needed, completed, and unavailable outcomes.
- Cover invalid transitions from:
  - terminal states
  - states that require assignment first
  - transitions that would contradict the current workflow
- Assert that each successful transition updates:
  - canonical lifecycle state
  - mapped public status
  - append-only history
  - ops detail response
  - customer tracking compatibility
- Assert that invalid transitions do not mutate the request record or append new history entries.

### UX / Interaction Guardrails

- The ops detail screen should make the next allowed status obvious without feeling like a raw admin console.
- Validation failures should be clear and calm, using the existing error-envelope approach rather than leaking backend stack details.
- Status actions should reinforce lifecycle continuity, not encourage arbitrary jumping between states.
- The customer tracking experience should automatically benefit from valid ops changes through the existing backend-owned tracking model, without requiring new customer-side status logic.

### Previous Story Learnings

- Story 3.1 introduced protected ops access, so this story should continue using the internal auth guard and role-based protection already in place.
- Story 3.2 introduced queue-state presentation, which means status changes in this story must keep queue summaries and urgency cues coherent after transitions.
- Story 3.3 introduced the full ops request-detail view, including customer-visible context and history, so new status actions should happen from that existing detail seam.
- Story 3.4 introduced assignment behavior directly in `OpsService.assignRequest()`, including a transition into `dispatch_in_progress`. Story 3.5 should consolidate that behavior under a shared lifecycle rule source rather than letting assignment and status updates diverge.
- Story 2.6 already proved that durable history plus backend-derived customer snapshots works well. Reuse that pattern instead of inventing a second event or audit format.

### Git Intelligence Summary

- Recent visible commit history remains sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so the live module seams and current tests are more reliable than commit titles for implementation guidance.
- The current repo already contains the real extension points for this story:
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.controller.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx`

### Project Structure Notes

- There are no prior Epic 3 story artifacts checked into `_bmad-output/implementation-artifacts/` yet, even though the code for Stories 3.1 through 3.4 is already present in the repo. Treat the current source tree as the best record of those earlier stories.
- The architecture names future files such as `requests/domain/request-state-machine.ts` and `requests/domain/public-status-mapper.ts`, but those files do not yet exist. This story can create them if that reduces drift and duplication.
- Avoid creating a generic `dispatch` module just for this story unless the current repo actually needs it; the live implementation keeps this behavior within `ops` and `requests`.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.5: Manage Lifecycle Status Updates with Guardrails]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Journey 3: Operations User - Dispatch Coordinator]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Gap Analysis Results]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Experience Mechanics]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.spec.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.spec.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-request-detail.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-assignment.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected Story 3.5 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, project config, Epic 3 story definitions, PRD, architecture, and UX artifacts.
- 2026-04-21: Reviewed the live ops queue, ops detail, assignment, request-history, and shared-contract seams to ground this story in the current repo rather than only in planning docs.
- 2026-04-21: Created this story artifact and updated sprint tracking status to `ready-for-dev`.
- 2026-04-21: Marked Story 3.5 in progress in the story artifact and sprint tracker before implementation.
- 2026-04-21: Added shared ops status-update schemas, explicit lifecycle transition and public-status mapping helpers, a generic lifecycle transition write seam, and a protected ops status-update endpoint.
- 2026-04-21: Updated the ops request-detail service and screen so only backend-approved next lifecycle actions are shown and status changes refresh the full detail response from the API.
- 2026-04-21: Added regression coverage for the state machine, public-status mapper, request-store lifecycle transitions, ops service/controller flows, ops detail UI, and the app-level protected request-detail route.
- 2026-04-21: Validated the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Implemented a backend-owned lifecycle state machine that supports guarded ops status changes, including the real repo-specific `received -> inReview` progression while staying in `intake_in_review`.
- Added a dedicated protected ops status-update contract and endpoint, reusing the shared success/error envelope and internal auth guards already established for the ops workspace.
- Introduced a generic request lifecycle transition seam in the file-backed request store so ops-driven transitions append durable history without losing assignment context.
- Added a public-status mapper for lifecycle transitions so review recovery returns to `inReview` and customer-facing status remains aligned with backend truth.
- Extended the ops request-detail response with backend-computed `availableTransitions`, then updated the UI to render only those approved next actions and to refresh from the server after a status change.
- Preserved existing assignment behavior from Story 3.4 while bringing its dispatch transition under the same state-machine guardrails.

### File List

- _bmad-output/implementation-artifacts/3-5-manage-lifecycle-status-updates-with-guardrails.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.controller.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts
- apps/handrix-api/src/modules/requests/domain/public-status-mapper.spec.ts
- apps/handrix-api/src/modules/requests/domain/request-state-machine.ts
- apps/handrix-api/src/modules/requests/domain/request-state-machine.spec.ts
- apps/handrix-api/src/modules/requests/request-status.presenter.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/health/health.schemas.ts
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts
- packages/shared-contracts/src/ops/ops-status-update.schemas.ts

### Change Log

- 2026-04-21: Implemented Story 3.5 by adding guarded ops lifecycle updates, backend-owned transition and public-status mapping helpers, durable transition persistence, approved next-action projections for the ops detail screen, and regression coverage across backend and frontend seams.
