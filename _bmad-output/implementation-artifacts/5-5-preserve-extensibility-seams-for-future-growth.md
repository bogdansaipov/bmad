# Story 5.5: Preserve Extensibility Seams for Future Growth

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product team planning post-MVP expansion,
I want the map abstraction, request lifecycle, category model, and rating data structure to preserve clean extension paths,
so that adding new categories, swapping map providers, or building chat and richer ratings later does not require rewriting core product logic.

## Acceptance Criteria

1. **Given** the map rendering and geocoding integrations are in place **When** the integration layer is reviewed **Then** map rendering and geocoding are accessed through provider-agnostic abstraction seams on both frontend and backend **And** replacing the map or geocoding provider does not require changes to request creation, tracking, or assignment workflows.

2. **Given** the service category model is in use **When** new categories need to be added post-MVP **Then** categories can be added through configuration or data changes without modifying the request creation flow, matching logic, or handyman profile structure **And** the request schema supports new category types through bounded extension rather than redesign.

3. **Given** the assignment and request identity model is stable **When** a chat feature is considered post-MVP **Then** the request and assignment identifiers provide stable anchors for a future chat transport **And** no MVP lifecycle assumption requires support chat to function correctly.

4. **Given** the `request_ratings` entity and handyman profile cache fields are in place **When** richer reputation features are planned post-MVP **Then** ratings are stored as a separate entity with handyman ID, stars, and optional feedback — ready for aggregation **And** no public review surfaces, moderation workflows, or dispute logic are included in the MVP data model.

## Tasks / Subtasks

- [x] Task 1 — Centralize map tile configuration into a single provider-agnostic seam (AC: 1)
  - [x] Create `apps/frontend/src/features/shared/config/mapConfig.ts` exporting a single `OSM_STYLE` constant (version 8, raster source, OSM tile URL, attribution). This makes tile provider replacement a one-file change.
  - [x] In `apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx` — remove the inline `OSM_STYLE` definition (lines 5–16) and import from `../../shared/config/mapConfig`.
  - [x] In `apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx` — remove the inline `OSM_STYLE` definition and import from `../../../shared/config/mapConfig` (adjust relative path).
  - [x] In `apps/frontend/src/features/request-create/components/MapLocationPicker.tsx` — remove the inline `OSM_STYLE` definition and import from `../../../shared/config/mapConfig` (adjust relative path).
  - [x] In `apps/backend/src/modules/maps/maps.module.ts` — add a `GeocodingService` stub: an `@Injectable()` class with a single `reverseGeocode(lat: number, lng: number): Promise<string | null>` method that returns `null` (Nominatim integration placeholder). Export it from the module. This establishes the swap seam for future geocoding providers without wiring it into product flows yet.

- [x] Task 2 — Verify and document the category extensibility seam (AC: 2)
  - [x] Verify `apps/backend/src/modules/matching/matching.service.ts` uses `categoryId` FK (not category name strings) when finding eligible handymen — it does: `select: { categoryId: true, ... }` at line 36. No code change needed.
  - [x] Verify `apps/backend/src/modules/categories/categories.service.ts` `findAllActive()` queries only active categories ordered by name — confirmed. No code change needed.
  - [x] Add a single JSDoc comment on `findAllActive()` in `categories.service.ts`: `/** Returns active categories ordered by name. To add a new category: INSERT into service_categories with isActive=true. No code changes required. */`
  - [x] Verify that `HandymanCategoryPreference` links by `categoryId` FK in the Prisma schema — it does. No code change needed.

- [x] Task 3 — Confirm request/assignment ID stability for future chat (AC: 3)
  - [x] Verify `service_requests.id` is `String @id @default(uuid())` in `apps/backend/prisma/schema.prisma` — confirmed. No change needed.
  - [x] Verify `request_assignments.id` is `String @id @default(uuid())` in the Prisma schema — confirmed. No change needed.
  - [x] In `apps/backend/src/modules/realtime/realtime.gateway.ts`, add a single comment above the `handleJoinRoom` method: `// Room key: 'request-${requestId}'. Future chat messages can be emitted on this same room without changing the room identity model.`
  - [x] No product-flow code changes — this task is purely verification plus one comment.

