# Story 4.3: Show Support the Full Request Context

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support agent,
I want to see request history, current status, prior customer guidance, and operational notes,
so that I can understand the situation before replying.

## Acceptance Criteria

1. Given a support agent opens a request, when the request detail view loads, then the workspace shows the current public and internal status context, request history, and fulfillment details relevant to support, and the information is organized for fast situational understanding.
2. Given the customer has already received guidance, expectation-setting, or recovery messaging, when support reviews the request, then the agent can see what the customer has already been told, and the context is sufficient to avoid contradictory reassurance.
3. Given support context depends on operations and lifecycle history, when the request detail is displayed, then prior meaningful transitions and notes are visible in ordered form, and the data remains consistent with the single request source of truth.

## Tasks / Subtasks

- [x] Expand the protected support request-detail read model instead of creating a second support-detail route or screen (AC: 1, 2, 3)
  - [x] Keep `GET /support/requests/:publicId` in `apps/handrix-api/src/modules/support/support.controller.ts` as the single detail endpoint for support. Do not add `/support/request-context`, `/support/history`, or a parallel controller surface.
  - [x] Extend the shared support detail contract so the existing endpoint can return full support context while preserving the current success/error envelope shape from Story 4.2.
  - [x] Continue to enforce `@UseGuards(InternalAuthGuard, InternalRolesGuard)` and `@InternalRoles('support')` on the route. Support read scope stays protected and support-only.

- [x] Add a support-scoped full-context response shape backed by persisted request data already in the system of record (AC: 1, 2, 3)
  - [x] Update `packages/shared-contracts/src/support/support-request-detail.schemas.ts` so the response includes the fields support now needs in addition to the existing minimal snapshot: request identity, service location, current state, ordered history, prior customer-visible guidance/expectations, fulfillment owner context, and intervention summary if present.
  - [x] Prefer support-owned or neutral shared-contract primitives. Do not import `ops-*` response types directly into support contracts or the support UI. If a shape is truly shared, extract a neutral primitive under `packages/shared-contracts/src/requests/` or `src/support/`.
  - [x] Recommended additions:
    - `classification` and `intakeAnswers` only if they are required to make the support view understandable without guessing.
    - `customerContext` showing persisted `shownContainmentGuidance` and `shownRequestReviewSummary`.
    - `assignment` summary with current owner label, owner type, assigned timestamp, and note if present.
    - `intervention` summary and `history` entries with transition details, actor type, timestamp, change summary, optional intervention marker, and customer snapshot.
  - [x] Do not expose tracking credentials, idempotency keys, request fingerprints, raw internal ids, or mutation affordances.

- [x] Extend `SupportService.getRequestDetail()` to project the full support context from `RequestStoreService` without inventing a second source of truth (AC: 1, 2, 3)
  - [x] Keep `RequestStoreService.getByPublicId()` as the read seam. Do not read the file store directly from controllers or the frontend.
  - [x] Reuse the persisted request fields that already exist today in `apps/handrix-api/src/modules/requests/request-store.service.ts`: `answers`, `classification`, `assignment`, `customerContext`, and append-only `history`.
  - [x] Build the detail response in `apps/handrix-api/src/modules/support/support.service.ts` using backend-owned lifecycle/public-status presentation, not frontend-derived interpretations.
  - [x] Preserve a support-specific scope: no `availableTransitions`, no assignment write controls, no status mutation helpers, and no manual follow-up write path in this story.

- [x] Expand the existing support detail screen for fast support triage and context review (AC: 1, 2, 3)
  - [x] Update `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx` to replace the Story 4.2 placeholder with a structured, scan-friendly detail layout.
  - [x] Keep the current verify-session-then-load-detail flow, `AbortController` cleanup, and back/search navigation established in Story 4.2.
  - [x] Organize the page into clear sections such as request snapshot, customer-visible context, fulfillment / assignment context, and request history.
  - [x] Render customer-visible guidance and expectation-setting from persisted snapshots, not from freshly recomputed reference data in the browser.
  - [x] Show history in chronological order that is easy for support to read quickly; if the backend returns oldest-first, render it consistently as-is and label the section clearly. Do not silently re-sort into a conflicting interpretation on the client.

- [x] Preserve story boundaries between support visibility, support explanation, and support intervention (AC: 1, 2, 3)
  - [x] Do not implement new explanation-specific helper copy for delayed/blocked/unavailable scenarios beyond presenting the stored context. Rich explanation guidance belongs to Story 4.4.
  - [x] Do not add buttons or APIs for manual outreach, note entry, clarification requests, reassignment, or lifecycle changes. Those write actions belong to Story 4.5.
  - [x] Do not collapse support into the ops detail view or reuse ops routes for convenience. Support and ops remain separate features even when the underlying request data overlaps.

