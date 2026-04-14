# Story 1.4: Show Immediate Containment Guidance

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer dealing with a plumbing issue,
I want to receive calm, actionable containment guidance based on my issue,
so that I can reduce damage and feel more in control before booking.

## Acceptance Criteria

1. When the customer reaches the containment step after providing enough issue detail, the system shows issue-specific stabilization guidance tied to the selected plumbing problem, using short, calm, low-cognitive-load language.
2. The guidance screen presents structured steps, warnings where needed, and reassurance copy without overwhelming the user, and the content remains readable and accessible on mobile.
3. When the request is trending toward a fallback or recovery state, the containment guidance supports warning or recovery variants and still keeps the next step clear to the customer.

## Tasks / Subtasks

- [x] Add shared contracts for containment guidance content and variants in `packages/shared-contracts/src/requests/` (AC: 1, 2, 3)
  - [x] Define Zod schemas and exported TypeScript types for issue-specific containment guidance content, including structured step lists, optional warnings, reassurance/support copy, and a variant model that can distinguish informational, warning, and recovery/fallback guidance.
  - [x] Keep JSON field names in `camelCase` and align the new guidance shapes with the existing shared request/intake contracts so the SPA and API consume the same guidance source of truth.
  - [x] Leave room in the schema for serviceability-aware guidance selection without prematurely coupling the shape to final request creation or status-tracking concerns.
- [x] Extend backend reference-data support for structured containment guidance in `apps/handrix-api/src/modules/reference-data/` (AC: 1, 3)
  - [x] Keep `reference-data` responsible for containment guidance templates and issue-linked guidance selection, consistent with the architecture ownership for issue types, guidance templates, and serviceability rules.
  - [x] Expose a customer-safe API surface for retrieving the guidance needed after intake classification, reusing the shared envelope conventions rather than inventing ad hoc payloads.
  - [x] Select guidance based on the supported issue type and, where appropriate, the classification/recovery context already produced by Story 1.3 so the backend remains the source of truth for which guidance variant should be shown.
- [x] Implement the immediate containment experience in the web app using a dedicated containment feature seam (AC: 1, 2, 3)
  - [x] Introduce `apps/handrix-web/src/features/containment-guidance/` for the product-specific guidance panel and related feature-local API logic, following the architecture guidance instead of leaving containment behavior buried in the intake result screen.
  - [x] Transition the Story 1.3 happy path from the current result placeholder into a real containment step that consumes structured guidance content and preserves the guided mobile-first flow.
  - [x] Keep one dominant next action visible so the customer understands how to proceed toward the later review step without being distracted by dense copy or multiple competing controls.
- [x] Design the guidance UI to support calm informational, warning, and recovery-ready variants (AC: 2, 3)
  - [x] Present concise structured steps, optional warning blocks, and reassurance copy in a format that is readable on mobile and does not require long-form scanning under stress.
  - [x] Ensure warning and recovery variants clearly explain why the guidance changed while still keeping the next best action obvious.
  - [x] Avoid duplicating recovery messaging logic across components; the UI should render stable backend-provided guidance states rather than infer meaning from hardcoded display text.
- [x] Add automated coverage for the containment-guidance slice (AC: 1, 2, 3)
  - [x] Add frontend tests covering guidance retrieval, rendering of structured steps and warnings, variant presentation, and the dominant next action.
  - [x] Add backend unit and integration-style tests for guidance-template lookup, issue-specific guidance selection, and recovery-aware variant responses.
  - [x] Continue using workspace-level validation before marking the story complete: `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.3 is currently in `review`, not `done`. Build on the current intake classification flow without refactoring unrelated parts of the customer journey that may still receive review feedback.
- The current frontend seam for this work is the Story 1.3 result state in [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx), which already distinguishes `continueToContainment` from recovery routing but still stops at placeholder summary copy.
- The architecture explicitly maps immediate containment guidance to a dedicated frontend feature at `apps/handrix-web/src/features/containment-guidance/` and to backend ownership in `apps/handrix-api/src/modules/reference-data/`. Follow that split instead of hardcoding guidance content entirely inside `issue-intake`.
- Shared contracts are already centralized in [packages/shared-contracts/src/index.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/index.ts) and [intake.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/intake.schemas.ts). Extend the shared package for containment guidance rather than introducing duplicate frontend-only content models.
- Story 1.3 already established machine-readable serviceability outcomes such as `continueToContainment` and `showRecoveryPath`. Story 1.4 should consume those outcomes cleanly so later recovery and review stories can build on stable contracts instead of brittle UI-only branching.
- No persistence or Prisma-backed request creation exists yet. Keep this story focused on immediate guidance delivery and variant selection, not on storing the guidance interaction or creating the final request early.

### Technical Requirements

- Containment guidance must be specific to the selected supported plumbing issue and should be delivered immediately after enough intake detail exists to choose the right guidance.
- Guidance content must be structured, brief, and readable under stress, with short steps and optional warnings rather than long narrative instructions.
- The backend should remain responsible for selecting which guidance variant to present, especially when the intake result is trending toward a fallback or recovery path.
- Shared contracts should define guidance templates and variant shapes before frontend and backend implementations drift apart.
- Keep this story intentionally scoped to immediate stabilization guidance. Do not implement full ETA/pricing review, final request submission, status tracking, or complete recovery flows here.

### Architecture Compliance

- Follow the documented structure mapping for this story:
  - `apps/handrix-web/src/features/containment-guidance/`
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/reference-data/`
  - `packages/shared-contracts/src/requests/`
