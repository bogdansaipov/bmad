# Story 3.1: Handyman Profile Setup with Categories and Service Radius

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered handyman,
I want to set my supported service categories and service area after registering,
So that the platform knows which jobs to show me and I only receive relevant work.

## Acceptance Criteria

1. **Given** a handyman logs in for the first time **When** they land on the handyman dashboard **Then** they are prompted to complete their profile by selecting supported categories and service radius **And** they cannot receive matching jobs until at least one category and a service radius are set.

2. **Given** a handyman is on the profile setup screen **When** they select their supported categories **Then** only the platform's configured service categories are available for selection **And** their category preferences are persisted as `handyman_category_preferences` records.

3. **Given** a handyman sets their service radius **When** the value is saved **Then** the radius is stored on the handyman profile and used as the matching boundary for incoming requests **And** the handyman can update their categories and radius from their profile settings later.

4. **Given** a handyman profile is saved **When** the backend evaluates future rating submissions **Then** the handyman profile includes `average_rating_cache` and `ratings_count_cache` fields (nullable) to support future rating aggregation without requiring a schema change.

## Tasks / Subtasks

- [ ] Task 1 — Add durable handyman preference persistence in Prisma (AC: 2, 3, 4)
  - [ ] Update `apps/backend/prisma/schema.prisma` to add a `HandymanCategoryPreference` model backed by `handyman_category_preferences` with:
    - `id String @id @default(uuid())`
    - `handymanProfileId String @map("handyman_profile_id")`
    - `categoryId String @map("category_id")`
    - `createdAt DateTime @default(now()) @map("created_at")`
    - relation to `HandymanProfile`
    - relation to `ServiceCategory`
    - unique constraint on `[handymanProfileId, categoryId]`
    - indexes on `handymanProfileId` and `categoryId`
  - [ ] Add relation arrays:
    - `HandymanProfile.categoryPreferences HandymanCategoryPreference[]`
    - `ServiceCategory.handymanPreferences HandymanCategoryPreference[]`
  - [ ] Keep `HandymanProfile.averageRatingCache` and `ratingsCountCache` exactly as nullable cache fields already present in the schema; no redesign is needed for AC 4.
  - [ ] Create a new Prisma migration for the new join table only. Do not remove or rename existing `handyman_profiles.service_radius_km`.

- [ ] Task 2 — Define shared contracts and DTOs for handyman profile reads and writes (AC: 1, 2, 3)
  - [ ] Create `packages/contracts/src/handyman.schemas.ts` with:
    - `HandymanCategoryPreferenceSchema`
    - `HandymanProfileSchema`
    - `UpdateHandymanProfileBodySchema`
  - [ ] Recommended schema shape:
    ```typescript
    import { z } from 'zod';
    import { ServiceCategorySchema } from './category.schemas';
    
    export const HandymanCategoryPreferenceSchema = z.object({
      categoryId: z.string().uuid(),
      categoryName: z.string(),
    });
    
    export const HandymanProfileSchema = z.object({
      displayName: z.string(),
      availabilityStatus: z.string(),
      serviceRadiusKm: z.number().nullable(),
      averageRatingCache: z.number().nullable(),
      ratingsCountCache: z.number().int().nullable(),
      categoryPreferences: z.array(HandymanCategoryPreferenceSchema),
      isProfileComplete: z.boolean(),
    });
    
    export const UpdateHandymanProfileBodySchema = z.object({
      categoryIds: z.array(z.string().uuid()).min(1),
      serviceRadiusKm: z.number().positive().max(100),
    });
    ```
  - [ ] Export the new schemas from `packages/contracts/src/index.ts`.
  - [ ] Create backend DTOs in `apps/backend/src/modules/users/dto/`:
    - `update-handyman-profile.dto.ts`
    - `handyman-profile-response.dto.ts`
  - [ ] Use `class-validator` decorators that match the Zod contract:
    - `categoryIds`: array, UUID items, at least 1 item
    - `serviceRadiusKm`: number, `> 0`, bounded to a sane MVP max such as `100`

