# Story 3.4: Handyman Job History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a handyman,
I want to view a history of all my past accepted, declined, and completed jobs,
so that I have continuity across sessions and can review past work.

## Acceptance Criteria

1. **Given** a handyman navigates to their job history **When** the history screen loads **Then** all past jobs are listed with their final status (accepted, declined, completed) and basic details **And** the list is ordered with the most recent jobs first.

2. **Given** the handyman opens a past job from history **When** the job detail loads **Then** they can see the full request details (title, category, description, estimate, request status, date) without affecting any live workflow **And** viewing a past job does not change its status or create any side effects.

3. **Given** the handyman has no job history yet **When** the history screen loads **Then** a clear empty-state is shown **And** the handyman is not shown any other handyman's job data.

4. **Given** a newly completed or declined job exists **When** the handyman views history **Then** the record appears in history and remains durable across sessions and logins.

## Tasks / Subtasks

- [x] Task 1 — Add `HandymanJobHistoryItemDto` and response type (AC: 1, 2)
  - [x] Create `apps/backend/src/modules/matching/dto/handyman-job-history-response.dto.ts`:
    ```ts
    export class HandymanJobHistoryItemDto {
      offerId!: string;
      requestId!: string;
      offerStatus!: string;          // 'accepted' | 'declined' | 'expired'
      requestTitle!: string;
      requestDescription!: string;
      categoryName!: string;
      estimatedTotal!: number;
      requestStatus!: string;        // RequestStatus enum value (e.g. 'COMPLETE', 'ASSIGNED')
      offeredAt!: string;            // ISO 8601
      respondedAt!: string | null;   // ISO 8601 or null
    }
    export type HandymanJobHistoryResponseDto = HandymanJobHistoryItemDto[];
    ```

- [x] Task 2 — Add shared contracts (AC: 1, 2)
  - [x] In `packages/contracts/src/handyman.schemas.ts`, add:
    - `HandymanJobHistoryItemSchema`: `z.object({ offerId: z.string(), requestId: z.string(), offerStatus: z.string(), requestTitle: z.string(), requestDescription: z.string(), categoryName: z.string(), estimatedTotal: z.number(), requestStatus: z.string(), offeredAt: z.string(), respondedAt: z.string().nullable() })`
    - `HandymanJobHistoryResponseSchema`: `z.array(HandymanJobHistoryItemSchema)`
    - Exported types: `HandymanJobHistoryItem`, `HandymanJobHistoryResponse`
  - [x] `packages/contracts/src/index.ts` already re-exports everything from `handyman.schemas.ts` — no change needed

- [x] Task 3 — Backend: `MatchingService.findJobHistoryForHandyman` (AC: 1, 2, 3, 4)
  - [x] Add method to `apps/backend/src/modules/matching/matching.service.ts`:
    - `async findJobHistoryForHandyman(userId: string): Promise<HandymanJobHistoryResponseDto>`:
      1. Resolve handyman profile: `prisma.handymanProfile.findUnique({ where: { userId }, select: { id: true } })`. If not found, return `[]`.
      2. Fetch history: `prisma.jobOfferVisibility.findMany({ where: { handymanProfileId: handymanProfile.id, offerStatus: { notIn: [JOB_OFFER_STATUS.PENDING, JOB_OFFER_STATUS.HIDDEN] } }, include: { request: { include: { category: { select: { name: true } } } } }, orderBy: [{ respondedAt: { sort: 'desc', nulls: 'last' } }, { offeredAt: 'desc' }] })`.
      3. Map each offer to `HandymanJobHistoryItemDto`: `{ offerId: offer.id, requestId: offer.request.id, offerStatus: offer.offerStatus, requestTitle: offer.request.title, requestDescription: offer.request.description ?? '', categoryName: offer.request.category.name, estimatedTotal: offer.request.estimatedTotal.toNumber(), requestStatus: offer.request.status, offeredAt: offer.offeredAt.toISOString(), respondedAt: offer.respondedAt?.toISOString() ?? null }`.
      4. Return mapped array.
  - [x] Import `HandymanJobHistoryItemDto`, `HandymanJobHistoryResponseDto` from the new DTO file at the top of the service.
  - [x] Keep existing `haversineKm`, `mapShortDescription`, `findAndOfferHandymen`, `findAvailableOffersForHandyman` methods unchanged.

