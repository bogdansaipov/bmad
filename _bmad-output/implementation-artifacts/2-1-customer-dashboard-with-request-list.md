# Story 2.1: Customer Dashboard with Request List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in customer,
I want to land on a dashboard that shows my current and past service requests with their status,
so that I always have a clear home screen and can start a new request from one place.

## Acceptance Criteria

1. **Given** a customer logs in successfully **When** the customer dashboard loads **Then** it displays their current and previous service requests with status, title, and estimate **And** the page loads within 2 seconds under normal conditions (NFR1).

2. **Given** the customer has no requests yet **When** the dashboard loads **Then** an empty-state module is shown with a clear prompt to create a first request **And** the `New Request` action is prominently accessible.

3. **Given** the dashboard is displayed on mobile **When** the customer scans the screen **Then** request cards are glanceable with status, assigned handyman (if any), and estimate visible without opening the full request **And** touch targets meet minimum accessible size requirements (≥ 44×44px).

4. **Given** the customer navigation is rendered **When** the nav is visible **Then** it contains no more than 4 top-level items: Home, New Request, History, and Profile.

5. **Given** the customer has active requests (status `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, or `WORKING`) **When** the dashboard loads **Then** those active requests appear first above historical (`COMPLETE`, `REJECTED`) requests **And** each active card with an assigned handyman shows the handyman's display name. _(Revised 2026-05-13 during code review: `PENDING` added to active bucket so newly created requests render with active styling and priority, matching customer mental model.)_

6. **Given** any authenticated API request receives HTTP 401 **When** the response is received **Then** the auth context clears the token and redirects to `/login` (same pattern as Story 1.3 `fetchSession`).

## Tasks / Subtasks

- [x] Task 1 — Add Prisma schema: service categories and service requests (AC: 1, 2, 3, 5)
  - [x] Add `ServiceCategory` model: `id` (cuid), `name` (String, unique), `description` (String?), `isActive` (Boolean, default true), `createdAt` (DateTime, now)
  - [x] Add `RequestStatus` enum: `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`, `COMPLETE`, `REJECTED`
  - [x] Add `ServiceRequest` model with fields: `id` (cuid), `customerId` (String, FK→users.id), `categoryId` (String, FK→service_categories.id), `title` (String), `description` (String?), `status` (RequestStatus, default PENDING), `locationLat` (Float?), `locationLng` (Float?), `estimatedTotal` (Decimal?), `pricingExplanationSnapshot` (Json?), `assignedHandymanId` (String?, FK→users.id), `completedAt` (DateTime?), `createdAt` (DateTime, now), `updatedAt` (DateTime, updatedAt)
  - [x] Add indexes on `service_requests`: `@@index([customerId, createdAt])`, `@@index([status])`, `@@index([assignedHandymanId])`, `@@index([categoryId])`
  - [x] Seed 6 initial service categories so the frontend category list (Story 2.2) has data: Plumbing, Electrical, Carpentry, Painting, Cleaning, HVAC
  - [x] Generate and apply migration: `pnpm --filter handrix-backend prisma migrate dev --name add_service_categories_and_requests`
  - [x] Run `pnpm --filter handrix-backend prisma generate` to update Prisma client

- [x] Task 2 — Add request schemas to shared contracts (AC: 1, 3, 5)
  - [x] Create `packages/contracts/src/request.schemas.ts` with:
    - `RequestStatusEnum` (Zod enum matching Prisma `RequestStatus`): `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`, `COMPLETE`, `REJECTED`
    - `ServiceRequestListItemSchema`: `{ id: string, title: string, status: RequestStatus, estimatedTotal: number | null, categoryName: string, assignedHandymanDisplayName: string | null, createdAt: string }`
    - `CustomerRequestListResponseSchema`: `{ items: ServiceRequestListItemSchema[] }`
    - Export inferred types: `RequestStatus`, `ServiceRequestListItem`, `CustomerRequestListResponse`
  - [x] Export all from `packages/contracts/src/index.ts` (append `export * from './request.schemas'`)
  - [x] Rebuild contracts: `pnpm --filter @handrix/contracts build`

- [x] Task 3 — Implement backend: requests module `GET /requests` endpoint (AC: 1, 3, 5, 6)
  - [x] Enable `RequestsModule` in `app.module.ts` if not already imported (check current `app.module.ts` imports)
  - [x] Create `apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts` matching `CustomerRequestListResponseSchema` shape; use class-validator decorators if needed for OpenAPI
  - [x] Implement `RequestsService.findAllForCustomer(customerId: string): Promise<CustomerRequestListResponseDto>`:
    - Query `service_requests` WHERE `customerId = customerId`
    - Include join: category (`name`) and assigned handyman profile (`displayName`) via LEFT JOIN
    - Order: active statuses first (`ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`), then by `createdAt DESC`
    - Map to `ServiceRequestListItem[]` with `estimatedTotal` cast to `number | null` (Decimal → number)
    - Return `{ items }`
  - [x] Add `GET /requests` route in `RequestsController`:
    - Decorate with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.CUSTOMER)`
    - Use `@CurrentUser()` to extract `userId`; pass to service
    - Import guard/decorator barrel from `../../auth` (the barrel `apps/backend/src/modules/auth/index.ts`)
    - `@ApiTags('requests')`, `@ApiOperation({ summary: 'List all service requests for the authenticated customer' })`
    - Return HTTP 200 with `CustomerRequestListResponseDto`
  - [x] Inject `PrismaService` into `RequestsService` (PrismaModule is `@Global()` — do NOT re-import it)

- [x] Task 4 — Backend tests: requests module (AC: 1, 5)
  - [x] Create `apps/backend/src/modules/requests/requests.service.spec.ts`:
    - Mock `PrismaService.serviceRequest.findMany`
    - Test: returns empty `{ items: [] }` when no requests exist
    - Test: maps a PENDING request correctly (no assigned handyman → `assignedHandymanDisplayName: null`)
    - Test: maps an ASSIGNED request with handyman profile correctly
    - Test: `estimatedTotal` Decimal is cast to number
  - [x] Create `apps/backend/test/requests.e2e-spec.ts` (follow `auth.e2e-spec.ts` pattern):
    - `beforeAll`: register + login a customer fixture (email `e2e-requests-customer@example.com`) and a handyman fixture
    - `GET /requests` tests (no `/api` prefix — e2e harness has no global prefix):
      - No `Authorization` header → 401
      - HANDYMAN bearer token → 403
      - CUSTOMER bearer token → 200 with `{ items: [] }` (empty, no requests yet)
    - `afterAll`: delete fixture users by email containing `e2e-requests-`

- [x] Task 5 — Frontend: customer-dashboard feature (AC: 1, 2, 3, 4, 5, 6)
  - [x] Create `apps/frontend/src/features/customer-dashboard/api/requests.api.ts`:
    - `fetchCustomerRequests(): Promise<CustomerRequestListResponse>`: calls `GET /api/requests` with `Authorization: Bearer <token>` from `getAccessToken()`. Handle 401 → call `clearAccessToken()` and throw a typed auth error (same pattern as `fetchSession` in `auth.api.ts`). Validate success response with `CustomerRequestListResponseSchema.safeParse`. Throw typed error on parse failure or non-2xx.
  - [x] Create `apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts`:
    - TanStack Query v5: `useQuery({ queryKey: ['customerRequests'], queryFn: fetchCustomerRequests, staleTime: 30_000 })`
    - On query error containing auth failure, call `useAuth().logout()` to clear context and redirect
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/StatusChip.tsx`:
    - Renders colored pill label for each `RequestStatus`
    - Color map (warm customer palette): PENDING → slate/muted, ASSIGNED → blue, ON_THE_WAY/ARRIVED/WORKING → orange accent, COMPLETE → green, REJECTED → red/error
    - Includes accessible text label (never relies on color alone per NFR16); always shows status text
    - Human-readable labels: `PENDING → "Pending"`, `ON_THE_WAY → "On the Way"`, `ASSIGNED → "Assigned"`, etc.
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`:
    - Props: `item: ServiceRequestListItem`
    - Shows: title (heading), status chip, category context (not in schema for now — omit or use status label), estimatedTotal formatted as currency or "—" if null, assigned handyman display name if not null
    - Touch target: entire card must be ≥ 44×44px clickable area (Story 2.x will wire navigation to detail view; for now the card is non-interactive but maintains size)
    - Use warm neutral card background, soft elevation per UX design system
    - Active cards (ASSIGNED/ON_THE_WAY/ARRIVED/WORKING) get a subtle border accent per design system
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/EmptyState.tsx`:
    - Props: none
    - Renders clear empty state module: illustrative icon or message, "You have no requests yet", prominent "New Request" CTA button (links to `/requests/new`)
    - Button is ≥ 44×44px, uses primary action styling
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/CustomerNav.tsx`:
    - Bottom navigation bar with exactly 4 items: Home (`/dashboard/customer`), New Request (`/requests/new`), History (`/requests/history`), Profile (`/profile`)
    - Active item highlighted
    - Each nav item touch target ≥ 44×44px
    - Use `<nav aria-label="Customer navigation">` for accessibility
    - Note: `/requests/new`, `/requests/history`, `/profile` routes do not exist yet — links are present but pages will be built in later stories; navigation to non-existent routes is acceptable in this story
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/RequestListSkeleton.tsx`:
    - Renders 3 placeholder card skeletons during loading
    - Uses CSS animation (pulse/shimmer) — no external skeleton library needed
    - Matches `RequestCard` dimensions to prevent layout shift
  - [x] Create `apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.tsx`:
    - Uses `useCustomerRequests()` hook
    - Loading state: renders `<RequestListSkeleton />`
    - Error state: renders inline error banner ("Failed to load requests. Please try again.") with retry button (`refetch()` from useQuery)
    - Empty state: renders `<EmptyState />`
    - Populated state: renders list of `<RequestCard />` components, active requests first (backend already orders them)
    - Header: "My Requests" heading + "New Request" button in top-right corner (minimum 44×44px)
    - Bottom: `<CustomerNav />`
    - Wrap requests section in `<main>` with accessible landmark
  - [x] Update `apps/frontend/src/App.tsx`:
    - Import `CustomerDashboardPage` from `features/customer-dashboard/pages/CustomerDashboardPage`
    - Replace `CustomerDashboardStub` with `CustomerDashboardPage` in the `/dashboard/customer` route (still wrapped in `<RequireAuth requiredRole="CUSTOMER">`)
    - Remove the `CustomerDashboardStub` component definition if it exists inline in `App.tsx`

- [x] Task 6 — Frontend tests (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.test.tsx`:
    - Mock `useCustomerRequests` hook (do NOT use MSW — keep tests light, same pattern as Story 1.3 frontend tests)
    - Test: loading state renders skeleton (assert `RequestListSkeleton` or a `data-testid` marker is present)
    - Test: empty state renders when `items: []` (assert empty state message and "New Request" link present)
    - Test: populated state renders request cards (assert request titles and status chips are present)
    - Test: nav bar renders with 4 items (Home, New Request, History, Profile)
  - [x] Create `apps/frontend/src/features/customer-dashboard/components/StatusChip.test.tsx`:
    - Test: renders correct text for each `RequestStatus` value
    - Test: renders correct accessible label (not color-only)

## Dev Notes

### What Story 1.3 Already Built — Do NOT Recreate

Auth infrastructure is complete:
- `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `AuthenticatedUser`, `JwtPayload` — all exported from barrel `apps/backend/src/modules/auth/index.ts`
- `AuthContext` with `useAuth()` hook providing `{ status, user, login, logout }` — in `apps/frontend/src/features/customer-auth/context/AuthContext.tsx`
- `getAccessToken()`, `clearAccessToken()` — in `apps/frontend/src/features/customer-auth/lib/auth-storage.ts`
- `RequireAuth` component — wraps `/dashboard/customer` route in `App.tsx` with `requiredRole="CUSTOMER"`
- `CustomerDashboardStub` in `App.tsx` — replace this with `CustomerDashboardPage` (Task 5)

### 401 Handling Pattern (Carry Over from 1.3)

When any authenticated fetch receives 401, the handler must:
1. Call `clearAccessToken()` from `auth-storage.ts`
2. Signal auth failure so the context transitions to `unauthenticated`
3. `RequireAuth` then redirects to `/login`

In `requests.api.ts`, throw a typed auth error on 401. In `useCustomerRequests`, catch it and call `useAuth().logout()`. Story 1.3 dev notes: "once Stories 2.1 / 3.2 add real authenticated fetches, they will repeat the same `clearAccessToken()` + redirect pattern." This is that moment.

### Prisma Schema Conventions (From 1.1 / 1.2)

- All IDs: `@default(cuid())`
- All timestamps: `@default(now())` for createdAt, `@updatedAt` for updatedAt
- Foreign key naming: `customerId`, `handymanId`, `categoryId` (camelCase field, maps to DB snake_case via `@map` if needed — follow the existing pattern in `schema.prisma`)
- Model naming: PascalCase Prisma model maps to snake_case table via `@@map`
- Do NOT re-import PrismaModule in RequestsModule — it is `@Global()` (same as AuthModule, UsersModule etc.)
- Migration name convention: lowercase with underscores, descriptive: `add_service_categories_and_requests`

### Existing Prisma Models (Do Not Recreate)

From `apps/backend/prisma/schema.prisma`:
- `User` — id, email, password_hash, role (CUSTOMER|HANDYMAN), account_status, created_at, plus relations to `customerProfile` and `handymanProfile`
- `CustomerProfile` — id, userId (unique), displayName, createdAt
- `HandymanProfile` — id, userId (unique), displayName, availabilityStatus, serviceRadiusKm, averageRatingCache, ratingsCountCache, createdAt

The `ServiceRequest.assignedHandymanId` FK points to `users.id`. To get the handyman's display name in the list query, join through `users → handymanProfile.displayName`.

### Decimal to Number Conversion

`estimatedTotal` is `Decimal?` in Prisma. When serializing to JSON for the contract, call `.toNumber()` on non-null Decimal values. Zod schema in contracts uses `z.number().nullable()` for this field. Do not return the Prisma `Decimal` object directly.

### Backend API Route Naming

The route is `GET /requests` (no namespace prefix beyond the module prefix). In the E2E test harness there is no global `/api` prefix (established in 1.3 — do not change). Frontend calls `/api/requests` via Vite proxy.

### TanStack Query v5 Pattern (Mandatory — Object Syntax Only)

```typescript
// CORRECT — v5 object syntax
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['customerRequests'],
  queryFn: fetchCustomerRequests,
  staleTime: 30_000,
});

