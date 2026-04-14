# Story 1.3: Capture Clarifying Answers and Service Location

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to answer only the follow-up questions needed for my issue and provide my service address,
so that Handrix can determine whether my request is in scope and fulfillable.

## Acceptance Criteria

1. The customer is shown only the clarifying questions relevant to the supported issue type they selected, and the interaction follows a progressive-disclosure pattern with one dominant action per step.
2. The customer can enter the address and required service details needed for fulfillment review, and required fields use clear labels with accessible validation feedback.
3. After issue details and location are entered, the system classifies the request by issue type and serviceability status, and unsupported or out-of-area requests are flagged for the correct downstream recovery path.

## Tasks / Subtasks

- [x] Replace the Story 1.2 next-step placeholder with the real clarifying-and-location intake flow in `apps/handrix-web/src/features/issue-intake/` (AC: 1, 2)
  - [x] Extend the existing issue-intake feature rather than creating a parallel flow, using the selected issue from Story 1.2 as the entry point into issue-specific follow-up questions.
  - [x] Keep the experience progressive and mobile-first: one dominant action per step, minimal competing controls, and visible flow progress without introducing a dense all-fields-at-once form.
  - [x] Preserve Story 1.2 scope boundaries by keeping containment guidance, full request review, and request submission as later steps rather than partially implementing them here.
- [x] Define shared contracts for clarifying answers, service location input, and serviceability evaluation results in `packages/shared-contracts/src/requests/` (AC: 1, 2, 3)
  - [x] Add Zod schemas and exported TypeScript types for issue-specific question definitions, captured answers, address/service-location input, and the classification result shape used between SPA and API.
  - [x] Reuse stable issue type identifiers from Story 1.2 so branching is driven by machine-readable IDs rather than display labels.
  - [x] Keep JSON field names in `camelCase` and maintain the shared `{ data, meta? }` / `{ error: { ... } }` envelope expectations already established in the repo.
- [x] Add backend request-intake support for clarifying-question configuration and serviceability classification in `apps/handrix-api/src/modules/requests/` and `apps/handrix-api/src/modules/reference-data/` as appropriate (AC: 1, 3)
  - [x] Keep `reference-data` responsible for structured issue-question and serviceability-rule configuration, while `requests` owns request-intake evaluation and lifecycle-relevant classification behavior.
  - [x] Expose a public intake API surface that lets the frontend obtain relevant follow-up definitions and submit/evaluate captured intake details without inventing ad hoc controller shapes.
  - [x] Return customer-safe classification outcomes that distinguish supported/in-scope progression from out-of-area or unsupported recovery routing, without skipping ahead to full request creation.
- [x] Implement accessible validation and recovery-aware UI states for service address capture (AC: 2, 3)
  - [x] Add labeled inputs and validation messaging for the minimum service-location details needed for MVP fulfillment review.
  - [x] Keep validation feedback calm and specific, with error messaging that helps the user continue instead of feeling blocked or blamed.
  - [x] Surface serviceability outcomes in a way that clearly prepares later recovery handling for Story 2.x without hardcoding final recovery copy in multiple places.
- [x] Add automated coverage for the clarifying-question and location slice (AC: 1, 2, 3)
  - [x] Add frontend tests covering issue-specific question branching, step progression, required-field validation, and classification/recovery-ready states.
  - [x] Add backend unit and integration-style tests for shared contract compliance, issue-specific question resolution, and serviceability classification outcomes.
  - [x] Continue using workspace-level validation before marking the story complete: `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.2 is currently in `review`, not `done`. Build on the current issue-intake implementation and avoid refactoring the whole flow while review feedback may still land.
- The current frontend seam for this work is the selected-state continuation panel in [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx), which already promises that Handrix will ask only the follow-up that matters next.
- Shared contracts are already being consumed by both apps through [packages/shared-contracts/src/index.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/index.ts). Extend that package instead of introducing frontend-only form models or backend-only DTO shapes that drift from each other.
- The architecture assigns customer intake and follow-up questions to the `issue-intake` frontend feature plus the `requests` backend module, while `reference-data` owns structured issue/guidance/serviceability configuration. Use that split consistently so classification logic does not get trapped inside UI code.
- The architecture also calls out React Router plus TanStack Query as the intended SPA flow/server-state approach, but the current implementation is still minimal and route-light. For this story, prefer a practical extension of the existing feature and only introduce router/query infrastructure if it materially improves this step without overbuilding.
- No persistence or Prisma layer exists yet in the current codebase. Keep this story focused on intake capture and serviceability evaluation contracts rather than forcing full database-backed request creation early.

### Technical Requirements

- The follow-up experience must show only the questions relevant to the previously selected supported issue type, not a generic questionnaire shared across every plumbing problem.
- The service-location step must collect the minimum address and fulfillment-review details needed for MVP evaluation while keeping the flow lightweight and sequential.
- The backend must classify the intake result by issue type and serviceability status so later guidance, review, recovery, and submission steps can branch from a single source of truth.
- Shared contracts should define the shapes for question configuration, captured answers, service-location payloads, and classification responses before frontend and backend implementations diverge.
- Keep this story intentionally scoped to clarification and location capture. Do not implement containment guidance content, ETA/pricing review, anonymous request submission, or full lifecycle persistence here.

### Architecture Compliance

- Follow the documented structure mapping for this story:
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/`
  - `apps/handrix-api/src/modules/reference-data/`
  - `packages/shared-contracts/src/requests/`
- Keep backend lifecycle truth in `requests`; do not let the frontend decide serviceability or downstream recovery categories on its own.
- Keep structured question definitions, issue branching rules, and serviceability configuration centralized rather than scattering switch statements and copy constants across components and tests.
- Maintain `camelCase` JSON and TypeScript naming, reserve `snake_case` for future persistence concerns, and continue using the shared API envelope conventions.
- Do not introduce a global client state store for this step. Route-local or feature-local state remains the preferred approach unless a clear shared-state need appears.

