# Story 2.2: Service Category Selection and Request Details

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer creating a new request,
I want to pick a service category and fill in a title, description, and optional image in focused steps,
so that I can describe my problem quickly without being overwhelmed.

## Acceptance Criteria

1. **Given** a customer taps `New Request` **When** the create-request flow opens **Then** the first step presents only supported service categories as selectable tiles **And** each category tile shows a clear label with no technical jargon required.

2. **Given** a customer selects a category **When** they advance to the next step **Then** they can enter a short title and description for the request **And** the step has one dominant action and minimal surrounding noise.

3. **Given** the customer is on the description step **When** they optionally attach an image **Then** the image is validated for file type (JPEG, PNG, WebP) and size (≤ 5 MB) before upload **And** the image is stored via the secure backend upload path with metadata persisted in the database (no cloud storage in MVP — local disk via multer).

4. **Given** required fields (category, title) are incomplete **When** the customer attempts to advance **Then** clear, accessible validation feedback is shown inline **And** the flow does not advance until required fields are filled.

5. **Given** service categories are managed in the backend **When** the category list is requested **Then** categories are served from structured backend configuration (database), not hardcoded on the frontend **And** adding or disabling a category does not require a frontend code change.

6. **Given** the customer navigates to `/requests/new` **When** the page loads **Then** it is protected by `RequireAuth` with `requiredRole="CUSTOMER"` **And** a HANDYMAN-role user cannot access this route.

## Tasks / Subtasks

- [x] Task 1 — Add Prisma schema: RequestImage model (AC: 3)
  - [x] Add `RequestImage` model to `apps/backend/prisma/schema.prisma`:
    - `id`: `String @id @default(uuid())`
    - `requestId`: `String? @map("request_id")` — nullable until linked at submission (Story 2.4)
    - `uploaderId`: `String @map("uploader_id")` — FK → users.id
    - `filePath`: `String @map("file_path")` — relative path on disk
    - `mimeType`: `String @map("mime_type")` — e.g. `"image/jpeg"`
    - `sizeBytes`: `Int @map("size_bytes")`
    - `createdAt`: `DateTime @default(now()) @map("created_at")`
    - Relation to `ServiceRequest?` (nullable): `@relation(fields: [requestId], references: [id], onDelete: SetNull)`
    - Relation to `User` (uploader): `@relation("UploadedImages", fields: [uploaderId], references: [id])`
    - `@@index([requestId])`, `@@index([uploaderId])`
    - `@@map("request_images")`
  - [x] Add `images RequestImage[]` relation to existing `ServiceRequest` model
  - [x] Add `uploadedImages RequestImage[] @relation("UploadedImages")` to existing `User` model
  - [x] Generate and apply migration: used `prisma db push` + created migration file + `prisma migrate resolve --applied`
  - [x] Run `pnpm --filter handrix-backend prisma generate`

- [x] Task 2 — Install `@types/multer` (AC: 3)
  - [x] Run: `pnpm --filter handrix-backend add -D @types/multer`
  - [x] Verify `Express.Multer.File` type resolves in TypeScript

- [x] Task 3 — Add category + image-upload schemas to shared contracts (AC: 1, 3, 5)
  - [x] Create `packages/contracts/src/category.schemas.ts`
  - [x] Append `export * from './category.schemas'` to `packages/contracts/src/index.ts`
  - [x] Rebuild contracts: `pnpm --filter @handrix/contracts build`

- [x] Task 4 — Implement backend: categories module `GET /categories` (AC: 1, 5)
  - [x] Create `apps/backend/src/modules/categories/categories.service.ts`
  - [x] Create `apps/backend/src/modules/categories/dto/category-list-response.dto.ts`
  - [x] Create `apps/backend/src/modules/categories/categories.controller.ts`
  - [x] Wire up `CategoriesModule` in `apps/backend/src/modules/categories/categories.module.ts`
  - [x] Verified `CategoriesModule` already imported in `app.module.ts`

