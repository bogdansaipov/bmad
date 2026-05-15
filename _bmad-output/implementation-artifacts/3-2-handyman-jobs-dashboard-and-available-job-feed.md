# Story 3.2: Handyman Jobs Dashboard and Available Job Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in handyman,
I want to see a feed of available jobs that match my categories and service area,
so that I can quickly identify relevant work without wading through irrelevant requests.

## Acceptance Criteria

1. **Given** a handyman is logged in with categories and service radius set **When** the jobs dashboard loads **Then** only requests matching their supported categories and within their service radius are shown **And** the dashboard loads within 2 seconds under normal conditions.

2. **Given** a matching request exists **When** the handyman views the job card **Then** the card shows category, distance, rough area, estimate, and short description **And** accept and decline actions are accessible directly from the card without opening a detail screen.

3. **Given** the handyman navigation is rendered **When** the nav is visible **Then** it contains no more than 4 top-level items: Dashboard, Jobs, History, and Settings.

4. **Given** no matching jobs are currently available **When** the jobs feed loads **Then** a clear empty-state is shown **And** the handyman's online/offline status toggle is visible and actionable.

5. **Given** a new request is routed to eligible handymen **When** the backend identifies matching handymen by category and service radius **Then** a `job_offer_visibility` record is created for each eligible handyman **And** the offer appears in their feed without requiring a manual refresh.

## Tasks / Subtasks

- [x] Task 1 — Extend Prisma schema and generate migration (AC: 1, 5)
  - [x] Add `baseLocationLat Float?` and `baseLocationLng Float?` to the `HandymanProfile` model in [apps/backend/prisma/schema.prisma] — these were reverted from story 3.1 as scope-creep and now belong here
  - [x] Add `JobOfferVisibility` model with fields: `id String @id @default(cuid())`, `requestId String`, `handymanProfileId String`, `offerStatus String @default("pending")`, `offeredAt DateTime @default(now())`, `respondedAt DateTime?`, unique constraint `@@unique([requestId, handymanProfileId])`, indexes on both FK fields
  - [x] Add `jobOffers JobOfferVisibility[]` relation on both `ServiceRequest` and `HandymanProfile`; add the corresponding `request ServiceRequest @relation(...)` and `handymanProfile HandymanProfile @relation(...)` on `JobOfferVisibility`
  - [x] Hand-write the migration SQL to match the project's existing migration style (no live DB in this environment); run `prisma generate` to regenerate the client

- [x] Task 2 — Add shared contracts (AC: 1, 2, 4, 5)
  - [x] In `packages/contracts/src/handyman.schemas.ts`, add:
    - `JOB_OFFER_STATUS` const object: `{ PENDING: 'pending', DECLINED: 'declined', ACCEPTED: 'accepted', EXPIRED: 'expired', HIDDEN: 'hidden' }` as the single source of truth for offer status values
    - `HANDYMAN_AVAILABILITY_STATUS` const object: `{ ONLINE: 'online', OFFLINE: 'offline' }`
    - `HandymanJobFeedItemSchema` with Zod: `offerId`, `requestId`, `categoryName`, `distanceKm` (`z.number().nullable()`), `roughArea` (`z.string().nullable()`), `estimatedTotal` (`z.number()`), `shortDescription` (`z.string()`), `offeredAt` (`z.string()`)
    - `HandymanJobFeedResponseSchema` as `z.array(HandymanJobFeedItemSchema)`
    - `UpdateHandymanAvailabilityRequestSchema`: `{ availabilityStatus: z.enum(['online', 'offline']) }`
    - `UpdateHandymanBaseLocationRequestSchema`: `{ lat: z.number(), lng: z.number() }`
  - [x] Export all new schemas and const objects from `packages/contracts/src/index.ts`

- [x] Task 3 — Backend: `matching` module (AC: 5)
  - [x] Create `apps/backend/src/modules/matching/` with:
    - `matching.module.ts` — declares and exports `MatchingService` and `MatchingController`, imports `PrismaModule` (or injects `PrismaService`)
    - `matching.service.ts` — implement `findAndOfferHandymen(requestId: string)`:
      1. Load request: `{ categoryId, locationLat, locationLng }`
      2. Find all `HandymanProfile` records where `availabilityStatus = 'online'` AND at least one `HandymanCategoryPreference` matches `categoryId`
      3. For each candidate: if `baseLocationLat`/`baseLocationLng` are set, compute Haversine distance and exclude if beyond `serviceRadiusKm`; if no base location, include (MVP fallback — no geospatial filter applied)
      4. Bulk-upsert `JobOfferVisibility` records using `createMany({ data: [...], skipDuplicates: true })` — idempotent
      - Return count of offers created
    - `matching.service.spec.ts` — unit tests (see Task 8)
    - `matching.controller.ts` — `GET /jobs/available` endpoint (see Task 4)
    - `dto/job-feed-response.dto.ts` — internal DTO if needed
  - [x] Add a private `haversineKm(lat1, lng1, lat2, lng2): number` helper method to `MatchingService`
  - [x] Register `MatchingModule` in `apps/backend/src/app.module.ts`

