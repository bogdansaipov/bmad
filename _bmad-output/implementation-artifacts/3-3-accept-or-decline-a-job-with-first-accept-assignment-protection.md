# Story 3.3: Accept or Decline a Job with First-Accept Assignment Protection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a handyman reviewing a job,
I want to accept or decline it, knowing that if I accept first I get the job and no one else can,
so that the system is fair and I can act quickly with confidence.

## Acceptance Criteria

1. **Given** a handyman taps accept on a matching job **When** the accept request reaches the backend **Then** the backend opens a database transaction, re-checks the request status atomically, and creates the assignment record **And** the request status transitions to `ASSIGNED` and is visible to the customer (customer dashboard already reads `assignedHandymanId` from the request).

2. **Given** two handymen attempt to accept the same request simultaneously **When** both accept requests are processed **Then** only the first to complete the transaction receives the assignment **And** the second receives a clear "already assigned" error without a confusing failure state.

3. **Given** a handyman declines a job **When** the decline action is submitted **Then** the offer record for that handyman is marked `declined` **And** the job no longer appears in that handyman's feed (feed query filters to `offerStatus: 'pending'`) while remaining visible to other eligible handymen.

4. **Given** a request has been routed to eligible handymen but none has accepted **When** the customer views the request **Then** the customer-visible status remains `pending` **And** no partial or misleading assignment information is shown.

5. **Given** a request exhausts available matching opportunities without acceptance **When** all job offer records for the request have non-`pending` status and none is `accepted` **Then** the request status transitions to `REJECTED` **And** the customer sees a clear `rejected` state (customer dashboard `status` field reflects this immediately on next poll).

## Tasks / Subtasks

- [x] Task 1 — Extend Prisma schema and generate migration (AC: 1, 2, 5)
  - [x] Add `RequestAssignment` model to `apps/backend/prisma/schema.prisma`:
    - `id String @id @default(uuid())`
    - `requestId String @unique @map("request_id")` — unique ensures one live assignment per request at DB level
    - `handymanUserId String @map("handyman_user_id")` — references `User.id` (not handyman profile id)
    - `acceptedAt DateTime @default(now()) @map("accepted_at")`
    - `assignmentStatus String @default("active") @map("assignment_status")`
    - Relations: `request ServiceRequest @relation(...)`, `handyman User @relation("HandymanAssignmentRecords", ...)`
    - `@@map("request_assignments")`
  - [x] Add `RequestStatusHistory` model:
    - `id String @id @default(uuid())`
    - `requestId String @map("request_id")`
    - `status RequestStatus` — uses existing Prisma enum
    - `actorType String @map("actor_type")` — values: `'handyman'`, `'system'`
    - `actorId String? @map("actor_id")` — references `User.id`, nullable for system events
    - `createdAt DateTime @default(now()) @map("created_at")`
    - `metadata Json?`
    - Relations: `request ServiceRequest @relation(...)`, `actor User? @relation("StatusHistoryEntries", ...)`
    - `@@index([requestId, createdAt])`
    - `@@map("request_status_history")`
  - [x] Add back-references to `ServiceRequest` model: `assignment RequestAssignment?`, `statusHistory RequestStatusHistory[]`
  - [x] Add back-references to `User` model: `assignmentRecords RequestAssignment[] @relation("HandymanAssignmentRecords")`, `statusHistoryEntries RequestStatusHistory[] @relation("StatusHistoryEntries")`
  - [x] Hand-write migration SQL at `apps/backend/prisma/migrations/<timestamp>_add_request_assignments_and_status_history/migration.sql` matching the project's existing migration style (CREATE TABLE, indexes, FK constraints — see existing migrations for reference)
  - [x] Run `prisma generate` to regenerate the Prisma client

- [x] Task 2 — Add shared contracts (AC: 1, 2, 3)
  - [x] In `packages/contracts/src/handyman.schemas.ts`, add:
    - `AcceptJobResponseSchema`: `z.object({ requestId: z.string(), status: z.literal('ASSIGNED') })`
    - `DeclineJobResponseSchema`: `z.object({ offerId: z.string(), offerStatus: z.literal('declined') })`
    - Exported types: `AcceptJobResponse`, `DeclineJobResponse`
  - [x] `packages/contracts/src/index.ts` already re-exports everything from `handyman.schemas.ts` — no change needed

