# Story 3.3: Accept or Decline a Job with First-Accept Assignment Protection

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a handyman reviewing a job,
I want to accept or decline it, knowing that if I accept first I get the job and no one else can,
So that the system is fair and I can act quickly with confidence.

## Acceptance Criteria

1. **Given** a handyman taps accept on a matching job **When** the accept request reaches the backend **Then** the backend opens a database transaction, applies a row-level lock on the request, re-checks the request status, and creates the assignment record **And** the request status transitions to `ASSIGNED` and is visible to the customer.

2. **Given** two handymen attempt to accept the same request simultaneously **When** both accept requests are processed **Then** only the first to complete the transaction receives the assignment **And** the second receives a clear "already assigned" error without a confusing failure state.

3. **Given** a handyman declines a job **When** the decline action is submitted **Then** the offer record for that handyman is marked declined **And** the job no longer appears in that handyman's feed while remaining visible to other eligible handymen.

4. **Given** a request has been routed to eligible handymen but none has accepted **When** the customer views the request **Then** the customer-visible status remains `PENDING` **And** no partial or misleading assignment information is shown.

5. **Given** a request exhausts available matching opportunities without acceptance **When** the system determines the request cannot be fulfilled **Then** the request status transitions to `REJECTED` **And** the customer sees a clear `REJECTED` state with no ambiguity.

## Tasks / Subtasks

- [ ] Task 1 — Add durable assignment and offer-state persistence in Prisma (AC: 1, 2, 3, 5)
  - [ ] Extend `apps/backend/prisma/schema.prisma` with a `RequestAssignment` model mapped to `request_assignments`.
  - [ ] Recommended fields:
    - `id String @id @default(uuid())`
    - `requestId String @unique @map("request_id")`
    - `handymanUserId String @map("handyman_user_id")`
    - `assignmentStatus String @default("active") @map("assignment_status")`
    - `acceptedAt DateTime @default(now()) @map("accepted_at")`
    - `createdAt DateTime @default(now()) @map("created_at")`
  - [ ] Add relations:
    - `ServiceRequest.assignment RequestAssignment?`
    - `User.requestAssignments RequestAssignment[]`
  - [ ] Ensure the schema shape from Story 3.2’s `JobOfferVisibility` work can support these offer statuses cleanly:
    - `pending`
    - `declined`
    - `accepted`
    - `expired`
  - [ ] Add indexes on assignment lookup fields and preserve the one-live-assignment-per-request rule with a unique constraint on `requestId`.
  - [ ] Create the Prisma migration(s) needed for assignment persistence and any offer-status normalization required by Story 3.2.

- [ ] Task 2 — Define shared contracts for offer actions and assignment results (AC: 1, 2, 3, 5)
  - [ ] Create `packages/contracts/src/assignment.schemas.ts`.
  - [ ] Add schemas/types for:
    - `AcceptJobOfferBodySchema`
    - `DeclineJobOfferBodySchema`
    - `AcceptJobOfferResponseSchema`
    - `DeclineJobOfferResponseSchema`
    - `AssignmentConflictErrorSchema` or a clearly typed error contract note
  - [ ] Recommended acceptance response shape:
    ```typescript
    import { z } from 'zod';
    import { RequestStatusEnum } from './request.schemas';
    
    export const AcceptJobOfferResponseSchema = z.object({
      requestId: z.string().uuid(),
      assignmentId: z.string().uuid(),
      status: RequestStatusEnum,
      assignedHandymanDisplayName: z.string(),
      acceptedAt: z.string().datetime(),
    });
    ```
  - [ ] Recommended decline response shape:
    ```typescript
    export const DeclineJobOfferResponseSchema = z.object({
      offerId: z.string().uuid(),
      offerStatus: z.literal('declined'),
    });
    ```
  - [ ] Export the new schemas from `packages/contracts/src/index.ts`.

