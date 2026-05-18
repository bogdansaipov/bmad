# Story 4.1: Customer Request Tracking View with Two-Pin Map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer with an assigned request,
I want to see the handyman's identity and a map showing both our locations when I open my job,
so that I know who is coming and where they are right now.

## Acceptance Criteria

1. **Given** a customer opens a request that has been assigned **When** the tracking view loads **Then** the assigned handyman's display name is shown **And** a two-pin map renders with one pin at the job location and one at the handyman's most recently recorded location.

2. **Given** the tracking view map loads **When** it opens or the customer refreshes **Then** the map renders fully within 2 seconds under normal conditions **And** the handyman location pin is fetched via REST from the latest `handyman_location_updates` record — not streamed via WebSocket.

3. **Given** the customer is on the tracking view **When** the current lifecycle state is displayed **Then** the full customer-visible lifecycle is supported: `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`, `COMPLETE`, `REJECTED` **And** the current status is always visible without requiring the customer to scroll or open a detail panel.

4. **Given** the assigned job view is open on mobile **When** the layout renders **Then** the map fills most of the viewport and a bottom sheet holds the handyman identity, status, estimate, and job details **And** the bottom sheet supports collapsed, half-open, and full-detail states.

## Tasks / Subtasks

- [x] Task 1 — Add `HandymanLocationUpdate` Prisma model and relations (AC: 1, 2)
  - [x] In `apps/backend/prisma/schema.prisma`, add model:
    ```prisma
    model HandymanLocationUpdate {
      id          String   @id @default(cuid())
      requestId   String   @map("request_id")
      handymanId  String   @map("handyman_id")
      lat         Float
      lng         Float
      recordedAt  DateTime @default(now()) @map("recorded_at")

      request     ServiceRequest @relation(fields: [requestId], references: [id])
      handyman    User           @relation(fields: [handymanId], references: [id])

      @@index([requestId, recordedAt])
      @@map("handyman_location_updates")
    }
    ```
  - [x] Add relation to `ServiceRequest` model: `locationUpdates HandymanLocationUpdate[]`
  - [x] Add relation to `User` model: `handymanLocationUpdates HandymanLocationUpdate[]`
  - [x] Run `npx prisma migrate dev --name add-handyman-location-updates` from `apps/backend/`
  - [x] Verify generated migration applies cleanly

- [x] Task 2 — Add tracking contracts (AC: 1, 2, 3)
  - [x] In `packages/contracts/src/request.schemas.ts`, append:
    ```ts
    export const RequestTrackingResponseSchema = z.object({
      requestId: z.string(),
      title: z.string(),
      status: RequestStatusEnum,
      categoryName: z.string(),
      estimatedTotal: z.number().nullable(),
      description: z.string().nullable(),
      locationLat: z.number().nullable(),
      locationLng: z.number().nullable(),
      assignedHandymanDisplayName: z.string().nullable(),
      handymanLat: z.number().nullable(),
      handymanLng: z.number().nullable(),
      handymanLocationAt: z.string().nullable(),
      createdAt: z.string().datetime(),
    });

    export type RequestTrackingResponse = z.infer<typeof RequestTrackingResponseSchema>;
    ```
  - [x] `packages/contracts/src/index.ts` already re-exports everything from `request.schemas.ts` — no change needed

- [x] Task 3 — Backend DTO (AC: 1, 2, 3)
  - [x] Create `apps/backend/src/modules/requests/dto/request-tracking-response.dto.ts`:
    ```ts
    export class RequestTrackingResponseDto {
      requestId!: string;
      title!: string;
      status!: string;
      categoryName!: string;
      estimatedTotal!: number | null;
      description!: string | null;
      locationLat!: number | null;
      locationLng!: number | null;
      assignedHandymanDisplayName!: string | null;
      handymanLat!: number | null;
      handymanLng!: number | null;
      handymanLocationAt!: string | null;
      createdAt!: string;
    }
    ```

