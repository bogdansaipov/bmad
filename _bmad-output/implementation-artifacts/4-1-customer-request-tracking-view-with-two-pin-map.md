# Story 4.1: Customer Request Tracking View with Two-Pin Map

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer with an assigned request,
I want to see the handyman's identity and a map showing both our locations when I open my job,
So that I know who is coming and where they are right now.

## Acceptance Criteria

1. **Given** a customer opens a request that has been assigned **When** the tracking view loads **Then** the assigned handyman's display name is shown **And** a two-pin map renders with one pin at the job location and one at the handyman's most recently recorded location.

2. **Given** the tracking view map loads **When** it opens or the customer refreshes **Then** the map renders fully within 2 seconds under normal conditions **And** the handyman location pin is fetched via REST from the latest `handyman_location_updates` record — not streamed via WebSocket.

3. **Given** the customer is on the tracking view **When** the current lifecycle state is displayed **Then** the full customer-visible lifecycle is supported: `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`, `COMPLETE`, `REJECTED` **And** the current status is always visible without requiring the customer to scroll or open a detail panel.

4. **Given** the assigned job view is open on mobile **When** the layout renders **Then** the map fills most of the viewport and a bottom sheet holds the handyman identity, status, estimate, and job details **And** the bottom sheet supports collapsed, half-open, and full-detail states.

## Tasks / Subtasks

- [ ] Task 1 — Extend Prisma for handyman location snapshots and request status history groundwork (AC: 1, 2, 3)
  - [ ] Update `apps/backend/prisma/schema.prisma` to add a `HandymanLocationUpdate` model mapped to `handyman_location_updates`.
  - [ ] Recommended fields:
    - `id String @id @default(uuid())`
    - `requestId String @map("request_id")`
    - `handymanUserId String @map("handyman_user_id")`
    - `lat Float`
    - `lng Float`
    - `recordedAt DateTime @default(now()) @map("recorded_at")`
  - [ ] Add relations:
    - `ServiceRequest.handymanLocationUpdates HandymanLocationUpdate[]`
    - `User.handymanLocationUpdates HandymanLocationUpdate[]`
  - [ ] Add indexes on:
    - `[requestId, recordedAt]`
    - `[handymanUserId, recordedAt]`
  - [ ] If Story 4.2 will need lifecycle history soon, note but do not fully implement `request_status_history` here unless the current read model absolutely needs it.
  - [ ] Create the Prisma migration(s) needed for `handyman_location_updates`.

- [ ] Task 2 — Define shared contracts for customer tracking summary, map pins, and detail payloads (AC: 1, 2, 3, 4)
  - [ ] Create `packages/contracts/src/tracking.schemas.ts`.
  - [ ] Add schemas/types for:
    - `TrackingRequestStatusSchema`
    - `TrackingMapPinSchema`
    - `CustomerTrackingViewSchema`
  - [ ] Recommended shape:
    ```typescript
    import { z } from 'zod';
    import { RequestStatusEnum } from './request.schemas';
    
    export const TrackingMapPinSchema = z.object({
      lat: z.number(),
      lng: z.number(),
      label: z.string(),
      kind: z.enum(['job', 'handyman']),
    });
    
    export const CustomerTrackingViewSchema = z.object({
      requestId: z.string().uuid(),
      status: RequestStatusEnum,
      assignedHandymanDisplayName: z.string().nullable(),
      estimatedTotal: z.number().nullable(),
      categoryName: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      jobPin: TrackingMapPinSchema.nullable(),
      handymanPin: TrackingMapPinSchema.nullable(),
      updatedAt: z.string().datetime(),
    });
    ```
  - [ ] Export from `packages/contracts/src/index.ts`.
  - [ ] Keep the contract customer-safe and read-only; active-job control state belongs to Story 4.2.

