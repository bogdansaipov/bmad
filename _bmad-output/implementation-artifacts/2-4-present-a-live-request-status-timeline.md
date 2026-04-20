# Story 2.4: Present a Live Request Status Timeline

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to see a glanceable timeline of request progress and next steps,
so that waiting feels active and understandable.

## Acceptance Criteria

1. Given a customer is viewing the request status screen, when the tracking interface loads, then the page displays a timeline or progress module showing the current public status and prior meaningful progress states, and each state includes clear labels with no color-only meaning.
2. Given the customer remains on the status screen, when the application refreshes status updates using polling, then the timeline updates without resetting the whole screen or causing visual instability, and background refresh behavior feels calm and non-technical.
3. Given a new status becomes available, when the tracking screen refreshes, then the customer can see what changed and what happens next, and the presentation remains optimized for fast scanning on mobile.

## Tasks / Subtasks

- [x] Extend the backend-owned tracking response so one request-status lookup can drive both the current summary and a customer-safe timeline (AC: 1, 3)
  - [x] Extend [request-status.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts) with a timeline entry schema and response fields for prior meaningful progress states, latest change context, and any customer-safe refresh metadata needed by the web app.
  - [x] Update [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) to shape the tracking response from backend-owned lifecycle history instead of asking the frontend to infer previous states from the current status alone.
  - [x] Keep the internal lifecycle model private: expose only customer-safe timeline labels, detail copy, timestamps, and next-step context even if the persisted history stores richer operational values.
- [x] Reuse and tighten the request-history seam instead of inventing a second timeline source of truth (AC: 1, 3)
  - [x] Build the timeline from the existing `history` array in [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts), filtering or collapsing entries so customers see only meaningful public-facing milestones.
  - [x] If the current store lacks a clean way to test or evolve history updates, add a small request-domain helper or store method for appending lifecycle/public-status history entries without implementing Epic 3 operations workflows early.
  - [x] Preserve the current `POST /requests/status-lookups` contract boundary in [requests.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts) rather than creating a second public polling endpoint for the same request status lookup behavior.
- [x] Add calm polling to the existing tracking feature without resetting the entire screen (AC: 2, 3)
  - [x] Update [request-tracking-api.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-api.ts) and [request-tracking-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx) so the current tracking view refreshes in place on an intentional interval.
  - [x] Avoid whole-screen loading flashes during background refreshes; preserve the current rendered timeline while a refresh is in flight and communicate refresh activity with calm, customer-safe microcopy if any loading hint is shown at all.
  - [x] Stop polling cleanly on unmount and avoid overlapping requests, stale updates, or retry storms if one refresh fails.
- [x] Redesign the tracking screen around a mobile-first progress timeline that extends the current status card instead of replacing the feature seam (AC: 1, 2, 3)
  - [x] Rework [request-tracking-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx) so it shows the current public status, prior milestones, latest change context, and what-happens-next messaging in a fast-scanning layout.
  - [x] Ensure every timeline state uses explicit labels, supporting copy, and timestamps where helpful, with no color-only meaning.
  - [x] Keep the post-confirmation visual language aligned with the Precision Dispatch direction already established in Epic 2, while preserving the existing calm recovery path for invalid tracking credentials from Story 2.3.
- [x] Make timeline updates understandable when something changes between polls (AC: 2, 3)
  - [x] Detect when the refreshed response introduces a new latest timeline state or a changed current status, and surface that change in a quiet, non-technical way that helps customers understand what changed.
  - [x] Keep the "what happens next" guidance synchronized with the latest backend-owned status presentation instead of leaving stale next-step text on screen after an update.
  - [x] Do not implement clarification, delay, or unavailable recovery-state branching beyond what Story 2.3 already supports; Story 2.5 will deepen those paths.
- [x] Add automated coverage for timeline shaping, polling behavior, and mobile-friendly rendering (AC: 1, 2, 3)
  - [x] Add backend tests in [requests.service.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.spec.ts) for customer-safe timeline shaping, meaningful history ordering, and latest-change response behavior.
  - [x] Update [requests.controller.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.spec.ts) and/or [app.e2e-spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/app.e2e-spec.ts) to verify the expanded status-lookup contract still returns the shared envelope and remains customer-safe.
  - [x] Add frontend tests in [App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) and/or feature-local tests for initial timeline render, in-place polling refresh, changed-status messaging, and stable recovery behavior on refresh failures.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 2.3 already established the secure anonymous tracking seam with `POST /requests/status-lookups`, a dedicated `request-tracking` frontend feature, same-device tracking persistence, and a calm invalid-token recovery state. Story 2.4 should extend that exact path instead of creating a parallel route, endpoint, or access model.