// WRONG — never use positional args in this project
useQuery(['customerRequests'], fetchCustomerRequests);
```

### Frontend Architecture Rules (From 1.1 / 1.3)

- All code for this story lives in `apps/frontend/src/features/customer-dashboard/`
- Create subdirectories: `api/`, `hooks/`, `components/`, `pages/`
- API calls: use Vite proxy path `/api/...` — NEVER hardcode `http://localhost:3000`
- No Redux/Zustand — TanStack Query for server state, component state for UI-only concerns
- Router: `createBrowserRouter` already in `App.tsx` — do not migrate to `BrowserRouter`
- All imports from auth barrel: `import { JwtAuthGuard, RolesGuard, ... } from '../../auth'` (backend)

### Ordering Strategy for Dashboard (UX Journey 1)

UX spec: "active requests first, recent history below." The backend `findAllForCustomer` query must implement ordering so the frontend receives a pre-sorted list. Recommended Prisma approach:

```typescript
// In RequestsService
const ACTIVE_STATUSES = ['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'WORKING'];
// Fetch active requests first, then the rest ordered by createdAt DESC
// Use two queries or a raw ORDER BY CASE statement; two queries is simpler for MVP
const [active, historical] = await Promise.all([
  prisma.serviceRequest.findMany({
    where: { customerId, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } }, assignedHandyman: { include: { handymanProfile: { select: { displayName: true } } } } },
  }),
  prisma.serviceRequest.findMany({
    where: { customerId, status: { notIn: ACTIVE_STATUSES } },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } }, assignedHandyman: { include: { handymanProfile: { select: { displayName: true } } } } },
  }),
]);
return { items: [...active, ...historical].map(mapToDto) };
```