- [x] Task 5 — Implement backend: uploads module `POST /uploads/request-image` (AC: 3)
  - [x] Create `apps/backend/src/modules/uploads/uploads.service.ts`
  - [x] Create `apps/backend/src/modules/uploads/dto/image-upload-response.dto.ts`
  - [x] Create `apps/backend/src/modules/uploads/multer.config.ts`
  - [x] Create `apps/backend/src/modules/uploads/uploads.controller.ts`
  - [x] Wire up `UploadsModule` in `apps/backend/src/modules/uploads/uploads.module.ts`
  - [x] Create upload directory at startup in `apps/backend/src/main.ts`
  - [x] Add `uploads/` to `apps/backend/.gitignore` (created new file)
  - [x] Verified `UploadsModule` already imported in `app.module.ts`

- [x] Task 6 — Backend tests: categories and uploads (AC: 1, 3, 5)
  - [x] Create `apps/backend/src/modules/categories/categories.service.spec.ts`
  - [x] Create `apps/backend/src/modules/uploads/uploads.service.spec.ts`
  - [x] Create `apps/backend/test/categories.e2e-spec.ts`

- [x] Task 7 — Frontend: `request-create` feature (AC: 1, 2, 3, 4, 6)
  - [x] Create `apps/frontend/src/features/request-create/types/create-request.types.ts`
  - [x] Create `apps/frontend/src/features/request-create/api/categories.api.ts`
  - [x] Create `apps/frontend/src/features/request-create/api/uploads.api.ts`
  - [x] Create `apps/frontend/src/features/request-create/hooks/useCategories.ts`
  - [x] Create `apps/frontend/src/features/request-create/components/CategoryTile.tsx`
  - [x] Create `apps/frontend/src/features/request-create/components/StepCategorySelect.tsx`
  - [x] Create `apps/frontend/src/features/request-create/components/ImageUploadTile.tsx`
  - [x] Create `apps/frontend/src/features/request-create/components/StepRequestDetails.tsx`
  - [x] Create `apps/frontend/src/features/request-create/components/StepProgressIndicator.tsx`
  - [x] Create `apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx`
  - [x] Update `apps/frontend/src/App.tsx` — added `/requests/new` route

- [x] Task 8 — Frontend tests (AC: 1, 2, 3, 4, 6)
  - [x] Create `apps/frontend/src/features/request-create/components/StepCategorySelect.test.tsx`
  - [x] Create `apps/frontend/src/features/request-create/components/ImageUploadTile.test.tsx`
  - [x] Create `apps/frontend/src/features/request-create/pages/CreateRequestPage.test.tsx`

### Review Findings (2026-05-13)

