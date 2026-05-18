# Story 4.4: Post-Completion Customer Rating

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer whose job has been completed,
I want to leave a quick 1-5 star rating for the handyman with optional feedback,
so that I can close the loop on my experience without it feeling like a review form.

## Acceptance Criteria

1. **Given** a request is marked `complete` **When** the customer opens that request or returns to the dashboard **Then** a lightweight rating prompt appears — a compact bottom sheet or modal with a 1-5 star input **And** the prompt is clearly optional and dismissable.

2. **Given** the customer submits a rating **When** the rating is saved **Then** a `request_ratings` record is created with the star score, optional short feedback, customer ID, handyman ID, and request ID **And** the rating is idempotent — submitting again for the same request is rejected at the backend.

3. **Given** the customer chooses to skip rating **When** they dismiss the prompt **Then** the request remains in `complete` state without any blocking behavior **And** the rating prompt can be reopened from the completed request card if the customer wants to rate later.

4. **Given** a rating has already been submitted for a completed request **When** the customer views that request **Then** the submitted rating is shown with no option to re-rate **And** the request card indicates the rating has been submitted.

5. **Given** a customer views a completed request that is unrated **When** they open the request card **Then** the unrated state is clearly indicated so the customer knows they can still rate **And** this indication does not clutter the card for rated or non-complete requests.

## Tasks / Subtasks

- [x] Task 1 — Add `RequestRating` Prisma model and migration (AC: 2)
  - [x] Add to `apps/backend/prisma/schema.prisma` before the final `@@map` line of the last model (after `HandymanLocationUpdate`):
    ```prisma
    model RequestRating {
      id            String   @id @default(uuid())
      requestId     String   @unique @map("request_id")
      customerId    String   @map("customer_id")
      handymanId    String   @map("handyman_id")
      stars         Int
      shortFeedback String?  @map("short_feedback")
      createdAt     DateTime @default(now()) @map("created_at")

      request  ServiceRequest @relation(fields: [requestId], references: [id])
      customer User           @relation("CustomerRatings", fields: [customerId], references: [id])
      handyman User           @relation("HandymanRatingsReceived", fields: [handymanId], references: [id])

      @@map("request_ratings")
    }
    ```
  - [x] Add back-relations to existing models in schema.prisma:
    - On `ServiceRequest` model: add `rating RequestRating?`
    - On `User` model: add `ratingsGiven RequestRating[] @relation("CustomerRatings")` and `ratingsReceived RequestRating[] @relation("HandymanRatingsReceived")`
  - [x] Run `pnpm prisma migrate dev --name add_request_ratings` from `apps/backend/`
  - [x] Verify `prisma generate` succeeds and `RequestRating` appears in Prisma client types

- [x] Task 2 — Add rating schemas to contracts (AC: 2, 4, 5)
  - [x] Create `packages/contracts/src/rating.schemas.ts`:
    ```ts
    import { z } from 'zod';

    export const SubmitRatingBodySchema = z.object({
      requestId: z.string().uuid(),
      stars: z.number().int().min(1).max(5),
      shortFeedback: z.string().max(500).optional(),
    });
    export type SubmitRatingBody = z.infer<typeof SubmitRatingBodySchema>;

    export const SubmitRatingResponseSchema = z.object({
      id: z.string(),
      requestId: z.string(),
      stars: z.number(),
      shortFeedback: z.string().nullable(),
      createdAt: z.string().datetime(),
    });
    export type SubmitRatingResponse = z.infer<typeof SubmitRatingResponseSchema>;

    export const RatingStatusResponseSchema = z.object({
      requestId: z.string(),
      hasRating: z.boolean(),
      stars: z.number().nullable(),
      shortFeedback: z.string().nullable(),
    });
    export type RatingStatusResponse = z.infer<typeof RatingStatusResponseSchema>;
    ```
  - [x] Add `export * from './rating.schemas';` to `packages/contracts/src/index.ts`
  - [x] Update `ServiceRequestListItemSchema` in `packages/contracts/src/request.schemas.ts` — add `hasRating: z.boolean()` field:
    ```ts
    export const ServiceRequestListItemSchema = z.object({
      id: z.string(),
      title: z.string(),
      status: RequestStatusEnum,
      estimatedTotal: z.number().nullable(),
      categoryName: z.string(),
      assignedHandymanDisplayName: z.string().nullable(),
      hasRating: z.boolean(),
      createdAt: z.string().datetime(),
    });
    ```

