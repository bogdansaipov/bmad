# Story 1.5: Review ETA, Pricing Expectations, and Request Summary

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to review my issue details, price expectations, response window, and next steps,
so that I can make an informed decision before confirming service.

## Acceptance Criteria

1. When the customer reaches the review step after completing issue selection, clarifying answers, location entry, and containment guidance, the system shows a concise summary of the request details so the customer can verify what will be submitted.
2. The pre-confirmation review screen displays believable ETA guidance, pricing information or pricing ranges, and what-happens-next messaging in a format optimized for quick scanning and trust-building clarity.
3. When the customer notices incorrect information before submission, they can return to the relevant prior step without losing unrelated progress, and the review screen reflects their updated inputs before confirmation.

## Tasks / Subtasks

- [x] Add shared contracts for request-review data in `packages/shared-contracts/src/requests/` (AC: 1, 2, 3)
  - [x] Define Zod schemas and exported TypeScript types for the review payload, including summarized intake details, ETA expectation content, pricing expectation content, what-happens-next messaging, and edit targets for revisiting earlier steps.
  - [x] Keep JSON field names in `camelCase` and continue using the shared `{ data, meta? }` success envelope conventions already established across the SPA and API.
  - [x] Keep the review model focused on pre-confirmation expectations only; do not prematurely couple it to final persisted request IDs, tracking tokens, or post-confirmation lifecycle states from Story 1.6 and Epic 2.
- [x] Add backend review-summary support in `apps/handrix-api/src/modules/requests/` and, where expectation source data belongs there, `apps/handrix-api/src/modules/reference-data/` (AC: 1, 2)
  - [x] Expose a customer-safe API surface that can turn the already-captured intake details into a pre-confirmation summary without inventing frontend-only expectation logic.
  - [x] Keep `requests` responsible for assembling the request-review summary from intake inputs and classification context, while `reference-data` remains the source of structured expectation/config data if static ETA or pricing ranges are needed for MVP credibility.
  - [x] Return believable ranges and transparent qualifiers rather than hard promises, especially because real dispatch assignment and persistence are not implemented yet.
- [x] Implement a dedicated request-review feature seam in the web app at `apps/handrix-web/src/features/request-review/` (AC: 1, 2, 3)
  - [x] Introduce feature-local API logic and a product-specific review UI instead of extending `issue-intake-screen.tsx` into another large catch-all component.
  - [x] Replace the current containment-step continue behavior with a real handoff into request review while preserving the guided mobile-first flow and existing calm visual language.
  - [x] Show one dominant primary action for the later confirmation step, while keeping edit actions secondary and clearly scoped to the relevant prior input area.
- [x] Support targeted editing and state continuity across the intake-to-review journey (AC: 3)
  - [x] Allow the customer to jump back to the most relevant earlier step, such as issue answers, service location, or containment handoff context, without clearing unrelated answers.
  - [x] Ensure the review screen rehydrates from the latest in-memory flow data after edits so the customer sees updated details before confirmation.
  - [x] Avoid introducing a new global store unless it is genuinely necessary; keep local flow state aligned with the architecture guidance that separates UI state from backend-owned business state.
