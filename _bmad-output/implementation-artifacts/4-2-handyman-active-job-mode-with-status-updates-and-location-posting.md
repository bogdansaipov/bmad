# Story 4.2: Handyman Active Job Mode with Status Updates and Location Posting

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an assigned handyman,
I want to enter a focused active-job view where I can update my status and share my location,
so that the customer always knows where I am and what stage the job is at.

## Acceptance Criteria

1. **Given** a handyman accepts a job **When** they enter the active-job view **Then** the map shows the customer/job location pin **And** the current job status and next required status action are clearly visible.

2. **Given** the handyman is in active-job mode **When** they update their status (on the way → arrived → working → complete) **Then** only the valid next transition is available as the dominant action **And** the status is persisted and the transition recorded in `request_status_history`.

3. **Given** the handyman is navigating to the job **When** their device location is available **Then** the handyman app posts the current location to the backend via REST **And** the location is stored as a `handyman_location_updates` record tied to the request and handyman.

4. **Given** the active job bottom sheet is visible on mobile **When** the handyman interacts with it **Then** status controls sit in a persistent bottom sheet or fixed action area — never buried in deep navigation **And** the bottom sheet supports collapsed, half-open, and full-detail states.

5. **Given** the handyman marks the job `complete` **When** the final status transition is saved **Then** the request is durably marked complete with a `completed_at` timestamp **And** the handyman is returned to their jobs dashboard.

## Tasks / Subtasks

- [x] Task 1 — Add contracts for active job (AC: 1, 2, 3, 5)
  - [x] In `packages/contracts/src/request.schemas.ts`, append the following (after the existing `RequestTrackingResponse` exports):
    ```ts
    export const ActiveJobResponseSchema = z.object({
      requestId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: RequestStatusEnum,
      categoryName: z.string(),
      estimatedTotal: z.number().nullable(),
      locationLat: z.number().nullable(),
      locationLng: z.number().nullable(),
      createdAt: z.string().datetime(),
    });
    export type ActiveJobResponse = z.infer<typeof ActiveJobResponseSchema>;

    export const UpdateJobStatusBodySchema = z.object({
      status: z.enum(['ON_THE_WAY', 'ARRIVED', 'WORKING', 'COMPLETE']),
    });
    export type UpdateJobStatusBody = z.infer<typeof UpdateJobStatusBodySchema>;

    export const UpdateJobStatusResponseSchema = z.object({
      requestId: z.string(),
      status: RequestStatusEnum,
    });
    export type UpdateJobStatusResponse = z.infer<typeof UpdateJobStatusResponseSchema>;

    export const PostLocationBodySchema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    });
    export type PostLocationBody = z.infer<typeof PostLocationBodySchema>;

    export const PostLocationResponseSchema = z.object({
      id: z.string(),
      recordedAt: z.string(),
    });
    export type PostLocationResponse = z.infer<typeof PostLocationResponseSchema>;
    ```
  - [x] `packages/contracts/src/index.ts` already re-exports everything from `request.schemas.ts` — no change needed

- [x] Task 2 — Backend DTOs (AC: 1, 2, 3)
  - [x] Create `apps/backend/src/modules/matching/dto/active-job-response.dto.ts`:
    ```ts
    export class ActiveJobResponseDto {
      requestId!: string;
      title!: string;
      description!: string | null;
      status!: string;
      categoryName!: string;
      estimatedTotal!: number | null;
      locationLat!: number | null;
      locationLng!: number | null;
      createdAt!: string;
    }
    ```
  - [x] Create `apps/backend/src/modules/matching/dto/update-job-status.dto.ts`:
    ```ts
    import { IsIn } from 'class-validator';

    export class UpdateJobStatusDto {
      @IsIn(['ON_THE_WAY', 'ARRIVED', 'WORKING', 'COMPLETE'])
      status!: string;
    }
    ```
  - [x] Create `apps/backend/src/modules/matching/dto/post-location.dto.ts`:
    ```ts
    import { IsNumber, Max, Min } from 'class-validator';

    export class PostLocationDto {
      @IsNumber()
      @Min(-90)
      @Max(90)
      lat!: number;

      @IsNumber()
      @Min(-180)
      @Max(180)
      lng!: number;
    }
    ```