- [x] Add automated coverage for the richer support detail payload and UI while protecting current support search behavior (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/support/support.controller.spec.ts` for the expanded detail response, not-found handling, and role isolation.
  - [x] Extend `apps/handrix-api/src/modules/support/support.service.spec.ts` with realistic persisted-request fixtures that prove customer context, assignment note visibility, intervention/history mapping, and omission of sensitive fields.
  - [x] Update `apps/handrix-api/test/app.e2e-spec.ts` so `GET /support/requests/:publicId` still returns 200 for a support token, 403 for ops, and 401 for missing/invalid auth after the response expansion.
  - [x] Extend `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx` and `apps/handrix-web/src/app/App.test.tsx` for the richer layout, session-expiry handling, and back navigation regression safety.
  - [x] Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 4.2 already created the protected seam support needs: `GET /support/requests/:publicId`, `loadSupportRequestDetail(...)`, and `SupportRequestDetailScreen`. Story 4.3 should deepen that seam, not bypass it.
- The live codebase already persists most of the support context required here in the request store. `PersistedServiceRequest` includes `answers`, `classification`, `assignment`, `customerContext`, and append-only `history`, so the main implementation risk is response design and presentation discipline, not missing raw data.
- The acceptance criteria require consistency with the single request source of truth. That means support context must come from the stored request record and stored customer snapshots, not from ad hoc frontend recomputation or a new support-only cache.
- Support’s job here is visibility and alignment. The screen should help an agent understand what happened and what the customer has already been told before they reply. It should not yet tell them exactly how to explain every delay state in polished language; that is Story 4.4.
- Story 4.5 will add manual follow-up and intervention actions. Keep this story read-only even if the UI layout leaves obvious room for future actions.

### Architecture Compliance

- `architecture.md` defines separate internal API boundaries for `ops` and `support`. Keep the work inside `apps/handrix-api/src/modules/support/` and `apps/handrix-web/src/features/support-request-view/`.
- `architecture.md` also states that support reads the same underlying request history through support-scoped APIs. Reuse `RequestStoreService` and the existing persisted history/customer snapshot model.
- Shared Zod contracts remain the frontend/backend boundary. Add or extract schemas in `packages/shared-contracts/src/` instead of duplicating ad hoc TypeScript-only interfaces inside the app code.
- Public/internal status mapping stays backend-owned. The support UI should display labels/details supplied by the backend, not derive lifecycle meaning from raw enums.

### Library / Framework Requirements

- No new runtime dependencies are needed.
- Keep the current stack and patterns already present in the repo:
  - NestJS 11 controllers/services/guards for backend support APIs.
  - Zod 4 shared schemas in `@handrix/shared-contracts`.
  - React 19 + Vite on the frontend support feature.
  - Jest + Supertest for backend specs/e2e, Vitest + Testing Library for frontend tests.
- Keep using the existing shared API envelope helpers and `SupportAuthError` handling patterns from Story 4.1 / 4.2.

### Testing Requirements

- Backend coverage must prove:
  - Expanded `GET /support/requests/:publicId` responses include the full support context fields expected by Story 4.3.
  - Ordered history entries expose lifecycle/public-status transition context, timestamps, actor type, change summary, and customer snapshot details.
  - Persisted customer-visible guidance/expectation data is returned from stored snapshots, not omitted.
  - Sensitive fields remain absent from the response: tracking credentials, idempotency keys, request fingerprints, internal ids, and any write-control metadata.
  - 404 / 403 / 401 behavior from Story 4.2 remains unchanged.
- Frontend coverage must prove:
  - The support detail screen renders the richer sections without breaking the existing session verification flow.
  - Customer-visible context and request history are readable and clearly labeled.
  - Error handling, back navigation, and sign-out behavior continue to work.
  - Support search-to-detail navigation from Story 4.2 still works after the detail screen expansion.

### UX / Interaction Guardrails

- Follow the existing internal visual language already used by ops/support surfaces. Reuse the current `ops-*` utility classes in `apps/handrix-web/src/styles/globals.css`; do not create a brand-new support stylesheet unless the existing classes truly cannot express the layout.
- The screen should optimize for fast situational understanding. Lead with current state and customer-visible context, then show deeper operational history.
- Statuses must be explicit in text, not color-only. Show both labels and supporting detail for internal lifecycle state and public status.
- Guidance and expectation sections should make it unmistakable what the customer actually saw. If a snapshot is missing, render a calm explicit fallback rather than pretending the customer saw nothing.
- History copy should stay operational and factual. Avoid speculative or emotionally polished explanation text in this story.

### Previous Story Intelligence

- From Story 4.2:
  - The current support detail route and screen are intentionally narrow. Story 4.2 explicitly reserved history and prior guidance for Story 4.3, so expanding the same endpoint/screen is the correct continuation.
  - The support frontend already verifies the session before loading detail and routes 401/403 through `onSessionExpired`. Preserve that exact safety path.
  - Support storage is isolated under `handrix.support.session`; do not touch ops or customer storage keys.
- From Story 3.3:
  - The ops full-detail story is the closest architectural mirror for how to surface history, customer context, and operational state from the persisted request record.
  - Do not copy the ops response wholesale. Support needs visibility, not assignment controls or lifecycle transition options.
- From Epic 2 retrospective:
  - Keeping lifecycle truth in the backend prevented frontend drift. Continue that pattern here by projecting support detail in the backend from stored request data and shared contracts.

### Git Intelligence Summary

- Recent commit titles remain too coarse to add design guidance, so the strongest continuity signals are the current repo seams:
  - `apps/handrix-api/src/modules/support/support.controller.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
- The key implementation opportunity is reuse. The repo already has the route, auth, feature folder, tests, and persisted data model this story needs.

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
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding a second support detail route or a support-only duplicate of ops request history APIs
  - importing `ops-*` contracts directly into support screens
  - reconstructing prior customer guidance from current reference data instead of stored snapshots
  - sneaking Story 4.4 explanation logic or Story 4.5 mutation controls into this read-only story

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 4: Equip Support for Trust Recovery and Request Intervention]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 4.3: Show Support the Full Request Context]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/4-2-let-support-search-and-open-individual-requests.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-3-let-operations-review-full-request-details.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/epic-2-retrospective-2026-04-20.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/support/support.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/support/support-request-detail.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/ops/ops-request-detail.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-21: Selected `4-3-show-support-the-full-request-context` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded BMAD create-story skill workflow, template, checklist, config, sprint status, Epic 4 story definitions, and previous story artifact 4.2.
- 2026-04-21: Reviewed the live support code seams in the backend, shared contracts, frontend detail screen, and request-store persistence model.
- 2026-04-21: Derived the key guardrail for Story 4.3: expand the existing support detail route/screen with stored request context while preserving read-only scope and support-role isolation.
- 2026-04-21: Created this implementation-ready story artifact and updated sprint tracking to `ready-for-dev`.
- 2026-04-21: Wrote failing support controller/service/detail-screen tests first to pin the richer request-detail payload and UI expectations.
- 2026-04-21: Expanded the shared support detail schema, `SupportService` read model, and `SupportModule` imports to project full read-only support context from `RequestStoreService` plus `ReferenceDataService`.
- 2026-04-21: Replaced the support detail placeholder UI with scan-friendly sections for current state, fulfillment context, intake answers, customer-visible snapshots, and chronological request history.
- 2026-04-21: Rebuilt `@handrix/shared-contracts` and validated with `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts` (e2e required sandbox escalation because Supertest needed to bind a local server).

