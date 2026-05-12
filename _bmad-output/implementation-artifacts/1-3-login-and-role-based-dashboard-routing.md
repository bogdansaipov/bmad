# Story 1.3: Login and Role-Based Dashboard Routing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to log in with my email and password and be taken directly to my role's home screen,
so that I land on the right experience without extra navigation steps.

## Acceptance Criteria

1. **Given** a registered customer submits valid credentials at `POST /api/auth/login` **When** the backend validates the password against `users.password_hash` **Then** the backend re-reads the user row (id, email, role, account_status) and signs a JWT with payload `{ sub, email, role }` using `JwtPayload` from Story 1.2 **And** returns `{ userId, email, role, accessToken }` **And** the frontend stores the token under `localStorage` key `handrix_access_token` and routes the user to `/dashboard/customer`.

2. **Given** a registered handyman submits valid credentials **When** login completes successfully **Then** the same response envelope is returned with `role: 'HANDYMAN'` **And** the frontend routes the user to `/dashboard/handyman` **And** the JWT payload `role` claim is read from the DB row, not from any client input.

3. **Given** a user submits an unknown email OR a known email with the wrong password OR a non-`ACTIVE` `account_status` **When** the login form is submitted **Then** the backend returns HTTP 401 with the single message `Invalid email or password` for all three cases (no field-level hint) **And** no JWT is issued, no token is stored client-side, and no navigation occurs **And** the backend runs `bcrypt.compare` against a placeholder hash when the email is unknown so request timing does not leak email existence.

4. **Given** a logged-in user attempts to call a route protected for the other role (e.g., a `CUSTOMER` token hitting `GET /api/auth/handyman-only`, or a `HANDYMAN` token hitting `GET /api/auth/customer-only`) **When** the request reaches the backend **Then** `JwtAuthGuard` + `RolesGuard` deny the request with HTTP 403 before any handler runs **And** no role-restricted data is included in the response body **And** authorization is enforced by NestJS guards on the backend regardless of any frontend routing decisions (NFR12, FR3, FR5).

5. **Given** a frontend request to `GET /api/auth/me` returns HTTP 401 (expired, malformed, or tampered JWT) **When** the response is received **Then** the auth context clears `handrix_access_token` from `localStorage` and navigates the user to `/login` **And** no protected page renders any user data **And** any data already on screen is not persisted into a new session.

6. **Given** an unauthenticated user navigates to `/dashboard/customer` or `/dashboard/handyman` **When** the route renders **Then** the `RequireAuth` guard redirects them to `/login` without rendering the dashboard stub **And** a user authenticated with the opposite role is redirected to their own dashboard rather than denied at the UI (final API denial still happens server-side per AC4).

7. **Given** any login-related backend behavior is implemented **When** the test suite runs **Then** unit tests cover `AuthService.login()` (success, wrong password, unknown email, suspended/deleted account_status, bcrypt called on both paths to confirm constant-time behavior, JWT payload values come from DB re-read) **And** e2e tests cover `POST /auth/login` (200, 401 generic for unknown email/wrong password/suspended account, 400 validation), `GET /auth/me` (200 with valid JWT, 401 with missing/expired/tampered JWT), and role guard behavior on the two smoke endpoints (cross-role → 403; same-role → 200).

## Tasks / Subtasks

- [x] Task 1 — Add login DTO, contracts, and `AuthService.login()` (AC: 1, 2, 3)
  - [x] Create `apps/backend/src/modules/auth/dto/login.dto.ts` with `email` (`@Transform(trimLower)`, `@IsEmail()`) and `password` (`@IsString()`, `@MinLength(8)`, `@MaxLength(72)`) — reuse the `trim`/`trimLower` transform pattern from `register.dto.ts`
  - [x] Create `apps/backend/src/modules/auth/dto/login-response.dto.ts` identical in shape to `RegisterResponseDto` (`userId`, `email`, `role: UserRole`, `accessToken: string`) — do NOT re-export the register DTO under a new name; declare a distinct class so future divergence is safe
  - [x] Add `LoginRequestSchema` and `LoginResponseSchema` to `packages/contracts/src/auth.schemas.ts` and export from `packages/contracts/src/index.ts`. Use the existing `UserRoleEnum`. Login response schema is identical in shape to `RegisterResponseSchema` — declare it separately, do not re-export
  - [x] Add a module-level `PLACEHOLDER_HASH` constant in `auth.service.ts` (a pre-computed bcrypt hash of any throwaway string, salt rounds 10) so the unknown-email branch can still run `bcrypt.compare` for constant-time behavior. Document that the goal is *not* to make timing attacks impossible (bcrypt cost dominates), only to prevent the trivial 0ms-vs-N00ms email-existence leak. Rate limiting is deferred to Story 5.2
  - [x] Implement `AuthService.login(dto: LoginDto): Promise<LoginResponseDto>`:
    - `findUnique({ where: { email: dto.email }, select: { id: true, email: true, password_hash: true, role: true, account_status: true } })`
    - `const hashToCompare = user?.password_hash ?? PLACEHOLDER_HASH;`
    - `const ok = await bcrypt.compare(dto.password, hashToCompare);`
    - `if (!user || !ok || user.account_status !== AccountStatus.ACTIVE) throw new UnauthorizedException('Invalid email or password');`
    - Re-read the row (or use the already-selected fields — they are equivalent here because the read was a single statement under READ COMMITTED) and sign JWT with `JwtPayload` shape `{ sub: user.id, email: user.email, role: user.role }` using the **DB row values**, never `dto.email`
    - Return `{ userId, email, role, accessToken }` — do NOT include `password_hash`, `account_status`, or any other field
  - [x] Add `POST /auth/login` handler in `auth.controller.ts` decorated with `@ApiTags('auth')` (already set at class level), `@ApiOperation({ summary: 'Authenticate an existing user and return a JWT' })`, `@HttpCode(HttpStatus.OK)` (login is read-only authentication — use 200, not 201)