- [x] Task 3 — Backend: `RatingsService` (AC: 2, 4)
  - [x] Create `apps/backend/src/modules/ratings/ratings.service.ts`:
    ```ts
    import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
    import { PrismaService } from '../prisma/prisma.service';

    @Injectable()
    export class RatingsService {
      constructor(private readonly prisma: PrismaService) {}

      async submitRating(
        customerId: string,
        requestId: string,
        stars: number,
        shortFeedback: string | undefined,
      ): Promise<{ id: string; requestId: string; stars: number; shortFeedback: string | null; createdAt: string }> {
        const request = await this.prisma.serviceRequest.findUnique({
          where: { id: requestId },
          select: { id: true, customerId: true, assignedHandymanId: true, status: true },
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.customerId !== customerId) throw new ForbiddenException('Access denied');
        if (request.status !== 'COMPLETE') {
          throw new BadRequestException('Rating can only be submitted for completed requests');
        }
        if (!request.assignedHandymanId) {
          throw new BadRequestException('No handyman assigned to this request');
        }

        const existing = await this.prisma.requestRating.findUnique({
          where: { requestId },
        });
        if (existing) {
          throw new BadRequestException('Rating already submitted for this request');
        }

        const rating = await this.prisma.requestRating.create({
          data: {
            requestId,
            customerId,
            handymanId: request.assignedHandymanId,
            stars,
            shortFeedback: shortFeedback ?? null,
          },
        });

        return {
          id: rating.id,
          requestId: rating.requestId,
          stars: rating.stars,
          shortFeedback: rating.shortFeedback,
          createdAt: rating.createdAt.toISOString(),
        };
      }

      async getRatingStatus(
        customerId: string,
        requestId: string,
      ): Promise<{ requestId: string; hasRating: boolean; stars: number | null; shortFeedback: string | null }> {
        const request = await this.prisma.serviceRequest.findUnique({
          where: { id: requestId },
          select: { customerId: true },
        });
        if (!request) throw new NotFoundException('Request not found');
        if (request.customerId !== customerId) throw new ForbiddenException('Access denied');

        const rating = await this.prisma.requestRating.findUnique({
          where: { requestId },
          select: { stars: true, shortFeedback: true },
        });

        return {
          requestId,
          hasRating: !!rating,
          stars: rating?.stars ?? null,
          shortFeedback: rating?.shortFeedback ?? null,
        };
      }
    }
    ```

- [x] Task 4 — Backend: `RatingsController` + update `RatingsModule` (AC: 2, 4)
  - [x] Create `apps/backend/src/modules/ratings/dto/submit-rating.dto.ts`:
    ```ts
    import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

    export class SubmitRatingDto {
      @IsUUID()
      requestId!: string;

      @IsInt()
      @Min(1)
      @Max(5)
      stars!: number;

      @IsOptional()
      @IsString()
      @MaxLength(500)
      shortFeedback?: string;
    }
    ```
  - [x] Create `apps/backend/src/modules/ratings/ratings.controller.ts`:
    ```ts
    import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
    import { ApiOperation, ApiTags } from '@nestjs/swagger';
    import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
    import { RolesGuard } from '../../auth/guards/roles.guard';
    import { Roles } from '../../auth/decorators/roles.decorator';
    import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
    import { UserRole } from '../../auth/enums/user-role.enum';
    import { RatingsService } from './ratings.service';
    import { SubmitRatingDto } from './dto/submit-rating.dto';

    @ApiTags('ratings')
    @Controller('ratings')
    @UseGuards(JwtAuthGuard, RolesGuard)
    export class RatingsController {
      constructor(private readonly ratingsService: RatingsService) {}

      @Post()
      @Roles(UserRole.CUSTOMER)
      @ApiOperation({ summary: 'Submit a rating for a completed request' })
      submitRating(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: SubmitRatingDto,
      ) {
        return this.ratingsService.submitRating(
          user.userId,
          body.requestId,
          body.stars,
          body.shortFeedback,
        );
      }

      @Get('by-request/:requestId')
      @Roles(UserRole.CUSTOMER)
      @ApiOperation({ summary: 'Get rating status for a specific request' })
      getRatingStatus(
        @CurrentUser() user: AuthenticatedUser,
        @Param('requestId') requestId: string,
      ) {
        return this.ratingsService.getRatingStatus(user.userId, requestId);
      }
    }
    ```
  - [x] Replace `apps/backend/src/modules/ratings/ratings.module.ts`:
    ```ts
    import { Module } from '@nestjs/common';
    import { PrismaModule } from '../prisma/prisma.module';
    import { RatingsController } from './ratings.controller';
    import { RatingsService } from './ratings.service';

    @Module({
      imports: [PrismaModule],
      controllers: [RatingsController],
      providers: [RatingsService],
      exports: [RatingsService],
    })
    export class RatingsModule {}
    ```
  - [x] Verify auth decorators/guards import paths by checking `apps/backend/src/modules/matching/matching.controller.ts` for the exact import paths used — use the same pattern

