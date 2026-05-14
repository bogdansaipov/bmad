# Story 2.4: Pricing Estimate and Request Submission

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer ready to submit,
I want to review a simple price estimate and confirm my request in one final step,
So that I know roughly what to expect before committing.

## Acceptance Criteria

1. **Given** a customer has completed category, details, and location steps **When** they reach the estimate and review step **Then** the system calculates and displays an estimate using base fee + category fee + parts allowance **And** the estimate is presented clearly as an estimate, not a guaranteed total.

2. **Given** the estimate is displayed **When** the customer reviews the screen **Then** the pricing breakdown is compact and scannable — not a multi-screen pricing explanation **And** the customer can see a summary of what they are submitting before confirming.

3. **Given** the customer confirms submission **When** the request is submitted **Then** a service request is created and persisted durably with status `PENDING` **And** a pricing estimate snapshot is saved alongside the request record in `estimatedTotal` and `pricingExplanationSnapshot`.

4. **Given** the submission fails due to a temporary error **When** the customer taps confirm **Then** a recoverable error state is shown without losing the entered data **And** duplicate confirmed requests are prevented by disabling the button during in-flight submission.

5. **Given** the request is created successfully **When** the customer is returned to the dashboard **Then** the new request appears in the list with `PENDING` status **And** the full request history remains durable and recoverable.

## Tasks / Subtasks

- [x] Task 1 — Add `PricingEstimateSchema` and `CreateRequest` schemas to contracts (AC: 1, 3)
  - [x] Create `packages/contracts/src/pricing.schemas.ts`:
    ```typescript
    import { z } from 'zod';

    export const PricingEstimateSchema = z.object({
      categoryId: z.string(),
      baseFee: z.number(),
      categoryFee: z.number(),
      partsAllowance: z.number(),
      estimatedTotal: z.number(),
      disclaimer: z.string(),
    });

    export type PricingEstimate = z.infer<typeof PricingEstimateSchema>;
    ```
  - [x] Add to `packages/contracts/src/request.schemas.ts` (after existing exports):
    ```typescript
    export const CreateRequestBodySchema = z.object({
      categoryId: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      imageId: z.string().uuid().optional(),
      locationLat: z.number().min(-90).max(90).optional(),
      locationLng: z.number().min(-180).max(180).optional(),
    });
    export type CreateRequestBody = z.infer<typeof CreateRequestBodySchema>;

    export const CreateRequestResponseSchema = z.object({
      id: z.string(),
      status: RequestStatusEnum,
      estimatedTotal: z.number().nullable(),
      categoryName: z.string(),
      createdAt: z.string().datetime(),
    });
    export type CreateRequestResponse = z.infer<typeof CreateRequestResponseSchema>;
    ```
  - [x] Add `export * from './pricing.schemas';` to `packages/contracts/src/index.ts`

- [x] Task 2 — Build `PricingService` and `PricingController` in NestJS (AC: 1)
  - [x] Create `apps/backend/src/modules/pricing/pricing.service.ts`:
    ```typescript
    import { Injectable } from '@nestjs/common';

    export interface PricingEstimateResult {
      categoryId: string;
      baseFee: number;
      categoryFee: number;
      partsAllowance: number;
      estimatedTotal: number;
      disclaimer: string;
    }

    @Injectable()
    export class PricingService {
      private static readonly BASE_FEE = 30;
      private static readonly CATEGORY_FEE = 20;
      private static readonly PARTS_ALLOWANCE = 15;
      private static readonly DISCLAIMER =
        'This is an estimate. Final charges may vary based on actual work and materials.';

      calculateEstimate(categoryId: string): PricingEstimateResult {
        const baseFee = PricingService.BASE_FEE;
        const categoryFee = PricingService.CATEGORY_FEE;
        const partsAllowance = PricingService.PARTS_ALLOWANCE;
        return {
          categoryId,
          baseFee,
          categoryFee,
          partsAllowance,
          estimatedTotal: baseFee + categoryFee + partsAllowance,
          disclaimer: PricingService.DISCLAIMER,
        };
      }
    }
    ```
  - [x] Create `apps/backend/src/modules/pricing/dto/get-estimate-query.dto.ts`:
    ```typescript
    import { IsUUID } from 'class-validator';

    export class GetEstimateQueryDto {
      @IsUUID()
      categoryId!: string;
    }
    ```
  - [x] Create `apps/backend/src/modules/pricing/pricing.controller.ts`:
    ```typescript
    import { Controller, Get, Query, UseGuards } from '@nestjs/common';
    import { ApiOperation, ApiTags } from '@nestjs/swagger';
    import { JwtAuthGuard, RolesGuard, Roles } from '../auth';
    import { UserRole } from '@prisma/client';
    import { PricingService } from './pricing.service';
    import { GetEstimateQueryDto } from './dto/get-estimate-query.dto';

    @ApiTags('pricing')
    @Controller('pricing')
    @UseGuards(JwtAuthGuard, RolesGuard)
    export class PricingController {
      constructor(private readonly pricingService: PricingService) {}

      @Get('estimate')
      @Roles(UserRole.CUSTOMER)
      @ApiOperation({ summary: 'Get pricing estimate for a service category' })
      getEstimate(@Query() query: GetEstimateQueryDto) {
        return this.pricingService.calculateEstimate(query.categoryId);
      }
    }
    ```
  - [x] Update `apps/backend/src/modules/pricing/pricing.module.ts`:
    ```typescript
    import { Module } from '@nestjs/common';
    import { PricingController } from './pricing.controller';
    import { PricingService } from './pricing.service';

    @Module({
      controllers: [PricingController],
      providers: [PricingService],
      exports: [PricingService], // exported so RequestsModule can inject it
    })
    export class PricingModule {}
    ```