- [x] Task 4 — Backend: `MatchingController` endpoint (AC: 1, 2, 3)
  - [x] Add endpoint to `apps/backend/src/modules/matching/matching.controller.ts`:
    - `@Get('history')` — placed above `@Get('available')` to avoid ambiguity
    - `@Roles(UserRole.HANDYMAN)` (same guards as existing `GET /jobs/available`)
    - `@HttpCode(200)`
    - `async getJobHistory(@CurrentUser() user: AuthenticatedUser)`: calls `matchingService.findJobHistoryForHandyman(user.userId)` and returns the array.
  - [x] Guards at the class or method level must remain consistent with existing pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.HANDYMAN)`.
  - [x] No schema changes needed — `MatchingModule` already wires `MatchingService` and uses `PrismaModule`.

- [x] Task 5 — Frontend: API layer (AC: 1, 2)
  - [x] Create `apps/frontend/src/features/handyman-jobs/api/handyman-history.api.ts`:
    - Import `AuthError` from `../../handyman-dashboard/api/handyman-profile.api` (same pattern as `handyman-jobs.api.ts`).
    - `export async function fetchHandymanHistory(): Promise<HandymanJobHistoryResponse>`:
      1. `const token = requireToken(); if (!token) throw new AuthError();`
      2. `const res = await fetch('/api/jobs/history', { headers: { Authorization: 'Bearer ' + token } });`
      3. If `res.status === 401`: `clearAccessToken(); throw new AuthError();`
      4. If `!res.ok`: `throw new Error('Failed to load job history.');`
      5. `const data = await res.json();`
      6. `const parsed = HandymanJobHistoryResponseSchema.safeParse(data);`
      7. If `!parsed.success`: `console.error('HandymanJobHistoryResponseSchema parse error', parsed.error); return [];`
      8. Return `parsed.data`.
    - Copy `requireToken` and `clearAccessToken` imports exactly from `handyman-jobs.api.ts` (they live in `../../customer-auth/lib/auth-storage`).

- [x] Task 6 — Frontend: TanStack Query hook (AC: 1, 3)
  - [x] Create `apps/frontend/src/features/handyman-jobs/hooks/useHandymanHistory.ts`:
    - `export function useHandymanHistory()` using `useQuery` object syntax:
      ```ts
      return useQuery({
        queryKey: ['handyman-history'],
        queryFn: fetchHandymanHistory,
      });
      ```
    - No `refetchInterval` — history is not a live feed; stale-while-revalidate on focus is sufficient.
    - `onError` pattern: caller (page) handles `isError` for display; hook does not need `onError` for AuthError here because the page will handle it (consistent with `useHandymanProfile` pattern where the page has `isAuthError` guard).
    - Import `useQuery` from `@tanstack/react-query`.

- [x] Task 7 — Frontend: `JobHistoryRow` component (AC: 1, 2)
  - [x] Create `apps/frontend/src/features/handyman-jobs/components/JobHistoryRow.tsx`:
    - Props: `item: HandymanJobHistoryItem`.
    - Display: category name + offer status badge (use `teal-green` / accent for `accepted`, muted/gray for `declined`/`expired`) + request title + description (truncated to 120 chars with "…") + estimate + requestStatus chip + respondedAt date (formatted as locale date string).
    - For `requestStatus`, map the raw value to a readable label: `COMPLETE → Completed`, `ASSIGNED → Assigned`, `PENDING → Pending`, `REJECTED → Rejected`, `ON_THE_WAY → On the way`, `ARRIVED → Arrived`, `WORKING → Working`.
    - Touch target: root element minimum 44px height (consistent with handyman job cards).
    - Dark handyman surface: use same Tailwind classes as `JobCard.tsx` for background/text colors.
    - This is a read-only display component — no action buttons, no mutation calls.

- [x] Task 8 — Frontend: `HandymanHistoryPage` (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/handyman-jobs/pages/HandymanHistoryPage.tsx`:
    - Use `useHandymanHistory()` and `useAuth()` hooks.
    - Rendering logic (mirror `HandymanDashboardPage.tsx` pattern):
      - `isLoading` → render skeleton list (two `skeleton-card` divs; same markup as dashboard loading state).
      - `isError && !isAuthError(error)` → render `role="alert"` error banner with Retry button calling `historyQuery.refetch()`.
      - Data loaded, `data.length === 0` → empty-state module: clear heading ("No job history yet") + subtext ("Jobs you accept or decline will appear here.") — consistent with `JobFeedEmptyState` component style but inline (no separate component needed).
      - Data loaded, `data.length > 0` → `<ul>` of `<li><JobHistoryRow item={item} /></li>` keyed by `item.offerId`.
    - Page layout: `<div className="dashboard handyman-dashboard">` → `<HandymanNav />` → `<div className="dashboard-header"><h1>Job History</h1></div>` → `<main className="dashboard-main">`.
    - Import `HandymanNav` from `../../handyman-dashboard/components/HandymanNav`.
    - `isAuthError` helper: copy the inline type guard from `HandymanDashboardPage.tsx` (`function isAuthError(error: unknown): error is AuthError { return error instanceof AuthError; }`).
  - [x] Update `apps/frontend/src/App.tsx`:
    - Import `HandymanHistoryPage` from `./features/handyman-jobs/pages/HandymanHistoryPage`.
    - Replace the placeholder `<div>Handyman History — coming in story 3.4</div>` at route `/history/handyman` with `<HandymanHistoryPage />`.