- Keep issue types, containment guidance templates, and recovery-aware guidance rules centralized under structured config/backend reference data rather than scattered across components and tests.
- Keep lifecycle truth and serviceability meaning backend-driven. The frontend should render the selected guidance state, not reinterpret classification outcomes into its own parallel logic.
- Maintain `camelCase` JSON and TypeScript naming, continue using the shared success/error envelope conventions, and keep future persistence concerns separate from this story.
- Prefer a focused feature boundary for containment guidance instead of turning `issue-intake-screen.tsx` into a permanent catch-all for every intake and post-intake step.

### UX / Interaction Guardrails

- The containment step should feel like Handrix is helping the customer regain control quickly, not like it is asking them to read a safety manual.
- Use short structured guidance, calm reassurance, and restrained warning emphasis so the experience de-escalates stress instead of amplifying it.
- Preserve one dominant action and visible step continuity. The customer should understand what to do now and what happens next at a glance.
- Warning or recovery-aware guidance should be explicit and honest without becoming alarmist. If the path is changing, explain that clearly and keep the next best action obvious.
- Stay aligned with the Warm Utility visual direction for this pre-confirmation guidance step and keep the content accessible, touch-friendly, and readable on small screens.

### Implementation Notes

- A strong MVP approach is to model containment guidance as structured templates keyed by issue type and optionally refined by serviceability or recovery context, with the backend selecting the right variant.
- The current Story 1.3 result screen can serve as the handoff into containment guidance, but the actual guidance UI should live in a dedicated `containment-guidance` feature so Story 1.5 can consume a cleaner boundary afterward.
- Frontend API adapters for guidance should remain separate from rendering components, matching the current pattern used by `issue-types-api.ts`.
- If complete recovery UX is still deferred to later stories, Story 1.4 should still support warning/recovery guidance variants now so the customer never sees a dead-end generic message between intake and the next step.

### Testing Requirements

- Add or update frontend tests to verify:
  - issue-specific guidance is shown after the intake flow continues
  - structured steps, warnings, and reassurance copy render in the correct variant
  - mobile-friendly guidance states keep one dominant next action visible
  - recovery-aware guidance does not collapse into a generic error state
- Add backend coverage to verify:
  - containment guidance template lookup by issue type
  - recovery-aware or warning variant selection when classification context requires it
  - response envelopes and shared schemas stay aligned with the shared contracts package
- Keep tests co-located where practical and preserve the dedicated backend `test/` area for API integration-style coverage.

### Previous Story Learnings

- Story 1.3 extended the intake flow with issue-specific clarifying questions, address capture, and backend serviceability classification. This story should build directly on that machine-readable intake result instead of re-deriving guidance context in the UI.
- The current screen already uses a guided, progressive pattern with strong step cues and calm validation language. Carry that interaction style into containment guidance rather than switching to a denser or dashboard-like presentation.
- Story 1.3 intentionally stopped at a classification/result placeholder. That means Story 1.4 should replace that placeholder with real guidance behavior rather than layering another disconnected panel beneath it.
- Git history is still limited to the initial commit, so the current source structure and implementation artifacts remain more reliable than commit history for pattern discovery.

### Project Structure Notes

- No `project-context.md` file was found; the planning artifacts remain the authoritative source for product, architecture, and UX constraints.
- The current codebase contains `apps/handrix-web/src/features/issue-intake/` and backend `reference-data` plus `requests` modules, but no dedicated `containment-guidance` frontend feature exists yet. This story is the right time to introduce that boundary.
- Existing baseline tests still indicate the expected style: frontend React Testing Library coverage near the app/feature and backend integration-style coverage in `apps/handrix-api/test/`.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.4: Show Immediate Containment Guidance]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 1: Launch the Handrix Request Flow Foundation]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#2.5 Experience Mechanics]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimization Principles]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-3-capture-clarifying-answers-and-service-location.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-14: Created Story 1.4 from sprint backlog and assembled implementation context from epics, PRD, architecture, UX, and Story 1.3 learnings.
- 2026-04-14: Added shared containment-guidance contracts covering request context, guidance variants, structured steps, warnings, and next-action metadata.
- 2026-04-14: Extended `reference-data` with containment guidance template selection and a new customer-safe `GET /reference-data/containment-guidance/:issueTypeId` surface.
- 2026-04-14: Replaced the Story 1.3 result placeholder with a dedicated containment-guidance panel and feature-local API integration in the web app.
- 2026-04-14: Verification completed successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Story artifact created for the next backlog item, focused on issue-specific immediate containment guidance, calm mobile-first presentation, and recovery-aware variants.
- Guardrails added to keep containment templates and selection logic centralized in shared contracts and backend reference data while giving the frontend a dedicated feature boundary.
- Story explicitly positions Story 1.4 as the replacement for the current Story 1.3 result placeholder and the bridge into Story 1.5 review/expectations.
- Implemented shared containment-guidance schemas and types so backend and frontend use the same structured model for informational, warning, and recovery variants.
- Added backend guidance-template selection in `reference-data` and exposed a customer-safe containment-guidance endpoint driven by Story 1.3 classification context.
- Delivered a dedicated containment-guidance frontend feature with structured steps, warning panels, reassurance copy, and a single dominant next action.
- Added frontend, backend unit, and backend integration-style coverage for the new containment guidance flow and verified the workspace with typecheck, test, lint, and build.

### File List

- _bmad-output/implementation-artifacts/1-4-show-immediate-containment-guidance.md
- apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.ts
- apps/handrix-api/src/modules/reference-data/reference-data.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/containment-guidance/containment-guidance-api.ts
- apps/handrix-web/src/features/containment-guidance/containment-guidance-panel.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/requests/containment-guidance.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-14: Created Story 1.4 from sprint backlog and assembled implementation context from planning artifacts and current codebase seams.
- 2026-04-14: Implemented Story 1.4 with shared containment-guidance contracts, backend reference-data guidance selection, dedicated frontend guidance UI, and automated verification.