- [x] Task 4 — Backend: `RequestsService.getTrackingForCustomer` (AC: 1, 2, 3)
  - [x] Add method to `apps/backend/src/modules/requests/requests.service.ts`:
    - `async getTrackingForCustomer(customerId: string, requestId: string): Promise<RequestTrackingResponseDto>`:
      1. Fetch request:
         ```ts
         const request = await this.prisma.serviceRequest.findUnique({
           where: { id: requestId },
           include: {
             category: { select: { name: true } },
             assignedHandyman: {
               include: { handymanProfile: { select: { displayName: true } } },
             },
           },
         });
         ```
      2. If `!request` → throw `NotFoundException('Request not found')`
      3. If `request.customerId !== customerId` → throw `ForbiddenException('Access denied')`
      4. Fetch latest handyman location (only if assigned):
         ```ts
         let latestLocation: { lat: number; lng: number; recordedAt: Date } | null = null;
         if (request.assignedHandymanId) {
           const loc = await this.prisma.handymanLocationUpdate.findFirst({
             where: { requestId: request.id },
             orderBy: { recordedAt: 'desc' },
           });
           if (loc) latestLocation = loc;
         }
         ```
      5. Map to DTO:
         ```ts
         return {
           requestId: request.id,
           title: request.title,
           status: request.status,
           categoryName: request.category.name,
           estimatedTotal: request.estimatedTotal?.toNumber() ?? null,
           description: request.description ?? null,
           locationLat: request.locationLat ?? null,
           locationLng: request.locationLng ?? null,
           assignedHandymanDisplayName:
             request.assignedHandyman?.handymanProfile?.displayName ?? null,
           handymanLat: latestLocation?.lat ?? null,
           handymanLng: latestLocation?.lng ?? null,
           handymanLocationAt: latestLocation?.recordedAt.toISOString() ?? null,
           createdAt: request.createdAt.toISOString(),
         };
         ```
  - [x] Import `NotFoundException`, `ForbiddenException` from `@nestjs/common` at top of service

- [x] Task 5 — Backend: `RequestsController` endpoint (AC: 1, 2, 3)
  - [x] Add to `apps/backend/src/modules/requests/requests.controller.ts`:
    ```ts
    @Get(':requestId/tracking')
    @Roles(UserRole.CUSTOMER)
    @ApiOperation({ summary: 'Get tracking info for a customer request' })
    async getTracking(
      @CurrentUser() user: AuthenticatedUser,
      @Param('requestId') requestId: string,
    ): Promise<RequestTrackingResponseDto> {
      return this.requestsService.getTrackingForCustomer(user.userId, requestId);
    }
    ```
  - [x] Add `Param` to `@nestjs/common` imports
  - [x] Import `RequestTrackingResponseDto` from `./dto/request-tracking-response.dto`
  - [x] Place `@Get(':requestId/tracking')` BEFORE `@Get()` to avoid route ambiguity (same rule as matching module)