- [x] Task 2 — Wire `passport-jwt` strategy and `JwtAuthGuard` (AC: 4, 5)
  - [x] Add `PassportModule.register({ defaultStrategy: 'jwt' })` to `AuthModule.imports` (do NOT pass `session: true` — JWT is stateless)
  - [x] Create `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`:
    ```typescript
    @Injectable()
    export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
      constructor(config: ConfigService) {
        super({
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
        });
      }
      validate(payload: JwtPayload): AuthenticatedUser {
        return { userId: payload.sub, email: payload.email, role: payload.role };
      }
    }
    ```
  - [x] Define `AuthenticatedUser` interface in `apps/backend/src/modules/auth/types/authenticated-user.ts` (`{ userId: string; email: string; role: UserRole }`) and export from the module
  - [x] Create `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts`:
    ```typescript
    @Injectable()
    export class JwtAuthGuard extends AuthGuard('jwt') {}
    ```
  - [x] Register `JwtStrategy` in `AuthModule` providers (NestJS auto-wires it because it extends `PassportStrategy`); export `JwtAuthGuard` from `AuthModule`
  - [x] Move the `JwtPayload` interface from `auth.service.ts` into `apps/backend/src/modules/auth/types/jwt-payload.ts` and import it from both `auth.service.ts` (for signing) and `jwt.strategy.ts` (for validation) — single source of truth prevents the two halves from drifting

- [x] Task 3 — Add `@Roles` decorator, `RolesGuard`, and `@CurrentUser` param decorator (AC: 4)
  - [x] Create `apps/backend/src/modules/auth/decorators/roles.decorator.ts`:
    ```typescript
    export const ROLES_KEY = 'roles';
    export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
    ```
  - [x] Create `apps/backend/src/modules/auth/guards/roles.guard.ts` reading metadata via `Reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()])`. If no `@Roles()` is present, return `true` (open route). Else read `request.user` (set by `JwtAuthGuard`) and return `requiredRoles.includes(user.role)`. If `user` is undefined (guard ordering mistake), throw `UnauthorizedException` rather than silently passing
  - [x] Create `apps/backend/src/modules/auth/decorators/current-user.decorator.ts`:
    ```typescript
    export const CurrentUser = createParamDecorator(
      (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
        ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
    );
    ```
  - [x] Export `JwtAuthGuard`, `RolesGuard`, `Roles`, `CurrentUser`, `AuthenticatedUser`, `JwtPayload` from a barrel file `apps/backend/src/modules/auth/index.ts` so future modules (`users`, `requests`, `assignments`, …) import a stable surface — do NOT have them deep-import from `guards/...`

- [x] Task 4 — Add `GET /auth/me` and two role-gated smoke endpoints (AC: 1, 2, 4, 5)
  - [x] Add `GET /auth/me` to `auth.controller.ts` decorated with `@UseGuards(JwtAuthGuard)` returning the resolved `@CurrentUser()` payload as `{ userId, email, role }`. This is the endpoint the frontend calls on app boot to validate the stored token
  - [x] Add `GET /auth/customer-only` decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.CUSTOMER)`, returning `{ ok: true, role: 'CUSTOMER' }`. Keep the handler tiny — this exists to e2e-verify the guard chain works end-to-end and to give the frontend `RequireAuth` integration test a real cross-role 403 to assert on. It is NOT a permanent product surface; future stories will replace it with real role-scoped reads
  - [x] Add `GET /auth/handyman-only` symmetrically with `@Roles(UserRole.HANDYMAN)`
  - [x] Add a `SessionResponseSchema` and `SessionResponse` type to `packages/contracts/src/auth.schemas.ts` matching the `/auth/me` response (`{ userId, email, role }`); export from `index.ts`

- [x] Task 5 — Frontend login surface (AC: 1, 2, 3, 6)
  - [x] Create `apps/frontend/src/features/customer-auth/pages/LoginPage.tsx`. Shared login page for both roles — there is exactly one login form regardless of role; role comes from the JWT response, never from a form field
  - [x] Form fields: `email` (autoComplete=`email`), `password` (autoComplete=`current-password`). Follow the same accessibility pattern as `RegisterPage.tsx`: `<label htmlFor>` + `id` on every input, `role="alert"` for inline errors, `aria-describedby` linking errors to inputs, 44×44px minimum touch targets, no `aria-label` workarounds
  - [x] Validate client-side with `LoginRequestSchema` from `@handrix/contracts` on submit, surfacing per-field errors. Do NOT pre-validate password length client-side beyond what the schema enforces — server is the source of truth for credential correctness
  - [x] Create `loginUser(data: LoginRequest): Promise<LoginResponse>` in `apps/frontend/src/features/customer-auth/api/auth.api.ts`, mirroring the structure of `registerUser`: wrap `fetch` in try/catch (network error → status 0), parse error body with `.catch(() => ({}))`, validate the success body with `LoginResponseSchema.safeParse`, return parsed data or throw a typed error
  - [x] On HTTP 401 from login, surface a SINGLE server-error banner with `Invalid email or password.` — do not split it across the email or password field, do not include any hint about which field is wrong (AC3)
  - [x] Create `useLogin` hook in `apps/frontend/src/features/customer-auth/hooks/useLogin.ts` using TanStack Query v5 object syntax (`useMutation({ mutationFn: loginUser })`) — same convention as `useRegister`
  - [x] On success: wrap `localStorage.setItem('handrix_access_token', data.accessToken)` in `try/catch` (Safari private mode / quota) and surface a fallback error if storage fails (same pattern carried over from the 1.2 review patches). On successful storage, navigate to `/dashboard/customer` if `data.role === 'CUSTOMER'` else `/dashboard/handyman`
  - [x] Add a `Don't have an account? Register` link from `LoginPage` to `/register` and a `Already have an account? Log in` link from `RegisterPage` to `/login`