- [ ] Task 3 — Build handyman profile endpoints in the currently empty `UsersModule` (AC: 1, 2, 3, 4)
  - [ ] Create `apps/backend/src/modules/users/users.service.ts`.
  - [ ] Create `apps/backend/src/modules/users/users.controller.ts`.
  - [ ] Update `apps/backend/src/modules/users/users.module.ts` to register controller and service.
  - [ ] Add `GET /users/me/handyman-profile`:
    - guarded by `JwtAuthGuard` and `RolesGuard`
    - restricted to `UserRole.HANDYMAN`
    - returns the current handyman profile plus selected category preferences
    - computes `isProfileComplete = serviceRadiusKm !== null && categoryPreferences.length > 0`
  - [ ] Add `PUT /users/me/handyman-profile`:
    - guarded and role-restricted the same way
    - validates every submitted `categoryId` exists and is active
    - rejects duplicate category IDs before writing
    - updates `serviceRadiusKm`
    - replaces preference rows transactionally so the saved set matches the submitted set exactly
    - returns the normalized `HandymanProfileResponseDto`
  - [ ] Reuse the existing handyman profile row created during registration in `AuthService.register`; do not create a second profile record.
  - [ ] Suggested write flow in `UsersService.updateHandymanProfile(...)`:
    1. load current handyman profile by `userId`
    2. load active categories matching submitted IDs
    3. fail with `BadRequestException` if any IDs are invalid or duplicated
    4. execute a transaction that updates `service_radius_km`, deletes old preference rows, and inserts the new rows
    5. reload the full profile with category relations for response mapping
  - [ ] Response should include category names so the frontend does not need to join IDs to labels itself after save.

- [ ] Task 4 — Replace the handyman dashboard stub with a real profile-completion flow (AC: 1, 2, 3)
  - [ ] Create `apps/frontend/src/features/handyman-dashboard/api/handyman-profile.api.ts` with:
    - `fetchHandymanProfile()`
    - `updateHandymanProfile(body)`
  - [ ] Use the same authenticated fetch pattern as:
    - `apps/frontend/src/features/request-create/api/categories.api.ts`
    - `apps/frontend/src/features/request-create/api/uploads.api.ts`
  - [ ] Reuse `GET /api/categories` for the selectable category list. Do not create a second categories endpoint for handymen.
  - [ ] Create `apps/frontend/src/features/handyman-dashboard/hooks/useHandymanProfile.ts`.
  - [ ] Create a reusable form component such as `apps/frontend/src/features/handyman-dashboard/components/HandymanProfileForm.tsx` that supports both first-run setup and later settings edits.
  - [ ] First-run dashboard behavior:
    - load current profile and categories
    - if incomplete, show a blocking setup card/screen instead of the jobs dashboard
    - require at least one category chip selected and a radius value before save
    - disable any “continue” behavior until the save succeeds
  - [ ] Saved-state dashboard behavior:
    - show a lightweight “profile ready” dashboard shell
    - make it clear jobs will appear here in Story 3.2
    - do not implement the jobs feed or matching logic yet
  - [ ] Minimum form content:
    - heading: `Complete your work profile`
    - helper copy explaining jobs depend on categories and radius
    - category chip group using active categories only
    - numeric radius control row labeled in kilometers
    - primary CTA: `Save profile`
    - inline error banner with `role="alert"`

- [ ] Task 5 — Add handyman settings access so categories and radius can be edited later (AC: 3)
  - [ ] Create `apps/frontend/src/features/handyman-dashboard/components/HandymanNav.tsx` with exactly 4 items:
    - `Dashboard`
    - `Jobs`
    - `History`
    - `Settings`
  - [ ] Add a `HandymanSettingsPage` under `apps/frontend/src/features/handyman-dashboard/pages/` that reuses `HandymanProfileForm`.
  - [ ] The settings screen should prefill the saved categories and `serviceRadiusKm`.
  - [ ] `Jobs` and `History` may remain placeholder routes in this story, but they must not imply jobs are available before profile completion.
  - [ ] Keep handyman navigation and settings mobile-first and distinct from the customer shell.

- [ ] Task 6 — Wire routes and replace the inline stub in `App.tsx` (AC: 1, 3)
  - [ ] Remove the inline `HandymanDashboardStub` from `apps/frontend/src/App.tsx`.
  - [ ] Add real route components for:
    - `/dashboard/handyman`
    - `/handyman/jobs`
    - `/handyman/history`
    - `/handyman/settings`
  - [ ] Keep `RequireAuth requiredRole="HANDYMAN"` protection on all handyman routes.
  - [ ] Preserve existing customer routes and role-based root redirect logic.