- [x] Task 3 — Add `POST /requests` endpoint to backend (AC: 3, 4, 5)
  - [x] Create `apps/backend/src/modules/requests/dto/create-request.dto.ts`:
    ```typescript
    import {
      IsString, IsUUID, IsOptional, IsNumber, MaxLength, MinLength, Min, Max,
    } from 'class-validator';
    import { Type } from 'class-transformer';
    import { ApiProperty } from '@nestjs/swagger';

    export class CreateRequestDto {
      @ApiProperty() @IsUUID() categoryId!: string;
      @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
      @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) description?: string;
      @ApiProperty({ required: false }) @IsOptional() @IsUUID() imageId?: string;
      @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) @Min(-90) @Max(90) locationLat?: number;
      @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) @Min(-180) @Max(180) locationLng?: number;
    }
    ```
  - [x] Create `apps/backend/src/modules/requests/dto/create-request-response.dto.ts`:
    ```typescript
    import { ApiProperty } from '@nestjs/swagger';
    import { RequestStatus } from '@prisma/client';

    export class CreateRequestResponseDto {
      @ApiProperty() id!: string;
      @ApiProperty({ enum: RequestStatus, enumName: 'RequestStatus' }) status!: RequestStatus;
      @ApiProperty({ nullable: true, type: Number }) estimatedTotal!: number | null;
      @ApiProperty() categoryName!: string;
      @ApiProperty() createdAt!: string;
    }
    ```
  - [x] Add `create` method to `apps/backend/src/modules/requests/requests.service.ts`:
    - Inject `PricingService` in constructor alongside `PrismaService`
    - Validate that `categoryId` exists and is active — throw `NotFoundException` if not
    - If `imageId` provided: validate it exists and `uploaderId === customerId` — throw `BadRequestException('Invalid image')` if not
    - Call `this.pricing.calculateEstimate(dto.categoryId)` for the estimate
    - `prisma.serviceRequest.create` with all fields; set `estimatedTotal` and `pricingExplanationSnapshot` from estimate
    - If `imageId` provided: `prisma.requestImage.update({ where: { id: dto.imageId }, data: { requestId: req.id } })`
    - Return `CreateRequestResponseDto` with `id`, `status`, `estimatedTotal` (number or null), `categoryName`, `createdAt` (ISO string)
    - Import: `BadRequestException, NotFoundException` from `@nestjs/common`; `PricingService` from `../pricing/pricing.service`
  - [x] Add `POST /requests` to `apps/backend/src/modules/requests/requests.controller.ts`:
    ```typescript
    @Post()
    @Roles(UserRole.CUSTOMER)
    @ApiOperation({ summary: 'Create a new service request' })
    @HttpCode(201)
    async create(
      @CurrentUser() user: AuthenticatedUser,
      @Body() body: CreateRequestDto,
    ): Promise<CreateRequestResponseDto> {
      return this.requestsService.create(user.userId, body);
    }
    ```
    Add imports: `Post, Body, HttpCode` from `@nestjs/common`; `CreateRequestDto`, `CreateRequestResponseDto` from `./dto/`
  - [x] Update `apps/backend/src/modules/requests/requests.module.ts` to import `PricingModule`:
    ```typescript
    @Module({
      imports: [PricingModule],
      controllers: [RequestsController],
      providers: [RequestsService],
    })
    ```
    Add: `import { PricingModule } from '../pricing/pricing.module';`