- [x] [Review][Patch] Derive stored file extension from MIME whitelist instead of `file.originalname` (Decision #1 → patch) [apps/backend/src/modules/uploads/multer.config.ts:14-17]
- [x] [Review][Defer] Magic-byte / content-sniffing validation on upload — deferred, Story 5.2 (security baselines) owns content sniffing
- [x] [Review][Dismiss] `GET /categories` role gating — confirmed intentional; Story 3.1 (handyman profile setup with categories) requires HANDYMAN to read the same endpoint
- [x] [Review][Defer] Orphan upload cleanup strategy — deferred, Epic 5 hardening (operational concern, no infra in 2.2 to support a cron sweep, MVP volume is trivial)
- [x] [Review][Dismiss] `handleNextFromDetails` no-op — confirmed intentional; Story 2.3 wires the Next button to step 3 (location). Accepting the no-op as a progressive-build intermediate state
- [x] [Review][Patch] Failed-upload preview blob URL is never revoked (memory leak) [apps/frontend/src/features/request-create/components/StepRequestDetails.tsx:34]
- [x] [Review][Patch] Image preview not revoked on remove / replace / unmount (memory leak) [apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx:38-40]
- [x] [Review][Patch] If `prisma.requestImage.create` throws after multer wrote the file, the disk file is orphaned — wrap with try/catch + fs.unlink [apps/backend/src/modules/uploads/uploads.service.ts:13-20]
- [x] [Review][Patch] Race condition: selecting a new image while a prior upload is in flight can let an older response set `imageId` last — guard with an AbortController or `isUploading` early-return [apps/frontend/src/features/request-create/components/StepRequestDetails.tsx:32-45]
- [x] [Review][Patch] Component may set state after unmount if upload resolves late — track a `mounted` ref or AbortController [apps/frontend/src/features/request-create/components/StepRequestDetails.tsx:36-44]
- [x] [Review][Patch] Zero-byte files pass the type/size validators — add `file.size === 0` rejection [apps/frontend/src/features/request-create/components/ImageUploadTile.tsx:24-44]
- [x] [Review][Patch] Multer `limits` is missing `files: 1` cap — extra fields are silently ignored instead of rejected [apps/backend/src/modules/uploads/multer.config.ts:26]
- [x] [Review][Patch] Empty `categories.items` array shows a blank grid with no message and Next disabled — add an explicit empty state [apps/frontend/src/features/request-create/components/StepCategorySelect.tsx]
- [x] [Review][Defer] Rate limiting on `POST /uploads/request-image` [apps/backend/src/modules/uploads/uploads.controller.ts] — deferred, Story 5.2 (security baselines) explicitly owns rate limiting
- [x] [Review][Defer] CSRF / CORS hardening for upload endpoint — deferred, Story 5.2 (security baselines)
- [x] [Review][Defer] `@ApiBody` / `@ApiResponse` decorators on upload + categories controllers — deferred per Dev Notes ("OpenAPI @ApiBody/@ApiResponse decorators — deferred from 2.1")
- [x] [Review][Defer] DELETE endpoint for orphaned `RequestImage` when user removes preview — Story 2.4 (or cleanup story) wires the actual lifecycle
- [x] [Review][Defer] Story 2.4 must enforce `RequestImage.uploaderId === ServiceRequest.customerId` on attach to prevent Customer A using Customer B's `imageId` [apps/backend/prisma/schema.prisma RequestImage] — deferred, authorization enforcement belongs to the `POST /requests` controller built in Story 2.4
- [x] [Review][Defer] No warn-before-leave guard when user navigates back to dashboard mid-flow — UX polish, Story 5.4
- [x] [Review][Defer] Hardcoded category count + JS-vs-DB sort comparison in e2e test [apps/backend/test/categories.e2e-spec.ts:638-647] — deferred, test brittleness improvement for later QA pass
- [x] [Review][Defer] e2e fixture leaks (customer token reuse, no cleanup of `e2e-cats-customer@example.com` on interrupted runs) [apps/backend/test/categories.e2e-spec.ts:603,615] — deferred, test isolation hardening
- [x] [Review][Defer] `main.ts:43` `fs.mkdirSync(UPLOAD_DIR, ...)` uses a relative path resolved against process cwd; not deployment-robust — deferred, Story 5.4 (deployment readiness)
- [x] [Review][Defer] `UPLOAD_DIR` constant is not env-configurable [apps/backend/src/modules/uploads/multer.config.ts:7] — deferred, Story 5.4 (deployment / horizontal scaling)
- [x] [Review][Defer] `MulterError(LIMIT_FILE_SIZE)` returns a generic 500 instead of 413 — deferred, error-envelope polish (Story 5.2/5.3)
- [x] [Review][Defer] `uploadRequestImage` re-implements auth-error handling in `uploads.api.ts:32-37` instead of using a shared HTTP client — deferred, tech debt cleanup
- [x] [Review][Defer] `AuthError` defined in `categories.api.ts` and imported by `uploads.api.ts` — should live in a shared errors module — deferred, refactor
- [x] [Review][Defer] Title is not trimmed before send (`handleNext` validates with trim but doesn't write trimmed value back) [apps/frontend/src/features/request-create/components/StepRequestDetails.tsx:47-54] — deferred, Story 2.4 owns submission
- [x] [Review][Defer] Repeated literal hex `text-[#1A1A2E]` / `bg-[#FAF8F5]` across multiple components instead of a Tailwind token — deferred, design-system cleanup



### What Stories 1.x and 2.1 Already Built — Do NOT Recreate

**Auth infrastructure (from Story 1.3):**
- `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `AuthenticatedUser` — barrel: `apps/backend/src/modules/auth/index.ts`
- `AuthContext` with `useAuth()` — `apps/frontend/src/features/customer-auth/context/AuthContext.tsx`
- `getAccessToken()`, `clearAccessToken()` — `apps/frontend/src/features/customer-auth/lib/auth-storage.ts`
- `RequireAuth` component wrapping routes in `App.tsx`

**Domain foundation (from Story 2.1):**
- `ServiceCategory` model in Prisma — already exists; 6 categories seeded: Plumbing, Electrical, Carpentry, Painting, Cleaning, HVAC
- `ServiceRequest` model, `RequestStatus` enum — already exist; DO NOT recreate
- `RequestsModule` with `GET /requests` — already exists; this story adds `POST /requests` only in Story 2.4
- `CategoriesModule` and `UploadsModule` stub shells already imported in `app.module.ts` — just implement them

**Frontend (from Story 2.1):**
- `StatusChip`, `RequestCard`, `EmptyState`, `CustomerNav`, `RequestListSkeleton`, `CustomerDashboardPage` — all in `features/customer-dashboard/`
- `request.schemas.ts` in contracts — do NOT modify; append new schemas to `category.schemas.ts`
- The `/requests/new` link already exists in `CustomerNav` (stub link, currently 404) — Story 2.2 wires the real page

### ID Convention (CRITICAL — from 2.1 code review)

All Prisma models use `@default(uuid())` NOT `cuid()`. The story 2.1 spec originally said `cuid()` but the actual implementation used `uuid()` to be consistent with the existing `User`, `CustomerProfile`, `HandymanProfile` models. **RequestImage must use `uuid()`.**

### Auth Barrel Import (Backend)

Always import guards and decorators from the barrel, never from deep paths:
```typescript
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, AuthenticatedUser, UserRole } from '../../auth';
```

### PrismaModule Is Global — Never Re-Import

`PrismaModule` is `@Global()`. `CategoriesModule` and `UploadsModule` must NOT import it in their `@Module({ imports: [] })`. Inject `PrismaService` directly in service constructors.

### 401 Handling Pattern (Mandatory — Same as `requests.api.ts`)

Every authenticated API call must:
1. Check token presence before fetching: if `getAccessToken()` returns null, throw `AuthError` immediately
2. On HTTP 401 response: call `clearAccessToken()` + throw `AuthError`
3. In TanStack Query hook: catch `AuthError` → `useAuth().logout()`

Copy the pattern from `apps/frontend/src/features/customer-dashboard/api/requests.api.ts` exactly.

### Multer Setup Details

`multer` is bundled with `@nestjs/platform-express` (already installed). Only `@types/multer` needs to be added as a devDependency:
```bash
pnpm --filter handrix-backend add -D @types/multer
```

`FileInterceptor` import: `import { FileInterceptor } from '@nestjs/platform-express'`
`UploadedFile` import: `import { UploadedFile } from '@nestjs/common'`

The multer `diskStorage` stores files to `uploads/request-images/` (relative to CWD where the backend process runs, which is `apps/backend/`). For local dev this resolves to `apps/backend/uploads/request-images/`.

**IMPORTANT:** The `uploads/` directory must exist before multer writes to it. The `main.ts` `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` call ensures it's created on startup.

### Image Upload Flow (End-to-End)

```
User selects file → Client-side validate (type + size) → Show local blob URL preview
→ POST /api/uploads/request-image (multipart/form-data, field: 'file')
→ Backend: multer validates type+size again → diskStorage writes file → UploadsService creates RequestImage (requestId=null) → returns { imageId }
→ Frontend stores imageId in form state (sent to Story 2.4's POST /requests)
→ Story 2.4: POST /requests body includes imageId → backend updates RequestImage.requestId = newRequestId
```

**Do NOT set `Content-Type` header** when using `FormData` in the frontend — the browser adds it automatically with the correct `multipart/form-data; boundary=...` value. Setting it manually will break the upload.

### Frontend: No Image URL Display Required in This Story

The frontend only needs a local preview (`URL.createObjectURL(file)`) during the creation flow. There is no need to render the uploaded image from a backend URL in this story. The backend does NOT need a `GET /uploads/...` serving endpoint in Story 2.2 — that is deferred to when the request detail view is built (Story 2.4 or later).

### TanStack Query v5 Pattern (Mandatory — Object Syntax Only)

```typescript
// CORRECT
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['categories'],
  queryFn: fetchCategories,
  staleTime: 5 * 60_000,
});

