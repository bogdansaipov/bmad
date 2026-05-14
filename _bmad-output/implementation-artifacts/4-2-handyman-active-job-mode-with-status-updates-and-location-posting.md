# Story 4.2: Handyman Active Job Mode with Status Updates and Location Posting

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an assigned handyman,
I want to enter a focused active-job view where I can update my status and share my location,
So that the customer always knows where I am and what stage the job is at.

## Acceptance Criteria

1. **Given** a handyman accepts a job **When** they enter the active-job view **Then** the map shows the customer/job location pin **And** the current job status and next required status action are clearly visible.

2. **Given** the handyman is in active-job mode **When** they update their status (`ON_THE_WAY` → `ARRIVED` → `WORKING` → `COMPLETE`) **Then** only the valid next transition is available as the dominant action **And** the status is persisted and the transition recorded in `request_status_history`.

3. **Given** the handyman is navigating to the job **When** their device location is available **Then** the handyman app posts the current location to the backend via REST **And** the location is stored as a `handyman_location_updates` record tied to the request and handyman.

4. **Given** the active job bottom sheet is visible on mobile **When** the handyman interacts with it **Then** status controls sit in a persistent bottom sheet or fixed action area — never buried in deep navigation **And** the bottom sheet supports collapsed, half-open, and full-detail states.

5. **Given** the handyman marks the job `COMPLETE` **When** the final status transition is saved **Then** the request is durably marked complete with a `completed_at` timestamp **And** the handyman is returned to their jobs dashboard.

## Tasks / Subtasks

- [ ] Task 1 — Extend Prisma for append-only request status history (AC: 2, 5)
  - [ ] Update `apps/backend/prisma/schema.prisma` to add a `RequestStatusHistory` model mapped to `request_status_history`.
  - [ ] Recommended fields:
    - `id String @id @default(uuid())`
    - `requestId String @map("request_id")`
    - `actorUserId String? @map("actor_user_id")`
    - `previousStatus RequestStatus? @map("previous_status")`
    - `nextStatus RequestStatus @map("next_status")`
    - `recordedAt DateTime @default(now()) @map("recorded_at")`
  - [ ] Add relations:
    - `ServiceRequest.statusHistory RequestStatusHistory[]`
    - optional actor relation to `User`
  - [ ] Add indexes on:
    - `[requestId, recordedAt]`
    - `[actorUserId, recordedAt]`
  - [ ] Keep the current request row canonical for latest state; history is append-only and audit-oriented.
  - [ ] If Story 4.1 has already added `handyman_location_updates`, preserve that schema and avoid overlapping migration churn.

- [ ] Task 2 — Define shared contracts for active-job reads, status updates, and location posts (AC: 1, 2, 3, 4, 5)
  - [ ] Create `packages/contracts/src/active-job.schemas.ts`.
  - [ ] Add schemas/types for:
    - `HandymanActiveJobViewSchema`
    - `UpdateActiveJobStatusBodySchema`
    - `UpdateActiveJobStatusResponseSchema`
    - `PostHandymanLocationBodySchema`
    - `PostHandymanLocationResponseSchema`
  - [ ] Recommended active-job view shape:
    ```typescript
    import { z } from 'zod';
    import { RequestStatusEnum } from './request.schemas';
    
    export const HandymanActiveJobViewSchema = z.object({
      requestId: z.string().uuid(),
      status: RequestStatusEnum,
      customerDisplayName: z.string(),
      categoryName: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      estimatedTotal: z.number().nullable(),
      jobLat: z.number().nullable(),
      jobLng: z.number().nullable(),
      nextAllowedStatus: RequestStatusEnum.nullable(),
    });
    ```
  - [ ] The allowed next states for this story are:
    - `ASSIGNED` → `ON_THE_WAY`
    - `ON_THE_WAY` → `ARRIVED`
    - `ARRIVED` → `WORKING`
    - `WORKING` → `COMPLETE`
  - [ ] Export from `packages/contracts/src/index.ts`.

