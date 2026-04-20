# Story 2.5: Handle Clarification, Delay, and Unavailable Recovery States

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want honest recovery states when fulfillment changes,
so that I stay informed and know the next best action instead of feeling abandoned.

## Acceptance Criteria

1. Given a request needs clarification, is delayed, or cannot be fulfilled, when the customer views the request flow or tracking screen, then the interface shows a dedicated recovery state with a clear explanation of what changed, and the message includes a next-best action or expectation update.
2. Given the request falls outside current service scope or operating availability, when the customer reaches a recovery state, then the product provides fallback guidance or alternative next steps rather than a dead-end failure, and the tone remains honest, calm, and trust-preserving.
3. Given recovery messaging is shown, when the state is rendered across customer-facing surfaces, then the copy stays consistent with the backend public status model and prior expectation-setting, and the customer can distinguish between clarification-needed, delayed, and unavailable outcomes.

## Tasks / Subtasks

- [x] Expand the backend-owned customer-safe status model so clarification, delay, and unavailable recovery states are first-class and distinct (AC: 1, 2, 3)
  - [x] Extend [request-status.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts) with any new public recovery status value and response fields needed for dedicated recovery-state rendering, such as a recovery variant, action label, fallback guidance, or expectation-update copy.
  - [x] Update [request-status.presenter.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status.presenter.ts) so each customer-facing recovery outcome has backend-owned labels and explanatory detail, including a distinct delayed presentation rather than overloading `dispatching`, `needsClarification`, or `unavailable`.
  - [x] Preserve the architecture rule that lifecycle truth stays internal while public recovery messaging remains customer-safe and shared-contract-backed.
- [x] Introduce a small backend recovery-state presenter seam instead of hard-coding exception copy in the web app (AC: 1, 2, 3)
  - [x] Add or extend a focused presenter/helper in `apps/handrix-api/src/modules/requests/` to derive recovery-state explanation, expectation update, next-best action, and optional fallback path from persisted request state.
  - [x] Reuse the existing timeline response path in [request-status-timeline.presenter.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts) and [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) so one lookup can drive both the current summary and a dedicated recovery-state card.
  - [x] Keep `POST /requests/status-lookups` in [requests.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts) as the single customer-facing lookup seam instead of introducing separate endpoints for delayed or unavailable paths.
- [x] Make persisted request history capable of expressing meaningful recovery transitions without prematurely building Epic 3 tooling (AC: 1, 3)
  - [x] Extend [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) only as needed so test fixtures and future lifecycle changes can append recovery-oriented history entries with clear notes and timestamps.
  - [x] If the current lifecycle enum is too coarse to represent a delay separately from `dispatch_in_progress` or `unfulfilled`, add the minimum lifecycle/state distinction needed to support a truthful delayed customer state without leaking operational noise.
  - [x] Avoid implementing operations assignment flows, support interventions, or broad durable-history work reserved for Stories 2.6, 3.x, and 4.x.
- [x] Redesign the tracking UI to show a reusable recovery state card when fulfillment needs clarification, has been delayed, or is unavailable (AC: 1, 2, 3)
  - [x] Update [request-tracking-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx) so recovery outcomes render as a dedicated module with a strong heading, explanation, next-best action, and optional fallback/support guidance.
  - [x] Keep the live timeline context visible where helpful, but clearly emphasize the active recovery state so customers understand what changed and what they should do next.
  - [x] Ensure recovery states remain mobile-first, readable, and explicit, with no color-only meaning and no raw backend or HTTP-style error language.
- [x] Keep recovery-state behavior consistent across confirmation handoff, revisit tracking, and future refreshes (AC: 1, 2, 3)
  - [x] Review [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx), [App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx), and [request-tracking-storage.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-storage.ts) to ensure a request that later enters a recovery state still reopens cleanly using the same saved tracking identity.
  - [x] Make sure background refresh messaging remains calm when a request moves into a recovery state, and that customers can distinguish a real request delay from a temporary status-refresh failure.
  - [x] Preserve the invalid-token recovery path from Story 2.3 as a separate concern from valid request recovery states.
- [x] Add automated coverage for backend status shaping and frontend recovery-state rendering (AC: 1, 2, 3)
  - [x] Extend [requests.service.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.spec.ts) with cases for clarification-needed, delayed, and unavailable tracking responses, including distinct next-step and fallback messaging.
  - [x] Update [requests.controller.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.spec.ts) and/or [app.e2e-spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/app.e2e-spec.ts) to verify the shared envelope remains customer-safe for recovery states.
  - [x] Add frontend tests in [App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) and/or a focused `request-tracking` test file for dedicated recovery-card rendering, calm refresh-state behavior, and fallback guidance presentation.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 2.3 established the secure anonymous lookup seam and a calm invalid-credential recovery state. Story 2.5 must not blur those two concerns together: invalid tracking credentials are access failures, while clarification, delay, and unavailable are valid request outcomes.