- [x] Task 5 — Backend: Update `RequestsService` and DTO to include `hasRating` (AC: 5)
  - [x] Update `apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts`:
    - Add to `ServiceRequestListItemDto`: `@ApiProperty({ type: Boolean }) hasRating!: boolean;`
  - [x] Update `apps/backend/src/modules/requests/requests.service.ts`:
    - Import `RatingsModule` is NOT needed here — use Prisma directly
    - Update `includeRelations` const to also fetch rating existence:
      ```ts
      const includeRelations = {
        category: { select: { name: true } },
        assignedHandyman: {
          include: { handymanProfile: { select: { displayName: true } } },
        },
        rating: { select: { id: true } },
      } as const;
      ```
    - Update `mapToDto` function to populate `hasRating`:
      ```ts
      function mapToDto(r: RequestWithRelations): ServiceRequestListItemDto {
        const dto = new ServiceRequestListItemDto();
        dto.id = r.id;
        dto.title = r.title;
        dto.status = r.status;
        dto.estimatedTotal = r.estimatedTotal != null ? r.estimatedTotal.toNumber() : null;
        dto.categoryName = r.category.name;
        dto.assignedHandymanDisplayName = r.assignedHandyman?.handymanProfile?.displayName ?? null;
        dto.hasRating = r.rating != null;
        dto.createdAt = r.createdAt.toISOString();
        return dto;
      }
      ```
    - **Note**: `rating` relation is now included. The `RequestWithRelations` type will update automatically when `includeRelations` changes — TypeScript infers it.