- [x] Task 3 — Backend: `AssignmentsService` (AC: 1, 2, 3, 4, 5)
  - [x] Create `apps/backend/src/modules/assignments/assignments.service.ts`:
    - Inject `PrismaService`
    - `async acceptJob(userId: string, offerId: string)`:
      1. Find offer: `prisma.jobOfferVisibility.findFirst({ where: { id: offerId, handymanProfile: { userId }, offerStatus: JOB_OFFER_STATUS.PENDING }, select: { id, requestId } })`. Throw `NotFoundException` if not found.
      2. `prisma.$transaction(async (tx) => {`
         a. Atomic CAS on request: `tx.serviceRequest.updateMany({ where: { id: offer.requestId, status: RequestStatus.PENDING }, data: { status: RequestStatus.ASSIGNED, assignedHandymanId: userId } })`. If `result.count === 0`, throw `ConflictException('Request already assigned to another handyman')`.
         b. Mark this offer accepted: `tx.jobOfferVisibility.update({ where: { id: offerId }, data: { offerStatus: JOB_OFFER_STATUS.ACCEPTED, respondedAt: new Date() } })`.
         c. Hide all other pending offers for this request: `tx.jobOfferVisibility.updateMany({ where: { requestId: offer.requestId, offerStatus: JOB_OFFER_STATUS.PENDING }, data: { offerStatus: JOB_OFFER_STATUS.HIDDEN, respondedAt: new Date() } })`.
         d. Create assignment record: `tx.requestAssignment.create({ data: { requestId: offer.requestId, handymanUserId: userId, acceptedAt: new Date(), assignmentStatus: 'active' } })`.
         e. Append status history: `tx.requestStatusHistory.create({ data: { requestId: offer.requestId, status: RequestStatus.ASSIGNED, actorType: 'handyman', actorId: userId } })`.
      3. Return `{ requestId: offer.requestId, status: 'ASSIGNED' }`.
    - `async declineJob(userId: string, offerId: string)`:
      1. Find offer: `prisma.jobOfferVisibility.findFirst({ where: { id: offerId, handymanProfile: { userId }, offerStatus: JOB_OFFER_STATUS.PENDING }, select: { id, requestId } })`. Throw `NotFoundException` if not found.
      2. Update offer to declined: `prisma.jobOfferVisibility.update({ where: { id: offerId }, data: { offerStatus: JOB_OFFER_STATUS.DECLINED, respondedAt: new Date() } })`.
      3. Auto-reject if all offers exhausted:
         - Count remaining pending offers: `prisma.jobOfferVisibility.count({ where: { requestId: offer.requestId, offerStatus: JOB_OFFER_STATUS.PENDING } })`.
         - If `count === 0`: run `prisma.serviceRequest.updateMany({ where: { id: offer.requestId, status: RequestStatus.PENDING }, data: { status: RequestStatus.REJECTED } })` and `prisma.requestStatusHistory.create({ data: { requestId: offer.requestId, status: RequestStatus.REJECTED, actorType: 'system', actorId: null } })`.
      4. Return `{ offerId, offerStatus: 'declined' }`.