### Completion Notes List

- Expanded `GET /support/requests/:publicId` to return a full support-scoped detail model with classification, labeled intake answers, persisted customer-visible context, assignment summary, intervention summary, and ordered history while keeping the route read-only and support-only.
- Added support-specific shared-contract schemas for the richer detail response without pulling in ops mutation surfaces or leaking tracking credentials, idempotency keys, request fingerprints, or raw internal ids.
- Updated `SupportService` to reuse the existing request-store source of truth and `ReferenceDataService` question labels instead of recomputing frontend-only interpretations.
- Replaced the placeholder support detail screen with a structured internal view that keeps current state, fulfillment context, customer-visible guidance/expectations, and request history in one scan-friendly layout.
- Extended backend/frontend/unit/app/e2e coverage for the new response shape and verified the full workspace validation suite successfully.

### File List

- _bmad-output/implementation-artifacts/4-3-show-support-the-full-request-context.md
- apps/handrix-api/src/modules/support/support.controller.spec.ts
- apps/handrix-api/src/modules/support/support.module.ts
- apps/handrix-api/src/modules/support/support.service.spec.ts
- apps/handrix-api/src/modules/support/support.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx
- apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx
- packages/shared-contracts/src/support/support-request-detail.schemas.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-04-21: Implemented Story 4.3 by expanding support request detail contracts, backend mapping, UI rendering, and regression coverage. Validation passed via `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and escalated `pnpm --filter handrix-api test:e2e -- app.e2e-spec.ts`.