### Customer Visual Language (UX-DR18, UX-DR10)

Customer mode design tokens:
- Background: warm ivory / bone (e.g., `#FAF8F5` or Tailwind `stone-50`)
- Text: deep ink/navy (e.g., `#1A1A2E`)
- Primary action: muted slate-blue (e.g., `#3B5998` or `blue-700`)
- Accent: restrained orange (e.g., `#E07B39` or `orange-500`)
- Cards: white with soft shadow (e.g., `shadow-sm rounded-xl`)
- Status colors: PENDING=slate, ASSIGNED/active=blue, complete=green, rejected=red

Apply these as Tailwind utility classes or CSS variables — do NOT hardcode hex in component logic.

### Accessibility Requirements (WCAG 2.1 AA — NFR15, NFR16, NFR17)

- `<nav aria-label="Customer navigation">` on `CustomerNav`
- `<main>` landmark wrapping the request list
- Status chip must include text label, not color alone (NFR16)
- All interactive elements ≥ 44×44px touch targets
- Card skeletons: add `aria-busy="true"` on the container during loading
- Error banner: `role="alert"` so screen readers announce it

### Navigation Routes (What Exists vs. Deferred)

| Route | Story | Status |
|---|---|---|
| `/dashboard/customer` | 1.3 + **2.1** | Exists — being replaced |
| `/requests/new` | 2.2 | Deferred — nav link present, page TBD |
| `/requests/history` | 2.x (later) | Deferred — nav link present, page TBD |
| `/profile` | Epic 3 or 5 | Deferred — nav link present, page TBD |