- [x] Task 6 — Frontend: ratings API layer (AC: 2, 4)
  - [x] Create `apps/frontend/src/features/request-rating/api/ratings.api.ts`:
    ```ts
    import {
      RatingStatusResponse,
      RatingStatusResponseSchema,
      SubmitRatingResponse,
      SubmitRatingResponseSchema,
    } from '@handrix/contracts';
    import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
    import { AuthError } from '../../customer-dashboard/api/requests.api';

    function requireToken(): string {
      const token = getAccessToken();
      if (!token) { clearAccessToken(); throw new AuthError(); }
      return token;
    }

    async function jsonRequest(input: RequestInfo, init: RequestInit): Promise<Response> {
      try {
        return await fetch(input, init);
      } catch {
        throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0 });
      }
    }

    export async function submitRating(
      requestId: string,
      stars: number,
      shortFeedback?: string,
    ): Promise<SubmitRatingResponse> {
      const token = requireToken();
      const res = await jsonRequest('/api/ratings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, stars, shortFeedback }),
      });
      if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
      if (!res.ok) throw Object.assign(new Error('Failed to submit rating.'), { status: res.status });
      const body = await res.json().catch(() => null);
      const parsed = SubmitRatingResponseSchema.safeParse(body);
      if (!parsed.success) throw Object.assign(new Error('Unexpected response from server.'), { status: res.status });
      return parsed.data;
    }

    export async function fetchRatingStatus(requestId: string): Promise<RatingStatusResponse> {
      const token = requireToken();
      const res = await jsonRequest(`/api/ratings/by-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
      if (!res.ok) throw Object.assign(new Error('Failed to load rating status.'), { status: res.status });
      const body = await res.json().catch(() => null);
      const parsed = RatingStatusResponseSchema.safeParse(body);
      if (!parsed.success) throw Object.assign(new Error('Unexpected response from server.'), { status: res.status });
      return parsed.data;
    }
    ```

- [x] Task 7 — Frontend: TanStack Query hooks (AC: 2, 4)
  - [x] Create `apps/frontend/src/features/request-rating/hooks/useRatingStatus.ts`:
    ```ts
    import { useQuery } from '@tanstack/react-query';
    import { fetchRatingStatus } from '../api/ratings.api';

    export function useRatingStatus(requestId: string, enabled: boolean) {
      return useQuery({
        queryKey: ['rating-status', requestId],
        queryFn: () => fetchRatingStatus(requestId),
        enabled: !!requestId && enabled,
        staleTime: 60_000,
      });
    }
    ```
  - [x] Create `apps/frontend/src/features/request-rating/hooks/useSubmitRating.ts`:
    ```ts
    import { useMutation, useQueryClient } from '@tanstack/react-query';
    import { useAuth } from '../../../customer-auth/context/AuthContext';
    import { AuthError } from '../../customer-dashboard/api/requests.api';
    import { submitRating } from '../api/ratings.api';

    export function useSubmitRating(requestId: string) {
      const queryClient = useQueryClient();
      const { logout } = useAuth();

      return useMutation({
        mutationFn: ({ stars, shortFeedback }: { stars: number; shortFeedback?: string }) =>
          submitRating(requestId, stars, shortFeedback),
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['rating-status', requestId] });
          void queryClient.invalidateQueries({ queryKey: ['customerRequests'] });
        },
        onError: (err: unknown) => {
          if (err instanceof AuthError) logout();
        },
      });
    }
    ```

- [x] Task 8 — Frontend: `RatingPromptSheet` component (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/request-rating/components/RatingPromptSheet.tsx`:
    ```tsx
    import { useState } from 'react';
    import { RatingStatusResponse } from '@handrix/contracts';

    interface Props {
      requestId: string;
      ratingStatus: RatingStatusResponse | undefined;
      isLoadingStatus: boolean;
      onSubmit: (stars: number, shortFeedback?: string) => void;
      onDismiss: () => void;
      isSubmitting: boolean;
    }

    export function RatingPromptSheet({
      ratingStatus,
      isLoadingStatus,
      onSubmit,
      onDismiss,
      isSubmitting,
    }: Props) {
      const [selectedStars, setSelectedStars] = useState<number>(0);
      const [feedback, setFeedback] = useState('');

      if (isLoadingStatus) return null;

      // Already rated: show submitted rating, no re-rate option
      if (ratingStatus?.hasRating) {
        return (
          <div className="rating-prompt-sheet rating-prompt-sheet--rated" role="region" aria-label="Your rating">
            <p className="rating-prompt-sheet__rated-label">You rated this job</p>
            <div className="rating-prompt-sheet__stars" aria-label={`${ratingStatus.stars} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`rating-star${s <= (ratingStatus.stars ?? 0) ? ' rating-star--filled' : ''}`}
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </div>
            {ratingStatus.shortFeedback && (
              <p className="rating-prompt-sheet__feedback-display">{ratingStatus.shortFeedback}</p>
            )}
          </div>
        );
      }

      // Not yet rated: show prompt
      return (
        <div className="rating-prompt-sheet" role="dialog" aria-label="Rate your experience" aria-modal="false">
          <div className="rating-prompt-sheet__header">
            <p className="rating-prompt-sheet__title">How did the job go?</p>
            <button
              className="rating-prompt-sheet__dismiss"
              onClick={onDismiss}
              aria-label="Dismiss rating prompt"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              ✕
            </button>
          </div>

          <div className="rating-prompt-sheet__stars" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                className={`rating-star rating-star--btn${s <= selectedStars ? ' rating-star--filled' : ''}`}
                onClick={() => setSelectedStars(s)}
                aria-label={`${s} star${s !== 1 ? 's' : ''}`}
                aria-pressed={s <= selectedStars}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            className="rating-prompt-sheet__feedback"
            placeholder="Optional feedback (max 500 characters)"
            maxLength={500}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            aria-label="Optional feedback"
            rows={2}
          />

          <button
            className="btn-primary rating-prompt-sheet__submit"
            onClick={() => onSubmit(selectedStars, feedback || undefined)}
            disabled={selectedStars === 0 || isSubmitting}
            style={{ minHeight: 44 }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Rating'}
          </button>
        </div>
      );
    }
    ```

- [x] Task 9 — Frontend: Integrate `RatingPromptSheet` into `RequestTrackingPage` (AC: 1, 3, 4)
  - [x] Update `apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx`:
    - Add imports:
      ```tsx
      import { useState } from 'react';  // already imported
      import { RatingPromptSheet } from '../../request-rating/components/RatingPromptSheet';
      import { useRatingStatus } from '../../request-rating/hooks/useRatingStatus';
      import { useSubmitRating } from '../../request-rating/hooks/useSubmitRating';
      ```
    - Add state and hooks inside `RequestTrackingPage()` after the existing hooks:
      ```tsx
      const isComplete = data?.status === 'COMPLETE';
      const [ratingDismissed, setRatingDismissed] = useState(false);
      const ratingStatusQuery = useRatingStatus(requestId ?? '', isComplete);
      const submitRatingMutation = useSubmitRating(requestId ?? '');
      const showRatingPrompt = isComplete && !ratingDismissed;
      ```
    - Inside the `{data && (...)}` block, after `<TrackingBottomSheet .../>`, add:
      ```tsx
      {showRatingPrompt && (
        <RatingPromptSheet
          requestId={requestId ?? ''}
          ratingStatus={ratingStatusQuery.data}
          isLoadingStatus={ratingStatusQuery.isLoading}
          onSubmit={(stars, shortFeedback) => submitRatingMutation.mutate({ stars, shortFeedback })}
          onDismiss={() => setRatingDismissed(true)}
          isSubmitting={submitRatingMutation.isPending}
        />
      )}
      ```

- [x] Task 10 — Frontend: Update `RequestCard` to show unrated-complete indicator (AC: 5)
  - [x] Update `apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`:
    - The `ServiceRequestListItem` will now include `hasRating: boolean` after the contracts update
    - Inside the card content block, after the meta section, add:
      ```tsx
      {item.status === 'COMPLETE' && !item.hasRating && (
        <div className="request-card__rate-cta" aria-label="Rate this job">
          <span className="request-card__rate-cta-text">Rate this job ★</span>
        </div>
      )}
      ```
    - Update the non-active branch to link to tracking for COMPLETE requests (so customer can rate):
      ```tsx
      if (item.status === 'COMPLETE') {
        return (
          <Link
            to={`/requests/${item.id}/tracking`}
            className="request-card request-card--complete request-card__link"
            style={{ minHeight: 44, display: 'block', textDecoration: 'none', color: 'inherit' }}
            aria-label={`View details for ${item.title}${!item.hasRating ? ' — rate this job' : ''}`}
          >
            {cardContent}
          </Link>
        );
      }
      ```
    - Keep the existing non-link `<div>` for REJECTED status

- [x] Task 11 — Add CSS for rating components (AC: 1, 3, 4, 5)
  - [x] In `apps/frontend/src/index.css`, add at the end (following same comment-block structure):
    - `.rating-prompt-sheet` — fixed or sticky overlay on tracking page, overlaid above bottom sheet
    - `.rating-prompt-sheet--rated` — read-only state styling
    - `.rating-prompt-sheet__stars` — flex row of star buttons
    - `.rating-star` — star element; `.rating-star--filled` — filled state (color, not just outline)
    - `.rating-star--btn` — reset button styles, large tap target
    - `.rating-prompt-sheet__feedback` — textarea
    - `.rating-prompt-sheet__submit` — inherits `.btn-primary`
    - `.rating-prompt-sheet__dismiss` — small dismiss button top-right
    - `.request-card__rate-cta` — compact "Rate this job" call-to-action within the card

## Dev Notes

### No `RequestRating` Model in Schema — Migration Required

The `RequestRating` model does NOT exist in `schema.prisma`. Task 1 must be completed first — it adds the model and runs `prisma migrate dev`. Without the migration, Prisma client won't have `requestRating` methods and the backend will fail to compile.

**Important**: After adding `rating RequestRating?` back-relation to `ServiceRequest`, TypeScript's inferred `RequestWithRelations` in `requests.service.ts` will automatically include the `rating` field when `includeRelations` is updated (Task 5) — no manual type declaration needed.

### `RatingsModule` Is a Skeleton

`apps/backend/src/modules/ratings/ratings.module.ts` currently:
```ts
import { Module } from '@nestjs/common';
@Module({})
export class RatingsModule {}
```
Task 4 replaces this. `RatingsModule` is already imported in `app.module.ts` — no change needed there.

### Auth Guard Import Paths — Copy from MatchingController

The exact import paths for `JwtAuthGuard`, `RolesGuard`, `Roles`, `CurrentUser`, `AuthenticatedUser`, and `UserRole` must match those used in `apps/backend/src/modules/matching/matching.controller.ts`. Check that file before writing the ratings controller. Do NOT guess the paths.

### `PrismaService` — `requestRating` Model Access

After the migration, `this.prisma.requestRating` (camelCase) is how the Prisma client accesses the `RequestRating` model. The `@map("request_ratings")` directive affects the DB table name only.

### Idempotency: Unique Constraint on `requestId`

The `@unique` on `requestId` in the `RequestRating` model (Task 1) + the explicit `findUnique` check in `submitRating` (Task 3) provides two layers:
1. Application-level: `existing` check returns 400 immediately
2. DB-level: unique constraint prevents race conditions if two requests arrive simultaneously

Architecture says (NFR9): "Rating submission should be idempotent enough to prevent a completed request from being recorded with more than one customer rating."

### `hasRating` in the Dashboard List Response

The customer dashboard calls `GET /api/requests` which uses `findAllForCustomer`. Adding `rating: { select: { id: true } }` to `includeRelations` causes Prisma to LEFT JOIN the `request_ratings` table, returning `null` when no rating exists. `r.rating != null` maps cleanly to `hasRating: boolean`.

This ensures `RequestCard` gets `hasRating` without a separate API call per card.

### Rating Status Only Fetched for COMPLETE Requests

`useRatingStatus(requestId, enabled)` passes `enabled: isComplete` as the second arg. This avoids a wasteful API call while the job is still in progress. The `enabled` flag is passed down from `RequestTrackingPage` which checks `data?.status === 'COMPLETE'`.

### Dismiss State Is Component-Local

`ratingDismissed` is local `useState` in `RequestTrackingPage`. If the customer dismisses the prompt and navigates away, returning to the tracking page will show the prompt again (as long as the job is unrated). This matches AC3: "the rating prompt can be reopened from the completed request card if the customer wants to rate later." The card navigates back to tracking, which shows the prompt again.

### `COMPLETE` Card Links to Tracking View

Currently `RequestCard` renders completed requests as non-interactive `<div>`. Task 10 adds a `Link` for `COMPLETE` status cards so the customer can navigate back to the tracking/detail view to rate. This is how AC3's "reopened from the completed request card" works — there's no separate route.

### After Rating: Invalidate Both Queries

`useSubmitRating` invalidates:
- `['rating-status', requestId]` — so the prompt switches from "rate now" to "you rated this" in-place
- `['customer-requests']` — so the dashboard card's `hasRating` updates on next render

The TanStack Query key for the customer requests list is `['customerRequests']` (confirmed: `apps/frontend/src/features/customer-dashboard/hooks/useCustomerRequests.ts:9`).

### `shortFeedback` — Optional, `undefined` vs Empty String

In `SubmitRatingBodySchema`, `shortFeedback` is `z.string().max(500).optional()`. In the API call, pass `feedback || undefined` — empty string becomes `undefined`, which is omitted from the JSON body, and the backend maps it as `shortFeedback ?? null`. Do NOT send empty string.

### Anti-Patterns from Previous Stories — Must Not Repeat

- **`logout()` in render**: call in `useEffect` only — `useSubmitRating.onError` calls `logout()` inside mutation callback, which runs outside render, so this is correct
- **TanStack Query object syntax**: `useQuery({ queryKey, queryFn })` — NOT positional args
- **`Decimal.toNumber()`**: `estimatedTotal` on ServiceRequest is Prisma `Decimal` — already handled by existing `mapToDto` pattern, no change needed
- **Zod schema validation on API responses**: always use `.safeParse()` and handle failure

### Scope Boundary — Do NOT Build in This Story

- **Handyman-visible rating**: the handyman does not see their own ratings in MVP (Epic 5 scope)
- **Rating aggregation on handyman profile** (`averageRatingCache`, `ratingsCountCache`): schema fields exist but no computation in this story
- **Rating in `RequestTrackingResponse`**: the tracking endpoint does not return rating data — the rating prompt fetches it separately via `GET /ratings/by-request/:requestId`
- **Rating history or list**: no "all my past ratings" view in MVP
- **Post-submission redirect**: after rating, the tracking page stays — no navigation away
- **Desktop split-pane layout** (story 5.4)

### Project Structure

```
packages/contracts/src/
  rating.schemas.ts                                   ← new
  index.ts                                            ← modify: add export
  request.schemas.ts                                  ← modify: add hasRating to ServiceRequestListItemSchema