- [x] Task 4 — Frontend API layer and TanStack Query hook (AC: 1)
  - [x] Create `apps/frontend/src/features/request-create/api/requests.api.ts`:
    ```typescript
    import {
      PricingEstimateSchema, type PricingEstimate,
      CreateRequestResponseSchema, type CreateRequestResponse,
      type CreateRequestBody,
    } from '@handrix/contracts';
    import { getAccessToken, clearAccessToken } from '../../customer-auth/lib/auth-storage';
    import { AuthError } from './categories.api';

    export async function fetchPricingEstimate(categoryId: string): Promise<PricingEstimate> {
      const token = getAccessToken();
      if (!token) { clearAccessToken(); throw new AuthError(); }
      let res: Response;
      try {
        res = await fetch(`/api/pricing/estimate?categoryId=${encodeURIComponent(categoryId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
      }
      if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
      if (!res.ok) throw Object.assign(new Error('Failed to load pricing estimate.'), { status: res.status });
      const body = await res.json().catch(() => null);
      const parsed = PricingEstimateSchema.safeParse(body);
      if (!parsed.success) throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
      return parsed.data;
    }

    export async function submitCreateRequest(body: CreateRequestBody): Promise<CreateRequestResponse> {
      const token = getAccessToken();
      if (!token) { clearAccessToken(); throw new AuthError(); }
      let res: Response;
      try {
        res = await fetch('/api/requests', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
      }
      if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        const message = (b as { message?: string })?.message ?? 'Failed to submit request.';
        throw Object.assign(new Error(message), { status: res.status });
      }
      const b = await res.json().catch(() => null);
      const parsed = CreateRequestResponseSchema.safeParse(b);
      if (!parsed.success) throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
      return parsed.data;
    }
    ```
  - [x] Create `apps/frontend/src/features/request-create/hooks/usePricingEstimate.ts`:
    ```typescript
    import { useQuery } from '@tanstack/react-query';
    import { fetchPricingEstimate } from '../api/requests.api';

    export function usePricingEstimate(categoryId: string | null) {
      return useQuery({
        queryKey: ['pricing-estimate', categoryId],
        queryFn: () => fetchPricingEstimate(categoryId!),
        enabled: !!categoryId,
        staleTime: 5 * 60 * 1000, // estimates don't change often; avoid redundant fetches on step re-enter
      });
    }
    ```

- [x] Task 5 — Create `StepEstimateAndSubmit.tsx` — step 4 UI (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/request-create/components/StepEstimateAndSubmit.tsx`
  - [x] Props interface:
    ```typescript
    interface StepEstimateAndSubmitProps {
      formState: CreateRequestFormState;
      onBack: () => void;
      onSuccess: () => void;
    }
    ```
  - [x] Internal state: `isSubmitting: boolean`, `submitError: string | null`
  - [x] Use `usePricingEstimate(formState.categoryId)` for the estimate:
    - `isLoading`: show skeleton rows in the breakdown card
    - `isError`: show "Unable to load estimate. Please go back and try again." with no Submit button
    - `data`: render the breakdown
  - [x] Estimate breakdown card structure (white card, `shadow-sm rounded-xl p-4`):
    ```
    Heading: "Service estimate" text-sm font-semibold text-stone-500 uppercase tracking-wide
    Row: "Base service fee" ← $30.00 (right-aligned)
    Row: "Category fee"     ← $20.00
    Row: "Parts allowance"  ← $15.00
    Divider hr
    Row: "Estimated total"  ← $65.00  (bold, text-[#1A1A2E])
    Disclaimer: disclaimer text from API, text-xs text-stone-500 mt-2
    ```
    Format currency with: `$${value.toFixed(2)}`
  - [x] Request summary section (compact, text-sm text-stone-600):
    - Category: `formState.categoryName`
    - Title: `formState.title`
    - Image: "Attached" if `formState.imageId`, else "None"
    - Location: "Set" if `formState.locationLat !== undefined`, else "Not set"
  - [x] Submit button (`"Confirm & Submit Request"`):
    - Full-width, `bg-blue-700 text-white min-h-[44px] rounded-xl font-semibold`
    - `disabled` when: `isEstimateLoading || isEstimateError || isSubmitting || !data`
    - Shows "Submitting…" text while `isSubmitting`
  - [x] Back button: `border border-stone-300 text-[#1A1A2E] min-h-[44px]` calls `onBack()`; `disabled` when `isSubmitting`
  - [x] Error banner: if `submitError` is non-null, render `role="alert"` with `submitError` text above the buttons
  - [x] Heading: `"Review your request"` with `text-xl font-semibold text-[#1A1A2E]`
  - [x] Submit handler:
    ```typescript
    async function handleSubmit() {
      if (isSubmitting) return; // guard double-submit
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await submitCreateRequest({
          categoryId: formState.categoryId!,
          title: formState.title,
          description: formState.description || undefined,
          imageId: formState.imageId || undefined,
          locationLat: formState.locationLat,
          locationLng: formState.locationLng,
        });
        onSuccess();
      } catch {
        setSubmitError('Something went wrong. Your request was not submitted. Please try again.');
        setIsSubmitting(false);
      }
    }
    ```

