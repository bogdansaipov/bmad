# Story 4.1: Enable Support Staff Authentication and Access

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support staff member,
I want secure access to the support workspace,
so that only authorized users can view and assist customer requests.

## Acceptance Criteria

1. Given an internal user has a support role, when they authenticate through the support login flow with valid credentials, then they can enter the support workspace successfully, and their access is limited to the permissions granted for support users.
2. Given a user is unauthenticated or lacks the support role, when they attempt to access support routes or APIs, then the system blocks access, and protected request data remains unavailable.
3. Given support access exists alongside operations access, when authorization is enforced, then role checks occur at the backend layer, and the permission model supports different capabilities for support and operations users (ops users must not reach support-only endpoints and support users must not reach ops-only endpoints).

## Tasks / Subtasks

- [x] Create a dedicated `support` backend module that mirrors the ops boundary pattern (AC: 1, 2, 3)
  - [x] Add `apps/handrix-api/src/modules/support/support.module.ts`, `support.controller.ts`, and `support.service.ts` following the shape of `apps/handrix-api/src/modules/ops/` (constructor-injected service, REST controller, no direct Prisma access from the controller).
  - [x] Register `SupportModule` in `apps/handrix-api/src/app.module.ts` alongside `AuthModule`, `OpsModule`, and the existing request/reference-data/health modules.
  - [x] Protect `SupportController` with `@UseGuards(InternalAuthGuard, InternalRolesGuard)` at the controller level, and decorate each route with `@InternalRoles('support')` — see `ops.controller.ts:33-39` for the exact pattern.
  - [x] Do NOT reuse or extend `OpsController` for support endpoints; the architecture requires separate `ops/` and `support/` module boundaries (see `architecture.md#Service Boundaries` and `#API Boundaries`).

- [x] Add a protected `GET /support/session` verification endpoint that proves the support auth seam is working (AC: 1, 2, 3)
  - [x] Return a shared-envelope success payload shaped like `InternalOpsSession` but scoped to `support`. Add a new `internalSupportSessionSchema` in `packages/shared-contracts/src/auth/internal-auth.schemas.ts` with `scope: z.literal('support')` mirroring `internalOpsSessionSchema` (lines 25-29) and export it from `packages/shared-contracts/src/index.ts`.
  - [x] Payload shape: `{ scope: 'support', message: 'Support access granted.', user: { id, email, displayName, role } }` wrapped in `createSuccessResponse(...)` with `{ generatedAt: new Date().toISOString() }` meta (match `ops.controller.ts:48-64`).
  - [x] Do NOT expose any customer request data from this endpoint. It is an auth-boundary proof only; request search and detail views belong to Story 4.2 and 4.3.

- [x] Prove role isolation between ops and support at the backend layer (AC: 2, 3)
  - [x] An authenticated ops user MUST receive a 403 forbidden from `GET /support/session` (the `InternalRolesGuard` enforces this already when `@InternalRoles('support')` is applied — see `internal-roles.guard.ts`).
  - [x] An authenticated support user MUST receive a 403 forbidden from `GET /ops/session` and all `/ops/*` routes. Verify that existing `ops.controller.ts` already rejects non-`ops` roles (it does, via `@InternalRoles('ops')`); add a regression test covering this case so future changes cannot accidentally grant support users ops access.
  - [x] Unauthenticated callers MUST receive the existing 401 error envelope from `InternalAuthGuard` with no request data leakage.

- [x] Verify the environment-backed support user credential is active and load-bearing (AC: 1)
  - [x] `apps/handrix-api/src/config/env.validation.ts:165-175` already seeds a `support-default-user` via `parseInternalStaffUser({ role: 'support', defaultEmail: 'support@handrix.local', defaultPassword: 'support-demo-pass', ... })`. Do NOT change this contract; it is how support auth is seeded for MVP.
  - [x] Confirm `HANDRIX_SUPPORT_EMAIL`, `HANDRIX_SUPPORT_PASSWORD`, and `HANDRIX_SUPPORT_DISPLAY_NAME` are documented alongside their ops equivalents in any env README or sample env file that exists in the repo. Add them if a sample env file exists and they are missing.
  - [x] Do NOT introduce Prisma models, migrations, or database-backed identity for this story. Story 5.1 owns durable persistence.