### UX / Interaction Guardrails

- Preserve the calm guided tone established in Story 1.2. This should feel like a short, confidence-building continuation of the intake flow, not like an insurance form or a dispatch dashboard.
- Use one dominant action per step and avoid showing all clarifying questions and address inputs at once unless the selected issue truly requires only a single compact screen.
- Validation and out-of-scope feedback should be direct and reassuring. If the request appears unserviceable or out of area, the interface should clearly prepare the user for a recovery path rather than presenting a generic error dead end.
- Keep the mobile-first flow easy to use one-handed with clear labels, large touch targets, strong focus states, and progress cues that help stressed users understand what comes next.
- Prepare for Story 1.4 by structuring the flow so containment guidance can appear immediately after enough detail has been captured, without forcing a major rework of this story's component boundaries.

### Implementation Notes

- A strong MVP approach is to define a small question set per supported issue type and drive the frontend from structured question metadata rather than hardcoded per-component branching.
- Serviceability classification can stay rule-based and intentionally simple for now, for example distinguishing supported-and-serviceable from out-of-area or unsupported follow-up paths, as long as the contract leaves room for richer evaluation later.
- The current `IssueIntakeScreen` already fetches supported issue types and tracks a selected issue locally. Story 1.3 can extend that feature with an internal step machine or focused child components instead of replacing the entire screen architecture.
- Frontend API adapters should remain separate from UI components, following the architecture guidance to keep feature-local API code distinct from rendering code.
- If final recovery copy or full fallback UX is deferred to later stories, still return stable machine-readable outcomes or codes now so downstream flows are not forced to infer meaning from display text.

### Testing Requirements

- Add or update frontend tests to verify:
  - only issue-relevant clarifying questions appear after selection
  - progressive step advancement keeps one dominant action visible
  - service-location validation is accessible and understandable
  - classification outcomes lead to the correct continue or recovery-ready state
- Add backend coverage to verify:
  - question-definition resolution by issue type
  - serviceability classification behavior for supported, out-of-area, and unsupported paths
  - response envelopes and shared schemas stay aligned with the shared contracts package
- Keep tests co-located where practical and preserve the dedicated backend `test/` area for API integration-style coverage.

### Previous Story Learnings

- Story 1.2 established the `issue-intake` feature, shared issue-type contracts, and a backend `reference-data` module. This story should extend those patterns rather than inventing a second intake architecture.
- The existing screen already uses calm scope-limiting copy, accessible selectable cards, and a single continuation panel. Carry that tone and interaction style into the clarifying-question and address steps.
- Story 1.2 deliberately stopped before implementing actual follow-up logic. That means Story 1.3 should replace the placeholder with real flow behavior, not layer a disconnected second experience below it.
- The repo still has only the initial git commit available for history context, so current source structure and planning artifacts are more trustworthy than commit-driven pattern discovery.

### Project Structure Notes

- No `project-context.md` file was found; the planning artifacts remain the authoritative source for product, architecture, and UX constraints.
- The current codebase already contains `apps/handrix-web/src/features/issue-intake/` and `apps/handrix-api/src/modules/reference-data/`, but `apps/handrix-api/src/modules/requests/` has not been scaffolded yet. This story is a reasonable point to introduce that backend module boundary.
- Existing baseline tests still indicate the expected style: frontend React Testing Library coverage near the app/feature and backend integration-style coverage in `apps/handrix-api/test/`.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.3: Capture Clarifying Answers and Service Location]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 1: Launch the Handrix Request Flow Foundation]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#2.5 Experience Mechanics]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimization Principles]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-2-let-customers-identify-a-supported-plumbing-issue.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-14: Created Story 1.3 from sprint backlog and assembled implementation context from epics, PRD, architecture, UX, and Story 1.2 learnings.
- 2026-04-14: Implemented shared intake contracts for issue-specific question sets, address capture, and serviceability classification.
- 2026-04-14: Added `reference-data` intake-question-set support and a new `requests` module with `POST /requests/intake-evaluations`.
- 2026-04-14: Replaced the Story 1.2 placeholder with a guided question, address, and evaluation flow in the web app.
- 2026-04-14: Verification completed successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Story artifact created for the next backlog item, focused on issue-specific follow-up questions, service-location capture, and serviceability classification.
- Guardrails added to keep lifecycle truth in backend modules, shared contracts centralized, and the frontend flow progressive rather than form-heavy.
- Story explicitly positioned to build on the Story 1.2 placeholder seam and prepare cleanly for Stories 1.4 and 2.x without prematurely implementing them.
- Implemented per-issue clarifying-question metadata and shared intake schemas so both apps use the same request-evaluation contracts.
- Added a backend intake-evaluation endpoint that classifies requests into serviceable, out-of-area, or recovery-needed paths.
- Delivered a mobile-first guided frontend flow covering issue-specific questions, address validation, answer summary, and recovery-ready result states.
- Added frontend, backend unit, and backend integration coverage for the new intake flow.

### File List

- _bmad-output/implementation-artifacts/1-3-capture-clarifying-answers-and-service-location.md
- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.ts
- apps/handrix-api/src/modules/reference-data/reference-data.module.ts
- apps/handrix-api/src/modules/reference-data/reference-data.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/requests/requests.module.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/issue-intake/issue-types-api.ts
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/requests/intake.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-14: Created Story 1.3 from sprint backlog and assembled implementation context from planning artifacts and current codebase seams.
- 2026-04-14: Implemented Story 1.3 with shared intake contracts, backend intake evaluation, guided address capture, and automated verification.
