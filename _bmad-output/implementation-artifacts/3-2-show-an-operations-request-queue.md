# Story 3.2: Show an Operations Request Queue

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations coordinator,
I want to see a queue of incoming service requests,
so that I can quickly understand what needs attention and act in priority order.

## Acceptance Criteria

1. Given authenticated operations staff enter the internal dashboard, when the request queue loads, then they can see active incoming requests in a fast-scanning queue view, and each queue item shows issue type, address summary, current state, received time, and assignment status.
2. Given the operations queue contains requests in different conditions, when the coordinator scans the list, then requests needing prompt action are distinguishable from already-assigned or blocked requests, and the presentation supports quick triage without opening every record first.
3. Given the queue is accessed during ongoing request activity, when new data is fetched, then the queue updates reliably without losing clarity or creating contradictory lifecycle visibility, and performance is sufficient for timely operational intervention.

## Tasks / Subtasks

- [x] Add a protected ops queue read model and endpoint in the NestJS API (AC: 1, 2, 3)
  - [x] Extend `apps/handrix-api/src/modules/ops/` with a queue-oriented read service/controller method under the existing ops auth boundary rather than exposing internal queue data from `requests`.
  - [x] Define a shared queue response contract in `packages/shared-contracts/src/` so the frontend and backend use one shape for queue items, list metadata, and any refresh timestamp.
  - [x] Read from the existing file-backed request store and return queue-safe summaries derived from persisted request data instead of introducing Prisma, new persistence layers, or assignment write flows early.
  - [x] Filter or segment the list to represent active operational work clearly, while preserving enough blocked or clarification-needed states for triage visibility.

- [x] Map current request lifecycle data into queue-specific triage presentation (AC: 1, 2)
  - [x] Derive queue item state labels from the existing request lifecycle and public-status history without changing the customer-facing lifecycle model introduced in Epic 2.
  - [x] Show issue type, address summary, current state, received time, and assignment status for each item, using explicit textual labels rather than color-only cues.
  - [x] Choose and document a stable MVP assignment-status rule for requests that are not yet assigned, since a true assignment model is scheduled for Story 3.4.
  - [x] Sort the queue in a way that supports quick triage, favoring the most actionable or newest requests without hiding blocked work that still needs visibility.

- [x] Replace the Story 3.1 placeholder ops screen with a real fast-scanning queue UI (AC: 1, 2, 3)
  - [x] Build the queue in `apps/handrix-web/src/features/ops-queue/` on top of the existing protected `/ops/queue` route and session-verification flow.
  - [x] Implement a reusable queue item presentation that follows the UX anatomy for issue type, urgency cue, address summary, current state, time received, and assignment status.
  - [x] Preserve the direct internal tone of the ops area and keep the screen distinct from the customer-facing trust/reassurance UX.
  - [x] Keep the page readable at mobile and desktop widths, with strong contrast, keyboard focus behavior, and clear empty/loading/error states.

- [x] Add reliable refresh behavior for ongoing queue activity (AC: 3)
  - [x] Refresh queue data in place on a short, calm interval or equivalent revalidation pattern without fully resetting the screen.
  - [x] Surface refresh timing or updated-at information clearly enough that operators trust what they are seeing.
  - [x] Avoid contradictory or jarring UI changes when the queue updates, especially if item ordering changes because of new requests or state changes.
  - [x] Keep the implementation lightweight and local to the ops feature unless there is already an established shared query utility worth reusing.

- [x] Protect the boundary between queue scanning and later Epic 3 stories (AC: 1, 2, 3)
  - [x] Do not pull full request-detail rendering from Story 3.3 into this story.
  - [x] Do not implement assignment mutations or provider-selection workflows from Story 3.4 here.
  - [x] If queue items become clickable, keep the navigation seam minimal and safe without implying detail capabilities that do not exist yet.
  - [x] Preserve the existing anonymous customer tracking flow and the protected ops auth flow without cross-contaminating their storage or contracts.

- [x] Add automated coverage for queue loading, protected access, and refresh behavior (AC: 1, 2, 3)
  - [x] Add backend tests for the protected queue endpoint covering authorized access, unauthorized/forbidden access, and lifecycle-to-queue mapping.
  - [x] Add backend tests that exercise ordering/filtering expectations against realistic persisted request fixtures from the current request store model.
  - [x] Add frontend tests for queue loading, empty/error states, and periodic refresh behavior on the `/ops/queue` route.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 3.1 already established the internal auth boundary and protected `/ops/queue` route. Story 3.2 should layer the actual queue onto that seam instead of replacing it.