- [x] Task 3 — Backend: `MatchingService` active job methods (AC: 1, 2, 3, 5)
  - [x] Add imports at top of `apps/backend/src/modules/matching/matching.service.ts`:
    - Add `BadRequestException, ForbiddenException, NotFoundException` to the existing `@nestjs/common` import
    - `RequestStatus` is already available from `@prisma/client` (confirm existing import)
    - Add import: `import { ActiveJobResponseDto } from './dto/active-job-response.dto';`
  - [x] Add the following private constant and three methods to `MatchingService` class:
    ```ts
    private readonly VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus>> = {
      [RequestStatus.ASSIGNED]: RequestStatus.ON_THE_WAY,
      [RequestStatus.ON_THE_WAY]: RequestStatus.ARRIVED,
      [RequestStatus.ARRIVED]: RequestStatus.WORKING,
      [RequestStatus.WORKING]: RequestStatus.COMPLETE,
    };

    private readonly ACTIVE_STATUSES = new Set<RequestStatus>([
      RequestStatus.ASSIGNED,
      RequestStatus.ON_THE_WAY,
      RequestStatus.ARRIVED,
      RequestStatus.WORKING,
    ]);

    async getActiveJobForHandyman(handymanId: string, requestId: string): Promise<ActiveJobResponseDto> {
      const request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: { category: { select: { name: true } } },
      });

      if (!request) throw new NotFoundException('Request not found');
      if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');
      if (!this.ACTIVE_STATUSES.has(request.status)) {
        throw new BadRequestException('Request is not in an active state');
      }

      return {
        requestId: request.id,
        title: request.title,
        description: request.description ?? null,
        status: request.status,
        categoryName: request.category.name,
        estimatedTotal: request.estimatedTotal?.toNumber() ?? null,
        locationLat: request.locationLat ?? null,
        locationLng: request.locationLng ?? null,
        createdAt: request.createdAt.toISOString(),
      };
    }

    async updateJobStatus(
      handymanId: string,
      requestId: string,
      newStatusStr: string,
    ): Promise<{ requestId: string; status: string }> {
      const request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { id: true, status: true, assignedHandymanId: true },
      });

      if (!request) throw new NotFoundException('Request not found');
      if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');

      const expectedNext = this.VALID_TRANSITIONS[request.status];
      const newStatus = newStatusStr as RequestStatus;
      if (!expectedNext || expectedNext !== newStatus) {
        throw new BadRequestException(
          `Invalid transition: ${request.status} → ${newStatusStr}`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
          where: { id: requestId },
          data: {
            status: newStatus,
            ...(newStatus === RequestStatus.COMPLETE ? { completedAt: new Date() } : {}),
          },
        });

        await tx.requestStatusHistory.create({
          data: {
            requestId,
            status: newStatus,
            actorType: 'handyman',
            actorId: handymanId,
          },
        });
      });

      return { requestId, status: newStatusStr };
    }

    async postHandymanLocation(
      handymanId: string,
      requestId: string,
      lat: number,
      lng: number,
    ): Promise<{ id: string; recordedAt: string }> {
      const request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { id: true, assignedHandymanId: true, status: true },
      });

      if (!request) throw new NotFoundException('Request not found');
      if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');
      if (!this.ACTIVE_STATUSES.has(request.status)) {
        throw new BadRequestException('Cannot post location for non-active request');
      }

      const loc = await this.prisma.handymanLocationUpdate.create({
        data: { requestId, handymanId, lat, lng },
      });

      return { id: loc.id, recordedAt: loc.recordedAt.toISOString() };
    }
    ```

