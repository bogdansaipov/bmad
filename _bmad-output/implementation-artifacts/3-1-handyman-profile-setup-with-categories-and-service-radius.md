# Story 3.1: Handyman Profile Setup with Categories and Service Radius

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered handyman,
I want to set my supported service categories and service area after registering,
so that the platform knows which jobs to show me and I only receive relevant work.

## Acceptance Criteria

1. **Given** a handyman logs in for the first time **When** they land on the handyman dashboard **Then** they are prompted to complete their profile by selecting supported categories and service radius **And** they cannot receive matching jobs until at least one category and a service radius are set.

2. **Given** a handyman is on the profile setup screen **When** they select their supported categories **Then** only the platform's configured service categories are available for selection **And** their category preferences are persisted as `handyman_category_preferences` records.

3. **Given** a handyman sets their service radius **When** the value is saved **Then** the radius is stored on the handyman profile and used as the matching boundary for incoming requests **And** the handyman can update their categories and radius from their profile settings later.

4. **Given** a handyman profile is saved **When** the backend evaluates future rating submissions **Then** the handyman profile includes `average_rating_cache` and `ratings_count_cache` fields (nullable) to support future rating aggregation without requiring a schema change.

## Tasks / Subtasks

- [x] Task 1 - Add handyman preference persistence to Prisma and seed-safe data flow (AC: 2, 3, 4)
  - [x] Add `HandymanCategoryPreference` to [apps/backend/prisma/schema.prisma](/home/bogdansaipov/Projects/demos/demo1/apps/backend/prisma/schema.prisma) with `id`, `handymanProfileId`, `categoryId`, timestamps, unique constraint on `[handymanProfileId, categoryId]`, and indexes for both foreign keys.
  - [x] Add relation fields on `HandymanProfile` and `ServiceCategory` for handyman preferences without changing existing `averageRatingCache`, `ratingsCountCache`, or `serviceRadiusKm` fields.
  - [x] Generate a Prisma migration and client so the new join table exists before backend work starts.
  - [x] Keep seeded categories in [apps/backend/prisma/seed.ts](/home/bogdansaipov/Projects/demos/demo1/apps/backend/prisma/seed.ts) as the only selectable source of truth; do not hardcode category options on the frontend.

- [x] Task 2 - Add shared handyman profile contracts (AC: 1, 2, 3)
  - [x] Create `packages/contracts/src/handyman.schemas.ts` with schemas and types for:
    - `HandymanCategoryPreference`
    - `HandymanProfileSetupResponse`
    - `UpdateHandymanProfileRequest`
  - [x] Include fields for `displayName`, `availabilityStatus`, `serviceRadiusKm`, selected categories, and a derived `isProfileComplete` boolean.
  - [x] Export the new schemas from [packages/contracts/src/index.ts](/home/bogdansaipov/Projects/demos/demo1/packages/contracts/src/index.ts).

- [x] Task 3 - Implement backend handyman profile read/update APIs in the `users` module (AC: 1, 2, 3, 4)
  - [x] Build `UsersService` and `UsersController` under `apps/backend/src/modules/users/`.
  - [x] Add `GET /users/me/handyman-profile` for authenticated `HANDYMAN` users that returns current profile state plus selected categories and `isProfileComplete`.
  - [x] Add `PUT /users/me/handyman-profile` for authenticated `HANDYMAN` users that:
    - validates `serviceRadiusKm` is positive and bounded reasonably for MVP
    - validates all category IDs exist and are active
    - replaces existing category preferences transactionally
    - updates `serviceRadiusKm` on `handyman_profiles`
    - leaves `average_rating_cache` and `ratings_count_cache` nullable
  - [x] Use `GET /categories` as the frontend source for available categories rather than duplicating category lookup logic in the new endpoint.
  - [x] Register the controller/service in [apps/backend/src/modules/users/users.module.ts](/home/bogdansaipov/Projects/demos/demo1/apps/backend/src/modules/users/users.module.ts).