- [x] Task 6 — Update `CreateRequestPage.tsx` to wire step 4 (AC: 3, 5)
  - [x] Update `create-request.types.ts`:
    - `CreateRequestStep` → `'category' | 'details' | 'location' | 'estimate'`
    - Remove the `// 'estimate' added by Story 2.4` comment placeholder (it's now real)
  - [x] Import `StepEstimateAndSubmit` in `CreateRequestPage.tsx`
  - [x] Change `handleNextFromLocation`:
    ```typescript
    function handleNextFromLocation(lat: number, lng: number) {
      setFormState((s) => ({ ...s, locationLat: lat, locationLng: lng }));
      setCurrentStep('estimate'); // ← was a deferred no-op comment in Story 2.3
    }
    ```
  - [x] Add `handleBackFromEstimate`: `setCurrentStep('location')`
  - [x] Add `handleSubmitSuccess`: `navigate('/dashboard/customer')`
  - [x] Fix `stepNumber` — remove unsafe cast, add 4th branch:
    ```typescript
    const stepNumber: 1 | 2 | 3 | 4 =
      currentStep === 'category' ? 1 :
      currentStep === 'details' ? 2 :
      currentStep === 'location' ? 3 :
      4;
    ```
  - [x] Update `StepProgressIndicator` prop — remove `as 1 | 2 | 3` cast:
    ```tsx
    <StepProgressIndicator currentStep={stepNumber} totalSteps={4} />
    ```
  - [x] Add step 4 render:
    ```tsx
    {currentStep === 'estimate' && (
      <StepEstimateAndSubmit
        formState={formState}
        onBack={handleBackFromEstimate}
        onSuccess={handleSubmitSuccess}
      />
    )}
    ```
  - [x] Wrap `StepEstimateAndSubmit` in `QueryClientProvider` if not already provided — check `main.tsx`/`App.tsx` to confirm `QueryClientProvider` is at app root (it already is from Story 2.1)

- [x] Task 7 — Backend unit and E2E tests (AC: 1, 3, 4, 5)
  - [x] Create `apps/backend/src/modules/pricing/pricing.service.spec.ts`:
    - Test: `calculateEstimate` returns correct baseFee (30), categoryFee (20), partsAllowance (15)
    - Test: `estimatedTotal` equals `baseFee + categoryFee + partsAllowance` (65)
    - Test: `disclaimer` is a non-empty string
    - Test: returned `categoryId` matches input
  - [x] Add tests to `apps/backend/src/modules/requests/requests.service.spec.ts` for `create` method:
    - Mock `prisma.serviceCategory.findUnique`, `prisma.requestImage.findUnique`, `prisma.serviceRequest.create`, `prisma.requestImage.update`
    - Mock `PricingService` with `calculateEstimate` returning fixed estimate
    - Test: valid body creates request with `PENDING` status
    - Test: `NotFoundException` thrown when categoryId not found
    - Test: `NotFoundException` thrown when category is not active
    - Test: `BadRequestException` thrown when imageId belongs to different uploader
    - Test: image is linked (`requestImage.update` called) when imageId provided
    - Test: image not linked when imageId is absent
  - [x] Add E2E tests to `apps/backend/test/requests.e2e-spec.ts` (under new `describe('POST /requests')`):
    - `POST /requests` no auth → 401
    - `POST /requests` HANDYMAN token → 403
    - `POST /requests` CUSTOMER valid body (title + categoryId from seeded data) → 201 with `{ id, status: 'PENDING', estimatedTotal: 65, categoryName, createdAt }`
    - `POST /requests` missing required `title` → 400
    - `POST /requests` invalid UUID for `categoryId` → 400
    - **Note for E2E**: needs a seeded `ServiceCategory`. Add a category via direct Prisma insert in `beforeAll`, delete in `afterAll`
  - [x] Add E2E test to `apps/backend/test/categories.e2e-spec.ts` or a new `pricing.e2e-spec.ts`:
    - `GET /pricing/estimate?categoryId=<valid-uuid>` CUSTOMER → 200 with estimate breakdown
    - `GET /pricing/estimate?categoryId=<valid-uuid>` HANDYMAN → 403
    - `GET /pricing/estimate` (missing query) → 400

- [x] Task 8 — Frontend tests (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/request-create/components/StepEstimateAndSubmit.test.tsx`:
    ```typescript
    vi.mock('../hooks/usePricingEstimate');
    vi.mock('../api/requests.api');
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
      return { ...actual, useNavigate: () => mockNavigate };
    });
    ```
    - Test: renders heading "Review your request"
    - Test: shows loading state (skeleton or "Loading…") when `usePricingEstimate` returns `isLoading: true`
    - Test: displays `baseFee`, `categoryFee`, `partsAllowance`, `estimatedTotal`, and disclaimer when data available
    - Test: Submit button disabled when `isLoading: true`
    - Test: Submit button disabled when `isSubmitting` (after click, before response)
    - Test: Submit button enabled when estimate loaded; click calls `submitCreateRequest` with correct payload
    - Test: `onSuccess` prop called after `submitCreateRequest` resolves
    - Test: error banner (`role="alert"`) shown and button re-enabled when `submitCreateRequest` rejects
    - Test: `onBack` prop called when Back button clicked
    - Test: error state shown and Submit hidden when `usePricingEstimate` returns `isError: true`
  - [x] Update `apps/frontend/src/features/request-create/pages/CreateRequestPage.test.tsx`:
    - Add `vi.mock('../api/requests.api')` alongside existing mocks
    - Add test: after confirming location (mock geolocation success + clicking "Confirm Location"), heading "Review your request" is visible
    - Confirm existing step-1, step-2, step-3 tests still pass (no regressions)

### Review Findings

_(populated after code review)_

## Dev Notes

### What This Story Changes vs What Already Exists

**The critical deferred wires from Story 2.3:**
- `handleNextFromLocation` in `CreateRequestPage.tsx` has comment `// Story 2.4 advances to 'estimate' step here` — change `setCurrentStep` call to `'estimate'`
- `CreateRequestStep` union has comment `// 'estimate' added by Story 2.4` — add `| 'estimate'` literal
- `CreateRequestFormState` has comment `// Step 4 (Story 2.4 will extend)` — no fields needed (step 4 reads from existing state; no new form state required)
- `StepProgressIndicator` prop has `as 1 | 2 | 3` cast — Story 2.3 review deferred this to 2.4; fix it now