- [x] Task 4 — Backend: job feed endpoint (AC: 1, 2)
  - [x] Add `GET /jobs/available` to `MatchingController`:
    - Guards: `JwtAuthGuard`, `RolesGuard`, `@Roles('HANDYMAN')`
    - Fetch all `JobOfferVisibility` for `req.user.id` where `offerStatus = 'pending'`, joined with `ServiceRequest` (`categoryId`, `title`, `description`, `estimatedTotal`, `locationLat`, `locationLng`), `ServiceCategory` (`name`)
    - For each result, compute `distanceKm` using `haversineKm` between request location and handyman `baseLocationLat/Lng` (return `null` if either is unset)
    - Derive `roughArea`: return `null` for MVP (omit from card if null — architecture has no address snapshot field on requests)
    - Return array shaped as `HandymanJobFeedItem`; validate output against `HandymanJobFeedResponseSchema` at the contract boundary
  - [x] Load the handyman's own `HandymanProfile` once per request (to get base location and service radius) rather than per-item

- [x] Task 5 — Backend: availability toggle and base location endpoints (AC: 4)
  - [x] Add `PATCH /users/me/handyman-availability` to `UsersController` ([apps/backend/src/modules/users/users.controller.ts])
  - [x] Add `PATCH /users/me/handyman-base-location` to `UsersController`
  - [x] Add both service methods to `UsersService`

- [x] Task 6 — Frontend: `handyman-jobs` feature (AC: 1, 2, 4)
  - [x] Create `apps/frontend/src/features/handyman-jobs/` with all required files

- [x] Task 7 — Frontend: handyman navigation and routing (AC: 3)
  - [x] Create `apps/frontend/src/features/handyman-dashboard/components/HandymanNav.tsx` with exactly 4 items using `NavLink`
  - [x] Update `HandymanDashboardPage` to include `<HandymanNav />`
  - [x] Update [apps/frontend/src/App.tsx] with `/jobs`, `/history/handyman`, `/settings/handyman` routes

- [x] Task 8 — Tests (AC: 1, 2, 3, 4, 5)
  - [x] `matching.service.spec.ts` unit tests (all 7 scenarios covered)
  - [x] `matching.controller.spec.ts` unit tests (controller delegation + auth guard wiring)
  - [x] `UsersService` unit tests for `updateHandymanAvailability` and `updateHandymanBaseLocation`
  - [x] Frontend `HandymanJobsPage.test.tsx` (5 tests: locked state, empty state, job cards, accept/decline buttons, availability toggle)

## Dev Notes

### Critical Anti-Patterns to Avoid (Story 3.1 Lessons)

- **`role="checkbox"` on `<button>` is wrong** — use `aria-pressed` (AvailabilityToggle and any toggle-style button must follow this)
- **No `useEffect` that reseeds form state from props** — causes in-progress typing to be wiped; seed state only via `useState` initializer
- **Inactive-category checks must be inside `$transaction`** — avoid the validation-before-write race window
- **No `$queryRaw` / `$executeRaw`** — use typed Prisma client calls exclusively
- **Mutation `onError` must handle `AuthError` → `logout()`** — same as `useUpdateHandymanProfile`
- **No upper-bound on array fields** — if the job feed returns >50 items, add `@ArrayMaxSize` on DTOs

### Scope Boundary — Do NOT Build Here

- **Accept / decline business logic** → story 3.3. Buttons render but are `disabled`; do NOT wire API calls or state transitions.
- **Handyman job history page** → story 3.4. `/history/handyman` route exists as a stub only.
- **WebSocket / real-time feed** → story 4.3. This story uses polling **only** (`refetchInterval: 15_000`).
- **First-accept concurrency protection** → story 3.3.
- **Base location input UI form on the profile screen** — the `PATCH /users/me/handyman-base-location` endpoint must exist, but a full UI form for capturing it is deferred. The MVP fallback (include handymen with no base location) keeps the feed functional before location is set.

