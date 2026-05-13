# Story 2.3: Location Capture with Geolocation and Map Pin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer creating a request,
I want my location set automatically from my device and adjustable on a map,
so that the handyman knows exactly where to come without me typing an address.

## Acceptance Criteria

1. **Given** the customer reaches the location step **When** the browser grants geolocation permission **Then** the map centers on the customer's detected location with a pin placed automatically **And** the customer can see and adjust the pin before confirming.

2. **Given** geolocation is denied or unavailable **When** the location step loads **Then** the map loads in a default state and the customer can place the pin manually **And** the flow does not stall or error because geolocation was unavailable.

3. **Given** the customer wants to adjust their location **When** they drag or tap the map to reposition the pin **Then** the pin moves to the selected position **And** the final confirmed lat/lng is stored as the authoritative job location in form state.

4. **Given** the location step map renders **When** it opens **Then** the map renders fully within 2 seconds under normal conditions **And** map rendering uses the provider-agnostic abstraction layer, not vendor-locked logic.

## Tasks / Subtasks

- [x] Task 1 — Install `maplibre-gl` in frontend (AC: 4)
  - [x] Run: `pnpm --filter handrix-frontend add maplibre-gl`
  - [x] Note: `maplibre-gl` ships its own TypeScript declarations — no `@types/` package needed

- [x] Task 2 — Extend types in `create-request.types.ts` (AC: 3)
  - [x] Add `'location'` to the `CreateRequestStep` union type (comment says "Story 2.3 adds 'location'")
  - [x] Add `locationLat?: number` and `locationLng?: number` to `CreateRequestFormState` interface (slot marked "Step 3 (Story 2.3 will extend)")
  - [x] Do NOT modify `INITIAL_FORM_STATE` — optional fields are implicitly `undefined`

- [x] Task 3 — Create `MapLocationPicker.tsx` — provider abstraction (AC: 4)
  - [x] Create `apps/frontend/src/features/request-create/components/MapLocationPicker.tsx`
  - [x] Import `maplibre-gl` and `maplibre-gl/dist/maplibre-gl.css` inside this file (CSS import here keeps map styles scoped to this abstraction)
  - [x] Use `useRef<HTMLDivElement>` for map container; initialize `maplibregl.Map` in a `useEffect` on mount; destroy on unmount via `map.remove()`
  - [x] Use an inline OSM raster style (no API key needed):
    ```typescript
    const OSM_STYLE = {
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
      layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
    };
    ```
  - [x] Props interface:
    ```typescript
    interface MapLocationPickerProps {
      initialLat?: number;
      initialLng?: number;
      onLocationChange: (lat: number, lng: number) => void;
    }
    ```
  - [x] Add a `maplibregl.Marker` at initial position (if provided); otherwise add marker on map click
  - [x] Support both: (a) draggable marker (`new maplibregl.Marker({ draggable: true })`), (b) map `click` event to reposition marker
  - [x] On marker `dragend` and on map `click`: call `onLocationChange(lat, lng)` with the new coords
  - [x] Map container div must have explicit height: use `className="w-full h-64 rounded-xl overflow-hidden"` (256px — renders on mobile without overflow)
  - [x] Map container div: `aria-label="Location selector map"`, `role="application"`
  - [x] Wrap marker and click handler setup in `useEffect` that re-runs when `initialLat`/`initialLng` are first set (use a `markerRef` to avoid duplicate markers)