// WRONG — never use positional args
useQuery(['categories'], fetchCategories);
```

### Frontend Architecture Rules

- All code for this story lives in `apps/frontend/src/features/request-create/`
- Subdirectories: `api/`, `hooks/`, `components/`, `pages/`, `types/`
- API calls: use Vite proxy path `/api/...` — NEVER hardcode `http://localhost:3000`
- No Redux/Zustand — route-local `useState` for multi-step form state; TanStack Query only for server fetches
- Router: `createBrowserRouter` in `App.tsx` — add the `/requests/new` route entry; do NOT migrate to `BrowserRouter`
- `AuthProvider` + `QueryClientProvider` are already set up in the app root — do NOT re-add them

### Multi-Step Form State Strategy

The form state lives in `CreateRequestPage.tsx` as a single `useState<CreateRequestFormState>`. Each step component receives relevant slice of state as props plus change handlers. Steps are rendered conditionally — NOT separate routes. This is intentional: the URL stays `/requests/new` throughout the creation flow. Browser back button would navigate away from creation entirely (acceptable for MVP).

This state structure is designed to be extended:
- Story 2.3 adds `locationLat`, `locationLng` fields and `'location'` step
- Story 2.4 adds `'estimate'` step and calls `POST /requests` with the full accumulated state

### Customer Visual Language (UX-DR18, UX-DR10 — Same as Story 2.1)

