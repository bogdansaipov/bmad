# Story 3.1: Enable Operations Staff Authentication and Access

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations staff member,
I want secure access to the internal operations area,
so that only authorized users can review and manage customer requests.

## Acceptance Criteria

1. Given an internal user has an operations role, when they access the operations login flow with valid credentials, then they can authenticate successfully and enter the operations area, and their session is authorized according to the defined internal access model.
2. Given a user is not authenticated or does not have the required role, when they attempt to access operations routes or APIs, then access is denied, and no protected request-management data is exposed.
3. Given operations authentication is enabled, when the backend enforces access control, then operations access is protected through role-based authorization rather than frontend-only gating, and the implementation supports future separation of ops and support privileges.

## Tasks / Subtasks

- [x] Establish the internal-auth foundation in the NestJS API without pulling full user persistence forward from Epic 5 (AC: 1, 2, 3)
  - [x] Create `apps/handrix-api/src/modules/auth/` with a focused `AuthModule`, controller, service, JWT strategy/guard, and role guard/decorator that can protect internal modules at the API layer.
  - [x] Use JWT-based internal auth with explicit role claims for at least `ops` now and a clear extension path for `support` later, matching the architecture’s internal access model.
  - [x] Keep the MVP credential source intentionally lean and configurable for now, such as environment-backed seeded internal credentials or another small backend-owned seam, instead of inventing a full internal-user CRUD system before Story 5.1.
  - [x] Add any required backend dependencies for the chosen NestJS JWT approach in the workspace, and document the new env requirements in the API config surface.

- [x] Add a backend login flow and authenticated session shape for internal ops users (AC: 1, 3)
  - [x] Introduce a login endpoint under the auth module that accepts validated credentials and returns a consistent `{ data }` success envelope with the issued token and minimal authenticated user/session metadata needed by the frontend.
  - [x] Keep JSON contracts `camelCase`, timestamps ISO 8601, and error responses aligned to the existing shared API conventions already used in `requests.controller.ts`.
  - [x] Decide whether the login contract belongs in `packages/shared-contracts/src/` now or can remain API-local for this story; if it is used by both apps, place it in shared contracts rather than duplicating frontend types.

- [x] Protect internal ops APIs through backend authorization, not just frontend routing (AC: 2, 3)
  - [x] Add a protected ops-only API seam in `apps/handrix-api/src/modules/ops/` or another clearly internal location that proves auth/role enforcement works before Story 3.2 builds the real queue.
  - [x] Ensure unauthenticated requests receive a consistent unauthorized response and non-ops roles receive a forbidden response without leaking request-management payloads.
  - [x] Wire guards at the controller/route level so the next operations stories can build on the same authorization boundary instead of inventing separate checks.

- [x] Introduce the minimum frontend operations access flow needed for authenticated entry to the internal area (AC: 1, 2)
  - [x] Add an operations login feature in `apps/handrix-web/src/features/ops-queue/` or a closely related internal-access feature area, keeping auth API code separate from UI components.
  - [x] Add frontend routing for an ops login screen and a protected ops area entry point, following the architecture direction toward React Router while keeping the existing customer flow stable and low-risk.
  - [x] Store the internal session token only as long as needed for MVP internal access, keep logout/session-clear behavior explicit, and do not mix internal auth state with anonymous customer tracking storage.
  - [x] When a user is unauthenticated or lacks the right role, redirect or block access calmly without exposing protected data in the UI or network flow.

- [x] Preserve clean separation between customer tracking access and internal auth (AC: 2, 3)
  - [x] Do not reuse the anonymous `request-tracking` credential model for internal staff authentication.
  - [x] Keep internal auth boundaries limited to Epic 3/Epic 4 surfaces so the customer-facing intake, confirmation, and tracking experience remains unchanged.
  - [x] Ensure backend guards do not accidentally block the public `requests` endpoints that rely on the signed tracking token rather than staff login.

- [x] Add automated coverage for auth success, denial, and role enforcement (AC: 1, 2, 3)
  - [x] Add backend tests for the login flow, JWT validation, role guard behavior, and protected ops endpoint access from authenticated vs unauthenticated callers.
  - [x] Extend e2e or controller-level coverage to verify protected ops APIs deny access without valid auth and accept access with valid ops credentials.
  - [x] Add frontend tests for the operations login screen and protected-route behavior, including invalid credentials and logged-out access.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- This story is the auth boundary story for Epic 3, not the full operations tooling story. The main outcome is a trustworthy internal access seam that Story 3.2 can use for the queue and later stories can reuse for request detail, assignment, and guarded lifecycle updates.
- The architecture is explicit that internal tools use JWT-based auth in NestJS with role-based access control for `ops` and `support`. The current codebase does not yet contain `auth`, `ops`, or `support` modules, so this story should create those seams deliberately rather than scattering authorization logic into the existing `requests` module.
- The current repository still uses a simple file-backed request store and has no internal-user persistence model. For MVP safety, this story should avoid prematurely implementing full user management or database-backed identity unless the implementation naturally introduces only a thin future-compatible seam.
- Epic 2 reinforced a key invariant that must continue here: customer-safe lifecycle visibility stays backend-owned and separate from internal operational access. Internal authentication must not weaken or replace the anonymous customer tracking-token model.