**No Prisma migration needed.** `ServiceRequest.estimatedTotal` (Decimal?) and `pricingExplanationSnapshot` (Json?) already exist in the schema (added in Story 2.1). Location fields (`locationLat`, `locationLng`) also pre-exist.

**`PricingModule` is a stub.** `apps/backend/src/modules/pricing/pricing.module.ts` currently has an empty `@Module({})` with no service, controller, or exports. Story 2.4 builds it out completely.

**`POST /requests` does NOT trigger matching.** Matching (Story 3.x) creates `job_offer_visibility` records and routes the request to eligible handymen. Story 2.4 only creates the request as `PENDING` — no matching logic in scope.

**Image linking pattern.** Images are uploaded in Step 2 (Story 2.2) with `requestId: null`. When the request is created, `RequestsService.create` calls `prisma.requestImage.update({ where: { id: imageId }, data: { requestId: newRequestId } })` to link them. This is safe because images are validated by `uploaderId === customerId` before linking.

**Pricing is server-authoritative.** The frontend fetches an estimate via `GET /api/pricing/estimate?categoryId=X` for display. The backend re-computes the same estimate during `POST /api/requests` and stores it. The re-computation is deterministic (same inputs → same result) so there is no stale-estimate risk.

### Pricing Calculation (MVP Hardcoded)

```
Base service fee:   $30
Category fee:       $20  (flat for all categories in MVP)
Parts allowance:    $15
───────────────────
Estimated total:    $65

Disclaimer: "This is an estimate. Final charges may vary based on actual work and materials."
```

These are constants in `PricingService` — no database lookup needed. Future stories can replace with per-category pricing from the DB without changing the service interface.

### Auth Barrel Import Pattern (Backend)

Always import guards, decorators, and types from the auth barrel `'../auth'`, not from sub-paths:
```typescript
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, AuthenticatedUser } from '../auth';
```
See `apps/backend/src/modules/requests/requests.controller.ts` for an existing example of this barrel usage.

### TanStack Query v5 Patterns (Frontend)

Carry-forward from Stories 2.1/2.2:

```typescript
// READ: useQuery
const { data, isLoading, isError } = useQuery({
  queryKey: ['pricing-estimate', categoryId],
  queryFn: () => fetchPricingEstimate(categoryId!),
  enabled: !!categoryId,
});

// WRITE: useMutation (if preferred over local state)
const mutation = useMutation({ mutationFn: submitCreateRequest });
mutation.mutate(body, { onSuccess: onSuccess, onError: handleError });
```

`useQuery` and `useMutation` both imported from `@tanstack/react-query`. The `QueryClientProvider` is already at the app root (wired in Story 2.1) — no additional setup needed.

### API Fetch Pattern (Frontend)

Follow the pattern in `apps/frontend/src/features/request-create/api/uploads.api.ts` exactly:
1. Read token from `getAccessToken()` — if null, throw `AuthError`
2. `try { res = await fetch(...) } catch { throw NetworkError }`
3. Check `401` → clear token + throw `AuthError`
4. Check `!res.ok` → throw with `res.status`
5. Parse response with Zod schema via `safeParse`
6. Throw on parse failure

`AuthError` is exported from `./categories.api` — re-import it in `requests.api.ts` rather than redefining it.

### `CreateRequestBody` JSON Shape for `POST /api/requests`

