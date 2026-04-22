# Story 4.5: Support Manual Intervention and Follow-Up

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support agent,
I want to record or trigger manual follow-up when a request needs human help,
so that recovery actions are visible and aligned with the request lifecycle.

## Acceptance Criteria

1. Given a request requires human follow-up or clarification outside the normal self-serve flow, when a support agent records an intervention, then the action is saved against the request in a structured and auditable way, and later support or operations users can see that the intervention occurred.
2. Given a support intervention affects the current request handling state, when the intervention is completed, then the request lifecycle and related history remain consistent with the approved status model, and customer-facing progress is not contradicted by undocumented manual actions.
3. Given a support agent adds follow-up context to a request, when the request is reviewed later by another internal user, then the stored intervention detail helps preserve continuity across support and operations, and the request remains recoverable and auditable end to end.

## Tasks / Subtasks

- [x] Add a support-scoped intervention write contract and API on top of the existing support request seam instead of creating a separate support workflow surface (AC: 1, 2, 3)
  - [x] Add shared Zod request/response contracts under `packages/shared-contracts/src/support/` for recording a support intervention, and export them from `packages/shared-contracts/src/index.ts`.
  - [x] Keep the support route protected by `@UseGuards(InternalAuthGuard, InternalRolesGuard)` and `@InternalRoles('support')` in `apps/handrix-api/src/modules/support/support.controller.ts`.
  - [x] Add a controlled mutation route such as `POST /support/requests/:publicId/interventions` that validates input with shared contracts and returns the refreshed support request detail payload so the UI can stay in sync after submission.
  - [x] Mirror the existing ops-controller error-handling style instead of introducing ad hoc support mutation exceptions or unwrapped error payloads.

- [x] Persist structured support follow-up data through the request store and history model instead of relying on freeform UI-only notes or controller-side writes (AC: 1, 3)
  - [x] Extend `apps/handrix-api/src/modules/requests/request-store.service.ts` types so support follow-up entries are stored in a structured, auditable shape that can later map cleanly to the architecture’s planned `support_notes` persistence model.
  - [x] Reuse `RequestStoreService` as the only persistence seam; do not write support intervention state directly from controllers or frontend code.
  - [x] Preserve actor, timestamp, intervention kind, and support-authored follow-up detail in persisted history so later support or ops users can understand what happened without guessing from a generic change summary.
  - [x] Keep existing assignment, customer snapshot, and history semantics intact so Story 4.4 explanation data and Epic 3 ops history remain backward compatible.

- [x] Keep lifecycle and public-status updates backend-owned whenever a support intervention changes request handling state (AC: 2, 3)
  - [x] Reuse `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts` to validate any support-triggered lifecycle change rather than inventing a second transition rule set in the support module or frontend.
  - [x] Reuse `apps/handrix-api/src/modules/requests/request-status.presenter.ts` to resolve customer-facing status presentation when support follow-up moves a request into a new approved lifecycle state.
  - [x] Limit support-triggered state changes to the approved subset needed for manual follow-up and clarification continuity. Do not add support-owned assignment, fulfillment-owner changes, or unrestricted status mutation powers.
  - [x] If an intervention is informational only, append auditable support history without changing lifecycle/public status.

- [x] Extend support detail/read models so manual follow-up remains visible to both support and operations after the write completes (AC: 1, 3)
  - [x] Expand `packages/shared-contracts/src/support/support-request-detail.schemas.ts` and `apps/handrix-api/src/modules/support/support.service.ts` so support detail responses include structured follow-up history or latest support intervention context, not just a generic latest-change line.
  - [x] Reuse existing ops visibility patterns from `packages/shared-contracts/src/ops/ops-request-detail.schemas.ts` and `apps/handrix-api/src/modules/ops/ops.service.ts` where they help align internal read models, but do not force support into ops-specific shapes or controls.
  - [x] Ensure the intervention recorded by support is visible when the request is reopened later by another support user and, where appropriate, through the operations detail/history view as the same underlying persisted event.
  - [x] Avoid duplicating the same follow-up data into multiple competing fields if one structured history/read-model extension can serve both support continuity and audit needs.