```
Background:   warm ivory / bone  (stone-50 / #FAF8F5)
Text:         deep ink/navy       (#1A1A2E)
Primary CTA:  muted slate-blue    (blue-700)
Accent:       restrained orange   (orange-500)
Cards/tiles:  white + soft shadow (shadow-sm rounded-xl)
Selected:     navy border + check (border-blue-700 bg-blue-50)
```

Apply as Tailwind utility classes or CSS variables — do NOT hardcode hex in component logic.

Category tiles should use `rounded-xl`, `shadow-sm`, minimum `min-h-[80px]` for touch target, `border-2` with color change on selection.

### Accessibility Requirements (WCAG 2.1 AA — NFR15-17)

- `<main>` landmark on `CreateRequestPage`
- `<fieldset>/<legend>` or `aria-group` for the category tile grid: `<fieldset aria-labelledby="category-heading">`
- Category tiles: `role="button"` + `aria-pressed` (or implement as `<input type="radio">` group for native semantics — radio group is preferred)
- Form fields (title, description): always have visible `<label>` with `htmlFor`
- Validation errors: `role="alert"` on error messages so screen readers announce them
- Image upload tile: `<input type="file">` with accessible `aria-label`
- All interactive elements ≥ 44×44px touch targets
- Progress indicator: `aria-label="Step 1 of 4"` on container

**Preferred category selection pattern:** `<input type="radio">` with visually styled labels — gives native keyboard navigation for free and correct ARIA semantics without manual `aria-pressed` management.

### Seed Data Reference

6 categories already seeded by Story 2.1 (`apps/backend/prisma/seed.ts`):
- Plumbing, Electrical, Carpentry, Painting, Cleaning, HVAC
- All `isActive: true`

The `GET /categories` endpoint should return all 6 in alphabetical order. No new seed data needed for this story.

### Testing Standards (From 1.1 / 1.3 / 2.1)

- Backend unit tests mock `PrismaService` — do NOT hit a real DB
- Backend e2e tests use real DB (`Test.createTestingModule({ imports: [AppModule] })`)
- E2E `afterAll`: delete fixture users by **exact email**, not substring (patch from 2.1 code review)
- Frontend tests: Vitest + React Testing Library + jsdom; mock hooks directly, no MSW
- TypeScript must compile with zero errors: `pnpm -r typecheck`
- ESLint must pass: `pnpm -r lint`
- Pre-existing failures (health.controller.spec.ts, HealthCheck.test.tsx) are NOT this story's concern

### Backend Route Reference (No Global Prefix)

The E2E test harness has no global `/api` prefix (established in 1.3). Frontend calls `/api/...` via Vite proxy, which strips `/api` before hitting the backend. Backend routes are:
- `GET /categories` → categories controller
- `POST /uploads/request-image` → uploads controller

### `.gitignore` for Uploads

Check for `apps/backend/.gitignore`. If it exists, append `uploads/`. If not, create it with `uploads/` as content. The uploaded image files must not be committed to git.

### Out of Scope (Explicitly Deferred)