- The current backend does not yet have a dedicated dispatch module, Prisma persistence, or an assignment data model. The safest path is to build a queue read model from the existing `RequestStoreService` records and keep any assignment status MVP-simple until Story 3.4 introduces true assignment ownership.
- The current request store already preserves the main operational signals this story needs: `issueLabel`, `serviceLocation`, `lifecycleState`, `publicStatus`, `createdAt`, and append-only `history`. Reuse those fields rather than creating duplicate status sources.
- Queue presentation must stay aligned with the lifecycle truth that powers customer tracking. Internal triage labels can be richer, but they should be derived from the same request record so ops and customer views do not drift.

### Technical Requirements

- Keep backend authorization in the existing ops/auth seam:
  - protected queue APIs stay under `apps/handrix-api/src/modules/ops/`
  - reuse `InternalAuthGuard` and `InternalRolesGuard`
  - do not expose internal queue summaries through public `requests` endpoints
- Reuse the current file-backed request store for the queue read path:
  - use `RequestStoreService`
  - do not introduce a second source of request truth
  - do not add database-only abstractions before Story 5.1
- Keep contracts shared when both apps consume them:
  - add queue item/list schemas to `packages/shared-contracts/src/`
  - keep JSON `camelCase`
  - continue using the shared `{ data, meta? }` / `{ error: { ... } }` API envelope conventions
- Make queue-state mapping explicit and deterministic:
  - define how each existing `RequestLifecycleState` appears in ops triage
  - define how assignment status is represented before true assignments exist
  - preserve ISO 8601 timestamps in API payloads and format them only at the UI edge
- Keep refresh behavior trustworthy:
  - update in place
  - do not blank the queue on every refetch
  - ensure loading and refresh indicators are calm and operationally legible

### Architecture Compliance

- Follow the architecture boundary that says:
  - `requests` owns request creation, lifecycle transitions, and public-status projection
  - `ops` owns queue-oriented orchestration surfaces
  - shared Zod contracts define request/response boundaries between apps
- Use the existing Epic 3 structure already in the repo:
  - backend registration remains through `apps/handrix-api/src/app.module.ts`
  - frontend ops flow remains in `apps/handrix-web/src/features/ops-queue/`
  - the current app-level path handling in `apps/handrix-web/src/app/App.tsx` is still manual, not full React Router
- Do not treat this story as permission to introduce the future architecture pieces ahead of schedule:
  - no Prisma queue repository yet
  - no dispatch write workflow yet
  - no support-module functionality yet
- Keep public/internal status alignment intact:
  - internal queue labels may aid triage
  - customer-facing timeline/status behavior from Epic 2 must remain backend-owned and unchanged

### Library / Framework Requirements

- Use the existing project stack already present in the repo:
  - React 19 + Vite on the frontend
  - NestJS 11 on the backend
  - TypeScript across the workspace
  - pnpm workspace scripts for validation
- Reuse the current testing approach:
  - Jest/Nest testing patterns for API and service coverage
  - Vitest + React Testing Library for frontend behavior
- Prefer extending current local app patterns over introducing major new libraries only for this queue story.

### UX / Interaction Guardrails

- Match the UX definition for the Operations Request Queue Item:
  - issue type
  - urgency cue
  - address summary
  - current state
  - time received
  - assignment status
- Make triage scanning fast:
  - distinguish new, clarification-needed, assignable, assigned, blocked, or unavailable conditions with clear text and hierarchy
  - surface only the information needed for first-pass operational triage
  - avoid requiring coordinators to open every request just to know what is urgent
- Keep accessibility strong:
  - readable density and contrast
  - keyboard focus for queue items and controls
  - no color-only meaning
- Keep refresh behavior calm:
  - use inline refresh signals or updated-at copy
  - avoid full-screen spinners once the queue has loaded
  - preserve orientation when new data arrives

### Testing Requirements

- Backend coverage should prove:
  - ops-authenticated users can load the queue
  - unauthenticated requests are rejected
  - non-ops roles are forbidden
  - lifecycle and history inputs map to the expected queue state/priority presentation
- Frontend coverage should prove:
  - the protected queue route loads queue data after session verification
  - loading, empty, and error states render clearly
  - queue refresh updates content in place without dropping the whole screen
  - the placeholder Story 3.1 message is replaced by real queue content
- Regression coverage should confirm:
  - public request creation and tracking still work without staff auth
  - ops session storage remains separate from anonymous tracking storage

