# Deferred Work Log

Items deferred from reviews — real issues, not noise, but intentionally out of scope for the originating story. Use this to seed future hardening stories.

## Deferred from: code review of 1-3-login-and-role-based-dashboard-routing (2026-05-12)

- `expiresIn: ... as never` typing workaround in `auth.module.ts:17` — carries over from Story 1.2. JwtModule factory uses `config.get` (not `getOrThrow`) for JWT_SECRET and casts `expiresIn` to `never`. Replace with `ms.StringValue` and switch to `getOrThrow` when cleaning up.
- No rate limiting on `POST /auth/login` — open endpoint enables brute-force credential stuffing. Belongs in Story 5.2 (security baselines). The PLACEHOLDER_HASH defense addresses only timing-based email enumeration, not volume attacks.
- JWT stored in `localStorage` — XSS exfiltration risk for 7-day tokens. Deferred from Story 1.2. Story 1.3 centralizes the key in `auth-storage.ts`; Epic 5 hardening will migrate to HttpOnly cookie.
- `GET /auth/me` returns 200 for suspended/deleted users who have a valid unexpired JWT (`apps/backend/src/modules/auth/strategies/jwt.strategy.ts:18`). `JwtStrategy.validate()` reconstructs from JWT payload with no live DB lookup. Account status changes post-issuance are not reflected until token expiry. Fix: add DB lookup in validate() OR implement token revocation OR use very short-lived tokens + refresh — all belong in Epic 5.
- Smoke endpoints `/auth/customer-only` and `/auth/handyman-only` exposed in production without an environment gate (`apps/backend/src/modules/auth/auth.controller.ts`). Per spec, these are temporary; remove or gate behind a dev/test env check in a cleanup story.
- Race condition: `fetchSession()` in-flight during mount can resolve with `null` (stale-token 401) AFTER `login()` has already set `status='authenticated'`, silently logging the user out (`apps/frontend/src/features/customer-auth/context/AuthContext.tsx`). Epic 5 session management overhaul (AbortController or request sequencing) will address this.
- `clearAccessToken()` swallows all errors (`apps/frontend/src/features/customer-auth/lib/auth-storage.ts:22-27`). On a storage-unavailable logout the stale token is not removed. Best-effort for now; resolved when migrating to HttpOnly cookies in Epic 5.

## Deferred from: code review of 1-2-user-registration-with-role-selection (2026-05-12)

- Transaction isolation level unspecified on `$transaction` (apps/backend/src/modules/auth/auth.service.ts:33). Defaults to `READ COMMITTED`; the unique constraint + P2002 catch closes the practical race but stricter isolation would prevent the pre-check race entirely.
- Non-P2002 Prisma errors are rethrown raw from `auth.service.ts:58` — could leak Prisma error structure on FK violations / connection drops. NestJS default exception filter sanitizes most of this; defensive improvement, not blocker.
- No rate-limit / throttling on `POST /auth/register`. Open endpoint enables enumeration via 409 timing and resource exhaustion via bcrypt cost. Belongs in Story 5.2 (security baselines).
- `JWT_EXPIRES_IN` env value not regex-validated (apps/backend/src/config/env.validation.ts). Malformed `'7days'` would throw at sign time on first registration. Add regex check in next env-hardening pass.
- `expiresIn: ... as never` typing workaround in `auth.module.ts:12` — `@nestjs/jwt` v11 typing mismatch documented in debug log. Replace with `ms.StringValue` import when cleaning up.
- `ON DELETE RESTRICT` on `customer_profiles` / `handyman_profiles` FKs (migration 20260512111352). Blocks hard-delete of users; soft-delete via `account_status=DELETED` is the intent but undocumented. Architectural choice to revisit when account-deletion flow is designed.
- Unit test mocks `$transaction` synchronously (auth.service.spec.ts:51-52, 87, 108). A regression removing the `$transaction` wrapper would still pass unit tests. E2E catches it indirectly. Test-quality improvement.
- E2E cleanup uses `email contains 'e2e-register'` filter (auth.e2e-spec.ts:357-361). Will silently leak rows when future tests use different email patterns. Test-infra refactor.
- `@ApiBody` / `@ApiResponse` decorators missing on `POST /auth/register` (auth.controller.ts:12-17). Swagger output incomplete for 201/400/409 responses. Spec mandated only `@ApiTags`/`@ApiOperation`/`@HttpCode`; add when OpenAPI consumer work begins.