- [x] Task 4 — Backend: `AssignmentsController` (AC: 1, 2, 3)
  - [x] Create `apps/backend/src/modules/assignments/assignments.controller.ts`:
    - `@ApiTags('assignments')`, `@Controller('assignments')`, `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
    - `POST :offerId/accept` — `@Roles(UserRole.HANDYMAN)`, calls `assignmentsService.acceptJob(user.userId, offerId)`; returns `AcceptJobResponse`
    - `POST :offerId/decline` — `@Roles(UserRole.HANDYMAN)`, calls `assignmentsService.declineJob(user.userId, offerId)`; returns `DeclineJobResponse`
    - Guards: same auth stack as all other handyman endpoints (`JwtAuthGuard`, `RolesGuard`, `@Roles(UserRole.HANDYMAN)`)
    - Import `@Param` for `offerId`, `CurrentUser` for `user.userId`
    - `@HttpCode(200)` on both endpoints (not 201 — no resource is created from the client's perspective in decline)

- [x] Task 5 — Wire up `AssignmentsModule` (AC: 1, 2, 3)
  - [x] Rewrite `apps/backend/src/modules/assignments/assignments.module.ts`:
    - `imports: [PrismaModule]`
    - `providers: [AssignmentsService]`
    - `controllers: [AssignmentsController]`
  - [x] `AssignmentsModule` is already registered in `apps/backend/src/app.module.ts` — no change needed there

- [x] Task 6 — Frontend: API layer (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/handyman-jobs/api/handyman-accept-decline.api.ts`:
    - Import `AuthError` from `../../handyman-dashboard/api/handyman-profile.api` (same pattern as `handyman-jobs.api.ts`)
    - `async acceptJob(offerId: string): Promise<AcceptJobResponse>`: `POST /api/assignments/${offerId}/accept` with `Authorization` header. Handle 401 → `clearAccessToken(); throw new AuthError()`. Handle 409 → `throw Object.assign(new Error('This job was just taken by another handyman.'), { status: 409 })`. Other `!res.ok` → generic error. Parse and validate with `AcceptJobResponseSchema.safeParse`.
    - `async declineJob(offerId: string): Promise<DeclineJobResponse>`: same pattern, `POST /api/assignments/${offerId}/decline`. Handle 401 → logout. Other `!res.ok` → generic error. Validate with `DeclineJobResponseSchema.safeParse`.