- [x] Task 4 — Backend: `MatchingController` active job endpoints (AC: 1, 2, 3)
  - [x] Update import from `@nestjs/common` in `apps/backend/src/modules/matching/matching.controller.ts` — add `Body, HttpCode, Param, Patch, Post` to the existing `Controller, Get, UseGuards` import
  - [x] Import `ActiveJobResponseDto` from `./dto/active-job-response.dto`
  - [x] Import `UpdateJobStatusDto` from `./dto/update-job-status.dto`
  - [x] Import `PostLocationDto` from `./dto/post-location.dto`
  - [x] Add the three endpoints to `MatchingController` class. **CRITICAL**: Place all three `active` endpoints BEFORE `@Get('history')` and `@Get('available')` to avoid NestJS route-matching conflicts:
    ```ts
    @Get('active/:requestId')
    @Roles(UserRole.HANDYMAN)
    @ApiOperation({ summary: 'Get active job details for the authenticated handyman' })
    getActiveJob(
      @CurrentUser() user: AuthenticatedUser,
      @Param('requestId') requestId: string,
    ): Promise<ActiveJobResponseDto> {
      return this.matchingService.getActiveJobForHandyman(user.userId, requestId);
    }

    @Patch('active/:requestId/status')
    @Roles(UserRole.HANDYMAN)
    @ApiOperation({ summary: 'Update job status for the authenticated handyman' })
    updateJobStatus(
      @CurrentUser() user: AuthenticatedUser,
      @Param('requestId') requestId: string,
      @Body() body: UpdateJobStatusDto,
    ): Promise<{ requestId: string; status: string }> {
      return this.matchingService.updateJobStatus(user.userId, requestId, body.status);
    }

    @Post('active/:requestId/location')
    @Roles(UserRole.HANDYMAN)
    @HttpCode(201)
    @ApiOperation({ summary: 'Post current location for active job' })
    postLocation(
      @CurrentUser() user: AuthenticatedUser,
      @Param('requestId') requestId: string,
      @Body() body: PostLocationDto,
    ): Promise<{ id: string; recordedAt: string }> {
      return this.matchingService.postHandymanLocation(user.userId, requestId, body.lat, body.lng);
    }
    ```