- [x] Add automated coverage for the request-review slice (AC: 1, 2, 3)
  - [x] Add frontend tests covering summary rendering, expectation presentation, believable/trust-building copy, and edit-and-return flow behavior.
  - [x] Add backend unit and integration-style tests for review-summary assembly, expectation payload shape, and shared-contract alignment.
  - [x] Continue using workspace-level validation before marking the story complete: `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.4 is currently in `review`, not `done`. Build on its containment-guidance handoff without refactoring unrelated behavior that may still receive review feedback.
- The current frontend flow still lives inside [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx), where the `guidance` step currently calls `resetFlowState()` and clears the journey when the customer presses the primary continuation action. Story 1.5 should replace that placeholder handoff with a real review step and preserve previously entered data.
- Story 1.4 already introduced a dedicated containment feature seam at [containment-guidance-panel.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/containment-guidance/containment-guidance-panel.tsx) plus feature-local API access in [containment-guidance-api.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/containment-guidance/containment-guidance-api.ts). Mirror that pattern for request review instead of coupling fetch and rendering logic directly into the intake screen.
- Backend intake evaluation currently lives in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) and returns machine-readable serviceability context from Story 1.3. Story 1.5 should reuse those intake details and outcomes as review inputs rather than re-deriving them from display text.
- The architecture explicitly maps ETA and price expectation review to `apps/handrix-web/src/features/request-review/`, `apps/handrix-api/src/modules/requests/`, and `apps/handrix-api/src/modules/reference-data/`. Follow that split so expectation-setting logic remains reusable for Story 1.6 confirmation and later lifecycle work.
- No persistence or Prisma-backed request creation exists yet. Keep this story focused on pre-confirmation summary and expectation-setting, not on storing requests or issuing tracking tokens early.

### Technical Requirements

- The review step must summarize the information already captured in the flow: selected issue, relevant clarifying answers, service location, and the expectation-setting content needed before confirmation.
- ETA, pricing, and what-happens-next content must be believable and transparent. Prefer bounded expectations, ranges, or qualifiers instead of false precision.
- The backend should remain the source of truth for customer-facing expectation data that materially affects business behavior or future submission semantics.
- Shared contracts should define the review-summary payload before frontend and backend implementations drift into parallel shapes.
- Keep this story intentionally scoped to pre-confirmation review. Do not implement final request persistence, tracking-token issuance, post-confirmation lifecycle screens, or full recovery workflows here.

### Architecture Compliance

- Follow the documented structure mapping for this story:
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/`
  - `apps/handrix-api/src/modules/reference-data/`
  - `packages/shared-contracts/src/requests/`
- Keep request-review API client code separate from review UI components, following the same feature-local adapter pattern already used for intake and containment guidance.
- Keep static or semi-static expectation copy/config centralized under structured backend/reference-data ownership rather than scattering pricing and ETA constants across React components and tests.
- Maintain `camelCase` JSON and TypeScript naming, use the shared success/error envelopes, and avoid introducing request-lifecycle assumptions that belong to Story 1.6 or Epic 2.
- Prefer a focused review feature boundary rather than growing `issue-intake-screen.tsx` into a permanent owner of every pre-confirmation screen.

### UX / Interaction Guardrails

- The review step should feel like a calm checkpoint, not like a dense admin form. Users should be able to scan the summary quickly and feel more certain, not slower.
- Use one dominant action, strong grouping, and concise section headings so ETA, pricing expectations, and what-happens-next copy read as a trustworthy summary.
- Edit affordances should be visible but secondary. The customer should understand exactly what they are revising without feeling kicked out of the guided flow.
- Stay aligned with the Warm Utility direction for pre-confirmation experiences: grounded reassurance, warm neutrals, strong readability, restrained semantic color, and mobile-first spacing.
- Use transparent qualifiers in pricing and ETA copy. The UX should build trust through honesty, not through overconfident promises the MVP cannot yet operationally support.

### Implementation Notes

- A strong MVP approach is to introduce a structured request-review payload that assembles the current intake snapshot plus expectation content in one backend-driven response.
- The current containment step already signals the next action with "Continue to request review" and a hint about timing, pricing, and request details in [reference-data.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/reference-data/reference-data.service.ts). Story 1.5 should make that handoff real instead of leaving it as copy-only foreshadowing.
- The existing flow state in `IssueIntakeScreen` already contains the selected issue, answers, service location, classification, and guidance. Reuse that state carefully so targeted edits do not wipe unrelated progress.
- A likely MVP implementation is for the review screen to request or assemble expectation content after containment, then hand off a validated review payload to Story 1.6 for actual submission. This is an implementation recommendation inferred from the architecture and current seams, not a fixed API contract.

### Testing Requirements

