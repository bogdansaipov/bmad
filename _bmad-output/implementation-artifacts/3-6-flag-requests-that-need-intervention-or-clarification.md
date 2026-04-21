# Story 3.6: Flag Requests That Need Intervention or Clarification

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations coordinator,
I want to identify requests that are blocked, unclear, or at risk,
so that I can intervene before customer trust breaks down.

## Acceptance Criteria

1. Given a request cannot move cleanly through the standard dispatch path, when its state indicates missing details, delay risk, or operational blockage, then the request is visibly identifiable as needing intervention or clarification, and the ops queue supports recognizing these requests quickly.
2. Given a request needs clarification or escalation, when operations reviews the record, then the coordinator can understand why the intervention is needed, and the request can be managed without losing lifecycle continuity or history.
3. Given an at-risk request is updated by operations, when the intervention status changes, then the internal and public lifecycle states remain consistent with the approved recovery behavior, and later support users can understand what happened from the stored record.

## Tasks / Subtasks

- [x] Add a backend-owned intervention signal to ops read models instead of making the frontend infer "at risk" from scattered state combinations (AC: 1, 2, 3)
  - [x] Extend the protected ops queue/detail response contracts in `packages/shared-contracts/src/ops/` with a focused intervention summary shape that can express whether a request needs clarification, is blocked, or otherwise needs human attention.
  - [x] Export the new schemas/types from `packages/shared-contracts/src/index.ts` and keep field naming in existing JSON `camelCase`.
  - [x] Keep the signal derived from canonical request state and persisted history, not from UI-only heuristics.

- [x] Surface intervention-ready requests clearly in the ops queue without introducing a second prioritization model (AC: 1)
  - [x] Update `apps/handrix-api/src/modules/ops/ops.service.ts` queue mapping so clarification-needed, delayed, unavailable, and similarly at-risk requests expose explicit intervention metadata alongside the existing queue state.
  - [x] Preserve the current queue-state vocabulary (`new`, `needsClarification`, `assignable`, `assigned`, `blocked`, `unavailable`) and layer intervention cues on top rather than replacing it with new labels.
  - [x] Extend queue tests in `apps/handrix-api/src/modules/ops/ops.service.spec.ts` so operations can still scan high-risk records quickly after the new metadata is added.

- [x] Make the protected request-detail view explain why intervention is needed and what continuity constraints apply (AC: 2, 3)
  - [x] Extend `packages/shared-contracts/src/ops/ops-request-detail.schemas.ts` and the corresponding presenter logic in `apps/handrix-api/src/modules/ops/ops.service.ts` with an intervention section that summarizes the current risk reason, latest relevant history event, and any recommended next step.
  - [x] Reuse existing customer snapshot/history data from `apps/handrix-api/src/modules/requests/request-store.service.ts` so the detail view reflects what the customer has already been told.
  - [x] Keep the detail response safe for future support reuse by making it clear whether the problem is clarification, operational delay, or unavailable fulfillment.

- [x] Support durable intervention context in request history instead of losing the explanation in ephemeral queue copy (AC: 2, 3)
  - [x] Add the smallest safe persistence seam needed in `apps/handrix-api/src/modules/requests/request-store.service.ts` for intervention-oriented notes or reason metadata if the current history shape cannot already explain why a request is blocked.
  - [x] Prefer appending to the existing history model over creating a separate intervention log or sidecar store.
  - [x] Ensure operations updates that move between `clarification_needed`, `dispatch_delayed`, `dispatch_in_progress`, and `unfulfilled` preserve an understandable audit trail for later support users.

- [x] Extend the ops detail UI so intervention states are obvious and calm rather than hidden in raw status labels (AC: 1, 2)
  - [x] Update `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx` to show an intervention panel or equivalent summary near the current-state section.
  - [x] Keep status actions from Story 3.5 grounded in backend-approved transitions; the new UI should explain intervention context, not let the frontend invent lifecycle rules.
  - [x] If helpful, add a light intervention cue to the queue list UI in `apps/handrix-web/src/features/ops-queue/` without turning the screen into a noisy admin dashboard.