- [x] Task 5 — Frontend: API layer (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/handyman-active-job/api/active-job.api.ts`:
    - Copy the `requireToken()` and `jsonRequest()` helpers verbatim from `handyman-jobs.api.ts` (same pattern, they are not shared utilities)
    - `AuthError`: import from `../../handyman-dashboard/api/handyman-profile.api`
    - `getAccessToken`, `clearAccessToken`: import from `../../customer-auth/lib/auth-storage`
    - Full file:
      ```ts
      import {
        ActiveJobResponse,
        ActiveJobResponseSchema,
        PostLocationResponse,
        PostLocationResponseSchema,
        UpdateJobStatusResponse,
        UpdateJobStatusResponseSchema,
      } from '@handrix/contracts';
      import { clearAccessToken, getAccessToken } from '../../customer-auth/lib/auth-storage';
      import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';

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

      export async function fetchActiveJob(requestId: string): Promise<ActiveJobResponse> {
        const token = requireToken();
        const res = await jsonRequest(`/api/jobs/active/${requestId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
        if (!res.ok) throw Object.assign(new Error('Failed to load active job.'), { status: res.status });
        const body = await res.json().catch(() => null);
        const parsed = ActiveJobResponseSchema.safeParse(body);
        if (!parsed.success) {
          console.error('fetchActiveJob: schema validation failed', parsed.error.issues);
          throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
        }
        return parsed.data;
      }

      export async function updateJobStatus(requestId: string, status: string): Promise<UpdateJobStatusResponse> {
        const token = requireToken();
        const res = await jsonRequest(`/api/jobs/active/${requestId}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
        if (!res.ok) throw Object.assign(new Error('Failed to update job status.'), { status: res.status });
        const body = await res.json().catch(() => null);
        const parsed = UpdateJobStatusResponseSchema.safeParse(body);
        if (!parsed.success) {
          console.error('updateJobStatus: schema validation failed', parsed.error.issues);
          throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
        }
        return parsed.data;
      }

      export async function postLocation(requestId: string, lat: number, lng: number): Promise<PostLocationResponse> {
        const token = requireToken();
        const res = await jsonRequest(`/api/jobs/active/${requestId}/location`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        if (res.status === 401) { clearAccessToken(); throw new AuthError(); }
        if (!res.ok) throw Object.assign(new Error('Failed to post location.'), { status: res.status });
        const body = await res.json().catch(() => null);
        const parsed = PostLocationResponseSchema.safeParse(body);
        if (!parsed.success) {
          console.error('postLocation: schema validation failed', parsed.error.issues);
          throw Object.assign(new Error('Server returned an unexpected response.'), { status: res.status });
        }
        return parsed.data;
      }
      ```

- [x] Task 6 — Frontend: TanStack Query hooks (AC: 1, 2, 3)
  - [x] Create `apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts`:
    ```ts
    import { useQuery } from '@tanstack/react-query';
    import { fetchActiveJob } from '../api/active-job.api';

    export function useActiveJob(requestId: string) {
      return useQuery({
        queryKey: ['active-job', requestId],
        queryFn: () => fetchActiveJob(requestId),
        enabled: !!requestId,
        refetchInterval: 30_000,
      });
    }
    ```
  - [x] Create `apps/frontend/src/features/handyman-active-job/hooks/useUpdateJobStatus.ts`:
    ```ts
    import { useMutation, useQueryClient } from '@tanstack/react-query';
    import { useAuth } from '../../../customer-auth/context/AuthContext';
    import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
    import { updateJobStatus } from '../api/active-job.api';

    export function useUpdateJobStatus(requestId: string) {
      const queryClient = useQueryClient();
      const { logout } = useAuth();

      return useMutation({
        mutationFn: (status: string) => updateJobStatus(requestId, status),
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['active-job', requestId] });
        },
        onError: (err: unknown) => {
          if (err instanceof AuthError) logout();
        },
      });
    }
    ```
  - [x] Create `apps/frontend/src/features/handyman-active-job/hooks/usePostLocation.ts`:
    ```ts
    import { useMutation } from '@tanstack/react-query';
    import { useAuth } from '../../../customer-auth/context/AuthContext';
    import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
    import { postLocation } from '../api/active-job.api';

    export function usePostLocation(requestId: string) {
      const { logout } = useAuth();

      return useMutation({
        mutationFn: ({ lat, lng }: { lat: number; lng: number }) => postLocation(requestId, lat, lng),
        onError: (err: unknown) => {
          if (err instanceof AuthError) logout();
        },
      });
    }
    ```

- [x] Task 7 — Frontend: `ActiveJobMap` component (AC: 1, 4)
  - [x] Create `apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx`:
    - Props: `jobLat: number | null; jobLng: number | null`
    - Based on `RequestTrackingMap.tsx` from story 4.1 — same `OSM_STYLE` constant (copy exactly), same MapLibre setup, same `useEffect` cleanup pattern
    - **One pin only**: default blue MapLibre marker at `[jobLng, jobLat]` — the handyman sees the customer's job location to navigate to
    - No click/drag handlers — display only
    - If both lat/lng non-null: center on job at zoom 14; if null: center `[0, 0]` at zoom 2
    - Two `useRef` values: `mapRef` and `markerRef`; cleanup: `markerRef.current?.remove()` then `mapRef.current?.remove()`
    - `aria-label="Active job location map"` on container div
    - Class: `w-full h-full`

- [x] Task 8 — Frontend: `ActiveJobBottomSheet` component (AC: 2, 4, 5)
  - [x] Create `apps/frontend/src/features/handyman-active-job/components/ActiveJobBottomSheet.tsx`:
    - Props:
      ```ts
      interface Props {
        job: ActiveJobResponse;
        sheetState: 'collapsed' | 'half' | 'full';
        onStateChange: (s: 'collapsed' | 'half' | 'full') => void;
        onStatusAction: (newStatus: string) => void;
        isUpdating: boolean;
      }
      ```
    - Import `ActiveJobResponse` from `@handrix/contracts`
    - Import `StatusChip` from `../../customer-dashboard/components/StatusChip` — DO NOT create a new chip
    - **Next action map** (used to drive the CTA button):
      ```ts
      const NEXT_ACTION: Record<string, { label: string; status: string }> = {
        ASSIGNED:    { label: 'Start Heading Over', status: 'ON_THE_WAY' },
        ON_THE_WAY:  { label: "I've Arrived",        status: 'ARRIVED' },
        ARRIVED:     { label: 'Start Working',       status: 'WORKING' },
        WORKING:     { label: 'Mark Complete',       status: 'COMPLETE' },
      };
      ```
    - **Collapsed state** (`active-job-bottom-sheet--collapsed`): drag handle + `<StatusChip status={job.status} />` only
    - **Half-open state** (`active-job-bottom-sheet--half`): drag handle + status chip + CTA button (if nextAction exists)
    - **Full state** (`active-job-bottom-sheet--full`): drag handle + status chip + CTA button + job title + category + estimate + description
    - Tap drag handle → cycle: `collapsed → half → full → collapsed`
    - CTA button: disabled when `isUpdating` or `!nextAction`; `onClick={() => onStatusAction(nextAction.status)}`
    - Estimate format: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.estimatedTotal)` — only render when non-null
    - CSS classes: `active-job-bottom-sheet active-job-bottom-sheet--{sheetState}`
    - `aria-live="polite"` on status chip container (status changes are meaningful for screen readers)