- [x] Task 4 — Implement handyman rating cache updates (AC: 4)
  - [x] In `apps/backend/src/modules/ratings/ratings.service.ts`, after the `prisma.requestRating.create(...)` call in `submitRating()`, add a cache update block that:
    - Uses `this.prisma.$transaction([...])` or sequential Prisma calls.
    - Runs `prisma.requestRating.aggregate({ where: { handymanId }, _avg: { stars: true }, _count: { stars: true } })` to compute current average and count.
    - Runs `prisma.handymanProfile.update({ where: { userId: request.assignedHandymanId }, data: { averageRatingCache: avg, ratingsCountCache: count } })`.
  - [x] Log the cache update: `this.logger.log({ event: 'rating.cache_updated', handymanId: request.assignedHandymanId, averageRatingCache: avg, ratingsCountCache: count })`.
  - [x] The `submitRating()` return type and response shape do NOT change — this is a side-effect only.
  - [x] No new API endpoints, no schema migrations needed — `averageRatingCache` and `ratingsCountCache` columns already exist as nullable Float/Int on `handyman_profiles`.

## Dev Notes

### What Is Already In Place — Do Not Rebuild

**Category seam is already API-driven (do NOT change this):**
- `GET /api/categories` returns active categories from DB — frontend uses this via `useCategories` hook with 5-min stale time
- `StepCategorySelect.tsx` renders tiles from API response — zero hardcoded category names in frontend
- `matching.service.ts` filters by `categoryId` FK — no name string comparisons
- `HandymanCategoryPreference` model stores `categoryId` FK — fully relational, no hardcoding
- Adding a new category = one DB row insert, zero code changes required

**Request/assignment IDs are already UUIDs and stable:**
- `ServiceRequest.id`: `String @id @default(uuid())`
- `RequestAssignment.id`: `String @id @default(uuid())`
- Realtime gateway already uses room pattern `request-${requestId}` for WebSocket channels
- No lifecycle state is chat-dependent — complete and rejected states exist without chat

**Ratings entity already has the right shape (do NOT restructure):**
- `RequestRating`: separate table with `requestId (unique)`, `customerId`, `handymanId`, `stars`, `shortFeedback`, `createdAt`
- `HandymanProfile.averageRatingCache: Float?` and `ratingsCountCache: Int?` columns EXIST but are NEVER populated — Task 4 fixes this
- One-time rating per request enforced via unique constraint on `requestId` (both DB and service layer)
- No public review surfaces, moderation, or dispute fields anywhere in the schema

**What the existing code uses (DO NOT replace):**
- CSS framework: **Custom CSS (`index.css`) + Tailwind utility classes**
- Map library: **MapLibre GL JS** (`maplibre-gl@^5.24.0`) — do NOT add Leaflet, Google Maps, or any other map lib
- State management: **TanStack Query** (server state) + local `useState`
- Backend ORM: **Prisma** — all DB access goes through `PrismaService`
- NestJS DI: all services are `@Injectable()` and registered in their module

**Shared contracts already exist at `packages/contracts/src/`:**
- `category.schemas.ts` — `ServiceCategorySchema`, `CategoryListResponseSchema`
- `request.schemas.ts` — all request shapes including `categoryId` field
- `rating.schemas.ts` — `SubmitRatingBodySchema`, `SubmitRatingResponseSchema`
- Do NOT add new contract schemas for this story — no new API shapes are introduced

### Project Structure — Files to Touch

```
# Task 1 — map tile seam
apps/frontend/src/features/shared/config/mapConfig.ts                    ← NEW: single OSM_STYLE export
apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx  ← remove inline OSM_STYLE, import from shared
apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx     ← remove inline OSM_STYLE, import from shared
apps/frontend/src/features/request-create/components/MapLocationPicker.tsx     ← remove inline OSM_STYLE, import from shared
apps/backend/src/modules/maps/maps.module.ts                              ← add GeocodingService stub + export

# Task 2 — category comment
apps/backend/src/modules/categories/categories.service.ts                 ← add JSDoc comment on findAllActive()

# Task 3 — chat anchor comment
apps/backend/src/modules/realtime/realtime.gateway.ts                     ← add one comment on handleJoinRoom

# Task 4 — ratings cache
apps/backend/src/modules/ratings/ratings.service.ts                       ← add cache update after rating creation
```

### Critical Implementation Notes

**mapConfig.ts content — exact shape expected:**
```ts
import type maplibregl from 'maplibre-gl';

export const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};
```

**GeocodingService stub — exact shape expected:**
```ts
// apps/backend/src/modules/maps/geocoding.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class GeocodingService {
  /** Nominatim-compatible reverse geocoding. Returns human-readable address or null. */
  async reverseGeocode(_lat: number, _lng: number): Promise<string | null> {
    return null; // placeholder for future Nominatim/provider integration
  }
}
```
Register in `MapsModule` providers and exports. No consumer needs to import this yet — it just establishes the seam.