- [x] Preserve lifecycle/public-status alignment for recovery paths and handoff visibility (AC: 2, 3)
  - [x] Reuse the existing request state machine and public-status projection seams under `apps/handrix-api/src/modules/requests/domain/` so intervention visibility stays aligned with customer-safe statuses.
  - [x] Do not let intervention flags become a second source of truth that can disagree with `availableTransitions`, current lifecycle state, or customer tracking.
  - [x] Make sure later support workflows in Epic 4 can understand the outcome from stored request history and ops detail context without reconstructing intent from raw events.

- [x] Add regression coverage for intervention identification, detail context, and continuity (AC: 1, 2, 3)
  - [x] Extend backend tests for queue/detail presenters and any new store seam in `apps/handrix-api/src/modules/ops/` and `apps/handrix-api/src/modules/requests/`.
  - [x] Add frontend tests for intervention messaging and visibility in the protected ops experience.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 3.5 already introduced guarded lifecycle transitions and backend-computed `availableTransitions`. Story 3.6 should build on those seams so intervention visibility comes from the same canonical state model rather than from a separate rules engine.
- The queue already distinguishes `needsClarification`, `blocked`, and `unavailable`, but the story requirement goes further: operators must quickly understand which requests need intervention and why. That means both queue and detail views should carry explicit, durable context instead of relying only on terse state labels.
- The strongest continuity risk is losing the explanation behind a recovery-path status. If an operator marks a request delayed or clarification-needed, future ops/support users should be able to see why without guessing from timestamps or customer-facing copy alone.
- The current persisted request model already stores append-only history and customer snapshots. Reuse that model first, and only add minimal new metadata if the existing `changeSummary` plus snapshots cannot represent intervention intent clearly enough.

### Technical Requirements

- Keep protected ops read/write orchestration in `apps/handrix-api/src/modules/ops/`.
- Keep lifecycle truth, history, and any durable request metadata in `apps/handrix-api/src/modules/requests/`.
- Keep shared queue/detail contracts in `packages/shared-contracts/src/ops/`.
- Preserve the existing queue-state vocabulary and lifecycle/public-status mapping from Story 3.5.
- Derive intervention cues from backend-owned state plus durable history; do not let the frontend infer them independently.

### Architecture Compliance

- Follow the architecture boundary that says:
  - `requests` owns request lifecycle transitions and public-status projection.
  - `ops` owns queue-oriented orchestration surfaces and operational write actions.
  - `support` will own intervention-oriented workflows in Epic 4, so Story 3.6 should expose continuity data without prematurely building support tooling.
- Respect the current repo reality:
  - `apps/handrix-api/src/modules/ops/ops.service.ts` already composes queue and detail read models.
  - `apps/handrix-api/src/modules/requests/request-store.service.ts` already owns durable history and request persistence.
  - `apps/handrix-web/src/features/ops-queue/` is the existing internal surface for both queue scanning and request follow-through.

### UX / Interaction Guardrails

- Use calm, explicit intervention language that explains what changed, why it matters, and what the operator should do next.
- Make at-risk requests easy to scan without overwhelming the queue with duplicate badges or noisy warnings.
- Keep the protected request-detail view as the place where full intervention context is explained.
- Preserve alignment between internal intervention messaging and the customer-safe recovery states already used in tracking.

### Testing Requirements

- Backend coverage should prove:
  - at-risk requests expose intervention metadata in queue/detail payloads
  - clarification, delayed, and unavailable scenarios remain distinguishable
  - lifecycle/public-status continuity is preserved after ops updates
  - durable history remains understandable for later support/ops review
- Frontend coverage should prove:
  - intervention cues render in the protected ops experience
  - detail screens explain why intervention is needed
  - existing assignment and status-update controls still work with the new presentation
- Regression coverage should confirm:
  - anonymous customer request flows remain unaffected
  - customer tracking still reflects backend-owned recovery states
  - existing ops queue/detail navigation remains stable

### Previous Story Learnings