```json
{
  "categoryId": "uuid",
  "title": "Fix my sink",
  "description": "The cold tap drips constantly",
  "imageId": "uuid-or-omit",
  "locationLat": 41.2995,
  "locationLng": 69.2401
}
```

`description`, `imageId`, `locationLat`, `locationLng` are all optional. `categoryId` and `title` are required (class-validator will 400 if missing).

### NestJS DTO and Validation Pattern

Existing DTOs in `apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts` use `class-validator` / `@nestjs/swagger` decorators. Follow that pattern exactly. `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` is wired globally in `main.ts` — no need to add it per-controller.

For numeric query params, `@Type(() => Number)` from `class-transformer` is needed to coerce the string-encoded query value to a number (global `transform: true` does this automatically when combined with `@Type`).

### `RequestsService.create` Implementation Notes

```typescript
async create(customerId: string, dto: CreateRequestDto): Promise<CreateRequestResponseDto> {
  // 1. Validate category
  const category = await this.prisma.serviceCategory.findUnique({
    where: { id: dto.categoryId },
  });
  if (!category || !category.isActive) {
    throw new NotFoundException('Category not found or inactive');
  }

  // 2. Validate image ownership (if provided)
  if (dto.imageId) {
    const image = await this.prisma.requestImage.findUnique({ where: { id: dto.imageId } });
    if (!image || image.uploaderId !== customerId) {
      throw new BadRequestException('Invalid image');
    }
  }

  // 3. Compute pricing estimate
  const estimate = this.pricing.calculateEstimate(dto.categoryId);

  // 4. Create the ServiceRequest
  const req = await this.prisma.serviceRequest.create({
    data: {
      customerId,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description ?? null,
      locationLat: dto.locationLat ?? null,
      locationLng: dto.locationLng ?? null,
      estimatedTotal: estimate.estimatedTotal,
      pricingExplanationSnapshot: estimate as unknown as Prisma.InputJsonValue,
      status: RequestStatus.PENDING,
    },
    include: { category: { select: { name: true } } },
  });

  // 5. Link image to request (if provided)
  if (dto.imageId) {
    await this.prisma.requestImage.update({
      where: { id: dto.imageId },
      data: { requestId: req.id },
    });
  }

  // 6. Build and return response
  const response = new CreateRequestResponseDto();
  response.id = req.id;
  response.status = req.status;
  response.estimatedTotal = estimate.estimatedTotal;
  response.categoryName = req.category.name;
  response.createdAt = req.createdAt.toISOString();
  return response;
}
```

Import at top of `requests.service.ts`:
- `BadRequestException, Injectable, NotFoundException` from `@nestjs/common`
- `Prisma, RequestStatus` from `@prisma/client` (already imported for `RequestStatus`)
- `PricingService` from `../pricing/pricing.service`
- Constructor: inject `private readonly pricing: PricingService` alongside existing `prisma`

### Customer Visual Language (Same as 2.1 / 2.2 / 2.3)

```
Background:  warm ivory   bg-[#FAF8F5] / stone-50
Text:        deep navy     #1A1A2E
Primary CTA: slate-blue    bg-blue-700 text-white
Cards/tiles: white + shadow-sm rounded-xl
Back button: border border-stone-300 text-[#1A1A2E]
```

Step heading style: `text-xl font-semibold text-[#1A1A2E]` — same as `StepRequestDetails` ("Describe your request") and `StepLocationCapture` ("Confirm your location").

All buttons: `min-h-[44px]` touch target.

### UX Requirements (UX-DR12)

"Pricing presentation must stay simple, compact, and estimate-based." — Do NOT build a multi-screen pricing explanation. The breakdown card and disclaimer line are sufficient. No additional pricing documentation, footnotes, or help text beyond the disclaimer.

### Preventing Double-Submit

Use a boolean `isSubmitting` state to guard the submit handler and disable the button. The guard at `if (isSubmitting) return;` prevents rapid double-clicks from sending two requests. No idempotency key or backend deduplication is required for MVP.

### maplibre-gl Mock Required in `CreateRequestPage.test.tsx`

The existing `CreateRequestPage.test.tsx` already has `vi.mock('maplibre-gl', ...)` because step 3 uses `StepLocationCapture` → `MapLocationPicker`. This mock is still required and must not be removed. New tests that advance to step 4 must also mock `usePricingEstimate` so the component does not make real fetch calls.

### Deferred Items from Story 2.3 Review — Addressed by This Story

- `StepProgressIndicator` typed `currentStep as 1 | 2 | 3` while `totalSteps={4}`: **fixed in Task 6** by replacing the ternary with a 4-branch version and removing the unsafe cast
- `handleNextFromLocation` deferred no-op comment: **wired in Task 6**
- `CreateRequestStep` union missing `'estimate'`: **added in Task 6**

### Accessibility Requirements

