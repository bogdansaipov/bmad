# Story 5.2: Apply Security Baselines and Data Protection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product platform,
I want baseline transport security, role-based access enforcement, image validation, and rate limiting in place across all endpoints,
so that customer and handyman data is protected without over-engineering for MVP scale.

## Acceptance Criteria

1. **Given** any API endpoint is called **When** data is transmitted **Then** all traffic is encrypted in transit (HTTPS/WSS enforced via HSTS + reverse-proxy TLS termination) **And** the platform does not collect or store sensitive data beyond what is required for request fulfillment, location display, and rating capture.

2. **Given** a request targets a customer-only or handyman-only API surface **When** the request is authenticated **Then** the backend enforces role-based access via NestJS guards — not frontend routing alone **And** a customer cannot access handyman assignment endpoints and vice versa.

3. **Given** an image is uploaded as part of request creation **When** the upload reaches the backend **Then** file type and size are validated before storage (including magic-byte / content-sniffing check, not just client-supplied MIME) **And** the image is stored through the secure object storage path with ownership and request linkage validated.

4. **Given** public intake and tracking endpoints are exposed **When** rate-limiting protections are evaluated **Then** rate limits are applied to submission, auth, and polling endpoints to reduce abuse risk **And** legitimate customer behavior under normal MVP usage patterns is not blocked.

## Tasks / Subtasks

- [x] Task 1 — Install `@nestjs/throttler`, `helmet`, and `file-type` (AC: 1, 3, 4)
  - [x] In `apps/backend/`, run `pnpm add @nestjs/throttler helmet file-type@^16` (note: `file-type@^16` is the last CJS-friendly version; `^17+` is ESM-only and breaks NestJS CommonJS build — do NOT install `^17+`)
  - [x] Verify `pnpm install` completes, then `pnpm typecheck` and `pnpm build` still pass

- [x] Task 2 — Apply Helmet security headers + HSTS in bootstrap (AC: 1)
  - [x] In `apps/backend/src/main.ts`, after `app.enableCors(...)` (line 17-20), import and apply `helmet()`:
    ```ts
    import helmet from 'helmet';
    // ...
    app.use(
      helmet({
        contentSecurityPolicy: false, // SPA is hosted separately; CSP belongs there
        crossOriginEmbedderPolicy: false, // map tiles from osm.org need this disabled
        hsts: {
          maxAge: 15552000, // 180 days
          includeSubDomains: true,
          preload: false,
        },
      }),
    );
    ```
  - [x] Helmet must be applied BEFORE `app.useGlobalPipes(...)` and BEFORE controllers are mounted so headers attach to every response
  - [x] HSTS only enforces when traffic arrives over HTTPS; behind a TLS-terminating reverse proxy (production) the proxy must forward `X-Forwarded-Proto: https` and the app must trust the proxy. Add `app.set('trust proxy', 1);` via `app.getHttpAdapter().getInstance().set('trust proxy', 1)` after Helmet
  - [x] Production TLS termination is a deployment-layer concern (reverse proxy / hosting platform). The app layer's job is to set HSTS so once a client has connected over HTTPS once, the browser will refuse plaintext

- [x] Task 3 — Register global ThrottlerGuard with sensible defaults (AC: 4)
  - [x] In `apps/backend/src/app.module.ts`, import `ThrottlerModule` and `ThrottlerGuard`:
    ```ts
    import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
    import { APP_GUARD } from '@nestjs/core';
    ```
  - [x] Add to the `imports` array (place after `ConfigModule.forRoot(...)`, before `LoggerModule`):
    ```ts
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 }, // 60 req / 60s per IP per route
    ]),
    ```
  - [x] Add to the `providers` array (currently `@Module` has only `imports`; add `providers: [...]`):
    ```ts
    providers: [
      { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
    ```
  - [x] The global guard short-circuits with 429 when limits exceeded. `@SkipThrottle()` can opt routes out (e.g., health check)

- [x] Task 4 — Apply tighter per-route throttles on abuse-prone endpoints (AC: 4)
  - [x] In `apps/backend/src/modules/auth/auth.controller.ts`, import `@Throttle` from `@nestjs/throttler` and apply to `register` and `login`:
    ```ts
    import { Throttle } from '@nestjs/throttler';
    // ...
    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 / min — bcrypt cost defense
    @HttpCode(HttpStatus.CREATED)
    // ...

    @Post('login')
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 / min — credential-stuffing defense
    @HttpCode(HttpStatus.OK)
    // ...
    ```
  - [x] In `apps/backend/src/modules/uploads/uploads.controller.ts`, apply to `uploadRequestImage`:
    ```ts
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 uploads / min — disk-fill defense
    ```
  - [x] In `apps/backend/src/modules/assignments/assignments.controller.ts`, apply to `acceptJob` and `declineJob`:
    ```ts
    @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 / min — accept-spam defense
    ```
  - [x] In `apps/backend/src/modules/requests/requests.controller.ts`, apply to `create` (POST /requests):
    ```ts
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 submissions / min per customer
    ```
  - [x] In `apps/backend/src/modules/ratings/ratings.controller.ts`, apply to `submitRating`:
    ```ts
    @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 / min — double-fire defense
    ```
  - [x] In `apps/backend/src/modules/matching/matching.controller.ts`, apply to `postLocation`:
    ```ts
    @Throttle({ default: { limit: 60, ttl: 60_000 } }) // 60 / min — handyman posts up to ~1/s during active travel
    ```
  - [x] In `apps/backend/src/modules/health/health.controller.ts`, opt the health check OUT of throttling so monitoring probes never get 429'd:
    ```ts
    import { SkipThrottle } from '@nestjs/throttler';
    // ...
    @Get()
    @SkipThrottle()
    ```