Nav links to deferred routes are present but clicking them shows a 404/blank until those stories land. This is acceptable — do NOT stub out those pages in this story.

### Testing Standards (From 1.1 / 1.3)

- Backend unit tests mock `PrismaService` — do NOT hit a real DB in unit tests
- Backend e2e tests use a real DB (`Test.createTestingModule({ imports: [AppModule] })`)
- Frontend tests use Vitest + React Testing Library + jsdom (configured in `vite.config.ts`)
- Mock hooks directly in frontend tests; do NOT use MSW
- TypeScript must compile with zero errors: `pnpm -r typecheck`
- ESLint must pass: `pnpm -r lint`
- Backend tests: `pnpm --filter handrix-backend test` + `pnpm --filter handrix-backend test:e2e`
- Frontend tests: `pnpm --filter handrix-frontend test`
- Pre-existing failures (health.controller.spec.ts, HealthCheck.test.tsx) are NOT this story's concern

### Out of Scope (Explicitly Deferred)

- Request creation flow (Story 2.2–2.4)
- Category list endpoint beyond what's seeded (Story 2.2)
- Request detail / tracking view (Epic 4)
- Profile page (Story 3.1 for handyman, later story for customer)
- History page with filtering (later story)
- WebSocket updates on dashboard (Epic 4)
- Request status history table and append-only audit log (Epic 4 / Epic 5)
- Image uploads (Story 2.2)
- Price estimate calculation on the backend (Story 2.4)
- OpenAPI `@ApiBody` / `@ApiResponse` decorators (deferred from 1.2 cleanup)
- Rate limiting on `/requests` endpoint (Story 5.2)