### Previous Story Intelligence

- Story 3.1 created the protected route, ops session API, and internal auth storage split. That is the intended foundation for this queue story; reusing it reduces risk and keeps the Epic 3 boundary clean.
- The previous story also noted that the repo still lacks router-heavy internal navigation and richer ops modules. Story 3.2 should respect that and stay focused on queue visibility rather than broad internal-app restructuring.
- Epic 2 established a strong pattern of backend-owned lifecycle truth plus customer-safe projections. Story 3.2 should preserve that pattern by deriving queue summaries from persisted request records rather than hand-maintained frontend state.
- Current codebase reality matters more than aspirational architecture here: the live source tree already contains `auth`, `ops`, `requests`, and a file-backed request store, so this story should extend those seams rather than inventing parallel ones.

### Git Intelligence Summary

- Recent commit history remains sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so commit titles still add little implementation guidance.
- The strongest continuity signals come from the current source tree:
  - `apps/handrix-api/src/modules/ops/ops.controller.ts` currently exposes only a protected session check
  - `apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx` is an explicit placeholder for Story 3.2
  - `apps/handrix-api/src/modules/requests/request-store.service.ts` already contains the persisted request fields needed to build queue summaries

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/modules/ops/`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/app.module.ts` only if new providers/modules must be registered
- Recommended frontend touch points:
  - `apps/handrix-web/src/features/ops-queue/`
  - `apps/handrix-web/src/app/App.tsx` only if route handling needs a minimal extension
  - `apps/handrix-web/src/styles/globals.css` if queue-specific styling is added to the existing visual system
- Recommended shared-contract touch points:
  - `packages/shared-contracts/src/`
  - `packages/shared-contracts/src/index.ts`
- Avoid these structural mistakes:
  - adding queue endpoints to public request controllers
  - creating a second request-summary model only on the frontend
  - overbuilding assignment persistence before Story 3.4
  - folding Story 3.3 detail-view scope into this queue story

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.2: Show an Operations Request Queue]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Request Queue Item]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-1-enable-operations-staff-authentication-and-access.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/ops/ops.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/app.module.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 3.2 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Loaded BMAD config, create-story workflow/template/checklist, sprint tracking, and the Epic 3 planning artifacts.
- 2026-04-20: Analyzed Story 3.1 to capture the current ops-auth boundary, protected route behavior, and implementation carry-forward notes.
- 2026-04-20: Reviewed the current repo seams in `ops`, `requests`, shared contracts, and the frontend ops placeholder to ground Story 3.2 in the live codebase.
- 2026-04-20: Created this implementation-ready story artifact and updated sprint tracking to `ready-for-dev`.
- 2026-04-20: Marked Story 3.2 as `in-progress`, added shared ops queue contracts, implemented an `OpsService` queue read model, and exposed a protected `GET /ops/queue` endpoint.
- 2026-04-20: Replaced the placeholder ops queue screen with a live queue UI, summary cards, empty/error states, and in-place polling using feature-local API helpers.
- 2026-04-21: Added backend queue service/controller coverage plus frontend queue screen tests, then verified the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm --filter handrix-api test:e2e`.

### Completion Notes List

- Implemented a protected operations queue backend path with shared Zod contracts, deterministic lifecycle-to-queue mapping, summary counts, and queue ordering derived from the existing file-backed request store.
- Replaced the placeholder `/ops/queue` experience with a real fast-scanning queue UI that shows issue, address, state, assignment status, timestamps, empty/loading/error states, and in-place refresh feedback.
- Added backend and frontend tests for queue mapping, controller envelope behavior, app-level ops login flow, queue screen rendering, refresh behavior, and preserved e2e regression coverage for the rest of the API.
- Verified the complete story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm --filter handrix-api test:e2e`.

### File List

- _bmad-output/implementation-artifacts/3-2-show-an-operations-request-queue.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/auth/internal-auth.guard.spec.ts
- apps/handrix-api/src/modules/ops/ops.controller.spec.ts
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.module.ts
- apps/handrix-api/src/modules/ops/ops.service.spec.ts
- apps/handrix-api/src/modules/ops/ops.service.ts
- apps/handrix-api/src/modules/requests/requests.module.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-api.ts
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.test.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/index.ts
- packages/shared-contracts/src/ops/ops-queue.schemas.ts

### Change Log

- 2026-04-21: Implemented Story 3.2 with a protected ops queue API, shared queue contracts, live queue UI, polling-based refresh, and automated backend/frontend coverage.