apps/backend/prisma/
  schema.prisma                                       ← modify: add RequestRating model + back-relations
  migrations/YYYYMMDD_add_request_ratings/            ← new: generated by migrate dev

apps/backend/src/modules/ratings/
  ratings.module.ts                                   ← replace: wire controller, service, PrismaModule
  ratings.service.ts                                  ← new
  ratings.controller.ts                               ← new
  dto/submit-rating.dto.ts                            ← new

apps/backend/src/modules/requests/
  requests.service.ts                                 ← modify: add rating to includeRelations, hasRating in mapToDto
  dto/customer-request-list-response.dto.ts           ← modify: add hasRating field

apps/frontend/src/features/
  request-rating/
    api/ratings.api.ts                                ← new
    hooks/useRatingStatus.ts                          ← new
    hooks/useSubmitRating.ts                          ← new
    components/RatingPromptSheet.tsx                  ← new
  request-tracking/pages/RequestTrackingPage.tsx      ← modify: add rating prompt
  customer-dashboard/components/RequestCard.tsx       ← modify: unrated-complete indicator + link
  index.css                                           ← modify: add rating CSS
```

### References

- Story definition and AC: [Source: `_bmad-output/planning-artifacts/epics.md#Story-44`]
- FR31: "After request marked complete, customer can submit 1-5 star rating"
- FR32: "Optional short text feedback with rating"
- FR33: "Each completed request can be rated only once"
- FR34: "Submitting or skipping does not block completion"
- NFR9: "Rating submission idempotent — max one rating per request"
- UX-DR13: "Lightweight 1-5 star + optional short feedback" [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`]
- UX-DR14: "Expose rating at most once, indicate when already submitted"
- Architecture — `request_ratings` entity fields: [Source: `_bmad-output/planning-artifacts/architecture.md#Entity-Notes`]
- Architecture — `ratings` module responsibility: [Source: `_bmad-output/planning-artifacts/architecture.md#Module-Responsibility-Summary`]
- Architecture — `request-rating` frontend feature area: [Source: `_bmad-output/planning-artifacts/architecture.md#Feature-Boundaries`]
- Architecture — rating eligibility backend-owned: [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend-Responsibilities`]
- `ServiceRequestListItemDto` (to add hasRating): [`apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts`]
- `requests.service.ts` (includeRelations to update): [`apps/backend/src/modules/requests/requests.service.ts`]
- `RequestCard.tsx` (to update): [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`]
- `RequestTrackingPage.tsx` (to update): [`apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx`]
- Auth imports (copy pattern from): [`apps/backend/src/modules/matching/matching.controller.ts`]
- API call pattern: copy `requireToken()` + `jsonRequest()` from [`apps/frontend/src/features/handyman-active-job/api/active-job.api.ts`]
- `AuthError` import: [`apps/frontend/src/features/customer-dashboard/api/requests.api.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Review Findings

- [ ] [Review][Patch] Unhandled Prisma P2002 on concurrent duplicate submit — two simultaneous requests both pass `findUnique` check, second hits DB unique constraint and surfaces as unhandled 500 instead of 400; add try/catch around `prisma.requestRating.create` and map P2002 → `BadRequestException` [`apps/backend/src/modules/ratings/ratings.service.ts:36`]
- [ ] [Review][Patch] `@Roles(UserRole.CUSTOMER)` missing on `GET /ratings/by-request/:requestId` — handyman JWT can call endpoint and receive rating data for any known requestId [`apps/backend/src/modules/ratings/ratings.controller.ts:30`]
- [ ] [Review][Patch] `ratingStatusQuery` error state silently renders interactive form — when `fetchRatingStatus` fails, `isLoading` is false and `data` is `undefined`, so `RatingPromptSheet` renders the submit form for a possibly already-rated request; add error guard in `RequestTrackingPage` [`apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx:97`]
- [ ] [Review][Patch] `requestId` GET param not validated as UUID — `@Param('requestId')` has no `ParseUUIDPipe`; arbitrary strings trigger Prisma errors [`apps/backend/src/modules/ratings/ratings.controller.ts:35`]
- [ ] [Review][Patch] `showRatingPrompt` should gate on `!ratingStatusQuery.data?.hasRating` — rated sheet remains unnecessarily mounted when `ratingDismissed` is false; fix: `showRatingPrompt = isComplete && !ratingDismissed && !ratingStatusQuery.data?.hasRating` [`apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx:39`]
- [ ] [Review][Patch] Whitespace-only `shortFeedback` not normalized to `null` — `""` is falsy (correctly becomes `undefined`) but `"   "` (spaces) passes `||` as truthy, is stored as non-null whitespace; add `@Transform(({ value }) => value?.trim() || undefined)` to DTO [`apps/backend/src/modules/ratings/dto/submit-rating.dto.ts:12`]
- [x] [Review][Defer] `averageRatingCache`/`ratingsCountCache` never updated after submitRating — deferred, explicit scope boundary in story; address in Epic 5 or future ratings aggregation story [`apps/backend/src/modules/ratings/ratings.service.ts`]
- [x] [Review][Defer] `RatingStatusResponseSchema` not a discriminated union — stars can be non-null when hasRating is false in theory; MVP defensive enough with existing guards; defer [`packages/contracts/src/rating.schemas.ts`]
- [x] [Review][Defer] `handymanId` snapshot drift — no handyman reassignment possible in MVP lifecycle; defer [`apps/backend/src/modules/ratings/ratings.service.ts:40`]
- [x] [Review][Defer] Missing indexes on `request_ratings.customer_id` and `handyman_id` — future rating-by-handyman queries will scan; Epic 5 hardening scope [`apps/backend/prisma/schema.prisma`]
- [x] [Review][Defer] Submit button double-fire before `isPending` propagates — extremely rare timing; P2002 handling (patch #1) covers the DB side; defer [`apps/frontend/src/features/request-rating/components/RatingPromptSheet.tsx:86`]
- [x] [Review][Defer] `getRatingStatus` does not validate request `status` — non-COMPLETE requests return valid 200; frontend gates on `isComplete`; acceptable for MVP [`apps/backend/src/modules/ratings/ratings.service.ts:55`]
- [x] [Review][Defer] `SubmitRatingResponseSchema.stars` has no int/min/max constraints — response-side validation gap; low risk in practice; defer [`packages/contracts/src/rating.schemas.ts:13`]
- [x] [Review][Defer] Future terminal statuses (e.g. CANCELLED) silently render as plain div — extensibility gap, not a current bug; address when new lifecycle states are added [`apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx`]

### Completion Notes List

All 11 tasks implemented and verified. TypeScript compilation passes for both apps with zero errors. 43 tests pass: 11 backend (RatingsService: submit + getRatingStatus coverage), existing 13 backend realtime tests preserved; 19 frontend (11 RatingPromptSheet component tests + 8 existing WebSocket hook tests). Key decisions: Prisma migration created manually (no live DB) in `20260518130000_add_request_ratings/`; `@unique` on `request_id` enforces idempotency at DB level; `rating: { select: { id: true } }` LEFT JOIN in `findAllForCustomer` populates `hasRating` without a separate query per item; `useRatingStatus` gated by `enabled: isComplete` to avoid wasteful calls during active jobs; `ratingDismissed` local state allows dismiss + reopen from COMPLETE card (which links to tracking). `setupFiles: ['./src/test-setup.ts']` added to vitest config to enable `@testing-library/jest-dom` matchers.

### File List

packages/contracts/src/index.ts
packages/contracts/src/rating.schemas.ts
packages/contracts/src/request.schemas.ts
apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/20260518130000_add_request_ratings/migration.sql
apps/backend/src/modules/ratings/ratings.module.ts
apps/backend/src/modules/ratings/ratings.service.ts
apps/backend/src/modules/ratings/ratings.controller.ts
apps/backend/src/modules/ratings/ratings.service.spec.ts
apps/backend/src/modules/ratings/dto/submit-rating.dto.ts
apps/backend/src/modules/requests/requests.service.ts
apps/backend/src/modules/requests/dto/customer-request-list-response.dto.ts
apps/frontend/vite.config.ts
apps/frontend/src/test-setup.ts
apps/frontend/src/index.css
apps/frontend/src/features/request-rating/api/ratings.api.ts
apps/frontend/src/features/request-rating/hooks/useRatingStatus.ts
apps/frontend/src/features/request-rating/hooks/useSubmitRating.ts
apps/frontend/src/features/request-rating/components/RatingPromptSheet.tsx
apps/frontend/src/features/request-rating/components/RatingPromptSheet.test.tsx
apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx
apps/frontend/src/features/customer-dashboard/components/RequestCard.tsx