### Technical Requirements

- Backend auth must be the source of truth for internal authorization:
  - protect internal APIs with NestJS guards
  - use explicit role claims
  - do not rely on hidden frontend routes as the main security mechanism
- Preserve future role separation:
  - `ops` must work now
  - the design must allow `support` to authenticate later without redesigning the token or guard model
- Keep the auth/session payload intentionally small:
  - include only what the frontend needs to know the user is authenticated and authorized
  - do not expose internal implementation details or unnecessary user data
- Follow existing API shape conventions:
  - success responses use `{ data, meta? }`
  - error responses use `{ error: { code, message, details?, retryable? } }`
  - JSON stays `camelCase`
- Add explicit environment/config parsing for auth secrets and any MVP internal credentials so startup fails clearly when required auth configuration is missing or invalid.

### Architecture Compliance

- Create backend auth seams in:
  - `apps/handrix-api/src/modules/auth/`
  - `apps/handrix-api/src/modules/ops/` for the first protected operations endpoint or controller surface
- Keep public customer request APIs in `apps/handrix-api/src/modules/requests/`; do not move anonymous tracking or request creation behind staff auth.
- If the login request/response contract is shared across frontend and backend, place it in `packages/shared-contracts/src/` rather than duplicating types in both apps.
- Keep frontend API calls separate from UI in the internal feature area, consistent with the existing feature structure under `apps/handrix-web/src/features/`.
- If React Router is introduced here, keep the migration minimal and focused on enabling the internal auth entry flow without destabilizing the existing customer journey.

### Library / Framework Requirements

- Use the existing stack already chosen by the architecture and present in the repo:
  - React 19 + Vite on the frontend
  - NestJS 11 on the backend
  - TypeScript across the workspace
  - pnpm workspace scripts for validation
- For internal auth, follow the architecture’s JWT direction in NestJS instead of introducing a different auth product or external identity dependency for MVP.
- Reuse the project’s current testing approach:
  - Jest and Nest testing patterns for API/controller/service coverage
  - Vitest and React Testing Library for frontend coverage

### Testing Requirements

- Backend coverage should prove:
  - valid ops credentials can obtain an authenticated session/token
  - invalid credentials are rejected with stable error behavior
  - protected ops routes reject missing or invalid tokens
  - protected ops routes reject authenticated users with the wrong role
- Frontend coverage should prove:
  - the ops login form submits credentials to the backend contract correctly
  - invalid login attempts surface calm, actionable feedback
  - protected ops entry points do not render protected content when the session is missing or cleared
- Regression coverage should confirm:
  - public customer request creation and status lookup remain accessible without staff auth
  - anonymous tracking storage and internal auth storage stay separate

### UX / Interaction Guardrails

- The operations login experience should be direct and utilitarian, not customer-marketing styled.
- Entry to the internal area should feel secure and low-friction for staff, with clear messaging on invalid credentials or expired sessions.
- Unauthorized users should never glimpse queue data, request details, or protected navigation labels that imply access.
- Keep internal auth UX separate from the calm customer tracking experience so support/ops affordances do not leak into public-facing screens.

### Implementation Notes

- A low-risk backend path is:
  - add auth config parsing
  - implement a minimal auth module with JWT issuance and role guards
  - add one protected ops-only controller endpoint that proves the boundary
  - reuse that guard structure for Story 3.2 and later
- A low-risk frontend path is:
  - add a dedicated ops login screen
  - store the issued token in an internal-session seam separate from request-tracking storage
  - gate an ops landing route or placeholder queue entry route behind that session
- The biggest modeling trap is overbuilding identity management too early. This story needs secure internal access and future-compatible role boundaries, not full HR-style user administration.
- The second trap is frontend-only gating. Even if the UI hides internal screens, the real acceptance criteria require backend-enforced authorization.

### Previous Story Learnings

- Epic 2 repeatedly succeeded by keeping backend-owned truth central and using shared contracts to avoid frontend drift. Story 3.1 should keep that pattern by making the API the authority for internal access decisions.
- Story 2.6 showed that the live codebase is a better continuity source than sparse git history. For this story, the most important grounding facts are that the repo currently has only `requests`, `reference-data`, and `health` modules and no auth scaffolding yet.
- The Epic 2 retrospective explicitly recommends treating lifecycle and internal actions as first-class architectural surfaces with stronger invariants as Epic 3 begins. Auth and role checks are part of those invariants.
- The current request-domain code should remain the source of lifecycle truth. Story 3.1 should add access control around future internal actions, not relocate lifecycle behavior into the frontend.

### Git Intelligence Summary