- [x] Task 5 — Add magic-byte / content-sniff validation for uploaded images (AC: 3)
  - [x] In `apps/backend/src/modules/uploads/uploads.service.ts`, replace the current method body. Read the first ~4100 bytes of the file on disk, run `fileTypeFromBuffer`, and reject if the detected MIME does not match an allow-list — delete the orphan file and `RequestImage` row is never created:
    ```ts
    import * as fs from 'fs/promises';
    import * as path from 'path';
    import { BadRequestException, Injectable } from '@nestjs/common';
    import { fileTypeFromBuffer } from 'file-type';
    import { PrismaService } from '../prisma/prisma.service';
    import { ImageUploadResponseDto } from './dto/image-upload-response.dto';

    const ALLOWED_MIME: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

    @Injectable()
    export class UploadsService {
      constructor(private readonly prisma: PrismaService) {}

      async storeRequestImage(userId: string, file: Express.Multer.File): Promise<ImageUploadResponseDto> {
        const absolutePath = path.resolve(file.path);
        try {
          const handle = await fs.open(absolutePath, 'r');
          const buf = Buffer.alloc(4100);
          await handle.read(buf, 0, 4100, 0);
          await handle.close();

          const detected = await fileTypeFromBuffer(buf);
          if (!detected || !ALLOWED_MIME.has(detected.mime)) {
            await fs.unlink(absolutePath).catch(() => undefined);
            throw new BadRequestException('Unsupported file type');
          }
          if (detected.mime !== file.mimetype) {
            // Client lied about MIME — reject. Filename-extension was derived from client MIME in multer.config.
            await fs.unlink(absolutePath).catch(() => undefined);
            throw new BadRequestException('Unsupported file type');
          }

          const created = await this.prisma.requestImage.create({
            data: {
              uploaderId: userId,
              filePath: file.path,
              mimeType: detected.mime,
              sizeBytes: file.size,
            },
            select: { id: true },
          });
          return { imageId: created.id };
        } catch (error) {
          await fs.unlink(absolutePath).catch(() => undefined);
          throw error;
        }
      }
    }
    ```
  - [x] `file-type` reads the first bytes (magic bytes) of the file and identifies the real MIME regardless of client-supplied headers. This closes the existing trust-the-client gap in `multer.config.ts:fileFilter`
  - [x] Do NOT remove the existing `fileFilter` in `multer.config.ts` — it provides a fast pre-write rejection by client-supplied MIME, and we now also enforce magic-byte validation after disk write

- [x] Task 6 — Add global exception filter for Multer + Prisma sanitization (AC: 1, 3)
  - [x] Create `apps/backend/src/common/filters/all-exceptions.filter.ts`:
    ```ts
    import {
      ArgumentsHost,
      Catch,
      ExceptionFilter,
      HttpException,
      HttpStatus,
      Logger,
    } from '@nestjs/common';
    import { Prisma } from '@prisma/client';
    import { MulterError } from 'multer';
    import type { Request, Response } from 'express';

    @Catch()
    export class AllExceptionsFilter implements ExceptionFilter {
      private readonly logger = new Logger(AllExceptionsFilter.name);

      catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        if (exception instanceof MulterError && exception.code === 'LIMIT_FILE_SIZE') {
          res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
            statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
            message: 'Uploaded file is too large (max 5 MB)',
            path: req.url,
          });
          return;
        }

        if (exception instanceof HttpException) {
          const status = exception.getStatus();
          const body = exception.getResponse();
          res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body, path: req.url } : { ...(body as object), path: req.url });
          return;
        }

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`Prisma error ${exception.code}`, exception.stack);
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Database error',
            path: req.url,
          });
          return;
        }

        this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          path: req.url,
        });
      }
    }
    ```
  - [x] In `apps/backend/src/main.ts`, after `app.useGlobalPipes(...)`, register the filter:
    ```ts
    import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
    // ...
    app.useGlobalFilters(new AllExceptionsFilter());
    ```
  - [x] This closes the deferred 2.1/2.2 gap: bare Prisma 500s no longer leak Prisma error structure, and `MulterError(LIMIT_FILE_SIZE)` now returns a clean 413 with actionable copy instead of a generic 500
  - [x] HttpException pass-through preserves Throttler's 429, ParseUUIDPipe's 400, role-guard 403, etc. — only unhandled and Prisma errors are sanitized