- `POST /requests` (request creation) — Story 2.4
- Location step (step 3) — Story 2.3
- Pricing estimate step (step 4) — Story 2.4
- Serving uploaded images via URL for display (no `GET /uploads/:imageId`) — Story 2.4+
- Actual cloud object storage (S3/Cloudflare R2) — Epic 5
- Handyman category preferences endpoint — Story 3.1
- Request detail / tracking view — Epic 4
- Navigation to `/requests/history` or `/profile` — later stories
- WebSocket updates — Epic 4
- Rate limiting on upload endpoint — Story 5.2
- OpenAPI `@ApiBody`/`@ApiResponse` decorators — deferred from 2.1

### Project Structure Notes

```
apps/backend/src/modules/
  categories/
    categories.module.ts          — EXTEND (add controller + provider)
    categories.service.ts         — NEW
    categories.controller.ts      — NEW
    dto/
      category-list-response.dto.ts  — NEW

  uploads/
    uploads.module.ts             — EXTEND (add controller + provider)
    uploads.service.ts            — NEW
    uploads.controller.ts         — NEW
    multer.config.ts              — NEW
    dto/
      image-upload-response.dto.ts   — NEW

  requests/
    requests.module.ts            — NO CHANGE in this story
    requests.service.ts           — NO CHANGE in this story

apps/backend/prisma/
  schema.prisma                   — MODIFY (add RequestImage model + relations)
  migrations/
    <timestamp>_add_request_images/  — NEW

packages/contracts/src/
  category.schemas.ts             — NEW
  index.ts                        — MODIFY (append export)

apps/frontend/src/
  features/
    request-create/               — ENTIRELY NEW
      types/
        create-request.types.ts
      api/
        categories.api.ts
        uploads.api.ts
      hooks/
        useCategories.ts
      components/
        CategoryTile.tsx
        StepCategorySelect.tsx
        ImageUploadTile.tsx
        StepRequestDetails.tsx
        StepProgressIndicator.tsx
      pages/
        CreateRequestPage.tsx
        CreateRequestPage.test.tsx
      components tests:
        StepCategorySelect.test.tsx
        ImageUploadTile.test.tsx
    customer-dashboard/           — NO CHANGE
    customer-auth/                — NO CHANGE

  App.tsx                         — MODIFY (add /requests/new route only)
```

### References