- Story 3.1 established the protected ops access boundary, so Story 3.6 must stay inside the same internal auth and role-guard seams.
- Story 3.2 established queue-state scanning patterns, which means intervention visibility should strengthen those patterns rather than replace them.
- Story 3.3 added the full protected request-detail view with customer-facing context and history, making it the natural place to explain intervention reasons.
- Story 3.4 added assignment ownership and durable assignment history, so intervention work must preserve owner visibility instead of obscuring who is currently responsible.
- Story 3.5 added the state machine, public-status mapper, allowed next transitions, and lifecycle update endpoint. Story 3.6 should treat those as the canonical backbone for any intervention presentation or persistence.

### Git Intelligence Summary

- Recent git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so live code seams are more useful than commit messages for implementation guidance.
- The strongest implementation anchors in the current repo are:
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.controller.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `packages/shared-contracts/src/ops/ops-request-detail.schemas.ts`
  - `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx`

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/ops/`
  - `apps/handrix-api/src/modules/requests/`
  - `apps/handrix-api/src/modules/requests/domain/`
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/ops-queue/`
  - `apps/handrix-web/src/styles/globals.css` only if the new intervention section needs styling support
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/ops/`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - creating a frontend-only intervention heuristic disconnected from backend truth
  - adding a second intervention event store separate from request history
  - pulling full support intervention workflows forward from Epic 4
  - inventing customer-facing statuses that are not backed by the existing public-status mapper

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.6: Flag Requests That Need Intervention or Clarification]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#FR29]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Journey: Intake to Assignment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Request Queue Item]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-5-manage-lifecycle-status-updates-with-guardrails.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-request-detail.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected Story 3.6 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, project config, Epic 3 planning artifacts, architecture guidance, UX guidance, and current implementation seams.
- 2026-04-21: Reviewed Story 3.5 plus the live ops queue/detail, shared contracts, and request-store/history implementation to ground this story in the current repo.
- 2026-04-21: Marked Story 3.6 `in-progress` in the story artifact and sprint tracker before implementation.
- 2026-04-21: Added shared ops intervention schemas, threaded intervention summaries into ops queue/detail contracts, and exported the new contract surface.
- 2026-04-21: Extended persisted request history with structured intervention metadata inferred from canonical lifecycle transitions so intervention context is durable rather than UI-only.
- 2026-04-21: Updated `OpsService` to derive intervention summaries from canonical lifecycle state plus stored history and expose them consistently in queue, detail, and history responses.
- 2026-04-21: Updated the ops queue and request-detail screens to surface intervention context directly in the protected UI without introducing frontend-owned lifecycle logic.
- 2026-04-21: Added regression coverage across request-store, ops service, ops controller, app integration, queue UI, and detail UI for intervention visibility and continuity.
- 2026-04-21: Validated the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`, then moved the story to `review`.

### Completion Notes List

- Created an implementation-ready story for intervention/clarification visibility grounded in the current ops queue, ops detail, and request-history seams.
- Preserved continuity with Stories 3.2 through 3.5 so future implementation can build on existing queue-state, assignment, and lifecycle guardrail work instead of introducing parallel logic.
- Implemented backend-owned intervention summaries for the ops queue and ops request detail so at-risk requests are explicitly identifiable without frontend heuristics.
- Added durable structured intervention metadata to persisted request history and projected it back through the protected ops detail history for later operational continuity.
- Kept intervention visibility aligned with the existing lifecycle/public-status model from Story 3.5 instead of introducing a second state or priority system.
- Extended frontend ops queue/detail experiences and regression tests so clarification, blocker, and unavailable scenarios are visible and understandable in the protected UI.

### File List

- _bmad-output/implementation-artifacts/3-6-flag-requests-that-need-intervention-or-clarification.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/ops/ops.controller.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-intervention.schemas.ts
- packages/shared-contracts/src/ops/ops-queue.schemas.ts
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts

### Change Log

- 2026-04-21: Implemented Story 3.6 by adding durable intervention metadata, backend-owned queue/detail intervention summaries, protected UI intervention visibility, and regression coverage across backend and frontend seams.
