# Story 3.2: Handyman Jobs Dashboard and Available Job Feed

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in handyman,
I want to see a feed of available jobs that match my categories and service area,
So that I can quickly identify relevant work without wading through irrelevant requests.

## Acceptance Criteria

1. **Given** a handyman is logged in with categories and service radius set **When** the jobs dashboard loads **Then** only requests matching their supported categories and within their service radius are shown **And** the dashboard loads within 2 seconds under normal conditions.

2. **Given** a matching request exists **When** the handyman views the job card **Then** the card shows category, distance, rough area, estimate, and short description **And** accept and decline actions are accessible directly from the card without opening a detail screen.

3. **Given** the handyman navigation is rendered **When** the nav is visible **Then** it contains no more than 4 top-level items: Dashboard, Jobs, History, and Settings.

4. **Given** no matching jobs are currently available **When** the jobs feed loads **Then** a clear empty-state is shown **And** the handyman's online/offline status toggle is visible and actionable.

5. **Given** a new request is routed to eligible handymen **When** the backend identifies matching handymen by category and service radius **Then** a `job_offer_visibility` record is created for each eligible handyman **And** the offer appears in their feed without requiring a manual refresh.

## Tasks / Subtasks

- [ ] Task 1 — Add durable offer-visibility persistence for matchmaking (AC: 1, 5)
  - [ ] Update `apps/backend/prisma/schema.prisma` to add a `JobOfferVisibility` model mapped to `job_offer_visibilities`.
  - [ ] Recommended fields:
    - `id String @id @default(uuid())`
    - `requestId String @map("request_id")`
    - `handymanUserId String @map("handyman_user_id")`
    - `offerStatus String @default("pending") @map("offer_status")`
    - `offeredAt DateTime @default(now()) @map("offered_at")`
    - `respondedAt DateTime? @map("responded_at")`
  - [ ] Add relations:
    - `ServiceRequest.jobOfferVisibilities JobOfferVisibility[]`
    - `User.jobOfferVisibilities JobOfferVisibility[]`
  - [ ] Add unique constraint on `[requestId, handymanUserId]` so a request is shown at most once per handyman.
  - [ ] Add indexes that support the feed query:
    - `[handymanUserId, offerStatus, offeredAt]`
    - `[requestId]`
  - [ ] Keep `HandymanProfile.availabilityStatus` as the existing string column for MVP. Do not widen this story into a broad availability enum refactor.
  - [ ] Create a Prisma migration for the new table only.

- [ ] Task 2 — Define shared contracts for available-job feed payloads (AC: 1, 2, 4)
  - [ ] Create `packages/contracts/src/handyman-job.schemas.ts`.
  - [ ] Add schemas for:
    - `HandymanJobCardSchema`
    - `AvailableHandymanJobsResponseSchema`
    - `UpdateHandymanAvailabilityBodySchema`
  - [ ] Recommended contract shape:
    ```typescript
    import { z } from 'zod';
    
    export const HandymanAvailabilityStatusSchema = z.enum(['online', 'offline']);
    
    export const HandymanJobCardSchema = z.object({
      offerId: z.string().uuid(),
      requestId: z.string().uuid(),
      categoryName: z.string(),
      title: z.string(),
      shortDescription: z.string(),
      roughAreaLabel: z.string(),
      distanceKm: z.number(),
      estimatedTotal: z.number().nullable(),
      createdAt: z.string().datetime(),
    });
    
    export const AvailableHandymanJobsResponseSchema = z.object({
      availabilityStatus: HandymanAvailabilityStatusSchema,
      items: z.array(HandymanJobCardSchema),
    });
    
    export const UpdateHandymanAvailabilityBodySchema = z.object({
      availabilityStatus: HandymanAvailabilityStatusSchema,
    });
    ```
  - [ ] Export these from `packages/contracts/src/index.ts`.
  - [ ] Keep the feed response intentionally small and card-oriented. Story 3.2 does not need full request-detail contracts yet.