- [x] Add support-facing intervention UI inside the existing support request detail flow instead of creating a separate screen (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx` with a compact intervention form and an obvious readback of prior support follow-up.
  - [x] Add a dedicated API helper alongside `support-request-detail-api.ts` for the support intervention mutation and keep request detail reload behavior explicit after a successful submit.
  - [x] Make the UI clear about what is internal follow-up context versus what remains customer-facing lifecycle/status messaging so support does not accidentally confuse internal notes with customer copy.
  - [x] Reset stale form/detail state when navigating between support requests so one request’s pending intervention text or success state cannot bleed into another request.
  - [x] Preserve the existing support search/open/back/session-expiry flow from Stories 4.1-4.4.

- [x] Add automated coverage for validation, auditability, lifecycle consistency, and support continuity (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/support/support.controller.spec.ts` and `support.service.spec.ts` for successful intervention recording, validation failures, role isolation, not-found handling, and lifecycle-aligned updates.
  - [x] Extend `apps/handrix-api/src/modules/requests/request-store.service.spec.ts` and `apps/handrix-api/src/modules/requests/domain/request-state-machine.spec.ts` if persistence or transition rules gain new support-owned paths.
  - [x] Extend `apps/handrix-api/test/app.e2e-spec.ts` so support can record follow-up, ops can still observe the persisted result through protected reads, and unauthenticated/forbidden access continues to fail safely.
  - [x] Extend `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx` and `apps/handrix-web/src/app/App.test.tsx` for form rendering, mutation success, validation or server-error recovery, stale-state clearing, and preserved navigation/session behavior.
  - [x] Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts`.

## Dev Notes

- Story 4.4 deliberately stopped at explanation fidelity and explicitly reserved write controls, follow-up entry, and intervention recording for this story. Build on the existing support detail seam instead of introducing a second support workflow.
- The architecture already defines support as a role-specific surface with controlled intervention actions. This story should add those controls without collapsing the separation between support and operations responsibilities.
- The repo already persists intervention context indirectly through request history. Story 4.5 should make support-authored follow-up explicitly structured and auditable rather than leaving it as generic history text.
- Support follow-up must preserve the internal/public status split. If support triggers a state change, backend rules remain the source of truth for lifecycle validity and customer-visible status mapping.

### Architecture Compliance

- Keep support work within `apps/handrix-api/src/modules/support/` and `apps/handrix-web/src/features/support-request-view/`.
- Reuse the request domain seams that already own lifecycle truth:
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - `apps/handrix-api/src/modules/requests/request-status.presenter.ts`
- Shared contracts remain the backend/frontend boundary. Add support mutation contracts under `packages/shared-contracts/src/support/` and export them centrally.
- Preserve the architecture’s role split: support can search, inspect, explain, and record intervention-oriented follow-up; operations continues to own assignment and broader dispatch control.
- Model support follow-up so it can evolve toward the architecture’s planned `support_notes` persistence without forcing a redesign of the request history model later.

### Library / Framework Requirements

- No new runtime dependencies are needed.
- Continue using the existing stack and patterns already established in the repo:
  - NestJS 11 controllers/services/guards for protected internal APIs
  - Zod 4 contracts in `@handrix/shared-contracts`
  - React 19 + Vite for support UI
  - Jest + Supertest for backend/unit/e2e coverage
  - Vitest + Testing Library for frontend coverage
- Reuse the current support auth/session helpers and shared API envelope utilities rather than inventing a new fetch or auth path.

### Testing Requirements

- Backend coverage must prove:
  - support interventions are validated and stored in a structured, auditable format
  - support-only access is enforced and ops/unauthenticated callers cannot use support mutation routes
  - support-triggered lifecycle changes remain aligned with approved transition rules and public-status mapping
  - informational follow-up can be recorded without corrupting lifecycle or public status
- Frontend coverage must prove:
  - support can submit a valid intervention from the request detail screen and see refreshed follow-up context
  - invalid input or mutation failure produces actionable recovery copy without breaking the page
  - navigating between request routes clears stale form and mutation state
  - existing sign-out, back-navigation, and session-expiry handling still works

### UX / Interaction Guardrails

- Keep the intervention UI inside the existing support request detail screen and internal visual language. Reuse current utility classes in `apps/handrix-web/src/styles/globals.css` unless a small extension is clearly required.
- The form should be fast to scan and low-friction: short structured inputs, a clear primary action, and immediate confirmation that the follow-up was recorded.
- Make it explicit which content is internal-only support follow-up and which content is the customer-facing recovery/status view.
- Preserve the calm, trust-preserving tone already established in Stories 4.3 and 4.4. Support tooling should reinforce continuity, not read like a raw admin console.
- Do not rely on color alone for intervention state or success/error feedback.

### Previous Story Intelligence

- From Story 4.4:
  - `GET /support/requests/:publicId` is already the single support detail seam and now includes explanation/recovery context.
  - Story 4.4 explicitly said not to add write controls, transition suggestions, reassignment affordances, or support-note mutation there; those were deferred to Story 4.5.
  - The support detail screen already clears stale request detail on route changes. Preserve that behavior when adding form state and mutation success/error handling.
- From Story 4.3:
  - Support detail already exposes lifecycle state, history, customer context, assignment, and intervention summaries through one protected endpoint.
  - Reuse that existing support detail/read path for post-mutation refresh instead of building a separate “follow-up results” view.
- From Epic 3:
  - Operations already owns guarded assignment and lifecycle updates through validated backend flows. Support should reuse the same request-state-machine and public-status presentation rules instead of bypassing them.

### Git Intelligence Summary

- Recent commit titles are too coarse to drive implementation strategy, so the strongest continuity signals are the current repository seams:
  - `apps/handrix-api/src/modules/support/support.controller.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - `apps/handrix-api/src/modules/ops/ops.controller.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts`
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
- The safest implementation path is to mirror the repo’s existing protected-mutation and refreshed-detail pattern from ops while keeping support permissions narrower.

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/support/support.controller.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/src/modules/support/support.controller.spec.ts`
  - `apps/handrix-api/src/modules/support/support.service.spec.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.spec.ts`
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - `apps/handrix-api/test/app.e2e-spec.ts`
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts`
  - a new support mutation API helper beside the existing support API files
  - `apps/handrix-web/src/app/App.test.tsx`
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
  - a new support intervention schema file under `packages/shared-contracts/src/support/`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding a parallel support “notes app” or standalone follow-up screen
  - letting the support controller write directly to the store without service-layer rules
  - inventing a second lifecycle/public-status mapping path for support
  - giving support assignment powers or unrestricted ops-style status controls

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 4.5: Support Manual Intervention and Follow-Up]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 4: Equip Support for Trust Recovery and Request Intervention]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Proposed Monorepo Structure]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Internal User Flows]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/4-4-explain-delays-blocks-and-unavailable-outcomes-clearly.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/domain/request-state-machine.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/support/support-request-detail.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-request-detail.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a support intervention contract plus protected mutation route that returns refreshed support detail data.
- Extend request history storage with structured intervention detail and internal-only visibility so support follow-up stays auditable without leaking into customer tracking.
- Reuse the request state machine and public-status presenter for support-triggered lifecycle changes, keeping support permissions narrower than ops.
- Add a compact support follow-up form and readback card to the existing support detail screen, then verify the flow with backend, frontend, and e2e tests.

