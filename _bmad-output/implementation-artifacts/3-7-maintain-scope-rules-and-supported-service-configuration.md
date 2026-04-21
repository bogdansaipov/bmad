# Story 3.7: Maintain Scope Rules and Supported Service Configuration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations-ready platform,
I want supported issue types and coverage rules managed in a structured way,
so that intake and dispatch behavior stay aligned with the MVP operating model.

## Acceptance Criteria

1. Given the MVP supports only a constrained set of plumbing scenarios and service areas, when the system evaluates intake and dispatch behavior, then supported issue types and service coverage rules come from structured configuration or managed reference data, and the same source can be used consistently across intake, ops review, and assignment decisions.
2. Given scope or coverage definitions need adjustment, when the configuration is updated through the supported implementation path, then future requests follow the revised rules without requiring a redesign of the request lifecycle, and unsupported categories are still prevented from entering the active fulfillment flow.
3. Given operations relies on issue and coverage rules, when a request is reviewed for assignment, then the platform can explain or expose the relevant scope decision context, and lifecycle control remains aligned with the configured MVP service model.

## Tasks / Subtasks

- [x] Centralize runtime issue, guidance, and coverage definitions under the backend `reference-data` boundary instead of splitting fulfillment rules across multiple modules (AC: 1, 2)
  - [x] Move the runtime source of truth for supported issue definitions, intake question sets, containment guidance templates, request-review templates, and service-area coverage rules into `apps/handrix-api/src/modules/reference-data/`.
  - [x] Keep the structured config code-backed and versioned in-repo for this MVP story; do not introduce a database-backed admin system or a separate back-office CRUD surface.
  - [x] Preserve the existing contract shapes and `camelCase` JSON fields from `@handrix/shared-contracts`, but remove duplicated runtime business rules where the backend should be authoritative.

- [x] Refactor intake classification to consume backend-owned reference-data services for scope and coverage evaluation (AC: 1, 2)
  - [x] Replace the hard-coded supported-scope predicates in `apps/handrix-api/src/modules/requests/requests.service.ts` with `ReferenceDataService` methods or reference-data-owned config helpers.
  - [x] Move the service-area decision away from direct use of `supportedServiceAreaPostalCodes` in request-evaluation logic so coverage checks come from the same reference-data source as the rest of the MVP scope rules.
  - [x] Preserve the current intake outcomes and recovery semantics unless the structured config explicitly changes them: `serviceable`, `outOfArea`, `needsRecovery`, `continueToContainment`, `showRecoveryPath`, and the existing recovery codes.

- [x] Make scope-decision context visible to operations from backend-owned data rather than from inferred UI logic (AC: 1, 3)
  - [x] Extend the protected ops read model only as needed so request review can show why the request is considered serviceable, out of area, or outside supported scope.
  - [x] Prefer enriching the existing serviceability/detail summary in `apps/handrix-api/src/modules/ops/ops.service.ts` and `packages/shared-contracts/src/ops/` over creating a parallel “config status” model.
  - [x] If the current protected UI does not already expose enough context, update `apps/handrix-web/src/features/ops-queue/` to show the configured scope-decision rationale calmly and clearly in the request-detail flow.

- [x] Preserve lifecycle and assignment guardrails while centralizing configuration (AC: 2, 3)
  - [x] Keep unsupported issue categories and out-of-area requests out of the active fulfillment path even after the configuration source moves.
  - [x] Do not add new lifecycle states or a second source of truth for assignment readiness; continue using the existing request state machine, public-status mapper, and guarded ops transitions.
  - [x] Ensure assignment and ops review continue to consume the same backend-owned scope/coverage decision that customer intake uses.

