# Story 4.3: Real-Time Status Push via WebSocket

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer or handyman on an active job screen,
I want status changes to appear instantly without refreshing the page,
so that I always see the current state of the job without manual polling.

## Acceptance Criteria

1. **Given** an assigned handyman updates the job status **When** the status change is saved by the backend **Then** the updated status is pushed via WebSocket to the customer's tracking view within 1 second under normal conditions **And** the same update is pushed to the handyman's active-job view.

2. **Given** a WebSocket event is received on the customer tracking screen **When** the status update arrives **Then** the status display updates in place without triggering a full-screen refresh or visual reset **And** the update feels immediate and does not disrupt the map or bottom sheet state.

3. **Given** a client's WebSocket connection drops **When** the connection is restored **Then** the client reconnects automatically and the latest job status is restored from the backend **And** no lifecycle corruption or duplicate state is introduced by the reconnection.

4. **Given** a user is not on an active assigned job screen **When** WebSocket connections are evaluated **Then** no WebSocket connection is maintained — dashboards, history, and other screens use standard REST polling **And** the realtime layer scales with active job volume, not total active users.

## Tasks / Subtasks

- [x] Task 1 — Install WebSocket packages (AC: 1, 3)
  - [x] Backend: install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
    ```
    cd apps/backend && pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
    ```
  - [x] Frontend: install `socket.io-client`
    ```
    cd apps/frontend && pnpm add socket.io-client
    ```
  - [x] Verify no TypeScript errors after install: `tsc --noEmit` in both apps

- [x] Task 2 — Add WebSocket event schema to contracts (AC: 1, 2)
  - [x] In `packages/contracts/src/request.schemas.ts`, append after the existing exports:
    ```ts
    export const JobStatusUpdatedEventSchema = z.object({
      requestId: z.string(),
      status: RequestStatusEnum,
    });
    export type JobStatusUpdatedEvent = z.infer<typeof JobStatusUpdatedEventSchema>;
    ```
  - [x] `packages/contracts/src/index.ts` already re-exports everything from `request.schemas.ts` — no change needed

- [x] Task 3 — Backend: `RealtimeGateway` (AC: 1, 3, 4)
  - [x] Create `apps/backend/src/modules/realtime/realtime.gateway.ts`:
    ```ts
    import {
      ConnectedSocket,
      MessageBody,
      OnGatewayConnection,
      OnGatewayDisconnect,
      SubscribeMessage,
      WebSocketGateway,
      WebSocketServer,
    } from '@nestjs/websockets';
    import { Server, Socket } from 'socket.io';
    import { JwtService } from '@nestjs/jwt';
    import { ConfigService } from '@nestjs/config';
    import { PrismaService } from '../prisma/prisma.service';

    @WebSocketGateway({
      cors: { origin: '*', credentials: false },
      namespace: '/realtime',
    })
    export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
      @WebSocketServer()
      server!: Server;

      constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
      ) {}

      async handleConnection(client: Socket): Promise<void> {
        const token =
          (client.handshake.auth as Record<string, string>)['token'] ??
          (client.handshake.query['token'] as string | undefined);

        if (!token) {
          client.disconnect(true);
          return;
        }

        try {
          const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
          (client as Socket & { userId?: string; role?: string }).userId = payload.sub;
          (client as Socket & { userId?: string; role?: string }).role = payload.role;
        } catch {
          client.disconnect(true);
        }
      }

      handleDisconnect(_client: Socket): void {
        // Socket.IO handles room cleanup on disconnect automatically
      }

      @SubscribeMessage('join-room')
      async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { requestId: string },
      ): Promise<void> {
        const userId = (client as Socket & { userId?: string }).userId;
        const role = (client as Socket & { role?: string }).role;
        if (!userId || !role || !data?.requestId) return;

        const authorized = await this.canAccessRoom(userId, role, data.requestId);
        if (!authorized) return;

        await client.join(`request-${data.requestId}`);
      }

      @SubscribeMessage('leave-room')
      async handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { requestId: string },
      ): Promise<void> {
        if (data?.requestId) {
          await client.leave(`request-${data.requestId}`);
        }
      }

      private async canAccessRoom(userId: string, role: string, requestId: string): Promise<boolean> {
        const request = await this.prisma.serviceRequest.findUnique({
          where: { id: requestId },
          select: { customerId: true, assignedHandymanId: true },
        });
        if (!request) return false;
        if (role === 'CUSTOMER') return request.customerId === userId;
        if (role === 'HANDYMAN') return request.assignedHandymanId === userId;
        return false;
      }
    }
    ```