- [x] Task 4 - Replace the handyman dashboard stub with a real profile-setup experience (AC: 1, 2, 3)
  - [x] Create a `handyman-dashboard` feature under `apps/frontend/src/features/handyman-dashboard/` with:
    - API helpers for fetch/update profile
    - TanStack Query hooks
    - a first-login setup screen or blocking setup card
    - reusable category preference chips/tiles
    - a service-radius control row
  - [x] Update [apps/frontend/src/App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/frontend/src/App.tsx) to replace `HandymanDashboardStub` with a real `HandymanDashboardPage`.
  - [x] On first load, show the setup prompt immediately when `isProfileComplete === false`.
  - [x] Pull selectable categories from existing `GET /api/categories` and reuse the authenticated fetch pattern already used by the customer flows.
  - [x] Persist profile updates from the dashboard and keep the page usable later as profile settings editing, even if the initial MVP uses the dashboard route as the entry point.

- [x] Task 5 - Enforce the “cannot receive matching jobs until configured” guardrail in code seams used by upcoming stories (AC: 1, 3)
  - [x] Expose `isProfileComplete` from the backend so Story 3.2 can filter or block jobs feed access without redefining profile completion rules.
  - [x] Add a clear empty/locked state on the handyman dashboard explaining that jobs stay unavailable until at least one category and a service radius are saved.
  - [x] Do not build the actual jobs feed in this story; keep the seam explicit for Story 3.2.

- [x] Task 6 - Tests for backend and frontend flows (AC: 1, 2, 3, 4)
  - [x] Add backend unit tests for `UsersService` covering:
    - first-load profile response with no categories / no radius
    - successful save with multiple categories
    - rejection of inactive or unknown categories
    - transactional replacement of preferences on update
  - [x] Add backend controller or e2e tests proving `CUSTOMER` users cannot access handyman profile endpoints.
  - [x] Add frontend tests for the handyman dashboard setup flow:
    - prompt renders for incomplete profile
    - save disabled until at least one category and a valid radius are provided
    - categories are loaded from API
    - successful save transitions the UI out of the blocked setup state

## Dev Notes

- Story 1.3 already routes `HANDYMAN` users to `/dashboard/handyman`, but [apps/frontend/src/App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/frontend/src/App.tsx) still uses a stub component. Replace that stub rather than introducing a second dashboard entry point.
- The active implementation target is the `apps/frontend` + `apps/backend` pair. The repo also contains legacy `apps/handrix-web` and `apps/handrix-api` codepaths from an older plan; do not wire Story 3.1 into those directories.
- Existing Prisma schema already has `HandymanProfile.serviceRadiusKm`, `averageRatingCache`, and `ratingsCountCache`, so this story should extend that model rather than redesign it.
- The architecture assigns profile reads and updates to the `users` module and category preference ownership to the `categories` domain. Keep the endpoint surface in `users`, but feel free to reuse category queries from the existing categories module rather than duplicating source-of-truth data.
- Keep the matching rule intentionally simple: future eligibility depends on handyman availability, supported category, and request location within service radius. This story should prepare the data needed for that filter, not implement matching itself.
- Reuse the existing authenticated frontend fetch pattern from the customer features: token pre-check, `401` logout handling, schema validation with shared contracts, and TanStack Query object syntax.
- Handyman UI should follow the UX direction already defined for this role: compact chips/rows, low cognitive load, and a settings-friendly surface that can later coexist with Dashboard, Jobs, History, and Settings navigation.

### Project Structure Notes

- Backend files should be added under `apps/backend/src/modules/users/` and `packages/contracts/src/`; avoid placing new profile APIs in `auth` or `requests`.
- Frontend files should live under `apps/frontend/src/features/handyman-dashboard/`; avoid mixing handyman setup UI into `customer-dashboard` or `request-create`.
- Existing `GET /categories` already works for authenticated users and was explicitly left open for handyman reuse in Story 2.2 review notes. Build on that API instead of creating a parallel handyman-categories endpoint.

### References

