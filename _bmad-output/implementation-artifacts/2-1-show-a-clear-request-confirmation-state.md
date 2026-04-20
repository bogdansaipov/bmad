# Story 2.1: Show a Clear Request Confirmation State

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to see immediate confirmation that my request was received,
so that I know Handrix is actively handling my issue.

## Acceptance Criteria

1. When a customer successfully submits a service request and the confirmation view loads, the interface clearly states that the request has been received and is being processed, and the customer can immediately understand the next expected step.
2. When the confirmation state is displayed and the customer reviews the page, the screen shows a customer-safe summary of the request and the current public status, and the content uses calm, trust-building language rather than technical system messages.
3. When the confirmation state appears on mobile and the customer scans the page under stress, the design emphasizes reassurance, readability, and one dominant next action, and the layout remains accessible and touch-friendly.

## Tasks / Subtasks

- [x] Turn the current in-panel success placeholder into a deliberate confirmation-state experience that matches Epic 2 expectations (AC: 1, 2, 3)
  - [x] Rework [request-review-panel.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-review/request-review-panel.tsx) so the success path reads like a dedicated confirmation state rather than a raw post-submit dump of backend fields.
  - [x] Keep the confirmation view in the same customer journey handoff after `POST /requests`, but structure it so later tracking work can move cleanly into a `request-tracking` feature seam without rewriting the confirmation copy again.
  - [x] Preserve one dominant next action on the page; do not introduce multiple competing calls to action, account creation prompts, or unsupported export/share flows.
- [x] Expose and render a customer-safe request summary from the backend-owned confirmation payload (AC: 1, 2)
  - [x] Review the `CreateRequestResponse` contract in [request.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts) and [request.types.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.types.ts) and extend it only if the current payload is missing confirmation-safe summary fields needed by the UI.
  - [x] Keep the API response customer-safe and derived from backend-owned request data in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts), not reconstructed from stale frontend-only state after submission succeeds.
  - [x] Limit this story to the immediate confirmation state and initial public status already available at request creation; do not absorb the broader public-status modeling work reserved for Story 2.2.
- [x] Make the confirmation language and status presentation calm, explicit, and non-technical (AC: 1, 2, 3)
  - [x] Replace raw machine-facing labels such as bare enum/status values in the UI with customer-facing headings, supporting copy, and status treatment that explain what Handrix is doing next.
  - [x] Keep the current public status visible, but present it as a trust-building state module that pairs label, explanation, and next-step context instead of showing internal or low-context wording alone.
  - [x] Ensure the copy stays aligned with the backend response and existing expectation-setting from Epic 1 so the confirmation moment feels like a continuation of the same guided flow.
- [x] Preserve mobile-first reassurance and accessibility in the confirmation layout (AC: 3)
  - [x] Keep the confirmation state readable under stress with clear hierarchy, strong spacing, and touch-friendly interaction targets inside the existing SPA shell.
  - [x] Ensure the dominant action, request summary, and status module remain scannable without forcing the user through a dense wall of text.
  - [x] Avoid color-only status meaning; pair labels and supporting text so the state is understandable with or without semantic color cues.
- [x] Add automated coverage for the confirmation-state handoff and rendering behavior (AC: 1, 2, 3)
  - [x] Update frontend tests around [App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) and any feature-local tests to verify successful confirmation rendering, customer-safe summary content, and one dominant next action.
  - [x] Add or update backend tests only if the confirmation response shape changes, covering any new summary/status fields emitted by the request-creation boundary.
  - [x] Validate the workspace before closing the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.6 already implemented the request-creation seam and currently returns a `CreateRequestResponse` with `publicId`, `issueLabel`, `publicStatus`, confirmation copy, and the signed tracking credential. Story 2.1 should build directly on that existing handoff instead of creating a second confirmation mechanism.
- The current success state lives inside [request-review-panel.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-review/request-review-panel.tsx) and exposes raw values such as `publicStatus` plus implementation-oriented helper bullets. That is the right seam to improve first, but the result should feel like a customer confirmation experience, not a debugging surface.
- [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx) already preserves `confirmedRequest` after successful submission and keeps the customer in the same SPA flow. Reuse that state handoff carefully rather than re-submitting or rebuilding request details from scratch.
- Architecture requires customer-facing APIs to stay under the `requests` module, public status to remain a backend-derived projection, and frontend journey stages to separate confirmation/tracking/recovery concerns over time. This story should move the confirmation UI closer to that architecture without pre-implementing Story 2.3 or 2.4.
- UX guidance says the emotional job changes after confirmation: the product should stop feeling like intake and start feeling like visible forward motion. The confirmation state should therefore keep the warm, reassuring tone from Epic 1 while beginning the more structured Precision Dispatch style intended for post-confirmation screens.

### Technical Requirements

- Treat the backend confirmation payload as the source of truth for what the customer sees after submission succeeds.
- If the existing `CreateRequestResponse` is insufficient for a trustworthy summary, extend the shared contract once and consume that contract from both apps instead of inventing frontend-only display data.
- Keep internal lifecycle detail private. This story may show the current public status, but must not leak internal queueing, assignment, or operational-only terminology to customers.
- Reuse the request-creation response and stored `confirmedRequest` handoff from Story 1.6. Do not add a second confirmation API or duplicate request-submission logic.
- Keep the tracking credential implementation detail out of the primary customer message. The UI can preserve it for later handoff, but the confirmation screen should speak in customer terms such as request receipt, progress, and what happens next.