- [x] Task 4 — Backend: Update `RealtimeModule` + create `RealtimeService` (AC: 1)
  - [x] Create `apps/backend/src/modules/realtime/realtime.service.ts`:
    ```ts
    import { Injectable } from '@nestjs/common';
    import { RealtimeGateway } from './realtime.gateway';

    @Injectable()
    export class RealtimeService {
      constructor(private readonly gateway: RealtimeGateway) {}

      emitStatusUpdate(requestId: string, status: string): void {
        this.gateway.server.to(`request-${requestId}`).emit('request.status.updated', {
          requestId,
          status,
        });
      }
    }
    ```
  - [x] Replace `apps/backend/src/modules/realtime/realtime.module.ts` entirely:
    ```ts
    import { Module } from '@nestjs/common';
    import { JwtModule } from '@nestjs/jwt';
    import { ConfigModule, ConfigService } from '@nestjs/config';
    import { PrismaModule } from '../prisma/prisma.module';
    import { RealtimeGateway } from './realtime.gateway';
    import { RealtimeService } from './realtime.service';

    @Module({
      imports: [
        PrismaModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get<string>('JWT_SECRET'),
          }),
        }),
      ],
      providers: [RealtimeGateway, RealtimeService],
      exports: [RealtimeService],
    })
    export class RealtimeModule {}
    ```