### Review Findings

- [ ] [Review][Decision] Fire-and-forget `findAndOfferHandymen` changed behavior silently — Old code was synchronous (errors propagated to HTTP response); new code is `void ... .catch(logger.error)`, so a DB failure after request creation leaves the customer with a success response and zero handymen notified, with no retry. Is this trade-off intentional (prefer responsiveness) or should errors still surface?

- [x] [Review][Patch] Raw string `'pending'` in `findAvailableOffersForHandyman` — uses `offerStatus: 'pending'` instead of `JOB_OFFER_STATUS.PENDING` [`apps/backend/src/modules/matching/matching.service.ts`]
- [x] [Review][Patch] Haversine NaN for near-identical/antipodal coordinates — `Math.sqrt(1 - a)` is NaN when floating-point rounding pushes `a` above 1.0; NaN comparisons silently exclude eligible handymen [`apps/backend/src/modules/matching/matching.service.ts`]
- [x] [Review][Patch] `logout()` called during render — synchronous side effect in render path; should be wrapped in `useEffect` to be safe under React 18 Strict Mode double-invoke [`apps/frontend/src/features/handyman-jobs/pages/HandymanHistoryPage.tsx`]
- [x] [Review][Patch] Mixed `cuid()` vs `uuid()` — `JobOfferVisibility` uses `@default(cuid())` while `RequestAssignment` and `RequestStatusHistory` (both new in this diff) use `@default(uuid())`; inconsistent with project convention [`apps/backend/prisma/schema.prisma`]
- [x] [Review][Patch] `respondedDate` fallback shows `offeredAt` when `respondedAt` is null — misleads the user for declined/expired offers where no response was made; spec says show "respondedAt date" [`apps/frontend/src/features/handyman-jobs/components/JobHistoryRow.tsx`]
- [x] [Review][Patch] Raw string `'accepted'` in `JobHistoryRow` badge — `item.offerStatus === 'accepted'` violates the dev-note constraint "NEVER raw strings; use `JOB_OFFER_STATUS` constants" [`apps/frontend/src/features/handyman-jobs/components/JobHistoryRow.tsx`]