### Architecture Compliance

- Keep public customer-facing behavior in:
  - `apps/handrix-web/src/features/request-review/` for the immediate post-submit confirmation handoff
  - `apps/handrix-api/src/modules/requests/` for confirmation payload shaping
  - `packages/shared-contracts/src/requests/` for shared response schemas
- Stay aligned with the architecture rule that public status comes from backend mappings and shared contracts, not independently hardcoded frontend enums scattered across components.
- Preserve the current modular ownership where `requests` owns request creation and public-status projection. Do not move lifecycle truth into React state.
- Use the architecture's customer-journey separation as a guardrail: this story can establish a cleaner confirmation seam, but full revisit/tracking behavior belongs to later `request-tracking` work.

### UX / Interaction Guardrails

- The first screen after confirmation should make it obvious that the customer can stop searching and that Handrix is now handling the next step.
- Use calm, trust-building language and readable hierarchy. Avoid terse raw labels, developer phrasing, or copy that sounds like a system log.
- Keep one dominant next action. A good outcome is reassurance plus a clear next-step message, not an overloaded menu of choices.
- Present the request summary as a lightweight reminder of what was received, not a second review form.
- The layout must remain mobile-first, touch-friendly, and WCAG-conscious, with explicit labels and no color-only status meaning.

### Implementation Notes

- The current confirmation state already has access to the submitted response object, so the lowest-risk path is to improve the success rendering around that existing seam rather than introducing a new route immediately.
- The existing response currently returns `confirmationHeadline`, `confirmationDetail`, and `nextStepDetail`. Those fields are strong anchors for the reassurance layer and may only need contract expansion if the UI still lacks a customer-safe summary beyond request ID, issue label, and public status.
- Story 2.2 is where the broader customer-safe status model should be formalized and exposed consistently. Story 2.1 should not overreach by redesigning the full status taxonomy before that story begins.
- There is not yet an `apps/handrix-web/src/features/request-tracking/` directory in the live codebase. If this story introduces any new frontend seam, keep it narrowly focused on confirmation-state presentation so Story 2.3 can extend it naturally.

### Testing Requirements

- Add or update frontend tests to verify:
  - a successful submission lands in a clear confirmation state instead of a raw technical success panel
  - the confirmation page shows customer-safe request summary content and the current public status
  - the next-step message is visible and there is one dominant next action
  - the confirmation rendering remains accessible and stable on the existing mobile-first shell
- Add backend coverage only when needed to verify any new confirmation summary fields or status presentation fields added to the shared contract.
- Keep tests co-located where practical, while preserving backend API coverage in `apps/handrix-api/test/` or existing request-module specs.

### Previous Story Learnings

- Story 1.6 established the durable request-creation boundary, the initial internal lifecycle state, the initial public status of `received`, and the signed tracking credential. Story 2.1 should capitalize on that foundation rather than re-litigating request creation.
- Story 1.6 also left the customer-facing success state intentionally lightweight. The gap now is presentation quality and clarity, not the existence of a submission path.
- Epic 1 consistently kept the backend as the source of truth for classification, containment, review summary, and confirmation payloads. Continue that same pattern here for post-submit confirmation content.
- Git history is still sparse, so the live implementation seams and prior story artifact are more informative than commit messages for this story.

### Project Structure Notes

- The current codebase already contains the correct request-creation seams:
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
- There is no `project-context.md` file in the repository, so the planning artifacts remain the authoritative context source.
- The architecture anticipates a dedicated `request-tracking` frontend feature and backend public-status mapping helpers, but those seams are not yet present in the live code. Keep this story incremental and avoid inventing a parallel structure that later tracking stories will need to undo.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.1: Show a Clear Request Confirmation State]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Core User Experience]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Desired Emotional Response]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-6-submit-an-anonymous-service-request.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Created Story 2.1 from the next backlog item in `sprint-status.yaml` and assembled implementation context from epics, architecture, UX, the current confirmation flow, and the Story 1.6 artifact.
- 2026-04-20: Extended the shared request confirmation contract and backend response with customer-safe public-status label/detail fields for the post-submit confirmation state.
- 2026-04-20: Reworked the frontend confirmation experience and top-level hero copy so the post-submit state feels like reassurance and forward motion instead of a raw technical success panel.
- 2026-04-20: Verified the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Replaced the raw confirmation success placeholder with a reassurance-focused confirmation state that shows customer-safe status messaging, request summary details, and a single dominant next action.
- Extended the request-creation response contract with backend-owned `publicStatusLabel` and `publicStatusDetail` fields so the frontend no longer has to infer or expose raw machine-facing status text.
- Updated the top-level hero state after confirmation so the page chrome also reflects request progress instead of continuing to read like intake.
- Added and updated frontend, backend unit, backend controller, and backend e2e coverage for the new confirmation response shape and customer-facing rendering.
- Validated the workspace successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/request-review/request-review-panel.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/requests/request.schemas.ts

### Change Log

- 2026-04-20: Implemented Story 2.1 by upgrading the confirmation payload and UI to use customer-safe status labels/details, adding a reassurance-focused confirmation layout, and validating the full workspace.