- [ ] Task 3 — Build a customer tracking read endpoint in backend modules (AC: 1, 2, 3)
  - [ ] Add a customer-facing tracking query seam, preferably in `apps/backend/src/modules/requests/requests.service.ts`.
  - [ ] Add `GET /requests/:requestId/tracking`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.CUSTOMER`
    - request must belong to the authenticated customer
  - [ ] Response must include:
    - canonical request status
    - assigned handyman display name when assigned
    - request title, description, category, estimate
    - job location coordinates from the request
    - latest handyman location update via REST lookup
  - [ ] If no handyman location update exists yet for an assigned request:
    - return `handymanPin: null`
    - do not fail the whole tracking screen
  - [ ] Keep this endpoint read-only and independent from WebSocket concerns.

- [ ] Task 4 — Reuse assignment truth and keep lifecycle projection canonical (AC: 1, 3)
  - [ ] Reuse the assignment/request truth introduced in Story 3.3:
    - `assignedHandymanId`
    - `RequestStatus`
    - estimate/category/title data already persisted on the request
  - [ ] Supported customer statuses in this story:
    - `PENDING`
    - `ASSIGNED`
    - `ON_THE_WAY`
    - `ARRIVED`
    - `WORKING`
    - `COMPLETE`
    - `REJECTED`
  - [ ] Do not leak internal offer/assignment statuses such as:
    - `pending offer`
    - `expired`
    - `assignment locked`
  - [ ] Even though the story is centered on assigned jobs, the read model should remain stable if a customer opens tracking while the request is still `PENDING` or later `REJECTED`.

- [ ] Task 5 — Establish the map abstraction seam in the empty `maps` feature/module (AC: 1, 2, 4)
  - [ ] Create frontend map primitives under `apps/frontend/src/features/maps/`:
    - `MapShell.tsx`
    - `MapPin.ts` or equivalent marker helper
    - lightweight provider-agnostic props/contracts
  - [ ] Use MapLibre GL JS, which is already in `apps/frontend/package.json`.
  - [ ] The map component should accept generic pin data and avoid request-domain logic in the map layer itself.
  - [ ] Create backend `maps` seam only if needed for future provider abstraction, but do not overbuild geocoding services in this story.
  - [ ] No route line, ETA pathing, or navigation logic in 4.1.

- [ ] Task 6 — Build the customer tracking UI and bottom-sheet layout (AC: 1, 3, 4)
  - [ ] Create:
    - `apps/frontend/src/features/request-tracking/api/request-tracking.api.ts`
    - `apps/frontend/src/features/request-tracking/hooks/useCustomerTrackingView.ts`
    - `apps/frontend/src/features/request-tracking/components/TrackingBottomSheet.tsx`
    - `apps/frontend/src/features/request-tracking/pages/CustomerTrackingPage.tsx`
  - [ ] Use a polling-based query for this story:
    - reasonable `refetchInterval` such as `15_000` ms
    - WebSockets are intentionally deferred to Story 4.3
  - [ ] The page should:
    - keep the current status visible above the fold
    - show a two-pin map when both pins exist
    - still render gracefully if the handyman pin is temporarily absent
    - show handyman identity, estimate, request details, and status in a bottom sheet
  - [ ] Bottom sheet states:
    - collapsed glance
    - half-open action/detail
    - full detail
  - [ ] Optimize the layout for mobile-first use where the map owns most of the viewport.

- [ ] Task 7 — Add customer routing from dashboard/history to tracking (AC: 1, 3)
  - [ ] Update `apps/frontend/src/App.tsx` to add a customer tracking route such as:
    - `/requests/:requestId/tracking`
  - [ ] Preserve `RequireAuth requiredRole="CUSTOMER"` for the route.
  - [ ] Update customer dashboard request-card/list behavior as needed so assigned requests can navigate into the tracking page.
  - [ ] Do not break existing dashboard list behavior for `PENDING`, `COMPLETE`, or `REJECTED` requests.

- [ ] Task 8 — Prepare for 4.2 and 4.3 without pulling them forward (AC: 2, 3, 4)
  - [ ] This story should not implement:
    - handyman status mutation controls
    - WebSocket subscriptions
    - automatic in-place push updates
    - live location streaming
  - [ ] It should, however, leave clean seams for:
    - latest handyman location reads from REST
    - future status push integration
    - active-job map reuse between customer and handyman views

- [ ] Task 9 — Tests for ownership, map payloads, and bottom-sheet rendering (AC: 1, 2, 3, 4)
  - [ ] Backend unit tests:
    - tracking query returns job pin from request coordinates
    - latest handyman location update is selected correctly
    - assigned handyman display name projects correctly
    - customer ownership is enforced
    - null handyman pin does not fail the response
  - [ ] Backend e2e tests:
    - create `apps/backend/test/request-tracking.e2e-spec.ts`
    - no auth → `401`
    - handyman token → `403`
    - unrelated customer → `403` or `404`-safe failure
    - assigned request with location update → returns two pins
    - assigned request without handyman location update → returns job pin and `handymanPin: null`
  - [ ] Frontend tests:
    - create `CustomerTrackingPage.test.tsx`
    - loading state renders predictably
    - assigned request shows handyman name and current status
    - map section renders when pin data exists
    - bottom sheet renders collapsed/expanded detail content
    - graceful empty-state copy appears when handyman pin is not yet available

### Review Findings

_(populated after code review)_

## Dev Notes

### Dependency on Epic 3

Story 4.1 assumes Epic 3 has introduced:

- customer-visible request states through `ASSIGNED`
- assignment ownership and assigned handyman identity
- handyman jobs and active-job continuity seams

This story should consume those truths rather than recreating them.

### Map and Location Guidance

The architecture is explicit:

- use a provider-agnostic map seam
- use MapLibre GL JS in MVP
- fetch handyman location via REST on open/refresh
- do not stream location over WebSockets

That means 4.1 should focus on a clean read model and UI composition, not on transportation logic.

### Lifecycle Projection Guidance

The customer-facing lifecycle must remain simple and canonical:

- `PENDING`
- `ASSIGNED`
- `ON_THE_WAY`
- `ARRIVED`
- `WORKING`
- `COMPLETE`
- `REJECTED`

The tracking screen should support displaying any of them, even if the main “two-pin” experience is most valuable once the request is assigned.

### UI Guidance

The customer tracking screen should feel map-led and status-first:

- map dominates the viewport
- bottom sheet carries the detail burden
- current status is visible without scrolling
- no clutter from internal operational data

This is the first customer-facing “live job” surface, so it should feel meaningfully different from the dashboard list.

### Performance Guidance

The AC asks for a fast map open/refresh path. Keep the payload small and the query direct:

- one request read
- one latest-location read
- no WebSocket setup
- no extra geocoding network roundtrip required for initial render

### Project Structure — New and Modified Files

```text
apps/backend/
  prisma/
    schema.prisma                                              — MODIFY
    migrations/<timestamp>_add_handyman_location_updates/
      migration.sql                                            — NEW
  src/modules/requests/
    requests.controller.ts                                     — MODIFY
    requests.service.ts                                        — MODIFY