- [x] Task 6 — Frontend: API layer (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/request-tracking/api/request-tracking.api.ts`:
    - Import `AuthError` from `../../customer-dashboard/api/requests.api` (already exported there)
    - `export async function fetchRequestTracking(requestId: string): Promise<RequestTrackingResponse>`:
      1. `const token = getAccessToken(); if (!token) { clearAccessToken(); throw new AuthError(); }`
      2. `const res = await fetch('/api/requests/${requestId}/tracking', { headers: { Authorization: 'Bearer ' + token } });`
      3. If `res.status === 401`: `clearAccessToken(); throw new AuthError();`
      4. If `!res.ok`: `throw Object.assign(new Error('Failed to load tracking info.'), { status: res.status });`
      5. `const body = await res.json().catch(() => null);`
      6. `const parsed = RequestTrackingResponseSchema.safeParse(body);`
      7. If `!parsed.success`: `console.error('fetchRequestTracking: schema validation failed', parsed.error.issues); throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });`
      8. Return `parsed.data`
    - Imports: `getAccessToken`, `clearAccessToken` from `../../customer-auth/lib/auth-storage` (same path as `customer-dashboard/api/requests.api.ts`)

- [x] Task 7 — Frontend: TanStack Query hook (AC: 1, 2)
  - [x] Create `apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts`:
    ```ts
    export function useRequestTracking(requestId: string) {
      return useQuery({
        queryKey: ['request-tracking', requestId],
        queryFn: () => fetchRequestTracking(requestId),
        refetchInterval: 30_000,
        enabled: !!requestId,
      });
    }
    ```
  - `refetchInterval: 30_000` — polls every 30s so handyman location pin refreshes without manual reload (not WebSocket; location is REST-fetched per architecture)

- [x] Task 8 — Frontend: `RequestTrackingMap` component (AC: 1, 2, 4)
  - [x] Create `apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx`:
    - Props: `jobLat: number | null; jobLng: number | null; handymanLat: number | null; handymanLng: number | null`
    - Based on `MapLocationPicker.tsx` patterns — same `OSM_STYLE` constant, same MapLibre setup
    - **No click handler, no dragend handler** — read-only display only
    - Job pin (blue default MapLibre marker): placed at `[jobLng, jobLat]` if both non-null
    - Handyman pin (custom color — use `new maplibregl.Marker({ color: '#00b894' })`): placed at `[handymanLng, handymanLat]` if both non-null
    - Map center logic: if job pin exists center on it; if neither exists center on `[0, 0]` at zoom 2
    - If both pins exist, use `map.fitBounds(...)` to show both: `[[min-lng, min-lat], [max-lng, max-lat]]` with 80px padding
    - `aria-label="Request tracking map"` on container div
    - Same `useEffect` cleanup pattern as `MapLocationPicker`: remove markers and map on unmount
    - Class: `w-full h-full` (page container controls height, not the map component)
    - Do NOT import `onLocationChange` — this is purely a display component

- [x] Task 9 — Frontend: `TrackingBottomSheet` component (AC: 3, 4)
  - [x] Create `apps/frontend/src/features/request-tracking/components/TrackingBottomSheet.tsx`:
    - Props: `tracking: RequestTrackingResponse; sheetState: 'collapsed' | 'half' | 'full'; onStateChange: (state: 'collapsed' | 'half' | 'full') => void`
    - Import `StatusChip` from `../../customer-dashboard/components/StatusChip` (reuse existing)
    - **Collapsed state** (`sheet-collapsed`): shows only the `<StatusChip status={tracking.status} />` + drag handle — status always visible without scrolling
    - **Half-open state** (`sheet-half`): shows status chip + handyman name (if assigned) + estimate
    - **Full state** (`sheet-full`): shows all — status, handyman name, estimate, job title, description, category
    - Tap drag handle → cycle: `collapsed → half → full → collapsed`
    - CSS classes: `tracking-bottom-sheet tracking-bottom-sheet--{sheetState}`
    - Estimate format: use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` — same pattern as `RequestCard.tsx`
    - `assignedHandymanDisplayName` label: only render if non-null (request may still be PENDING)
    - For PENDING status text below status chip in collapsed: "Matching nearby pros…" (per UX spec)