- Story definition and acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story-31-Handyman-Profile-Setup-with-Categories-and-Service-Radius]
- Epic intent and future dependency on matching: [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Handyman-Job-Marketplace--Matching]
- Handyman journey and product behavior: [Source: _bmad-output/planning-artifacts/prd.md#Journey-3-Handyman-Accepts-and-Completes-a-Job]
- Module ownership and frontend feature boundaries: [Source: _bmad-output/planning-artifacts/architecture.md#Module-Boundaries]
- Matching rule inputs and service-radius requirement: [Source: _bmad-output/planning-artifacts/architecture.md#Matching-Strategy]
- Handyman components and navigation expectations: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Handyman-Components]
- Current implementation seams: [apps/frontend/src/App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/frontend/src/App.tsx), [apps/backend/prisma/schema.prisma](/home/bogdansaipov/Projects/demos/demo1/apps/backend/prisma/schema.prisma), [apps/backend/src/modules/users/users.module.ts](/home/bogdansaipov/Projects/demos/demo1/apps/backend/src/modules/users/users.module.ts), [apps/backend/src/modules/categories/categories.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/backend/src/modules/categories/categories.controller.ts)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context)

### Debug Log References

- Auto-selected next ready-for-dev story from `sprint-status.yaml`: `3-1-handyman-profile-setup-with-categories-and-service-radius`
- Backend unit tests: `npx jest src/modules/users/users.service.spec.ts` → 8/8 pass
- Frontend tests: `npx vitest run src/features/handyman-dashboard` → 4/4 pass
- Full backend `jest` and frontend `vitest`: pre-existing failures only (`health.controller.spec.ts`, `LoginPage.test.tsx`, `CreateRequestPage.test.tsx`) — verified by re-running on stashed working tree.
- Backend lint: clean. Frontend lint: clean for new files; only pre-existing warnings remain.

### Completion Notes List

- Story created from the current sprint backlog order because no explicit story ID was provided with the `bmad-create-story` request.
- Epic 3 is the next active epic after Story 2.4 was already marked `ready-for-dev`.
- Added `HandymanCategoryPreference` join model with unique `(handymanProfileId, categoryId)` and indexes on both FKs; hand-wrote the migration `20260514120000_add_handyman_category_preferences` to match the project's existing migration style because no live database is available in this environment. `prisma generate` was run successfully.
- Backend `users` module now owns `GET /users/me/handyman-profile` and `PUT /users/me/handyman-profile`, both `HANDYMAN`-only via the existing `JwtAuthGuard` + `RolesGuard` + `@Roles` decorator stack. Service validates category existence/activity, deduplicates IDs, and replaces preferences inside a single `$transaction`. Service-radius bounds (0.5–200 km) live in `@handrix/contracts` (`HANDYMAN_SERVICE_RADIUS_BOUNDS`) so backend DTO validators and the frontend input share one source of truth.
- `isProfileComplete` is derived on the backend (categories.length > 0 && serviceRadiusKm != null) so Story 3.2 can read it from a single trustworthy field.
- Frontend `HandymanDashboardPage` replaces the stub in `App.tsx`. Categories are loaded from the existing `GET /api/categories` endpoint. When `isProfileComplete === false`, the page shows a blocked banner plus a "jobs feed locked" explainer — the explicit guardrail seam for Story 3.2 — and the same form continues to work as profile settings editing once complete.
- Tests: `UsersService` unit tests cover first-load, complete profile, missing profile, unknown/inactive category rejection, transactional replacement, and dedupe. `users.e2e-spec.ts` covers role enforcement (CUSTOMER → 403, no auth → 401), bad payloads (400s), and the round-trip of save + replace. Frontend tests cover blocked-state UI, save-button gating, category-from-API loading, and the post-save transition.

### File List

- _bmad-output/implementation-artifacts/3-1-handyman-profile-setup-with-categories-and-service-radius.md
- apps/backend/prisma/schema.prisma
- apps/backend/prisma/migrations/20260514120000_add_handyman_category_preferences/migration.sql
- apps/backend/src/modules/users/users.module.ts
- apps/backend/src/modules/users/users.service.ts
- apps/backend/src/modules/users/users.service.spec.ts
- apps/backend/src/modules/users/users.controller.ts
- apps/backend/src/modules/users/dto/handyman-profile-response.dto.ts
- apps/backend/src/modules/users/dto/update-handyman-profile.dto.ts
- apps/backend/test/users.e2e-spec.ts
- packages/contracts/src/handyman.schemas.ts
- packages/contracts/src/index.ts
- apps/frontend/src/App.tsx
- apps/frontend/src/index.css
- apps/frontend/src/features/handyman-dashboard/api/handyman-profile.api.ts
- apps/frontend/src/features/handyman-dashboard/hooks/useHandymanProfile.ts
- apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.tsx
- apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.test.tsx
- apps/frontend/src/features/handyman-dashboard/components/CategoryChip.tsx
- apps/frontend/src/features/handyman-dashboard/components/ServiceRadiusInput.tsx
- apps/frontend/src/features/handyman-dashboard/components/HandymanProfileForm.tsx
- apps/frontend/src/features/handyman-dashboard/components/ProfileSetupBanner.tsx

### Change Log

- 2026-05-14 — Dev: implemented Story 3.1 end-to-end. Added Prisma `HandymanCategoryPreference` join model + migration, shared `@handrix/contracts` handyman schemas, NestJS `users` module endpoints (`GET`/`PUT /users/me/handyman-profile`), and the real `HandymanDashboardPage` with profile setup form, locked-state explainer, and live category fetch. Added 8 backend unit tests, 7 e2e cases, and 4 frontend tests. Story moved to `review`.
- 2026-05-14 — Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) addressed: scope-creeped Story 3.2 work was reverted out of Story 3.1's files; 10 patch findings applied (P2002→409 catch, inactive-category check inside tx, return tx state, ArrayMaxSize, aria-pressed CategoryChip, radius bounds on response schema, inline radius validation messages, scientific-notation guard, drop form-state reset effect, mutation onError logout). Added `users.service.spec.ts` P2002→409 case (9 total) and `HandymanDashboardPage.test.tsx` radius-validation case (5 total). Story moved to `done`.