- [x] Introduce the minimum frontend support access flow separate from the ops flow (AC: 1, 2)
  - [x] Add a new feature directory `apps/handrix-web/src/features/support-request-view/` per architecture `architecture.md:484` and `#Requirements to Structure Mapping`. Do NOT place support code under `features/ops-queue/`.
  - [x] Create `support-login-screen.tsx` by mirroring `apps/handrix-web/src/features/ops-queue/ops-login-screen.tsx:10-103` with these differences:
    - Default email `support@handrix.local`, default password `support-demo-pass`.
    - Hero copy: "Support access" / "Use an authorized staff account to enter the protected support workspace."
    - Kicker/heading: "Protected sign-in" / "Staff authentication" with helper copy scoped to support.
    - Button label: "Enter support workspace" (signing in state: "Signing in…").
    - Reuse existing `app-shell`, `ops-page`, `panel`, `ops-hero`, `ops-login-panel`, `ops-input`, `ops-field`, `ops-alert`, `primary-button` classes from `apps/handrix-web/src/styles/globals.css`. Do NOT invent new class names or a new stylesheet for this story; visual parity with ops login is intentional.
  - [x] Create `support-auth-api.ts` and `support-auth-storage.ts` in `features/support-request-view/` by mirroring `ops-auth-api.ts` and `ops-auth-storage.ts`:
    - `createInternalSession(...)` can be extracted to a shared helper OR duplicated (duplicate is acceptable for MVP; keep the module independent rather than creating premature coupling with ops).
    - Session storage key MUST be distinct from ops: use `handrix.support.session` (ops uses `handrix.ops.session`). Do NOT share a single session slot between roles — a support user must not auto-authenticate the ops area and vice versa.
    - `loadSupportProtectedSession(accessToken)` must call `GET /support/session` with `Authorization: Bearer <token>` and parse the new `internalSupportSessionSchema` response.
  - [x] Add `support-routes.ts` with the route union `'/support/login' | '/support/workspace'` plus helpers `isSupportPath(pathname)` and `getSupportRoute(pathname)`, mirroring the shape of `ops-routes.ts`.
  - [x] Wire routing in `apps/handrix-web/src/app/App.tsx`:
    - Add `supportSession` state loaded via `loadSupportSession()` (independent from `opsSession`).
    - Add `handleSupportAuthenticated`, `handleSupportLogout`, and `handleSupportSessionExpired` handlers mirroring the existing `handleOps*` handlers (lines 74-90).
    - Add an `isSupportPath(effectivePathname)` branch BEFORE the customer-facing tracking/intake branches. Redirect `/support/workspace` to `/support/login` when `supportSession` is null (same redirect pattern as ops at lines 43-47 and 96).
    - Render `SupportLoginScreen` when unauthenticated on a support path. Render a minimal placeholder `SupportWorkspaceScreen` component when authenticated that calls `loadSupportProtectedSession(session.accessToken)` to verify the backend session and displays the authenticated user's `displayName`. The real search/detail/intervention surfaces come in Stories 4.2–4.5.

