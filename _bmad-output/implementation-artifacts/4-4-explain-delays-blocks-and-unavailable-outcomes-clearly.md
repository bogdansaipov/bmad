# Story 4.4: Explain Delays, Blocks, and Unavailable Outcomes Clearly

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support agent,
I want the system to surface why a request is delayed, blocked, or unfulfilled,
so that I can give the customer a consistent and credible explanation.

## Acceptance Criteria

1. Given a request is in a delayed, clarification-needed, blocked, or unavailable state, when support opens the request, then the workspace surfaces the reason or recovery context behind that state, and the explanation is understandable enough for support to translate into customer-facing reassurance.
2. Given the request has a customer-visible recovery status, when support references the current situation, then the support context aligns with the same public-status model used in the customer experience, and the agent can distinguish between different failure or delay scenarios.
3. Given a request cannot be fulfilled as originally expected, when support responds to the customer, then the platform provides the context needed to communicate the next best action, and support does not need to infer or invent explanations from incomplete system data.

## Tasks / Subtasks

- [x] Add a support-scoped explanation model on top of the existing request-detail seam instead of creating a separate explanation endpoint or support-only copy layer (AC: 1, 2, 3)
  - [x] Keep `GET /support/requests/:publicId` in `apps/handrix-api/src/modules/support/support.controller.ts` as the single support detail endpoint. Do not add `/support/explanations`, `/support/recovery`, or a parallel support detail route.
  - [x] Extend `packages/shared-contracts/src/support/support-request-detail.schemas.ts` so explanation and recovery data rides on the current support detail response envelope from Stories 4.2 and 4.3.
  - [x] Keep the route protected by `@UseGuards(InternalAuthGuard, InternalRolesGuard)` and `@InternalRoles('support')`. Explanation visibility remains support-only.

- [x] Reuse the existing customer-safe recovery vocabulary and backend-owned presentation logic rather than inventing a second explanation system for support (AC: 1, 2)
  - [x] Reuse `requestRecoveryStateSchema` and the same public-status semantics already established in `packages/shared-contracts/src/requests/request-status.schemas.ts`.
  - [x] Reuse or adapt backend-owned recovery derivation from `apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts` so clarification, delay, and unavailable explanations stay aligned with the customer experience.
  - [x] If support needs richer explanation detail than the customer sees, add a support-owned wrapper shape that references the same underlying recovery kind/status model rather than duplicating literal copy or branching logic in the frontend.
  - [x] Preserve the internal/public split: support may see both internal lifecycle context and customer-safe recovery wording, but must not derive customer messaging from raw lifecycle enums alone.

- [x] Expand `SupportService.getRequestDetail()` so blocked or recovery-state requests expose actionable explanation context from the persisted request record and approved presenters (AC: 1, 2, 3)
  - [x] Keep `RequestStoreService.getByPublicId()` as the read seam and derive explanation data from persisted `history`, `customerSnapshot.recoveryState`, `assignment`, `classification`, and any existing intervention metadata.
  - [x] Add support-ready explanation fields such as current recovery summary, cause/reason detail, expectation update, next-best action, fallback guidance when present, and the most relevant transition/note that explains why the request entered the state.
  - [x] Differentiate at minimum between clarification-needed, dispatch-delayed, blocker/intervention, and unavailable outcomes so support does not receive one generic “problem state.”
  - [x] Do not expose write controls, transition suggestions, reassignment affordances, or a support-note mutation path in this story. Those belong to Story 4.5.