- [x] Task 7 — Frontend: TanStack Query mutations (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/handyman-jobs/hooks/useAcceptJob.ts`:
    - `useMutation({ mutationFn: (offerId: string) => acceptJob(offerId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['handyman-jobs'] }), onError: (err) => { if (err instanceof AuthError) logout(); } })`
    - Import `useQueryClient` from `@tanstack/react-query`; import `useAuth` from `../../customer-auth/context/AuthContext` for `logout()`
  - [x] Create `apps/frontend/src/features/handyman-jobs/hooks/useDeclineJob.ts`:
    - Same pattern as `useAcceptJob` but calls `declineJob(offerId)`

- [x] Task 8 — Frontend: Wire up `JobCard` accept/decline buttons (AC: 1, 2, 3)
  - [x] Update `apps/frontend/src/features/handyman-jobs/components/JobCard.tsx`:
    - Import and call `useAcceptJob()` and `useDeclineJob()` inside the component
    - Remove `disabled` and `data-story="3.3"` from both buttons
    - Accept button: `onClick={() => acceptMutation.mutate(job.offerId)}`, `disabled={acceptMutation.isPending || declineMutation.isPending}`, show loading text while `acceptMutation.isPending`
    - Decline button: `onClick={() => declineMutation.mutate(job.offerId)}`, `disabled={acceptMutation.isPending || declineMutation.isPending}`
    - Show inline error below actions when `acceptMutation.isError`: display `acceptMutation.error?.message` (will show "already taken" on 409)
    - After a successful accept or decline, `invalidateQueries` fires automatically (via the hook's `onSuccess`) — the card will disappear on the next feed poll. No additional local state needed.

## Dev Notes

### Concurrency Protection: Why `updateMany` CAS instead of `SELECT FOR UPDATE`

The architecture doc mentions a "row-level lock on the request row." PostgreSQL's `UPDATE … WHERE status = PENDING` is itself atomic at the row level — the database serializes concurrent updates to the same row. Two simultaneous `updateMany` calls with `WHERE status = PENDING` will execute serially; the first sets `status = ASSIGNED` and returns `count = 1`. The second finds no matching `PENDING` row and returns `count = 0`.

This achieves the same serialization guarantee as `SELECT FOR UPDATE` without `$queryRaw`. The `$queryRaw`/`$executeRaw` anti-pattern was established in story 3.2 (debug log) and must not be violated here.

### Auto-Reject Timing Note

The auto-reject check (Task 3, `declineJob` step 3) runs outside the decline update's transaction. There is a small window where two concurrent declines on the last two pending offers could both read `count = 0` and both try to reject. The `serviceRequest.updateMany({ where: { status: PENDING } })` in the auto-reject path is itself CAS-safe — only one will succeed (`count = 1`), the other gets `count = 0` and is a no-op. For MVP this is acceptable.

### `JOB_OFFER_STATUS` — Use Constants, Not Literals

All `offerStatus` values must use `JOB_OFFER_STATUS` from `@handrix/contracts` (not raw strings). The deferred work log calls out the lack of a DB-level enum on this column — using the shared constant object is the code-level mitigation. The existing `MatchingService` was patched in the story 3.2 review to use `HANDYMAN_AVAILABILITY_STATUS.ONLINE` for the same reason.

### Module Ownership

| Concern | Owner |
|---|---|
| Accept / decline handling | `assignments` module (new service + controller) |
| Offer visibility records | `matching` module still owns `findAndOfferHandymen`; `assignments` module updates existing records |
| Request lifecycle truth | `requests` module owns the `ServiceRequest` status field; `assignments` updates it via `updateMany` inside a transaction |
| Request status history | Created by `assignments` on ASSIGNED and REJECTED transitions; future lifecycle transitions (story 4.2) will also write here |
| Real-time notification | **Not in this story** — WebSocket push of `ASSIGNED` status to the customer is story 4.3 |

### Scope Boundary — Do NOT Build Here

- **WebSocket / real-time push on assignment** → story 4.3. When the request becomes `ASSIGNED`, the customer dashboard will see it only on the next poll. No WebSocket code in this story.
- **Handyman active-job view** → story 4.2. After accepting, the handyman is not yet redirected to an active-job screen. The accept mutation succeeds and the card disappears from the feed on next poll.
- **Customer tracking view** → story 4.1. The `assignedHandyman` data is already included in `GET /requests` (via `includeRelations` in `RequestsService.findAllForCustomer`), so the customer dashboard will show the handyman name once `ASSIGNED`. A dedicated tracking view is story 4.1.
- **Status history display** → story 4.x. `RequestStatusHistory` records are written here but not yet exposed through any API endpoint. The table is created now as the architecture specifies it from first lifecycle transition.

### Architecture Compliance

| Concern | Rule |
|---|---|
| No `$queryRaw` / `$executeRaw` | Use typed Prisma client calls exclusively — CAS via `updateMany` |
| TanStack Query mutations | `useMutation({ mutationFn, onSuccess, onError })` object syntax — not positional |
| AuthError → logout | `onError` in both mutation hooks must check `err instanceof AuthError` → `logout()` |
| Contracts | `AcceptJobResponseSchema` / `DeclineJobResponseSchema` in `handyman.schemas.ts`; validate backend response in frontend API layer |
| Module registration | `AssignmentsModule` already in `app.module.ts` — do NOT add it again |
| Frontend feature boundary | All new frontend code lives in `apps/frontend/src/features/handyman-jobs/` |

### Reuse — Do NOT Reinvent

- **API fetch pattern**: copy the `requireToken() → jsonRequest() → 401 check → !ok check → schema validate` pattern from `apps/frontend/src/features/handyman-jobs/api/handyman-jobs.api.ts` exactly.
- **`AuthError` import**: import from `../../handyman-dashboard/api/handyman-profile.api` (same as `handyman-jobs.api.ts` line 3).
- **Auth guards**: `JwtAuthGuard`, `RolesGuard`, `@Roles(UserRole.HANDYMAN)` — identical to `MatchingController` and `UsersController`.
- **`CurrentUser` decorator and `AuthenticatedUser` type**: `import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth'` — same import as `MatchingController`.
- **PrismaModule import**: `import { PrismaModule } from '../prisma/prisma.module'` — same as `RequestsModule` and `MatchingModule`.

### Story 3.2 Anti-Patterns to Carry Forward