- [x] Task 6 — Auth context, session bootstrap, and `RequireAuth` route guard (AC: 5, 6)
  - [x] Create `apps/frontend/src/features/customer-auth/lib/auth-storage.ts` with `getAccessToken()`, `setAccessToken(token)`, `clearAccessToken()` — all three wrap `localStorage.{get,set,remove}Item` in try/catch and return `null` / swallow failures. Centralize the `handrix_access_token` key here as the single constant `ACCESS_TOKEN_KEY` — do NOT scatter the string literal
  - [x] Create `fetchSession(): Promise<SessionResponse | null>` in `auth.api.ts` calling `GET /api/auth/me` with `Authorization: Bearer <token>` from `getAccessToken()`. Behavior: no token → return `null` without making a request; 200 → parse with `SessionResponseSchema` and return; 401 → call `clearAccessToken()` and return `null` (do not throw — a 401 is a normal "logged out" signal at this layer); other non-2xx → throw a typed error
  - [x] Create `apps/frontend/src/features/customer-auth/context/AuthContext.tsx` providing `{ status: 'loading' | 'authenticated' | 'unauthenticated', user: SessionResponse | null, login(response): void, logout(): void }`. On mount, call `fetchSession()`; while pending, `status='loading'`; on `null`, `status='unauthenticated'`; on session, `status='authenticated'`. `login(response)` accepts a `LoginResponse`/`RegisterResponse` and sets state synchronously so the next render is already authenticated (no extra network round trip). `logout()` calls `clearAccessToken()` and resets state
  - [x] Wire `AuthProvider` at the top of `App.tsx`, wrapping `RouterProvider`. Both `RegisterPage` and `LoginPage` must call `useAuth().login(response)` on success so that subsequent protected-route reads see the new session without a reload
  - [x] Create `apps/frontend/src/features/customer-auth/components/RequireAuth.tsx`:
    - `status === 'loading'` → render a small loading placeholder (single-line `<p>Loading…</p>` is fine; Story 5.4 polishes loading states)
    - `status === 'unauthenticated'` → `<Navigate to="/login" replace />`
    - `status === 'authenticated'` + `requiredRole && user.role !== requiredRole` → `<Navigate to={user.role === 'CUSTOMER' ? '/dashboard/customer' : '/dashboard/handyman'} replace />`
    - else → render children
  - [x] Update `App.tsx` route table:
    - `/` → if `status === 'authenticated'`, `<Navigate to>` the role's dashboard; if `unauthenticated`, `<Navigate to="/login">`; if `loading`, render placeholder. Implement as a small `RootRedirect` component using `useAuth()`
    - `/login` → `<LoginPage />` — if already authenticated, immediately redirect to role dashboard (avoid letting an already-logged-in user re-submit credentials)
    - `/register` → `<RegisterPage />` — same already-authenticated redirect
    - `/dashboard/customer` → `<RequireAuth requiredRole="CUSTOMER"><CustomerDashboardStub/></RequireAuth>`
    - `/dashboard/handyman` → `<RequireAuth requiredRole="HANDYMAN"><HandymanDashboardStub/></RequireAuth>`
    - Replace the inline JSX dashboard stubs (`<div><h1>…</h1></div>`) with named components `CustomerDashboardStub` and `HandymanDashboardStub` in the same file — Story 2.1 and 3.2 will replace them
  - [x] Add a single `<button onClick={logout}>Log out</button>` on each dashboard stub (44×44px). This is the minimum UI hook needed to exercise AC5 manually in the browser. Story 2.1 / 3.2 / 5.4 will replace this with the real navigation chrome
  - [x] When any authenticated fetch (e.g., `fetchSession` retried in background, or future calls in 2.1/3.2) receives a 401, the helper must call `clearAccessToken()` and the auth context should transition to `unauthenticated` — which causes `RequireAuth` to redirect on the next render (AC5)

