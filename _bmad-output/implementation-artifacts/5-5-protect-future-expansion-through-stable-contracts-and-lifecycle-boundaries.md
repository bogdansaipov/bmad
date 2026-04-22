# Story 5.5: Protect Future Expansion Through Stable Contracts and Lifecycle Boundaries

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product team,
I want the request lifecycle, API contracts, and shared schemas kept stable and explicit,
so that new categories, geographies, and richer customer features can be added without redefining the core system.

## Acceptance Criteria

1. Given the MVP uses shared request and status concepts across frontend and backend, when contracts are defined and consumed, then the API shapes, shared schemas, and lifecycle boundaries are explicit and versionable, and frontend and backend do not drift into incompatible interpretations of request state.
2. Given the backend is the source of truth for request APIs, when contract definitions are published for implementation use, then OpenAPI documentation and the shared schema package describe the supported endpoints, payloads, and status models consistently, and the standard `{ data, meta? }` success envelope and `{ error: { ... } }` failure envelope are enforced rather than left implicit.
3. Given future features may add categories, locations, or richer account capabilities, when the team extends the product later, then the core request lifecycle can support those additions without a fundamental redesign, and public-status handling remains derived from the same backend source of truth.
4. Given new work touches lifecycle rules or shared contracts, when those changes are introduced, then they can be validated against the architecture consistency rules, and the platform retains a clear path for 10x MVP growth and post-MVP evolution.

## Tasks / Subtasks

- [x] Consolidate the shared lifecycle and contract boundary into one predictable request-domain surface (AC: 1, 3, 4)
  - [x] Move or refactor the shared `RequestLifecycleState` schema/type ownership into the request-contract area of `packages/shared-contracts/src/requests/` instead of leaving lifecycle definitions anchored under `health.schemas.ts`.
  - [x] Re-export lifecycle, public-status, and envelope primitives from a clear shared-contract entry path so frontend and backend consumers do not invent parallel request-state types.
  - [x] Keep persistence naming and Prisma enums unchanged unless a migration is truly necessary; this story is about boundary clarity and stability, not a lifecycle redesign.
  - [x] Preserve backward-compatible names for existing public statuses and lifecycle states unless acceptance criteria or architecture constraints require an intentional breaking change.

- [x] Make backend lifecycle ownership explicit and hard to bypass (AC: 1, 3, 4)
  - [x] Keep `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts` and `public-status-mapper.ts` as the backend source of truth for transitions and public-status derivation.
  - [x] Audit `ops`, `support`, and request presentation code for duplicated lifecycle assumptions, labels, or transition logic and route those call sites back through the request-domain lifecycle helpers where appropriate.
  - [x] Define and document the invariants that future work must preserve, including terminal states, guarded transitions, backend-owned public-status derivation, and separation between internal lifecycle state and customer-safe public status.
  - [x] Avoid embedding lifecycle rules in frontend route logic, ad hoc helpers, or Swagger-only types that can drift from runtime behavior.

- [x] Align OpenAPI output and shared schemas around the real API surface (AC: 1, 2)
  - [x] Review the current Nest Swagger setup in `apps/handrix-api/src/app.bootstrap.ts` and controller decorators across `requests`, `ops`, `support`, `auth`, `reference-data`, and `health`.
  - [x] Ensure the documented request and response shapes match the schemas in `packages/shared-contracts`, especially for wrapped success/error envelopes and request-status or lifecycle-related payloads.
  - [x] Add the lightest viable adapter layer needed for Swagger to describe the contract honestly, such as DTO wrappers, schema examples, or generated schema references, without replacing the shared Zod contracts as the implementation truth.
  - [x] Verify that protected and public endpoints expose stable, machine-readable contract expectations that future clients can extend safely.

- [x] Add drift-detection tests and verification for lifecycle and contract changes (AC: 1, 2, 4)
  - [x] Extend automated coverage in `packages/shared-contracts` and `apps/handrix-api` for lifecycle-state definitions, public-status derivation, transition guards, and API envelope shape consistency.
  - [x] Add a focused verification path that fails when OpenAPI docs, shared schemas, or backend lifecycle behavior diverge in materially important ways.
  - [x] Reuse the existing repo verification entry points from Story 5.4 where possible instead of inventing a parallel one-off check flow.
  - [x] Keep tests narrow and intentional: this story should prove stability boundaries, not explode into broad end-to-end coverage unrelated to contracts or lifecycle rules.