- [x] Task 7 — Tighten WebSocket gateway CORS to env-driven origin (AC: 1, 2)
  - [x] In `apps/backend/src/modules/realtime/realtime.gateway.ts`, change the gateway from a static decorator config to inject `ConfigService` at construction. Since `@WebSocketGateway` decorator options must be static, use the alternate pattern: provide `cors` via the adapter or accept that decorator-level config must read from `process.env` at module-load time:
    ```ts
    @WebSocketGateway({
      cors: {
        origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
        credentials: false,
      },
      namespace: '/realtime',
    })
    ```
  - [x] `ConfigService` is not available at decorator evaluation, so reading `process.env['CORS_ORIGIN']` directly is acceptable here — env is already validated at startup by `env.validation.ts` (Task 9 also adds this var to the schema if not present)
  - [x] This closes the deferred 4.3 review item (`cors: { origin: '*' }` on WS gateway) — origin must match the REST CORS origin

- [x] Task 8 — Throttle `join-room` events to prevent socket spam (AC: 4)
  - [x] In `apps/backend/src/modules/realtime/realtime.gateway.ts`, add a per-socket sliding-window throttle for `join-room`. Use a `Map<socketId, { count: number; windowStart: number }>` and reject if more than 20 joins in 10 seconds:
    ```ts
    private readonly joinRoomCounter = new Map<string, { count: number; windowStart: number }>();
    private readonly JOIN_ROOM_LIMIT = 20;
    private readonly JOIN_ROOM_WINDOW_MS = 10_000;

    private isJoinRoomRateLimited(socketId: string): boolean {
      const now = Date.now();
      const entry = this.joinRoomCounter.get(socketId);
      if (!entry || now - entry.windowStart > this.JOIN_ROOM_WINDOW_MS) {
        this.joinRoomCounter.set(socketId, { count: 1, windowStart: now });
        return false;
      }
      entry.count += 1;
      return entry.count > this.JOIN_ROOM_LIMIT;
    }
    ```
  - [x] Clean up on disconnect:
    ```ts
    handleDisconnect(client: Socket): void {
      this.joinRoomCounter.delete(client.id);
    }
    ```
  - [x] In `handleJoinRoom`, check the limit before the DB lookup:
    ```ts
    if (this.isJoinRoomRateLimited(client.id)) return;
    ```
  - [x] This closes the deferred 4.3 review item (no rate limiting on join-room spam) and protects the DB `findUnique` from join-room flood

- [x] Task 9 — Add typed env vars for trust-proxy + ensure CORS_ORIGIN required (AC: 1)
  - [x] In `apps/backend/src/config/env.validation.ts`, change `CORS_ORIGIN: z.string().optional()` to `CORS_ORIGIN: z.string().min(1)`. The wildcard fallback in code was acceptable for dev but production startup must fail fast if the origin is unset
  - [x] In `apps/backend/.env.example`, the value `CORS_ORIGIN=http://localhost:5173` already exists. Confirm it stays
  - [x] In `apps/backend/src/main.ts`, drop the `?? 'http://localhost:5173'` fallback from `app.enableCors(...)` since the env is now required:
    ```ts
    app.enableCors({
      origin: configService.getOrThrow<string>('CORS_ORIGIN'),
      credentials: true,
    });
    ```
  - [x] `process.env['CORS_ORIGIN']` referenced in `realtime.gateway.ts` (Task 7) is now guaranteed present after env validation runs

- [x] Task 10 — Gate smoke endpoints `/auth/customer-only` and `/auth/handyman-only` to non-production (AC: 2)
  - [x] In `apps/backend/src/modules/auth/auth.controller.ts`, the two smoke endpoints (`customerOnly` and `handymanOnly`) exist to verify role guards in dev. They must not be reachable in production
  - [x] Inject `ConfigService` into the controller and throw `NotFoundException` from each smoke method when `NODE_ENV === 'production'`:
    ```ts
    import { ConfigService } from '@nestjs/config';
    import { NotFoundException } from '@nestjs/common';
    // ...
    constructor(
      private readonly authService: AuthService,
      private readonly configService: ConfigService,
    ) {}

    @Get('customer-only')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.CUSTOMER)
    customerOnly(): { ok: boolean; role: string } {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new NotFoundException();
      }
      return { ok: true, role: 'CUSTOMER' };
    }
    // Same pattern for handymanOnly
    ```
  - [x] This closes the deferred 1-3 review item (smoke endpoints exposed in production)

