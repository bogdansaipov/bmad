# Story 3.4: Handyman Job History

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a handyman,
I want to view a history of all my past accepted, declined, and completed jobs,
So that I have continuity across sessions and can review past work.

## Acceptance Criteria

1. **Given** a handyman navigates to their job history **When** the history screen loads **Then** all past jobs are listed with their final status (accepted, declined, completed) and basic details **And** the list is ordered with the most recent jobs first.

2. **Given** the handyman opens a past job from history **When** the job detail loads **Then** they can see the full request details without affecting any live workflow **And** viewing a past job does not change its status or create any side effects.

3. **Given** the handyman has no job history yet **When** the history screen loads **Then** a clear empty-state is shown **And** the handyman is not shown any other handyman's job data.

4. **Given** a newly completed or declined job exists **When** the handyman views history **Then** the record appears in history and remains durable across sessions and logins.

## Tasks / Subtasks

- [ ] Task 1 — Define the canonical history source from assignment and offer truth (AC: 1, 4)
  - [ ] Use Story 3.3’s persisted assignment and offer records as the only source of handyman job history truth.
  - [ ] History inclusion rules:
    - accepted jobs come from assignments owned by the handyman
    - completed jobs are accepted jobs whose related `service_requests.status = COMPLETE`
    - declined jobs come from `job_offer_visibilities` rows owned by the handyman with `offerStatus = declined`
  - [ ] Do not create a separate `handyman_job_history` table for MVP.
  - [ ] Keep current request/assignment rows canonical; history is a query/projection concern here, not a second write model.

- [ ] Task 2 — Add shared contracts for handyman history list and past-job detail (AC: 1, 2, 3, 4)
  - [ ] Create `packages/contracts/src/handyman-history.schemas.ts`.
  - [ ] Add schemas/types for:
    - `HandymanJobHistoryStatusSchema`
    - `HandymanJobHistoryItemSchema`
    - `HandymanJobHistoryListResponseSchema`
    - `HandymanJobHistoryDetailSchema`
  - [ ] Recommended list-item shape:
    ```typescript
    import { z } from 'zod';
    
    export const HandymanJobHistoryStatusSchema = z.enum([
      'accepted',
      'declined',
      'completed',
    ]);
    
    export const HandymanJobHistoryItemSchema = z.object({
      requestId: z.string().uuid(),
      categoryName: z.string(),
      title: z.string(),
      historyStatus: HandymanJobHistoryStatusSchema,
      estimatedTotal: z.number().nullable(),
      occurredAt: z.string().datetime(),
    });
    ```
  - [ ] Detail schema should include enough read-only context for a past-job screen:
    - request title
    - description
    - category
    - final/history status
    - estimate
    - customer-facing location summary or coordinates
    - createdAt / acceptedAt / completedAt where applicable
  - [ ] Export the new schemas from `packages/contracts/src/index.ts`.