- [x] Document the extension rules for future categories, geographies, and richer customer features (AC: 3, 4)
  - [x] Add concise developer-facing documentation describing where new request categories, service-area rules, account capabilities, or transport mechanisms can extend the system without redefining the current lifecycle.
  - [x] Call out what is safe to add through reference/config modules versus what requires coordinated contract and lifecycle changes.
  - [x] Capture any deliberate boundary decisions made during implementation so later stories do not scatter contract evolution across controllers, services, and frontend feature modules.

## Dev Notes

- Epic 5 is now in the hardening phase. Stories 5.1-5.4 already established Prisma persistence, observability, security baselines, typed env validation, and CI gates. Story 5.5 should use those seams to stabilize the platform contract surface rather than introducing a new architecture layer.
- The live repo already has the core ingredients this story should formalize:
  - shared API envelope helpers in `packages/shared-contracts/src/common/api-envelope.ts`
  - request/public-status schemas in `packages/shared-contracts/src/requests/`
  - backend transition rules in `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - backend public-status derivation in `apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts`
  - Swagger bootstrap in `apps/handrix-api/src/app.bootstrap.ts`
- There is also a meaningful structural smell to address carefully: `RequestLifecycleState` currently lives in `packages/shared-contracts/src/health/health.schemas.ts` even though it is a request-domain concept reused far beyond health checks. This story is the right place to centralize that ownership without breaking downstream consumers.
- The architecture says shared contracts are the stable boundary between apps, but the backend remains the source of truth for lifecycle behavior. That means:
  - schemas and types can be shared
  - transition rules and public-status derivation must still originate in backend request-domain logic
  - frontend code should consume published shapes, not infer new lifecycle meaning locally
- Current controllers already use shared contracts for runtime parsing, but Swagger responses are mostly descriptive text rather than strongly aligned schema publication. Story 5.5 should tighten that gap so docs and runtime contracts stop drifting.

### Technical Requirements

- Preserve the modular monolith boundaries:
  - backend lifecycle rules stay under `apps/handrix-api/src/modules/requests/domain`
  - shared request contract definitions stay in `packages/shared-contracts`
  - frontend feature clients keep consuming shared shapes rather than duplicating them
- Follow architecture naming rules:
  - `snake_case` in persistence and internal event names
  - `camelCase` in JSON and TypeScript
  - ISO 8601 timestamps in response contracts
- Enforce the standard API wrappers consistently:
  - success: `{ data, meta? }`
  - error: `{ error: { code, message, details?, retryable? } }`
  The current shared helper uses `recoveryHint`; do not create a second error-envelope shape during this story. If naming alignment is changed, it must be deliberate and applied consistently across contracts, runtime behavior, and documentation.
- Treat lifecycle changes as architecture-sensitive:
  - public status must remain derived from backend lifecycle logic
  - terminal-state rules must remain explicit
  - any new shared lifecycle exports must stay compatible with existing request, ops, support, and health consumers
- Do not broaden scope into realtime transport, customer accounts, or new product flows. This story is about boundary stability for later expansion, not expansion itself.

### Architecture Compliance

- Architecture requires shared cross-app schemas in a dedicated package and explicitly says API contract schemas should live in one predictable place per domain.
- Architecture also requires lifecycle/state-machine definitions to live in a dedicated backend domain location and public-status mapping to come from that same source.
- Story implementation must preserve the separation between:
  - shared schema publication
  - backend lifecycle enforcement
  - frontend consumption of backend-owned meaning
- Future expansion support should come from stable boundaries, not extra abstraction layers. Avoid introducing a generic plugin framework, a second contract package, or speculative microservice seams.

### Library / Framework Requirements

- Keep using the repo’s existing stack and seams:
  - NestJS Swagger for OpenAPI publication in the API app
  - Zod in `@handrix/shared-contracts` for shared schema definitions
  - existing pnpm workspace scripts for verification
- Do not replace shared Zod schemas with class-validator DTO ownership as the main contract source. If Swagger needs DTO adapters, they should mirror the shared contract rather than supersede it.
- Do not add a new contract-generation toolchain unless the existing Zod plus Swagger approach cannot meet the acceptance criteria with a smaller, explicit solution.

### File Structure Requirements

- Likely shared-contract touch points:
  - `packages/shared-contracts/src/common/api-envelope.ts`
  - `packages/shared-contracts/src/requests/request-status.schemas.ts`
  - `packages/shared-contracts/src/requests/request.schemas.ts`
  - `packages/shared-contracts/src/requests/request.types.ts`
  - `packages/shared-contracts/src/index.ts`
  - new request-lifecycle-specific file(s) under `packages/shared-contracts/src/requests/` if the lifecycle schema is relocated
- Likely backend touch points:
  - `apps/handrix-api/src/app.bootstrap.ts`
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - `apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts`
  - `apps/handrix-api/src/modules/requests/request-status.presenter.ts`
  - controller files under `apps/handrix-api/src/modules/requests/`, `ops/`, `support/`, `auth/`, `reference-data/`, and `health/`
- Possible frontend touch points if imports or types move:
  - feature API modules under `apps/handrix-web/src/features/`
  - any request-tracking or internal workspace code that imports shared request-status or lifecycle types
- Avoid these mistakes:
  - defining a second lifecycle enum in the API app or frontend
  - hardcoding public-status meaning in multiple frontend screens
  - moving backend lifecycle rules into shared contracts
  - publishing OpenAPI docs that describe wrappers differently from runtime behavior

### Testing Requirements

- Add or update automated tests for:
  - shared lifecycle schema exports and request-domain contract ownership
  - backend transition validation and public-status derivation
  - controller-level success/error wrapper behavior where contract drift is likely
  - any OpenAPI-generation or contract-publication checks introduced by this story
- Re-run the existing repo release gates from Story 5.4:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - any focused CI or OpenAPI verification command added during implementation
- Keep verification honest. If Swagger output still cannot express some shared-contract detail exactly, document the gap and test the runtime contract directly instead of pretending the docs are authoritative.

### Previous Story Intelligence

- Story 5.4 established a useful baseline for this work:
  - shared contracts already build before dependent apps
  - CI now separates frontend and backend verification while respecting workspace ordering
  - env/config validation remains app-local rather than being centralized into shared runtime code
- Across Epic 5 so far, the safest pattern has been small, explicit seams over heavyweight abstractions. Story 5.5 should continue that approach by tightening ownership and verification, not by rebuilding the platform contract stack.
- Story 5.3 and 5.4 both favored explicit startup and API guarantees over hidden fallback behavior. Apply that same discipline here: no implicit lifecycle meaning, no undocumented schema drift, and no silent divergence between Swagger and runtime parsing.

### Git Intelligence Summary

- Recent commit titles are too coarse to give implementation-level guidance, so the current repository state is the most reliable source of truth.
- The current codebase already shows:
  - shared contracts are real and in active use
  - backend lifecycle logic is already centralized enough to extend rather than replace
  - Swagger is enabled, but its published schema fidelity likely lags the runtime Zod contracts
  - the lifecycle schema ownership is slightly misplaced today, creating a good target for this story

### Project Structure Notes

- Recommended implementation order:
  1. Normalize lifecycle schema ownership inside `packages/shared-contracts/src/requests/` and update imports safely.
  2. Tighten backend lifecycle/public-status ownership so request, ops, and support modules consume the same request-domain rules.
  3. Improve Swagger publication to reflect the actual wrapped contract surface.
  4. Add drift-detection tests and any focused verification command.
  5. Add concise extension-boundary documentation.
- Preserve current architecture assumptions:
  - frontend and backend deploy separately
  - shared contracts remain the cross-app boundary
  - Prisma and persistence ownership remain API-only
  - request lifecycle meaning remains backend-owned

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 5.5: Protect Future Expansion Through Stable Contracts and Lifecycle Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Development Workflow Integration]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-4-validate-environment-configuration-and-deployment-readiness.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/common/api-envelope.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.types.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/health/health.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/app.bootstrap.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/domain/request-state-machine.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-22: Loaded the BMAD create-story workflow, template, checklist, and project config from `_bmad/bmm/config.yaml`.
- 2026-04-22: Read `_bmad-output/implementation-artifacts/sprint-status.yaml` fully and selected `5-5-protect-future-expansion-through-stable-contracts-and-lifecycle-boundaries` as the first story still in `backlog`.
- 2026-04-22: Reviewed Epic 5 story details in `_bmad-output/planning-artifacts/epics.md` and extracted acceptance criteria plus cross-story context.
- 2026-04-22: Reviewed architecture guidance for shared contracts, lifecycle ownership, API wrappers, file organization, and workflow integration.
- 2026-04-22: Inspected live repo seams in shared contracts, request lifecycle domain logic, Swagger bootstrap, controller wrappers, workspace scripts, and current file layout.
- 2026-04-22: Identified a likely ownership gap where `RequestLifecycleState` is defined under `health.schemas.ts` despite being a request-domain contract used across modules.
- 2026-04-22: Marked Story 5.5 `in-progress` in sprint tracking and moved lifecycle schema ownership into `packages/shared-contracts/src/requests/request-lifecycle.schemas.ts` while keeping root shared-contract exports stable.
- 2026-04-22: Added backend request lifecycle metadata helpers so ops/support lifecycle labels and intervention derivation both flow through the request domain instead of duplicate local switch statements.
- 2026-04-22: Added shared-contract-backed OpenAPI examples plus explicit response and request-body decorators across auth, health, requests, ops, support, and reference-data controllers.
- 2026-04-22: Replaced remaining raw-string bad-request responses in reference-data and request intake/review endpoints with explicit shared error envelopes.
- 2026-04-22: Added drift checks for shared contract examples, lifecycle metadata, controller error envelopes, and generated `/api/docs-json` output.
- 2026-04-22: Stabilized repo-wide verification by aligning `scripts/test.sh` with the existing in-band backend test commands and updating long-running backend specs to use explicit Jest timeouts.
- 2026-04-22: Verified the story with `pnpm --filter handrix-api test -- src/common/swagger/shared-contract-openapi.spec.ts`, `pnpm --filter handrix-api test -- src/modules/requests/domain/request-lifecycle-metadata.spec.ts`, `pnpm --filter handrix-api test -- src/modules/reference-data/reference-data.controller.spec.ts src/modules/requests/requests.controller.spec.ts`, `pnpm --filter handrix-api exec jest --config ./test/jest-e2e.json -t "publishes shared contract examples through the generated OpenAPI document"`, `pnpm --filter handrix-api test:contracts`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

### Completion Notes List

- Moved `RequestLifecycleState` ownership into the shared request-contract area, updated dependent shared schemas, and kept the workspace export surface stable through `@handrix/shared-contracts`.
- Added request-domain lifecycle metadata helpers and routed ops/support lifecycle labels plus intervention derivation through that backend-owned seam instead of duplicate service-local logic.
- Added explicit shared envelope examples and request-body examples to Swagger for auth, health, reference-data, requests, ops, and support routes, then validated those examples against the shared Zod contracts.
- Tightened runtime contract enforcement by replacing remaining raw-string bad-request responses in reference-data and request intake/review handlers with structured shared error envelopes.
- Added a focused backend `test:contracts` command, a generated OpenAPI e2e check, and targeted controller/spec coverage for lifecycle metadata and contract drift.
- Updated repo-level test execution to use the stable in-band backend test commands and raised timeouts for long-running persistence-backed backend specs so the full regression suite completes reliably.

### File List

- _bmad-output/implementation-artifacts/5-5-protect-future-expansion-through-stable-contracts-and-lifecycle-boundaries.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- README.md
- apps/handrix-api/package.json
- apps/handrix-api/src/common/swagger/shared-contract-openapi.spec.ts
- apps/handrix-api/src/common/swagger/shared-contract-openapi.ts
- apps/handrix-api/src/modules/auth/auth.controller.ts
- apps/handrix-api/src/modules/auth/auth.service.spec.ts
- apps/handrix-api/src/modules/health/health.controller.ts
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.spec.ts
- apps/handrix-api/src/modules/reference-data/reference-data.controller.ts
- apps/handrix-api/src/modules/requests/domain/request-lifecycle-metadata.spec.ts
- apps/handrix-api/src/modules/requests/domain/request-lifecycle-metadata.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/support/support.controller.ts
- apps/handrix-api/src/modules/support/support.service.spec.ts
- apps/handrix-api/src/modules/support/support.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- packages/shared-contracts/src/health/health.schemas.ts
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-request-detail.schemas.ts
- packages/shared-contracts/src/ops/ops-status-update.schemas.ts
- packages/shared-contracts/src/requests/request-lifecycle.schemas.ts
- packages/shared-contracts/src/support/support-request-detail.schemas.ts
- scripts/test.sh

### Change Log

- 2026-04-22: Implemented Story 5.5 contract hardening, Swagger example publication, lifecycle boundary consolidation, drift tests, and verification script stabilization.