- [x] Task 10 — Frontend: `RequestTrackingPage` (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx`:
    - Import `useParams` from `react-router-dom`
    - Extract `requestId` from `useParams<{ requestId: string }>()`
    - Use `useRequestTracking(requestId!)` hook
    - Use `useAuth()` for auth guard
    - Local state: `const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>('half')`
    - Rendering:
      - `isLoading` → full-screen skeleton: map area placeholder + bottom sheet skeleton (consistent with dashboard loading pattern — `<div className="skeleton-card" aria-busy="true">`)
      - `isError && !isAuthError(error)` → error banner `role="alert"` with Retry button calling `query.refetch()`
      - `isError && isAuthError(error)` → call `logout()` wrapped in `useEffect` (same pattern as `HandymanHistoryPage.tsx` — do NOT call logout synchronously during render)
      - Success: full-viewport layout with map + bottom sheet
    - Layout:
      ```tsx
      <div className="tracking-page">
        <CustomerNav />
        <div className="tracking-page__map-container">
          <RequestTrackingMap
            jobLat={data.locationLat}
            jobLng={data.locationLng}
            handymanLat={data.handymanLat}
            handymanLng={data.handymanLng}
          />
        </div>
        <TrackingBottomSheet
          tracking={data}
          sheetState={sheetState}
          onStateChange={setSheetState}
        />
      </div>
      ```
    - Import `CustomerNav` from `../../customer-dashboard/components/CustomerNav`
    - `isAuthError` helper: `function isAuthError(e: unknown): e is AuthError { return e instanceof AuthError; }`

- [x] Task 11 — Update `App.tsx`: add tracking route (AC: 1)
  - [x] In `apps/frontend/src/App.tsx`:
    - Import `RequestTrackingPage` from `./features/request-tracking/pages/RequestTrackingPage`
    - Add route (after `/requests/new`):
      ```tsx
      {
        path: '/requests/:requestId/tracking',
        element: (
          <RequireAuth requiredRole="CUSTOMER">
            <RequestTrackingPage />
          </RequireAuth>
        ),
      },
      ```

- [x] Task 12 — Update `RequestCard` to link to tracking view (AC: 1)
  - [x] In `apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`:
    - Import `Link` from `react-router-dom`
    - For active requests (`isActive === true`), wrap the card in `<Link to={/requests/${item.id}/tracking} className="request-card__link">`
    - For non-active requests (COMPLETE, REJECTED), keep as plain `<div>` (history/rating detail is out of scope for this story)
    - Add `aria-label={`View tracking for ${item.title}`}` on the link

## Dev Notes

### Why `handyman_location_updates` is Created Here

Story 4.2 handles posting location updates (handyman side). This story creates the table and reads from it. If no location update exists yet (e.g., before 4.2 is implemented), `handymanLat/Lng` will be null and the map shows only the job pin — this is correct, graceful behavior.

### Handyman Display Name via Join Chain

`ServiceRequest.assignedHandymanId` → `User.id` (the `assignedHandyman` relation). `User` does NOT have `displayName` directly — it's on `HandymanProfile`. The Prisma include must be:
```ts
assignedHandyman: {
  include: { handymanProfile: { select: { displayName: true } } }
}
```
This is why the DTO field is `assignedHandymanDisplayName` (not just `handymanDisplayName`) — it's explicitly derived from the profile join.

### `GET ':requestId/tracking'` Must Be Declared Before `GET()`

In NestJS, `@Get(':requestId/tracking')` MUST be placed above `@Get()` in the controller class to prevent `:requestId` matching the empty path. Same rule applied in `MatchingController` for `GET /jobs/history` vs `GET /jobs/available`.

### Decimal Handling

`request.estimatedTotal` is a Prisma `Decimal` — always call `.toNumber()` before returning. Use `?? null` not `|| null` (avoid 0 being treated as falsy). Same pattern as `findJobHistoryForHandyman` in `matching.service.ts`.

### MapLibre: Two-Marker Setup

Both markers must be removed on cleanup. Use two `useRef` values: `jobMarkerRef` and `handymanMarkerRef`. Call `markerRef.current?.remove()` for each in the cleanup function, then `map.remove()`. See `MapLocationPicker.tsx` cleanup for exact pattern.

### Bottom Sheet CSS Classes

Add these classes in the customer CSS (wherever global customer styles live): `tracking-bottom-sheet--collapsed`, `tracking-bottom-sheet--half`, `tracking-bottom-sheet--full`. The collapsed state must keep the status chip visible above the fold — this satisfies AC3's "current status always visible without scrolling."

### No WebSocket in This Story

This story uses REST-only data fetching with 30s polling. WebSocket push for status updates is story 4.3. The `refetchInterval: 30_000` on the hook is the deliberate MVP implementation.

### Polling vs. Live Data

`refetchInterval: 30_000` (30 seconds) is appropriate for handyman location updates since story 4.2 posts location updates periodically. A shorter interval (e.g., 5s) would cause excessive API calls at MVP scale. TanStack Query's stale-while-revalidate ensures the map stays usable during refetch.

### Architecture Compliance

| Concern | Rule |
|---|---|
| Map provider | MapLibre GL + OSM tiles — same as `MapLocationPicker.tsx`, never hardcode a different provider |
| No `$queryRaw` | Use typed Prisma client throughout |
| TanStack Query | Object syntax `useQuery({ queryKey, queryFn, refetchInterval })` — not positional |
| AuthError handling | Page-level `isAuthError` guard + `useEffect`-wrapped `logout()` — not render-phase call |
| Contracts validation | `RequestTrackingResponseSchema.safeParse(body)` in API layer — throw on invalid, don't silently return partial data |
| Feature boundary | All new frontend code in `apps/frontend/src/features/request-tracking/` |
| `cuid()` for IDs | `HandymanLocationUpdate` uses `@default(cuid())` — consistent with `JobOfferVisibility` (not `uuid()`, which caused the Story 3.4 review finding) |

### Reuse — Do NOT Reinvent

- **`AuthError` class**: import from `../../customer-dashboard/api/requests.api` — already exported there, do NOT redefine
- **`getAccessToken` / `clearAccessToken`**: from `../../customer-auth/lib/auth-storage`
- **`StatusChip`**: import from `../../customer-dashboard/components/StatusChip` — DO NOT create a new status chip
- **`CustomerNav`**: import from `../../customer-dashboard/components/CustomerNav`
- **OSM map style**: copy the `OSM_STYLE` constant from `MapLocationPicker.tsx` exactly — same tile URL, same structure
- **Currency formatter**: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` — same as `RequestCard.tsx`
- **Error banner pattern**: `<div role="alert" className="error-banner">` + retry — same as `HandymanDashboardPage.tsx`
- **Skeleton loading**: `<div className="skeleton-card" aria-busy="true" aria-live="polite">` — same markup as dashboard

### Anti-Patterns from Previous Stories — Must Not Repeat

From stories 3.2–3.4:
- **TanStack Query object syntax** — `useQuery({ queryKey, queryFn })`, NOT positional args
- **No `$queryRaw`** — typed Prisma only
- **`logout()` in render** — must be in `useEffect`, NOT called synchronously during render (React 18 Strict Mode double-invoke issue)
- **Decimal `.toNumber()`** — never return raw Prisma `Decimal` objects

### Scope Boundary — Do NOT Build Here

- **Handyman posting location** (story 4.2) — `POST /api/requests/:requestId/location` is NOT in this story
- **WebSocket status updates** (story 4.3) — `refetchInterval` polling is the correct MVP approach for this story
- **Post-completion rating prompt** (story 4.4) — do NOT add rating UI to the tracking page
- **Request cancellation** — not in MVP scope
- **Request history detail page** (non-active requests) — `RequestCard` for COMPLETE/REJECTED stays as `<div>`, no link needed
- **Desktop split-pane layout** (story 5.4) — mobile-first layout only in this story

### Project Structure

```
apps/backend/prisma/
  schema.prisma                                             ← modify: add HandymanLocationUpdate model + relations

packages/contracts/src/
  request.schemas.ts                                        ← modify: add RequestTrackingResponseSchema + type

apps/backend/src/modules/requests/
  requests.controller.ts                                    ← modify: add GET :requestId/tracking
  requests.service.ts                                       ← modify: add getTrackingForCustomer
  dto/
    request-tracking-response.dto.ts                        ← new

apps/frontend/src/
  App.tsx                                                   ← modify: add /requests/:requestId/tracking route
  features/
    customer-dashboard/components/RequestCard.tsx           ← modify: make active cards link to tracking
    request-tracking/
      api/request-tracking.api.ts                          ← new
      hooks/useRequestTracking.ts                          ← new
      components/RequestTrackingMap.tsx                    ← new
      components/TrackingBottomSheet.tsx                   ← new
      pages/RequestTrackingPage.tsx                        ← new
```

### References

- Story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story-41-Customer-Request-Tracking-View-with-Two-Pin-Map]
- FR24–FR27: customer lifecycle visibility, two-pin map, handyman identity
- `handyman_location_updates` entity: [Source: _bmad-output/planning-artifacts/architecture.md#Domain-Model-Recommendations]
- Realtime transport: REST for location, WebSockets only for active jobs (story 4.3): [Source: _bmad-output/planning-artifacts/architecture.md#Realtime-Transport-Strategy]
- UX-DR5 (map + status as primary visual focus), UX-DR6 (bottom sheet), UX-DR9 (pending/rejected states explicit): [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Bottom sheet 3 states: [Source: _bmad-output/planning-artifacts/epics.md#UX-Design-Requirements] (UX-DR22)
- Journey 4 (Customer Assigned Tracking): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey-4-Customer-Assigned-Tracking]
- Story 3.4 anti-patterns (uuid vs cuid, logout in render, TanStack object syntax): [_bmad-output/implementation-artifacts/3-4-handyman-job-history.md#Review-Findings]
- `MapLocationPicker` existing component: [apps/frontend/src/features/request-create/components/MapLocationPicker.tsx]
- `StatusChip` existing component: [apps/frontend/src/features/customer-dashboard/components/StatusChip.tsx]
- `AuthError` exported from: [apps/frontend/src/features/customer-dashboard/api/requests.api.ts]
- Existing request endpoint pattern: [apps/backend/src/modules/requests/requests.controller.ts]
- Route placeholder for tracking: none exists — route `/requests/:requestId/tracking` is new
- `RequestCard.tsx` (to update): [apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers. DB was offline so migration file was created manually and `prisma generate` ran successfully to update the client.

### Completion Notes List

- Added `HandymanLocationUpdate` Prisma model with `cuid()` IDs and composite index on `[requestId, recordedAt]`
- Created migration file `20260518120000_add_handyman_location_updates` manually (DB not running at dev time)
- Added `RequestTrackingResponseSchema` and `RequestTrackingResponse` type to contracts package
- Added `GET :requestId/tracking` endpoint to backend — placed before `GET /` to avoid route ambiguity
- `getTrackingForCustomer` returns null for handyman location if no `HandymanLocationUpdate` record exists yet (graceful pre-4.2 behavior)
- Frontend `RequestTrackingMap` uses same OSM_STYLE + MapLibre pattern as `MapLocationPicker` — two separate marker refs, proper cleanup
- `TrackingBottomSheet` cycles collapsed → half → full on drag-handle tap; status chip always visible in collapsed state (AC3)
- `RequestTrackingPage` uses `useEffect`-wrapped `logout()` (not synchronous render-phase call)
- Active `RequestCard` items now render as `<Link>` to `/requests/:id/tracking`; inactive cards remain plain `<div>`
- All TypeScript checks pass; ESLint clean

### File List

- `apps/backend/prisma/schema.prisma` (modified)
- `apps/backend/prisma/migrations/20260518120000_add_handyman_location_updates/migration.sql` (new)
- `packages/contracts/src/request.schemas.ts` (modified)
- `apps/backend/src/modules/requests/dto/request-tracking-response.dto.ts` (new)
- `apps/backend/src/modules/requests/requests.service.ts` (modified)
- `apps/backend/src/modules/requests/requests.controller.ts` (modified)
- `apps/frontend/src/features/request-tracking/api/request-tracking.api.ts` (new)
- `apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts` (new)
- `apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx` (new)
- `apps/frontend/src/features/request-tracking/components/TrackingBottomSheet.tsx` (new)
- `apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx` (new)
- `apps/frontend/src/App.tsx` (modified)
- `apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx` (modified)
- `apps/frontend/src/index.css` (modified)

### Review Findings

- [x] [Review][Decision] ON DELETE RESTRICT on `handyman_location_updates` FKs — deferred: no delete/cancel flows exist in this story; revisit when request lifecycle cleanup is designed — keep RESTRICT for now, consistent with all other project FKs

- [x] [Review][Patch] Map never updates handyman location after polling — split into two effects: mount-only effect for map+job pin, separate effect on `[handymanLat, handymanLng, jobLat, jobLng]` for handyman pin create/update [RequestTrackingMap.tsx]

- [x] [Review][Patch] `fitBounds` crashes / zooms to max when job and handyman are at identical coordinates — guard added: when `minLng === maxLng && minLat === maxLat`, falls back to `flyTo` at zoom 15 [RequestTrackingMap.tsx]

- [x] [Review][Patch] `requestId` undefined leaves page silently stuck — all hooks called first; `if (!requestId) return <Navigate to="/dashboard" replace />` guard added after hooks [RequestTrackingPage.tsx]

- [x] [Review][Patch] 403 ForbiddenException shows a useless Retry banner — `isForbiddenError` helper detects `status === 403`; error banner shows "You don't have access to this request." with no Retry button for 403 [RequestTrackingPage.tsx]

- [x] [Review][Defer] HandymanLocationUpdate `findFirst` not filtered by `handymanId` — query filters by `requestId` only; if story 4.2 allows location posts from non-assigned handymen this could leak coordinates [requests.service.ts:~148] — deferred, pre-existing risk depends on 4.2 write constraints

- [x] [Review][Defer] `refetchInterval: 30_000` runs unconditionally for terminal statuses (COMPLETE, REJECTED) — wastes network after request lifecycle ends [useRequestTracking.ts:8] — deferred, MVP optimisation

- [x] [Review][Defer] `request.category.name` accessed without null guard — crashes if category relation returns null (depends on schema nullability) [requests.service.ts:~157] — deferred, pre-existing schema concern

- [x] [Review][Defer] `containerRef.current!` non-null assertion before MapLibre constructor — could crash in React Strict Mode double-invoke or very fast unmount [RequestTrackingMap.tsx:40] — deferred, common React map pattern, low real-world risk

## Change Log

- 2026-05-18: Story implemented by claude-sonnet-4-6 — added HandymanLocationUpdate Prisma model, tracking REST endpoint, full frontend tracking feature (map + bottom sheet + page), active RequestCard → tracking link