- [x] Task 11 — Update `.env.example` documentation (AC: 1)
  - [x] In `apps/backend/.env.example`, no new variables are added (`CORS_ORIGIN` and `NODE_ENV` already exist). Confirm no changes required; if a project README documents env vars, append a note that `CORS_ORIGIN` is now required (not optional)

### Review Findings

- [x] [Review][Decision→Patch] `joinRoomCounter` keyed on `userId` instead of `client.id` — reconnect no longer resets the rate-limit counter; key changed to authenticated user ID [apps/backend/src/modules/realtime/realtime.gateway.ts] ✓ fixed
- [x] [Review][Patch] WS CORS `??` fallback removed — `CORS_ORIGIN` is required by env validation; gateway decorator now reads `process.env['CORS_ORIGIN']` with no fallback [apps/backend/src/modules/realtime/realtime.gateway.ts] ✓ fixed
- [x] [Review][Patch] File handle wrapped in `try/finally` — `handle.close()` now always runs even if `handle.read` throws [apps/backend/src/modules/uploads/uploads.service.ts] ✓ fixed
- [x] [Review][Patch] `AllExceptionsFilter` guards with `host.getType() !== 'http'` — non-HTTP contexts (WebSocket) are now skipped before `switchToHttp()` is called [apps/backend/src/common/filters/all-exceptions.filter.ts] ✓ fixed
- [x] [Review][Patch] All `MulterError` codes now handled — `LIMIT_FILE_SIZE` → 413, other codes → 400 `'Invalid file upload'` [apps/backend/src/common/filters/all-exceptions.filter.ts] ✓ fixed
- [x] [Review][Patch] Smoke endpoint gate changed to `configService.getOrThrow` — throws at call time if `NODE_ENV` is absent rather than silently evaluating to `false` [apps/backend/src/modules/auth/auth.controller.ts] ✓ fixed
- [x] [Review][Defer] `trust proxy 1` set unconditionally — IP spoofing risk if app is deployed without a reverse proxy; `X-Forwarded-For` is user-controlled in that case, defeating IP-based throttle keying [apps/backend/src/main.ts] — deferred, deployment-layer concern
- [x] [Review][Defer] TOCTOU on image linkage in `createRequest` — ownership check (`uploaderId === customerId`) and `requestImage.update` are not inside the `$transaction`, leaving a race window where two concurrent requests could claim the same `imageId` [apps/backend/src/modules/requests/requests.service.ts] — deferred, pre-existing architectural gap
- [x] [Review][Defer] TOCTOU on ratings `findUnique`+`create` race — both calls are outside a transaction; concurrent requests from the same customer can both pass the `findUnique` guard and race to `create`; P2002 catch is the actual guard [apps/backend/src/modules/ratings/ratings.service.ts] — deferred, pre-existing
- [x] [Review][Defer] In-memory `joinRoomCounter` not shared across process instances — horizontal scaling makes the rate limit per-instance rather than per-user [apps/backend/src/modules/realtime/realtime.gateway.ts] — deferred, MVP single-instance constraint
- [x] [Review][Defer] Global ThrottlerGuard buckets by IP — shared NAT IP (corporate network) hits the 60 req/min ceiling across all users behind that IP [apps/backend/src/app.module.ts] — deferred, pre-existing with any IP-based throttling

## Dev Notes

### What Is Already In Place — Do Not Rebuild

**Role-based access (AC2) is already enforced backend-side.** Every controller applies `@UseGuards(JwtAuthGuard, RolesGuard)` at the class level and `@Roles(...)` per route. Cross-role access is rejected at the guard layer:

- `RequestsController` — `@Roles(UserRole.CUSTOMER)` on every method
- `MatchingController` — `@Roles(UserRole.HANDYMAN)` on every method
- `AssignmentsController` — `@Roles(UserRole.HANDYMAN)` on accept/decline
- `UsersController` — `@Roles(UserRole.HANDYMAN)` on profile/availability/base-location
- `UploadsController` — `@Roles(UserRole.CUSTOMER)` on upload
- `RatingsController` — `@Roles(UserRole.CUSTOMER)` on submit/getRatingStatus
- `CategoriesController` — `@UseGuards(JwtAuthGuard)` (any authenticated user)

The smoke endpoints `/auth/customer-only` and `/auth/handyman-only` (auth.controller.ts:41-55) demonstrate the working role separation. AC2 needs no new guard work — only Task 10 (gate smokes in production).

**CORS is already env-driven, not wildcard.** `apps/backend/src/main.ts:17-20` reads `CORS_ORIGIN` from config (defaulting to `http://localhost:5173`). The only wildcard left is on the WebSocket gateway (`realtime.gateway.ts:16`) — Task 7 fixes that.