- Story requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Service Category Selection and Request Details]
- Epic 2 overview: [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Customer Request Creation & Dashboard]
- FR8, FR9, FR35: Category selection + request details + category management [Source: _bmad-output/planning-artifacts/epics.md#Functional Requirements]
- NFR13 (image validation), NFR15-17 (accessibility): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- UX-DR3 (focused steps, one dominant action per screen): [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements]
- UX-DR20 (category selection tile, image upload tile components): [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements]
- Journey 2 (Customer Create-Request Flow): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2: Customer Create-Request Flow]
- Component strategy (category selection tile, image upload tile): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- Customer visual language (warm neutral, navy, orange): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Customer Visual Language]
- Image upload/storage strategy (backend-mediated, multer for MVP): [Source: _bmad-output/planning-artifacts/architecture.md#Image Upload / Storage Strategy]
- Module responsibility — categories, uploads, requests: [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary]
- Route-local state for create-request progression: [Source: _bmad-output/planning-artifacts/architecture.md#State Strategy]
- Domain model (request_images): [Source: _bmad-output/planning-artifacts/architecture.md#Domain Model Recommendations]
- `request-create` feature boundary: [Source: _bmad-output/planning-artifacts/architecture.md#Feature Boundaries]
- ID convention (uuid not cuid): [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#Dev Agent Record → Dismissed (noise)]
- Auth barrel, PrismaModule global, TanStack Query v5, Vite proxy: [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#Dev Notes]
- 401 handling pattern: [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#401 Handling Pattern]
- E2E cleanup exact-email pattern (not substring): [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#Review Findings → Patch]
- Seed categories (Plumbing, Electrical, Carpentry, Painting, Cleaning, HVAC): [Source: apps/backend/prisma/seed.ts]
- Existing Prisma models (ServiceCategory, ServiceRequest, User): [Source: apps/backend/prisma/schema.prisma]
- App.tsx router structure: [Source: apps/frontend/src/App.tsx]
- Vite proxy configuration (/api → localhost:3000): [Source: apps/frontend/vite.config.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `prisma migrate dev` requires interactive TTY; used `prisma db push` to apply schema then created migration file manually and `prisma migrate resolve --applied` to record it in history.
- DTO properties needed `!` definite-assignment assertion (matches existing pattern in `customer-request-list-response.dto.ts`).
- `ImageUploadTile` uses internal `validationError` state for client-side errors; prop `uploadError` is for server-side upload errors.
- Test for "Back button on step 2" matched both the header button ("Back to dashboard") and the step button ("Back") via `/back/i` regex — fixed by filtering `allButtons` for exact text "Back".

### Completion Notes List

- Implemented `GET /categories` (JwtAuthGuard only, no role restriction) returning active categories alphabetically from DB.
- Implemented `POST /uploads/request-image` (CUSTOMER role only) with multer disk storage, file-type/size validation, and `RequestImage` DB record creation.
- Added `RequestImage` Prisma model with nullable `requestId` (linked in Story 2.4) and `UploadedImages` relation on User.
- Built full `request-create` frontend feature: 2-step form (category select → request details), TanStack Query v5 for categories, image upload with client-side validation and blob preview.
- All 12 new frontend tests pass; all 5 new backend unit tests pass; categories e2e test (2 cases) passes.
- TypeScript compiles clean on backend, frontend, and contracts. ESLint passes (pre-existing warning in AuthContext.tsx).
- Pre-existing failures not related to this story: `health.controller.spec.ts` (backend), `HealthCheck.test.tsx` and `LoginPage.test.tsx` (frontend).

### File List

**New files:**
- `apps/backend/prisma/migrations/20260513120000_add_request_images/migration.sql`
- `apps/backend/src/modules/categories/categories.service.ts`
- `apps/backend/src/modules/categories/categories.controller.ts`
- `apps/backend/src/modules/categories/dto/category-list-response.dto.ts`
- `apps/backend/src/modules/categories/categories.service.spec.ts`
- `apps/backend/src/modules/uploads/uploads.service.ts`
- `apps/backend/src/modules/uploads/uploads.controller.ts`
- `apps/backend/src/modules/uploads/multer.config.ts`
- `apps/backend/src/modules/uploads/dto/image-upload-response.dto.ts`
- `apps/backend/src/modules/uploads/uploads.service.spec.ts`
- `apps/backend/test/categories.e2e-spec.ts`
- `apps/backend/.gitignore`
- `packages/contracts/src/category.schemas.ts`
- `apps/frontend/src/features/request-create/types/create-request.types.ts`
- `apps/frontend/src/features/request-create/api/categories.api.ts`
- `apps/frontend/src/features/request-create/api/uploads.api.ts`
- `apps/frontend/src/features/request-create/hooks/useCategories.ts`
- `apps/frontend/src/features/request-create/components/CategoryTile.tsx`
- `apps/frontend/src/features/request-create/components/StepCategorySelect.tsx`
- `apps/frontend/src/features/request-create/components/ImageUploadTile.tsx`
- `apps/frontend/src/features/request-create/components/StepRequestDetails.tsx`
- `apps/frontend/src/features/request-create/components/StepProgressIndicator.tsx`
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx`
- `apps/frontend/src/features/request-create/components/StepCategorySelect.test.tsx`
- `apps/frontend/src/features/request-create/components/ImageUploadTile.test.tsx`
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.test.tsx`

**Modified files:**
- `apps/backend/prisma/schema.prisma` (added RequestImage model + relations)
- `apps/backend/src/modules/categories/categories.module.ts` (wired controller + service)
- `apps/backend/src/modules/uploads/uploads.module.ts` (wired controller + service)
- `apps/backend/src/main.ts` (added fs.mkdirSync for upload dir + import)
- `apps/backend/package.json` (added @types/multer devDependency)
- `packages/contracts/src/index.ts` (appended category.schemas export)
- `apps/frontend/src/App.tsx` (added /requests/new route)


## Change Log

- 2026-05-13: Implemented Story 2.2 — Added RequestImage model, GET /categories endpoint, POST /uploads/request-image endpoint with multer, category + image schemas to contracts, full request-create frontend feature (2-step form: category select + request details with optional image upload), and all backend/frontend tests.
