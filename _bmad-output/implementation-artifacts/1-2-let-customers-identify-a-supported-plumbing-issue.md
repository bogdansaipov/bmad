# Story 1.2: Let Customers Identify a Supported Plumbing Issue

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer with an urgent plumbing problem,
I want to choose my issue from clear supported options,
so that I can start the request flow without knowing plumbing terms.

## Acceptance Criteria

1. The customer sees only the supported small-plumbing issue categories for the MVP when the issue selection screen loads on mobile or desktop, and each option uses a plain-language label with short explanatory copy.
2. When the customer selects an issue card, the selected state is visually clear and accessible, and the flow advances or reveals the next relevant step without showing unrelated options.
3. The interface does not imply unsupported services are available, and the intake scope remains limited to supported plumbing scenarios only.

## Tasks / Subtasks

- [x] Create the issue-intake feature foundation in the web app (AC: 1, 2, 3)
  - [x] Add a dedicated feature area under `apps/handrix-web/src/features/issue-intake/` for issue-selection UI, local flow state, and any supporting config or copy modules.
  - [x] Replace the Story 1.1 foundation-only homepage in `apps/handrix-web/src/app/App.tsx` with the first customer-facing intake screen for supported issue selection while keeping the implementation intentionally scoped to this story.
  - [x] Keep file naming aligned to the architecture guidance by preferring `kebab-case` feature files and route-oriented structure where practical.
- [x] Define the supported issue reference data and shared contracts (AC: 1, 3)
  - [x] Expand `packages/shared-contracts/src/requests/` with shared schemas and types for the MVP-supported issue categories and issue-selection payload shape.
  - [x] Export the new shared contracts from `packages/shared-contracts/src/index.ts` so both apps consume a single source of truth.
  - [x] Keep labels and descriptions in plain language and avoid adding unsupported plumbing categories or speculative future taxonomy.
- [x] Add backend support for issue-selection reference data (AC: 1, 3)
  - [x] Introduce a backend module aligned with architecture boundaries, preferably `apps/handrix-api/src/modules/reference-data/`, to expose supported issue types for the intake flow.
  - [x] Return data using the shared `{ data, meta? }` envelope conventions rather than ad hoc JSON.
  - [x] Expose the reference-data surface in Swagger so the public intake foundation remains documented from the start.
- [x] Implement the issue-selection interaction and UI states (AC: 1, 2, 3)
  - [x] Build issue-selection cards that include plain-language labels, concise descriptions, selected state, disabled/default states as needed, and clear keyboard focus treatment.
  - [x] Ensure single-tap selection has one dominant next action, either advancing to a lightweight next-step placeholder or revealing only the immediately relevant continuation state for Story 1.3.
  - [x] Present scope-limiting copy that makes the MVP boundaries clear without sounding like an error or dead end.
- [x] Add automated coverage for the story slice (AC: 1, 2, 3)
  - [x] Add frontend tests for rendering only supported issue options, selection behavior, and accessible selected-state feedback.
  - [x] Add backend tests for the supported issue reference-data endpoint or service and verify the shared envelope shape.
  - [x] Keep tests focused on this story's issue-identification behavior and avoid leaking Story 1.3 clarifying-question logic into this implementation.

## Dev Notes

- Story 1.1 is currently in `review`, not `done`. Build on the established foundation without refactoring unrelated starter work, and be prepared to accommodate small review-driven changes if they land while this story is in progress.
- The current frontend still shows the Story 1.1 foundation shell in [App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx). Story 1.2 should be the first real customer-facing intake experience, so it is appropriate to replace that temporary shell with the issue-selection entry point.
- Shared contracts already exist and are exported from [packages/shared-contracts/src/index.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/index.ts). Extend that package rather than introducing duplicate frontend-only or backend-only issue type definitions.
- Existing baseline tests show the current repo style: a React Testing Library app test at [apps/handrix-web/src/app/App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) and Nest integration-style tests at [apps/handrix-api/test/app.e2e-spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/app.e2e-spec.ts). Follow those patterns unless there is a strong reason to introduce a better-scoped test alongside the feature.

### Technical Requirements

- The Epic 1 flow must begin with supported plumbing issue selection in plain language, not technical terminology, so users can identify their problem quickly during a stressful moment.
- The experience must remain mobile-first, low-cognitive-load, and tightly sequenced, with one dominant action and minimal competing choices on the screen.
- Shared Zod contracts should define request and response boundaries between SPA and API, including any supported issue type schema used by both apps.
- API responses must continue using `camelCase` JSON and the shared success/error envelope conventions already introduced in Story 1.1.
- Keep this story intentionally scoped to issue identification. Do not implement the full clarifying-question flow, serviceability decisioning, containment guidance, pricing review, or request submission here.

### Architecture Compliance

