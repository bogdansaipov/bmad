# Deferred Work Log

Items deferred from reviews — real issues, not noise, but intentionally out of scope for the originating story. Use this to seed future hardening stories.

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