- Story 2.4 widened the shared tracking response so one status lookup can drive both the current summary and timeline. Story 2.5 should extend that same response with recovery-state semantics instead of inventing a parallel response shape.
- The current public status model already includes `needsClarification` and `unavailable`, but it does not yet provide a distinct delayed customer-safe status or a dedicated recovery-card payload. That gap is the central modeling task in this story.
- The current tracking screen already has a live progress card, timeline, and "what happens next" section. This story should deepen that screen with a reusable recovery-state card rather than replacing the timeline feature added in Story 2.4.
- Recovery messaging must remain backend-owned. The frontend should render the state, not decide on its own when a request is delayed versus unavailable or write ad hoc explanatory copy that can drift from the API.

### Technical Requirements

- Keep the request lifecycle model and persisted history as the backend source of truth.
- Preserve the internal/public split: lifecycle values can evolve to support delay handling, but customer responses must remain limited to public status plus customer-safe recovery messaging.
- Extend the shared request-status contract in `packages/shared-contracts/src/requests/` rather than creating web-only recovery models.
- Keep response JSON `camelCase`, timestamps ISO 8601, and success envelopes in the shared `{ data, meta? }` format.
- Distinguish valid request recovery states from transport or authorization problems:
  - Clarification, delayed, and unavailable are part of the normal tracked-request response.
  - Invalid token, malformed input, or temporary backend outage remain error-envelope paths.
- Reuse the current `history` array and status-lookup seam so recovery rendering stays compatible with Story 2.6 durable-history work and later internal tools.

### Architecture Compliance

- Keep customer-facing request APIs in `apps/handrix-api/src/modules/requests/`.
- Keep shared request-status and recovery contracts in `packages/shared-contracts/src/requests/`.
- Keep tracking and recovery UI in `apps/handrix-web/src/features/request-tracking/`, following the architecture's journey-based feature structure.
- Follow the architecture rule that public status projection is backend-derived and consistent across intake confirmation, revisit tracking, support visibility, and future operations flows.
- Preserve Epic 2 boundaries: this story is about customer-visible recovery states, not internal operations dashboards or support tooling.

### Library / Framework Requirements

- Continue using NestJS controller/service boundaries in the existing `requests` module.
- Continue using Zod schemas in `packages/shared-contracts` as the source of truth for request-status and recovery response types.
- Continue using the current fetch-based tracking API client in [request-tracking-api.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-api.ts).
- Continue using the current React state/effect seam in `request-tracking-screen.tsx` unless a very small helper improves clarity; no new state-management or UI library is required.
- No new dependencies are needed unless a small test-only helper is already standard in the repo.

### File Structure Requirements

- Prefer extending existing files first:
  - `packages/shared-contracts/src/requests/request-status.schemas.ts`
  - `packages/shared-contracts/src/requests/request.types.ts`
  - `apps/handrix-api/src/modules/requests/request-status.presenter.ts`
  - `apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-api.ts`
- If recovery-state shaping becomes non-trivial, add one small presenter/helper beside the current request-status presenters rather than scattering logic across controller and component files.
- Do not create a second tracking feature folder or a special recovery-only endpoint.

### Testing Requirements

- Add backend coverage for:
  - distinct clarification-needed, delayed, and unavailable customer-safe status shaping
  - timeline plus recovery-card payload compatibility in one response
  - fallback guidance or next-best-action messaging for unavailable and clarification states
  - preserving customer-safe envelopes while avoiding lifecycle leaks
- Add frontend coverage for:
  - rendering a dedicated recovery card for each supported recovery outcome
  - preserving the current timeline and request summary context where appropriate
  - differentiating request recovery states from invalid-token and generic refresh-failure states
  - calm in-place refresh behavior when a normal tracked request transitions into recovery

### UX / Interaction Guardrails

- Recovery states should feel honest, calm, and clearly actionable rather than apologetic but vague.
- Every recovery state should explain:
  - what changed
  - what it means for the customer
  - what the next best action or expectation is
- Customers must be able to distinguish between:
  - clarification needed
  - delayed
  - unavailable
- Provide fallback guidance for unavailable or out-of-scope outcomes so the screen never feels like a dead end.
- Keep the presentation optimized for mobile scanning with strong heading hierarchy and explicit copy, never color-only meaning.
- Preserve the "Warm Utility" to "Precision Dispatch" tone shift already established in Epic 2.

### Implementation Notes

- A low-risk backend path is:
  - extend the public status contract to represent delayed recovery explicitly
  - add a small recovery-state presenter that derives explanation and next-step copy from persisted request state/history
  - keep `buildRequestStatusResponse(...)` as the single response assembly path
  - use `appendHistoryEntry(...)` in tests to model clarification, delay, and unavailable transitions