- [ ] Task 3 — Build assignment endpoints in the currently empty `AssignmentsModule` (AC: 1, 2, 3, 5)
  - [ ] Create `apps/backend/src/modules/assignments/assignments.service.ts`.
  - [ ] Create `apps/backend/src/modules/assignments/assignments.controller.ts`.
  - [ ] Create DTOs in `apps/backend/src/modules/assignments/dto/`:
    - `accept-job-offer.dto.ts`
    - `decline-job-offer.dto.ts`
    - `accept-job-offer-response.dto.ts`
    - `decline-job-offer-response.dto.ts`
  - [ ] Update `apps/backend/src/modules/assignments/assignments.module.ts` to register controller/service and import `PrismaModule`.
  - [ ] Add `POST /assignments/offers/:offerId/accept`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.HANDYMAN`
    - only the handyman who owns the offer may act on it
  - [ ] Add `POST /assignments/offers/:offerId/decline`:
    - guarded and role-restricted the same way
    - only the offer owner may decline it
  - [ ] Keep assignment ownership in `AssignmentsModule`; do not bury accept/decline mutations inside `MatchingModule`.

- [ ] Task 4 — Implement transactional first-accept locking in `AssignmentsService.acceptOffer(...)` (AC: 1, 2, 4)
  - [ ] Use `prisma.$transaction(...)` for the full accept flow.
  - [ ] Inside the transaction:
    1. load the target offer row for the current handyman
    2. verify the offer is still `pending`
    3. load the related request row with a lock-sensitive query path
    4. re-check that request status is still `PENDING`
    5. create the `request_assignments` row
    6. update `service_requests.assignedHandymanId`
    7. update `service_requests.status` to `ASSIGNED`
    8. mark the winning offer `accepted`
    9. mark competing pending offers for that request as `expired` or equivalent non-visible state
  - [ ] The response should include enough data for the handyman UI to remove the card and for the customer dashboard to show assigned context on refresh.
  - [ ] Do not rely on optimistic frontend state to simulate the assignment.

- [ ] Task 5 — Return a stable conflict path for losing acceptors (AC: 2)
  - [ ] If a second handyman attempts to accept after the request has already been assigned:
    - do not throw a vague 500
    - return a stable business error such as `409 Conflict`
    - include a customer-safe / handyman-clear message like `This job was already assigned.`
  - [ ] Acceptable backend mechanisms:
    - row-level lock on the request row plus in-transaction status re-check
    - unique assignment constraint on `requestId`
    - both together for defense in depth
  - [ ] The story must explicitly prevent “double winner” states even under concurrent requests.

- [ ] Task 6 — Implement decline behavior and rejection exhaustion handling (AC: 3, 5)
  - [ ] `declineOffer(...)` should:
    - verify ownership of the offer
    - update that offer row to `declined`
    - make the declined job disappear from the acting handyman’s visible feed
  - [ ] After each decline, check whether any `pending` offers remain for the same request.
  - [ ] If no `pending` offers remain and no assignment exists:
    - update `service_requests.status` to `REJECTED`
    - preserve `assignedHandymanId = null`
  - [ ] If at least one other `pending` offer remains:
    - keep customer-visible status as `PENDING`
    - do not imply partial assignment progress to the customer

- [ ] Task 7 — Keep customer request list projection aligned with assignment truth (AC: 1, 4, 5)
  - [ ] Update `apps/backend/src/modules/requests/requests.service.ts` only as needed so `GET /requests` reflects:
    - `PENDING` with no assigned handyman until a winner exists
    - `ASSIGNED` plus `assignedHandymanDisplayName` immediately after a successful acceptance
    - `REJECTED` when all offers are exhausted without assignment
  - [ ] Do not expose internal offer states like `declined`, `expired`, or `assignment locked` on customer surfaces.

- [ ] Task 8 — Wire real accept/decline mutations into the handyman jobs UI from Story 3.2 (AC: 1, 2, 3)
  - [ ] Create `apps/frontend/src/features/handyman-jobs/api/job-offer-actions.api.ts`.
  - [ ] Add:
    - `acceptJobOffer(offerId: string)`
    - `declineJobOffer(offerId: string)`
  - [ ] Follow the authenticated fetch + Zod parse pattern already established in frontend API modules.
  - [ ] Create hooks:
    - `useAcceptJobOffer.ts`
    - `useDeclineJobOffer.ts`
  - [ ] Update `HandymanJobCard.tsx` / jobs-list components from Story 3.2 so inline buttons call real backend mutations.
  - [ ] On success:
    - accepted offer disappears from the available-jobs list
    - declined offer disappears from the acting handyman’s list
    - related jobs queries are invalidated/refetched
  - [ ] On accept conflict:
    - show a calm inline or toast-style error
    - refetch the jobs feed
    - do not leave the card in a fake accepted state

- [ ] Task 9 — Create the first assigned-handyman shell for post-accept continuity (AC: 1)
  - [ ] Add a minimal `apps/frontend/src/features/handyman-active-job/pages/HandymanActiveJobPage.tsx`.
  - [ ] After a successful accept, route or prepare routing toward an active-job surface such as `/handyman/active/:requestId`.
  - [ ] This story does not need the full Epic 4 status-update rail yet, but it should create the first real destination for an assigned handyman after acceptance.
  - [ ] Keep the page lightweight:
    - assigned request title
    - customer/job summary
    - current status chip
    - placeholder note that active status controls arrive in Story 4.2

- [ ] Task 10 — Tests for concurrency, decline visibility, and rejection truth (AC: 1, 2, 3, 4, 5)
  - [ ] Backend unit tests:
    - create `apps/backend/src/modules/assignments/assignments.service.spec.ts`
    - accepting a pending offer creates assignment + updates request status to `ASSIGNED`
    - second accept on already-assigned request yields conflict
    - declining a pending offer marks only that offer declined
    - final decline on the last remaining pending offer transitions request to `REJECTED`
    - decline while other pending offers remain keeps request `PENDING`
  - [ ] Backend e2e tests:
    - create `apps/backend/test/assignments.e2e-spec.ts`
    - no auth → `401`
    - customer token on accept/decline endpoints → `403`
    - non-owner handyman on an offer → `403` or `404`-safe ownership failure
    - valid first accept → `201`/`200` with assignment response and request now `ASSIGNED`
    - competing accept after winner exists → `409`
    - decline removes job from acting handyman feed
    - last remaining decline causes request to appear as `REJECTED` for the customer
  - [ ] Frontend tests:
    - add `apps/frontend/src/features/handyman-jobs/pages/HandymanJobsPage.test.tsx` coverage for:
      - successful accept mutation
      - conflict refresh path
      - successful decline removal
    - add route-level coverage if active-job navigation is introduced in `App.tsx`

### Review Findings

_(populated after code review)_

## Dev Notes

### Dependency on Story 3.2

Story 3.3 assumes Story 3.2 has introduced:

- `job_offer_visibilities`
- handyman jobs feed endpoints
- offer ownership semantics
- online/offline-driven matching

If 3.2 has not yet landed on the branch, 3.3 should not invent an alternate offer source. Accept/decline must operate on the same offer rows the jobs feed uses.

### What Already Exists and Must Be Reused

**Customer status should remain simple.** The architecture explicitly says not to leak matching internals into customer-visible lifecycle states. Offer-level outcomes like `declined`, `expired`, and `assignment locked` must stay internal.

**Customer request lists already project assigned handyman context.** `apps/backend/src/modules/requests/requests.service.ts` already includes `assignedHandyman.handymanProfile.displayName` in the customer list response, so successful assignment should flow through that existing seam instead of adding a separate customer-assignment endpoint.

**AssignmentsModule is currently empty.** That makes it the correct owner for accept/decline business mutations. Matching should continue to own eligibility and routing, not transactional winner selection.

### Transaction and Locking Guidance

The story acceptance criteria and architecture are aligned here: use a database transaction and unique assignment guarantees.

Minimum safe MVP protection:

- transaction boundary around accept
- row-level lock or equivalent lock-safe re-check on the request row
- unique assignment constraint on request
- in-transaction validation that request status is still `PENDING`

This is enough for MVP and avoids distributed locking overengineering.

### Offer-State Guidance

Recommended internal offer states for 3.3:

- `pending`
- `accepted`
- `declined`
- `expired`

`expired` is the cleanest state for losing or superseded offers after another handyman wins. The feed should only surface `pending`.

### Rejection Guidance

`REJECTED` is not a generic error state. It means:

- the request was valid
- matching opportunities were exhausted
- no handyman accepted through the marketplace flow

Only transition to `REJECTED` when:

- no active assignment exists
- no pending offers remain

Do not mark a request rejected simply because one handyman declined it.

### Frontend UX Guidance

The jobs UI should feel fast and confident:

- accept and decline remain inline actions on the card
- conflict messages should be short and direct
- the screen should refresh from backend truth after every mutation
- no fake local assignment states

If an active-job route is introduced now, keep it intentionally minimal so Epic 4 can expand it cleanly.

### Project Structure — New and Modified Files

```text
apps/backend/
  prisma/
    schema.prisma                                              — MODIFY
    migrations/<timestamp>_add_request_assignments/
      migration.sql                                            — NEW
  src/modules/assignments/
    assignments.module.ts                                      — MODIFY
    assignments.service.ts                                     — NEW
    assignments.controller.ts                                  — NEW
    dto/
      accept-job-offer.dto.ts                                  — NEW
      decline-job-offer.dto.ts                                 — NEW
      accept-job-offer-response.dto.ts                         — NEW
      decline-job-offer-response.dto.ts                        — NEW
  src/modules/requests/
    requests.service.ts                                        — MODIFY