### Debug Log References

- 2026-04-21: Selected `4-5-support-manual-intervention-and-follow-up` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, project config, sprint status, Epic 4 story definitions, Story 4.4 artifact, and the relevant architecture, PRD, and UX guidance.
- 2026-04-21: Reviewed the live support, ops, request-store, state-machine, and support UI seams to anchor Story 4.5 on current implementation patterns rather than abstract planning docs alone.
- 2026-04-21: Marked Story 4.5 `in-progress` in `sprint-status.yaml` before implementation.
- 2026-04-21: Added shared support intervention schemas, a protected `POST /support/requests/:publicId/interventions` path, structured request-history follow-up detail, and internal-only visibility filtering for customer tracking.
- 2026-04-21: Updated the support request detail screen with a manual follow-up form, latest follow-up summary, visibility labeling, and stale-form reset behavior across route changes.
- 2026-04-21: Verified the story with `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts`.

### Completion Notes List

- Added support-scoped intervention contracts plus a protected support mutation endpoint that records internal-only follow-up or lifecycle-aligned intervention updates and returns refreshed request detail.
- Extended request history persistence with structured intervention detail and visibility metadata, then filtered internal-only entries out of customer tracking while keeping them visible to support and ops.
- Added a compact support follow-up form, latest follow-up summary, and visibility markers to the support detail screen without changing the existing support search/open/session flow.
- Added backend unit tests, frontend UI tests, a request-status presenter regression test, and e2e coverage for the new support follow-up path and customer-history isolation.

### File List

- _bmad-output/implementation-artifacts/4-5-support-manual-intervention-and-follow-up.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/requests/domain/request-state-machine.spec.ts
- apps/handrix-api/src/modules/requests/domain/request-state-machine.ts
- apps/handrix-api/src/modules/requests/request-status-timeline.presenter.spec.ts
- apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/support/support.controller.spec.ts
- apps/handrix-api/src/modules/support/support.controller.ts
- apps/handrix-api/src/modules/support/support.module.ts
- apps/handrix-api/src/modules/support/support.service.spec.ts
- apps/handrix-api/src/modules/support/support.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/support-request-view/support-intervention-api.ts
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/support/support-intervention.schemas.ts
- packages/shared-contracts/src/support/support-request-detail.schemas.ts

## Change Log

- 2026-04-21: Implemented Story 4.5 by adding protected support follow-up writes, structured internal visibility in request history, refreshed support detail read models, support-detail intervention UI, and regression/e2e coverage.