- Visible recent git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so commit titles add little guidance.
- The current source tree is therefore the best implementation guide:
  - `apps/handrix-api/src/app.module.ts` shows only `health`, `reference-data`, and `requests` modules are registered today
  - `apps/handrix-web/src/app/App.tsx` still uses local view state rather than route-based internal navigation
  - `apps/handrix-web/src/lib/env.ts` and `apps/handrix-api/src/config/env.validation.ts` are the current config seams to extend

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/src/app.module.ts`
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/modules/auth/`
  - `apps/handrix-api/src/modules/ops/`
- Recommended frontend touch points:
  - `apps/handrix-web/src/app/`
  - `apps/handrix-web/src/features/ops-queue/` or a nearby internal-access feature seam
  - `apps/handrix-web/src/lib/env.ts`
- Recommended shared-contract touch points if contracts are shared:
  - `packages/shared-contracts/src/`
- There is no `project-context.md` file in the repository, so the planning artifacts and current source tree remain the authoritative sources for this story.
- The main structural risks are:
  - building auth directly inside `requests`
  - creating frontend-only route protection without backend guards
  - coupling internal staff sessions to customer tracking storage or contracts
  - overcommitting to full user persistence before the platform is ready for it

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 3: Enable Operations Dispatch and Lifecycle Control]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 3.1: Enable Operations Staff Authentication and Access]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Operations Journey: Intake to Assignment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-6-preserve-customer-visible-request-history.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/epic-2-retrospective-2026-04-20.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/app.module.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/config/env.validation.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/lib/env.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/package.json]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/package.json]
- [Source: /home/bogdansaipov/Projects/demos/demo1/package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 3.1 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Loaded the BMAD create-story workflow, config, story template, and sprint tracking artifact.
- 2026-04-20: Analyzed Epic 3 requirements, PRD security constraints, UX operations journey, architecture auth/module boundaries, current source tree, and Epic 2 carry-forward learnings.
- 2026-04-20: Created this story artifact and updated sprint tracking so Epic 3 is `in-progress` and Story 3.1 is `ready-for-dev`.
- 2026-04-20: Marked Story 3.1 as `in-progress` and implemented a backend-owned internal auth seam with signed JWT-style tokens, ops role guards, protected ops session verification, and environment-backed seeded staff credentials.
- 2026-04-20: Added shared internal-auth contracts plus a frontend ops login and protected queue-access flow that keeps staff session storage separate from anonymous customer request tracking.
- 2026-04-20: Verified the implementation with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`, then moved the story to `review`.

### Completion Notes List

- Created an implementation-ready story for the first Epic 3 item with explicit backend auth, role-guard, frontend entry-flow, and testing guidance.
- Grounded the story in the current repo state, which does not yet contain `auth`, `ops`, or router-based internal navigation scaffolding.
- Preserved BMAD workflow continuity by carrying forward Epic 2 learnings about backend-owned truth, shared contracts, and lifecycle guardrails.
- Implemented `AuthModule` and `OpsModule` with signed internal-session issuance, environment-backed seeded ops/support accounts, backend role enforcement, and a protected `GET /ops/session` verification seam for later queue work.
- Added shared internal-auth Zod contracts plus frontend operations session storage, auth API helpers, a dedicated login screen, and a protected ops access screen that verifies the backend session before showing internal content.
- Added backend auth service/guard tests, preserved e2e regression coverage, added frontend ops-flow tests, and validated the full workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/3-1-enable-operations-staff-authentication-and-access.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/config/env.validation.ts
- apps/handrix-api/src/modules/auth/auth.controller.ts
- apps/handrix-api/src/modules/auth/auth.module.ts
- apps/handrix-api/src/modules/auth/auth.service.spec.ts
- apps/handrix-api/src/modules/auth/auth.service.ts
- apps/handrix-api/src/modules/auth/internal-auth.guard.spec.ts
- apps/handrix-api/src/modules/auth/internal-auth.guard.ts
- apps/handrix-api/src/modules/auth/internal-auth-token.ts
- apps/handrix-api/src/modules/auth/internal-auth.types.ts
- apps/handrix-api/src/modules/auth/internal-roles.guard.ts
- apps/handrix-api/src/modules/auth/internal-user-credentials.ts
- apps/handrix-api/src/modules/auth/roles.decorator.ts
- apps/handrix-api/src/modules/ops/ops.controller.ts
- apps/handrix-api/src/modules/ops/ops.module.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/app/App.tsx
- apps/handrix-web/src/features/ops-queue/ops-auth-api.ts
- apps/handrix-web/src/features/ops-queue/ops-auth-storage.ts
- apps/handrix-web/src/features/ops-queue/ops-login-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx
- apps/handrix-web/src/features/ops-queue/ops-routes.ts
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/auth/internal-auth.schemas.ts
- packages/shared-contracts/src/common/api-envelope.ts
- packages/shared-contracts/src/index.ts

### Change Log

- 2026-04-20: Implemented Story 3.1 with backend-enforced internal auth, ops role guards, shared auth contracts, a minimal protected ops frontend flow, and full workspace validation.