packages/contracts/
  src/
    assignment.schemas.ts                                      — NEW
    index.ts                                                   — MODIFY

apps/frontend/
  src/features/handyman-jobs/
    api/
      job-offer-actions.api.ts                                 — NEW
    hooks/
      useAcceptJobOffer.ts                                     — NEW
      useDeclineJobOffer.ts                                    — NEW
    components/
      HandymanJobCard.tsx                                      — MODIFY (from 3.2)
    pages/
      HandymanJobsPage.test.tsx                                — MODIFY
  src/features/handyman-active-job/
    pages/
      HandymanActiveJobPage.tsx                                — NEW
  src/App.tsx                                                  — MODIFY if active-job route is added

apps/backend/test/
  assignments.e2e-spec.ts                                      — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked Prisma service and transaction behavior
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Concurrency tests do not need true multi-process load; they do need deterministic simulation of the “winner already exists” path and transaction-safe guards

### Git Intelligence Summary

Recent repo history remains light, so the current source tree is the real authority:

- requests module already owns customer dashboard projection
- auth guards already enforce role-based surfaces
- assignments and matching modules are intentionally empty seams waiting for this epic

### References

- Story 3.3 and Epic 3 context: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- Matching and assignment lifecycle: [Source: _bmad-output/planning-artifacts/architecture.md#Matching and Assignment Lifecycle]
- Internal/public offer-state split: [Source: _bmad-output/planning-artifacts/architecture.md#Internal Status and Offer Model]
- Journey requirements for first-accept ownership: [Source: _bmad-output/planning-artifacts/prd.md]
- Current customer request projection seam: [Source: apps/backend/src/modules/requests/requests.service.ts]
- Current request controller/auth pattern: [Source: apps/backend/src/modules/requests/requests.controller.ts], [Source: apps/backend/src/modules/auth/index.ts]
- Current empty assignment and matching module seams: [Source: apps/backend/src/modules/assignments/assignments.module.ts], [Source: apps/backend/src/modules/matching/matching.module.ts]
- Story 3.2 feed/offer groundwork: [Source: _bmad-output/implementation-artifacts/3-2-handyman-jobs-dashboard-and-available-job-feed.md]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 3.3 created — transactional accept/decline handling, assignment locking, and rejection truth for the marketplace flow.