- Estimate breakdown card: each row is a labeled pair — use `<dl>` / `<dt>` / `<dd>` or `<div class="flex justify-between">` with visible text labels for both the label and value (do not use numbers only)
- Submit button: `disabled` attribute (not just `aria-disabled`) when loading or submitting
- Error banner: `role="alert"` so screen readers announce it immediately
- Loading state: a visually accessible "Loading estimate…" text or `aria-busy="true"` on the card
- All buttons: `min-h-[44px]`

### Out of Scope (Explicitly Deferred)

- Matching / offer creation — Epic 3 (request created as `PENDING` only)
- Retry on duplicate submission (idempotency keys) — MVP relies on button disable
- `pricing_estimates` as a separate database table — schema already uses `estimatedTotal` and `pricingExplanationSnapshot` inline on `ServiceRequest`; the separate entity is a future concern
- Per-category pricing from DB — MVP uses flat hardcoded fees; future story adds DB-backed pricing tiers
- Customer tracking view for the submitted request — Epic 4
- Reverse geocoding (address display) — deferred from Story 2.3

### Project Structure — New and Modified Files

```
apps/backend/
  src/modules/pricing/
    pricing.module.ts             — MODIFY (add controller, service, exports)
    pricing.service.ts            — NEW
    pricing.controller.ts         — NEW
    dto/
      get-estimate-query.dto.ts   — NEW
  src/modules/requests/
    requests.service.ts           — MODIFY (add create method, inject PricingService)
    requests.controller.ts        — MODIFY (add POST /requests)
    requests.module.ts            — MODIFY (import PricingModule)
    dto/
      create-request.dto.ts       — NEW
      create-request-response.dto.ts — NEW

packages/contracts/
  src/
    pricing.schemas.ts            — NEW
    request.schemas.ts            — MODIFY (add CreateRequestBody, CreateRequestResponse)
    index.ts                      — MODIFY (add pricing.schemas export)

apps/frontend/
  src/features/request-create/
    api/
      requests.api.ts             — NEW (fetchPricingEstimate, submitCreateRequest)
    hooks/
      usePricingEstimate.ts       — NEW
    components/
      StepEstimateAndSubmit.tsx   — NEW
      StepEstimateAndSubmit.test.tsx — NEW
    types/
      create-request.types.ts     — MODIFY (add 'estimate' step)
    pages/
      CreateRequestPage.tsx       — MODIFY (wire step 4, fix stepNumber ternary)
      CreateRequestPage.test.tsx  — MODIFY (add step 4 transition test, mock requests.api)
```

### Testing Standards (Carry-Forward from Stories 2.1/2.2)

- **Unit tests (backend):** Vitest / Jest with mocked `PrismaService` — do NOT use a real database
- **E2E tests (backend):** Supertest against full `AppModule` with a real test database
- **Frontend tests:** Vitest + React Testing Library; mock module-level dependencies with `vi.mock`
- **No `__mocks__/` folder** — use `vi.mock()` inline in each test file (Vitest resolves `__mocks__/` differently from Jest)
- **maplibre-gl mock** is required in any test file that imports `StepLocationCapture` or `MapLocationPicker` (directly or transitively)

### References