- The current tracking response only returns the latest public status summary plus `createdAt`, `updatedAt`, and `nextStepDetail`. That is enough for revisit, but not enough for a real timeline. This story should widen the shared contract deliberately so the backend can return meaningful history and change context in one response.
- The persisted request model in [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) already stores a `history` array containing `lifecycleState`, `publicStatus`, `createdAt`, and `note`. Reuse that foundation as the timeline source instead of inventing a second frontend-only timeline registry.
- Story 2.2 centralized customer-safe public-status presentation in the backend through `resolvePublicRequestStatusPresentation(...)`. Continue that pattern so timeline labels and explanatory copy remain backend-owned and shared-contract-backed.
- UX guidance for Epic 2 is explicit that post-confirmation experiences should feel more structured and progress-oriented than intake. The live timeline should therefore increase visible progress, but still feel calm, credible, and easy to scan on mobile.

### Technical Requirements

- Keep the request lifecycle/state-machine as the source of truth in the backend `requests` domain. The frontend may render timeline entries, but it must not infer lifecycle transitions or construct milestone labels independently.
- Extend the shared request-status contract in `packages/shared-contracts/src/requests/` rather than introducing feature-local TypeScript-only timeline shapes in the web app.
- Preserve the existing `POST /requests/status-lookups` lookup boundary for polling. Repeated polling should call the same status lookup seam with the saved `publicId` and signed tracking token.
- Shape customer-facing timeline entries from the persisted request history, but filter out operational noise so customers see only meaningful public progress states.
- Keep all response JSON `camelCase`, timestamps ISO 8601, and envelopes in the shared `{ data, meta? }` success format.
- Polling must be additive and stable: preserve the current screen while refreshing, prevent overlapping requests, and stop background work when the tracking screen unmounts.
- If the backend needs a tiny helper to append or normalize history entries for tests and future lifecycle changes, keep it inside `apps/handrix-api/src/modules/requests/` and do not build the Epic 3 operations update surface early.

### Architecture Compliance

- Keep customer-facing request APIs in `apps/handrix-api/src/modules/requests/`.
- Keep shared request-status/timeline contracts in `packages/shared-contracts/src/requests/`.
- Keep timeline UI and polling behavior in `apps/handrix-web/src/features/request-tracking/`, matching the architecture's journey-based feature structure.
- Follow the architecture rule that public status projection is backend-derived, shared contracts remain the cross-app source of truth, and frontend file names/routes stay `kebab-case`.
- Preserve the current feature-first structure in the web app. This story should deepen `request-tracking`, not trigger a broad app-shell rewrite.

### Library / Framework Requirements

- Continue using NestJS controller/service boundaries already present in the `requests` module.
- Continue using Zod schemas in `packages/shared-contracts` as the contract source for shared request-status and timeline types.
- Continue using the existing React `useEffect`-based tracking screen seam unless a very small helper abstraction materially improves polling clarity; no new state-management library is required for this story.
- Keep fetch-based API access through the existing `request-tracking-api.ts` client and current environment config patterns.
- No additional libraries are required unless a small test-only utility is already standard in the repo.

### File Structure Requirements