From story 3.2 dev notes (must not repeat):
- **No `$queryRaw` / `$executeRaw`** — use typed Prisma client calls
- **Mutation `onError` must handle `AuthError` → `logout()`**
- **TanStack Query object syntax** `useQuery({ queryKey, queryFn, ... })` / `useMutation({ mutationFn, ... })`
- **No `role="checkbox"` on `<button>`** — accept/decline are not toggle buttons; use standard `<button>` with `aria-label`
- **Inactive-category checks inside `$transaction`** — for assignments: status re-check must happen inside the transaction

### Project Structure

```
apps/backend/
  prisma/
    schema.prisma                                    ← modify: add RequestAssignment + RequestStatusHistory models; add relations to User + ServiceRequest
    migrations/<timestamp>_add_request_assignments_and_status_history/migration.sql  ← new
  src/modules/
    assignments/
      assignments.module.ts                          ← modify: add imports, providers, controllers
      assignments.service.ts                         ← new
      assignments.controller.ts                      ← new

packages/contracts/src/
  handyman.schemas.ts                                ← modify: add AcceptJobResponseSchema + DeclineJobResponseSchema + types

apps/frontend/src/
  features/
    handyman-jobs/
      api/handyman-accept-decline.api.ts             ← new
      hooks/useAcceptJob.ts                          ← new
      hooks/useDeclineJob.ts                         ← new
      components/JobCard.tsx                         ← modify: wire accept/decline mutations, remove disabled+data-story
```

### References