- [x] Task 7 — Backend unit and e2e tests (AC: 1, 2, 3, 4, 5, 7)
  - [x] Unit tests at `apps/backend/src/modules/auth/auth.service.spec.ts` — extend the existing `describe('AuthService')` with a new `describe('login()')`:
    - success: customer credentials → returns `{ userId, email, role: 'CUSTOMER', accessToken }`, `jwtService.sign` called once with `{ sub, email, role }` from the DB row
    - success: handyman credentials → returns `role: 'HANDYMAN'`
    - wrong password → throws `UnauthorizedException` with message `Invalid email or password`
    - unknown email → throws `UnauthorizedException` with same exact message; `bcrypt.compare` IS still called (assert via spy) to demonstrate constant-time pattern
    - `account_status = SUSPENDED` → same `UnauthorizedException`, same message, no JWT signed
    - `account_status = DELETED` → same `UnauthorizedException`, no JWT signed
    - JWT payload `role` comes from the DB-read user, not from any input — assert by setting `findUnique` to return a `HANDYMAN` row even though no role was on the dto
  - [x] Unit tests for `JwtStrategy.validate(payload)` at `apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts`: maps `{ sub, email, role }` → `{ userId, email, role }`
  - [x] Unit tests for `RolesGuard` at `apps/backend/src/modules/auth/guards/roles.guard.spec.ts`: open route (no metadata) → allow; matching role → allow; mismatching role → deny; missing `request.user` → throw `UnauthorizedException`
  - [x] E2E tests at `apps/backend/test/auth.e2e-spec.ts` — extend the existing describe with new describes:
    - `POST /auth/login`:
      - valid customer credentials (from a registered fixture) → 200 + `{ userId, email, role: 'CUSTOMER', accessToken }`
      - valid handyman credentials → 200 + `role: 'HANDYMAN'`
      - wrong password → 401 with body `{ message: 'Invalid email or password' }` (NestJS default `UnauthorizedException` body has `message` + `statusCode` + `error`; assert at least the message string)
      - unknown email → 401 with the exact same `message`
      - missing/invalid fields → 400 (validation pipe rejects)
    - `GET /auth/me`:
      - missing `Authorization` header → 401
      - valid bearer JWT (from the prior login) → 200 + `{ userId, email, role }`
      - tampered JWT (any character flipped in the signature segment) → 401
    - `GET /auth/customer-only` / `GET /auth/handyman-only`:
      - customer token on customer endpoint → 200
      - customer token on handyman endpoint → 403
      - handyman token on customer endpoint → 403
      - handyman token on handyman endpoint → 200
      - missing token on either endpoint → 401 (auth guard fires before roles guard)
    - Extend the existing `afterAll` cleanup filter so the new fixture users (e.g., emails containing `e2e-login`) are also deleted. Update the deferred-work item for cleanup filter brittleness only if you adopt a more general filter; otherwise just add the new substring
  - [x] All new e2e tests follow the existing pattern in `auth.e2e-spec.ts`: the test app is created with `Test.createTestingModule({ imports: [AppModule] }).compile()` + `moduleFixture.createNestApplication()` — the test harness does **NOT** call `app.setGlobalPrefix('api')`, so tests hit `/auth/login` (not `/api/auth/login`). The `/api` prefix only exists in `main.ts` for the real dev/prod runtime. Do not change this without coordinating with how every other e2e spec calls endpoints