- Prefer extending existing files first:
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.controller.ts`
  - `packages/shared-contracts/src/requests/request-status.schemas.ts`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-api.ts`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx`
- If timeline formatting logic becomes non-trivial, add a small request-domain presenter/helper beside the existing request status presenter rather than embedding large transformation logic directly into controller or React component code.
- Do not create a second tracking feature folder or a separate polling-only endpoint. The current request-tracking seam should remain the single customer-facing progress surface.

### Testing Requirements

- Add backend coverage for:
  - timeline entry shaping from persisted history
  - filtering/collapsing of non-meaningful history into customer-safe milestones
  - stable ordering of current and prior timeline states
  - latest-change detection or refresh metadata if added to the contract
- Add frontend coverage for:
  - initial timeline render using the expanded tracking payload
  - polling-driven refresh that updates content in place without returning to a loading-only shell
  - clear changed-status messaging and refreshed next-step guidance
  - preserved invalid-token and generic-failure recovery behavior during or after refresh attempts
- Keep tests near the existing seams unless the `request-tracking` feature now justifies one focused feature-local test file.

### UX / Interaction Guardrails

- The timeline should make waiting feel active, understandable, and trustworthy rather than vague or overly technical.
- Use labels, supporting copy, timestamps, and hierarchy together; never rely on color alone to show state progression.
- Keep the interface optimized for mobile scanning with strong spacing, readable grouping, and a clear current-state emphasis.
- Background refresh should feel calm. Avoid developer-style status text such as "polling", "syncing", "fetching", or flashing full-screen loaders on every interval.
- Preserve the Warm Utility to Precision Dispatch transition established in Epic 2: the tracking screen should feel more structured than intake, but still human and reassuring.
- Do not absorb Story 2.5 recovery-state depth or Story 2.6 archive/history scope into this story.

### Implementation Notes

- A low-risk backend path is:
  - extend the request-status shared schema with a timeline entry collection
  - add a small backend formatter/presenter that turns request history into customer-safe timeline items
  - return the expanded payload from the existing `getRequestStatus(...)` flow
  - add only the smallest history helper needed for tests or future lifecycle updates
- A low-risk frontend path is:
  - keep the current tracking route/view entry in `App.tsx`
  - extend `RequestTrackingScreen` to render the timeline beneath the current status summary
  - add interval-based refresh inside the existing effect seam
  - preserve the previous good payload on screen while refreshes happen in the background
- The current repo does not yet contain real operations workflows that advance requests through multiple live states. If tests need richer status evolution, use a controlled backend/store seam to append history entries rather than faking frontend-only transitions.

### Previous Story Learnings

- Story 2.3 proved the secure anonymous lookup flow and gave the product a dedicated `request-tracking` feature seam. That work should be extended, not restructured.
- Story 2.3 also established the important trust pattern that invalid tracking credentials produce a calm, non-leaky recovery state. Polling behavior must preserve that same customer-safe boundary.
- Story 2.2 established that public status copy is backend-owned and shared-contract-backed. Reuse that pattern for each timeline milestone so confirmation, revisit, and live progress all speak with one status vocabulary.
- The live codebase is more informative than git history here: commit history is sparse, but the existing tracking feature, shared contracts, and persisted request history already show the correct extension path.

### Git Intelligence Summary

- Recent visible git history is still minimal (`feat: completeled epic 1`, `first commit`), so commit messages provide little additional implementation guidance.
- The current repository state is much more valuable: Story 2.3 already introduced the exact request-tracking seams this story should extend for timeline rendering and polling.

### Project Structure Notes

- Current seams that this story should extend:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - `apps/handrix-web/src/features/request-tracking/`
  - `apps/handrix-web/src/app/App.tsx`
- There is no `project-context.md` file in the repository, so the planning artifacts and the current codebase remain the authoritative context.
- The main structural risks are duplicating status logic in React, adding a second status-lookup API path just for polling, and building a timeline UI that future recovery/history stories will need to undo.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.4: Present a Live Request Status Timeline]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Transferable UX Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Implementation Approach]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Customer Journey: Guided Request to Confirmed Dispatch]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-2-define-and-expose-customer-safe-request-statuses.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-3-let-customers-revisit-and-track-their-request.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-api.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 2.4 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Analyzed Epic 2, architecture naming/structure rules, UX progress-visibility guidance, Story 2.2 and Story 2.3 artifacts, and the live request-tracking backend/frontend seams.
- 2026-04-20: No additional web research was required because this story is constrained by the repository's current architecture, shared contracts, and existing tracking implementation.
- 2026-04-20: Expanded the shared request-status contract with timeline entries and latest-change copy, then added a backend timeline presenter plus a small request-history append seam for future-safe status evolution and tests.
- 2026-04-20: Reworked the request-tracking screen to render a mobile-friendly timeline and poll in place without full-screen refresh flashes, while keeping invalid-token recovery behavior intact.
- 2026-04-20: Verified the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story scope is explicitly limited to customer-safe timeline rendering and calm polling on top of the existing anonymous tracking flow.
- Captured the main extension path: reuse persisted request history and the existing `POST /requests/status-lookups` boundary instead of creating new customer-facing lifecycle sources.
- Expanded the request-status contract and backend shaping so tracking responses now include timeline milestones, latest-change copy, and stable updated timestamps derived from meaningful history.
- Added a small backend request-history append seam to support safe status progression in tests and future lifecycle work without building Epic 3 operations surfaces early.
- Reworked the tracking UI into a live progress surface with quiet polling, in-place refreshes, change announcements, and timeline cards optimized for fast mobile scanning.
- Validated the workspace successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/2-4-present-a-live-request-status-timeline.md
- apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/requests/request-status.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-20: Implemented Story 2.4 by expanding the shared request-status contract with timeline entries and latest-change copy, adding backend timeline shaping plus a request-history append seam, and upgrading the tracking UI to poll and render live progress without screen resets.