- [x] Task 9 — Frontend: `ActiveJobPage` (AC: 1, 2, 3, 4, 5)
  - [x] Create `apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx`:
    ```tsx
    import { useEffect, useState } from 'react';
    import { Navigate, useNavigate, useParams } from 'react-router-dom';
    import { useAuth } from '../../../customer-auth/context/AuthContext';
    import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
    import { HandymanNav } from '../../handyman-dashboard/components/HandymanNav';
    import { ActiveJobMap } from '../components/ActiveJobMap';
    import { ActiveJobBottomSheet } from '../components/ActiveJobBottomSheet';
    import { useActiveJob } from '../hooks/useActiveJob';
    import { usePostLocation } from '../hooks/usePostLocation';
    import { useUpdateJobStatus } from '../hooks/useUpdateJobStatus';

    function isAuthError(e: unknown): e is AuthError {
      return e instanceof AuthError;
    }

    export function ActiveJobPage() {
      const { requestId } = useParams<{ requestId: string }>();
      const navigate = useNavigate();
      const { logout } = useAuth();
      const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>('half');

      // All hooks must be called before any early return
      const jobQuery = useActiveJob(requestId ?? '');
      const statusMutation = useUpdateJobStatus(requestId ?? '');
      const locationMutation = usePostLocation(requestId ?? '');

      const authFailed =
        (jobQuery.isError && isAuthError(jobQuery.error)) ||
        (statusMutation.isError && isAuthError(statusMutation.error));

      useEffect(() => {
        if (authFailed) logout();
      }, [authFailed, logout]);

      // Periodic location posting — fires immediately on mount then every 30s
      useEffect(() => {
        if (!requestId) return;
        const postCurrentLocation = () => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              locationMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => { /* silently ignore permission/unavailable errors */ },
            { timeout: 10_000, maximumAge: 60_000 },
          );
        };
        postCurrentLocation();
        const interval = setInterval(postCurrentLocation, 30_000);
        return () => clearInterval(interval);
      }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

      if (!requestId) return <Navigate to="/jobs" replace />;
      if (authFailed) return null;

      const handleStatusAction = (newStatus: string) => {
        statusMutation.mutate(newStatus, {
          onSuccess: () => {
            if (newStatus === 'COMPLETE') navigate('/jobs');
          },
        });
      };

      const { isLoading, isError, error, data } = jobQuery;

      return (
        <div className="active-job-page">
          <HandymanNav />

          {isLoading && (
            <div className="skeleton-list" aria-busy="true" aria-live="polite">
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--meta" />
              </div>
            </div>
          )}

          {isError && !isAuthError(error) && (
            <div role="alert" className="error-banner">
              Failed to load active job. Please try again.
              <button
                onClick={() => jobQuery.refetch()}
                className="btn-secondary error-banner__retry"
                style={{ minHeight: 44 }}
              >
                Retry
              </button>
            </div>
          )}

          {data && (
            <>
              <div className="active-job-page__map-container">
                <ActiveJobMap jobLat={data.locationLat} jobLng={data.locationLng} />
              </div>
              <ActiveJobBottomSheet
                job={data}
                sheetState={sheetState}
                onStateChange={setSheetState}
                onStatusAction={handleStatusAction}
                isUpdating={statusMutation.isPending}
              />
            </>
          )}
        </div>
      );
    }
    ```

- [x] Task 10 — Update `App.tsx`: add active job route (AC: 1)
  - [x] In `apps/frontend/src/App.tsx`:
    - Import `ActiveJobPage` from `./features/handyman-active-job/pages/ActiveJobPage`
    - Add route (after the existing `/jobs` route to keep routes grouped logically):
      ```tsx
      {
        path: '/jobs/:requestId/active',
        element: (
          <RequireAuth requiredRole="HANDYMAN">
            <ActiveJobPage />
          </RequireAuth>
        ),
      },
      ```
    - Does NOT conflict with `path: '/jobs'` — React Router matches exact paths first

- [x] Task 11 — Update `useAcceptJob.ts`: navigate to active job after accepting (AC: 1)
  - [x] In `apps/frontend/src/features/handyman-jobs/hooks/useAcceptJob.ts`:
    - Add `import { useNavigate } from 'react-router-dom';`
    - Add `const navigate = useNavigate();` inside the hook
    - Update `onSuccess` to use `data` parameter (type is `AcceptJobResponse` with `{ requestId, status }`):
      ```ts
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: ['handyman-jobs'] });
        navigate(`/jobs/${data.requestId}/active`);
      },
      ```
    - `acceptJob` returns `AcceptJobResponse` (from contracts: `{ requestId: string; status: 'ASSIGNED' }`) — the `data.requestId` is available