packages/contracts/
  src/
    tracking.schemas.ts                                        — NEW
    index.ts                                                   — MODIFY

apps/frontend/
  src/features/maps/
    MapShell.tsx                                               — NEW
    map-pins.ts                                                — NEW or equivalent helper
  src/features/request-tracking/
    api/
      request-tracking.api.ts                                  — NEW
    hooks/
      useCustomerTrackingView.ts                               — NEW
    components/
      TrackingBottomSheet.tsx                                  — NEW
    pages/
      CustomerTrackingPage.tsx                                 — NEW
      CustomerTrackingPage.test.tsx                            — NEW
  src/features/customer-dashboard/
    components/RequestCard.tsx                                 — MODIFY as needed for navigation
  src/App.tsx                                                  — MODIFY

apps/backend/test/
  request-tracking.e2e-spec.ts                                 — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked Prisma/service calls
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Map rendering tests should validate DOM/state integration, not actual map tiles

### Git Intelligence Summary

Recent git history is still sparse, so the strongest guidance comes from the current architecture and story artifacts:

- Epic 3 provided assignment truth
- Epic 4 now starts the customer’s live-job read experience
- WebSockets and handyman control remain intentionally deferred to later stories

### References

- Story 4.1 and Epic 4 context: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- Customer journey and lifecycle expectations: [Source: _bmad-output/planning-artifacts/prd.md]
- Realtime, map, and lifecycle architecture: [Source: _bmad-output/planning-artifacts/architecture.md]
- Story 3.3 assignment groundwork: [Source: _bmad-output/implementation-artifacts/3-3-accept-or-decline-a-job-with-first-accept-assignment-protection.md]
- Current app/router seams: [Source: apps/frontend/src/App.tsx]
- Existing package versions and MapLibre availability: [Source: apps/frontend/package.json], [Source: apps/backend/package.json]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 4.1 created — customer tracking view, two-pin map read model, and bottom-sheet UI seams for assigned requests.