- [ ] Task 7 — Backend and frontend tests (AC: 1, 2, 3, 4)
  - [ ] Backend unit tests:
    - add `apps/backend/src/modules/users/users.service.spec.ts`
    - test incomplete profile maps `isProfileComplete: false`
    - test valid update persists radius and replaces category preferences
    - test duplicate category IDs reject with `BadRequestException`
    - test unknown or inactive category IDs reject with `BadRequestException`
    - test cached rating fields remain nullable and untouched by profile update
  - [ ] Backend e2e tests:
    - create `apps/backend/test/users.e2e-spec.ts`
    - `GET /users/me/handyman-profile` no auth → `401`
    - `GET /users/me/handyman-profile` customer token → `403`
    - `GET /users/me/handyman-profile` fresh handyman token → `200` with empty preferences and `isProfileComplete: false`
    - `PUT /users/me/handyman-profile` valid handyman payload → `200` and persisted category/radius data
    - `PUT /users/me/handyman-profile` duplicate categories → `400`
    - `PUT /users/me/handyman-profile` inactive or unknown category → `400`
  - [ ] Frontend tests:
    - add `apps/frontend/src/features/handyman-dashboard/pages/HandymanDashboardPage.test.tsx`
    - add `apps/frontend/src/features/handyman-dashboard/pages/HandymanSettingsPage.test.tsx`
    - test incomplete profile renders setup flow
    - test save disabled until at least one category and radius exist
    - test successful save transitions dashboard out of blocking setup state
    - test nav renders exactly 4 items
    - update any route-level tests in `apps/frontend/src/App.tsx` coverage if needed so handyman login still lands on `/dashboard/handyman`

### Review Findings

_(populated after code review)_

## Dev Notes

### What Already Exists and Must Be Reused

**Registration already creates the base handyman profile row.** `apps/backend/src/modules/auth/auth.service.ts` creates a `handymanProfile` record during handyman signup, so Story 3.1 should extend that record instead of inventing a second onboarding entity.

**The schema already has the radius and rating cache columns.** `serviceRadiusKm`, `averageRatingCache`, and `ratingsCountCache` already exist on `HandymanProfile` in `apps/backend/prisma/schema.prisma`. The real schema gap is the missing `handyman_category_preferences` join table.

**`UsersModule` is currently empty.** `apps/backend/src/modules/users/users.module.ts` has no controller or service, which makes it the right place to add profile read/update APIs for this story.

**The handyman frontend is mostly scaffolding.** `apps/frontend/src/features/handyman-dashboard`, `handyman-jobs`, and `handyman-auth` are present as folders but have no implementation yet. `apps/frontend/src/App.tsx` still renders an inline `HandymanDashboardStub`, so Story 3.1 is the first real handyman UI slice.

**Configured categories already exist and should be reused.** `GET /categories` in `apps/backend/src/modules/categories/categories.controller.ts` returns active categories for any authenticated user. The handyman setup form should consume that existing endpoint instead of adding a handyman-only category API.

### Persistence Guardrails

Persist supported categories as rows in `handyman_category_preferences`, not as a JSON array on `handyman_profiles`. The architecture and epics both expect relational storage so matching can filter by category cleanly in Story 3.2.

Recommended Prisma model:

```prisma
model HandymanCategoryPreference {
  id                String           @id @default(uuid())
  handymanProfileId String           @map("handyman_profile_id")
  categoryId        String           @map("category_id")
  createdAt         DateTime         @default(now()) @map("created_at")

  handymanProfile   HandymanProfile  @relation(fields: [handymanProfileId], references: [id], onDelete: Cascade)
  category          ServiceCategory  @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([handymanProfileId, categoryId])
  @@index([handymanProfileId])
  @@index([categoryId])
  @@map("handyman_category_preferences")
}
```

Using a replace-all transaction for preferences is acceptable here because the form edits the full set at once and the profile is owned by one handyman.

### API and Validation Patterns

Follow existing NestJS patterns:

- import guards and decorators from the auth barrel `../auth`
- keep DTO validation in `class-validator`
- rely on the global `ValidationPipe` already configured in `apps/backend/src/main.ts`
- return class-based DTOs from controllers

Suggested controller surface:

```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get('me/handyman-profile')
  @Roles(UserRole.HANDYMAN)
  getMyHandymanProfile(@CurrentUser() user: AuthenticatedUser) { ... }

  @Put('me/handyman-profile')
  @Roles(UserRole.HANDYMAN)
  updateMyHandymanProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateHandymanProfileDto,
  ) { ... }
}
```

### Frontend Data-Fetching Patterns

Follow the authenticated fetch flow already established in `categories.api.ts` and `uploads.api.ts`:

1. read token with `getAccessToken()`
2. clear token and throw `AuthError` if missing or `401`
3. throw stable error messages for non-OK responses
4. parse JSON through shared Zod schemas