- [x] [Review][Defer] Re-offer to handyman who already declined — `findAndOfferHandymen` has no filter excluding handymen whose prior offer for the same `requestId` is in a terminal state (`DECLINED`/`ACCEPTED`); `skipDuplicates` only guards the unique constraint — deferred, pre-existing data-model gap [`apps/backend/src/modules/matching/matching.service.ts`]
- [x] [Review][Defer] `offer.request.category` null dereference under data corruption — `offer.request.category.name` has no null guard; any data inconsistency crashes the history endpoint — deferred, pre-existing integrity gap [`apps/backend/src/modules/matching/matching.service.ts`]
- [x] [Review][Defer] MVP fallback includes all locationless handymen in every job — intentional design comment in code; at scale, every `ONLINE` handyman without a base location receives every offer regardless of geography — deferred, intentional MVP trade-off [`apps/backend/src/modules/matching/matching.service.ts`]
- [x] [Review][Defer] `serviceRadiusKm = 0` admits handyman for no jobs — schema only validates `Float?`; admin-seeded rows with radius 0 are included as matching candidates and return empty feeds silently — deferred, pre-existing schema validation gap [`apps/backend/prisma/schema.prisma`]
- [x] [Review][Defer] `requestStatus` rendered as plain `<div>`, not chip — spec says "requestStatus chip"; implementation uses a plain div with class `job-history-row__request-status` without chip CSS — deferred, CSS/styling concern [`apps/frontend/src/features/handyman-jobs/components/JobHistoryRow.tsx`]

## Dev Notes

### Data Source: Why `JobOfferVisibility` Is the Right Table

The `job_offer_visibilities` table is the canonical record of every offer a specific handyman has seen. It covers both accepted and declined outcomes. The `request_assignments` table only covers accepted offers — it does not include declined records. Therefore, the history query must use `JobOfferVisibility` as the primary source, filtering out `pending` and `hidden` statuses (those are live feed items, not history).

`offerStatus` values in history:
- `'accepted'` — handyman accepted; request may now be in any post-PENDING state
- `'declined'` — handyman declined
- `'expired'` — offer expired without response (MVP: not yet triggered, but the schema supports it)

### Ordering Strategy

`respondedAt` is `DateTime? @map("responded_at")` — nullable for offers that were never responded to (expired before any action). Using Prisma's `{ sort: 'desc', nulls: 'last' }` syntax ensures responded offers sort first, then unresponded by `offeredAt` descending. This requires Prisma 4.7+ (already in use per existing service code).

### `JOB_OFFER_STATUS` — Use Constants, Not Literals

Same rule as stories 3.2 and 3.3: all `offerStatus` comparisons must use `JOB_OFFER_STATUS` from `@handrix/contracts`:
```ts
import { JOB_OFFER_STATUS } from '@handrix/contracts';
// ...
offerStatus: { notIn: [JOB_OFFER_STATUS.PENDING, JOB_OFFER_STATUS.HIDDEN] }
```
Do NOT use raw strings `'pending'` or `'hidden'`.

### Data Isolation Guarantee

History is scoped by `handymanProfileId` which is resolved from `userId` (the JWT claim). A handyman cannot see any other handyman's offers because the query root is `where: { handymanProfileId: handymanProfile.id }` and `handymanProfile` is always fetched by `userId` from the JWT. No additional authorization check is needed — the profile resolution IS the authorization.

### Decimal Handling

`ServiceRequest.estimatedTotal` is a `Decimal(10,2)` Prisma type. Always call `.toNumber()` before returning — same as done in `findAvailableOffersForHandyman`. Do NOT return the raw Prisma `Decimal` object to the controller.

### No Pagination in MVP

The history endpoint returns all records in one response. This matches the established pattern for customer dashboard (`GET /requests`) and handyman feed (`GET /jobs/available`). Pagination is deferred to Epic 5 hardening (see `requests.service.ts` deferred work).

### Architecture Compliance