- [ ] Task 3 — Build handyman history queries in backend modules without introducing side effects (AC: 1, 2, 3, 4)
  - [ ] Create a history query seam, preferably in `apps/backend/src/modules/assignments/assignments.service.ts` or a focused helper beside it.
  - [ ] Add `GET /assignments/handyman/history`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.HANDYMAN`
    - returns only records owned by the current handyman
    - ordered most recent first
  - [ ] Add `GET /assignments/handyman/history/:requestId`:
    - guarded and role-restricted the same way
    - returns the past-job detail only if the handyman has a legitimate history relationship to that request
    - must not mutate any status, timestamps, or offer rows
  - [ ] If cleaner, add a dedicated `history` DTO folder under `assignments`.
  - [ ] Keep ownership rules strict so one handyman cannot inspect another handyman’s history item.

- [ ] Task 4 — Normalize accepted, declined, and completed history statuses for the UI (AC: 1, 2, 4)
  - [ ] Map backend persistence to customer-safe / handyman-readable history values:
    - active assignment not yet complete but already accepted: `accepted`
    - assignment whose request is now `COMPLETE`: `completed`
    - declined offer row with no assignment: `declined`
  - [ ] Do not expose internal statuses like:
    - `expired`
    - `pending`
    - `assignment locked`
  - [ ] When a request becomes `COMPLETE` later in Epic 4, the same accepted job should naturally project as `completed` in history without extra manual migration logic.

- [ ] Task 5 — Make history queries performant and durable with the current domain model (AC: 1, 4)
  - [ ] Ensure the schema/index guidance from Epic 3 and the architecture is reflected in the story:
    - assignment lookups by `handymanUserId`
    - offer lookups by `handymanUserId` + `offerStatus`
    - request joins on `requestId`
  - [ ] Prefer one or two efficient relational queries over N+1 per-item fetches.
  - [ ] Keep history polling/REST-based; no WebSockets are needed for this surface.

- [ ] Task 6 — Create the handyman history frontend surface and empty state (AC: 1, 3, 4)
  - [ ] Create `apps/frontend/src/features/handyman-jobs/api/handyman-history.api.ts`.
  - [ ] Add:
    - `fetchHandymanJobHistory()`
    - `fetchHandymanJobHistoryDetail(requestId: string)`
  - [ ] Follow the same authenticated fetch + Zod parse pattern used elsewhere in `apps/frontend`.
  - [ ] Create hooks:
    - `useHandymanJobHistory.ts`
    - `useHandymanJobHistoryDetail.ts`
  - [ ] Create components:
    - `HandymanJobHistoryRow.tsx`
    - `HandymanJobHistoryEmptyState.tsx`
    - `HandymanHistoryListSkeleton.tsx`
  - [ ] The history list should:
    - render most recent first
    - show status, title, category, and key timestamp
    - link/tap through to a detail screen
  - [ ] Empty state should be calm and explicit:
    - no past jobs yet
    - no unrelated job data

- [ ] Task 7 — Add a past-job detail screen that is strictly read-only (AC: 2)
  - [ ] Create `apps/frontend/src/features/handyman-jobs/pages/HandymanJobHistoryPage.tsx`.
  - [ ] Create `apps/frontend/src/features/handyman-jobs/pages/HandymanJobHistoryDetailPage.tsx`.
  - [ ] Detail page should show:
    - title
    - description
    - category
    - history status chip
    - estimate
    - location summary
    - key timestamps
  - [ ] Do not render live action controls on past-job detail:
    - no accept
    - no decline
    - no status-update rail
  - [ ] If the job is still active and Epic 4 surfaces later provide a better active-job route, keep the history detail page read-only anyway.

- [ ] Task 8 — Extend handyman routing and nav without disturbing active-job work (AC: 1, 2, 3)
  - [ ] Update `apps/frontend/src/App.tsx` to add a history route such as:
    - `/handyman/history`
    - `/handyman/history/:requestId`
  - [ ] Reuse the 4-item handyman nav from Story 3.1/3.2:
    - `Dashboard`
    - `Jobs`
    - `History`
    - `Settings`
  - [ ] History should remain a separate surface from:
    - available jobs feed
    - active assigned-job mode
  - [ ] Preserve `RequireAuth requiredRole="HANDYMAN"` on all new routes.

- [ ] Task 9 — Keep boundaries clear with Epic 4 active-job tracking (AC: 2)
  - [ ] This story should not implement:
    - WebSocket updates
    - live map tracking
    - active-job status progression controls
    - customer rating surfaces
  - [ ] It may read `COMPLETE` or assigned-related fields from canonical request data, but it should not try to deliver the Epic 4 fulfillment workflow early.

- [ ] Task 10 — Tests for ownership, ordering, and no-side-effect detail reads (AC: 1, 2, 3, 4)
  - [ ] Backend unit tests:
    - history list includes accepted, declined, and completed projections correctly
    - results are ordered most recent first
    - completed assignment maps to `completed`
    - accepted but not completed assignment maps to `accepted`
    - declined offer maps to `declined`
  - [ ] Backend e2e tests:
    - create `apps/backend/test/handyman-history.e2e-spec.ts`
    - no auth → `401`
    - customer token → `403`
    - handyman only sees their own history items
    - detail endpoint for unrelated request → `403` or `404`-safe ownership failure
    - newly declined or completed items appear durably on subsequent fetches
  - [ ] Frontend tests:
    - add `HandymanJobHistoryPage.test.tsx`
    - add `HandymanJobHistoryDetailPage.test.tsx`
    - loading skeleton renders with `aria-busy`
    - empty state renders when list is empty
    - populated state renders correct statuses and order
    - detail page renders read-only content and no action buttons

### Review Findings

_(populated after code review)_

## Dev Notes

### Dependency on Stories 3.2 and 3.3

Story 3.4 assumes:

- Story 3.2 created the handyman jobs feed and offer visibility model
- Story 3.3 created assignment truth and decline/accept persistence

This story should read from those sources. It should not invent a parallel history persistence mechanism.

### Canonical History Source

For MVP, handyman history is a projection across two existing truths:

- assignments for accepted/completed work
- offer rows for declined work

That is enough to satisfy the AC without creating a redundant `history` table. Future append-only `request_status_history` work from later epics can deepen the model, but 3.4 should stay lightweight.

### Status Normalization Guidance

The UI needs simple, stable labels:

- `accepted`
- `declined`
- `completed`

These are history-surface labels, not canonical request lifecycle states. Keep the mapping backend-owned so the frontend does not decide on its own how to translate assignment and offer records.

### Ownership and Privacy Rules

History is role- and owner-specific:

- a handyman may only see jobs they accepted or explicitly declined
- they must not see jobs declined by another handyman
- they must not see unrelated request details

The safest query pattern is always scoped by the authenticated handyman’s `userId`.

### Frontend UX Guidance

This surface should feel quieter than the active jobs feed:

- scan-friendly rows
- simple status chips
- no urgent CTA emphasis
- read-only detail view

Use the history screen for continuity and recall, not for active job control.

### Persistence and Query Guidance

The architecture already says:

- dashboards and history use REST/polling
- current request rows are canonical
- append-only history exists for lifecycle auditing later

So 3.4 should stay on ordinary relational reads with clear indexes and no realtime transport.

### Project Structure — New and Modified Files

```text
apps/backend/
  src/modules/assignments/
    assignments.service.ts                                    — MODIFY
    assignments.controller.ts                                 — MODIFY
    dto/
      handyman-job-history-list-response.dto.ts               — NEW
      handyman-job-history-detail-response.dto.ts             — NEW