- [ ] Task 3 — Build matching services and jobs-feed endpoints in the empty `MatchingModule` (AC: 1, 4, 5)
  - [ ] Create `apps/backend/src/modules/matching/matching.service.ts`.
  - [ ] Create `apps/backend/src/modules/matching/matching.controller.ts`.
  - [ ] Create DTOs under `apps/backend/src/modules/matching/dto/`:
    - `available-handyman-jobs-response.dto.ts`
    - `update-handyman-availability.dto.ts`
  - [ ] Update `apps/backend/src/modules/matching/matching.module.ts` to register controller/service and import `PrismaModule`.
  - [ ] Add `GET /matching/handyman/jobs`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.HANDYMAN`
    - returns only `pending` offer rows for the current handyman
    - joins category and request data for the card payload
    - sorts newest offers first or shortest distance first; if both are available, prefer shortest distance then newest
  - [ ] Add `PATCH /matching/handyman/availability`:
    - guarded and role-restricted the same way
    - accepts `online` or `offline`
    - updates `handyman_profiles.availability_status`
    - returns the normalized status payload
  - [ ] Add a `routeRequestToEligibleHandymen(requestId: string)` method in `MatchingService` that:
    1. loads the request with category and coordinates
    2. finds handyman profiles with non-null radius and at least one matching category preference
    3. keeps only profiles with `availability_status = 'online'`
    4. filters by service radius using a simple Haversine distance in application code
    5. creates `job_offer_visibilities` rows for all eligible handymen using `createMany({ skipDuplicates: true })`
  - [ ] Export `MatchingService` so request creation can call it.

- [ ] Task 4 — Trigger matchmaking after customer request creation (AC: 5)
  - [ ] Update `apps/backend/src/modules/requests/requests.module.ts` to import `MatchingModule`.
  - [ ] Inject `MatchingService` into `RequestsService`.
  - [ ] After a service request is created successfully, call `routeRequestToEligibleHandymen(newRequest.id)`.
  - [ ] Keep the customer-visible request status as `PENDING`; do not set `ASSIGNED` here.
  - [ ] If Story 2.4 has not yet been implemented on the branch, preserve this step in the story as a required integration point once `POST /requests` exists. Do not invent a second request-submission path.

- [ ] Task 5 — Map available-job feed rows into card-friendly backend responses (AC: 1, 2)
  - [ ] Compute `distanceKm` in the backend so the frontend does not duplicate matching math.
  - [ ] Provide a privacy-safe `roughAreaLabel` even though reverse geocoding is not in scope yet.
  - [ ] Recommended MVP fallback for `roughAreaLabel`:
    - round lat/lng to 2 decimal places
    - format like `Near 41.30, 69.24`
  - [ ] Provide `shortDescription` by truncating `description` or falling back to `title`.
  - [ ] Keep `estimatedTotal` nullable because some requests may not yet have a populated estimate on partially integrated branches.

- [ ] Task 6 — Create the handyman jobs frontend surface with polling-based updates (AC: 1, 2, 3, 4, 5)
  - [ ] Create `apps/frontend/src/features/handyman-jobs/api/handyman-jobs.api.ts` with:
    - `fetchAvailableHandymanJobs()`
    - `updateHandymanAvailability()`
  - [ ] Follow the authenticated fetch/error/Zod-parse pattern already used by:
    - `apps/frontend/src/features/customer-dashboard/api/requests.api.ts`
    - `apps/frontend/src/features/request-create/api/categories.api.ts`
  - [ ] Create hooks:
    - `apps/frontend/src/features/handyman-jobs/hooks/useAvailableHandymanJobs.ts`
    - `apps/frontend/src/features/handyman-jobs/hooks/useUpdateHandymanAvailability.ts`
  - [ ] Use TanStack Query polling, not WebSockets, for this feed:
    - `refetchInterval` around `10_000` to `15_000` ms
    - `staleTime` short enough for near-live updates
  - [ ] Create components:
    - `HandymanJobCard.tsx`
    - `HandymanJobsList.tsx`
    - `HandymanJobsEmptyState.tsx`
    - `HandymanAvailabilityToggle.tsx`
  - [ ] Card content must show:
    - category
    - distance
    - rough area
    - estimate
    - short description
    - inline `Accept` and `Decline` buttons on the card surface
  - [ ] The buttons should be rendered as real action slots now, but Story 3.3 owns the transactional accept/decline behavior. In 3.2, wire them through explicit callback props or a dedicated hook seam; do not fake assignment state changes locally.

- [ ] Task 7 — Replace the handyman dashboard stub with a jobs-first dashboard shell (AC: 1, 3, 4)
  - [ ] Remove `HandymanDashboardStub` from `apps/frontend/src/App.tsx`.
  - [ ] Create:
    - `apps/frontend/src/features/handyman-dashboard/components/HandymanNav.tsx`
    - `apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.tsx`
    - `apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.tsx`
  - [ ] Use exactly 4 nav items:
    - `Dashboard`
    - `Jobs`
    - `History`
    - `Settings`
  - [ ] If Story 3.1 pages/components already exist on the branch, reuse them instead of recreating them.
  - [ ] Dashboard behavior:
    - if profile is incomplete, keep blocking on the Story 3.1 profile-completion flow
    - if profile is complete, show available jobs preview plus availability toggle
  - [ ] Jobs page behavior:
    - full list of available jobs
    - loading skeleton
    - empty state when no matching jobs exist
    - no manual refresh button required because polling keeps the feed current

- [ ] Task 8 — Preserve explicit seams for Story 3.3 accept/decline and assignment locking (AC: 2)
  - [ ] Define a future-facing API seam for accept/decline, but do not implement the transactional semantics yet.
  - [ ] Acceptable options for this story:
    - callback props on `HandymanJobCard`
    - a dedicated `useJobOfferActions()` hook with TODO-backed mutation stubs
    - a small `job-offer-actions.api.ts` module that exports typed placeholders and is clearly marked as Story 3.3-owned
  - [ ] Unacceptable for this story:
    - local UI state pretending a request was accepted
    - mutating `assignedHandymanId`
    - hiding jobs from the feed without backend truth
    - implementing first-accept concurrency logic early

- [ ] Task 9 — Tests for matching, feed filtering, and dashboard UI (AC: 1, 2, 3, 4, 5)
  - [ ] Backend unit tests:
    - create `apps/backend/src/modules/matching/matching.service.spec.ts`
    - test category filtering excludes unsupported categories
    - test radius filtering excludes jobs outside `serviceRadiusKm`
    - test offline handymen do not receive offer rows
    - test `createMany(...skipDuplicates)` path does not duplicate offers
    - test `GET /matching/handyman/jobs` mapping includes distance, rough area, estimate, and short description
  - [ ] Backend e2e tests:
    - create `apps/backend/test/matching.e2e-spec.ts`
    - `GET /matching/handyman/jobs` no auth → `401`
    - customer token → `403`
    - complete handyman profile with online availability + matching request → feed includes offer
    - offline handyman with same profile → feed empty
    - out-of-radius handyman → feed empty
    - `PATCH /matching/handyman/availability` updates status between `online` and `offline`
  - [ ] Frontend tests:
    - create `apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.test.tsx`
    - create `apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.test.tsx`
    - test exactly 4 nav items render
    - test loading state uses a skeleton with `aria-busy`
    - test empty state still shows online/offline toggle
    - test populated state shows distance, rough area, estimate, short description, and inline action buttons
    - test polling hook is configured with a refetch interval

### Review Findings

_(populated after code review)_

## Dev Notes

### Dependency on Story 3.1

Story 3.2 assumes Story 3.1 exists because the jobs feed depends on:

- handyman category preferences
- `serviceRadiusKm`
- handyman settings/profile completion
- a reusable handyman nav shell

If 3.1 has not actually been implemented on the branch yet, treat it as a prerequisite and reuse its endpoints/components once landed instead of rebuilding them differently here.

### What Already Exists and Must Be Reused

**Customer request creation already defines the upstream event.** `RequestsService` is where the customer request record exists today, so matchmaking should attach to request creation there rather than inventing a separate dispatcher path.

**Matching, assignments, and realtime modules are still stubs.** `apps/backend/src/modules/matching/matching.module.ts`, `assignments.module.ts`, and `realtime.module.ts` are empty, so Story 3.2 is the first place where `MatchingModule` becomes real. Keep scope inside matching and leave assignment locking to Story 3.3.

**The handyman frontend folders are empty.** `apps/frontend/src/features/handyman-dashboard` and `handyman-jobs` currently contain no implementation. `App.tsx` still serves an inline handyman stub, so this story should establish the real jobs-first shell.

**Polling is the right realtime level here.** The architecture explicitly allows polling for the handyman jobs feed and reserves WebSockets for assigned/in-progress job updates later. Do not add sockets in 3.2.

### Matching Rules for MVP

Keep matching intentionally simple:

- handyman is `online`
- handyman supports the request category
- request coordinates fall within the handyman's service radius

Do not add:

- scoring
- batching
- prioritization heuristics
- surge logic
- provider ranking
- queue workers

### Distance and Rough Area Guidance

There is no reverse-geocoded address snapshot in the current request model. The feed still needs a rough area label, so use a privacy-safe fallback derived from rounded coordinates until a later map/location story introduces richer geography text.

Recommended display values:

- `distanceKm`: computed in backend with Haversine and rounded to one decimal place for UI display
- `roughAreaLabel`: `Near {lat.toFixed(2)}, {lng.toFixed(2)}`

This is good enough for MVP card scanning and avoids inventing unsupported geocoding infrastructure.

### Offer Visibility Ownership

The `job_offer_visibilities` table is the source of truth for who can see which request in the available jobs feed. Story 3.2 should create those rows and read from them. Story 3.3 will update those rows from `pending` to `declined` or `accepted`.

That means 3.2 should not filter the feed straight from `service_requests` alone. It must flow through offer visibility records.

### API Shape and Seams

Recommended backend ownership:

- `MatchingModule` owns routing logic and feed queries
- `RequestsModule` triggers matchmaking after request creation
- `UsersModule` or existing profile surfaces may continue to own broader handyman profile updates from Story 3.1

Recommended endpoint surface for this story:

```typescript
GET /matching/handyman/jobs
PATCH /matching/handyman/availability
```

Keep accept/decline endpoints out of this story so the assignment contract and race protections stay concentrated in 3.3.

### UI Behavior Boundaries

Job cards in 3.2 must make actions visible and direct, but they must not lie about backend state.

Do:

- render inline `Accept` and `Decline` buttons
- wire a clean callback/mutation seam
- keep the card usable on mobile without a detail screen

Do not:

- mark jobs accepted locally
- disappear jobs optimistically without backend confirmation
- implement first-accept semantics

### Performance Expectations

The AC calls for the dashboard to load within 2 seconds under normal conditions. Keep the implementation simple and query-efficient:

- index offer rows by handyman and status
- keep response payload small
- fetch only the fields needed for card rendering
- avoid n+1 queries when joining categories and requests

No caching layer is required for MVP if the query is shaped well.

### Project Structure — New and Modified Files

```text
apps/backend/
  prisma/
    schema.prisma                                         — MODIFY
    migrations/<timestamp>_add_job_offer_visibilities/
      migration.sql                                       — NEW
  src/modules/matching/
    matching.module.ts                                    — MODIFY
    matching.service.ts                                   — NEW
    matching.controller.ts                                — NEW
    dto/
      available-handyman-jobs-response.dto.ts             — NEW
      update-handyman-availability.dto.ts                 — NEW
  src/modules/requests/
    requests.module.ts                                    — MODIFY
    requests.service.ts                                   — MODIFY