### Review Findings

#### Code review — 2026-05-14
Sources: Blind Hunter, Edge Case Hunter, Acceptance Auditor (parallel adversarial review).

- [x] **[Review][Decision] Scope: revert 3.2 scope from Story 3.1's files** — Resolved 2026-05-14. Reverted: `baseLocation` removed from profile model / DTO / contracts / form; `availabilityStatus` restored to `String` (no enum); `PATCH /users/me/handyman-availability` endpoint + DTO removed; `JobOfferVisibility` model + `20260514143000` migration removed; `HandymanJobsPanel`/`HandymanNav` imports + polling hook removed; `/jobs`, `/jobs/history`, `/settings/handyman` routes pulled from `App.tsx`; `HandymanJobFeedResponseSchema` + `UpdateHandymanAvailabilityRequestSchema` removed from contracts; raw `$queryRaw`/`$executeRaw` in `UsersService` replaced with typed Prisma calls. The pure-3.2 files in `apps/frontend/src/features/handyman-jobs/`, `HandymanSettingsPage.tsx`, `BaseLocationInputs.tsx`, and the 3-2 story spec were deleted (untracked spillover) so Story 3.2 can be re-implemented cleanly. Sprint status `3-2` reset to `backlog` for a fresh `create-story` pass.

- [x] **[Review][Patch] Concurrent save race produces 500 instead of idempotent success** [apps/backend/src/modules/users/users.service.ts] — Fixed: the service now catches `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` and throws `ConflictException`. Covered by a new unit test in `users.service.spec.ts`.
- [x] **[Review][Patch] Radius input silently rejects out-of-range / NaN / empty values with no UI feedback** [apps/frontend/src/features/handyman-dashboard/components/HandymanProfileForm.tsx] — Fixed: `parseRadius` now returns a discriminated union `{ kind: 'empty' | 'invalid' | 'ok' }` with a specific `reason` for each invalid case; `ServiceRadiusInput` renders the message via a new `error` prop with `role="alert"` and `aria-invalid`. New frontend test verifies inline errors for `0`, `300`, and `1e2`.
- [x] **[Review][Patch] Scientific notation roundtrip mismatch in radius input** [apps/frontend/src/features/handyman-dashboard/components/HandymanProfileForm.tsx] — Fixed: `parseRadius` rejects any input matching `/[eE]/` with a clear "no scientific notation" message before submission, so what the user sees is what gets submitted.
- [x] **[Review][Patch] Form state reset on every profile reference change wipes in-progress edits** [apps/frontend/src/features/handyman-dashboard/components/HandymanProfileForm.tsx] — Fixed: removed the `useEffect` that re-seeded state from `profile`. State is now seeded only on mount via `useState` initializers; subsequent profile-cache updates from `setQueryData` no longer wipe the user's in-progress typing.
- [x] **[Review][Patch] Inactive-category check happens outside the transaction — race window** [apps/backend/src/modules/users/users.service.ts] — Fixed: the `serviceCategory.findMany` existence + active check now runs inside the `$transaction` callback (using `tx.serviceCategory.findMany`), closing the window between validation and insert.
- [x] **[Review][Patch] `updateHandymanProfile` re-reads the profile after the transaction instead of returning transactional state** [apps/backend/src/modules/users/users.service.ts] — Fixed: the transaction now returns `tx.handymanProfile.update({..., include: profileInclude })` directly and the service returns `toResponse(updated)` without a follow-up read.
- [x] **[Review][Patch] No upper bound on `categoryIds` array** [apps/backend/src/modules/users/dto/update-handyman-profile.dto.ts; packages/contracts/src/handyman.schemas.ts] — Fixed: added `@ArrayMaxSize(HANDYMAN_MAX_CATEGORIES)` on the DTO and `.max(50)` on the Zod request schema; `HANDYMAN_MAX_CATEGORIES = 50` is exported from `@handrix/contracts` as the single source of truth.
- [x] **[Review][Patch] CategoryChip uses `role="checkbox"` on a `<button>` — a11y antipattern** [apps/frontend/src/features/handyman-dashboard/components/CategoryChip.tsx] — Fixed: replaced `role="checkbox"` + `aria-checked` with `aria-pressed`, keeping the native `<button>` semantics that all ATs understand. Tests updated to query by `getByRole('button')` and assert `aria-pressed`.
- [x] **[Review][Patch] Response `serviceRadiusKm` has no min/max in the contract** [packages/contracts/src/handyman.schemas.ts] — Fixed: `HandymanProfileSetupResponseSchema.serviceRadiusKm` is now `z.number().min(0.5).max(200).nullable()` so the FE rejects malformed server responses, mirroring the request bounds.
- [x] **[Review][Patch] Update mutations have no `onError` → `AuthError` never triggers logout** [apps/frontend/src/features/handyman-dashboard/hooks/useHandymanProfile.ts] — Fixed: `useUpdateHandymanProfile` now has an `onError` handler that calls `logout()` when the rejection is an `AuthError`.