- [x] Task 12 — Add CSS for active job page (AC: 4)
  - [x] In `apps/frontend/src/index.css`, add at the end (following same comment-block structure as existing sections):
    - `.active-job-page` — full-viewport layout container (same pattern as `.tracking-page`)
    - `.active-job-page__map-container` — fills viewport minus nav height
    - `.active-job-bottom-sheet` — fixed bottom sheet, `position: fixed`, `bottom: 0`, `width: 100%`
    - `.active-job-bottom-sheet--collapsed` — short height, shows only status chip + drag handle
    - `.active-job-bottom-sheet--half` — mid height, shows status + CTA
    - `.active-job-bottom-sheet--full` — full height (75vh), all details visible

## Dev Notes

### No New Prisma Migration Needed

`HandymanLocationUpdate` model already exists in the schema and was migrated in story 4.1. Task 3's `postHandymanLocation` writes to it directly via `prisma.handymanLocationUpdate.create`. Do NOT run a new migration.

### Status Machine — Valid Transitions Only

Server enforces one-directional transitions via `VALID_TRANSITIONS`. Invalid transitions throw `BadRequestException`. Client only shows the button for the valid next step — no multi-step jumps are allowed.

| Current Status | CTA Label | Sends | Next Status |
|---|---|---|---|
| ASSIGNED | Start Heading Over | ON_THE_WAY | ON_THE_WAY |
| ON_THE_WAY | I've Arrived | ARRIVED | ARRIVED |
| ARRIVED | Start Working | WORKING | WORKING |
| WORKING | Mark Complete | COMPLETE | COMPLETE |
| COMPLETE | (none) | — | — |

### `completedAt` Timestamp on COMPLETE

When transitioning to `COMPLETE`, the service sets `completedAt: new Date()` in the same `$transaction` block. The `completedAt` field already exists on `ServiceRequest` model in `schema.prisma:126`.

### `requestStatusHistory` Entry on Every Transition

Every `updateJobStatus` call creates a `RequestStatusHistory` row with `actorType: 'handyman'`. This is the same pattern used in `AssignmentsService.acceptJob()` (`assignments.service.ts:61`).

### Endpoint Order in MatchingController — Must Be Before history/available

`@Get('active/:requestId')` MUST be declared before `@Get('history')` and `@Get('available')` in the controller class. Same rule applied in story 4.1 for `RequestsController` (tracking endpoint before list endpoint). NestJS matches routes top-to-bottom.

### Authorization: `assignedHandymanId !== handymanId`

All three service methods (`getActiveJobForHandyman`, `updateJobStatus`, `postHandymanLocation`) check `request.assignedHandymanId !== handymanId` and throw `ForbiddenException`. This is critical — without it any handyman could advance any job's status.

### `Decimal.toNumber()` for `estimatedTotal`

`serviceRequest.estimatedTotal` is a Prisma `Decimal` type. Always call `.toNumber()` before returning. Use `?.toNumber() ?? null` (not `|| null` — 0 must not be treated as falsy). Same pattern as `RequestsService.getTrackingForCustomer()` and `matching.service.ts`.

### Location Posting: Silent Geolocation Errors

`navigator.geolocation.getCurrentPosition` failure callback is intentionally empty — permission denied or unavailable device location must NOT surface as an error to the user. Location is best-effort. The interval cleanup in `useEffect` runs on unmount to stop posting when the page is left.

### `useNavigate` in `useAcceptJob` Hook

`useNavigate` works inside mutation callbacks because the hook is called within a component that is always wrapped in `<RouterProvider>`. The `navigate` call runs after the mutation succeeds, outside of React render phase — this is safe.

### `locationMutation` in `useEffect` Dependency Array

The `useEffect` for periodic location posting intentionally omits `locationMutation` from the dependency array (or uses `eslint-disable-line`). Including it would restart the interval on every render since `useMutation` returns a new object reference each render. The `requestId`-only dependency is correct.

### Active Job Page: Two-Part Layout

Same visual structure as `RequestTrackingPage` (story 4.1) — map fills viewport, bottom sheet overlaid at bottom. Use the same CSS architecture for consistency:
- `active-job-page__map-container` analogous to `tracking-page__map-container`
- `active-job-bottom-sheet` analogous to `tracking-bottom-sheet`

### Reuse — Do NOT Reinvent