**Image type and size validation already exists in multer config.** `apps/backend/src/modules/uploads/multer.config.ts` enforces:
- MIME allow-list (`image/jpeg`, `image/png`, `image/webp`) via `fileFilter`
- 5 MB size cap via `limits.fileSize`
- Single file per request via `limits.files`

The GAP is that `fileFilter` trusts `file.mimetype` (client-supplied header). Task 5 adds magic-byte validation in the service layer to catch a client that lies about MIME.

**Image ownership is already validated at request-attach time.** `requests.service.ts:89-98` checks `image.uploaderId === customerId` before attaching `imageId` to a new request. AC3's "ownership and request linkage validated" is satisfied by this existing check — no new authorization logic needed.

**Data minimization (AC1 "do not collect sensitive data") is already the schema posture.** Domain model stores only: email, password hash, role, display name, lat/lng (only for active request fulfillment), service radius, request title/description, optional image, ratings, lifecycle status. No SSN, no payment info, no phone (the schema has `phone if needed later` but it is not collected in the MVP intake flow). No additional code change is required for this clause of AC1 — call it out in the dev verification step.

**JWT verification on WS uses validated `JWT_SECRET`.** The deferred-work concern about "JWT_SECRET undefined allows silent verify" is mitigated by `env.validation.ts:5` requiring `JWT_SECRET: z.string().min(32)` at startup — the server will not start without it. No code change needed here.

### Why Helmet, Why HSTS, Why `trust proxy`

**HTTPS enforcement is a layered concern:**