- [x] **[Review][Defer] Categories cache stale up to 5 min — deactivated category can sit in the picker** [apps/frontend/src/features/handyman-dashboard/hooks/useHandymanProfile.ts] — deferred, MVP-acceptable (backend rejects with 400 and the dashboard surfaces an error). Reduce `staleTime` later or invalidate from an admin event.
- [x] **[Review][Defer] No optimistic concurrency / version field on the profile — last-write-wins across tabs** [apps/backend/src/modules/users/users.service.ts:64-110] — deferred, not in MVP scope. Track for a future hardening pass.
- [x] **[Review][Defer] `BadRequest("One or more selected categories do not exist")` does not say which one** [apps/backend/src/modules/users/users.service.ts:81-86] — deferred, polish for later. Return the offending ids so the FE can mark the chip.
- [x] **[Review][Defer] `jsonRequest` drops the underlying fetch error and has no AbortController/timeout** [apps/frontend/src/features/handyman-dashboard/api/handyman-profile.api.ts] — deferred, debuggability/UX nice-to-have. Add `cause` propagation and an abort signal in a follow-up.
- [x] **[Review][Defer] e2e tests share state across cases (PUT followed by replace depends on the previous PUT)** [apps/backend/test/users.e2e-spec.ts] — deferred, acceptable for now. Consider per-test cleanup of `handyman_category_preferences` for true isolation.
- [x] **[Review][Defer] `afterAll` cleanup does not pre-delete orphan preferences from a prior crashed run** [apps/backend/test/users.e2e-spec.ts] — deferred, test hygiene improvement.