- [x] Task 8 — Frontend smoke test for login + RequireAuth (AC: 5, 6)
  - [x] Add a Vitest + React Testing Library test at `apps/frontend/src/features/customer-auth/pages/LoginPage.test.tsx` covering: empty submit shows field errors; entering invalid email shows email error; happy-path stubbed mutation succeeds and `localStorage` gets the token. Mock the `loginUser` function (do NOT use MSW — keep tests light; Story 1.1 didn't introduce MSW). Use the existing jsdom environment configured in `vite.config.ts`
  - [x] Add a smoke test at `apps/frontend/src/features/customer-auth/components/RequireAuth.test.tsx`: unauthenticated → navigates to `/login`; authenticated CUSTOMER on a `requiredRole="HANDYMAN"` route → navigates to `/dashboard/customer`; authenticated CUSTOMER on `requiredRole="CUSTOMER"` → renders children
  - [x] These two frontend tests are the minimum to protect AC5 + AC6. Story 5.4 will tighten accessibility and visual coverage

## Dev Notes

### Story 1.2 Already Built These — Do NOT Recreate

`AuthModule` is fully wired with `JwtModule.registerAsync()` reading `JWT_SECRET` and `JWT_EXPIRES_IN` from `ConfigService`. The `AuthService` constructor already injects `PrismaService` and `JwtService`. `PrismaModule` is `@Global()` — do NOT import it again. `ConfigModule` is `isGlobal: true`. The `JwtPayload` interface is currently inline in `auth.service.ts` lines 9–13 — Task 2 extracts it to `types/jwt-payload.ts` so the new `JwtStrategy` can import the same type instead of redefining it.

Existing files to extend (not recreate):
- `apps/backend/src/modules/auth/auth.module.ts` — add `PassportModule.register({ defaultStrategy: 'jwt' })`, add `JwtStrategy` to providers, export new guards
- `apps/backend/src/modules/auth/auth.controller.ts` — add `POST /auth/login`, `GET /auth/me`, two role-gated smoke endpoints
- `apps/backend/src/modules/auth/auth.service.ts` — add `login()` method; move `JwtPayload` to `types/`
- `apps/backend/src/modules/auth/auth.service.spec.ts` — extend with `login()` describe block
- `apps/backend/test/auth.e2e-spec.ts` — extend with login + me + role-guard describes; widen cleanup filter
- `apps/backend/.env.example` — no new vars needed; `JWT_SECRET` and `JWT_EXPIRES_IN` already there from 1.2
- `packages/contracts/src/auth.schemas.ts` — append `LoginRequestSchema`, `LoginResponseSchema`, `SessionResponseSchema` + types
- `packages/contracts/src/index.ts` — already re-exports `./auth.schemas`, no change needed
- `apps/frontend/src/App.tsx` — replace inline dashboard `<div>` stubs with named components; wrap dashboards in `RequireAuth`; add `/login` route; add `AuthProvider`
- `apps/frontend/src/features/customer-auth/api/auth.api.ts` — append `loginUser` and `fetchSession`
- `apps/frontend/src/features/customer-auth/pages/RegisterPage.tsx` — call `useAuth().login(response)` after `setAccessToken`; add `/login` link
- `apps/frontend/src/features/customer-auth/hooks/useRegister.ts` — no change

New files to create:
- `apps/backend/src/modules/auth/dto/login.dto.ts`
- `apps/backend/src/modules/auth/dto/login-response.dto.ts`
- `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts`
- `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts`
- `apps/backend/src/modules/auth/guards/roles.guard.ts`
- `apps/backend/src/modules/auth/guards/roles.guard.spec.ts`
- `apps/backend/src/modules/auth/decorators/roles.decorator.ts`
- `apps/backend/src/modules/auth/decorators/current-user.decorator.ts`
- `apps/backend/src/modules/auth/types/jwt-payload.ts`
- `apps/backend/src/modules/auth/types/authenticated-user.ts`
- `apps/backend/src/modules/auth/index.ts` (barrel — exports the guards, decorators, types)
- `apps/frontend/src/features/customer-auth/pages/LoginPage.tsx`
- `apps/frontend/src/features/customer-auth/pages/LoginPage.test.tsx`
- `apps/frontend/src/features/customer-auth/hooks/useLogin.ts`
- `apps/frontend/src/features/customer-auth/context/AuthContext.tsx`
- `apps/frontend/src/features/customer-auth/components/RequireAuth.tsx`
- `apps/frontend/src/features/customer-auth/components/RequireAuth.test.tsx`
- `apps/frontend/src/features/customer-auth/lib/auth-storage.ts`

### Constant-Time Login Pattern (AC3)

The `unknown email` branch must still run `bcrypt.compare` so the response timing distribution overlaps with the `known email, wrong password` branch. Rate limiting (Story 5.2) is the real defense against credential stuffing — this is the cheap defense against the trivial 0ms-vs-bcrypt-cost leak.

Generate the `PLACEHOLDER_HASH` once at module load:

```typescript
// auth.service.ts (top of file, before @Injectable)
const PLACEHOLDER_HASH = bcrypt.hashSync('placeholder-not-a-real-password', 10);
```

Use `hashSync` (not `hash`) because this must be available before any `login()` call and the cost is paid once per process. Do NOT precompute it at request time, do NOT use a static literal string (it must be a valid bcrypt hash so `bcrypt.compare` traverses the full cost path).

### Why HTTP 200 for Login (Not 201)

`POST /auth/register` returns 201 because it creates a `User` row. `POST /auth/login` does not create any persistent row — it issues a JWT, which is stateless. Use `@HttpCode(HttpStatus.OK)` (200). This matches NestJS convention and is what the contract schema and frontend will assume.

### JWT Payload Single Source of Truth

Story 1.2 defined `JwtPayload` inline in `auth.service.ts`. Story 1.3 introduces a second consumer (`JwtStrategy.validate`). Both must share the same shape. Move the interface to:

```typescript
// apps/backend/src/modules/auth/types/jwt-payload.ts
import type { UserRole } from '@prisma/client';
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
```

Then import it in both `auth.service.ts` (signing path) and `jwt.strategy.ts` (validation path). Do not duplicate the shape.

### AuthenticatedUser Shape

Distinct from `JwtPayload`. After Passport runs `validate()`, the request user is the **transformed** shape, not the raw payload. Keep the naming explicit:

```typescript
// apps/backend/src/modules/auth/types/authenticated-user.ts
import type { UserRole } from '@prisma/client';
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}
```

`request.user` after `JwtAuthGuard` is `AuthenticatedUser`. The `@CurrentUser()` param decorator returns this type. Future modules must depend on `AuthenticatedUser`, never on `JwtPayload` directly — the transform layer is intentional.

### Guard Ordering and Why `RolesGuard` Trusts `request.user`

`@UseGuards(JwtAuthGuard, RolesGuard)` runs guards in declared order. `JwtAuthGuard` populates `request.user`; `RolesGuard` reads it. If `RolesGuard` is used without `JwtAuthGuard` (a future mistake), `request.user` is `undefined` — the guard MUST throw `UnauthorizedException` in that case rather than silently returning `false` or `true`. Document this in a one-line comment inside `roles.guard.ts`.

### Account Status Enforcement at Login

Schema enum `AccountStatus` (`schema.prisma:18-22`) has `ACTIVE`, `SUSPENDED`, `DELETED`. Block login for non-`ACTIVE`. Use the same generic `Invalid email or password` message to avoid leaking account state (also satisfies AC3 wording). Story 1.3 does NOT implement any admin flow to change account status — that's later. But the login check is required now so suspended accounts can't log in once any deactivation path lands.

### Frontend Token Storage Decision

`localStorage` was chosen in Story 1.2 (spec-mandated) and is reused here. The `4-1` deferred-work log notes this as a known XSS risk to revisit in Epic 5 (HttpOnly cookie + silent refresh). For this story, continue to use `localStorage.handrix_access_token`. The new code centralizes the key in `auth-storage.ts` so Epic 5 hardening only touches one file.

### Frontend Architecture Rules (Carry Over From 1.1 / 1.2)

- TanStack Query v5 **object-based syntax only**: `useMutation({ mutationFn })` — same convention as `useRegister`
- Router: `createBrowserRouter` (already in use in `App.tsx`); do NOT migrate to `BrowserRouter`
- No Redux/Zustand/Jotai — auth state lives in a small `Context.Provider`, not a global store. The session itself is read-once on mount and updated only on login/logout — this is exactly the React Context use case (low-write-frequency global state)
- API calls hit the Vite proxy path `/api/...` — do NOT hardcode `http://localhost:3000`. The backend in `main.ts` sets `app.setGlobalPrefix('api')`, so `/api/auth/login` from the browser maps to `/auth/login` on the NestJS controller decorator
- Feature self-contained inside `apps/frontend/src/features/customer-auth/` — even though login + auth context serve both roles. Do NOT create a `handyman-auth` mirror; the `handyman-auth/` folder stays empty (only `.gitkeep`) for now. Future role-specific auth UI (e.g., handyman-mode visual treatment) can live in either location; Story 5.4 will rationalize the split-surface design

### Backend ↔ E2E Path Inconsistency (Existing State, Do Not Fix)

`main.ts` calls `app.setGlobalPrefix('api')`. The e2e test harness at `apps/backend/test/auth.e2e-spec.ts` does NOT call `setGlobalPrefix`, so e2e tests POST to `/auth/register` (no prefix) while the dev frontend POSTs to `/api/auth/register`. This is the established pattern; Story 1.2's review patch wired the production prefix in `main.ts` but left the e2e harness alone. Continue the pattern for the new login e2e tests: hit `/auth/login`, `/auth/me`, `/auth/customer-only`, `/auth/handyman-only` directly without any prefix. Do not introduce `setGlobalPrefix` in the test harness — it would mass-break the existing register suite.

### Out of Scope (Explicitly Deferred)

- Password reset / forgot password flow — post-MVP
- Email verification on registration or login — post-MVP
- "Remember me" / refresh tokens — JWT lifetime is `JWT_EXPIRES_IN` (default `7d`); no refresh flow in MVP
- Rate limiting / brute force lockout on `/auth/login` — Story 5.2
- HttpOnly cookie session model — deferred (carry forward from `4-1` deferred work)
- Profile reads/updates beyond `/auth/me` — the `users` module stays a stub; profile-specific endpoints belong to Stories 2.1 (customer) and 3.1 (handyman)
- Account suspension/deletion admin flows — out of MVP; the login `account_status` check is built defensively for future use
- Silent logout on 401 anywhere except `fetchSession` — once Stories 2.1 / 3.2 add real authenticated fetches, they will repeat the same `clearAccessToken()` + redirect pattern, OR Epic 5 will introduce a fetch wrapper. Story 1.3 only handles the `/auth/me` 401 path because that's what AC5 explicitly requires
- WCAG visual polish, focus rings, contrast tokens — Story 5.4. AC6 here is about routing behavior, not visual polish. The keyboard accessibility minimum from 1.2 (labels, `role="alert"`, 44×44px targets) is REQUIRED on the new `LoginPage`

### Library Versions and Pinning

All required dependencies are already in `apps/backend/package.json`:
- `@nestjs/jwt`: `^11.0.2`
- `@nestjs/passport`: `^11.0.5`
- `passport`: `^0.7.0`
- `passport-jwt`: `^4.0.1`
- `@types/passport-jwt`: `^4.0.1` (devDependencies)
- `bcryptjs`: `^3.0.3`

Do NOT add any new dependency. Do NOT replace `bcryptjs` with native `bcrypt` (Story 1.2 debug log: native build is blocked by the pnpm security sandbox).

The frontend has `@tanstack/react-query@^5.56.2`, `react-router-dom@^6.26.2`, and no auth library — keep it that way; no `react-oauth/*`, no Auth.js. The auth context is hand-rolled and fits in <100 lines.

### Accessibility Requirements (WCAG 2.1 AA)

Same standard as 1.2:
- Every input has a `<label htmlFor>` paired with `id` (no `aria-label` workarounds)
- Inline errors use `role="alert"` and are associated via `aria-describedby`
- Touch targets ≥ 44×44px (submit button, links to /register, etc.)
- Submit button has `disabled={isPending}` and copy changes to `Logging in…`
- Tab order: email → password → submit (then "Register" link)
- The single server-error banner uses `aria-live="polite"` (same as `RegisterPage` server-error)

### Security Requirements

- All login responses MUST use the same generic message `Invalid email or password` for unknown email, wrong password, and non-ACTIVE account_status — never expose which field is wrong or whether the account exists/is suspended
- JWT signed with secret from `ConfigService.getOrThrow('JWT_SECRET')` — never inline-default to a fallback string; `getOrThrow` ensures startup fails loudly if the env var is missing
- `password` is never returned, logged, or echoed (audit your error paths — NestJS default exception body should not include the DTO; `whitelist: true, forbidNonWhitelisted: true` is already on the global validation pipe)
- `password_hash` is never returned from `findUnique`/`findUniqueOrThrow` calls in any path — use explicit `select` clauses everywhere (Story 1.2 review patch enforced this for register; apply the same discipline here)
- JWT payload `role` comes from the persisted DB row, not from any client-controlled value (FR3, NFR12). This is critical for AC4: a forged JWT that flips `role: HANDYMAN` to `role: CUSTOMER` would still fail because (a) signature verification rejects it without the server's `JWT_SECRET`, and (b) the role in the database is the only authority on what role a user actually is
- Do NOT log the `Authorization` header. The existing pino logger config in `app.module.ts` serializes only `method` and `url` on the `req` serializer — verify this serializer still applies to your new endpoints (it should, because it's at the module root)

### Testing Standards

Follow the established conventions from 1.1 and 1.2:

- **Unit tests** mock `PrismaService` and `JwtService`; verify business logic in `AuthService` (bcrypt called even on unknown-email path, ConflictException-equivalent `UnauthorizedException` on wrong creds, account-status check). Unit tests for guards mock `Reflector` and `ExecutionContext`
- **E2E tests** hit a real database — do NOT mock Prisma in e2e (1.1 lesson: mock/real divergence masks migration failures). Reuse the `Test.createTestingModule({ imports: [AppModule] })` pattern from `auth.e2e-spec.ts`. Add fixtures (a registered customer + a registered handyman) in a `beforeAll` and clean them up in `afterAll`. The cleanup filter currently uses `email contains 'e2e-register'` — extend it to `OR contains 'e2e-login'` so the new fixtures are removed too
- TypeScript must compile with zero errors across all packages after this story (`pnpm -r typecheck`)
- ESLint must pass with zero errors (`pnpm -r lint`)
- Run the full backend test suite: `pnpm --filter handrix-backend test` and `pnpm --filter handrix-backend test:e2e`; both must be green
- Run the frontend test suite: `pnpm --filter handrix-frontend test` — green
- Pre-existing failures noted in 1.2 (`health.controller.spec.ts`, `HealthCheck.test.tsx`) are NOT this story's concern — do not "fix" them as a side quest. Note in completion notes if they regress

### Deferred from Story 1.2 (Still Open — Do Not Quietly Inherit)

These are carried over in `_bmad-output/implementation-artifacts/deferred-work.md`. Story 1.3 does NOT address them — flag in completion notes if you accidentally fix one:

- `JWT_EXPIRES_IN` regex validation in `env.validation.ts` (env hardening pass)
- `expiresIn ... as never` workaround in `auth.module.ts:12` (`ms.StringValue` cleanup)
- ON DELETE RESTRICT on profile FKs (revisit on account-deletion flow)
- `@ApiBody`/`@ApiResponse` Swagger decorators (OpenAPI consumer work)
- Transaction isolation level (READ COMMITTED is fine for now)

If you find yourself reaching for any of these to make a test pass, stop and read the deferred-work entry — chances are there's a smaller fix scoped to 1.3.

### Project Structure Notes

- Auth-related code lives under `apps/backend/src/modules/auth/` — extend, do not relocate
- New subfolders `strategies/`, `guards/`, `decorators/`, `types/` follow the NestJS community convention (the existing `dto/` already follows this style)
- Frontend auth code stays in `apps/frontend/src/features/customer-auth/` — even though it now serves both roles. The `handyman-auth/` folder remains empty until Story 5.4 (split-surface visual treatment) decides whether to split or unify
- Shared contracts: append to `packages/contracts/src/auth.schemas.ts`; do NOT create new files for login schemas — keep all auth schemas in one file
- No project structure conflicts detected with Stories 2.1 (customer dashboard) or 3.2 (handyman jobs feed) — those will consume `useAuth()`, `RequireAuth`, and the barrel exports from this story

### References

- Story requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Login and Role-Based Dashboard Routing]
- Identity and Authorization (JWT, role guards): [Source: _bmad-output/planning-artifacts/architecture.md#Identity and Authorization]
- Module Responsibility Summary (auth): [Source: _bmad-output/planning-artifacts/architecture.md#Module Responsibility Summary]
- Functional requirements FR1, FR2, FR3, FR5: [Source: _bmad-output/planning-artifacts/epics.md#Functional Requirements]
- NFR12 (role escalation prevention): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements — Security]
- UX customer dashboard journey (post-login): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Customer Dashboard-First Entry]
- UX handyman dashboard journey (post-login): [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 6: Handyman Dashboard]
- JWT payload shape from Story 1.2: [Source: _bmad-output/implementation-artifacts/1-2-user-registration-with-role-selection.md#Auth Module Architecture]
- Frontend feature folder + TanStack Query v5 object syntax: [Source: _bmad-output/implementation-artifacts/1-1-initialize-project-foundation.md#Frontend Architecture Rules]
- Global validation pipe + global API prefix already configured: [Source: apps/backend/src/main.ts]
- Vite proxy `/api → localhost:3000`: [Source: apps/frontend/vite.config.ts]
- bcryptjs vs native bcrypt decision: [Source: _bmad-output/implementation-artifacts/1-2-user-registration-with-role-selection.md#Debug Log References]
- AccountStatus enum: [Source: apps/backend/prisma/schema.prisma#AccountStatus]
- Deferred review items still open: [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 1-2-user-registration-with-role-selection]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `jest.spyOn(bcrypt, 'compare')` fails with "Cannot redefine property" because bcryptjs exports properties as non-configurable. Fixed by using `jest.mock('bcryptjs', ...)` at the top of `auth.service.spec.ts` with pass-through to `jest.requireActual`, which allows tracking `compare` calls via the mock without breaking real bcrypt hash comparisons in other tests.
- `@handrix/contracts` uses `dist/index.js` as its main entry. After adding new schemas to `auth.schemas.ts`, the frontend tests showed `LoginRequestSchema.safeParse` as undefined until the contracts package was rebuilt with `pnpm --filter @handrix/contracts build`.
- Pre-existing failures carried forward: `health.controller.spec.ts` unit test (response shape mismatch) and `HealthCheck.test.tsx` frontend test (pre-existing from 1.2) — not fixed per story scope.

### Completion Notes List

- Implemented `AuthService.login()` with constant-time bcrypt comparison via `PLACEHOLDER_HASH` for unknown emails (AC3 — prevents trivial timing-based email existence leak)
- Extracted `JwtPayload` from inline definition in `auth.service.ts` to `types/jwt-payload.ts` — shared by both signing path and `JwtStrategy.validate()`
- Wired `PassportModule`, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` into `AuthModule`
- Added `GET /auth/me`, `GET /auth/customer-only`, `GET /auth/handyman-only` smoke endpoints for role guard verification
- Created frontend auth stack: `auth-storage.ts` (centralized token key), `AuthContext.tsx` (loading/authenticated/unauthenticated state), `RequireAuth.tsx` (role-aware route guard), `LoginPage.tsx` (shared for both roles)
- Updated `RegisterPage.tsx` to call `useAuth().login()` on success and added `/login` link
- Updated `App.tsx` to wrap with `AuthProvider`, add `/login` route, replace inline stubs with named components wrapped in `RequireAuth`
- Backend: 20 unit tests pass (new login/jwt/roles tests + existing register tests), 22 e2e tests pass
- Frontend: 7 new tests pass (3 LoginPage, 4 RequireAuth); 1 pre-existing failure (HealthCheck.test.tsx) not regressed
- Zero TypeScript errors across contracts, backend, frontend; zero ESLint errors

### File List

**New files:**
- `apps/backend/src/modules/auth/dto/login.dto.ts`
- `apps/backend/src/modules/auth/dto/login-response.dto.ts`
- `apps/backend/src/modules/auth/types/jwt-payload.ts`
- `apps/backend/src/modules/auth/types/authenticated-user.ts`
- `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts`
- `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts`
- `apps/backend/src/modules/auth/guards/roles.guard.ts`
- `apps/backend/src/modules/auth/guards/roles.guard.spec.ts`
- `apps/backend/src/modules/auth/decorators/roles.decorator.ts`
- `apps/backend/src/modules/auth/decorators/current-user.decorator.ts`
- `apps/backend/src/modules/auth/index.ts`
- `apps/frontend/src/features/customer-auth/lib/auth-storage.ts`
- `apps/frontend/src/features/customer-auth/context/AuthContext.tsx`
- `apps/frontend/src/features/customer-auth/components/RequireAuth.tsx`
- `apps/frontend/src/features/customer-auth/components/RequireAuth.test.tsx`
- `apps/frontend/src/features/customer-auth/hooks/useLogin.ts`
- `apps/frontend/src/features/customer-auth/pages/LoginPage.tsx`
- `apps/frontend/src/features/customer-auth/pages/LoginPage.test.tsx`

**Modified files:**
- `apps/backend/src/modules/auth/auth.service.ts`
- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/backend/src/modules/auth/auth.module.ts`
- `apps/backend/src/modules/auth/auth.service.spec.ts`
- `apps/backend/test/auth.e2e-spec.ts`
- `packages/contracts/src/auth.schemas.ts`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/features/customer-auth/api/auth.api.ts`
- `apps/frontend/src/features/customer-auth/pages/RegisterPage.tsx`

### Change Log

- 2026-05-12: Implemented Story 1.3 — login endpoint, JWT/passport strategy, role guards, auth context, login page, RequireAuth, session bootstrap, full test coverage

### Review Findings

- [x] [Review][Patch] JWT_SECRET uses `config.get` (not `config.getOrThrow`) in JwtModule factory — inconsistent with JwtStrategy; on misconfiguration signs tokens with `undefined` [apps/backend/src/modules/auth/auth.module.ts:16]
- [x] [Review][Patch] Missing e2e test: suspended/deleted account_status → 401 on POST /auth/login (AC7 explicit requirement) [apps/backend/test/auth.e2e-spec.ts]
- [x] [Review][Patch] Missing e2e test: expired JWT → 401 on GET /auth/me (AC7 explicit requirement) [apps/backend/test/auth.e2e-spec.ts]
- [x] [Review][Patch] Wrong-password unit test missing `expect(bcrypt.compare).toHaveBeenCalledTimes(1)` assertion (AC7: "bcrypt called on both paths") [apps/backend/src/modules/auth/auth.service.spec.ts:217-227]
- [x] [Review][Patch] `fetchSession` schema parse failure throws but `AuthContext` catch doesn't clear token → stuck unauthenticated loop on every page load [apps/frontend/src/features/customer-auth/api/auth.api.ts:94-97]
- [x] [Review][Patch] E2E login `beforeAll` fixtures: no assertion that registration returned 201 before extracting token — silent undefined token causes confusing downstream failures [apps/backend/test/auth.e2e-spec.ts:153-173]
- [x] [Review][Defer] `expiresIn: ... as never` typing workaround in auth.module.ts — pre-existing from Story 1.2 review [apps/backend/src/modules/auth/auth.module.ts:17] — deferred, pre-existing
- [x] [Review][Defer] No rate limiting on POST /auth/login — deferred to Story 5.2 [apps/backend/src/modules/auth/auth.controller.ts] — deferred, pre-existing
- [x] [Review][Defer] JWT stored in localStorage — XSS exfiltration risk — deferred to Epic 5 [apps/frontend/src/features/customer-auth/lib/auth-storage.ts] — deferred, pre-existing
- [x] [Review][Defer] GET /auth/me returns 200 for suspended users post-login — stateless JWT trade-off, no live account_status check in validate() — deferred to Epic 5 [apps/backend/src/modules/auth/strategies/jwt.strategy.ts:18] — deferred, pre-existing
- [x] [Review][Defer] Smoke endpoints /auth/customer-only and /auth/handyman-only exposed without env gate — per spec, not permanent product surfaces — deferred, pre-existing
- [x] [Review][Defer] Race condition: fetchSession() resolving null after login() sets authenticated state — concurrent mount + login timing edge case — deferred to Epic 5 session management overhaul — deferred, pre-existing
- [x] [Review][Defer] clearAccessToken() swallows errors (best-effort logout, stale token may persist) — deferred to Epic 5 HttpOnly cookie migration [apps/frontend/src/features/customer-auth/lib/auth-storage.ts:22-27] — deferred, pre-existing