- Add or update frontend tests to verify:
  - the customer reaches a real request-review screen from containment guidance
  - request details summary sections render from captured intake data
  - ETA, pricing expectations, and what-happens-next content are shown in a quick-scanning summary
  - editing one area preserves unrelated progress and updates the review screen when the customer returns
- Add backend coverage to verify:
  - review-summary payload assembly from intake details and classification context
  - expectation content is returned in the shared envelope shape
  - shared schemas remain aligned between the API and SPA
- Keep tests co-located where practical and preserve the dedicated backend `test/` area for API integration-style coverage.

### Previous Story Learnings

- Story 1.4 introduced structured containment guidance with backend-selected variants and a dedicated frontend feature seam. Story 1.5 should build on that seam rather than collapsing review behavior back into ad hoc placeholder UI.
- The current primary action in containment guidance promises a review step, but the implementation still resets the flow. This story should convert that promise into an actual summary step and preserve continuity.
- Story 1.3 and Story 1.4 together already established machine-readable issue, answer, location, serviceability, and containment context. Reuse those stable shapes instead of inventing a second parallel summary model in the frontend only.
- Git history is still limited to the initial commit, so the implementation artifacts and current source tree remain more reliable than commit history for discovering established patterns.

### Project Structure Notes

- No `project-context.md` file was found; the planning artifacts remain the authoritative source for product, architecture, and UX constraints.
- The codebase already contains `apps/handrix-web/src/features/issue-intake/` and `apps/handrix-web/src/features/containment-guidance/`, but no dedicated `request-review` frontend feature exists yet. This story is the right time to introduce that boundary.
- The backend already has `requests` and `reference-data` modules, making them the correct seams for review-summary assembly and expectation content.
- Existing baseline tests still indicate the expected style: frontend React Testing Library coverage near the app/feature and backend integration-style coverage in `apps/handrix-api/test/`.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.5: Review ETA, Pricing Expectations, and Request Summary]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 1: Launch the Handrix Request Flow Foundation]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#2.5 Experience Mechanics]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimization Principles]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-4-show-immediate-containment-guidance.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-14: Created Story 1.5 from sprint backlog and assembled implementation context from epics, PRD, architecture, UX, current code seams, and Story 1.4 learnings.
- 2026-04-14: Added shared `request-review` schemas and types covering summary sections, edit targets, expectation content, next-step messaging, and the request payload used by both apps.
- 2026-04-14: Extended `requests` and `reference-data` with backend review-summary assembly and a new customer-safe `POST /requests/review-summaries` endpoint.
- 2026-04-14: Introduced the dedicated `request-review` frontend feature and rewired the containment handoff so the flow now reaches a real pre-confirmation summary instead of resetting.
- 2026-04-14: Verified the workspace successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Story artifact created for the next backlog item, focused on pre-confirmation request review, believable expectation setting, and targeted editing without losing unrelated progress.
- Guardrails added to keep request-review contracts and expectation data backend-driven while introducing a dedicated frontend `request-review` feature seam.
- Story explicitly positions Story 1.5 as the realization of the containment-to-review handoff and the setup for Story 1.6 submission.
- Implemented a backend-driven request review summary that packages intake answers, service location, ETA guidance, pricing expectations, and what-happens-next messaging in one shared contract shape.
- Delivered a dedicated request-review panel in the SPA with calm, quick-scanning sections and targeted edit actions that preserve unrelated flow progress.
- Added frontend, backend unit, backend controller, and backend e2e coverage for the review-summary path and verified the entire workspace gates.

### File List

- _bmad-output/implementation-artifacts/1-5-review-eta-pricing-expectations-and-request-summary.md
- apps/handrix-api/src/modules/reference-data/reference-data.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/request-review/request-review-api.ts
- apps/handrix-web/src/features/request-review/request-review-panel.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/requests/request-review.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-14: Created Story 1.5 from sprint backlog and assembled implementation context from planning artifacts and current codebase seams.
- 2026-04-14: Implemented Story 1.5 with shared request-review contracts, backend review-summary assembly, dedicated frontend request-review UI, and full workspace validation.