**Rating cache update — exact logic:**
```ts
// After the try/catch around requestRating.create():
const agg = await this.prisma.requestRating.aggregate({
  where: { handymanId: request.assignedHandymanId },
  _avg: { stars: true },
  _count: { stars: true },
});
await this.prisma.handymanProfile.update({
  where: { userId: request.assignedHandymanId },
  data: {
    averageRatingCache: agg._avg.stars,
    ratingsCountCache: agg._count.stars,
  },
});
this.logger.log({
  event: 'rating.cache_updated',
  handymanId: request.assignedHandymanId,
  averageRatingCache: agg._avg.stars,
  ratingsCountCache: agg._count.stars,
});
```
No `$transaction` needed — if the cache update fails after a successful rating creation, the rating is still persisted (correct behavior). The cache is a derived view, not the source of truth.

**Relative import paths for mapConfig.ts:**
- `RequestTrackingMap.tsx` is at `features/request-tracking/components/` → import path: `../../shared/config/mapConfig`
- `ActiveJobMap.tsx` is at `features/handyman-active-job/components/` → import path: `../../../shared/config/mapConfig`
- `MapLocationPicker.tsx` is at `features/request-create/components/` → import path: `../../../shared/config/mapConfig`

**Scope limits — do NOT do in this story:**
- Do NOT wire `GeocodingService` into any existing service or controller — it is a future seam only
- Do NOT update the pricing module to be category-aware — pricing is out of scope (it uses flat fees and has its own seam path)
- Do NOT add a `ChatMessage` entity or schema — chat is a future feature, anchors are already stable
- Do NOT add public handyman rating endpoints — `averageRatingCache` is internal only for now
- Do NOT add test files — tests have been intentionally removed from this project
- Do NOT install new npm packages — all dependencies are already in place

### Previous Story Intelligence (5.4)

- Story 5.4 established `apps/frontend/src/features/shared/components/` alongside `shared/hooks/` — place the new `config/` directory as a sibling: `apps/frontend/src/features/shared/config/`
- Pattern from 5.4: backend changes in Epic 5 are additive only (no destructive refactors, no schema changes beyond what is already planned)
- `pnpm typecheck` in `apps/frontend` and `apps/backend` must pass — the `OSM_STYLE` type needs `maplibregl.StyleSpecification` annotation to satisfy TypeScript (use `import type`)
- Story 5.4 confirmed that `HandymanDashboardPage` and other handyman pages apply `data-theme="handyman"` — no theme changes in this story

### Git Intelligence

Recent commits: `dfa059c finish 5.3`, `b5764f1 finish 5.2`, `dbcde1e feat: epic 4 is done`. All previous Epic 5 stories focused on backend hardening and frontend accessibility. Story 5.5 is the final story — lightweight seam work across frontend config extraction and backend service additions. No Prisma migrations needed (cache columns already exist). Regression risk is minimal because Tasks 1–3 are purely additive or comment-only, and Task 4 adds a side-effect to a non-breaking code path.

### How to Verify After Implementation

**Task 1 — map config centralized:**
```bash
# No inline OSM_STYLE definitions should remain in map components
grep -rn "https://tile.openstreetmap.org" apps/frontend/src/features/request-tracking
grep -rn "https://tile.openstreetmap.org" apps/frontend/src/features/handyman-active-job
grep -rn "https://tile.openstreetmap.org" apps/frontend/src/features/request-create
# All three should return 0 matches
# The tile URL should only appear in shared/config/mapConfig.ts
grep -rn "https://tile.openstreetmap.org" apps/frontend/src/features/shared
# Should return exactly 1 match
```

**Task 4 — rating cache populated:**
```bash
# Submit a rating via the API, then query the handyman profile:
# SELECT average_rating_cache, ratings_count_cache FROM handyman_profiles WHERE user_id = '<id>';
# Both fields should be non-null after the first rating submission for that handyman.
```

**TypeScript verification:**
```bash
pnpm --filter frontend typecheck
pnpm --filter backend typecheck
```

### References

- Story definition: `_bmad-output/planning-artifacts/epics.md#Story 5.5`
- Architecture (map seams): `_bmad-output/planning-artifacts/architecture.md` — Location and Map Abstraction Strategy
- Architecture (future extensibility): `_bmad-output/planning-artifacts/architecture.md` — Future Extensibility Guidance
- Ratings service: `apps/backend/src/modules/ratings/ratings.service.ts`
- Handyman profile schema (cache fields): `apps/backend/prisma/schema.prisma` lines 57–74
- RequestRating schema: `apps/backend/prisma/schema.prisma` lines 225–241
- Maps module (currently empty): `apps/backend/src/modules/maps/maps.module.ts`
- Realtime gateway: `apps/backend/src/modules/realtime/realtime.gateway.ts`
- Map components: `RequestTrackingMap.tsx`, `ActiveJobMap.tsx`, `MapLocationPicker.tsx`
- Shared components dir (sibling to new config dir): `apps/frontend/src/features/shared/components/`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers. All tasks completed in single pass.