- [ ] Task 3 — Build active-job query and mutation endpoints in backend modules (AC: 1, 2, 3, 5)
  - [ ] Add read/update seams, preferably in `apps/backend/src/modules/assignments/assignments.service.ts` and controller, since this story builds directly on assignment ownership.
  - [ ] Add `GET /assignments/active/:requestId`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.HANDYMAN`
    - only the assigned handyman may open the active-job record
  - [ ] Add `POST /assignments/active/:requestId/status`:
    - guarded and role-restricted the same way
    - validates only the next legal transition
  - [ ] Add `POST /assignments/active/:requestId/location`:
    - guarded and role-restricted the same way
    - stores a new `handyman_location_updates` row
  - [ ] Keep all three endpoints REST-based in 4.2; WebSocket push belongs to 4.3.

- [ ] Task 4 — Enforce the active-job status state machine in backend code (AC: 2, 5)
  - [ ] Implement the allowed transition map centrally in backend code, not in React:
    - `ASSIGNED` -> `ON_THE_WAY`
    - `ON_THE_WAY` -> `ARRIVED`
    - `ARRIVED` -> `WORKING`
    - `WORKING` -> `COMPLETE`
  - [ ] Reject illegal jumps such as:
    - `ASSIGNED` -> `WORKING`
    - `ARRIVED` -> `COMPLETE`
    - changing a `COMPLETE` request again
  - [ ] On each successful transition:
    - update `service_requests.status`
    - append a `request_status_history` row
    - if `COMPLETE`, set `completedAt`
  - [ ] Keep the state machine backend-owned and deterministic so customer and handyman views stay aligned.

- [ ] Task 5 — Add handyman location posting that remains REST-only in MVP (AC: 3)
  - [ ] `POST /assignments/active/:requestId/location` should:
    - validate the request belongs to the assigned handyman
    - validate numeric lat/lng bounds
    - append a new `handyman_location_updates` row
  - [ ] Do not stream or subscribe to location in this story.
  - [ ] Keep the latest-location read path compatible with Story 4.1’s customer tracking endpoint.
  - [ ] A lightweight cadence such as manual refresh, page-open post, or interval-based client posting is acceptable for MVP as long as it remains REST-driven.

- [ ] Task 6 — Build the handyman active-job frontend surface in the empty feature folder (AC: 1, 2, 3, 4, 5)
  - [ ] Create:
    - `apps/frontend/src/features/handyman-active-job/api/active-job.api.ts`
    - `apps/frontend/src/features/handyman-active-job/hooks/useHandymanActiveJob.ts`
    - `apps/frontend/src/features/handyman-active-job/hooks/useUpdateActiveJobStatus.ts`
    - `apps/frontend/src/features/handyman-active-job/hooks/usePostHandymanLocation.ts`
    - `apps/frontend/src/features/handyman-active-job/components/ActiveJobStatusRail.tsx`
    - `apps/frontend/src/features/handyman-active-job/components/HandymanActiveJobBottomSheet.tsx`
    - `apps/frontend/src/features/handyman-active-job/pages/HandymanActiveJobPage.tsx`
  - [ ] The active-job page should:
    - show the customer/job location pin on the map
    - show the current status prominently
    - present only the next allowed status as the dominant action
    - keep status controls in a persistent bottom sheet or fixed area
  - [ ] Use REST polling/query refresh for state in this story; real-time push comes in 4.3.

- [ ] Task 7 — Wire routing from Story 3.3 accept success into the active-job screen (AC: 1, 5)
  - [ ] Update `apps/frontend/src/App.tsx` to add a route such as:
    - `/handyman/active/:requestId`
  - [ ] Reuse the post-accept continuity seam introduced in Story 3.3.
  - [ ] After successful accept, the handyman should land in active-job mode rather than a generic dashboard stub.
  - [ ] When the handyman marks the job `COMPLETE`, route them back to the jobs dashboard or history-appropriate destination.

- [ ] Task 8 — Keep the map and bottom-sheet UX aligned with Story 4.1 (AC: 1, 4)
  - [ ] Reuse the provider-agnostic map seam from Story 4.1 where possible.
  - [ ] The handyman active-job view should feel parallel to the customer tracking view:
    - map-led
    - bottom-sheet driven
    - mobile-first
  - [ ] But it must remain action-oriented:
    - next status action is always obvious
    - no deep navigation to change status

- [ ] Task 9 — Prepare for 4.3 WebSocket push without implementing it yet (AC: 2, 3)
  - [ ] This story should not implement:
    - WebSocket gateways
    - subscription hooks
    - event fanout to customer screens
  - [ ] It should, however, leave clean seams so 4.3 can trigger push after:
    - status changes
    - assignment-confirmed activity
    - completion

- [ ] Task 10 — Tests for state transitions, location posting, and active-job ownership (AC: 1, 2, 3, 4, 5)
  - [ ] Backend unit tests:
    - legal transitions advance correctly
    - illegal transitions are rejected
    - `COMPLETE` sets `completedAt`
    - each legal status change appends a `request_status_history` row
    - location post creates a `handyman_location_updates` row
  - [ ] Backend e2e tests:
    - create `apps/backend/test/active-job.e2e-spec.ts`
    - no auth → `401`
    - customer token → `403`
    - unrelated handyman → `403` or `404`-safe failure
    - assigned handyman can read active job
    - assigned handyman can post valid next statuses only
    - assigned handyman can post location
    - completion marks request complete and returns durable final state
  - [ ] Frontend tests:
    - create `HandymanActiveJobPage.test.tsx`
    - map and current status render
    - only one dominant next action is shown
    - clicking status action calls mutation and refreshes view
    - location-posting seam is invoked without requiring WebSocket support

### Review Findings

_(populated after code review)_

## Dev Notes

### Dependency on Stories 3.3 and 4.1

Story 4.2 assumes:

- Story 3.3 has established assigned-job ownership and assignment truth
- Story 4.1 has established map/read-model and customer tracking seams

This story should extend those truths, not re-model assignment or tracking.

### State Machine Guidance

The valid handyman progression is intentionally linear:

- `ASSIGNED`
- `ON_THE_WAY`
- `ARRIVED`
- `WORKING`
- `COMPLETE`

Keep the backend in charge of enforcing it. The frontend should only render the next allowed move, not determine legality itself.

### Location Guidance

MVP location behavior here is deliberately modest:

- handyman posts location via REST
- customer reads latest known location via REST
- no streaming location channel

That keeps implementation lean while still enabling the two-pin experience.

### History Guidance

The architecture calls for append-only request status history. This story is the first one that truly needs it for lifecycle progression, so implement the smallest durable `request_status_history` seam that can support:

- auditing
- later customer timeline rendering
- later WebSocket event fanout

Avoid overbuilding a broader event-sourcing system.

### Frontend UX Guidance

The active-job screen should feel like a task console:

- one dominant next step
- map context always visible
- bottom sheet holds details and controls
- no clutter from future rating or history features

### Project Structure — New and Modified Files

```text
apps/backend/
  prisma/
    schema.prisma                                                      — MODIFY
    migrations/<timestamp>_add_request_status_history/
      migration.sql                                                    — NEW
  src/modules/assignments/
    assignments.controller.ts                                          — MODIFY
    assignments.service.ts                                             — MODIFY
    dto/
      active-job-view-response.dto.ts                                  — NEW
      update-active-job-status.dto.ts                                  — NEW
      post-handyman-location.dto.ts                                    — NEW