packages/contracts/
  src/
    handyman-history.schemas.ts                               — NEW
    index.ts                                                  — MODIFY

apps/frontend/
  src/features/handyman-jobs/
    api/
      handyman-history.api.ts                                 — NEW
    hooks/
      useHandymanJobHistory.ts                                — NEW
      useHandymanJobHistoryDetail.ts                          — NEW
    components/
      HandymanJobHistoryRow.tsx                               — NEW
      HandymanJobHistoryEmptyState.tsx                        — NEW
      HandymanHistoryListSkeleton.tsx                         — NEW
    pages/
      HandymanJobHistoryPage.tsx                              — NEW
      HandymanJobHistoryDetailPage.tsx                        — NEW
      HandymanJobHistoryPage.test.tsx                         — NEW
      HandymanJobHistoryDetailPage.test.tsx                   — NEW
  src/App.tsx                                                 — MODIFY

apps/backend/test/
  handyman-history.e2e-spec.ts                                — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked Prisma calls
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Detail reads must be tested explicitly for no side effects

### Git Intelligence Summary

Recent git history is still sparse, so the best guidance continues to come from the current file structure and the story artifacts already created for Epic 3:

- 3.2 defines feed and offer ownership
- 3.3 defines assignment and decline truth
- 3.4 should project that truth into a calm history surface

### References

- Story 3.4 and Epic 3 context: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- Journey 3 and Journey 4 continuity requirements: [Source: _bmad-output/planning-artifacts/prd.md]
- Domain entities and persistence strategy: [Source: _bmad-output/planning-artifacts/architecture.md]
- Handyman component guidance: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Story 3.2 jobs feed groundwork: [Source: _bmad-output/implementation-artifacts/3-2-handyman-jobs-dashboard-and-available-job-feed.md]
- Story 3.3 assignment/decline groundwork: [Source: _bmad-output/implementation-artifacts/3-3-accept-or-decline-a-job-with-first-accept-assignment-protection.md]
- Current customer list contract pattern: [Source: packages/contracts/src/request.schemas.ts]
- Current list-card UI pattern: [Source: apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 3.4 created — handyman job history list/detail surfaces backed by assignment and offer truth.