- Story 2.4 requirements and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- FR13 (simple price estimate before submission), FR14 (submit once required fields complete): [Source: _bmad-output/planning-artifacts/epics.md#Epic 2]
- FR38 (estimate: base + category + distance/parts), FR39 (estimate, not guaranteed total): [Source: _bmad-output/planning-artifacts/epics.md#FR Coverage Map]
- UX-DR12 (pricing simple, compact, estimate-based): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Design Requirements]
- Journey 2 step 5 (review estimate and submit): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2]
- `PricingModule` architecture seam: [Source: _bmad-output/planning-artifacts/architecture.md#Module Boundaries]
- `pricing_estimates` entity design: [Source: _bmad-output/planning-artifacts/architecture.md#Domain Model]
- `ServiceRequest.estimatedTotal` and `pricingExplanationSnapshot` (already in schema): [Source: apps/backend/prisma/schema.prisma#ServiceRequest]
- `CreateRequestStep` union + deferred 'estimate' literal: [Source: apps/frontend/src/features/request-create/types/create-request.types.ts]
- `handleNextFromLocation` deferred no-op: [Source: apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx:42-45]
- `stepNumber as 1 | 2 | 3` cast bug deferred from 2.3: [Source: _bmad-output/implementation-artifacts/2-3-location-capture-with-geolocation-and-map-pin.md#Review Findings]
- Auth barrel import pattern: [Source: apps/backend/src/modules/requests/requests.controller.ts]
- API fetch pattern: [Source: apps/frontend/src/features/request-create/api/uploads.api.ts]
- TanStack Query v5 pattern: [Source: _bmad-output/implementation-artifacts/2-1-customer-dashboard-with-request-list.md#Dev Notes]
- maplibre-gl mock pattern for Vitest: [Source: _bmad-output/implementation-artifacts/2-3-location-capture-with-geolocation-and-map-pin.md#Dev Notes]
- Customer visual language (warm ivory, navy, blue-700): [Source: _bmad-output/implementation-artifacts/2-3-location-capture-with-geolocation-and-map-pin.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- `pnpm install`
- `pnpm --filter @handrix/contracts build`
- `pnpm --filter handrix-backend exec jest --runInBand src/modules/pricing/pricing.service.spec.ts src/modules/requests/requests.service.spec.ts`
- `pnpm --filter handrix-frontend exec vitest run src/features/request-create/components/StepEstimateAndSubmit.test.tsx src/features/request-create/pages/CreateRequestPage.test.tsx`
- `pnpm --filter handrix-backend exec tsc --noEmit`
- `pnpm --filter handrix-frontend exec tsc --noEmit`
- `pnpm --filter handrix-backend exec eslint "{src,test}/**/*.ts"`
- `pnpm --filter handrix-frontend exec eslint .`
- `docker run -d --rm --name handrix-e2e-postgres -e POSTGRES_USER=handrix -e POSTGRES_PASSWORD=handrix -e POSTGRES_DB=handrix_test -p 5434:5432 postgres:16-alpine`
- `DATABASE_URL=postgresql://handrix:handrix@localhost:5434/handrix_test?schema=public JWT_SECRET=12345678901234567890123456789012 pnpm --filter handrix-backend exec prisma migrate deploy`
- `DATABASE_URL=postgresql://handrix:handrix@localhost:5434/handrix_test?schema=public JWT_SECRET=12345678901234567890123456789012 NODE_ENV=test pnpm --filter handrix-backend exec jest --config ./test/jest-e2e.json --runInBand test/requests.e2e-spec.ts test/pricing.e2e-spec.ts`

### Completion Notes List

- Implemented backend pricing estimation and customer request submission, including persisted `estimatedTotal` and `pricingExplanationSnapshot` values.
- Added the estimate/review submit step to the customer create-request flow and routed successful submission back to the customer dashboard.
- Added backend unit coverage, backend e2e coverage, and frontend component/page tests for the new pricing and submission flow.
- Restored the missing `apps/backend` uploads implementation so the active backend app now typechecks and supports the existing image-upload dependency path used by request creation.
- Validation results: contracts build passed, backend unit tests passed, frontend tests passed, backend/frontend typechecks passed, backend lint passed, backend e2e passed against a disposable Docker Postgres instance.
- Frontend lint completed with pre-existing warnings in `AuthContext.tsx` and `MapLocationPicker.tsx`; no new lint errors were introduced by Story 2.4.

### File List

- `_bmad-output/implementation-artifacts/2-4-pricing-estimate-and-request-submission.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/backend/.gitignore`
- `apps/backend/src/modules/pricing/dto/get-estimate-query.dto.ts`
- `apps/backend/src/modules/pricing/pricing.controller.ts`
- `apps/backend/src/modules/pricing/pricing.module.ts`
- `apps/backend/src/modules/pricing/pricing.service.ts`
- `apps/backend/src/modules/pricing/pricing.service.spec.ts`
- `apps/backend/src/modules/requests/dto/create-request.dto.ts`
- `apps/backend/src/modules/requests/dto/create-request-response.dto.ts`
- `apps/backend/src/modules/requests/requests.controller.ts`
- `apps/backend/src/modules/requests/requests.module.ts`
- `apps/backend/src/modules/requests/requests.service.ts`
- `apps/backend/src/modules/requests/requests.service.spec.ts`
- `apps/backend/src/modules/uploads/dto/image-upload-response.dto.ts`
- `apps/backend/src/modules/uploads/multer.config.ts`
- `apps/backend/src/modules/uploads/uploads.controller.ts`
- `apps/backend/src/modules/uploads/uploads.service.ts`
- `apps/backend/test/pricing.e2e-spec.ts`
- `apps/backend/test/requests.e2e-spec.ts`
- `apps/frontend/src/features/request-create/api/requests.api.ts`
- `apps/frontend/src/features/request-create/components/StepEstimateAndSubmit.test.tsx`
- `apps/frontend/src/features/request-create/components/StepEstimateAndSubmit.tsx`
- `apps/frontend/src/features/request-create/hooks/usePricingEstimate.ts`
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.test.tsx`
- `apps/frontend/src/features/request-create/pages/CreateRequestPage.tsx`
- `apps/frontend/src/features/request-create/types/create-request.types.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/pricing.schemas.ts`
- `packages/contracts/src/request.schemas.ts`

## Change Log

- 2026-05-13: Story 2.4 created — pricing estimate display and request submission, completing the 4-step create-request flow.
- 2026-05-14: Implemented pricing APIs, customer request submission, estimate-step UI, backend/frontend tests, and the missing `apps/backend` uploads module required by the active app.