## Deferred from: code review of 1-1-initialize-project-foundation (2026-05-12)

- `password_hash` field present in Prisma schema with no hashing service or stub — Story 1.2 implements auth; ensure bcrypt/argon2 hashing is introduced before any user creation path is wired.
- E2E test (`apps/backend/test/health.e2e-spec.ts`) does not mirror production bootstrap: missing `bufferLogs: true` and `app.useLogger(app.get(Logger))`. Log-dependent behaviours (including correlation ID propagation) are untested. Low-impact for a foundation story; address when adding integration tests in Epic 5.

## Deferred from: code review of 4-1-enable-support-staff-authentication-and-access (2026-04-21)

- Bearer token persisted to `localStorage` — XSS exfiltration risk for internal staff tokens valid up to 480 min. Applies symmetrically to ops and support. Candidate for Epic 5 security hardening (HttpOnly cookie, short-lived in-memory token with silent refresh, or sessionStorage + rotation).
- `internalSupportSessionSchema` and `internalOpsSessionSchema` both omit `expiresAt` / `issuedAt` on the protected `/session` response. Login endpoint returns them but the protected endpoint drops them. Frontend cannot proactively refresh. Change both schemas together.
- No rate-limit / lockout on `POST /auth/internal-sessions`. Brute force of demo passwords is trivial. Belongs in Epic 5 security hardening (throttling, exponential backoff, IP / email lockouts).
- Demo passwords (`ops-demo-pass`, `support-demo-pass`) hard-wired in `.env.example` and backend tests. Spec for Story 4.1 said not to change the env contract. Deployment-process concern: ensure prod never ships with these values; add a prod env-validation gate that rejects these literals.
- `handleSupportSessionExpired` dual-writes `window.history.replaceState` + `setPathname` (same pattern as `handleOpsSessionExpired`). Can flash the protected screen before the redirect lands. Fix both handlers in one pass.
- No `credentials: 'omit'` / CSRF token plumbing on `fetch` calls in `support-auth-api.ts` and `ops-auth-api.ts`. Bearer-token design currently avoids CSRF, but defense-in-depth for any future cookie-based session work belongs in Epic 5.
- No email normalization (case-insensitive match, trim) at credential match. Typo mismatches silently fail. Product decision: should typed email be case-insensitive? Applies to both ops and support seeded credentials.
- `localStorage.setItem` / `removeItem` throws on quota-exceeded / private-browsing are uncaught in `support-auth-storage.ts` and `ops-auth-storage.ts`. Wrap both with try/catch and surface a calm "storage unavailable" path.
- `request.user!` non-null assertion in `SupportController.getSession` (and `OpsController.getSession`). Guard guarantees presence today; tighten the type so the assertion is no longer needed, or add an explicit runtime check.
- `SupportAuthError` declares `readonly recoveryHint?: string`, but callers treat hints as `string | null`. Minor type-shape divergence from the `OpsAuthError` pattern. Align both when touching the auth error shape.

## Deferred from: code review of 5-6-instrument-mvp-success-measurement (2026-04-22)

- Feedback endpoint doesn't pass `expectedTokenDigest` to `validateRequestTrackingCredential` (apps/handrix-api/src/modules/requests/requests.service.ts:391). Pre-existing pattern — the status-lookup call (same file, line 320) also omits it. Revocation/rotation of tracking credentials currently isn't enforced anywhere. Belongs in a future security-hardening pass that introduces token revocation end-to-end.
- Concurrent lifecycle transitions can overwrite `fulfilled_at`/`cancelled_at` timestamps (apps/handrix-api/src/modules/requests/request-store.service.ts:651-740). Needs conditional update (`WHERE fulfilled_at IS NULL`) or SERIALIZABLE isolation — bigger than this story. Broader concurrency model decision.
- `MeasurementService` returns ratios without a minimum-sample-size gate (apps/handrix-api/src/modules/measurement/measurement.service.ts). Dashboards will display alarming values (100% compliance / 0% conversion) on tiny samples. Spec explicitly scopes this story as "data layer only" — sample gating lives in the consumer. Revisit when dashboards are built.
- No separate "no-flow-started" flag when confirmed count > 0 but flow-started count = 0 (apps/handrix-api/src/modules/measurement/measurement.service.ts:29-30). Currently masks "instrumentation broken" as "no activity." Beyond MVP data-layer scope; include when designing the consumer dashboard.