| Component/Util | Import From |
|---|---|
| `AuthError` | `../../handyman-dashboard/api/handyman-profile.api` |
| `getAccessToken` / `clearAccessToken` | `../../customer-auth/lib/auth-storage` |
| `StatusChip` | `../../customer-dashboard/components/StatusChip` |
| `HandymanNav` | `../../handyman-dashboard/components/HandymanNav` |
| `OSM_STYLE` + MapLibre setup | Copy from `RequestTrackingMap.tsx` (story 4.1) |
| Error banner pattern | `<div role="alert" className="error-banner">` + retry — same as `HandymanHistoryPage.tsx` |
| Skeleton loading | `<div className="skeleton-list" aria-busy="true" aria-live="polite">` — same as `HandymanHistoryPage.tsx` |

### Anti-Patterns from Previous Stories — Must Not Repeat

- **TanStack Query object syntax**: `useMutation({ mutationFn })`, `useQuery({ queryKey, queryFn })` — NOT positional args
- **`logout()` in render**: must be in `useEffect`, never called synchronously during render (React 18 Strict Mode)
- **`$queryRaw`**: do NOT use — typed Prisma client throughout
- **`Decimal` raw return**: always `.toNumber()` before including in response
- **`uuid()` for `HandymanLocationUpdate`**: schema already uses `@default(cuid())` for this model — no change needed

### Scope Boundary — Do NOT Build Here

- **WebSocket status push** (story 4.3) — `refetchInterval: 30_000` polling is the correct MVP approach for this story
- **Customer rating prompt** (story 4.4) — do NOT add rating UI to this page
- **Handyman dashboard "active jobs" section** — navigation via accept-flow redirect is sufficient for MVP
- **Cancel/abandon job** — not in MVP scope
- **Desktop split-pane layout** (story 5.4) — mobile-first only in this story

### Project Structure

```
packages/contracts/src/
  request.schemas.ts                                          ← modify: add 5 new schemas + types

apps/backend/src/modules/matching/
  matching.controller.ts                                      ← modify: add 3 active endpoints (before history/available)
  matching.service.ts                                         ← modify: add 3 methods + VALID_TRANSITIONS + ACTIVE_STATUSES
  dto/
    active-job-response.dto.ts                                ← new
    update-job-status.dto.ts                                  ← new
    post-location.dto.ts                                      ← new

apps/frontend/src/
  App.tsx                                                     ← modify: add /jobs/:requestId/active route
  index.css                                                   ← modify: add active-job-page CSS
  features/
    handyman-jobs/hooks/useAcceptJob.ts                       ← modify: navigate to active job after accept
    handyman-active-job/
      api/active-job.api.ts                                   ← new
      hooks/useActiveJob.ts                                   ← new
      hooks/useUpdateJobStatus.ts                             ← new
      hooks/usePostLocation.ts                                ← new
      components/ActiveJobMap.tsx                             ← new
      components/ActiveJobBottomSheet.tsx                     ← new
      pages/ActiveJobPage.tsx                                 ← new
```

### References