| Concern | Rule |
|---|---|
| No `$queryRaw` / `$executeRaw` | Use typed Prisma client — same as stories 3.2 and 3.3 |
| TanStack Query object syntax | `useQuery({ queryKey, queryFn })` — not positional args |
| AuthError → logout | Page-level `isAuthError` guard; do NOT silently swallow |
| Contracts | `HandymanJobHistoryItemSchema` / `HandymanJobHistoryResponseSchema` in `handyman.schemas.ts`; validate backend response in frontend API layer |
| `offerStatus` literals | Use `JOB_OFFER_STATUS` constants from `@handrix/contracts` — never raw strings |
| Feature boundary | All new frontend code in `apps/frontend/src/features/handyman-jobs/` |
| App.tsx route | Replace placeholder `<div>` inline — do NOT create a new route |

### Reuse — Do NOT Reinvent

- **API fetch pattern**: copy the `requireToken() → fetch → 401 check → !ok check → json() → safeParse` pattern exactly from `apps/frontend/src/features/handyman-jobs/api/handyman-jobs.api.ts`.
- **`AuthError` import**: `import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api'` — same as `handyman-jobs.api.ts`.
- **Skeleton loading markup**: copy the `<div className="skeleton-list" aria-busy="true" aria-live="polite">` block from `HandymanDashboardPage.tsx` — exact same structure.
- **Error banner pattern**: `<div role="alert" className="error-banner">` + retry button — identical to dashboard.
- **Auth guards**: `JwtAuthGuard`, `RolesGuard`, `@Roles(UserRole.HANDYMAN)` — same as `MatchingController.getAvailableJobs` and every other handyman endpoint.
- **`CurrentUser` / `AuthenticatedUser`**: `import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth'` — same as existing `MatchingController` import.

### Anti-Patterns from Previous Stories — Must Not Repeat

From story 3.2 and 3.3 dev notes:
- **No `$queryRaw` / `$executeRaw`** — use typed Prisma client.
- **TanStack Query object syntax** — `useQuery({ queryKey, queryFn })`, not positional.
- **`onError` must handle `AuthError → logout()`** — handled at page level via `isAuthError` guard.
- **No `role="checkbox"` on buttons** — not applicable here (read-only history), but maintain semantic HTML.
- **Use `JOB_OFFER_STATUS` constants** — not raw string literals.

### Scope Boundary — Do NOT Build Here

- **Pagination** → Epic 5 hardening (5.1). Return full history for MVP.
- **Detail navigation / separate detail route** → Not in scope. Full details are shown inline in `JobHistoryRow` (title, category, description, estimate, status, date). No new route needed.
- **Job history for accepted jobs that are currently active (ASSIGNED/ON_THE_WAY)** → These appear in history because the offer `offerStatus` is `'accepted'`. The `requestStatus` field will reflect the live state (ASSIGNED, ON_THE_WAY, etc.). No special handling needed — just show the current `request.status`.
- **Earnings summary / revenue aggregation** → UX-DR17 mentions "Earnings/History" as a nav label but Earnings is NOT in scope for story 3.4 or the current epic plan. This story delivers job history only.
- **WebSocket or real-time updates on history** → History is static; no WebSocket connection. Standard REST + stale-while-revalidate is correct.
- **Request cancellation or any write action from history** → Read-only view. No mutations on this page.
- **Rate limiting on `GET /jobs/history`** → Pre-existing platform gap (deferred to story 5.2). Do not add throttling here.

### Project Structure

```
apps/backend/
  src/modules/matching/
    matching.service.ts                                ← modify: add findJobHistoryForHandyman
    matching.controller.ts                             ← modify: add GET /jobs/history endpoint
    dto/
      handyman-job-history-response.dto.ts             ← new

packages/contracts/src/
  handyman.schemas.ts                                  ← modify: add HandymanJobHistoryItemSchema + types

apps/frontend/src/
  App.tsx                                              ← modify: import + replace placeholder route
  features/
    handyman-jobs/
      api/handyman-history.api.ts                      ← new
      hooks/useHandymanHistory.ts                      ← new
      components/JobHistoryRow.tsx                     ← new
      pages/HandymanHistoryPage.tsx                    ← new
```