packages/contracts/
  src/
    handyman-job.schemas.ts                               — NEW
    index.ts                                              — MODIFY

apps/frontend/
  src/features/handyman-dashboard/
    components/
      HandymanNav.tsx                                     — NEW or REUSE from 3.1
    pages/
      HandymanDashboardPage.tsx                           — NEW
      HandymanDashboardPage.test.tsx                      — NEW
  src/features/handyman-jobs/
    api/
      handyman-jobs.api.ts                                — NEW
    hooks/
      useAvailableHandymanJobs.ts                         — NEW
      useUpdateHandymanAvailability.ts                    — NEW
    components/
      HandymanJobCard.tsx                                 — NEW
      HandymanJobsList.tsx                                — NEW
      HandymanJobsEmptyState.tsx                          — NEW
      HandymanAvailabilityToggle.tsx                      — NEW
    pages/
      HandymanJobsPage.tsx                                — NEW
      HandymanJobsPage.test.tsx                           — NEW
  src/App.tsx                                             — MODIFY

apps/backend/test/
  matching.e2e-spec.ts                                    — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked `PrismaService`
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Polling behavior should be asserted at the hook/config level instead of sleeping in tests
- Keep role guard tests explicit because these routes are handyman-only

### Git Intelligence Summary

Recent repo changes have been story-driven and contract-first:

- `bf47c7c create story for 2.4`
- `a4cb1a6 polish UI`
- `ccb2349 finish epic 1`

Keep following that pattern here: shared schemas first, backend/query truth second, frontend feed third, action semantics later in 3.3.

### References

- Story 3.2 acceptance criteria and Epic 3 context: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- FR15, FR16, FR17, FR20, FR36, FR37: [Source: _bmad-output/planning-artifacts/epics.md#FR Coverage Map]
- Handyman journey and jobs dashboard context: [Source: _bmad-output/planning-artifacts/prd.md]
- Polling vs WebSocket guidance and domain entities: [Source: _bmad-output/planning-artifacts/architecture.md]
- Matching strategy and assignment flow: [Source: _bmad-output/planning-artifacts/architecture.md#Matching and Assignment Lifecycle]
- Handyman components and jobs-first UX direction: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Current backend request creation seam: [Source: apps/backend/src/modules/requests/requests.service.ts]
- Current handyman route stub: [Source: apps/frontend/src/App.tsx]
- Existing dashboard fetch/query pattern: [Source: apps/frontend/src/features/customer-dashboard/api/requests.api.ts], [Source: apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 3.2 created — available jobs feed, offer visibility persistence, and polling-based handyman jobs dashboard.