- A low-risk frontend path is:
  - keep the current tracking route and polling behavior
  - add a dedicated recovery-state card above or alongside the timeline and next-step sections
  - preserve existing screen content while clearly emphasizing the active recovery outcome
  - keep invalid-token handling and background refresh failure messaging separate from valid tracked-request recovery states
- The likely modeling trap is treating "delayed" as just another wording tweak on `dispatching`. If customers need to understand that expectations changed, delay should be represented explicitly in the backend-owned public status/recovery model.

### Previous Story Learnings

- Story 2.3 proved the request-tracking seam, same-device tracking persistence, and calm access-failure recovery behavior.
- Story 2.4 proved the status-lookup response can support both a summary and meaningful timeline without introducing a second polling endpoint.
- The current timeline presenter already filters repeated public statuses and uses backend-owned status presentation. Reuse that pattern for recovery-state rendering so status vocabulary stays consistent.
- The live codebase is more useful than git history here: commit history is sparse, but the tracking screen, shared contracts, and request presenters show the correct extension path clearly.

### Git Intelligence Summary

- Recent visible git history is still minimal (`feat: completeled epic 1`, `first commit`), so commit titles add little implementation guidance.
- The current repository structure and existing Epic 2 seams are the authoritative source for this story.

### Project Structure Notes

- Current seams that this story should extend:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - `apps/handrix-web/src/features/request-tracking/`
  - `apps/handrix-web/src/app/App.tsx`
- There is no `project-context.md` file in the repository, so the planning artifacts and current code remain the authoritative context.
- The main structural risks are duplicating backend status logic in React, collapsing delayed and unavailable into one vague state, and conflating valid request recovery outcomes with lookup/authentication failures.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.5: Handle Clarification, Delay, and Unavailable Recovery States]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Technical Constraints & Dependencies]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Request Status Timeline]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Request Recovery State Card]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-3-let-customers-revisit-and-track-their-request.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-4-present-a-live-request-status-timeline.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-api.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 2.5 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Analyzed Epic 2, PRD and architecture constraints around customer-safe lifecycle projection, and UX guidance for the Request Recovery State Card.
- 2026-04-20: Reviewed Story 2.3 and Story 2.4 artifacts plus the live `requests` module, shared contracts, and `request-tracking` frontend seam to ground this story in the current implementation.
- 2026-04-20: No additional web research was required because this story is constrained by the repository's existing architecture, current code seams, and already-selected stack.
- 2026-04-20: Marked Story 2.5 in progress in `_bmad-output/implementation-artifacts/sprint-status.yaml` before implementation.
- 2026-04-20: Added a distinct delayed customer-safe status and backend-owned `recoveryState` payload in the shared request-status contract, plus a dedicated backend recovery presenter.
- 2026-04-20: Extended tracked-request lifecycle modeling with `dispatch_delayed` and wired the status timeline response so one lookup now drives summary, timeline, and dedicated recovery-card content.
- 2026-04-20: Updated the `request-tracking` screen and styles to render dedicated clarification, delay, and unavailable recovery cards while preserving calm invalid-token handling and in-place refresh behavior.
- 2026-04-20: Verified the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story scope is explicitly limited to customer-visible recovery-state modeling and rendering on top of the existing anonymous tracking/timeline flow.
- Captured the central modeling gap: the current public status system supports clarification and unavailable, but not a distinct delayed recovery state or dedicated recovery-card payload.
- Preserved Epic 2 boundaries by keeping operations tooling, support actions, and durable-history expansion out of this story.
- Added `delayed` as a first-class public request status plus `dispatch_delayed` as the minimum lifecycle extension needed to express honest timing changes without overloading `dispatching`.
- Added a backend-owned `recoveryState` response payload so the frontend renders clarification, delay, and unavailable states without inventing its own status semantics or copy.
- Extended the tracking UI to show a dedicated recovery card, calm recovery-aware refresh announcements, and a separate next-best-action treatment while preserving the existing timeline and invalid-token recovery path.
- Added backend, controller, e2e, presenter, and app-level coverage for delayed, clarification, and unavailable tracked-request states.
- Confirmed the full workspace passes `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/2-5-handle-clarification-delay-and-unavailable-recovery-states.md
- apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts
- apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts
- apps/handrix-api/src/modules/requests/request-status.presenter.spec.ts
- apps/handrix-api/src/modules/requests/request-status.presenter.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/health/health.schemas.ts
- packages/shared-contracts/src/requests/request-status.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-20: Created Story 2.5 implementation artifact with acceptance criteria, implementation guardrails, architecture context, previous-story learnings, and test expectations.
- 2026-04-20: Implemented Story 2.5 by adding a delayed tracked-request state, backend-owned recovery-state payloads, recovery-aware tracking UI, and regression coverage across shared contracts, backend, and frontend.