### Completion Notes List

- Task 1: Created `shared/config/mapConfig.ts` with typed `OSM_STYLE` constant. Removed inline duplicate definitions from all three map components. Created `GeocodingService` stub in new `geocoding.service.ts` and registered + exported it from `MapsModule`. Frontend and backend typechecks pass.
- Task 2: Verified category seam is fully API-driven (no hardcoded names anywhere). Added JSDoc comment on `findAllActive()` documenting the zero-code-change extension path.
- Task 3: Verified both `service_requests.id` and `request_assignments.id` are UUID `@default(uuid())`. Added chat anchor comment on `handleJoinRoom` in `RealtimeGateway`.
- Task 4: Added rating cache update block after `requestRating.create()` in `submitRating()`. Aggregates avg stars and count, updates `handymanProfile` cache fields, logs `rating.cache_updated` event. Return type and API shape unchanged.

### File List

- apps/frontend/src/features/shared/config/mapConfig.ts (NEW)
- apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx (MODIFIED)
- apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx (MODIFIED)
- apps/frontend/src/features/request-create/components/MapLocationPicker.tsx (MODIFIED)
- apps/backend/src/modules/maps/geocoding.service.ts (NEW)
- apps/backend/src/modules/maps/maps.module.ts (MODIFIED)
- apps/backend/src/modules/categories/categories.service.ts (MODIFIED)
- apps/backend/src/modules/realtime/realtime.gateway.ts (MODIFIED)
- apps/backend/src/modules/ratings/ratings.service.ts (MODIFIED)

### Change Log

- 2026-05-20: Story created. Codebase analysis confirmed: map OSM_STYLE duplicated in 3 components (extraction needed), category seam already API-driven (verify only), request/assignment IDs already UUID (verify + comment only), rating cache fields exist but unpopulated (implementation needed in ratings.service.ts).
- 2026-05-20: Implementation complete. Centralized OSM map config, added GeocodingService seam, documented category and chat anchors, implemented rating cache population. All typechecks pass.

### Review Findings

- [ ] [Review][Decision] Scope creep — custom `map-pin` marker elements with `fadeInScale` animation added to `ActiveJobMap.tsx` and `RequestTrackingMap.tsx`, plus removal of handyman marker `color: '#00b894'`, not prescribed by any task or AC in this story. CSS classes are defined in `index.css`. Likely carried over from story 5.4 accessibility work. Needs decision: accept as part of this story or revert and track separately.
- [x] [Review][Patch] No error handling around rating cache update block — if `handymanProfile.update` throws (e.g. P2025: no profile row) or `requestRating.aggregate` fails, the exception bubbles as an unhandled 500 after the rating has already been committed [`apps/backend/src/modules/ratings/ratings.service.ts`] — fixed: wrapped in try/catch, logs warning on failure
- [x] [Review][Defer] Rating cache concurrent write race — spec explicitly accepts eventual consistency; two concurrent rating submissions can leave cache with intermediate values [`apps/backend/src/modules/ratings/ratings.service.ts`] — deferred, pre-existing / by design
- [x] [Review][Defer] Concurrent duplicate rating race — DB unique constraint handles duplicate write; concurrent cache update timing is structural [`apps/backend/src/modules/ratings/ratings.service.ts`] — deferred, pre-existing
- [x] [Review][Defer] `clampCoords` return order `[lat, lng]` is counter-MapLibre convention — latent axis confusion for future callers [`apps/frontend/src/features/request-create/components/MapLocationPicker.tsx`] — deferred, pre-existing
- [x] [Review][Defer] Second `useEffect` in map components can add marker before map style loads — no `map.loaded()` guard on position-update effect [`ActiveJobMap.tsx`, `RequestTrackingMap.tsx`] — deferred, pre-existing
- [x] [Review][Defer] Duplicate marker creation code — 4 identical createElement/className/animation blocks across `ActiveJobMap.tsx` and `RequestTrackingMap.tsx` — deferred, pre-existing / out of scope
- [x] [Review][Defer] `fitBounds` 0,0 sentinel — no guard when both coords are `0,0`; map flies to ocean at zoom 15 [`apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx`] — deferred, pre-existing
- [x] [Review][Defer] `GeocodingService.reverseGeocode` always returns `null` — callers cannot distinguish "not found" from "not implemented"; intentional stub but undifferentiated by design [`apps/backend/src/modules/maps/geocoding.service.ts`] — deferred, intentional placeholder