For server state, stay on TanStack Query v5, which is already in the repo and already used for customer features.

### UX Direction for Handyman Mode

The UX spec calls for handyman surfaces to share the Handrix brand while feeling distinct from customer mode. For this story:

- favor dark navy / charcoal surfaces with teal-green accents
- keep the setup flow tight and task-oriented
- avoid admin-heavy profile forms
- make the main message about unlocking relevant jobs, not building a rich profile

Components the story should introduce or start:

- preference chip group
- service radius control row
- handyman nav with 4 items

Components explicitly out of scope for this story:

- match preview cards populated with real jobs
- online/offline toggle behavior
- accept / decline controls
- active-job status rails

### Scope Boundaries

**Do not implement matching in Story 3.1.** A saved profile only prepares the matching inputs. Story 3.2 handles job feed filtering, and Story 3.3 handles offer accept/decline plus concurrency protection.

**Do not redesign customer flows.** This story should add handyman profile capability without regressing the existing customer dashboard or request-creation flow.

**Do not add ratings logic now.** The nullable cache fields only need to survive untouched so later rating aggregation can write into them.

### Project Structure — New and Modified Files

```text
apps/backend/
  prisma/
    schema.prisma                              — MODIFY
    migrations/<timestamp>_add_handyman_preferences/
      migration.sql                            — NEW
  src/modules/users/
    users.module.ts                            — MODIFY
    users.controller.ts                        — NEW
    users.service.ts                           — NEW
    dto/
      handyman-profile-response.dto.ts         — NEW
      update-handyman-profile.dto.ts           — NEW

packages/contracts/
  src/
    handyman.schemas.ts                        — NEW
    index.ts                                   — MODIFY

apps/frontend/
  src/features/handyman-dashboard/
    api/
      handyman-profile.api.ts                  — NEW
    hooks/
      useHandymanProfile.ts                    — NEW
    components/
      HandymanNav.tsx                          — NEW
      HandymanProfileForm.tsx                  — NEW
    pages/
      HandymanDashboardPage.tsx                — NEW
      HandymanSettingsPage.tsx                 — NEW
      HandymanDashboardPage.test.tsx           — NEW
      HandymanSettingsPage.test.tsx            — NEW
  src/features/handyman-jobs/
    pages/
      HandymanJobsPage.tsx                     — NEW
  src/features/request-history/
    pages/
      HandymanHistoryPage.tsx                  — NEW
  src/App.tsx                                  — MODIFY

apps/backend/test/
  users.e2e-spec.ts                            — NEW

apps/backend/src/modules/users/
  users.service.spec.ts                        — NEW
```

### Testing Standards

- Backend unit tests: Jest with mocked `PrismaService`
- Backend e2e tests: Supertest against `AppModule`
- Frontend tests: Vitest + React Testing Library
- Keep role-guard coverage explicit: handyman-only endpoints must reject customer tokens
- Prefer route-level tests for the new handyman shell because `App.tsx` is currently where the stub is anchored

### Git Intelligence Summary

Recent work in this repo has followed a contract-first pattern with implementation-backed tests:

- `bf47c7c create story for 2.4`
- `a4cb1a6 polish UI`
- `ccb2349 finish epic 1`

Carry that pattern forward here: define shared contracts first, build guarded backend endpoints second, then wire the frontend and tests around them.

### References

- Story 3.1 AC and Epic 3 context: [Source: _bmad-output/planning-artifacts/epics.md#Epic 3]
- FR15, FR17, FR36, FR37, FR40: [Source: _bmad-output/planning-artifacts/epics.md#FR Coverage Map]
- UX-DR2, UX-DR10, UX-DR17, UX-DR21: [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements]
- Handyman component direction and service radius control row: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- Relational entity guidance for `handyman_category_preferences`: [Source: _bmad-output/planning-artifacts/architecture.md#Domain Model Recommendations]
- `users` module responsibility: [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary]
- Existing signup-created handyman profile: [Source: apps/backend/src/modules/auth/auth.service.ts]
- Existing `HandymanProfile` columns: [Source: apps/backend/prisma/schema.prisma]
- Current handyman dashboard stub and route wiring: [Source: apps/frontend/src/App.tsx]
- Existing categories endpoint for authenticated users: [Source: apps/backend/src/modules/categories/categories.controller.ts]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-05-14: Story 3.1 created — handyman profile setup, category preference persistence, and service-radius onboarding.