### Architecture Compliance

| Concern | Rule |
|---|---|
| Module ownership | `matching` owns `JobOfferVisibility` and eligibility; `users` owns availability toggle; `requests` calls `MatchingService` post-creation |
| Cross-module injection | `RequestsModule` imports `MatchingModule`; inject `MatchingService` into `RequestsService`; call `findAndOfferHandymen(requestId)` after request is saved (fire-and-forget with `catch(err => logger.error(err))`) |
| Realtime | Polling only for jobs feed — no `socket.io` in this story |
| TanStack Query | Object syntax `useQuery({ queryKey, queryFn, ... })` — not the positional signature |
| Frontend feature boundary | New code lives in `apps/frontend/src/features/handyman-jobs/` — never in `handyman-dashboard` |
| contracts | `availabilityStatus` stays a `String` on `HandymanProfile` (not a Prisma enum); contract layer (`z.enum(['online','offline'])`) enforces valid values |
| Legacy code | Do NOT touch `apps/handrix-web/` or `apps/handrix-api/` |

### Reuse — Do NOT Reinvent

- **Authenticated fetch**: copy pattern from `apps/frontend/src/features/handyman-dashboard/api/handyman-profile.api.ts` (token pre-check, `401` → `logout()`, schema validation)
- **TanStack Query hooks**: copy pattern from `apps/frontend/src/features/handyman-dashboard/hooks/useHandymanProfile.ts`
- **Profile completeness guard**: call `useHandymanProfile()` from `HandymanJobsPage`; re-use `isProfileComplete === false` branch to show the locked state (same seam built in story 3.1's `HandymanDashboardPage`)
- **Service categories endpoint**: `GET /api/categories` — do NOT add a new handyman-categories endpoint
- **Auth stack**: `JwtAuthGuard` + `RolesGuard` + `@Roles('HANDYMAN')` — same as `UsersController` endpoints

### Distance Calculation

Haversine formula goes in `MatchingService` as a private method (shown in Task 3). Use it for:
1. Filtering (exclude handymen with base location set but outside their radius)
2. Computing `distanceKm` on the job feed response

`distanceKm` is `null` when the handyman has no `baseLocationLat`/`baseLocationLng` — the frontend renders "—" in the distance field in that case.

### Rough Area

`service_requests` has `locationLat`/`locationLng` but no address text field. Return `roughArea: null` for MVP. The job card omits the rough-area row when null. Do NOT add a reverse-geocoding API call — that's scope creep.

### Project Structure

```
apps/backend/
  prisma/
    schema.prisma                           ← modify: add JobOfferVisibility + base_location fields to HandymanProfile
    migrations/<timestamp>_add_job_offer_visibility/migration.sql  ← new
  src/modules/
    matching/
      matching.module.ts                    ← new
      matching.service.ts                   ← new
      matching.controller.ts               ← new (GET /jobs/available)
      matching.service.spec.ts             ← new
      dto/job-feed-response.dto.ts         ← new
    users/
      users.controller.ts                  ← modify: add PATCH /users/me/handyman-availability and base-location
      users.service.ts                     ← modify: add updateHandymanAvailability + updateHandymanBaseLocation
      dto/update-availability.dto.ts       ← new
      dto/update-base-location.dto.ts      ← new
    requests/
      requests.service.ts                  ← modify: call matchingService.findAndOfferHandymen after request creation
      requests.module.ts                   ← modify: import MatchingModule
  src/app.module.ts                        ← modify: import MatchingModule

packages/contracts/src/
  handyman.schemas.ts                      ← modify: add feed + availability schemas + const objects
  index.ts                                 ← modify: export new schemas

apps/frontend/src/
  App.tsx                                  ← modify: add /jobs, /history/handyman, /settings/handyman routes
  features/
    handyman-jobs/
      api/handyman-jobs.api.ts             ← new
      api/handyman-availability.api.ts     ← new
      hooks/useHandymanJobs.ts             ← new
      hooks/useHandymanAvailability.ts     ← new
      components/JobCard.tsx               ← new
      components/AvailabilityToggle.tsx    ← new
      components/JobFeedEmptyState.tsx     ← new
      pages/HandymanJobsPage.tsx           ← new
      pages/HandymanJobsPage.test.tsx      ← new
    handyman-dashboard/
      components/HandymanNav.tsx           ← new (shared nav; also used by HandymanDashboardPage)
```

### References

- Story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story-32-Handyman-Jobs-Dashboard-and-Available-Job-Feed]
- Epic 3 scope and FR15–FR17, FR36–FR37: [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Handyman-Job-Marketplace--Matching]
- Matching strategy, assignment flow, Haversine rationale: [Source: _bmad-output/planning-artifacts/architecture.md#Matching-and-Assignment-Lifecycle]
- Module boundaries (matching, users, requests): [Source: _bmad-output/planning-artifacts/architecture.md#Module-Boundaries]
- Database schema (job_offer_visibilities, handyman_profiles): [Source: _bmad-output/planning-artifacts/architecture.md#Domain-Model-Recommendations]
- Polling vs WebSocket split: [Source: _bmad-output/planning-artifacts/architecture.md#Realtime-Transport-Strategy]
- Frontend feature boundaries and TanStack Query strategy: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- UX-DR2, UX-DR8 and handyman job cards: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-Design-Requirements]
- Journey 6 (Handyman Dashboard) and Journey 7 (Available Job Preview): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User-Journeys]
- Story 3.1 learnings, review patches, and reverted scope: [_bmad-output/implementation-artifacts/3-1-handyman-profile-setup-with-categories-and-service-radius.md#Dev-Agent-Record]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing stale `packages/contracts/dist/` (missing `handyman.schemas.js`) caused `HandymanDashboardPage.test.tsx` to fail before this story. Fixed by running `pnpm --filter @handrix/contracts build`.
- Pre-existing test failures unrelated to this story: `LoginPage.test.tsx` (3 tests — button label mismatch), `HealthCheck.test.tsx` (1 test — response shape mismatch). Neither file was modified.
- Rewrote existing `matching.service.ts` which had used `$queryRaw`/`$executeRaw` (anti-pattern) and uppercase status values (`'ONLINE'`, `'PENDING'`) — replaced with typed Prisma client calls and lowercase values matching schema defaults.
- Previous `matching.controller.ts` exposed endpoint at `GET /matching/job-offers/me`; updated to `GET /jobs/available` per story spec.
- Existing `requests.service.spec.ts` mocked `createVisibleOffersForRequest` — updated mock to `findAndOfferHandymen` after method rename and signature change to `(requestId: string)`.

### Completion Notes List

- All 8 tasks and subtasks implemented and verified.
- `JobOfferVisibility` model added to Prisma schema; migration SQL written; `prisma generate` run to refresh client types.
- `matching.service.ts` fully rewritten using Prisma typed client — no raw SQL. Haversine is a private method. MVP fallback: handymen with no `baseLocationLat/Lng` are always included.
- `findAndOfferHandymen` replaces old `createVisibleOffersForRequest`; called fire-and-forget from `RequestsService.create` with `.catch((err) => logger.error(err))`.
- `GET /jobs/available` (`MatchingController`) returns `HandymanJobFeedItem[]` with `offerId`, `requestId`, `categoryName`, `distanceKm` (nullable), `roughArea: null`, `estimatedTotal`, `shortDescription`, `offeredAt`.
- `PATCH /users/me/handyman-availability` and `PATCH /users/me/handyman-base-location` added to `UsersController`/`UsersService`.
- Frontend `handyman-jobs` feature fully created with API layer, TanStack Query hooks, `AvailabilityToggle`, `JobCard` (Accept/Decline disabled per scope, `data-story="3.3"`), `JobFeedEmptyState`, and `HandymanJobsPage`.
- `HandymanNav` with exactly 4 `NavLink` items added to `handyman-dashboard` feature and rendered in `HandymanDashboardPage`.
- `/jobs`, `/history/handyman`, `/settings/handyman` routes added to `App.tsx`.
- Backend: 66 tests pass (2 new service tests, 2 new controller tests, 7 matching service tests). Frontend: 5 new `HandymanJobsPage` tests pass; 5 previously-failing `HandymanDashboardPage` tests now pass after contracts rebuild.

### File List

apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/20260515120000_add_job_offer_visibility/migration.sql
apps/backend/src/modules/matching/matching.service.ts
apps/backend/src/modules/matching/matching.service.spec.ts
apps/backend/src/modules/matching/matching.controller.ts
apps/backend/src/modules/matching/matching.controller.spec.ts
apps/backend/src/modules/matching/matching.module.ts
apps/backend/src/modules/matching/dto/handyman-job-feed-response.dto.ts
apps/backend/src/modules/requests/requests.service.ts
apps/backend/src/modules/requests/requests.service.spec.ts
apps/backend/src/modules/users/users.controller.ts
apps/backend/src/modules/users/users.service.ts
apps/backend/src/modules/users/users.service.spec.ts
apps/backend/src/modules/users/dto/update-availability.dto.ts
apps/backend/src/modules/users/dto/update-base-location.dto.ts
packages/contracts/src/handyman.schemas.ts
apps/frontend/src/App.tsx
apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.tsx
apps/frontend/src/features/handyman-dashboard/components/HandymanNav.tsx
apps/frontend/src/features/handyman-jobs/api/handyman-jobs.api.ts
apps/frontend/src/features/handyman-jobs/api/handyman-availability.api.ts
apps/frontend/src/features/handyman-jobs/hooks/useHandymanJobs.ts
apps/frontend/src/features/handyman-jobs/hooks/useHandymanAvailability.ts
apps/frontend/src/features/handyman-jobs/components/AvailabilityToggle.tsx
apps/frontend/src/features/handyman-jobs/components/JobCard.tsx
apps/frontend/src/features/handyman-jobs/components/JobFeedEmptyState.tsx
apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.tsx
apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.test.tsx

### Review Findings

- [x] [Review][Decision] Requests with null locationLat/Lng broadcast to all eligible handymen — resolved: keep current behavior (include all matching handymen when request has no location), consistent with the MVP fallback for handymen without a base location.
- [x] [Review][Patch] `UpdateHandymanBaseLocationDto` missing lat/lng range validation — added `@Min(-90)/@Max(90)` for lat, `@Min(-180)/@Max(180)` for lng; also added `.min().max()` to Zod contract schema [apps/backend/src/modules/users/dto/update-base-location.dto.ts]
- [x] [Review][Patch] `HandymanJobFeedResponseDto` changed to `type` alias — added `@ApiResponse({ status: 200, type: HandymanJobFeedItemDto, isArray: true })` to the controller endpoint for correct Swagger documentation [apps/backend/src/modules/matching/matching.controller.ts]
- [x] [Review][Patch] `availabilityStatus: 'online'` hardcoded string in matching query — replaced with `HANDYMAN_AVAILABILITY_STATUS.ONLINE` from `@handrix/contracts` [apps/backend/src/modules/matching/matching.service.ts]
- [x] [Review][Patch] `estimatedTotal` rendered without `.toFixed(2)` — changed to `job.estimatedTotal.toFixed(2)` [apps/frontend/src/features/handyman-jobs/components/JobCard.tsx]
- [x] [Review][Patch] `staleTime: 10_000` < `refetchInterval: 15_000` — changed `staleTime` to `15_000` to match the poll interval [apps/frontend/src/features/handyman-jobs/hooks/useHandymanJobs.ts]
- [x] [Review][Patch] `HandymanJobsPage` renders jobs skeleton while `profileQuery.isLoading` — gated both the locked state and feed sections on `!profileQuery.isLoading` to prevent layout shift [apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.tsx]
- [x] [Review][Defer] `offerStatus` plain string with no DB-level enum constraint — any string value can be written, making status-based queries fragile [apps/backend/prisma/schema.prisma] — deferred, pre-existing schema pattern
- [x] [Review][Defer] `ON DELETE RESTRICT` on job_offer_visibilities FKs — handyman profile or service_request deletion will be blocked while pending offer records exist; no cleanup step in UsersService [apps/backend/prisma/migrations/20260515120000_add_job_offer_visibility/migration.sql] — deferred, pre-existing
- [x] [Review][Defer] `useHandymanProfile` query key coupling — `useHandymanAvailability.onSuccess` writes to `['handymanProfile']`; if the hook's key ever changes, the optimistic update silently breaks with no type error [apps/frontend/src/features/handyman-jobs/hooks/useHandymanAvailability.ts] — deferred, pre-existing
- [x] [Review][Defer] `offer.request` could be null if FK bypassed via raw SQL — RESTRICT constraint prevents this in normal flow but provides no application-layer guard in `findAvailableOffersForHandyman` [apps/backend/src/modules/matching/matching.service.ts] — deferred, pre-existing

## Change Log

- 2026-05-15: Implemented story 3.2 — Handyman Jobs Dashboard and Available Job Feed. Added `JobOfferVisibility` Prisma model with migration, rewrote matching service using typed Prisma client (removed all raw SQL), added `GET /jobs/available` endpoint, added availability toggle and base location PATCH endpoints, created full frontend handyman-jobs feature with polling, and added HandymanNav with 4-item navigation.