### References

- Story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story-34-Handyman-Job-History]
- Epic 3 scope and FR18: [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Handyman-Job-Marketplace--Matching]
- FR18: "Handymen can view a history of their past accepted, declined, and completed jobs from their dashboard."
- Domain model (job_offer_visibilities, request_assignments): [Source: _bmad-output/planning-artifacts/architecture.md#Domain-Model-Recommendations]
- Polling vs WebSocket decision (history uses REST): [Source: _bmad-output/planning-artifacts/architecture.md#Realtime-Transport-Strategy]
- UX-DR2, UX-DR17 (handyman nav: Dashboard/Jobs/History/Settings): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design-Directions]
- Job history row component (handyman-specific): [Source: _bmad-output/planning-artifacts/epics.md#UX-Design-Requirements] (UX-DR21)
- Story 3.3 anti-patterns: [_bmad-output/implementation-artifacts/3-3-accept-or-decline-a-job-with-first-accept-assignment-protection.md#Dev-Notes]
- `offerStatus` plain String deferred (use JOB_OFFER_STATUS constants): [_bmad-output/implementation-artifacts/deferred-work.md#Deferred-from-code-review-of-3-2]
- Existing `GET /jobs/available` pattern: [apps/backend/src/modules/matching/matching.controller.ts]
- Existing API fetch pattern: [apps/frontend/src/features/handyman-jobs/api/handyman-jobs.api.ts]
- Route placeholder to replace: [apps/frontend/src/App.tsx:57-63]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `HandymanJobHistoryItemDto` + `HandymanJobHistoryResponseDto` DTO in matching module
- Added `HandymanJobHistoryItemSchema`, `HandymanJobHistoryResponseSchema`, and exported types to `@handrix/contracts`
- Added `findJobHistoryForHandyman` to `MatchingService`: resolves handyman profile by userId, queries `JobOfferVisibility` filtering out PENDING/HIDDEN statuses using `JOB_OFFER_STATUS` constants, orders by `respondedAt desc nulls last` then `offeredAt desc`, maps to DTO with `.toNumber()` for Decimal field
- Added `GET /jobs/history` to `MatchingController` with `@Roles(UserRole.HANDYMAN)`, placed above `GET /jobs/available` to avoid route ambiguity
- Created frontend API `fetchHandymanHistory` following exact pattern from `handyman-jobs.api.ts` with zod schema validation
- Created `useHandymanHistory` TanStack Query hook with object syntax
- Created read-only `JobHistoryRow` component displaying category, offer status badge, title, description (truncated 120 chars), estimate, request status label, and responded date
- Created `HandymanHistoryPage` with skeleton loading, error banner with retry, empty state, and job history list; auth error triggers logout
- Updated `App.tsx` route `/history/handyman` to render `HandymanHistoryPage` instead of placeholder div
- All TypeScript checks pass across backend, frontend, and contracts packages

### File List

- apps/backend/src/modules/matching/dto/handyman-job-history-response.dto.ts (new)
- apps/backend/src/modules/matching/matching.service.ts (modified)
- apps/backend/src/modules/matching/matching.controller.ts (modified)
- packages/contracts/src/handyman.schemas.ts (modified)
- apps/frontend/src/features/handyman-jobs/api/handyman-history.api.ts (new)
- apps/frontend/src/features/handyman-jobs/hooks/useHandymanHistory.ts (new)
- apps/frontend/src/features/handyman-jobs/components/JobHistoryRow.tsx (new)
- apps/frontend/src/features/handyman-jobs/pages/HandymanHistoryPage.tsx (new)
- apps/frontend/src/App.tsx (modified)

## Change Log

| Date | Change |
|---|---|
| 2026-05-15 | Implemented story 3.4 — Handyman Job History: backend DTO, contracts, service method, controller endpoint, frontend API, hook, JobHistoryRow component, HandymanHistoryPage, App.tsx route wired |