- Story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story-42-Handyman-Active-Job-Mode]
- FR16–FR20: handyman lifecycle, location sharing, status transitions
- `handyman_location_updates` entity (already migrated): [Source: story 4.1 implementation — schema.prisma:207]
- Status machine (ASSIGNED → ON_THE_WAY → ARRIVED → WORKING → COMPLETE): [Source: _bmad-output/planning-artifacts/architecture.md#Request-Lifecycle-State-Machine]
- `completedAt` field on ServiceRequest: [Source: apps/backend/prisma/schema.prisma:125]
- Realtime transport: REST for status updates (story 4.2), WebSockets only for story 4.3: [Source: _bmad-output/planning-artifacts/architecture.md#Realtime-Transport-Strategy]
- AuthError (handyman context): [apps/frontend/src/features/handyman-dashboard/api/handyman-profile.api.ts]
- useAcceptJob (to modify): [apps/frontend/src/features/handyman-jobs/hooks/useAcceptJob.ts]
- AcceptJobResponse type (requestId, status): [packages/contracts/src/handyman.schemas.ts:101]
- Existing matching controller (endpoint order rule): [apps/backend/src/modules/matching/matching.controller.ts]
- TrackingBottomSheet for bottom sheet pattern: [apps/frontend/src/features/request-tracking/components/TrackingBottomSheet.tsx]
- RequestTrackingMap for map pattern: [apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx]
- HandymanHistoryPage for auth error + skeleton patterns: [apps/frontend/src/features/handyman-jobs/pages/HandymanHistoryPage.tsx]
- AssignmentsService for $transaction + RequestStatusHistory pattern: [apps/backend/src/modules/assignments/assignments.service.ts:61]
- UX-DR5 (map + status as primary visual), UX-DR6 (bottom sheet), UX-DR22 (3-state bottom sheet): [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

All 12 tasks implemented and verified. TypeScript compilation passes for both frontend (tsc -b) and backend (tsc --noEmit) with zero errors. Key decisions: corrected import paths in hooks/pages (story spec had an extra `..` level — `../../customer-auth/context/AuthContext` not `../../../`). The vite production build failure for `RegisterResponseSchema` is a pre-existing CJS/ESM issue in the contracts package that predates this story.

### File List

packages/contracts/src/request.schemas.ts
apps/backend/src/modules/matching/dto/active-job-response.dto.ts
apps/backend/src/modules/matching/dto/update-job-status.dto.ts
apps/backend/src/modules/matching/dto/post-location.dto.ts
apps/backend/src/modules/matching/matching.service.ts
apps/backend/src/modules/matching/matching.controller.ts
apps/frontend/src/App.tsx
apps/frontend/src/index.css
apps/frontend/src/features/handyman-jobs/hooks/useAcceptJob.ts
apps/frontend/src/features/handyman-active-job/api/active-job.api.ts
apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts
apps/frontend/src/features/handyman-active-job/hooks/useUpdateJobStatus.ts
apps/frontend/src/features/handyman-active-job/hooks/usePostLocation.ts
apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx
apps/frontend/src/features/handyman-active-job/components/ActiveJobBottomSheet.tsx
apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx

### Review Findings

- [x] [Review][Patch] `request.category` null crash in `getActiveJobForHandyman` and `getTrackingForCustomer` — `request.category.name` accessed without a null guard; if a ServiceRequest's category FK is null (data corruption or future soft-delete), both methods throw an unhandled TypeError [apps/backend/src/modules/matching/matching.service.ts, apps/backend/src/modules/requests/requests.service.ts]
- [x] [Review][Patch] `ActiveJobMap` pin never renders when coordinates arrive after initial mount — `useEffect` has empty `[]` deps; if `jobLat`/`jobLng` are null on first render (loading state) the job pin is never added even after data loads, violating AC1 [apps/frontend/src/features/handyman-active-job/components/ActiveJobMap.tsx]
- [x] [Review][Patch] `UpdateJobStatusResponse` type mismatch — service returns `{ status: newStatusStr }` (plain string) but `UpdateJobStatusResponseSchema` declares `status: RequestStatusEnum` (z.nativeEnum); client-side schema validation would fail [apps/backend/src/modules/matching/matching.service.ts, packages/contracts/src/request.schemas.ts]
- [x] [Review][Patch] `PostLocationResponseSchema.recordedAt` uses `z.string()` not `z.string().datetime()` — inconsistent with `ActiveJobResponseSchema.createdAt` and other response schemas; malformed timestamps silently pass validation [packages/contracts/src/request.schemas.ts]
- [x] [Review][Defer] Race condition in status transition — `findUnique` + `$transaction` not atomic; two concurrent PATCH requests can both pass the `VALID_TRANSITIONS` check and double-advance the state machine. Needs conditional update (`WHERE status = expectedCurrent`) or SERIALIZABLE isolation — architectural decision [apps/backend/src/modules/matching/matching.service.ts] — deferred, pre-existing concurrency pattern in this project
- [x] [Review][Defer] No `handyman_id` index on `handyman_location_updates` — composite index only on `(request_id, recorded_at)`; future handyman-scoped queries will full-scan the table [apps/backend/prisma/migrations/20260518120000_add_handyman_location_updates/migration.sql] — deferred, pre-existing
- [x] [Review][Defer] Unconditional `refetchInterval: 30_000` in `useActiveJob` and `useRequestTracking` — polling continues after job reaches COMPLETE/terminal status; will cause background 400 errors. Replace with conditional polling or stop on terminal status — deferred, intentional MVP approach until WebSocket push in story 4.3 [apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts, apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts]
- [x] [Review][Defer] `RequestTrackingMap` job pin stuck on mount-time coordinates — same empty `[]` dep-array pattern; if jobLat/jobLng are null on first render the pin never appears. Pre-existing from story 4.1 [apps/frontend/src/features/request-tracking/components/RequestTrackingMap.tsx] — deferred, pre-existing