### Project Structure Notes

- Auth module barrel (backend): `apps/backend/src/modules/auth/index.ts` — import from here, not deep paths
- Requests module location: `apps/backend/src/modules/requests/` — `RequestsModule`, `RequestsService`, `RequestsController` already scaffolded as stubs; extend, do NOT recreate
- Frontend feature: `apps/frontend/src/features/customer-dashboard/` — currently empty (`.gitkeep`); create subdirectory structure as specified in Task 5
- Contracts: `packages/contracts/src/request.schemas.ts` — new file; `index.ts` already re-exports `./auth.schemas` and others, append `export * from './request.schemas'`
- Seed file: if the project has a `prisma/seed.ts`, add categories there. If not, add them in the migration itself or create `prisma/seed.ts` following the existing project seed pattern. Check for `"prisma": { "seed": "..." }` in `apps/backend/package.json`.

### References

- Story requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Customer Dashboard with Request List]
- Epic 2 overview: [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Customer Request Creation & Dashboard]
- FR6, FR7: [Source: _bmad-output/planning-artifacts/epics.md#Functional Requirements]
- NFR1 (2s load time), NFR15-17 (accessibility): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- Domain model (service_requests, service_categories): [Source: _bmad-output/planning-artifacts/architecture.md#Domain Model Recommendations]
- Module responsibility (requests): [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary]
- State management strategy (TanStack Query): [Source: _bmad-output/planning-artifacts/architecture.md#State Management Strategy]
- Customer lifecycle states: [Source: _bmad-output/planning-artifacts/architecture.md#Request Lifecycle / State Machine Recommendations]
- Customer visual language and UX-DR7, UX-DR10, UX-DR15-17, UX-DR18-20: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Journey 1: Customer Dashboard-First Entry: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Customer Dashboard-First Entry]
- Auth barrel exports: [Source: apps/backend/src/modules/auth/index.ts]
- TanStack Query v5 object syntax, Vite proxy, feature folder conventions: [Source: _bmad-output/implementation-artifacts/1-3-login-and-role-based-dashboard-routing.md#Frontend Architecture Rules]
- Auth context and 401 handling pattern: [Source: _bmad-output/implementation-artifacts/1-3-login-and-role-based-dashboard-routing.md#Dev Notes]
- Prisma schema (User, CustomerProfile, HandymanProfile): [Source: apps/backend/prisma/schema.prisma]
- E2E test pattern (no global prefix, real DB): [Source: apps/backend/test/auth.e2e-spec.ts]
- CustomerDashboardStub to replace: [Source: apps/frontend/src/App.tsx]
- Deferred work open items: [Source: _bmad-output/implementation-artifacts/deferred-work.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation completed without blockers.

### Completion Notes List

- Added `RequestStatus` enum, `ServiceCategory` model, `ServiceRequest` model to Prisma schema with all required indexes. Migration `20260513072342_add_service_categories_and_requests` applied and 6 service categories seeded.
- Contracts package extended with `request.schemas.ts` — `RequestStatusEnum`, `ServiceRequestListItemSchema`, `CustomerRequestListResponseSchema` with inferred TypeScript types.
- Backend `RequestsModule` fully implemented: `RequestsService.findAllForCustomer` uses two parallel Prisma queries (active-first ordering), maps Decimal → number, returns `CustomerRequestListResponseDto`. `RequestsController` guards with `JwtAuthGuard + RolesGuard + @Roles(CUSTOMER)`.
- 4 unit tests (requests.service.spec.ts) and 3 e2e tests (requests.e2e-spec.ts) — all pass. Pre-existing health.controller.spec.ts failure is not this story's concern.
- Frontend `customer-dashboard` feature: `requests.api.ts` (401 → AuthError → clearAccessToken), `useCustomerRequests.ts` (TanStack Query v5), `StatusChip`, `RequestCard`, `EmptyState`, `CustomerNav`, `RequestListSkeleton`, `CustomerDashboardPage`. CSS styles added to index.css.
- `App.tsx` updated: `CustomerDashboardStub` removed, `CustomerDashboardPage` wired to `/dashboard/customer` route.
- 18 frontend tests: 14 StatusChip + 4 CustomerDashboardPage — all pass.
- TypeScript compiles with zero errors on both backend and frontend.

### File List

**Backend:**
- `apps/backend/prisma/schema.prisma` — modified (added RequestStatus enum, ServiceCategory, ServiceRequest models + User relations)
- `apps/backend/prisma/migrations/20260513072342_add_service_categories_and_requests/migration.sql` — new
- `apps/backend/prisma/seed.ts` — new
- `apps/backend/package.json` — modified (added prisma.seed config)
- `apps/backend/src/modules/requests/requests.module.ts` — modified (wired controller + service)
- `apps/backend/src/modules/requests/requests.service.ts` — new
- `apps/backend/src/modules/requests/requests.controller.ts` — new
- `apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts` — new
- `apps/backend/src/modules/requests/requests.service.spec.ts` — new
- `apps/backend/test/requests.e2e-spec.ts` — new

**Contracts:**
- `packages/contracts/src/request.schemas.ts` — new
- `packages/contracts/src/index.ts` — modified (appended `export * from './request.schemas'`)

**Frontend:**
- `apps/frontend/src/App.tsx` — modified (replaced CustomerDashboardStub with CustomerDashboardPage)
- `apps/frontend/src/index.css` — modified (added customer dashboard styles)
- `apps/frontend/src/features/customer-dashboard/api/requests.api.ts` — new
- `apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts` — new
- `apps/frontend/src/features/customer-dashboard/components/StatusChip.tsx` — new
- `apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx` — new
- `apps/frontend/src/features/customer-dashboard/components/EmptyState.tsx` — new
- `apps/frontend/src/features/customer-dashboard/components/CustomerNav.tsx` — new
- `apps/frontend/src/features/customer-dashboard/components/RequestListSkeleton.tsx` — new
- `apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.tsx` — new
- `apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.test.tsx` — new
- `apps/frontend/src/features/customer-dashboard/components/StatusChip.test.tsx` — new

## Change Log

- 2026-05-13: Story 2-1 implemented — Prisma schema (ServiceCategory + ServiceRequest + RequestStatus enum), contracts schemas, backend GET /requests endpoint with CUSTOMER-role guard, 7 backend tests (4 unit + 3 e2e), full customer-dashboard frontend feature (api, hooks, 5 components, page), 18 frontend tests. CustomerDashboardStub replaced with CustomerDashboardPage. All ACs satisfied.

### Review Findings

_Generated 2026-05-13 via /bmad-code-review — 3 parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor)._

#### Decision-Needed

- [x] [Review][Decision] **PENDING status bucketed as historical instead of active** — Spec AC5 explicitly lists active statuses as `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING` only, so the implementation in `requests.service.ts:9` is spec-faithful. However, a newly created PENDING request is logically "in progress" from the customer's perspective — when they land on the dashboard right after creating a request, it sinks into historical alongside COMPLETE/REJECTED, which contradicts the UX intent of "active first." Decision: add PENDING to `ACTIVE_STATUSES` (and update spec AC5), or keep current behavior?

#### Patch

- [x] [Review][Patch] **React Query cache survives logout — cross-user privacy leak** [`apps/frontend/src/features/customer-auth/context/AuthContext.tsx:42`, `apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts:7`] — `logout()` only clears token + auth state; the `['customerRequests']` cache entry persists. User B logging in on the same browser sees User A's data flash before refetch. Fix: `queryClient.clear()` (or scoped invalidate) on logout, OR include userId in the query key.
- [x] [Review][Patch] **AuthError shows generic error banner with retry-loop button** [`apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts:11`, `apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.tsx:21`] — `throwOnError` returns `false` for `AuthError`, so `isError` becomes true and the "Failed to load requests. Please try again." banner renders with a Retry button. Retry refetches with `Bearer null`, looping until `RequireAuth` navigates. Fix: short-circuit the error UI when error is `AuthError` (or transition to logout before rendering).
- [x] [Review][Patch] **Active/historical race produces duplicate or vanished requests** [`apps/backend/src/modules/requests/requests.service.ts:35-45`] — Two parallel `findMany` calls with `Promise.all`; if a request transitions between buckets in flight (PENDING→ASSIGNED, ASSIGNED→COMPLETE), it appears in both or neither. Fix: single query with `ORDER BY CASE` on status, or dedupe by id after concat.
- [x] [Review][Patch] **`safeParse` failure on one unknown enum kills entire list** [`apps/frontend/src/features/customer-dashboard/api/requests.api.ts:31`] — If backend adds a new `RequestStatus` value before the frontend rebuilds, the whole payload is rejected and the user sees a generic error. Fix: log the parse error with detail; consider per-item parse with skip-on-failure.
- [x] [Review][Patch] **Backend `status: string` typing throws away enum safety** [`apps/backend/src/modules/requests/requests.service.ts:16,25`, `apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts:10`] — Service `RequestWithRelations` types `status: string` and DTO is `@ApiProperty() status!: string`. Should be `RequestStatus` (Prisma enum) — gives compile-time enum coverage and proper Swagger docs.
- [x] [Review][Patch] **`Bearer null` sent when no token in storage** [`apps/frontend/src/features/customer-dashboard/api/requests.api.ts:13-19`] — `getAccessToken()` can return `null`; template literal serializes to `"Bearer null"`. Wasted roundtrip + misleading 401. Fix: early-return `AuthError` if token missing (mirror `fetchSession` pattern).
- [x] [Review][Patch] **`DECIMAL(65,30)` is absurd for currency** [`apps/backend/prisma/schema.prisma:113`, `apps/backend/prisma/migrations/20260513072342_add_service_categories_and_requests/migration.sql:21`] — Default Prisma precision; 30 trailing decimals will surface in JSON output and storage. Add `@db.Decimal(10,2)` on `estimatedTotal` and regenerate migration (cheap — no production data yet).
- [x] [Review][Patch] **Frontend `as RequestStatus` cast is redundant and hides drift** [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx:12,15`] — `item.status` is already typed `RequestStatus` via the contracts schema. Cast either papers over a stale type or is dead. Remove.
- [x] [Review][Patch] **Seed `process.exit(1)` pre-empts `$disconnect()`** [`apps/backend/prisma/seed.ts:24-30`] — `process.exit` is synchronous and runs before the `.finally()` chain resolves, leaking the DB connection on failure. Use `process.exitCode = 1` in catch, exit after finally.
- [x] [Review][Patch] **Skeleton loading state not announced to screen readers** [`apps/frontend/src/features/customer-dashboard/components/RequestListSkeleton.tsx:3`] — `aria-busy="true"` on a plain `<div>` is not announced. Add `role="status"` (or `aria-live="polite"`) so SR users hear loading state. Story spec NFR15-17 calls for WCAG 2.1 AA.
- [x] [Review][Patch] **E2E cleanup uses `e2e-requests-` substring — collides with future suites** [`apps/backend/test/requests.e2e-spec.ts:34-46`] — Same pattern flagged in Story 1.2/1.3 reviews. Narrow `afterAll` deletion to the exact two fixture emails, not a substring.
- [x] [Review][Patch] **Long request titles overflow card layout on mobile** [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx:24`, `apps/frontend/src/index.css`] — No `max-width` / `text-overflow` on `.request-card__title`. Long titles push the status chip off-screen and break card heights. Add ellipsis truncation (1-2 lines).
- [x] [Review][Patch] **Null estimate renders as bare em-dash with no SR context** [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx:5-7,29`] — Screen readers announce "em dash" or skip it. Replace with "Pending estimate" string (or aria-label) for null values.
- [x] [Review][Patch] **`categoryName` is fetched but never rendered** [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`] — Contract schema includes `categoryName`, backend returns it, but `RequestCard` omits it. AC3 says cards should be "glanceable" — category is part of that signal. Spec Task 5 was written before schema was finalized; render it now.
- [x] [Review][Patch] **`createdAt` in contract is `z.string()` — no datetime validation** [`packages/contracts/src/request.schemas.ts:22`] — Any string passes. Use `z.string().datetime()` (or `.refine`) so `new Date()` consumers can trust the value.

#### Deferred

- [x] [Review][Defer] **`ON DELETE SET NULL` on `assigned_handyman_id` orphans active jobs silently** [`apps/backend/prisma/migrations/20260513072342_add_service_categories_and_requests/migration.sql:55-57`] — deferred, schema/lifecycle design discussion (Epic 4/5)
- [x] [Review][Defer] **AssignedHandyman with no `handymanProfile` row silently returns null** [`apps/backend/src/modules/requests/requests.service.ts:27`] — deferred, observability concern (log/alert), Epic 5
- [x] [Review][Defer] **No background-refetch indicator** [`apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.tsx:34`] — deferred, UX polish (Story 5.4)
- [x] [Review][Defer] **Error → success → error transition hides previously-loaded data** [`apps/frontend/src/features/customer-dashboard/pages/CustomerDashboardPage.tsx:18`] — deferred, UX polish
- [x] [Review][Defer] **No fetch timeout / AbortController** [`apps/frontend/src/features/customer-dashboard/api/requests.api.ts:11-15`] — deferred, system-wide concern (Epic 5 hardening)
- [x] [Review][Defer] **No global exception filter — Prisma failures return bare 500** [`apps/backend/src/modules/requests/requests.service.ts`] — deferred, system-wide concern (Story 5.2 / 5.3)
- [x] [Review][Defer] **No pagination on `GET /requests` — unbounded result set** [`apps/backend/src/modules/requests/requests.service.ts`] — deferred, MVP scope; revisit when customer history grows or in Story 5.1

#### Dismissed (noise)

- Active/historical ordering "intent ambiguity" (Blind Hunter) — spec AC5 confirms active-first intent
- `vi.mock` `as ReturnType<...>` cast (Blind Hunter) — common test pattern, acceptable
- `logout` reference stale closure smell (Blind Hunter) — speculative; React Query re-evaluates `throwOnError` per error
- Hand-rolled Decimal type in `RequestWithRelations` (Blind Hunter) — paired with `@db.Decimal(10,2)` patch above
- Empty-state link to non-existent `/requests/new` (Edge Case Hunter) — spec Dev Notes explicitly allow this
- Status fallback `STATUS_LABELS[status] ?? status` shows raw enum (Edge Case Hunter) — zod is primary guard; fallback is defensive
- Seed never reactivates `isActive=false` categories (Edge Case Hunter) — operator concern, not a defect
- Zod / Prisma enum duplication (Acceptance Auditor) — common pattern across the codebase
- Redundant `clearAccessToken` calls (api layer + logout context) — idempotent, harmless
- IDs use `uuid()` instead of `cuid()` (Acceptance Auditor) — spec Dev Note is outdated; existing project models (`User`, `CustomerProfile`, `HandymanProfile`) all use `uuid()`. Consistency with project trumps stale spec note.