- [x] Preserve clean separation between customer, ops, and support access surfaces (AC: 2, 3)
  - [x] Do NOT reuse the anonymous `request-tracking` credential model for support authentication (Epic 2 invariant; repeated from Story 3.1).
  - [x] Do NOT share `handrix.ops.session` storage with support. Support session storage key is `handrix.support.session`.
  - [x] Do NOT introduce backend guards on public `/requests` endpoints — customer intake, confirmation, and tracking remain anonymous and unchanged.
  - [x] An ops user who authenticates through the support login form will succeed at `POST /auth/internal-sessions` (that endpoint is role-agnostic and returns whatever role the matched user has). They MUST be rejected at the next layer: the support workspace screen MUST call `GET /support/session` with their token, receive a 403 forbidden from `InternalRolesGuard` (because the token's role is `ops`, not `support`), clear the stored session, and redirect to `/support/login` with a calm error message such as "This account does not have support access." Frontend role-hiding alone is not sufficient; the 403 from the backend is the authoritative signal.

- [x] Add automated coverage for support auth success, denial, and role isolation (AC: 1, 2, 3)
  - [x] Backend: add `apps/handrix-api/src/modules/support/support.controller.spec.ts` proving:
    - A valid support token grants access to `GET /support/session`.
    - A valid ops token is rejected with 403 from `GET /support/session`.
    - Missing or invalid Bearer token returns 401.
    - Mirror the test shape used in `apps/handrix-api/src/modules/auth/internal-auth.guard.spec.ts` and `apps/handrix-api/src/modules/ops/ops.controller.spec.ts`.
  - [x] Backend: extend `apps/handrix-api/src/modules/auth/auth.service.spec.ts` with a test that logging in with the seeded support credentials returns a session whose `user.role === 'support'` (do not remove or alter existing ops tests).
  - [x] Backend: extend `apps/handrix-api/test/app.e2e-spec.ts` with an end-to-end support login + `/support/session` round trip AND a negative test proving support token cannot reach any `/ops/*` route.
  - [x] Frontend: add `apps/handrix-web/src/features/support-request-view/support-login-screen.test.tsx` mirroring `apps/handrix-web/src/features/ops-queue/ops-queue-screen.test.tsx`. Cover: successful login calls `onAuthenticated`, invalid credentials render the calm error message from the error envelope, and the submit button disables while `isSubmitting`.
  - [x] Frontend: extend `apps/handrix-web/src/app/App.test.tsx` with a test that `/support/workspace` redirects to `/support/login` when no support session is present (mirror the existing ops redirect test).
  - [x] Regression: confirm existing ops login, ops queue, ops request detail, and all customer flows (intake, tracking, request creation) still pass after changes.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` from the repo root.

## Dev Notes

- **This is the auth boundary story for Epic 4**, not the full support tooling story. The deliverable is a trustworthy support access seam that Stories 4.2–4.5 build on for search, detail, delay explanation, and intervention. Do NOT pull forward request search or history features.
- **Most of the heavy lifting is already done by Story 3.1.** The JWT issuance (`internal-auth-token.ts`), the `InternalAuthGuard`, the `InternalRolesGuard`, the `@InternalRoles(...)` decorator, the `internalUserRoleSchema` enum (`['ops', 'support']`), and the env-seeded support user credential all exist and are role-agnostic. This story's real scope is: new `support/` backend module, new `support-request-view/` frontend feature, new shared `internalSupportSessionSchema`, and tests proving role isolation.
- **Critical invariant: separate ops and support session storage.** Do not share a single `handrix.internal.session` key. Ops and support are distinct authorization surfaces; a user authenticated as ops must not auto-access the support workspace, and vice versa, even on the same browser.
- **Customer-safe lifecycle visibility stays backend-owned and separate from internal operational access** (carried forward from Epic 2 retrospective and reinforced in Story 3.1). No support-side code should touch the public `requests` endpoints or the anonymous tracking credential model.
- **No UX spec exists for the support workspace.** The UX specification (`ux-design-specification.md`) only describes customer-facing screens plus one operations journey note (lines 46-50, 402-421). There is no support-specific login layout, workspace shell, color tokens, or component guidance. For Story 4.1 only, achieve visual parity with the ops login screen by reusing the existing `ops-page`/`ops-hero`/`ops-login-panel`/`ops-login-form` CSS classes. Do NOT design a new visual language; that conversation (if it happens) belongs in a future UX spec update and in Stories 4.2+.

### Technical Requirements

- **Backend auth remains the source of truth for internal authorization.** Every support route MUST apply `InternalAuthGuard` + `InternalRolesGuard` + `@InternalRoles('support')`. Do not rely on frontend route hiding as the security mechanism.
- **Role isolation is a hard requirement, not a future nicety.** `@InternalRoles('support')` on support routes, `@InternalRoles('ops')` on ops routes. A valid token for the wrong role must be rejected with 403 and no data leakage.
- **Session payload stays minimal.** Return only `{ id, email, displayName, role }` for the authenticated user. No internal implementation detail, no credential material, no customer request data.
- **Follow the existing API envelope conventions** (unchanged since Story 3.1):
  - Success: `{ data, meta? }` via `createSuccessResponse(...)`.
  - Error: `{ error: { code, message, details?, retryable?, recoveryHint? } }` via `createErrorResponse(...)`.
  - JSON stays `camelCase`; database columns stay `snake_case` (persistence is not in scope this story, but keep the invariant in mind if any config lookup touches the DB layer).
- **Env validation must fail fast in production** when support credentials are missing or malformed. The existing `parseRequiredValue` logic in `env.validation.ts` already enforces this; do not weaken it.

### Architecture Compliance

- **Service boundary** (architecture.md lines 578-592): `support` owns search, visibility, and intervention-oriented workflows. Story 4.1 establishes the module; the actual workflows arrive in later stories.
- **API boundary** (architecture.md lines 574-576): Internal support APIs live under `support/` and provide read-heavy request history plus controlled intervention actions. The `GET /support/session` route is the initial seam; no other routes in this story.
- **Component boundary** (architecture.md lines 486-487): "Internal views for ops and support are separate features, even if they reuse lower-level request-summary components." The new `features/support-request-view/` directory is mandatory.
- **Enforcement guidelines** (architecture.md lines 399-409): Use shared envelopes, keep `snake_case` / `camelCase` discipline, add tests when changing contract schemas.
- **Architecture implementation sequence item 5** (lines 268-276): "Implement ops/support auth and internal request management APIs" — this story completes the support half of that sequence item.

### Library / Framework Requirements

- **No new runtime dependencies for this story.** Everything needed is already installed.
- **Existing stack (verified in `apps/handrix-api/package.json` and `apps/handrix-web/package.json`):**
  - NestJS 11 (`@nestjs/common`, `@nestjs/core`) for backend modules and guards.
  - NestJS Swagger (`@nestjs/swagger`) for `@ApiTags`, `@ApiOperation`, `@ApiOkResponse` decorators — apply these to support routes the same way ops does (`ops.controller.ts:32, 40-46`).
  - TypeScript ~5.7 across the workspace (strict mode on).
  - Zod 4 in `@handrix/shared-contracts` for schema and type derivation.
  - React 19 + Vite on the frontend.
  - Jest 30 + `ts-jest` for backend tests (`*.spec.ts`), Vitest 4 + `@testing-library/react` 16 for frontend tests (`*.test.tsx`).
- **No external JWT library is used.** Token issuance/validation is a custom HS256 implementation in `apps/handrix-api/src/modules/auth/internal-auth-token.ts` (HMAC-SHA256 via Node `crypto`). Do NOT introduce `jsonwebtoken`, `jose`, or `@nestjs/jwt`; keep the existing implementation.
- **No password hashing library is used.** Internal staff credentials are env-backed strings compared with `timingSafeEqual` (`internal-user-credentials.ts:5-14`). Do NOT add bcrypt/argon2; that belongs to a future persistence story (5.1) if it happens at all.

### File Structure Requirements

**Backend touch points:**
- NEW: `apps/handrix-api/src/modules/support/support.module.ts`
- NEW: `apps/handrix-api/src/modules/support/support.controller.ts`
- NEW: `apps/handrix-api/src/modules/support/support.service.ts`
- NEW: `apps/handrix-api/src/modules/support/support.controller.spec.ts`
- EDIT: `apps/handrix-api/src/app.module.ts` (register `SupportModule`)
- EDIT: `apps/handrix-api/src/modules/auth/auth.service.spec.ts` (add support-role login test)
- EDIT: `apps/handrix-api/test/app.e2e-spec.ts` (add support auth + role-isolation e2e coverage)

**Shared-contracts touch points:**
- EDIT: `packages/shared-contracts/src/auth/internal-auth.schemas.ts` (add `internalSupportSessionSchema` and `InternalSupportSession` type)
- EDIT: `packages/shared-contracts/src/index.ts` (export the new schema/type)

**Frontend touch points:**
- NEW: `apps/handrix-web/src/features/support-request-view/support-login-screen.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-login-screen.test.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-auth-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-auth-storage.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-routes.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx` (minimal placeholder for this story — authenticated landing that verifies the protected `/support/session` response)
- EDIT: `apps/handrix-web/src/app/App.tsx` (add support session state + routing branch alongside existing ops handling)
- EDIT: `apps/handrix-web/src/app/App.test.tsx` (add support-routing regression tests)

**Do NOT touch:**
- `apps/handrix-api/src/modules/auth/` (auth primitives are role-agnostic and already complete — only the `auth.service.spec.ts` gets a new test case).
- `apps/handrix-api/src/modules/ops/` (ops flows must continue working unchanged; only add a negative regression test if one is not already present).
- `apps/handrix-api/src/modules/requests/`, `reference-data/`, `health/` (out of scope).
- `apps/handrix-web/src/features/ops-queue/` (ops frontend must continue working unchanged).
- `apps/handrix-web/src/features/issue-intake/`, `features/request-tracking/` (customer flows must continue working unchanged).

### Testing Requirements

**Backend coverage must prove:**
- Valid support credentials → `POST /auth/internal-sessions` returns a session with `user.role === 'support'`.
- Invalid credentials (wrong password, unknown email) → 400/401 with the shared error envelope and no user data in the response.
- `GET /support/session` with a valid support token → 200 + `{ scope: 'support', ... }` payload.
- `GET /support/session` with a valid ops token → 403 forbidden.
- `GET /support/session` with no token or invalid token → 401 unauthorized.
- `GET /ops/session` (and any other `/ops/*` route) with a valid support token → 403 forbidden (regression proving role isolation holds).
- Protected endpoints never leak customer request payloads in error responses.

**Frontend coverage must prove:**
- `SupportLoginScreen` submits credentials and calls `onAuthenticated` with the returned session.
- Invalid login attempts render the calm error `message` and optional `recoveryHint` from the API error envelope (reuse `OpsAuthError` pattern or create `SupportAuthError`).
- The protected support workspace placeholder does not render authenticated content when `supportSession` is null.
- `/support/workspace` without a session redirects to `/support/login` (mirror the ops redirect regression).

**Regression coverage must confirm:**
- Customer intake, request creation, tracking, and recovery flows remain accessible without any staff auth.
- Ops login, ops queue, ops request detail, ops assignment, and ops lifecycle updates all continue to work unchanged.
- Anonymous tracking storage (`handrix.request-tracking.*` keys) and internal ops session storage (`handrix.ops.session`) are never read or written by support code.

**Validation commands (from repo root):**
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

### UX / Interaction Guardrails

- Support login experience is utilitarian and visually parallel to ops login for MVP. Reuse `ops-hero`, `ops-login-panel`, `ops-login-form`, `ops-field`, `ops-input`, `ops-alert`, and `primary-button` CSS classes from `apps/handrix-web/src/styles/globals.css`. Do not create a new stylesheet or new class prefix (`support-*`) in this story.
- Copy adjustments: "Operations access" → "Support access"; "Enter operations area" → "Enter support workspace"; keep the same overall cadence and tone.
- Error states must use the calm recovery-hint pattern already established (error message + optional recovery hint paragraph inside `role="alert"`). Never expose raw backend error strings.
- Unauthenticated users must never glimpse request data, search affordances, or navigation labels implying support access.
- An ops user who somehow lands on `/support/workspace` with an ops session must NOT see support content; the workspace screen must verify role via `GET /support/session`, receive the 403, and redirect to `/support/login` with the calm message "This account does not have support access."
- Logout from the support workspace clears only `handrix.support.session` and does not affect ops or customer tracking state.

### Previous Story Intelligence

**From Story 3.1 (direct reference model — implement the same pattern):**
- The auth boundary was established in Story 3.1 with `AuthModule`, `InternalAuthGuard`, `InternalRolesGuard`, `@InternalRoles(...)` decorator, and `internal-auth-token.ts` (custom HS256 JWT). All of these are role-agnostic and reused as-is.
- Story 3.1 explicitly carved out space for support: `internalUserRoleSchema = z.enum(['ops', 'support'])` (`packages/shared-contracts/src/auth/internal-auth.schemas.ts:3`) and the env config parses a `support-default-user` alongside the ops user (`env.validation.ts:165-175`). Story 4.1 is the story that finally exercises that seam.
- Story 3.1 verified the full workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` before moving to review. Apply the same validation bar here.
- Story 3.1 deliberately avoided Prisma models, DB migrations, and full user management. Story 4.1 must preserve that restraint — persistence comes later (Epic 5).

**From Story 3.7 (most recent — boundary discipline):**
- Story 3.7 consolidated runtime ownership inside `reference-data/` rather than spreading rules across modules. Apply the same discipline here: keep support authorization logic inside `support/` + `auth/`, do not scatter `if (role === 'support')` conditionals into `requests/`, `ops/`, or `reference-data/`.
- Story 3.7 preserved existing contract shapes and only extended them when necessary. Do the same: extend `internal-auth.schemas.ts` with one new `internalSupportSessionSchema` mirroring `internalOpsSessionSchema`; do not rename or restructure the existing ops schema.

**From Epic 2 retrospective:**
- "The team kept lifecycle truth in the backend across the whole epic. That was the strongest architectural win and prevented frontend drift." Keep auth truth in the backend the same way — role checks are never a frontend responsibility.
- "Shared contracts in `packages/shared-contracts/src/` became the reliable center of gravity." The new support session schema belongs there, not duplicated in frontend code.

### Git Intelligence Summary

- Recent commits are sparse and per-epic (`feat: almost done with epic3`, `feat: epic2 is almost done`, `feat: completed epic 1`, `first commit`). Commit titles do not add implementation detail; the source tree and recently completed story files are the authoritative grounding.
- The most relevant existing implementation artifacts to read before starting:
  - `apps/handrix-api/src/modules/ops/ops.controller.ts` (mirror for support controller shape, decorators, envelope usage).
  - `apps/handrix-api/src/modules/ops/ops.module.ts` (module registration shape).
  - `apps/handrix-api/src/modules/auth/roles.decorator.ts`, `internal-auth.guard.ts`, `internal-roles.guard.ts`, `internal-auth-token.ts`, `internal-user-credentials.ts` (read-only — the auth primitives you will compose).
  - `apps/handrix-api/src/config/env.validation.ts:86-175` (understand how the support user is seeded and why no DB is needed).
  - `apps/handrix-web/src/features/ops-queue/ops-login-screen.tsx`, `ops-auth-api.ts`, `ops-auth-storage.ts`, `ops-routes.ts` (mirror for support equivalents).
  - `apps/handrix-web/src/app/App.tsx` (extend with a support branch; do not break the existing ops or customer branches).
  - `packages/shared-contracts/src/auth/internal-auth.schemas.ts` (extend with the new support session schema).
  - `_bmad-output/implementation-artifacts/3-1-enable-operations-staff-authentication-and-access.md` (the full original pattern — same acceptance criteria structure, same task cadence).

### Project Structure Notes

- The project follows a pnpm monorepo with `apps/handrix-api/` (NestJS backend), `apps/handrix-web/` (Vite + React 19 frontend), and `packages/shared-contracts/` (Zod 4 schemas shared across apps).
- Feature/domain-first organization is mandatory (`architecture.md#Project Organization Principles`). Support code lives under `apps/handrix-api/src/modules/support/` and `apps/handrix-web/src/features/support-request-view/`. Do not place support code under `features/ops-queue/` "temporarily" — that boundary violation was explicitly prevented by the architecture.
- No `project-context.md` file exists in the repository. The authoritative sources for this story are the planning artifacts (`epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`), the completed Story 3.1 implementation artifact, and the current source tree.
- Main structural risks for this story:
  - Building support endpoints inside `OpsController` or `OpsModule` (boundary violation).
  - Sharing session storage keys with ops (authorization leak).
  - Introducing DB-backed user management prematurely (scope creep into Epic 5).
  - Frontend-only route protection without the backend `@InternalRoles('support')` guard (security hole).
  - Modifying customer-facing `requests/` endpoints or tracking storage (regression risk).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4: Equip Support for Trust Recovery and Request Intervention]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1: Enable Support Staff Authentication and Access]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] (NFR11: operational and support access restricted according to role and business need)
- [Source: _bmad-output/planning-artifacts/prd.md#Project Foundation] (line 97: restrict operations and support tooling behind authenticated JWT-based RBAC)
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] (lines 193-207)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns] (lines 209-227)
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] (lines 291-314)
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Organization Principles] (lines 317-329)
- [Source: _bmad-output/planning-artifacts/architecture.md#Backend Module Structure] (lines 509-544)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries] (lines 573-597)
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries] (lines 578-592)
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Boundaries] (lines 486-487)
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping] (support-request-view and support module paths)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Secondary Users] (lines 46-50 — only existing UX note about support staff)
- [Source: _bmad-output/implementation-artifacts/3-1-enable-operations-staff-authentication-and-access.md] (direct pattern reference)
- [Source: _bmad-output/implementation-artifacts/3-7-maintain-scope-rules-and-supported-service-configuration.md] (most recent epic 3 boundary discipline)
- [Source: _bmad-output/implementation-artifacts/epic-2-retrospective-2026-04-20.md] (backend-owned truth, shared contracts)
- [Source: apps/handrix-api/src/app.module.ts] (module registration location)
- [Source: apps/handrix-api/src/config/env.validation.ts] (lines 86-175 — support user already seeded)
- [Source: apps/handrix-api/src/modules/auth/auth.controller.ts] (`POST /auth/internal-sessions` is role-agnostic and already handles support logins)
- [Source: apps/handrix-api/src/modules/auth/auth.service.ts]
- [Source: apps/handrix-api/src/modules/auth/internal-auth-token.ts] (custom HS256 JWT — do not replace)
- [Source: apps/handrix-api/src/modules/auth/internal-auth.guard.ts]
- [Source: apps/handrix-api/src/modules/auth/internal-roles.guard.ts]
- [Source: apps/handrix-api/src/modules/auth/roles.decorator.ts]
- [Source: apps/handrix-api/src/modules/auth/internal-user-credentials.ts] (timing-safe credential matching)
- [Source: apps/handrix-api/src/modules/ops/ops.controller.ts] (controller + guard pattern to mirror)
- [Source: apps/handrix-api/src/modules/ops/ops.module.ts] (module wiring pattern to mirror)
- [Source: apps/handrix-web/src/app/App.tsx] (routing extension point)
- [Source: apps/handrix-web/src/features/ops-queue/ops-login-screen.tsx] (login form pattern to mirror)
- [Source: apps/handrix-web/src/features/ops-queue/ops-auth-api.ts] (auth API pattern to mirror)
- [Source: apps/handrix-web/src/features/ops-queue/ops-auth-storage.ts] (session storage pattern to mirror — with distinct key)
- [Source: apps/handrix-web/src/features/ops-queue/ops-routes.ts] (route union pattern to mirror)
- [Source: apps/handrix-web/src/styles/globals.css] (reuse existing ops-* CSS classes for visual parity)
- [Source: packages/shared-contracts/src/auth/internal-auth.schemas.ts] (extend with `internalSupportSessionSchema`)
- [Source: packages/shared-contracts/src/index.ts] (export the new schema/type)

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (1M context)

### Debug Log References

- `pnpm typecheck` → all 3 workspaces pass.
- `pnpm lint` → handrix-web + handrix-api pass.
- `pnpm test` → shared-contracts build OK, handrix-web 35/35, handrix-api 74/74, handrix-api e2e 11/11.
- `pnpm build` → shared-contracts, handrix-api (nest build), handrix-web (vite) all succeed.

### Completion Notes List

- Backend: added `SupportModule` with `SupportController` (`GET /support/session`) and `SupportService.buildSessionPayload`. Controller is guarded by `InternalAuthGuard` + `InternalRolesGuard` + `@InternalRoles('support')` — no ops reuse. Returned payload is strictly `{ scope: 'support', message, user: { id, email, displayName, role } }` inside `createSuccessResponse`; no customer request data exposed.
- Shared contracts: added `internalSupportSessionSchema` and `InternalSupportSession` alongside the existing ops equivalents; re-exported via `packages/shared-contracts/src/index.ts`.
- Frontend: new `features/support-request-view/` feature with `support-login-screen.tsx`, `support-workspace-screen.tsx` (minimal placeholder), `support-auth-api.ts`, `support-auth-storage.ts`, and `support-routes.ts`. Session storage key is `handrix.support.session`, fully isolated from `handrix.ops.session`. Reused existing `ops-*` CSS classes for visual parity — no new stylesheet.
- Role isolation: App.tsx routes `/support/*` through an isolated `supportSession` state. If the workspace screen calls `GET /support/session` with an ops token it receives the 403 error envelope, clears storage, and redirects to `/support/login` surfacing the calm "This account does not have support access." message. Backend remains the source of truth.
- Tests: added `support.controller.spec.ts` (session envelope, auth guard accept, role guard accept/reject both directions, 401 on missing token); extended `auth.service.spec.ts` with a support-role login test; extended `app.e2e-spec.ts` with a support login + `/support/session` round trip and two role-isolation regressions (support token → `/ops` → 403; ops token → `/support` → 403). Added `support-login-screen.test.tsx` covering onAuthenticated, calm error rendering, disabled submit, and initial-error-from-parent. Extended `App.test.tsx` with support login success, unauthenticated redirect, and ops-token-rejected redirect regressions.
- Env sample: documented `HANDRIX_SUPPORT_EMAIL`, `HANDRIX_SUPPORT_PASSWORD`, and `HANDRIX_SUPPORT_DISPLAY_NAME` alongside their ops equivalents in `apps/handrix-api/.env.example`.
- Tooling fix: added `typescript ^5.7.3` as a devDependency of `@handrix/shared-contracts` so that `pnpm --filter @handrix/shared-contracts build` (used by the root `typecheck`, `test`, and `build` scripts) can resolve `tsc` inside the package's own node_modules. No behavioral change.

### File List

- NEW: `apps/handrix-api/src/modules/support/support.module.ts`
- NEW: `apps/handrix-api/src/modules/support/support.controller.ts`
- NEW: `apps/handrix-api/src/modules/support/support.service.ts`
- NEW: `apps/handrix-api/src/modules/support/support.controller.spec.ts`
- MODIFIED: `apps/handrix-api/src/app.module.ts`
- MODIFIED: `apps/handrix-api/src/modules/auth/auth.service.spec.ts`
- MODIFIED: `apps/handrix-api/test/app.e2e-spec.ts`
- MODIFIED: `apps/handrix-api/.env.example`
- MODIFIED: `packages/shared-contracts/src/auth/internal-auth.schemas.ts`
- MODIFIED: `packages/shared-contracts/package.json`
- NEW: `apps/handrix-web/src/features/support-request-view/support-login-screen.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-login-screen.test.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-auth-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-auth-storage.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-routes.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx`
- MODIFIED: `apps/handrix-web/src/app/App.tsx`
- MODIFIED: `apps/handrix-web/src/app/App.test.tsx`
- MODIFIED: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- MODIFIED: `_bmad-output/implementation-artifacts/4-1-enable-support-staff-authentication-and-access.md`

### Change Log

- 2026-04-21: Implemented Story 4.1 — established support staff authentication and access boundary (new `SupportModule` + `GET /support/session`, new shared `internalSupportSessionSchema`, new `support-request-view/` frontend feature with isolated session storage, role-isolation coverage both backend and frontend).

### Review Findings

Reviewed 2026-04-21 via bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor).

- [x] [Review][Patch] Add `SupportWorkspaceScreen` unit test for positive render path (authenticated displayName, loadSupportProtectedSession success) [apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx]
- [x] [Review][Patch] Assert 401/403 error bodies on `/support/session` do not leak customer-request payload data [apps/handrix-api/src/modules/support/support.controller.spec.ts]
- [x] [Review][Patch] Add e2e coverage for `GET /support/session` with no Authorization header → 401 (Testing Requirements line 159) [apps/handrix-api/test/app.e2e-spec.ts]
- [x] [Review][Patch] Add test for malformed/expired Bearer token on `GET /support/session` → 401 (spec says "Missing or invalid") [apps/handrix-api/src/modules/support/support.controller.spec.ts]
- [x] [Review][Patch] Extend `auth.service.spec.ts` with support-role invalid-credentials test proving shared error envelope + no user data leakage [apps/handrix-api/src/modules/auth/auth.service.spec.ts]
- [x] [Review][Patch] Rewrite role-isolation e2e to use a real Nest test app with HTTP round-trips — current tests fabricate `createHttpExecutionContext` with string literals for `getHandler`/`getClass` and instantiate `InternalRolesGuard` directly, so the `@UseGuards`+decorator stack is never exercised end-to-end [apps/handrix-api/test/app.e2e-spec.ts]
- [x] [Review][Patch] Catch `response.json()` and Zod parse failures in `parseApiError`, `createInternalSession`, and `loadSupportProtectedSession`; wrap as `SupportAuthError` fallback [apps/handrix-web/src/features/support-request-view/support-auth-api.ts]
- [x] [Review][Patch] Catch network errors (TypeError fetch failure, AbortError) and non-Error throwables in `createInternalSession` / `loadSupportProtectedSession`; surface as `SupportAuthError` [apps/handrix-web/src/features/support-request-view/support-auth-api.ts]
- [x] [Review][Patch] Zod-validate `JSON.parse` output in `loadSupportSession()`; clear storage on malformed payload so tampered localStorage cannot inject a forged session object [apps/handrix-web/src/features/support-request-view/support-auth-storage.ts]
- [x] [Review][Patch] Reset `protectedSession` / `errorMessage` state when `session.accessToken` changes in `SupportWorkspaceScreen` effect to avoid stale-user detail leak across in-place re-auth [apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx]
- [x] [Review][Patch] Remove dead `??` fallbacks in `handleSupportSessionExpired` — `reason.message` is typed `string` so `?? 'This account does not have support access.'` is unreachable, and `recoveryHint ?? null` coalescing is inconsistent with the `string | null | undefined` chain [apps/handrix-web/src/app/App.tsx]
- [x] [Review][Patch] Extract shared `createHttpExecutionContext` helper — duplicated verbatim between `support.controller.spec.ts` and `app.e2e-spec.ts` [apps/handrix-api/test/app.e2e-spec.ts + apps/handrix-api/src/modules/support/support.controller.spec.ts]
- [x] [Review][Defer] Bearer token persisted to `localStorage` — XSS exfiltration risk for internal staff token valid up to 480 min [apps/handrix-web/src/features/support-request-view/support-auth-storage.ts] — deferred, pre-existing ops pattern (same risk in `handrix.ops.session`); revisit as part of Epic 5 security hardening
- [x] [Review][Defer] `internalSupportSessionSchema` lacks `expiresAt` / `issuedAt` fields — protected endpoint silently drops lifetime metadata that the login endpoint returns [packages/shared-contracts/src/auth/internal-auth.schemas.ts] — deferred, ops schema has same shape; change both together if needed
- [x] [Review][Defer] No rate-limit / lockout on `POST /auth/internal-sessions` — brute force of demo passwords is trivial [apps/handrix-api/src/modules/auth/auth.controller.ts] — deferred, belongs to Epic 5 security hardening
- [x] [Review][Defer] Demo passwords hard-wired in `.env.example` and tests can ship to prod if `.env.example` is copied [apps/handrix-api/.env.example] — deferred, spec explicitly says "Do NOT change this contract"; treat as deployment-process concern
- [x] [Review][Defer] `handleSupportSessionExpired` dual-writes `window.history.replaceState` + `setPathname`; can flash workspace before redirect lands [apps/handrix-web/src/app/App.tsx] — deferred, mirrors ops handler; fix both when ops version is refactored
- [x] [Review][Defer] No `credentials: 'omit'` on fetch calls and no CSRF token plumbing [apps/handrix-web/src/features/support-request-view/support-auth-api.ts] — deferred, pre-existing ops pattern; bearer-only design currently avoids CSRF but defense-in-depth belongs in Epic 5
- [x] [Review][Defer] No email normalization (case-insensitive / trim) at credential match — typo mismatches can silently fail [apps/handrix-api/src/modules/auth/auth.service.ts] — deferred, product decision + pre-existing ops behavior
- [x] [Review][Defer] `localStorage.setItem` / `removeItem` throws on quota / private browsing are uncaught [apps/handrix-web/src/features/support-request-view/support-auth-storage.ts] — deferred, pre-existing ops pattern
- [x] [Review][Defer] `request.user!` non-null assertion in `SupportController.getSession` [apps/handrix-api/src/modules/support/support.controller.ts] — deferred, mirrors ops exactly; guard guarantees presence
- [x] [Review][Defer] `recoveryHint?: string` in `SupportAuthError` vs `string | null` in callers is a minor type-shape divergence from `OpsAuthError` pattern [apps/handrix-web/src/features/support-request-view/support-auth-api.ts] — deferred, low-impact, mirrors mixed ops usage