packages/contracts/
  src/
    active-job.schemas.ts                                              — NEW
    index.ts                                                           — MODIFY

apps/frontend/
  src/features/handyman-active-job/
    api/
      active-job.api.ts                                                — NEW
    hooks/
      useHandymanActiveJob.ts                                          — NEW
      useUpdateActiveJobStatus.ts                                      — NEW
      usePostHandymanLocation.ts                                       — NEW
    components/
      ActiveJobStatusRail.tsx                                          — NEW
      HandymanActiveJobBottomSheet.tsx                                 — NEW
    pages/
      HandymanActiveJobPage.tsx                                        — NEW
      HandymanActiveJobPage.test.tsx                                   — NEW
  src/App.tsx                                                          — MODIFY

apps/backend/test/
  active-job.e2e-spec.ts                                               — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked Prisma/service seams
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Route and state-machine behavior matter more than visual tile fidelity

### Git Intelligence Summary

Recent git history remains sparse, so the current architecture and story chain are the reliable guide:

- 3.3 created assignment truth
- 4.1 created customer tracking read seams
- 4.2 now adds handyman lifecycle mutation truth

### References

- Story 4.2 and Epic 4 context: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- Realtime, history, and map architecture: [Source: _bmad-output/planning-artifacts/architecture.md]
- Journey 3 lifecycle expectations: [Source: _bmad-output/planning-artifacts/prd.md]
- Story 4.1 customer tracking groundwork: [Source: _bmad-output/implementation-artifacts/4-1-customer-request-tracking-view-with-two-pin-map.md]
- Story 3.3 assignment groundwork: [Source: _bmad-output/implementation-artifacts/3-3-accept-or-decline-a-job-with-first-accept-assignment-protection.md]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 4.2 created — handyman active-job mode, linear status progression, REST location posting, and append-only status-history groundwork.