- [x] Update the support detail UI to make explanation and recovery context easy to scan and safe to reuse in customer replies (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx` instead of creating a new screen.
  - [x] Add a prominent explanation/recovery section that shows what changed, why it matters, what the customer has already been told, and the next best action or fallback path.
  - [x] Keep explanation content aligned with the existing customer recovery card language in `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx`, while presenting any support-only context as clearly separate internal guidance.
  - [x] Render explicit distinctions between clarification, delay, blocker, and unavailable scenarios with text labels and supporting detail, not color alone.
  - [x] Clear stale request detail when navigating between support requests so one customer’s explanation context cannot remain visible under another request URL during loading.

- [x] Close the fidelity gaps left by Story 4.3 so support can explain from complete context instead of partial snapshots (AC: 1, 2, 3)
  - [x] Render the transition data already present in support history entries, including lifecycle/public-status changes that explain how the request reached its current state.
  - [x] Surface the substantial customer-visible recovery and review content support needs for accurate reassurance, including request-review sections and confirmation messaging where relevant.
  - [x] Prefer stored customer snapshots and backend-provided presentation over newly composed browser copy.

- [x] Add automated coverage for explanation fidelity, scenario differentiation, and navigation safety (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/support/support.service.spec.ts` and `support.controller.spec.ts` to cover clarification, delay, blocker, and unavailable explanation payloads plus support-role isolation.
  - [x] Extend `apps/handrix-api/test/app.e2e-spec.ts` so support can still load the expanded detail response while ops stays forbidden and unauthenticated access still fails safely.
  - [x] Extend `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx` to cover explanation rendering, scenario-specific copy/labels, transition visibility, and stale-detail clearing while navigating between requests.
  - [x] Update `apps/handrix-web/src/app/App.test.tsx` if route-level support navigation or session-expiry handling assertions need to change.
  - [x] Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 4.3 established the support detail seam and surfaced most of the raw context support needs. Story 4.4 should deepen explanation fidelity inside that same route/screen instead of building a parallel support flow.
- Epic 2 already defined the customer-safe explanation model. Story 2.5 introduced the backend-owned recovery vocabulary and the customer recovery card; Story 2.6 ensured that recovery snapshots and public-status history are persisted. Reuse those decisions here so support explanations stay aligned with what the customer actually saw.
- The support detail response already carries `customerSnapshot.recoveryState`, transition history, and intervention summaries. The main work here is presentation design and backend projection discipline, not inventing new request-state sources.
- Support needs enough context to explain the situation credibly, but this story is still read-only. Do not let explanation work slide into intervention recording, note entry, reassignment, or status mutation.

### Architecture Compliance

- `architecture.md` requires lifecycle consistency across customer, ops, and support surfaces. Keep status/recovery interpretation backend-owned and avoid frontend-only meaning derived from raw enums.
- Keep support work inside `apps/handrix-api/src/modules/support/` and `apps/handrix-web/src/features/support-request-view/`.
- Shared Zod contracts remain the backend/frontend boundary. Extend support contracts in `packages/shared-contracts/src/support/`, while reusing neutral request-status primitives from `packages/shared-contracts/src/requests/` where appropriate.
- Support still reads the same underlying request history through support-scoped APIs. Do not bypass `RequestStoreService` or read persistence directly from controllers or the client.

### Library / Framework Requirements

- No new runtime dependencies are needed.
- Keep the current stack and repo patterns:
  - NestJS 11 controllers/services/guards for internal support APIs.
  - Zod 4 shared contracts in `@handrix/shared-contracts`.
  - React 19 + Vite for the support UI.
  - Jest + Supertest for backend specs/e2e, Vitest + Testing Library for frontend tests.
- Continue using the existing support auth/session handling and shared API envelope helpers from Stories 4.1 and 4.2.

### Testing Requirements

- Backend coverage must prove:
  - support detail responses differentiate clarification, delay, blocker, and unavailable explanation scenarios
  - explanation fields remain aligned with persisted public-status/recovery snapshots and backend-owned recovery presenters
  - support receives enough next-step and fallback context without exposing write metadata or sensitive internals
  - 401 / 403 / 404 behavior from earlier support stories remains unchanged
- Frontend coverage must prove:
  - the support detail screen renders an explanation/recovery section that distinguishes the supported scenarios clearly
  - history transitions and customer-visible recovery/review context remain visible enough to back up the explanation
  - navigating directly from one request detail route to another does not leave stale prior-request context on screen during loading
  - existing session verification, sign-out, and back-navigation behavior continues to work

### UX / Interaction Guardrails

- Follow the existing internal visual language already used by support and ops surfaces. Reuse the current utility classes in `apps/handrix-web/src/styles/globals.css` unless a small extension is clearly required.
- The explanation section should mirror the trust-preserving structure of the customer recovery card: problem statement, explanation, expectation update, next-best action, and optional fallback path.
- Make it explicit what is customer-facing versus support-only context. Support should be able to reuse the wording confidently without confusing internal operational notes for customer copy.
- Clarification-needed, delayed, blocker, and unavailable outcomes must read as distinct scenarios. Avoid vague generic language like “there was an issue.”
- Status and recovery information must be explicit in text, not dependent on color or iconography.

### Previous Story Intelligence

- From Story 4.3:
  - The support detail route/screen already exposes lifecycle state, history, customer context, assignment, and intervention data through one support-scoped endpoint. Reuse that seam.
  - Story 4.3 intentionally stopped short of explanation-specific support guidance, reserving richer explanation work for Story 4.4.
  - The current implementation leaves three useful carry-forward improvements for this story:
    - clear stale request detail on route-to-route navigation before refetching
    - render history transition fields instead of hiding them
    - surface fuller customer-visible snapshots, including request-review sections and confirmation messaging, where they support accurate explanations
- From Stories 2.5 and 2.6:
  - Recovery-state wording and structure are already backend-owned and persisted in request history/customer snapshots.
  - The customer experience already distinguishes clarification, delay, and unavailable recovery states. Support should consume that same model rather than reinterpret it.
- From Story 3.6:
  - Ops already works with intervention/blocker context. Support can reuse the same underlying persisted state, but without inheriting ops mutation controls.

### Git Intelligence Summary

- Recent commit messages remain too coarse to change implementation direction, so the strongest continuity signals are the live seams already in the repo:
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
  - `apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx`
- The key implementation opportunity is alignment: reuse the existing recovery presenter and persisted customer snapshots so support explanation stays credible and low-drift.

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/support/support.controller.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/src/modules/support/support.controller.spec.ts`
  - `apps/handrix-api/src/modules/support/support.service.spec.ts`
  - `apps/handrix-api/test/app.e2e-spec.ts`
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx`
  - `apps/handrix-web/src/app/App.test.tsx`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx` only as a visual/content-alignment reference, not as a place to move support logic
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
  - `packages/shared-contracts/src/requests/request-status.schemas.ts` if a neutral primitive truly needs extension
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding a second support detail or explanation endpoint
  - duplicating customer recovery wording in support-only frontend helpers
  - deriving explanation state in React from raw lifecycle enums without backend presentation support
  - sneaking Story 4.5 intervention writes into this read-only explanation story

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 4: Equip Support for Trust Recovery and Request Intervention]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 4.4: Explain Delays, Blocks, and Unavailable Outcomes Clearly]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.5: Handle Clarification, Delay, and Unavailable Recovery States]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Request Recovery State Card]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/4-3-show-support-the-full-request-context.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-5-handle-clarification-delay-and-unavailable-recovery-states.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-6-preserve-customer-visible-request-history.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/support/support-request-detail.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Extend the support detail contract with backend-owned explanation and transition-label fields instead of adding a second support endpoint.
- Project explanation, recovery alignment, and labeled transitions from persisted request history plus the existing recovery/public-status presenters in `SupportService`.
- Update the support detail screen to render a scan-friendly explanation card, fuller customer-visible snapshots, and navigation-safe loading behavior.
- Prove the behavior with support service/controller/frontend regression coverage, then run the full validation suite before marking the story ready for review.

### Debug Log References

- 2026-04-21: Selected `4-4-explain-delays-blocks-and-unavailable-outcomes-clearly` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, project config, sprint status, Epic 4 story definitions, Story 4.3 artifact, architecture guidance, and UX recovery-card guidance.
- 2026-04-21: Reviewed the live support detail contract, support service, support detail screen, request recovery schema, and request-status recovery presenter to anchor this story on the current implementation seams.
- 2026-04-21: Folded forward the most important Story 4.3 review learnings so Story 4.4 explicitly closes explanation-fidelity and stale-navigation gaps while staying read-only.
- 2026-04-21: Marked Story 4.4 `in-progress` in the story artifact and sprint tracker before implementation.
- 2026-04-21: Wrote failing support service, screen, controller, and app/e2e expectations for explanation payloads, labeled transitions, richer customer snapshots, and stale-detail clearing during support-route navigation.
- 2026-04-21: Expanded the shared support detail schema, `SupportService` projection, and support detail UI to expose backend-owned explanation context aligned with persisted recovery snapshots and public-status presentation.
- 2026-04-21: Updated support frontend rendering to show explicit recovery/explanation guidance, fuller customer-visible review/confirmation content, and ordered lifecycle/public-status transitions without stale prior-request bleed.
- 2026-04-21: Validated the story with `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts`.

### Completion Notes List

- Added a support-scoped `explanation` payload plus labeled lifecycle/public-status transitions to the existing support detail contract and kept `GET /support/requests/:publicId` as the single protected support-detail seam.
- Reused persisted recovery snapshots and backend-owned status presentation so support explanation stays aligned with the same clarification, delay, and unavailable vocabulary customers already see.
- Updated the support detail screen to render a prominent explanation/recovery section, richer customer-visible review/confirmation context, explicit transition history, and loading behavior that clears stale request data during route-to-route navigation.
- Extended backend, frontend, app, and e2e coverage for clarification, blocker/delay, and unavailable scenarios, then passed `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts`.

### File List

- _bmad-output/implementation-artifacts/4-4-explain-delays-blocks-and-unavailable-outcomes-clearly.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/support/support.controller.spec.ts
- apps/handrix-api/src/modules/support/support.service.spec.ts
- apps/handrix-api/src/modules/support/support.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx
- packages/shared-contracts/src/support/support-request-detail.schemas.ts

## Change Log

- 2026-04-21: Created Story 4.4 implementation artifact with acceptance criteria, implementation guardrails, architecture/UX context, previous-story learnings, and testing expectations.
- 2026-04-21: Implemented Story 4.4 by adding backend-owned support explanation context, richer customer snapshot rendering, labeled request transitions, navigation-safe detail loading, and regression coverage across shared contracts, backend, frontend, and e2e tests.
