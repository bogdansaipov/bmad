# Story 2.2: Define and Expose Customer-Safe Request Statuses

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product system,
I want internal lifecycle updates mapped to clear public statuses,
so that customers always see trustworthy progress language instead of operational noise.

## Acceptance Criteria

1. Given the backend tracks richer internal lifecycle states, when customer-facing status data is returned, then the API exposes curated public statuses that are safe and understandable for customers, and each public status is derived from a single authoritative backend mapping.
2. Given a request changes state internally, when the public status is resolved, then the customer-visible status remains aligned with the true lifecycle state, and unsupported or contradictory status combinations are prevented.
3. Given public statuses are defined, when frontend experiences render them, then the copy, labels, and status treatments come from the shared status model rather than duplicated hardcoded strings, and the response format follows the agreed API contract conventions.

## Tasks / Subtasks

- [x] Extract the public-status model into a single backend-owned lifecycle mapping seam instead of leaving presentation rules embedded ad hoc in service methods (AC: 1, 2)
  - [x] Move the status-resolution logic out of [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) into a dedicated `requests` domain helper such as `public-status-map.ts` or `request-status.presenter.ts`, keeping the request lifecycle definition as the source of truth.
  - [x] Define the allowed relationship between `RequestLifecycleState` values in [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) and `PublicRequestStatus` values in [request.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts).
  - [x] Prevent impossible combinations by making unsupported mappings fail fast in backend code and tests instead of silently returning contradictory customer messaging.
- [x] Expose a reusable customer-safe status presentation contract from the shared package (AC: 1, 3)
  - [x] Extend `packages/shared-contracts/src/requests/` with a shared schema/type for status presentation data that can be reused by request creation now and request tracking later, instead of duplicating `publicStatusLabel` and `publicStatusDetail` as one-off fields forever.
  - [x] Keep the API contract in the established wrapper format using `createSuccessResponse`, `camelCase` JSON, and ISO 8601 timestamps where applicable.
  - [x] Preserve the existing public status enum names unless there is a compelling architecture reason to change them; if names do change, update every consumer in the shared package, backend, and frontend together.
- [x] Apply the shared status model to current customer-facing request responses without leaking internal lifecycle detail (AC: 1, 2, 3)
  - [x] Update the request-creation response shaping in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) to use the extracted mapper/presenter rather than duplicating switch logic in service code.
  - [x] Keep internal lifecycle states such as `intake_in_review` and `dispatch_in_progress` private to backend logic unless a contract explicitly needs them for trusted internal use.
  - [x] Make sure the current confirmation experience in [request-review-panel.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-review/request-review-panel.tsx) renders status copy from the shared model and does not add new hardcoded status labels locally.
- [x] Prepare the status model to serve later tracking and recovery stories without overbuilding Story 2.3 or 2.4 early (AC: 1, 2, 3)
  - [x] Shape the shared status presentation so it can support later request lookup, tracking timelines, and recovery messaging, but do not implement the anonymous tracking endpoint or timeline UI in this story.
  - [x] If a helper returns more than label/detail, keep every field customer-safe and clearly named for reuse by future `request-tracking` work.
  - [x] Avoid introducing frontend-owned status registries, duplicated constants, or a second lifecycle source of truth.
- [x] Add automated coverage for lifecycle-to-public-status mapping and shared consumer behavior (AC: 1, 2, 3)
  - [x] Add or update backend unit tests in [requests.service.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.spec.ts) to cover every supported mapping and at least one unsupported combination failure path.
  - [x] Update controller or e2e coverage in [requests.controller.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.spec.ts) and/or [app.e2e-spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/app.e2e-spec.ts) if the response shape changes.
  - [x] Update frontend tests such as [App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) if status copy consumption changes, verifying the UI still renders backend-owned customer-safe status messaging.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 2.1 already established that customer confirmation UI should render backend-owned `publicStatusLabel` and `publicStatusDetail` fields rather than raw enum values. Story 2.2 should generalize that into a reusable status model, not reintroduce frontend-owned labels.
- The live codebase currently has the public-status presentation switch embedded inside `RequestsService.getPublicStatusPresentation(...)`. That is the right behavior seam to preserve, but the wrong long-term ownership location for lifecycle-sensitive logic that future tracking and recovery stories will also need.
- The persisted request model in [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) already separates internal `lifecycleState` from external `publicStatus`. This story should tighten and centralize that relationship rather than inventing a second status model.
- Architecture requires the request lifecycle/state-machine definition to remain the single source of truth, public status labels to stay backend-derived, and shared schemas to live in the shared contracts package. Follow those seams even if a local quick fix in the UI would be faster.
- UX guidance for Epic 2 requires visible progress, trust-preserving recovery, and clear alignment between internal and customer-facing states. Status copy should therefore be calm, transparent, and specific enough to reassure without exposing operational noise.

### Technical Requirements