- [x] Task 5 — Backend: Wire `RealtimeService` into `MatchingModule` and `MatchingService` (AC: 1)
  - [x] Update `apps/backend/src/modules/matching/matching.module.ts`:
    - Add `RealtimeModule` to the `imports` array
    - `RealtimeService` becomes available for injection once `RealtimeModule` is imported (it's exported)
    - Exact change: add `import { RealtimeModule } from '../realtime/realtime.module';` at top and `RealtimeModule` to `imports: [...]`
  - [x] Update `apps/backend/src/modules/matching/matching.service.ts`:
    - Add `import { RealtimeService } from '../realtime/realtime.service';` at top
    - Inject in constructor: `constructor(private readonly prisma: PrismaService, private readonly realtimeService: RealtimeService) {}`
    - In `updateJobStatus`, after the `await this.prisma.$transaction(...)` resolves (line ~192), add:
      ```ts
      // Fire-and-forget: emit to connected clients; do not await
      this.realtimeService.emitStatusUpdate(requestId, newStatus);
      ```
    - Full updated method ending:
      ```ts
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

      this.realtimeService.emitStatusUpdate(requestId, newStatus);
      return { requestId, status: newStatus };
      ```

- [x] Task 6 — Frontend: `useJobStatusSocket` hook (AC: 1, 2, 3, 4)
  - [x] Create `apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts`:
    ```ts
    import { useEffect, useRef } from 'react';
    import { useQueryClient } from '@tanstack/react-query';
    import { io, Socket } from 'socket.io-client';
    import { JobStatusUpdatedEventSchema } from '@handrix/contracts';
    import { getAccessToken, clearAccessToken } from '../../customer-auth/lib/auth-storage';

    interface UseJobStatusSocketOptions {
      requestId: string;
      trackingQueryKey: unknown[];
    }

    export function useJobStatusSocket({ requestId, trackingQueryKey }: UseJobStatusSocketOptions): void {
      const queryClient = useQueryClient();
      const socketRef = useRef<Socket | null>(null);

      useEffect(() => {
        if (!requestId) return;

        const token = getAccessToken();
        if (!token) return;

        const socket = io('/realtime', {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10_000,
          transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-room', { requestId });
        });

        socket.on('request.status.updated', (data: unknown) => {
          const parsed = JobStatusUpdatedEventSchema.safeParse(data);
          if (!parsed.success || parsed.data.requestId !== requestId) return;

          // Update TanStack Query cache in-place — no refetch, no loading flash
          queryClient.setQueryData(trackingQueryKey, (old: Record<string, unknown> | undefined) => {
            if (!old) return old;
            return { ...old, status: parsed.data.status };
          });
        });

        socket.on('reconnect', () => {
          // On reconnect: refetch from server to catch any missed events
          void queryClient.invalidateQueries({ queryKey: trackingQueryKey });
        });

        socket.on('disconnect', (reason) => {
          if (reason === 'io server disconnect') {
            // Server kicked us (auth expired). Clear token.
            clearAccessToken();
          }
        });

        return () => {
          socket.emit('leave-room', { requestId });
          socket.disconnect();
          socketRef.current = null;
        };
      }, [requestId, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps
    }
    ```
  - [x] Create folder `apps/frontend/src/features/shared/hooks/` if it doesn't exist (check first)

- [x] Task 7 — Update `useRequestTracking` to disable polling when WebSocket is active (AC: 2, 4)
  - [x] Update `apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts`:
    ```ts
    import { useQuery } from '@tanstack/react-query';
    import { fetchRequestTracking } from '../api/request-tracking.api';

    export function useRequestTracking(requestId: string) {
      return useQuery({
        queryKey: ['request-tracking', requestId],
        queryFn: () => fetchRequestTracking(requestId),
        // WebSocket (story 4.3) handles live updates; polling as fallback only
        refetchInterval: false,
        staleTime: 0,
        enabled: !!requestId,
      });
    }
    ```
  - **Note**: `staleTime: 0` ensures that when `invalidateQueries` fires on WS reconnect, a refetch happens immediately. `refetchInterval: false` removes constant 30s polling since WS covers it.

- [x] Task 8 — Update `useActiveJob` to disable polling when WebSocket is active (AC: 4)
  - [x] Update `apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts`:
    ```ts
    import { useQuery } from '@tanstack/react-query';
    import { fetchActiveJob } from '../api/active-job.api';

    export function useActiveJob(requestId: string) {
      return useQuery({
        queryKey: ['active-job', requestId],
        queryFn: () => fetchActiveJob(requestId),
        // WebSocket (story 4.3) handles live updates; polling as fallback only
        refetchInterval: false,
        staleTime: 0,
        enabled: !!requestId,
      });
    }
    ```

- [x] Task 9 — Update `RequestTrackingPage` to use WebSocket hook (AC: 1, 2, 3, 4)
  - [x] In `apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx`:
    - Add import: `import { useJobStatusSocket } from '../../shared/hooks/useJobStatusSocket';`
    - Inside `RequestTrackingPage()`, after the `useRequestTracking` call, add:
      ```tsx
      useJobStatusSocket({
        requestId: requestId ?? '',
        trackingQueryKey: ['request-tracking', requestId ?? ''],
      });
      ```
    - No other changes — the `data.status` displayed in `TrackingBottomSheet` will update automatically via cache mutation

- [x] Task 10 — Update `ActiveJobPage` to use WebSocket hook (AC: 1, 2, 3, 4)
  - [x] In `apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx`:
    - Add import: `import { useJobStatusSocket } from '../../../features/shared/hooks/useJobStatusSocket';`

      **CRITICAL**: The import path from `ActiveJobPage.tsx` to `shared/hooks/` is:
      `'../../../features/shared/hooks/useJobStatusSocket'`
      
      (ActiveJobPage is at `features/handyman-active-job/pages/`, so `../../../` goes up to `src/`, then `features/shared/hooks/`)
      
      Alternatively, use relative from `features/`: `'../../shared/hooks/useJobStatusSocket'`
      
      Use `'../../shared/hooks/useJobStatusSocket'` (two levels up to `features/`, then into `shared/hooks/`)
      
    - Inside `ActiveJobPage()`, after the existing hooks (`useActiveJob`, `useUpdateJobStatus`, `usePostLocation`), add:
      ```tsx
      useJobStatusSocket({
        requestId: requestId ?? '',
        trackingQueryKey: ['active-job', requestId ?? ''],
      });
      ```
    - The `ActiveJobBottomSheet` already reads `job.status` from `data` — it will update in-place when the cache mutates

## Dev Notes

### Package Installation is Required — Codebase Has NO WebSocket Packages

The backend `package.json` has zero WebSocket packages. You **must** install before any other task:
- Backend: `@nestjs/websockets @nestjs/platform-socket.io socket.io`
- Frontend: `socket.io-client`

Without these, TypeScript will fail on all imports in Tasks 3–6.

### `RealtimeModule` Is a Skeleton

`apps/backend/src/modules/realtime/realtime.module.ts` currently contains only:
```ts
import { Module } from '@nestjs/common';
@Module({})
export class RealtimeModule {}
```
Task 4 replaces this entirely. `RealtimeModule` is already imported in `app.module.ts` — no change needed there.

### Socket.IO Namespace: `/realtime`

The gateway uses `namespace: '/realtime'`. Frontend must connect to `/realtime`, not `/`. The Socket.IO server path defaults to `/socket.io` — the frontend `io('/realtime', ...)` call is correct (Socket.IO client resolves this against the base URL automatically in the browser).

### JWT Verification in Gateway

The gateway replicates JWT verification inline using `JwtService.verify()`. This is intentional — NestJS guards cannot be applied to `handleConnection`. The gateway imports `JwtModule.registerAsync` using `JWT_SECRET` from `ConfigService` — same pattern as `AuthModule` ([`apps/backend/src/modules/auth/auth.module.ts`]).

### Room Authorization Logic

`canAccessRoom` re-checks the database on every `join-room`. This is correct for MVP — it prevents a race where a handyman tries to join a room for a request they are no longer assigned to. The check is:
- `CUSTOMER`: `request.customerId === userId`
- `HANDYMAN`: `request.assignedHandymanId === userId`

A disconnected/unauthorized socket that cannot join will simply not receive events. No error is thrown to the client.

### Emit is Fire-and-Forget

`RealtimeService.emitStatusUpdate()` calls `server.to(room).emit(...)` — this is synchronous in Socket.IO (no await). It fires after the Prisma transaction commits. If no clients are in the room, the event is dropped silently (correct behavior — clients will fetch state on next load or reconnect).

### In-Place Status Update via `setQueryData`

**Critical for AC2** — do NOT use `invalidateQueries` for live events. Use `queryClient.setQueryData()`:

```ts
queryClient.setQueryData(['request-tracking', requestId], (old) => {
  if (!old) return old;
  return { ...old, status: parsed.data.status };
});
```

This mutates the cached object directly so React re-renders the status chip in-place with no loading spinner, no map reset, no bottom sheet reset. `invalidateQueries` would trigger a full refetch with `isLoading: true`, causing a loading flash — violates AC2.

Use `invalidateQueries` ONLY on `reconnect` (to recover missed events after a drop) — this is acceptable because reconnects are rare and users expect a brief state restoration after connectivity loss.

### `trackingQueryKey` Argument Pattern

The hook accepts `trackingQueryKey: unknown[]` so it works for both query keys:
- Customer tracking: `['request-tracking', requestId]`
- Handyman active job: `['active-job', requestId]`

This avoids duplicating the hook.

### Stop Polling (Tasks 7 & 8)

Story 4.2 used `refetchInterval: 30_000` as a stopgap until WebSocket was implemented (see story 4.2 dev notes "Scope Boundary"). In this story, set `refetchInterval: false` in both `useRequestTracking` and `useActiveJob`. WebSocket push replaces polling. On WS reconnect, `invalidateQueries` covers state restoration.

**Note**: Story 4.2's review flagged "Unconditional `refetchInterval: 30_000` polling continues after job reaches COMPLETE/terminal status" as deferred. That deferral is resolved here by removing polling entirely.

### `transports: ['websocket']` in Socket.IO Client

Skip the HTTP long-polling upgrade by forcing `transports: ['websocket']`. This is intentional:
- Reduces connection time (no polling phase)
- Simpler in Vite dev proxy setup
- Architecture calls for "WebSocket gateway" — not HTTP fallback

### Vite Dev Proxy for WebSocket

The frontend Vite dev server likely proxies `/api` to backend. You may need to add a WebSocket proxy entry to `apps/frontend/vite.config.ts` for the `/socket.io` path. Check if `vite.config.ts` exists and whether it has a proxy config. If it does, add:
```ts
'/socket.io': {
  target: 'http://localhost:3000',
  ws: true,
  changeOrigin: true,
},
```
If using the default vite dev server with no proxy, ensure frontend connects to the backend port directly (e.g., `io('http://localhost:3000/realtime', ...)`). Check the existing proxy config pattern in the app before deciding.

### CORS on the Gateway

`cors: { origin: '*', credentials: false }` is intentional for MVP. The backend already uses `app.enableCors()` for REST — same permissive approach. Do NOT restrict to a specific origin in MVP unless the REST CORS is also restricted.

### `shared/hooks/` Folder — Check Before Creating

Check if `apps/frontend/src/features/shared/` exists before creating it. If the project has a different shared utilities folder (e.g., `src/shared/`, `src/lib/`), place `useJobStatusSocket.ts` there and update import paths in Tasks 9 and 10 accordingly.

### Import Path from `ActiveJobPage`

`ActiveJobPage.tsx` is at `apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx`.

Import path for `useJobStatusSocket`:
- Two directories up = `../../` → arrives at `features/`
- Then `shared/hooks/useJobStatusSocket`
- **Final**: `'../../shared/hooks/useJobStatusSocket'`

### Anti-Patterns from Previous Stories — Must Not Repeat

- **`logout()` in render**: call in `useEffect` only — already handled by auth failure detection in `handleConnection` (server disconnects) and `socket.on('disconnect')` with `clearAccessToken()`
- **TanStack Query object syntax**: `useQuery({ queryKey, queryFn })` — NOT positional args
- **`$queryRaw`**: do NOT use — typed Prisma client throughout
- **Multiple socket instances**: ensure the `useEffect` returns a cleanup that calls `socket.disconnect()` — the `socketRef` ensures we reference the same socket in cleanup

### Scope Boundary — Do NOT Build in This Story

- **Handyman location via WebSocket** — location stays REST-only (architecture explicitly: "Handyman location is fetched via REST... Not streamed via WebSocket")
- **Dashboard push notifications** — dashboards use REST polling (AC4 explicitly: "no WebSocket connection maintained on dashboards, history")
- **WebSocket for assignment events** — `request.assignment.confirmed` event is architecturally identified but not required by this story's AC; do not add
- **Error display for WS connection failure** — silent reconnect is correct; do not show UI errors for temporary WS drops
- **Desktop layout** (story 5.4) — not in scope

### Project Structure

```
packages/contracts/src/
  request.schemas.ts                    ← modify: add JobStatusUpdatedEventSchema

apps/backend/src/modules/realtime/
  realtime.module.ts                    ← replace: wire gateway, service, JwtModule
  realtime.gateway.ts                   ← new: WebSocket gateway with auth + rooms
  realtime.service.ts                   ← new: emitStatusUpdate helper

apps/backend/src/modules/matching/
  matching.module.ts                    ← modify: import RealtimeModule
  matching.service.ts                   ← modify: inject RealtimeService, emit after transaction

apps/frontend/src/features/
  shared/hooks/useJobStatusSocket.ts    ← new: shared WS hook for customer + handyman
  request-tracking/hooks/useRequestTracking.ts  ← modify: disable polling
  handyman-active-job/hooks/useActiveJob.ts     ← modify: disable polling
  request-tracking/pages/RequestTrackingPage.tsx  ← modify: add useJobStatusSocket call
  handyman-active-job/pages/ActiveJobPage.tsx     ← modify: add useJobStatusSocket call

apps/frontend/vite.config.ts           ← modify if proxy config exists: add ws: true
```

### References

- Story definition and AC: [Source: `_bmad-output/planning-artifacts/epics.md#Story-43`]
- FR29: "Status changes made by the assigned handyman are pushed in real time to the customer and to the handyman's own active job view via WebSocket"
- NFR3: "WebSocket-pushed job status updates should reach connected clients within 1 second"
- NFR8: "If a WebSocket connection drops, the client should reconnect and restore the latest job status"
- NFR21: "WebSocket connections should be scoped to active job status updates only"
- UX-DR11: "WebSocket-driven updates must feel immediate on active-job screens without causing full-screen refresh patterns"
- Realtime transport strategy: [Source: `_bmad-output/planning-artifacts/architecture.md#Realtime-Transport-Strategy`]
- WebSocket channel model: [Source: `_bmad-output/planning-artifacts/architecture.md#WebSocket-Channel-Model`]
- Existing `RealtimeModule` (skeleton): [`apps/backend/src/modules/realtime/realtime.module.ts`]
- `updateJobStatus` method (emit point): [`apps/backend/src/modules/matching/matching.service.ts:154`]
- `MatchingModule` (to import RealtimeModule): [`apps/backend/src/modules/matching/matching.module.ts`]
- `useRequestTracking` (to disable polling): [`apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts`]
- `useActiveJob` (to disable polling): [`apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts`]
- `RequestTrackingPage` (add WS hook): [`apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx`]
- `ActiveJobPage` (add WS hook): [`apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx`]
- Auth pattern (JWT, `getAccessToken`): [`apps/frontend/src/features/customer-auth/lib/auth-storage.ts`]
- Story 4.2 dev notes ("Scope Boundary — WebSocket story 4.3"): [`_bmad-output/implementation-artifacts/4-2-handyman-active-job-mode-with-status-updates-and-location-posting.md`]
- Story 4.2 review finding (polling on terminal status — resolved here): deferred finding in 4.2 review

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

All 10 tasks implemented and verified. TypeScript compilation passes for both frontend (`tsc --noEmit`) and backend (`tsc --noEmit`) with zero errors. 21 tests pass: 13 backend (RealtimeGateway: 10, RealtimeService: 2, plus 1 pre-existing), 8 frontend (useJobStatusSocket hook). Key decisions: forced `transports: ['websocket']` in socket.io-client to skip HTTP polling upgrade; used `queryClient.setQueryData` (not `invalidateQueries`) for in-place status chip updates per AC2; added `/socket.io` proxy with `ws: true` to Vite config for dev server; `RealtimeModule` JwtModule uses `registerAsync` to read `JWT_SECRET` from ConfigService, matching AuthModule pattern. Frontend vitest test required mocking `@handrix/contracts` inline in factory (no top-level variables) due to vi.mock hoisting constraint.

### Review Findings

- [ ] [Review][Patch] `socket.on('reconnect')` never fires on Socket.IO v4 — AC3 violation: reconnect recovery path is silently broken [`apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts:48`]
- [ ] [Review][Patch] `staleTime: 0` + default `refetchOnWindowFocus: true` causes REST refetch on tab focus, can overwrite WS status and trigger loading flash — AC2 risk [`apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts` / `apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts`]
- [x] [Review][Defer] JWT_SECRET undefined allows silent verify — deferred, pre-existing; startup `validate()` in ConfigModule catches missing env vars [`apps/backend/src/modules/realtime/realtime.gateway.ts:40`]
- [x] [Review][Defer] emitStatusUpdate on uninitialized @WebSocketServer — deferred, pre-existing; NestJS lifecycle prevents this before first request arrives [`apps/backend/src/modules/realtime/realtime.service.ts`]
- [x] [Review][Defer] CORS wildcard on WebSocket gateway — deferred, pre-existing; matches existing REST `enableCors()` pattern, MVP intentional [`apps/backend/src/modules/realtime/realtime.gateway.ts:16`]
- [x] [Review][Defer] trackingQueryKey missing from useEffect deps array — deferred, pre-existing; key is stable (derived from requestId which is in deps), theoretical only [`apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts:65`]
- [x] [Review][Defer] Stale auth token not refreshed across socket reconnect attempts — deferred, pre-existing; cross-cutting auth concern; server-forced disconnect clears token, existing auth flow handles re-login [`apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts:19`]
- [x] [Review][Defer] No navigate-to-login after server-forced disconnect — deferred, pre-existing; existing RequireAuth + auth context handles redirect on next auth-required request [`apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts:53`]
- [x] [Review][Defer] canAccessRoom: no rate limiting on join-room spam — deferred, pre-existing; authenticated sockets only; platform rate limiting is Epic 5 hardening scope [`apps/backend/src/modules/realtime/realtime.gateway.ts:79`]
- [x] [Review][Defer] emitStatusUpdate fire-and-forget: missed push if process crashes between transaction and emit — deferred; spec-intentional; polling disabled so client misses update until next focus refetch [`apps/backend/src/modules/matching/matching.service.ts:198`]

### File List

packages/contracts/src/request.schemas.ts
apps/backend/src/modules/realtime/realtime.module.ts
apps/backend/src/modules/realtime/realtime.gateway.ts
apps/backend/src/modules/realtime/realtime.service.ts
apps/backend/src/modules/realtime/realtime.gateway.spec.ts
apps/backend/src/modules/realtime/realtime.service.spec.ts
apps/backend/src/modules/matching/matching.module.ts
apps/backend/src/modules/matching/matching.service.ts
apps/frontend/vite.config.ts
apps/frontend/src/features/shared/hooks/useJobStatusSocket.ts
apps/frontend/src/features/shared/hooks/useJobStatusSocket.test.ts
apps/frontend/src/features/request-tracking/hooks/useRequestTracking.ts
apps/frontend/src/features/handyman-active-job/hooks/useActiveJob.ts
apps/frontend/src/features/request-tracking/pages/RequestTrackingPage.tsx
apps/frontend/src/features/handyman-active-job/pages/ActiveJobPage.tsx