- [x] Task 4 — Create `StepLocationCapture.tsx` — step UI + geolocation logic (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/request-create/components/StepLocationCapture.tsx`
  - [x] Props interface:
    ```typescript
    interface StepLocationCaptureProps {
      locationLat?: number;
      locationLng?: number;
      onLocationConfirmed: (lat: number, lng: number) => void;
      onBack: () => void;
    }
    ```
  - [x] Internal state: `pendingLat: number | undefined`, `pendingLng: number | undefined`, `geoError: string | null`, `isLocating: boolean`
  - [x] On mount (`useEffect` with `[]`): call `navigator.geolocation.getCurrentPosition()`
    - success: set `pendingLat`, `pendingLng`; set `isLocating = false`
    - error or unavailable: set `geoError = 'Location unavailable. Place the pin manually.'`; set `isLocating = false`
    - before call: set `isLocating = true`
    - guard: `if (!navigator.geolocation)` → skip immediately, set `geoError` inline
  - [x] Render `<MapLocationPicker initialLat={pendingLat} initialLng={pendingLng} onLocationChange={(lat, lng) => { setPendingLat(lat); setPendingLng(lng); }} />`
  - [x] If `isLocating`: show a brief loading message ("Detecting your location…") below the map — do NOT block map render
  - [x] If `geoError`: show inline notice below the map (`role="status"`) — do NOT use `role="alert"` (not an error, just guidance)
  - [x] "Confirm Location" button: disabled when `pendingLat === undefined || pendingLng === undefined`; calls `onLocationConfirmed(pendingLat, pendingLng)`
  - [x] "Back" button: calls `onBack()`
  - [x] Both buttons: `min-h-[44px]`, match 2.2 button styles (Back: `border border-stone-300 text-[#1A1A2E]`, Next/Confirm: `bg-blue-700 text-white`)
  - [x] Heading: `"Confirm your location"` with same `text-xl font-semibold text-[#1A1A2E]` style as step 2
  - [x] Show lat/lng as a compact feedback line below the confirm button: `"Lat: X.XXX, Lng: Y.YYY"` — visible when pin is placed, text-xs text-stone-500

- [x] Task 5 — Update `CreateRequestPage.tsx` (AC: 1, 2, 3)
  - [x] Add `'location'` to the `CreateRequestStep` import (type already has it after Task 2)
  - [x] Import `StepLocationCapture`
  - [x] Change `handleNextFromDetails()` from no-op to `setCurrentStep('location')` — this is the explicit wire the 2.2 review deferred here
  - [x] Add `handleNextFromLocation(lat: number, lng: number)`:
    ```typescript
    function handleNextFromLocation(lat: number, lng: number) {
      setFormState((s) => ({ ...s, locationLat: lat, locationLng: lng }));
      // Story 2.4 advances to 'estimate' step here
    }
    ```
  - [x] Add `handleBackFromLocation()`: `setCurrentStep('details')`
  - [x] Update `stepNumber` computation:
    ```typescript
    const stepNumber = currentStep === 'category' ? 1 : currentStep === 'details' ? 2 : 3;
    ```
  - [x] Render `StepLocationCapture` for `currentStep === 'location'`:
    ```typescript
    {currentStep === 'location' && (
      <StepLocationCapture
        locationLat={formState.locationLat}
        locationLng={formState.locationLng}
        onLocationConfirmed={handleNextFromLocation}
        onBack={handleBackFromLocation}
      />
    )}
    ```

- [x] Task 6 — Frontend tests (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/request-create/components/StepLocationCapture.test.tsx`
  - [x] **CRITICAL: Mock `maplibre-gl` at the top of every test file that imports it (directly or transitively through `StepLocationCapture`)**:
    ```typescript
    vi.mock('maplibre-gl', () => ({
      default: {
        Map: vi.fn().mockImplementation(() => ({
          on: vi.fn(),
          remove: vi.fn(),
          flyTo: vi.fn(),
          getCanvas: vi.fn().mockReturnValue({ style: {} }),
        })),
        Marker: vi.fn().mockImplementation(() => ({
          setLngLat: vi.fn().mockReturnThis(),
          addTo: vi.fn().mockReturnThis(),
          on: vi.fn().mockReturnThis(),
          getLngLat: vi.fn().mockReturnValue({ lat: 41.0, lng: 69.0 }),
          remove: vi.fn(),
        })),
      },
    }));
    ```
  - [x] Test: renders heading "Confirm your location"
  - [x] Test: "Confirm Location" button is disabled when no pin placed (pendingLat/Lng undefined)
  - [x] Test: geolocation unavailable path — mock `navigator.geolocation` as undefined; expect guidance text to appear and Confirm button to remain disabled
  - [x] Test: geolocation success path — mock `navigator.geolocation.getCurrentPosition` to call successCallback with coords; expect Confirm button to become enabled
  - [x] Test: "Back" button calls `onBack` prop
  - [x] Update `CreateRequestPage.test.tsx` — add test: after filling title on step 2 and clicking "Next", step 3 heading "Confirm your location" is visible

### Review Findings

- [x] [Review][Decision] `role="application"` on map container without keyboard pin-placement support — deferred to Story 5.4 (Accessibility Audit). Full keyboard map controls (arrow-nudge + Enter-to-place) add meaningful scope; map is functional for mouse/touch MVP path. [MapLocationPicker.tsx:~64]

- [x] [Review][Patch] MapLocationPicker stale effect: map never re-centers or places marker after geolocation resolves — `useEffect` runs once with empty deps, so when `StepLocationCapture` updates `pendingLat/pendingLng` via geolocation callback and passes them as `initialLat/initialLng`, the map ignores the prop change. User is left on a world-zoom (zoom 2) map centered on `[0, 0]` with no pin even though `canConfirm` becomes `true`. Core AC1 feature broken. Fixed: added second `useEffect` watching `initialLat/initialLng` that flies the map and places the marker when coords first arrive. [MapLocationPicker.tsx:~31-47; StepLocationCapture.tsx:~24-43]

- [x] [Review][Patch] Geolocation callback may setState on unmounted component — No cleanup flag or mounted-ref guard in `StepLocationCapture`. Fixed: added `mounted` flag with cleanup. [StepLocationCapture.tsx:~22-34]

- [x] [Review][Patch] Unattached marker not explicitly removed on cleanup — Fixed: added `markerRef.current?.remove()` before `map.remove()` in cleanup. [MapLocationPicker.tsx:~36-53]

- [x] [Review][Patch] No lat/lng bounds clamping — Fixed: added `clampCoords` helper applied in both click and dragend handlers. [MapLocationPicker.tsx:~31-42]

- [x] [Review][Patch] `useCategories` mock uses unsafe type cast bypassing type-checking — Changed to `as unknown as ReturnType<typeof useCategories>` to document deliberate unsafe cast. [CreateRequestPage.test.tsx:~50-55]

- [x] [Review][Patch] Back button selection by `textContent` in tests is brittle — Changed to `screen.getByRole('button', { name: 'Back' })`. [CreateRequestPage.test.tsx:~138-144]

- [x] [Review][Defer] `StepProgressIndicator` typed `currentStep as 1 | 2 | 3` while `totalSteps={4}` — When Story 2.4 adds the estimate step, TypeScript won't catch a missing branch because the cast allows `4` to slip through. Pre-existing; addressable in 2.4. [CreateRequestPage.tsx:~77] — deferred, pre-existing

- [x] [Review][Defer] Intentional empty deps arrays lack `eslint-disable` directives — `react-hooks/exhaustive-deps` will flag both effects; comments explain the intent but don't suppress lint. Pre-existing architectural choice. [MapLocationPicker.tsx; StepLocationCapture.tsx] — deferred, pre-existing

## Dev Notes

### What This Story Changes vs What Already Exists

**No backend changes.** `ServiceRequest.locationLat` and `locationLng` are already `Float?` in the Prisma schema (added in Story 2.1). No migration needed.

**No contracts changes.** Location fields are added to the `POST /requests` body schema in Story 2.4.

**Multi-step form state extension.** `create-request.types.ts` has explicit placeholder comments for Story 2.3 — follow them exactly:
- Line 1: `CreateRequestStep` union currently `'category' | 'details'` — add `| 'location'`
- Lines 13-14: `// Step 3 (Story 2.3 will extend)` — add `locationLat?: number` and `locationLng?: number`

**`handleNextFromDetails` is a known deferred no-op from Story 2.2.** The 2.2 code review explicitly noted: "Story 2.3 wires the Next button to step 3 (location)". See `CreateRequestPage.tsx:38-40`. Change it to `setCurrentStep('location')`.

**`stepNumber` in `CreateRequestPage`** is currently `currentStep === 'category' ? 1 : 2`. Update to a 3-branch ternary for step 3.

### Provider-Agnostic Map Abstraction (NFR20)

All `maplibre-gl` imports live exclusively in `MapLocationPicker.tsx`. `StepLocationCapture` never imports maplibre-gl directly. This is the seam: swapping the map provider later means rewriting only `MapLocationPicker.tsx` — no other file changes.

### maplibre-gl Map Lifecycle (Critical)

- Create the `Map` instance inside a `useEffect(() => { ... return () => map.remove(); }, [])` — not at component render time
- Use `useRef<maplibregl.Map | null>(null)` to hold the instance
- The container div must already be in the DOM when `new maplibregl.Map({ container: containerRef.current })` is called
- Do NOT create the Map before the `useEffect` fires — the container ref will be null

```typescript
useEffect(() => {
  const map = new maplibregl.Map({
    container: containerRef.current!,
    style: OSM_STYLE,
    center: [initialLng ?? 0, initialLat ?? 0],
    zoom: initialLat !== undefined ? 13 : 2,
  });
  mapRef.current = map;
  // ... add marker, click handler ...
  return () => { map.remove(); mapRef.current = null; };
}, []); // run once — deps intentionally empty; use refs for callbacks
```

Use `useRef` for `onLocationChange` callback to avoid stale closure without re-creating the map:
```typescript
const onLocationChangeRef = useRef(onLocationChange);
onLocationChangeRef.current = onLocationChange;
```

### maplibre-gl CSS Import

`import 'maplibre-gl/dist/maplibre-gl.css'` goes at the top of `MapLocationPicker.tsx`. Vite handles CSS imports from node_modules natively — no special plugin needed.

### Tile URL and Attribution

Use inline OSM raster style (no API key). **Include proper attribution** per OpenStreetMap tile usage policy:

```typescript
attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
```

The tile URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png` is OSM's public tile server — acceptable for development and low-traffic MVP. The architecture flags that tile provider should be swappable (NFR20) — the inline style config is exactly that seam.

### Geolocation API Pattern

```typescript
useEffect(() => {
  setIsLocating(true);
  if (!navigator.geolocation) {
    setGeoError('Location unavailable. Place the pin manually.');
    setIsLocating(false);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPendingLat(pos.coords.latitude);
      setPendingLng(pos.coords.longitude);
      setIsLocating(false);
    },
    () => {
      setGeoError('Location unavailable. Place the pin manually.');
      setIsLocating(false);
    },
    { timeout: 8000, maximumAge: 60_000 }
  );
}, []);
```

### MapLibre Marker Pattern

```typescript
const marker = new maplibregl.Marker({ draggable: true });
// Marker positioned on geolocation success (coords available) OR on first map click:
map.on('click', (e) => {
  marker.setLngLat([e.lngLat.lng, e.lngLat.lat]).addTo(map);
  onLocationChangeRef.current(e.lngLat.lat, e.lngLat.lng);
});
marker.on('dragend', () => {
  const { lat, lng } = marker.getLngLat();
  onLocationChangeRef.current(lat, lng);
});
```

Store `markerRef = useRef<maplibregl.Marker | null>(null)` to avoid adding duplicate markers.

### Mocking `maplibre-gl` in Vitest/jsdom

jsdom has no WebGL context. Any test that renders `MapLocationPicker` (directly or via `StepLocationCapture`) must mock `maplibre-gl` at the module level. See Task 6 for the mock object shape — it must match the methods called in `MapLocationPicker` or the component will throw.

Mock maplibre-gl **at the test file level** with `vi.mock('maplibre-gl', ...)`. Do NOT use `__mocks__/` folder (Vitest resolves that differently from Jest).

### Geolocation Mock Pattern for Tests

```typescript
const mockGeolocation = {
  getCurrentPosition: vi.fn((successCb) => {
    successCb({ coords: { latitude: 41.2995, longitude: 69.2401 } });
  }),
};
Object.defineProperty(globalThis.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true,
});
```

For the "geolocation unavailable" test: set `navigator.geolocation` to `undefined` before render.

### Auth Barrel Import (Backend — carry-forward from 2.1/2.2)

Not applicable for this story (no backend changes), but carry forward for future: always import from `../../auth` barrel.

### Customer Visual Language (Same as 2.1 / 2.2)

```
Background:  warm ivory   bg-[#FAF8F5] / stone-50
Text:        deep navy     #1A1A2E
Primary CTA: slate-blue    bg-blue-700 text-white
Accent:      orange-500
Cards/tiles: white + shadow-sm rounded-xl
```

Step heading style: `text-xl font-semibold text-[#1A1A2E]` — same as `StepRequestDetails` heading "Describe your request".

### Accessibility Requirements (WCAG 2.1 AA)

- Map container: `role="application"` + `aria-label="Location selector map"`
- Geolocation status/guidance text: `role="status"` (non-blocking announcement) — NOT `role="alert"`
- "Confirm Location" button: `disabled` attribute when no pin placed; `aria-disabled` not sufficient — use actual `disabled` prop
- All buttons: `min-h-[44px]` touch target
- Lat/lng feedback text is decorative; no special ARIA needed

### Form State Persists Across Steps

The multi-step form state lives in `CreateRequestPage` and persists across step transitions. When the user goes Back from step 3 to step 2, their title/description/imageId are preserved. When they return to step 3, any previously confirmed `locationLat`/`locationLng` are passed as `initialLat`/`initialLng` to `MapLocationPicker` so the map centers on their last confirmed location.

### Out of Scope (Explicitly Deferred)

- `POST /requests` submission — Story 2.4 (`handleNextFromLocation` stores state only; does NOT submit)
- Pricing estimate step (step 4) — Story 2.4
- Reverse geocoding (address lookup from lat/lng) — deferred; Story 2.3 stores raw lat/lng only
- Location display on request cards or tracking view — Epics 3/4
- Location privacy enforcement (exposing coords to assigned handyman only) — backend, Story 3.x or Epic 4
- Handyman active-job map / two-pin tracking view — Epic 4 (`request-tracking` feature)
- Cloud map tile provider migration — deferred per NFR20 seam; OSM tiles are MVP
- `navigator.permissions` API for proactive permission check — deferred; `getCurrentPosition` error callback covers denied state adequately

### Project Structure Notes

```
apps/frontend/src/features/request-create/
  types/
    create-request.types.ts          — MODIFY (add 'location' step, locationLat/Lng fields)
  components/
    MapLocationPicker.tsx            — NEW  (maplibre-gl encapsulation — provider seam)
    StepLocationCapture.tsx          — NEW  (geolocation logic + step UI)
    StepLocationCapture.test.tsx     — NEW
  pages/
    CreateRequestPage.tsx            — MODIFY (wire step 3, update stepNumber, handleNextFromDetails)
    CreateRequestPage.test.tsx       — MODIFY (add step-3 transition test)

No backend files changed.
No contracts files changed.
No Prisma schema changes (locationLat/locationLng already Float? in ServiceRequest).
```

### References

- Story 2.3 requirements and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Location Capture with Geolocation and Map Pin]
- Epic 2 overview and FR10-FR11 (geolocation + manual pin): [Source: _bmad-output/planning-artifacts/epics.md#Epic 2]
- UX-DR4 (geolocation with manual map fallback): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Design Requirements]
- Journey 2 step 3 (location confirmation on map): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2: Customer Create-Request Flow]
- Map abstraction strategy (MapLibre GL JS + OSM tiles): [Source: _bmad-output/planning-artifacts/architecture.md#Location and Map Abstraction Strategy]
- NFR20 (map provider behind replaceable seams): [Source: _bmad-output/planning-artifacts/architecture.md#NFRs]
- ServiceRequest.locationLat/locationLng already Float?: [Source: apps/backend/prisma/schema.prisma#ServiceRequest]
- CreateRequestStep union + INITIAL_FORM_STATE placeholder: [Source: apps/frontend/src/features/request-create/types/create-request.types.ts]
- handleNextFromDetails deferred wire to location step: [Source: apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx:38-40]
- `handleNextFromDetails` review finding (deferred no-op, wired by 2.3): [Source: _bmad-output/implementation-artifacts/2-2-service-category-selection-and-request-details.md#Review Findings]
- Multi-step form state design and 2.3 extension plan: [Source: _bmad-output/implementation-artifacts/2-2-service-category-selection-and-request-details.md#Multi-Step Form State Strategy]
- Customer visual language (warm ivory, navy, blue-700): [Source: _bmad-output/implementation-artifacts/2-2-service-category-selection-and-request-details.md#Customer Visual Language]
- TanStack Query v5 pattern, auth barrel, Vite proxy: [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#Dev Notes]
- Testing standards (Vitest + RTL, mock PrismaService for unit, real DB for e2e): [Source: _bmad-output/implementation-artifacts/2-2-service-category-selection-and-request-details.md#Testing Standards]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `maplibre-gl` via pnpm; package ships its own TS declarations, no `@types/` needed.
- Extended `CreateRequestStep` union with `'location'` and added `locationLat?: number` / `locationLng?: number` to `CreateRequestFormState`. `INITIAL_FORM_STATE` unchanged (optional fields default to `undefined`).
- Created `MapLocationPicker.tsx` as the sole MapLibre GL encapsulation boundary (provider-agnostic seam per NFR20). Uses OSM raster inline style, draggable marker, and map-click handler. `onLocationChange` callback stored in a ref to avoid stale closure without re-running the map effect.
- Created `StepLocationCapture.tsx`: calls `navigator.geolocation.getCurrentPosition` on mount; handles unavailable/denied path gracefully (shows guidance text, does not block map); "Confirm Location" button disabled until pin is placed; lat/lng feedback text visible once pin is set.
- Wired `handleNextFromDetails` in `CreateRequestPage.tsx` from deferred no-op to `setCurrentStep('location')` as specified by Story 2.2 review finding. Added `handleNextFromLocation` (stores lat/lng in form state) and `handleBackFromLocation`. Updated `stepNumber` to 3-branch ternary.
- Added 5 unit tests for `StepLocationCapture` (heading render, disabled state, geo-unavailable path, geo-success path, Back button). Added maplibre-gl module mock to `CreateRequestPage.test.tsx` and new step-3 transition test. All 12 tests pass.

### File List

- `apps/frontend/package.json` (modified — maplibre-gl added)
- `pnpm-lock.yaml` (modified — lockfile updated)
- `apps/frontend/src/features/request-create/types/create-request.types.ts` (modified)
- `apps/frontend/src/features/request-create/components/MapLocationPicker.tsx` (new)
- `apps/frontend/src/features/request-create/components/StepLocationCapture.tsx` (new)
- `apps/frontend/src/features/request-create/components/StepLocationCapture.test.tsx` (new)
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx` (modified)
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.test.tsx` (modified)

## Change Log

- 2026-05-13: Story 2.3 implemented — location capture step with geolocation auto-detect and interactive MapLibre GL map pin. Step 2 "Next" now advances to step 3. 12 new/updated tests all pass.