- Keep status truth in the backend `requests` domain. Frontend components may render public status presentation, but they must not resolve lifecycle-to-status mappings themselves.
- Reuse the shared contracts package for any new status presentation shape so both apps consume the same schema and TypeScript types.
- Treat unsupported lifecycle/public-status combinations as defects. Prefer explicit invariant checks or exhaustive switches over permissive fallbacks that hide mapping drift.
- Preserve the API envelope conventions already used by the controller layer: `{ data, meta? }` on success and `{ error: { ... } }` on failures.
- Keep all JSON contracts `camelCase`; keep persistence and internal state names aligned with the existing backend conventions.
- Design the shared status presentation shape with Story 2.3 and Story 2.4 in mind, but do not implement the tracking endpoint, polling flow, or timeline UI in this story.

### Architecture Compliance

- Keep customer-facing request behavior under:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - existing frontend consumers under `apps/handrix-web/src/features/`
- Use a dedicated backend domain location for lifecycle/state-machine and public-status mapping logic, as required by the architecture guidance.
- Keep public status labels derived from backend mappings, not independently hardcoded in multiple frontend components.
- Treat lifecycle mapping updates as architecture-sensitive changes that require backend logic, shared contracts, and frontend consumers to move together.

### Library / Framework Requirements

- Continue using NestJS request-module patterns already present in the codebase for controller/service boundaries.
- Continue using Zod schemas in `packages/shared-contracts` as the contract source for shared types.
- Keep React/TanStack Query consumer behavior aligned with backend-owned contracts rather than adding client-only interpretation layers.
- No additional libraries are required for this story unless a clear gap emerges during implementation.

### File Structure Requirements

- Prefer adding the status-mapping helper beside the existing request-domain files in `apps/handrix-api/src/modules/requests/`.
- Keep shared request contract additions inside `packages/shared-contracts/src/requests/`.
- Update existing tests in their current locations rather than creating parallel test suites for the same behavior.
- Do not create a new `request-tracking` feature folder yet unless the implementation genuinely needs a tiny shared presentation helper; broader tracking structure belongs to Story 2.3+.

### Testing Requirements

- Cover every currently supported `PublicRequestStatus` mapping path.
- Add at least one regression test proving an invalid or contradictory mapping is rejected or made impossible.
- Verify any shared contract refactor still preserves the current confirmation payload semantics expected by Story 2.1.
- If the frontend consumes a refactored shared presentation object, verify it still renders customer-safe copy without falling back to raw enum text.
- Finish with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Previous Story Learnings

- Story 2.1 showed that the safest implementation pattern is backend-owned confirmation/status messaging consumed directly by the UI.
- Story 2.1 also left the broader status taxonomy intentionally unfinished; this story is the right place to formalize the model before anonymous tracking and timelines expand the surface area.
- Story 1.6 and Story 2.1 both reinforced the same pattern: shared contracts define the boundary, backend logic derives customer-safe fields, and the frontend renders them without reconstructing business truth.
- Current git history is sparse, so the strongest implementation guidance comes from live code seams and prior story artifacts rather than commit-by-commit evolution.

### Git Intelligence Summary

- Recent visible git history is minimal (`feat: completeled epic 1`, `first commit`), so commit messages do not provide meaningful extra lifecycle guidance for this story.
- The current repository state is more informative than git history: status mapping already exists in live service code and should be extracted rather than reinvented.

### Project Structure Notes

- The repository does not contain a `project-context.md` file, so the planning artifacts and current codebase remain the authoritative context.
- Existing request-domain seams already match the architecture well:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - `apps/handrix-web/src/features/request-review/`
- The main structural risk is scattering status presentation across service methods and React components. This story should reduce that risk by centralizing the status model.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.2: Define and Expose Customer-Safe Request Statuses]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Unified Project Structure]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-1-show-a-clear-request-confirmation-state.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-review/request-review-panel.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 2.2 from the first `backlog` entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Analyzed Epic 2, architecture lifecycle guidance, UX journey patterns, current request module code, and the completed Story 2.1 artifact to build implementation guardrails.
- 2026-04-20: No additional web research was required because this story depends on the repository's current architecture, contracts, and code seams rather than unstable external API changes.
- 2026-04-20: Marked Story 2.2 in-progress, added red-phase tests for a dedicated request status presenter, contradictory lifecycle/public-status rejection, and customer-safe response shaping.
- 2026-04-20: Added a backend `request-status.presenter` helper, extracted reusable shared status-presentation schemas/types, and removed `lifecycleState` from the customer-facing request creation contract.
- 2026-04-20: Verified the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Centralized customer-safe status presentation in a dedicated backend presenter and enforced allowed lifecycle-to-public-status combinations with fail-fast errors.
- Added a reusable shared contract schema/type for public status presentation and reused it in request creation and request-status shapes.
- Removed `lifecycleState` from the customer-facing request creation response so customers only receive public-safe status data.
- Updated backend, controller, e2e, and frontend tests to cover the new contract and contradictory mapping protection.
- Validated the workspace successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/2-2-define-and-expose-customer-safe-request-statuses.md
- apps/handrix-api/src/modules/requests/request-status.presenter.ts
- apps/handrix-api/src/modules/requests/request-status.presenter.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- packages/shared-contracts/src/requests/request.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-20: Extracted backend-owned request status presentation into a dedicated presenter, added invariant enforcement for lifecycle/public-status combinations, and removed internal lifecycle detail from the customer-facing request creation response.
- 2026-04-20: Added reusable shared status-presentation schemas/types and updated backend/frontend tests plus e2e coverage to match the new contract.