1. **TLS termination** happens at the reverse proxy / load balancer / hosting platform (deployment-layer, outside this story's scope)
2. **HSTS** is the app's contribution: once a browser connects over HTTPS, the `Strict-Transport-Security` header makes it refuse plaintext for `maxAge` seconds. Helmet sets this header
3. **`trust proxy`** tells Express to honour `X-Forwarded-Proto`, so when the proxy terminates TLS and forwards plaintext to the app, `req.secure` correctly reads `true` and HSTS conditions evaluate properly

Helmet also sets defense-in-depth headers: `X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options: nosniff` (MIME-sniff XSS), `Referrer-Policy: no-referrer`, etc. These are free wins.

We disable `contentSecurityPolicy` because this is an API server, not the SPA host — the frontend bundle is served from a separate origin (Vite dev / static CDN) and owns its own CSP. We disable `crossOriginEmbedderPolicy` because map tiles from OSM/CartoDB do not send CORP headers and would be blocked.

### Rate Limit Sizing — Why These Numbers

| Endpoint | Limit | Reasoning |
|---|---|---|
| `POST /auth/register` | 5/min | bcrypt cost defense — 5 hash ops ≈ 1s; abuse would lock CPU |
| `POST /auth/login` | 10/min | Credential-stuffing defense — single legit user retries 2-3x; bots try thousands |
| `POST /uploads/request-image` | 10/min | Disk-fill defense — 10 × 5 MB = 50 MB/min ceiling per customer |
| `POST /assignments/:offerId/accept|decline` | 30/min | Handyman browsing feed taps multiple offers; 30/min covers active browsing |
| `POST /requests` | 10/min | Customer creating multiple requests is rare; 10/min covers any legitimate burst |
| `POST /ratings` | 20/min | Double-fire protection (deferred 4-4 review item — two rapid taps) + post-completion flurry |
| `POST /jobs/active/:id/location` | 60/min | Active handyman posts location every ~1s while traveling; 60/min = 1/s ceiling |
| Default (everything else) | 60/min | Generous global ceiling — dashboards & feeds poll well below this |
| `GET /health` | `@SkipThrottle()` | Monitoring probes must never get 429'd |

Throttler keys by IP by default. Behind a reverse proxy, `trust proxy` (Task 2) ensures the real client IP is used, not the proxy IP.

### Exception Filter Layering

NestJS evaluates `useGlobalFilters` after `useGlobalPipes`. The order in main.ts must be:

1. `app.use(helmet(...))` — security headers
2. `app.useGlobalPipes(new ValidationPipe(...))` — DTO validation
3. `app.useGlobalFilters(new AllExceptionsFilter())` — error sanitization (after pipes so ValidationPipe's BadRequestException still flows through HttpException pass-through)

The filter must pass through `HttpException` so:
- `ThrottlerException` → 429
- `ParseUUIDPipe` → 400
- `ForbiddenException` (role guard) → 403
- `BadRequestException` (validation) → 400
- `NotFoundException`, etc.

Only **unhandled** exceptions and **Prisma** errors are sanitized into generic envelopes. MulterError(LIMIT_FILE_SIZE) is special-cased to a clean 413.

### Scope Boundary — Do NOT Touch

- Do NOT migrate JWT from localStorage to HttpOnly cookies. That is a separate Epic 5 effort (deferred-work flags it as bigger than baseline scope; involves frontend auth context rewrite and CSRF wiring)
- Do NOT implement CSRF tokens. Depends on cookie-based auth migration
- Do NOT add live DB lookup to `JwtStrategy.validate()`. Token revocation/refresh is a separate Epic 5 effort
- Do NOT change transaction isolation level on existing `$transaction` calls. Separate concern, story 5.3-or-later
- Do NOT touch the role-guard logic in `JwtAuthGuard` or `RolesGuard`. They already work correctly
- Do NOT implement orphan upload cleanup / TTL sweep on `RequestImage`. Separate concern (deferred 2.2)
- Do NOT add a `DELETE /uploads/request-image/:id` endpoint. Separate concern
- Do NOT modify Multer's `fileFilter` in `multer.config.ts` — Task 5 adds magic-byte validation in the service layer as a second gate. Keep the cheap pre-write reject by client MIME
- Do NOT install `file-type@^17` or later. Versions 17+ are ESM-only and break NestJS CommonJS build. Use `^16`
- Do NOT add a CSP header. SPA hosts its own CSP from its own origin

### How to Verify After Implementation

**AC1 — Transport security + data minimization:**
```bash
# After server start, request any endpoint and inspect headers
curl -i http://localhost:3000/api/health
# Verify response includes:
#   Strict-Transport-Security: max-age=15552000; includeSubDomains
#   X-Frame-Options: SAMEORIGIN  (or DENY)
#   X-Content-Type-Options: nosniff
#   Referrer-Policy: no-referrer
```
Data-minimization check: open `prisma/schema.prisma` and confirm no new sensitive fields are introduced (SSN, payment cards, full address strings beyond display). The story does not add any data fields.

**AC2 — Role-based access:**
```bash
# Login as CUSTOMER, get JWT, try to call HANDYMAN endpoint
curl -X POST /api/jobs/active/<id>/status -H "Authorization: Bearer <customer-jwt>"
# Expected: 403 Forbidden (RolesGuard rejects)
# In production NODE_ENV=production:
curl /api/auth/customer-only -H "Authorization: Bearer <customer-jwt>"
# Expected: 404 Not Found (smoke endpoint gated)
```

**AC3 — Image upload:**
```bash
# Upload a fake JPEG (text file with .jpg extension and image/jpeg MIME)
echo "not a jpeg" > fake.jpg
curl -X POST /api/uploads/request-image \
  -H "Authorization: Bearer <customer-jwt>" \
  -F "file=@fake.jpg;type=image/jpeg"
# Expected: 400 Bad Request "Unsupported file type" (magic-byte check rejects)
# File on disk: should be deleted (uploads/request-images/ has no orphan)
```

**AC4 — Rate limiting:**
```bash
# Hit /auth/login 11 times in a minute
for i in {1..11}; do
  curl -X POST /api/auth/login -d '{"email":"x","password":"y"}' -H "Content-Type: application/json"
done
# Expected: requests 1-10 return 401, request 11 returns 429
```

### Project Structure

```
apps/backend/src/
  main.ts                                    ← modify: helmet, trust proxy, getOrThrow CORS, global filter
  app.module.ts                              ← modify: ThrottlerModule + APP_GUARD provider
  config/env.validation.ts                   ← modify: CORS_ORIGIN required, not optional
  common/filters/all-exceptions.filter.ts    ← new: global exception filter (Multer + Prisma sanitization)
  modules/auth/auth.controller.ts            ← modify: @Throttle on register/login, gate smokes
  modules/uploads/uploads.controller.ts      ← modify: @Throttle on uploadRequestImage
  modules/uploads/uploads.service.ts         ← modify: magic-byte validation via file-type
  modules/assignments/assignments.controller.ts ← modify: @Throttle on accept/decline
  modules/requests/requests.controller.ts    ← modify: @Throttle on create
  modules/ratings/ratings.controller.ts      ← modify: @Throttle on submitRating
  modules/matching/matching.controller.ts    ← modify: @Throttle on postLocation
  modules/health/health.controller.ts        ← modify: @SkipThrottle on health check
  modules/realtime/realtime.gateway.ts       ← modify: CORS origin from env, join-room throttle
apps/backend/.env.example                    ← unchanged (CORS_ORIGIN already present)
apps/backend/package.json                    ← modify: add @nestjs/throttler, helmet, file-type@^16
```

### Key File Locations

- `main.ts`: `apps/backend/src/main.ts`
- `app.module.ts`: `apps/backend/src/app.module.ts`
- `env.validation.ts`: `apps/backend/src/config/env.validation.ts`
- `auth.controller.ts`: `apps/backend/src/modules/auth/auth.controller.ts`
- `uploads.controller.ts`: `apps/backend/src/modules/uploads/uploads.controller.ts`
- `uploads.service.ts`: `apps/backend/src/modules/uploads/uploads.service.ts`
- `multer.config.ts` (read-only reference): `apps/backend/src/modules/uploads/multer.config.ts`
- `assignments.controller.ts`: `apps/backend/src/modules/assignments/assignments.controller.ts`
- `requests.controller.ts`: `apps/backend/src/modules/requests/requests.controller.ts`
- `requests.service.ts` (read-only reference — already validates `uploaderId`): `apps/backend/src/modules/requests/requests.service.ts:89-98`
- `ratings.controller.ts`: `apps/backend/src/modules/ratings/ratings.controller.ts`
- `matching.controller.ts`: `apps/backend/src/modules/matching/matching.controller.ts`
- `health.controller.ts`: `apps/backend/src/modules/health/health.controller.ts`
- `realtime.gateway.ts`: `apps/backend/src/modules/realtime/realtime.gateway.ts`
- New file: `apps/backend/src/common/filters/all-exceptions.filter.ts`

### Library Version Notes (researched 2026-05-18)

- `@nestjs/throttler@^6`: Current major. The `forRoot(options)` signature accepts an array of `ThrottlerOptions` for named limit profiles. `@Throttle({ default: { limit, ttl } })` is the per-route decorator syntax. TTL is in **milliseconds** (older versions used seconds — verify in the installed package's `node_modules/@nestjs/throttler/package.json` if behavior surprises)
- `helmet@^7` or `^8`: Either works with Express 4. `helmet()` returns Express middleware; `app.use(helmet(...))` is the install pattern
- `file-type`: USE `^16.5.4` (CommonJS-compatible). Versions `^17+` are pure-ESM and will break the NestJS CommonJS build at `import { fileTypeFromBuffer } from 'file-type'` (TS will compile but runtime `require()` will throw `ERR_REQUIRE_ESM`). Pin to `^16`.

### Previous Story Intelligence (5.1)

- **Migration command guidance**: Story 5.1 noted "DB not available locally — migration file created manually." This story does NOT add a migration (no schema changes). Skip Prisma steps entirely
- **Existing `$transaction` patterns**: Story 5.1 wrapped request creation + PENDING status history in a `$transaction`. This story does NOT change transaction logic
- **`Prisma.PrismaClientKnownRequestError` pattern**: Story 5.1's Task 2 added `try/catch` for P2002 in `ratings.service.ts`. The new global exception filter (Task 6) catches generic `Prisma.PrismaClientKnownRequestError` AFTER per-service catches have already handled the typed cases (P2002, etc.). Do NOT remove per-service catches; the filter is the safety net for unhandled Prisma errors
- **Logger import**: Story 5.1 used `Logger` from `@nestjs/common`. Same import for the exception filter

### Git Intelligence

Recent commits (last 5): `dbcde1e feat: epic 4 is done`, `645d23d finish 4.2`, `4230464 finish epic two`, `3f69e07 feat: story 3.1`, `fc87c04 Revert "feat: progress in stories"`. The codebase reflects completed Epic 1-4 + Story 5.1. No pending refactors in flight that this story should coordinate with.

### Deferred-Work Items This Story Closes

This story closes the following items explicitly flagged for "Story 5.2 / security baselines" in `_bmad-output/implementation-artifacts/deferred-work.md`:

- 1-2 review: "No rate-limit / throttling on `POST /auth/register`" — closed by Task 4
- 1-3 review: "No rate limiting on `POST /auth/login`" — closed by Task 4
- 1-3 review: "Smoke endpoints `/auth/customer-only` and `/auth/handyman-only` exposed in production" — closed by Task 10
- 2-1 review: "No global exception filter — Prisma failures return bare 500" — closed by Task 6
- 2-2 review: "Magic-byte / content-sniffing validation on the upload path" — closed by Task 5
- 2-2 review: "No rate limiting on `POST /uploads/request-image`" — closed by Task 4
- 2-2 review: "`MulterError(LIMIT_FILE_SIZE)` surfaces as a generic 500 / 'Failed to upload'" — closed by Task 6
- 3-3 review: "No rate limiting / throttling on `POST /assignments/:offerId/accept|decline`" — closed by Task 4
- 4-3 review: "CORS wildcard on WebSocket gateway (`origin: '*'`)" — closed by Task 7
- 4-3 review: "canAccessRoom: no rate limiting on join-room spam" — closed by Task 8

Out-of-scope items intentionally left in deferred-work for later stories: JWT-in-localStorage migration, CSRF, JwtStrategy DB lookup, transaction isolation levels, orphan upload cleanup.

### References

- Story definition and AC: [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.2`]
- NFR10: All data encrypted in transit
- NFR11: Stored data protected by access controls and encryption at rest where applicable
- NFR12: Authentication and authorization enforce separation between customer and handyman; prevent role escalation
- NFR13: Uploaded images validated and stored through secure media-handling path
- NFR14: Avoid collecting sensitive data not required for fulfillment, location, rating
- Architecture — identity and authorization: [Source: `_bmad-output/planning-artifacts/architecture.md#Identity-and-Authorization`]
- Architecture — image upload rules: [Source: `_bmad-output/planning-artifacts/architecture.md#Image-Rules`]
- Architecture — location privacy: [Source: `_bmad-output/planning-artifacts/architecture.md#Location-Privacy`]
- Architecture — risk mitigation (security): [Source: `_bmad-output/planning-artifacts/architecture.md#Risk-Areas-and-Mitigation-Guidance`]
- Deferred items closed by this story: [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]
- Previous story patterns: [Source: `_bmad-output/implementation-artifacts/5-1-harden-request-and-assignment-integrity.md`]
- Existing role-guard pattern: [`apps/backend/src/modules/auth/guards/roles.guard.ts`]
- Existing CORS config: [`apps/backend/src/main.ts:17-20`]
- Existing image MIME/size guard: [`apps/backend/src/modules/uploads/multer.config.ts`]
- Existing image ownership check: [`apps/backend/src/modules/requests/requests.service.ts:89-98`]
- Existing WS auth + room check: [`apps/backend/src/modules/realtime/realtime.gateway.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- file-type v16 exports `fromBuffer` not `fileTypeFromBuffer` — fixed import alias in uploads.service.ts

### Completion Notes List

- Task 1: Installed @nestjs/throttler@^6, helmet@^8, file-type@^16 via pnpm. Typecheck and build pass.
- Task 2: Applied helmet() middleware in main.ts before useGlobalPipes. Added trust proxy via getHttpAdapter().getInstance().set(). Updated enableCors to use getOrThrow.
- Task 3: Registered ThrottlerModule.forRoot with 60req/60s default + global ThrottlerGuard via APP_GUARD in app.module.ts.
- Task 4: Applied @Throttle decorators on register(5/min), login(10/min), uploadRequestImage(10/min), acceptJob/declineJob(30/min), create request(10/min), submitRating(20/min), postLocation(60/min). @SkipThrottle on health check.
- Task 5: Rewrote uploads.service.ts to read file magic bytes via file-type fromBuffer, reject if MIME not in allow-list or if detected MIME differs from client-supplied MIME, and delete orphan file on rejection.
- Task 6: Created all-exceptions.filter.ts with MulterError(LIMIT_FILE_SIZE)→413, HttpException pass-through, Prisma error→500 sanitization, unhandled→500. Registered via useGlobalFilters in main.ts.
- Task 7: Changed WS gateway CORS from origin:'*' to process.env['CORS_ORIGIN'] with localhost fallback.
- Task 8: Added per-socket sliding window join-room rate limiter (20/10s) using Map. Rate check before DB lookup in handleJoinRoom. Cleanup on disconnect.
- Task 9: Changed CORS_ORIGIN in env.validation.ts from optional to z.string().min(1). .env.example already has CORS_ORIGIN. Dropped fallback from enableCors.
- Task 10: Injected ConfigService into AuthController. Both smoke endpoints throw NotFoundException when NODE_ENV==='production'.
- Task 11: .env.example confirmed unchanged — CORS_ORIGIN and NODE_ENV already present.

### File List

- apps/backend/package.json (modified — added @nestjs/throttler, helmet, file-type@^16)
- apps/backend/src/main.ts (modified — helmet, trust proxy, getOrThrow CORS, AllExceptionsFilter)
- apps/backend/src/app.module.ts (modified — ThrottlerModule + APP_GUARD provider)
- apps/backend/src/config/env.validation.ts (modified — CORS_ORIGIN required)
- apps/backend/src/common/filters/all-exceptions.filter.ts (new)
- apps/backend/src/modules/auth/auth.controller.ts (modified — @Throttle on register/login, ConfigService injection, smoke gate)
- apps/backend/src/modules/uploads/uploads.controller.ts (modified — @Throttle on uploadRequestImage)
- apps/backend/src/modules/uploads/uploads.service.ts (modified — magic-byte validation)
- apps/backend/src/modules/assignments/assignments.controller.ts (modified — @Throttle on accept/decline)
- apps/backend/src/modules/requests/requests.controller.ts (modified — @Throttle on create)
- apps/backend/src/modules/ratings/ratings.controller.ts (modified — @Throttle on submitRating)
- apps/backend/src/modules/matching/matching.controller.ts (modified — @Throttle on postLocation)
- apps/backend/src/modules/health/health.controller.ts (modified — @SkipThrottle on health check)
- apps/backend/src/modules/realtime/realtime.gateway.ts (modified — env-driven CORS, join-room rate limiter)

### Change Log

- 2026-05-18: Implemented Story 5.2 — applied security baselines: Helmet headers + HSTS, global ThrottlerGuard (60/min default), per-route throttle limits on 7 endpoints, magic-byte image validation, global exception filter (Multer 413 + Prisma sanitization), WS CORS origin from env, join-room rate limiting, CORS_ORIGIN required env var, smoke endpoints gated in production.