- Follow the documented structure mapping for customer intake:
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/` for later request handling concerns
  - `apps/handrix-api/src/modules/reference-data/` for issue-type configuration/reference surfaces
  - `packages/shared-contracts/src/requests/` for shared request schemas
- Keep static copy and structured configuration for issue types in dedicated modules rather than scattering string constants across components and tests.
- Organize new frontend code by feature first, not by generic component buckets. Product-specific issue selection UI should live with `issue-intake`, while any reusable primitives should remain separate from feature logic.
- Do not introduce a global client store for this step. Local flow progression should stay in route-local/component state unless a concrete shared-state need appears.
- Do not add persistence, Prisma models, or lifecycle-state transitions yet. This story is about selection and supported-scope presentation, not request creation.

### UX / Interaction Guardrails

- The issue-selection experience should feel like a calm guided entry point for urgent plumbing help, not like browsing a large service catalog.
- Use issue cards with plain-language issue names, short clarifying copy, optional iconography or urgency cues, and a clearly accessible selected state.
- The interface should reassure the user that this flow is designed for urgent plumbing help and make the next step obvious immediately after selection.
- Unsupported categories should be excluded rather than teased. If scope-limiting copy is needed, keep it calm and direct instead of presenting generic error states.
- Avoid heavy forms, dense explanations, or multiple competing actions. This story should preserve momentum into the next step of the intake flow.

### Implementation Notes

- A reasonable MVP implementation is to fetch or import a small supported issue-type list from the backend reference-data surface and render it as selectable cards in the SPA.
- If the next story's clarifying questions are not implemented yet, advancing after selection can reveal a simple continuation placeholder or progress state that clearly indicates more details come next, without inventing Story 1.3 behavior.
- Reuse the existing env and app bootstrap patterns from Story 1.1 instead of introducing new app shells, routers, or state libraries unless strictly necessary.
- Keep the contract model future-friendly by distinguishing stable issue identifiers from customer-facing labels so later clarification and serviceability logic can branch on the identifier rather than display text.

### Testing Requirements

- Add or update frontend tests to verify:
  - only supported issue cards render
  - issue labels/descriptions are visible in plain language
  - selection changes visible and accessible state
  - the dominant next step appears without unrelated options
- Add backend coverage to verify the supported issue-type reference data shape and envelope wrapper.
- Keep tests co-located where practical and preserve the dedicated `test/` e2e area for true API integration tests.
- Continue using workspace-level validation before marking the story complete: `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Previous Story Learnings

- Story 1.1 established the monorepo, shared contracts package, Swagger-enabled Nest bootstrap, and baseline test/lint/typecheck/build workflows. This story should extend those patterns rather than replacing them.
- The foundation story could not fully verify local port-bound dev servers in the sandbox because of listen restrictions, so favor test/build/typecheck-backed verification in the dev record if the same limitation appears again.
- The repo already imports shared contracts into the frontend, which is a strong signal to keep issue-type definitions centralized in the shared package from the start.

### Project Structure Notes

- Git metadata is now available in this workspace, but there is only a single initial commit (`69a5dd0 first commit`), so rely more on the current codebase and planning artifacts than on commit history for implementation guidance.
- No `project-context.md` file was found; the planning artifacts remain the authoritative source for product, architecture, and UX constraints.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.2: Let Customers Identify a Supported Plumbing Issue]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 1: Launch the Handrix Request Flow Foundation]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Custom Components]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#2.5 Experience Mechanics]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented shared issue-type schemas and stable identifiers in `packages/shared-contracts` so both apps consume the same reference data and selection payload shape.
- Added Nest `reference-data` module with Swagger-documented `GET /reference-data/issue-types` returning the shared success envelope.
- Replaced the Story 1.1 foundation shell with a customer-facing `issue-intake` feature that loads supported issue types, renders accessible selection cards, and reveals a single next-step placeholder after selection.
- Validation commands completed successfully: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

### Completion Notes List

- Added five MVP-supported plumbing issue categories with plain-language labels, short descriptions, urgency cues, and stable IDs for later branching in Stories 1.3+.
- Implemented a dedicated `issue-intake` frontend feature with loading, error, selected, and next-step states while keeping the scope intentionally limited to issue identification.
- Added backend unit and integration-style coverage for the new reference-data endpoint and frontend behavior tests for supported-option rendering and accessible selection feedback.
- Updated the web styling from the starter shell to a calmer intake-focused presentation that works on mobile and desktop without introducing unrelated flow steps.

### File List

- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.ts
- apps/handrix-api/src/modules/reference-data/reference-data.module.ts
- apps/handrix-api/src/modules/reference-data/reference-data.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/app/App.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/issue-intake/issue-selection-card.tsx
- apps/handrix-web/src/features/issue-intake/issue-types-api.ts
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/requests/issue-types.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-14: Created Story 1.2 from sprint backlog and assembled implementation context from epics, architecture, UX, and Story 1.1 learnings.
- 2026-04-14: Implemented Story 1.2 with shared supported issue contracts, Swagger-backed reference data endpoint, intake selection UI, and automated coverage.