- Story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story-33-Accept-or-Decline-a-Job-with-First-Accept-Assignment-Protection]
- Epic 3 scope and FR19–FR23, FR36: [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Handyman-Job-Marketplace--Matching]
- First-accept concurrency strategy: [Source: _bmad-output/planning-artifacts/architecture.md#First-Accept-Concurrency-Protection-Strategy]
- Assignment flow steps 5–9: [Source: _bmad-output/planning-artifacts/architecture.md#Assignment-Flow]
- Lifecycle state machine (PENDING→ASSIGNED→REJECTED transitions): [Source: _bmad-output/planning-artifacts/architecture.md#Request-Lifecycle--State-Machine-Recommendations]
- Module boundaries (assignments module): [Source: _bmad-output/planning-artifacts/architecture.md#Module-Boundaries]
- Domain model (request_assignments, request_status_history): [Source: _bmad-output/planning-artifacts/architecture.md#Domain-Model-Recommendations]
- UX-DR2, UX-DR8 (fast accept/decline, job card controls): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-Design-Requirements]
- Journey 7 (Handyman Available Job Preview): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User-Journeys]
- Story 3.2 anti-patterns and patterns: [_bmad-output/implementation-artifacts/3-2-handyman-jobs-dashboard-and-available-job-feed.md#Dev-Notes]
- Deferred: `offerStatus` plain String (no DB enum) — use `JOB_OFFER_STATUS` constants: [_bmad-output/implementation-artifacts/deferred-work.md#Deferred-from-code-review-of-3-2]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `RequestAssignment` and `RequestStatusHistory` Prisma models with migration SQL matching project style.
- `AssignmentsService.acceptJob` uses `$transaction` with `updateMany` CAS (WHERE status=PENDING) for first-accept concurrency protection; throws `ConflictException` on race loss.
- `AssignmentsService.declineJob` auto-rejects the request when all pending offers are exhausted; auto-reject is CAS-safe via `updateMany`.
- `AssignmentsController` exposes `POST /assignments/:offerId/accept` and `POST /assignments/:offerId/decline` behind `JwtAuthGuard + RolesGuard + @Roles(HANDYMAN)`; both return `HttpCode(200)`.
- `AssignmentsModule` wired with `AssignmentsService` and `AssignmentsController`; `PrismaModule` is global so no explicit import needed.
- Frontend `handyman-accept-decline.api.ts` follows exact `requireToken → jsonRequest → status checks → schema validate` pattern from `handyman-jobs.api.ts`; 409 maps to user-friendly "already taken" message.
- `useAcceptJob` and `useDeclineJob` hooks use TanStack Query object-syntax `useMutation`; `onSuccess` invalidates `handyman-jobs` cache; `onError` handles `AuthError → logout()`.
- `JobCard` wired with both mutations; buttons disabled during any pending mutation; accept shows loading text; inline error shown on accept failure.
- Backend and frontend TypeScript type checks pass; linting clean (only pre-existing warnings).

### File List

- apps/backend/prisma/schema.prisma
- apps/backend/prisma/migrations/20260515130000_add_request_assignments_and_status_history/migration.sql
- packages/contracts/src/handyman.schemas.ts
- packages/contracts/dist/handyman.schemas.js
- packages/contracts/dist/handyman.schemas.d.ts
- packages/contracts/dist/index.js
- packages/contracts/dist/index.d.ts
- apps/backend/src/modules/assignments/assignments.service.ts
- apps/backend/src/modules/assignments/assignments.controller.ts
- apps/backend/src/modules/assignments/assignments.module.ts
- apps/frontend/src/features/handyman-jobs/api/handyman-accept-decline.api.ts
- apps/frontend/src/features/handyman-jobs/hooks/useAcceptJob.ts
- apps/frontend/src/features/handyman-jobs/hooks/useDeclineJob.ts
- apps/frontend/src/features/handyman-jobs/components/JobCard.tsx

## Change Log

- 2026-05-15: Story 3.3 implemented — added RequestAssignment + RequestStatusHistory schema/migration, AssignmentsService/Controller with first-accept CAS concurrency protection and auto-reject on exhaustion, shared contracts (AcceptJobResponseSchema/DeclineJobResponseSchema), frontend API layer, useAcceptJob/useDeclineJob hooks, and wired JobCard accept/decline buttons.

### Review Findings

- [x] [Review][Decision→Patch] JobCard does not display decline mutation errors — resolved: mirrored the `acceptMutation.isError` block for `declineMutation.isError` in `JobCard.tsx`.
- [x] [Review][Patch] `AssignmentsModule` missing `imports: [PrismaModule]` per Task 5 [apps/backend/src/modules/assignments/assignments.module.ts] — fixed: added `PrismaModule` to `imports`.
- [x] [Review][Patch] `declineJob` writes ran outside a transaction [apps/backend/src/modules/assignments/assignments.service.ts] — fixed: wrapped the offer update, remaining-count, conditional request update, and history insert in `prisma.$transaction`.
- [x] [Review][Patch] Duplicate `RequestStatusHistory` REJECTED row possible under concurrent declines [apps/backend/src/modules/assignments/assignments.service.ts] — fixed: the history insert is now gated on the auto-reject `updateMany` returning `count > 0` (the CAS loser becomes a no-op).
- [x] [Review][Patch] `declineJob` could overwrite an ACCEPTED offer back to DECLINED under concurrent accept+decline [apps/backend/src/modules/assignments/assignments.service.ts] — fixed: replaced `jobOfferVisibility.update({ where: { id } })` with `updateMany({ where: { id, offerStatus: PENDING } })` inside the transaction; `count === 0` throws `ConflictException`.
- [x] [Review][Patch] Frontend `acceptJob`/`declineJob` did not surface 404 distinctly [apps/frontend/src/features/handyman-jobs/api/handyman-accept-decline.api.ts] — fixed: both functions now map 404 (and 409 on decline) to `"This job is no longer available."` before the generic fallback.
- [x] [Review][Defer] `RequestStatusHistory.actorType` is a free-form `String` column with no DB enum or constraint [apps/backend/prisma/schema.prisma:67-81] — deferred, follows the same deferred-work pattern as `offerStatus` and `availabilityStatus` (no DB-level enum).
- [x] [Review][Defer] `requestStatusHistory` system-actor rows carry no `metadata` capturing the trigger reason [apps/backend/src/modules/assignments/assignments.service.ts:105-112] — deferred, future audit-trail enhancement.
- [x] [Review][Defer] No rate limiting / throttling on `POST /assignments/:offerId/accept|decline` [apps/backend/src/modules/assignments/assignments.controller.ts] — deferred, pre-existing platform-wide gap (no throttling anywhere yet).
- [x] [Review][Defer] No idempotency on accept; repeated POSTs return 404 instead of an idempotent success [apps/backend/src/modules/assignments/assignments.service.ts:15-72] — deferred, acceptable for MVP; revisit when mobile retry behavior becomes a problem.