- [x] Add regression coverage for reference-data ownership, intake evaluation, and ops visibility (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts` and add or expand service-level tests around the new structured config ownership.
  - [x] Extend `apps/handrix-api/src/modules/requests/requests.service.spec.ts`, `apps/handrix-api/src/modules/requests/requests.controller.spec.ts`, and `apps/handrix-api/test/app.e2e-spec.ts` to prove the same scope and coverage rules drive public intake outcomes.
  - [x] Add or update ops tests in `apps/handrix-api/src/modules/ops/ops.service.spec.ts` and frontend tests in `apps/handrix-web/src/features/ops-queue/` if new scope-decision context is exposed there.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- The architecture already assigns `reference-data` ownership for issue types, containment guidance templates, and serviceability rules. Story 3.7 should finish that boundary instead of leaving parts of the scope model inside `requests` or scattered through shared constants.
- The current repo reality is mixed:
  - `packages/shared-contracts/src/requests/issue-types.schemas.ts` owns issue-type identifiers and the current `supportedIssueTypes` list.
  - `packages/shared-contracts/src/requests/intake.schemas.ts` currently exports `supportedServiceAreaPostalCodes`.
  - `apps/handrix-api/src/modules/reference-data/reference-data.service.ts` already owns intake question sets, containment guidance templates, and review templates.
  - `apps/handrix-api/src/modules/requests/requests.service.ts` still owns supported-scope predicates and directly checks service-area postal codes.
- The implementation goal is not “make scope dynamic at any cost.” The safer MVP target is a single structured reference-data source, backed by code/config in the backend, that other modules consume consistently.
- Avoid overbuilding:
  - no admin CRUD screens
  - no database tables or Prisma migration unless truly required by discovered constraints
  - no new dispatch or lifecycle model just to represent config
- Keep response contracts stable for existing customer flows. This story is about centralizing rule ownership and exposing scope-decision context, not redesigning the intake or tracking experience.

### Technical Requirements

- Keep backend rule ownership in `apps/handrix-api/src/modules/reference-data/`.
- Keep request creation and lifecycle orchestration in `apps/handrix-api/src/modules/requests/`.
- Keep queue/detail orchestration in `apps/handrix-api/src/modules/ops/`.
- Keep shared API schemas in `packages/shared-contracts/src/`.
- Preserve the existing success/error envelope patterns and `camelCase` JSON field naming.
- Preserve the current issue-type vocabulary and recovery codes unless a conscious coordinated contract change is made across backend and frontend.
- Prefer extracting reference-data config into focused modules or files under `reference-data` rather than growing one oversized service file further.

### Architecture Compliance

- Follow the documented service boundary:
  - `reference-data` owns issue types, containment guidance templates, and serviceability rules.
  - `requests` owns lifecycle truth, request creation, and public-status projection.
  - `ops` owns queue-oriented orchestration and protected review surfaces.
- Keep public status as a derived projection from lifecycle state, not a separate config-driven state machine.
- Do not let ops or frontend code invent scope or coverage outcomes independently from backend reference data.
- Preserve the modular-monolith structure; this story should consolidate runtime ownership, not split new services out of the app.

### Library / Framework Requirements

- NestJS 11 remains the backend framework for all new module/service/controller work.
- Shared contracts continue to use Zod 4 schemas in `@handrix/shared-contracts`.
- React 19 and the existing Vite/Vitest frontend stack should only be touched if ops detail needs new scope-decision presentation.
- Keep using the current workspace commands:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm lint`
  - `pnpm build`

### File Structure Requirements

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/reference-data/`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
- Recommended shared-contract touch points only if contract changes are needed:
  - `packages/shared-contracts/src/requests/`
  - `packages/shared-contracts/src/ops/`
  - `packages/shared-contracts/src/index.ts`
- Recommended frontend touch points only if scope context needs new protected UI:
  - `apps/handrix-web/src/features/ops-queue/`
- Avoid these structural mistakes:
  - leaving scope predicates in `requests.service.ts` while also adding a second copy under `reference-data`
  - keeping service-area coverage in shared contracts as runtime business truth if the backend has already become authoritative
  - creating a full admin/config-management feature set that is not required by this story
  - introducing lifecycle or assignment rules inside frontend components

### Testing Requirements

- Backend coverage should prove:
  - issue, question, guidance, review, and coverage rules resolve from one reference-data-owned source
  - intake classification still returns the correct serviceability and recovery outcomes for supported, unsupported, and out-of-area scenarios
  - ops review can expose scope-decision context without diverging from intake classification
  - unsupported requests remain blocked from normal fulfillment paths
- Frontend coverage should prove, if UI changes are made:
  - protected ops detail shows the relevant scope or coverage rationale clearly
  - existing queue/detail navigation and lifecycle actions still behave correctly
- Regression coverage should confirm:
  - anonymous intake still works
  - request review and confirmation still use the existing contracts
  - prior Epic 3 assignment and intervention work remains intact

### Previous Story Learnings

- Story 3.1 established the protected internal access boundary, so any new ops visibility must stay inside the existing authenticated ops seams.
- Story 3.2 established queue scanning patterns, which means scope context should support quick understanding without bloating the queue with a second status system.
- Story 3.3 established the protected request-detail surface as the place for richer operational context.
- Story 3.4 established assignment ownership and durable assignment history, so this story should feed clearer scope/coverage inputs into that workflow rather than bypass it.
- Story 3.5 established guarded lifecycle transitions and backend-owned `availableTransitions`; Story 3.7 must not create parallel readiness or eligibility rules that disagree with that model.
- Story 3.6 introduced backend-owned intervention summaries and reinforced that durable operational context should come from canonical backend state, not frontend heuristics. Apply the same discipline to scope and coverage decisions here.

### Git Intelligence Summary

- Recent git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so live module seams are more useful than commit messages for implementation guidance.
- The strongest current implementation anchors for this story are:
  - `apps/handrix-api/src/modules/reference-data/reference-data.service.ts`
  - `apps/handrix-api/src/modules/reference-data/reference-data.controller.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `packages/shared-contracts/src/requests/issue-types.schemas.ts`
  - `packages/shared-contracts/src/requests/intake.schemas.ts`

### Project Structure Notes

- The current structure already supports this story cleanly, but the rule ownership is split. The main implementation job is consolidation, not expansion.
- A good end state for Story 3.7 is:
  - `reference-data` owns runtime config and rule evaluation helpers.
  - `requests` calls into that boundary for intake classification.
  - `ops` consumes the same derived decision context for protected review.
  - shared contracts define transport shapes, not duplicated business-rule implementations.
- No `project-context.md` file was found in the repo, so the story relies on the planning artifacts and live codebase seams.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.7: Maintain Scope Rules and Supported Service Configuration]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#FR39]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Service Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Alignment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/reference-data/reference-data.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/reference-data/reference-data.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/issue-types.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/intake.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-6-flag-requests-that-need-intervention-or-clarification.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected Story 3.7 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded BMAD create-story workflow, template, checklist, project config, Epic 3 planning artifacts, architecture guidance, and current implementation seams.
- 2026-04-21: Reviewed current `reference-data`, `requests`, `ops`, and shared-contract modules to identify where issue and coverage rule ownership is currently split.
- 2026-04-21: Began implementation, marked Story 3.7 in-progress, and mapped the existing runtime rule split across `reference-data`, `requests`, and ops detail presentation.
- 2026-04-21: Added backend-owned reference-data config and intake-decision helpers so issue definitions, supported scope rules, and service-area coverage checks resolve from the `reference-data` module.
- 2026-04-21: Refactored `RequestsService` to delegate intake classification to `ReferenceDataService` and threaded backend-owned scope/coverage rationale into ops detail responses and UI rendering.
- 2026-04-21: Added regression coverage for reference-data decisions, requests delegation, ops detail context, protected UI rendering, and integration behavior; validated with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Comprehensive story context created for Story 3.7 with explicit backend ownership, anti-overbuild guardrails, and regression expectations.
- Story prepared for implementation with repo-specific guidance on consolidating issue and coverage rules under `reference-data`.
- Centralized runtime issue and coverage ownership in the backend `reference-data` module through new config and decision helper seams, while preserving the existing intake contract outcomes and recovery codes.
- Replaced request-service-local scope and ZIP logic with reference-data delegation so intake, ops review, and protected detail context consume the same backend-owned rules.
- Extended ops detail contracts and UI to surface scope and coverage rationale without adding new lifecycle states or a second assignment-readiness model.
- Added regression coverage for reference-data decisions, request delegation, ops detail context, protected UI rendering, and module-level integration behavior.
- Verified the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/3-7-maintain-scope-rules-and-supported-service-configuration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/reference-data/reference-data.config.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.ts
- apps/handrix-api/src/modules/reference-data/reference-data.service.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.service.ts
- apps/handrix-api/src/modules/reference-data/reference-data.types.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts

### Change Log

- 2026-04-21: Centralized intake scope and coverage rules under backend `reference-data`, routed requests and ops detail through that seam, exposed scope rationale in the protected UI, and added regression coverage plus full workspace validation.
