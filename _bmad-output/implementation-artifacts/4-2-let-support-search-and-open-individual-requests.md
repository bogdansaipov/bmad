# Story 4.2: Let Support Search and Open Individual Requests

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support agent,
I want to find a customer request quickly,
so that I can respond without wasting time or asking the customer to repeat everything.

## Acceptance Criteria

1. Given an authenticated support agent in the support workspace, when they submit a search using available identifying information (public request id, issue label, address, postal code), then the protected backend returns matching individual requests efficiently and the agent can open the correct request record for further review.
2. Given multiple requests may exist in different lifecycle states, when search results are shown, then each result provides enough summary context — public id, issue label, address summary, current public status, current internal lifecycle label, received timestamp, latest change summary, current assignment owner if any, and intervention flag if applicable — to distinguish the correct request from look-alikes.
3. Given no request matches the search input (or the input is empty/too short), when the lookup completes, then the system returns a calm no-results state with helper copy and recovery hint, and no unrelated customer request data is exposed in the response body or error envelope.

## Tasks / Subtasks

- [x] Add a protected support search endpoint behind the existing role-isolation guards (AC: 1, 2, 3)
  - [x] Add `GET /support/requests` to `apps/handrix-api/src/modules/support/support.controller.ts` decorated with `@UseGuards(InternalAuthGuard, InternalRolesGuard)` (already on the controller) and `@InternalRoles('support')` per route. Mirror the swagger decorators (`@ApiTags('support')`, `@ApiOperation`, `@ApiOkResponse`) used on `getSession` and on `OpsController.getQueue` (`apps/handrix-api/src/modules/ops/ops.controller.ts:66-82`).
  - [x] Accept query parameters via `@Query()`: `q?: string` (free-text search) and `limit?: number` (optional cap, default `25`, max `50`). Parse the raw query into a typed shape with a new `supportSearchRequestQuerySchema` from shared contracts (see contracts task). On parse failure, throw `BadRequestException` with `createErrorResponse({ code: 'SUPPORT_SEARCH_QUERY_INVALID', message: 'We could not run that search.', recoveryHint: 'Try a shorter search term or remove special characters.' })`.
  - [x] Return a `SupportRequestSearchResponse` shaped as `{ items: SupportRequestSearchResult[], summary: { totalMatched, limitReached }, refreshedAt: ISO_8601, query: { q, normalizedQ, limit } }` wrapped in `createSuccessResponse(...)` with `{ generatedAt: new Date().toISOString() }` meta.
  - [x] Do NOT reuse `OpsController.getQueue` or `GET /ops/queue`. Support search is a separate API surface with its own authorization scope.

- [x] Add a protected support request detail endpoint that returns the minimal "you opened the right one" payload (AC: 1, 2)
  - [x] Add `GET /support/requests/:publicId` to `support.controller.ts` with the same guard + `@InternalRoles('support')` decorator pair. Mirror the shape of `OpsController.getRequestDetail` (`ops.controller.ts:84-112`).
  - [x] Return a `SupportRequestDetailResponse` containing only: `publicId`, `issueTypeId`, `issueLabel`, `createdAt`, `serviceLocation` (full `serviceLocationSchema`), `currentState` (lifecycle label + detail, public status label + detail), `latestChangeSummary`, `currentAssignmentOwnerLabel: string | null`, `interventionLabel: string | null`, `lastUpdatedAt: ISO_8601`. Wrapped in `createSuccessResponse(...)` with `{ generatedAt }` meta.
  - [x] On `null` from the service, throw `NotFoundException` with `createErrorResponse({ code: 'SUPPORT_REQUEST_NOT_FOUND', message: 'We could not open that request right now.', recoveryHint: 'Return to search and choose a request again.' })` — same shape as `OPS_REQUEST_NOT_FOUND` (`ops.controller.ts:99-106`).
  - [x] CRITICAL SCOPE BOUNDARY: Do NOT include request history, intake answers, full intervention summary, customer-facing containment guidance, or full request review summary in this response. Those belong to Story 4.3 ("Show Support the Full Request Context"). Story 4.2 establishes the search → open seam only.

- [x] Implement search and detail logic in `SupportService` without reaching past the existing data boundary (AC: 1, 2, 3)
  - [x] Inject `RequestStoreService` via the constructor (mirror `OpsService` constructor at `ops.service.ts:727-731`). Update `SupportModule` to import `RequestsModule` so the service is available — `apps/handrix-api/src/modules/support/support.module.ts` currently only imports `AuthModule`.
  - [x] Add `searchRequests({ q, limit })` returning `SupportRequestSearchResponse`:
    - Trim and lowercase `q`. If `normalizedQ.length < 2`, return `{ items: [], summary: { totalMatched: 0, limitReached: false }, refreshedAt, query: { q, normalizedQ, limit } }` — no scan, calm empty state.
    - Otherwise call `requestStoreService.listRequests()` and filter records whose normalized fields contain `normalizedQ`: `publicId.toLowerCase()`, `issueLabel.toLowerCase()`, `serviceLocation.addressLine1.toLowerCase()`, `serviceLocation.city.toLowerCase()`, `serviceLocation.postalCode.toLowerCase()`, `serviceLocation.unitOrAccessNote?.toLowerCase()`. Use `String.prototype.includes` (no regex from user input — prevents ReDoS).
    - Sort matched records by `latestHistoryEntry.occurredAt` descending so the freshest activity surfaces first; tiebreak by `createdAt` descending.
    - Cap to `limit` items. Set `summary.totalMatched` to the pre-cap count and `summary.limitReached` to `totalMatched > items.length`.
    - Map each matched `PersistedServiceRequest` → `SupportRequestSearchResult` using a private helper that returns: `publicId`, `issueLabel`, `addressSummary` (use the same join pattern as `formatAddressSummary` in `ops.service.ts:182-196`), `currentPublicStatusLabel + Detail` (from latest history `customerSnapshot`), `currentInternalLifecycleLabel + Detail` (use a small mapper local to support, or extract a tiny shared helper — duplicate is acceptable for this story; do NOT import `getLifecycleStatePresentation` from `ops.service.ts` because it is not exported).
    - Include `receivedAt: createdAt`, `lastUpdatedAt: latestHistoryEntry.occurredAt`, `latestChangeSummary: latestHistoryEntry.changeSummary`, `currentAssignmentOwnerLabel: assignment?.ownerLabel ?? null`, `interventionLabel: string | null` (derive from `getInterventionForLifecycleState(lifecycleState)` style — local to support, returns 'Clarification needed' / 'Operational blocker' / 'Unavailable outcome' / null).
  - [x] Add `getRequestDetail(publicId)` returning `SupportRequestDetailResponse | null`:
    - Call `requestStoreService.getByPublicId(publicId)`. Return `null` if not found.
    - Map to the minimal detail payload defined in the controller task above.
  - [x] Do NOT mutate any `PersistedServiceRequest` — support is read-only in this story. Do NOT call `assignFulfillmentOwner`, `transitionRequestLifecycle`, or any write method on `RequestStoreService`. Manual intervention writes belong to Story 4.5.

- [x] Extend the shared contracts package with the support search and detail schemas (AC: 1, 2, 3)
  - [x] Create `packages/shared-contracts/src/support/support-search.schemas.ts`:
    - `supportSearchRequestQuerySchema`: `z.object({ q: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(50).optional() })`. The `coerce.number` is required because Express delivers query strings.
    - `supportRequestSearchResultSchema`: `z.object({ publicId, issueLabel, addressSummary, currentPublicStatusLabel, currentPublicStatusDetail, currentInternalLifecycleLabel, currentInternalLifecycleDetail, receivedAt: z.iso.datetime(), lastUpdatedAt: z.iso.datetime(), latestChangeSummary, currentAssignmentOwnerLabel: z.string().min(1).nullable(), interventionLabel: z.string().min(1).nullable() })`. All string fields use `z.string().min(1)` unless explicitly nullable.
    - `supportRequestSearchSummarySchema`: `z.object({ totalMatched: z.number().int().nonnegative(), limitReached: z.boolean() })`.
    - `supportRequestSearchResponseSchema`: `z.object({ items: z.array(supportRequestSearchResultSchema), summary: supportRequestSearchSummarySchema, refreshedAt: z.iso.datetime(), query: z.object({ q: z.string().nullable(), normalizedQ: z.string(), limit: z.number().int().positive() }) })`.
    - Export inferred types: `SupportRequestSearchResult`, `SupportRequestSearchSummary`, `SupportRequestSearchResponse`, `SupportSearchRequestQuery`.
  - [x] Create `packages/shared-contracts/src/support/support-request-detail.schemas.ts`:
    - Reuse `serviceLocationSchema` from `requests/intake.schemas.ts` (already exported from index).
    - Reuse `requestLifecycleStateSchema` from `health/health.schemas.ts` and `publicRequestStatusSchema` from `requests/request-status.schemas.ts`.
    - `supportRequestDetailCurrentStateSchema`: `z.object({ lifecycleState: requestLifecycleStateSchema, lifecycleStateLabel, lifecycleStateDetail, publicStatus: publicRequestStatusSchema, publicStatusLabel, publicStatusDetail })`.
    - `supportRequestDetailResponseSchema`: `z.object({ publicId, issueTypeId, issueLabel, createdAt: z.iso.datetime(), serviceLocation: serviceLocationSchema, currentState: supportRequestDetailCurrentStateSchema, latestChangeSummary, currentAssignmentOwnerLabel: z.string().min(1).nullable(), interventionLabel: z.string().min(1).nullable(), lastUpdatedAt: z.iso.datetime() })`.
    - Export inferred types: `SupportRequestDetailCurrentState`, `SupportRequestDetailResponse`.
  - [x] Add both files to `packages/shared-contracts/src/index.ts` (`export * from './support/support-search.schemas';` and `export * from './support/support-request-detail.schemas';`). Place them alphabetically next to the existing `./ops/...` block.
  - [x] Do NOT extend `internal-auth.schemas.ts` for this story — auth schemas are stable from Story 4.1.

- [x] Replace the placeholder support workspace with a real search experience (AC: 1, 2, 3)
  - [x] The current `apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx` shows a placeholder ("Customer request search and intervention tools arrive in the next support stories."). This story replaces that copy with the real search UI. The session-verification effect (`loadSupportProtectedSession`) MUST stay — it is the role-isolation gate inherited from Story 4.1.
  - [x] Add a search form inside the workspace panel: a single labelled input (`<label className="ops-field">`), a `Search requests` primary button (disabled while a request is in flight), and an optional helper line "Search by request id, issue, address, city, or postal code." Reuse existing `ops-page`, `ops-hero`, `panel`, `ops-login-panel`, `ops-field`, `ops-input`, `primary-button`, `ops-alert`, `helper-copy`, `ops-kicker`, `ops-session-card` classes from `apps/handrix-web/src/styles/globals.css`. Do NOT introduce new `support-*` CSS class names — visual parity with ops is intentional for this story (same constraint as Story 4.1).
  - [x] On submit, call `searchSupportRequests(session.accessToken, { q, limit: 25 })` (new helper). Surface results inside an `<ol className="ops-queue-list">` reusing the `ops-queue-item` card pattern from `apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx:27-78`. Each card shows: issue label as the heading, address summary, current public status label + detail, current internal lifecycle label, received and latest-update timestamps (use `Intl.DateTimeFormat`), latest change summary, current owner label if any, intervention label if any, and an `Open request` secondary button that calls `onOpenRequest(item.publicId)`.
  - [x] No-results state: when the query is non-empty and the response has zero items, render a calm card (`ops-session-card` pattern) with kicker "No matches found", heading "We could not find a request matching that search.", and helper text "Try a different request id, address, or issue label." No raw debug data, no echoing of the query inside the alert outside the calm copy.
  - [x] Empty initial state (before first search submitted): render a kicker `Search support requests` and helper copy explaining the supported search fields. Do NOT auto-load the entire request list on mount — that would expose customer data without intent.
  - [x] Loading state: while the search is in flight, set `isSubmitting` and disable the button (label `Searching…`). Use `isSubmitting` for the primary button and `isFetching` if a background refresh is added later — follow the loading-state names in `architecture.md#Loading State Patterns`.
  - [x] Error state: when the API throws `SupportAuthError` with a calm `message`/`recoveryHint`, render the message inside an `<div className="ops-alert" role="alert">` with the recovery hint paragraph. On a 401/403 specifically (`error.code === 'INTERNAL_AUTH_REQUIRED' | 'INTERNAL_AUTH_FORBIDDEN'`), call `onSessionExpired({ message, recoveryHint })` so the session is cleared and the user is redirected to `/support/login` — same role-isolation pattern Story 4.1 established.
  - [x] CRITICAL: Sign-out behavior, the existing `loadSupportProtectedSession` verification effect, and the `handrix.support.session` storage isolation (Story 4.1 invariant) MUST continue to work unchanged. Do NOT touch `support-auth-storage.ts` or `support-auth-api.ts`'s existing `createInternalSession` / `loadSupportProtectedSession` / `SupportAuthError` exports.

- [x] Add a dedicated support request detail screen with safe scope (AC: 1, 2)
  - [x] Create `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx` modeled on the protected-load + session-verify pattern in `support-workspace-screen.tsx`. It accepts props `{ publicId, session, onBack, onLogout, onSessionExpired }` (mirror `OpsRequestDetailScreenProps` in `apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx:15-21`).
  - [x] On mount: first call `loadSupportProtectedSession(session.accessToken)` to verify role; on success, call `loadSupportRequestDetail(session.accessToken, publicId)`. Both calls must share an `AbortController` and clean up on unmount (mirror `ops-request-detail-screen.tsx:62-119`).
  - [x] Render the detail panel using the same `ops-*` CSS class set: hero with title `Request {publicId}`, then sections for "Current state" (public status label + detail, internal lifecycle label + detail), "Service location" (address line 1, city, postal code, optional unit/access note), "Latest update" (latest change summary, last updated timestamp), and "Assignment" (owner label or "No fulfillment owner assigned yet"). Include a `Back to search` secondary button that calls `onBack()` and a `Sign out` secondary button that calls `onLogout()`.
  - [x] CRITICAL SCOPE: Do NOT render request history, intake answers, prior containment guidance, or the request review summary on this screen yet. Story 4.3 owns those surfaces. Add a small placeholder kicker and copy at the bottom: "Full request history and prior customer guidance arrive in the next support story." That copy is intentional — it sets accurate expectations without exposing data the backend is not yet returning.
  - [x] On `SUPPORT_REQUEST_NOT_FOUND` (404), surface the error envelope's `message` + `recoveryHint` in an `ops-alert` and keep the `Back to search` button visible. Do NOT auto-redirect — the agent may want to copy the id to retry.

- [x] Wire the new search and detail routes through `support-routes.ts` and `App.tsx` (AC: 1, 2)
  - [x] Update `apps/handrix-web/src/features/support-request-view/support-routes.ts`:
    - Extend `SupportRoute` to `'/support/login' | '/support/workspace' | \`/support/requests/${string}\`` (mirror `ops-routes.ts` route union).
    - Update `isSupportPath(pathname)` to also return `true` for `pathname.startsWith('/support/requests/')`.
    - Update `getSupportRoute(pathname)` to return the request detail path when it matches.
    - Add `getSupportRequestPublicId(pathname)` mirroring `getOpsRequestPublicId` (`ops-routes.ts:19-26`) — including `decodeURIComponent` of the trailing segment and a `null` return for empty ids.
  - [x] Update `apps/handrix-web/src/app/App.tsx`:
    - Inside the `isSupportPath(effectivePathname)` branch, after the workspace render, call `getSupportRequestPublicId(effectivePathname)`. If a publicId is present and `supportSession` is not null, render `<SupportRequestDetailScreen publicId={...} session={supportSession} onBack={() => navigateTo('/support/workspace', true)} onLogout={handleSupportLogout} onSessionExpired={handleSupportSessionExpired} />`.
    - Add a redirect effect mirroring the existing `useEffect` at `App.tsx:64-72`: if `pathname.startsWith('/support/requests/')` and `!supportSession`, call `window.history.replaceState(null, '', '/support/login')`. Update the `effectivePathname` calculation at `App.tsx:153-158` to also redirect `/support/requests/...` to `/support/login` when no session.
    - Pass an `onOpenRequest={(publicId) => navigateTo(\`/support/requests/${encodeURIComponent(publicId)}\`)}` prop to `SupportWorkspaceScreen` so the search results can navigate.
  - [x] Do NOT introduce React Router for this story; the existing `pathname` + `navigateTo` pattern in `App.tsx` is the established pattern. A future routing refactor (if needed) is out of scope.

- [x] Add the frontend API helpers for search and detail (AC: 1, 2, 3)
  - [x] Create `apps/handrix-web/src/features/support-request-view/support-search-api.ts`:
    - Export `searchSupportRequests(accessToken, { q, limit }, signal?)` returning `SupportRequestSearchResponse`.
    - Build the URL with `URLSearchParams` so `q` is properly encoded; only append `q` when non-empty and `limit` when defined.
    - Reuse the `parseApiError` / `readJsonBody` / `isAbortError` patterns from `support-auth-api.ts:31-56` (factor a shared internal helper if duplication grows large; otherwise duplicate is acceptable per the Story 4.1 precedent).
    - On non-OK response, throw `SupportAuthError` (existing class); on success, parse the body `data` field with `supportRequestSearchResponseSchema.safeParse`. On parse failure, throw a generic `SupportAuthError(fallbackMessage)`.
    - On network or fetch failures (TypeError, AbortError handling), mirror the catch logic added during the Story 4.1 review (`support-auth-api.ts:65-82`).
  - [x] Create `apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts`:
    - Export `loadSupportRequestDetail(accessToken, publicId, signal?)` returning `SupportRequestDetailResponse`.
    - URL: `${getApiBaseUrl()}/support/requests/${encodeURIComponent(publicId)}` — `encodeURIComponent` is required to handle ids that may contain slashes or special characters.
    - On non-OK response, parse the error envelope and throw `SupportAuthError` (the existing class is sufficient — it carries `code`, `message`, `recoveryHint`).
    - On success, parse with `supportRequestDetailResponseSchema.safeParse`. On parse failure, throw `SupportAuthError(fallbackMessage)`.

- [x] Preserve clean separation between customer, ops, and support request access (AC: 1, 2, 3)
  - [x] Do NOT add any new public (anonymous) endpoint. Customer intake, confirmation, and tracking remain unchanged. Story 4.2 only adds protected `/support/...` routes.
  - [x] Do NOT widen the public surface of `RequestStoreService`. Search reads through `listRequests()` which already exists; do NOT add a `search()` method on the store — keep filtering inside `SupportService` so the store stays a pure persistence seam.
  - [x] Do NOT change `OpsService`, `OpsController`, or any `ops-*` frontend file. Ops queue and ops detail must continue to work exactly as before; only add a regression test if any new shared helper appears that touches both modules.
  - [x] Do NOT share the `handrix.ops.session` storage with support; the Story 4.1 isolation rule still applies.
  - [x] An ops user who somehow obtains a token MUST receive 403 from both `GET /support/requests` and `GET /support/requests/:publicId`. A support user MUST receive 403 from any `/ops/*` route. The `@InternalRoles('support')` and `@InternalRoles('ops')` decorators give us this for free; cover it with regression tests in the next task.

- [x] Add automated coverage for search, open, no-match, and role isolation (AC: 1, 2, 3)
  - [x] Backend: extend `apps/handrix-api/src/modules/support/support.controller.spec.ts` with tests proving:
    - `GET /support/requests?q=hrx_` returns the wrapped envelope with parsed items and meta.generatedAt.
    - Empty `q` returns the empty calm-state envelope without scanning the store (verify via mocked `SupportService.searchRequests` call assertion).
    - `q` shorter than 2 chars returns empty results.
    - Invalid query (e.g. `limit=not-a-number`) → 400 with `SUPPORT_SEARCH_QUERY_INVALID` envelope.
    - `GET /support/requests/:publicId` returns the wrapped detail envelope.
    - Missing publicId returns 404 with `SUPPORT_REQUEST_NOT_FOUND` envelope.
    - Role-isolation: a valid ops token is rejected with 403 for both routes (use the `createHttpExecutionContext` helper from `apps/handrix-api/test/test-utils.ts` referenced in the existing 4.1 spec).
  - [x] Backend: add `apps/handrix-api/src/modules/support/support.service.spec.ts` exercising the real `SupportService` against an isolated `RequestStoreService` (use `RequestStoreService.forFilePath` with a `mkdtempSync` directory — pattern in `ops.service.spec.ts:81-92`):
    - Seeds 3+ persisted requests with different `publicId`, `issueLabel`, address fields, and lifecycle states (use the `buildPersistedRequest` and `createPersistedHistoryEntry` helpers — reference `ops.service.spec.ts:14-79`).
    - Search by partial publicId, issue label, address line, city, and postal code each return the expected matches.
    - Search is case-insensitive.
    - Sort order: most recently updated first.
    - `limit` cap is enforced and `summary.limitReached` reflects the truncation.
    - `q` shorter than 2 returns empty without throwing.
    - `getRequestDetail` returns the minimal payload (assert it does NOT contain `history`, `intakeAnswers`, `intervention` summary, `customerContext`, or `assignment` object — only `currentAssignmentOwnerLabel` and `interventionLabel`). This assertion is the test that prevents Story 4.3's data from leaking into 4.2.
    - `getRequestDetail` returns `null` for an unknown publicId.
  - [x] Backend: extend `apps/handrix-api/test/app.e2e-spec.ts` with end-to-end tests:
    - Login as the support user → call `GET /support/requests?q=...` → receive 200 with envelope.
    - Login as the support user → call `GET /support/requests/<existing-publicId>` → receive 200 with detail envelope.
    - Login as the support user → call `GET /support/requests/<unknown-publicId>` → receive 404 with `SUPPORT_REQUEST_NOT_FOUND`.
    - Login as the ops user → call `GET /support/requests` → receive 403 with `INTERNAL_AUTH_FORBIDDEN`.
    - Login as the ops user → call `GET /support/requests/<id>` → receive 403 with `INTERNAL_AUTH_FORBIDDEN`.
    - No-token call to `GET /support/requests` → receive 401 with `INTERNAL_AUTH_REQUIRED`.
    - Use the same supertest + Nest test app pattern that the existing e2e spec already establishes.
  - [x] Frontend: add `apps/handrix-web/src/features/support-request-view/support-workspace-screen.test.tsx` covering:
    - Renders the search form once `loadSupportProtectedSession` resolves.
    - Submitting a query calls the mocked `searchSupportRequests` once and renders each returned item with issue label, address, public status label, internal lifecycle label, latest change summary.
    - Empty results render the calm "no matches" card.
    - Server error renders the calm `ops-alert` with message + recovery hint.
    - 401/403 from the search call calls the `onSessionExpired` callback with the parsed message.
    - Clicking `Open request` on a result calls the `onOpenRequest` prop with the matched `publicId`.
  - [x] Frontend: add `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx` covering:
    - Renders loading copy, then the detail payload (issue label, address, current public status label, current internal lifecycle label, latest change summary, owner label or fallback "No fulfillment owner assigned yet").
    - 404 renders the calm `ops-alert` with the `SUPPORT_REQUEST_NOT_FOUND` message and `Back to search` remains visible.
    - 403 from either the session-verify call or the detail call invokes `onSessionExpired`.
    - `Back to search` button click calls `onBack`.
    - Sign-out button click calls `onLogout`.
  - [x] Frontend: extend `apps/handrix-web/src/app/App.test.tsx` covering:
    - Visiting `/support/requests/hrx_test` while authenticated as support renders the detail screen.
    - Visiting `/support/requests/hrx_test` without a support session redirects to `/support/login` (mirror the existing 4.1 redirect regression).
    - From the search workspace, calling `onOpenRequest` navigates to `/support/requests/<publicId>` and the URL is properly encoded (`encodeURIComponent`).
  - [x] Regression: confirm the existing Story 4.1 specs (`support-login-screen.test.tsx`, the existing role-isolation tests in `support.controller.spec.ts` and `app.e2e-spec.ts`, the App.test.tsx support-routing regressions) still pass without modification. Confirm the customer intake/tracking flows and all ops flows continue to pass.
  - [x] Validate the workspace from the repo root: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`. Story 4.1 set this as the validation bar; preserve it.

## Dev Notes

- **This is the support search seam, not the full support workspace.** The deliverable is a trustworthy search-and-open experience that Story 4.3 will enrich with full request history, prior customer guidance, intake answers, and operational notes. Story 4.4 will surface delay/block/unavailable explanations, and Story 4.5 will add manual intervention writes. Do NOT pull forward any of those scopes — every new field added to the detail response in Story 4.2 is an interface contract Story 4.3 will have to extend, not redesign.
- **Most of the auth seam is already done.** Story 4.1 established the `SupportModule`, `SupportController` with `@UseGuards(InternalAuthGuard, InternalRolesGuard)` + `@InternalRoles('support')`, the `internalSupportSessionSchema`, the `support-request-view/` frontend feature, isolated `handrix.support.session` storage, the `SupportLoginScreen`, and the placeholder `SupportWorkspaceScreen`. Story 4.2 layers two new protected routes onto that controller, replaces the workspace placeholder with a real search experience, and adds a separate detail screen.
- **Read-only across the board.** Support users in this story never write to a request. No assignment changes, no lifecycle transitions, no notes. The `RequestStoreService.assignFulfillmentOwner` and `transitionRequestLifecycle` methods MUST NOT be called from any support code path.
- **Keep public/internal status separation.** The detail response includes both `publicStatusLabel/Detail` (curated customer-facing) and `lifecycleStateLabel/Detail` (internal). Both are read from the same `PersistedServiceRequest` already produced by `RequestStoreService` — do NOT introduce a parallel status mapping for support. The architecture invariant "public status is a derived projection, not a separate source of truth" (`architecture.md:594-597`) still holds.
- **No UX spec exists for the support search workspace.** The UX specification only describes customer-facing screens plus brief operations notes (`ux-design-specification.md:46-50`). Maintain visual parity with the ops queue and ops request detail views by reusing the existing `ops-*` CSS classes — same constraint Story 4.1 followed. A dedicated support visual language belongs in a future UX spec update; not here.
- **Search behavior is intentionally narrow for MVP.** Free-text substring matching across `publicId`, `issueLabel`, address fields is enough for support to locate the right record. Status filters, date ranges, faceted search, and saved searches are explicitly out of scope. If the search list grows large, the `limit` cap (default 25, max 50) protects response size and frontend rendering; `summary.limitReached` is the seam future stories can use to add pagination.
- **Empty-query behavior matters.** Returning the entire request list when `q` is blank would expose customer data on workspace mount and break the "search-driven access" model (`architecture.md:578-580`). The empty-state contract is: `q` shorter than 2 → empty results envelope, no scan. The frontend mirrors this by not auto-firing on mount.

### Technical Requirements

- **Backend remains the source of truth.** Search filtering, sorting, and result-shape decisions all live in `SupportService`. The frontend never re-filters or re-sorts the response.
- **Role isolation is enforced at the backend.** Every new route uses `@InternalRoles('support')`. A valid token for the wrong role returns 403 with `INTERNAL_AUTH_FORBIDDEN` and no leakage of customer request payloads in the error body. Frontend route hiding is not the security mechanism (Story 4.1 invariant).
- **Follow the existing API envelope conventions** unchanged since Story 3.1 / 4.1:
  - Success: `{ data, meta? }` via `createSuccessResponse(...)`.
  - Error: `{ error: { code, message, recoveryHint? } }` via `createErrorResponse(...)`.
  - JSON stays `camelCase`; database columns stay `snake_case` (no DB writes here, but the persisted record fields already follow this — no need to remap).
- **All timestamps are ISO 8601 strings** in API responses (`architecture.md:344-345`). Use `new Date().toISOString()` on the server, `Intl.DateTimeFormat` for human-readable rendering on the client (mirror `ops-queue-screen.tsx:20-25`).
- **No regex from user input.** `String.prototype.includes` is the search primitive; trimming and lowercasing happen once in the service. ReDoS via a malicious `q` is not possible because the input never compiles to a regex.
- **Bounded response size.** `limit` is capped at 50 server-side. `summary.totalMatched` reports the pre-cap count so the frontend can show "Showing 25 of 73 results — refine your search."

### Architecture Compliance

- **Service boundary** (`architecture.md:578-592`): `support` owns search, visibility, and intervention-oriented workflows. Story 4.2 implements the search and visibility halves.
- **API boundary** (`architecture.md:574-576`): Internal support APIs live under `support` and provide read-heavy request history plus controlled intervention actions. The two new routes are read-heavy and additive.
- **Component boundary** (`architecture.md:486-487`): "Internal views for ops and support are separate features, even if they reuse lower-level request-summary components." The new screens stay inside `apps/handrix-web/src/features/support-request-view/`. Visual reuse of `ops-*` CSS classes is acceptable for MVP — they are presentational, not feature-bound.
- **Data boundary** (`architecture.md:594-597`): Prisma access is centralized through repositories/services. We do not have Prisma yet (Epic 5 owns that); `RequestStoreService` is the current durable seam and `SupportService` reads through it without touching the file store directly.
- **Naming patterns** (`architecture.md:291-314`): `camelCase` JSON fields, `kebab-case` frontend filenames, `PascalCase` Nest classes, `useFoo` hook prefixes (none added here). New Nest controller methods follow `getSomething` naming.
- **Implementation sequence item 5** (`architecture.md:268-276`): "Implement ops/support auth and internal request management APIs" — Story 4.1 completed the auth half; Story 4.2 begins the support read APIs.
- **Enforcement guidelines** (`architecture.md:399-409`): Use shared envelopes, keep `snake_case` / `camelCase` discipline, add tests when changing contract schemas. All three apply directly here.

### Library / Framework Requirements

- **No new runtime dependencies.** Everything needed is already installed.
- **Existing stack (verified in `apps/handrix-api/package.json` and `apps/handrix-web/package.json`):**
  - NestJS 11 (`@nestjs/common`, `@nestjs/core`) for backend modules, controllers, guards. Use `@Query()` to extract query params (`import { Query } from '@nestjs/common'`).
  - NestJS Swagger (`@nestjs/swagger`) for `@ApiTags`, `@ApiOperation`, `@ApiOkResponse`, `@ApiQuery`, `@ApiParam` decorators.
  - TypeScript ~5.7 across the workspace (strict mode on).
  - Zod 4 in `@handrix/shared-contracts`. Use `z.coerce.number()` for query-string numbers; use `z.iso.datetime()` for ISO timestamps to match existing schemas.
  - React 19 + Vite on the frontend. Vitest 4 + `@testing-library/react` 16 for frontend tests (`*.test.tsx`).
  - Jest 30 + `ts-jest` for backend tests (`*.spec.ts`). Supertest for e2e.
- **Custom HS256 JWT** for token issuance/validation (`apps/handrix-api/src/modules/auth/internal-auth-token.ts`). Do NOT introduce `jsonwebtoken`, `jose`, or `@nestjs/jwt`.
- **No password hashing library.** Internal staff credentials remain env-backed strings compared with `timingSafeEqual` (Story 4.1 invariant; persistence-backed identity is Epic 5 territory).
- **No search engine, no fuzzy match library.** `String.includes` after lowercasing is sufficient for MVP support workflows.

### File Structure Requirements

**Backend touch points:**
- EDIT: `apps/handrix-api/src/modules/support/support.controller.ts` (add `getRequests` and `getRequestDetail` route handlers)
- EDIT: `apps/handrix-api/src/modules/support/support.service.ts` (inject `RequestStoreService`; add `searchRequests` and `getRequestDetail` methods plus private mappers)
- EDIT: `apps/handrix-api/src/modules/support/support.module.ts` (add `RequestsModule` to `imports`)
- EDIT: `apps/handrix-api/src/modules/support/support.controller.spec.ts` (add new tests; reuse the existing `createHttpExecutionContext` helper)
- NEW: `apps/handrix-api/src/modules/support/support.service.spec.ts` (real-store integration tests)
- EDIT: `apps/handrix-api/test/app.e2e-spec.ts` (add support search + detail e2e + role-isolation regressions)

**Shared-contracts touch points:**
- NEW: `packages/shared-contracts/src/support/support-search.schemas.ts`
- NEW: `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
- EDIT: `packages/shared-contracts/src/index.ts` (add two `export *` lines for the new files)

**Frontend touch points:**
- EDIT: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx` (replace placeholder copy with the real search UI)
- EDIT: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.test.tsx` (extend to cover search interactions; if the file is currently a placeholder, add the new search assertions)
- NEW: `apps/handrix-web/src/features/support-request-view/support-search-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx`
- EDIT: `apps/handrix-web/src/features/support-request-view/support-routes.ts` (extend route union, add `getSupportRequestPublicId`)
- EDIT: `apps/handrix-web/src/app/App.tsx` (wire the new detail route + redirect rule + `onOpenRequest` prop)
- EDIT: `apps/handrix-web/src/app/App.test.tsx` (add support detail-route regressions)

**Do NOT touch:**
- `apps/handrix-api/src/modules/auth/` (auth primitives are role-agnostic and stable from Story 3.1 / 4.1).
- `apps/handrix-api/src/modules/ops/` (ops endpoints, queue, request detail, assignment, lifecycle update must continue to work unchanged).
- `apps/handrix-api/src/modules/requests/` (no new write paths; reads go through `RequestStoreService.listRequests` and `getByPublicId` which already exist).
- `apps/handrix-api/src/modules/reference-data/` and `health/` (out of scope).
- `apps/handrix-web/src/features/ops-queue/`, `issue-intake/`, `request-tracking/`, `request-review/`, `containment-guidance/` (must continue to work unchanged).
- `apps/handrix-web/src/features/support-request-view/support-auth-api.ts` (existing exports stable; only add new files for the new APIs).
- `apps/handrix-web/src/features/support-request-view/support-auth-storage.ts` (storage isolation is a Story 4.1 invariant).
- `apps/handrix-web/src/features/support-request-view/support-login-screen.tsx` and `.test.tsx` (login UI is stable).

### Testing Requirements

**Backend coverage must prove:**
- `GET /support/requests` with a valid support token + non-empty `q` returns 200 with the wrapped envelope and parsed items.
- Empty / short `q` returns 200 with an empty `items` array and `summary.totalMatched === 0`.
- `q` matches against publicId, issueLabel, address line 1, city, and postal code (case-insensitive).
- `limit` cap enforced; `summary.limitReached === true` when more matches exist than were returned.
- Sort order: latest update first, then `createdAt` desc as tiebreak.
- Invalid `limit` (non-numeric, negative, > 50) → 400 with `SUPPORT_SEARCH_QUERY_INVALID`.
- `GET /support/requests` with a valid ops token → 403 with `INTERNAL_AUTH_FORBIDDEN`.
- `GET /support/requests` with no token / malformed token → 401 with `INTERNAL_AUTH_REQUIRED` / `INTERNAL_AUTH_INVALID`.
- `GET /support/requests/:publicId` with a valid support token + existing id → 200 + minimal detail envelope.
- `GET /support/requests/:publicId` with an unknown id → 404 + `SUPPORT_REQUEST_NOT_FOUND`.
- `GET /support/requests/:publicId` with a valid ops token → 403.
- Detail response shape MUST NOT include `history`, `intakeAnswers`, `customerContext`, `intervention` (object), or `assignment` (object). Only the minimal fields enumerated in the controller task are present. This is the test that prevents Story 4.3 scope creep.
- Error responses never include customer request payload data (no `publicId` field in the envelope, no address strings, no issue labels).

**Frontend coverage must prove:**
- The workspace renders the search form once the support session is verified.
- Submitting a non-empty query calls the search API and renders each item's distinguishing fields (issue label, address, status, lifecycle label, owner label or fallback, intervention label or none, timestamps).
- Empty results render the calm no-results card.
- Server / network errors render the calm `ops-alert` with message + recovery hint; the search input is not cleared.
- 401/403 errors call `onSessionExpired`.
- Clicking `Open request` calls `onOpenRequest(publicId)` with the correct id.
- `SupportRequestDetailScreen` renders the minimal payload, handles 404 with a calm alert, handles 401/403 with `onSessionExpired`, and supports back navigation + sign-out.
- App-level routing: `/support/requests/<id>` redirects to `/support/login` when no support session; renders the detail screen when authenticated; `encodeURIComponent` is applied to ids when navigating from the search results.

**Regression coverage must confirm:**
- Customer intake, request creation, tracking, and recovery flows remain accessible without any staff auth.
- Ops login, ops queue, ops request detail, ops assignment, and ops lifecycle updates all continue to work unchanged.
- Anonymous tracking storage (`handrix.request-tracking.*`) and internal ops session storage (`handrix.ops.session`) are never read or written by support code.
- The Story 4.1 role-isolation specs continue to pass without modification.

**Validation commands (from repo root):**
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

### UX / Interaction Guardrails

- The support workspace remains utilitarian and visually parallel to the ops surfaces. Reuse `app-shell`, `ops-page`, `ops-hero`, `panel`, `ops-login-panel`, `ops-field`, `ops-input`, `ops-alert`, `ops-kicker`, `ops-session-card`, `ops-queue-list`, `ops-queue-item`, `helper-copy`, `primary-button`, `secondary-button` classes from `apps/handrix-web/src/styles/globals.css`. Do NOT introduce `support-*` class names or a new stylesheet in this story.
- Search field is always labelled (`<label className="ops-field">` with a visible `<span>` label). Keyboard submit (Enter) submits the form; the search button has an explicit `type="submit"`.
- Loading copy uses calm language ("Searching for matching requests…", not "Loading…").
- No-results copy is reassuring, not punishing ("We could not find a request matching that search." + "Try a different request id, address, or issue label."). It does NOT echo the raw query inside the alert.
- Error copy uses the existing recovery-hint pattern: error message in `<strong>`, optional `<p>` recovery hint inside `role="alert"`. Never expose raw backend error strings.
- Detail screen makes the data-scope honest: include the placeholder line "Full request history and prior customer guidance arrive in the next support story." so the agent does not assume missing data is a bug.
- Public status and internal lifecycle labels MUST appear with their accompanying detail copy to satisfy the "never rely on color alone" UX rule (`architecture.md` UX-DR12 from `epics.md:120-122`).
- Touch targets follow the existing button sizes (no overrides). Address summaries truncate gracefully via the existing card styles, not via `overflow: hidden` overrides.
- Sign-out from the search workspace clears only `handrix.support.session` (Story 4.1 invariant). No customer request data persists in localStorage.

### Previous Story Intelligence

**From Story 4.1 (direct precursor — same authorization seam):**
- The role-isolation pattern (`@UseGuards(InternalAuthGuard, InternalRolesGuard)` + `@InternalRoles('support')`) is the security mechanism. Apply it to every new support route. A regression test that proves an ops token receives 403 from the new routes is required, not optional.
- `loadSupportProtectedSession(accessToken)` is the frontend role-isolation gate. The new search workspace and detail screens MUST call it on mount and react to a 403 by clearing the session and redirecting to `/support/login` with the calm "This account does not have support access." copy.
- `handrix.support.session` storage is fully isolated from `handrix.ops.session`. Do not share, alias, or peek at the ops storage from any support code path.
- `SupportAuthError` (in `support-auth-api.ts`) is the unified error class for all support API surfaces. Reuse it for the new search and detail APIs — do not create `SupportSearchError` or `SupportRequestDetailError` unless a future story requires shape divergence.
- The `pnpm typecheck` / `pnpm test` / `pnpm lint` / `pnpm build` validation bar is the established quality gate. Preserve it.
- `parseInternalStaffUser({ role: 'support', ... })` in `apps/handrix-api/src/config/env.validation.ts:165-175` already seeds the support credentials. No env or credential work in this story.

**From Story 3.2 (direct architectural mirror — ops queue):**
- The `OpsService.getQueue` + `OpsController.getQueue` pattern is the closest architectural parallel for `SupportService.searchRequests` + `SupportController.getRequests`. Mirror the response-envelope, swagger decorator, and meta.generatedAt patterns exactly.
- `ops.service.ts` exposes a private `formatAddressSummary` helper (`ops.service.ts:182-196`). The same address formatting logic is needed for support results — duplicate it locally inside `support.service.ts` for now (acceptable per the Story 4.1 precedent that internal services stay independent for MVP). A future shared `request-presentation` module is out of scope.
- The `ops-queue-item` card pattern (`ops-queue-screen.tsx:27-78`) is the direct visual reference for the search result card.

**From Story 3.3 (architectural mirror — ops request detail):**
- The detail screen pattern (verify session → load detail → render → back nav) in `ops-request-detail-screen.tsx` is the direct reference for the support detail screen. Mirror the `AbortController` cleanup, the dual-call ordering (session verify before detail), and the error-state branching exactly.
- Story 3.3 surfaced full operational context (intake answers, customer context, history, intervention summary, available transitions). Story 4.2 deliberately exposes a strict subset; Story 4.3 will expand.

**From Story 3.7 (boundary discipline):**
- Story 3.7 consolidated runtime ownership inside `reference-data/` rather than spreading rules across modules. Apply the same discipline here: search and detail logic stay inside `support/`, not scattered into `requests/`, `ops/`, or new "shared" modules.
- Story 3.7 preserved existing contract shapes and only extended them when necessary. Do the same: add NEW support schemas under `packages/shared-contracts/src/support/`; do NOT modify ops schemas or shared request schemas.

**From Epic 2 retrospective (`epic-2-retrospective-2026-04-20.md`):**
- "The team kept lifecycle truth in the backend across the whole epic. That was the strongest architectural win and prevented frontend drift." Keep search filtering, sorting, and result-shape decisions in the backend; the frontend only renders.
- "Shared contracts in `packages/shared-contracts/src/` became the reliable center of gravity." The new support schemas MUST live there, not duplicated as ad-hoc TypeScript types in the frontend or backend.
- "The current file-backed persistence approach is still acceptable for MVP shaping, but it is now clearly a transitional seam." Do NOT add indexes, in-memory caches, or query optimizations to `RequestStoreService` for this story; if search performance becomes a real problem, that is an Epic 5 conversation paired with the PostgreSQL/Prisma migration.

### Git Intelligence Summary

- Recent commits remain sparse and per-epic (`feat:almost done with epic3`, `feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`). Commit titles do not add implementation detail; the source tree and the most recently completed story files are the authoritative grounding.
- The most relevant existing implementation artifacts to read before starting:
  - `apps/handrix-api/src/modules/ops/ops.controller.ts` (mirror for support search/detail controller shape, decorators, envelope usage, error envelope handling).
  - `apps/handrix-api/src/modules/ops/ops.service.ts` (mirror for service-level filtering, sorting, address formatting, presentation helpers).
  - `apps/handrix-api/src/modules/ops/ops.service.spec.ts` (mirror for the integration-style service spec using `RequestStoreService.forFilePath` and `mkdtempSync`).
  - `apps/handrix-api/src/modules/support/support.controller.ts`, `support.service.ts`, `support.module.ts` (the surfaces being extended).
  - `apps/handrix-api/src/modules/support/support.controller.spec.ts` (the test scaffolding to extend).
  - `apps/handrix-api/src/modules/requests/request-store.service.ts` (the read-only seam; understand `listRequests`, `getByPublicId`, and the persisted shape).
  - `apps/handrix-api/test/app.e2e-spec.ts` (the supertest + Nest test app pattern for the new e2e cases).
  - `apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx`, `ops-queue-api.ts`, `ops-request-detail-screen.tsx`, `ops-request-detail-api.ts`, `ops-routes.ts` (mirror for support equivalents — search workspace, search API, detail screen, detail API, route helpers).
  - `apps/handrix-web/src/features/support-request-view/*` (the existing feature surface to extend without breaking).
  - `apps/handrix-web/src/app/App.tsx` and `App.test.tsx` (extend with support detail routing without breaking ops or customer branches).
  - `packages/shared-contracts/src/ops/ops-queue.schemas.ts`, `ops-request-detail.schemas.ts`, `auth/internal-auth.schemas.ts`, `requests/intake.schemas.ts`, `requests/request-status.schemas.ts`, `health/health.schemas.ts` (reference shapes for the new support schemas).
  - `packages/shared-contracts/src/index.ts` (where the two new exports are added).
  - `_bmad-output/implementation-artifacts/4-1-enable-support-staff-authentication-and-access.md` (the immediate predecessor — same task cadence, same role-isolation invariants).
  - `_bmad-output/implementation-artifacts/3-2-show-an-operations-request-queue.md` and `3-3-let-operations-review-full-request-details.md` (the closest architectural parallels — search ≈ queue, open ≈ detail open).

### Project Structure Notes

- The project follows a pnpm monorepo with `apps/handrix-api/` (NestJS backend), `apps/handrix-web/` (Vite + React 19 frontend), and `packages/shared-contracts/` (Zod 4 schemas shared across apps).
- Feature/domain-first organization is mandatory (`architecture.md#Project Organization Principles`). Support code lives under `apps/handrix-api/src/modules/support/` and `apps/handrix-web/src/features/support-request-view/`. New shared schemas live under `packages/shared-contracts/src/support/`. Do NOT place support code under `features/ops-queue/`, `modules/ops/`, or any other domain — that boundary violation was explicitly prevented by the architecture.
- No `project-context.md` file exists in the repository. The authoritative sources for this story are the planning artifacts (`epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`), the completed Story 4.1 implementation artifact, the relevant Epic 3 ops stories, and the current source tree.
- Main structural risks for this story:
  - Returning the entire request list when `q` is empty (privacy + scope leak — explicitly forbidden by the empty-query contract).
  - Including history / intake answers / full intervention / customer guidance in the 4.2 detail response (Story 4.3 scope creep — caught by the explicit detail-shape test).
  - Building support search inside `OpsController` or `OpsService` (boundary violation; same constraint Story 4.1 enforced).
  - Sharing session storage keys with ops (authorization leak — Story 4.1 invariant).
  - Adding write paths or mutation calls (Story 4.5 scope creep; support is read-only in 4.2–4.4).
  - Frontend-only access control without the backend `@InternalRoles('support')` guard (security hole).
  - Modifying customer-facing `requests/` endpoints or tracking storage (regression risk).
  - Introducing React Router or new routing primitives mid-story (the existing pathname + `navigateTo` pattern is the established seam; a routing refactor is out of scope).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4: Equip Support for Trust Recovery and Request Intervention]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: Let Support Search and Open Individual Requests]
- [Source: _bmad-output/planning-artifacts/prd.md#Support & Trust Recovery] (FR32: Support staff can search for and access an individual customer request)
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] (NFR4: internal operations screens surface active request information quickly enough; NFR11: operational and support access restricted by role)
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] (lines 193-207 — JWT + RBAC for internal access)
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] (lines 209-227 — REST + uniform envelopes)
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] (lines 291-314 — snake_case persistence, camelCase JSON, kebab-case files)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats] (lines 333-345)
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns] (lines 380-385)
- [Source: _bmad-output/planning-artifacts/architecture.md#Loading State Patterns] (lines 387-395)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries] (lines 573-580)
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries] (lines 578-592)
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Boundaries] (lines 486-487)
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries] (lines 593-597)
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping] (lines 600-642 — support feature paths)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Secondary Users] (lines 46-50 — support staff baseline UX expectation)
- [Source: _bmad-output/implementation-artifacts/4-1-enable-support-staff-authentication-and-access.md] (direct predecessor — auth boundary, role isolation, storage isolation)
- [Source: _bmad-output/implementation-artifacts/3-2-show-an-operations-request-queue.md] (closest queue/list architectural parallel)
- [Source: _bmad-output/implementation-artifacts/3-3-let-operations-review-full-request-details.md] (closest detail-screen architectural parallel)
- [Source: _bmad-output/implementation-artifacts/epic-2-retrospective-2026-04-20.md] (backend-owned truth, shared contracts, transitional persistence seam)
- [Source: apps/handrix-api/src/app.module.ts] (existing module registration; no change needed)
- [Source: apps/handrix-api/src/config/env.validation.ts] (lines 86-175 — support user already seeded; no env work)
- [Source: apps/handrix-api/src/modules/auth/internal-auth.guard.ts]
- [Source: apps/handrix-api/src/modules/auth/internal-roles.guard.ts]
- [Source: apps/handrix-api/src/modules/auth/roles.decorator.ts]
- [Source: apps/handrix-api/src/modules/ops/ops.controller.ts] (controller + envelope + 404 pattern to mirror)
- [Source: apps/handrix-api/src/modules/ops/ops.service.ts] (lines 182-196 — `formatAddressSummary`; lines 132-180 — lifecycle presentation; lines 727-752 — service constructor/getQueue pattern)
- [Source: apps/handrix-api/src/modules/ops/ops.service.spec.ts] (lines 14-79 — `buildPersistedRequest` and `createPersistedHistoryEntry` reuse pattern)
- [Source: apps/handrix-api/src/modules/support/support.controller.ts] (controller to extend)
- [Source: apps/handrix-api/src/modules/support/support.service.ts] (service to extend with `RequestStoreService` injection)
- [Source: apps/handrix-api/src/modules/support/support.module.ts] (add `RequestsModule` import)
- [Source: apps/handrix-api/src/modules/support/support.controller.spec.ts] (extend; reuse `createHttpExecutionContext` from `apps/handrix-api/test/test-utils.ts`)
- [Source: apps/handrix-api/src/modules/requests/request-store.service.ts] (read-only seam — `listRequests`, `getByPublicId`)
- [Source: apps/handrix-api/test/app.e2e-spec.ts] (e2e pattern for support login + protected route)
- [Source: apps/handrix-web/src/app/App.tsx] (routing extension point; preserve existing branches)
- [Source: apps/handrix-web/src/app/App.test.tsx] (extend with support detail routing regressions)
- [Source: apps/handrix-web/src/features/ops-queue/ops-queue-screen.tsx] (search-result card visual pattern + loading/error/refresh patterns)
- [Source: apps/handrix-web/src/features/ops-queue/ops-queue-api.ts] (search API helper pattern)
- [Source: apps/handrix-web/src/features/ops-queue/ops-request-detail-screen.tsx] (detail screen verify-then-load pattern)
- [Source: apps/handrix-web/src/features/ops-queue/ops-request-detail-api.ts] (detail API helper pattern)
- [Source: apps/handrix-web/src/features/ops-queue/ops-routes.ts] (route union + `getOpsRequestPublicId` helper to mirror)
- [Source: apps/handrix-web/src/features/support-request-view/support-routes.ts] (extend route union)
- [Source: apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx] (replace placeholder with search UI)
- [Source: apps/handrix-web/src/features/support-request-view/support-auth-api.ts] (reuse `SupportAuthError`, `parseApiError`, `readJsonBody` patterns; do not modify exports)
- [Source: apps/handrix-web/src/features/support-request-view/support-auth-storage.ts] (storage isolation — do not modify)
- [Source: apps/handrix-web/src/styles/globals.css] (reuse existing `ops-*` CSS classes for visual parity)
- [Source: packages/shared-contracts/src/index.ts] (export new support schemas)
- [Source: packages/shared-contracts/src/auth/internal-auth.schemas.ts] (no change; reference for schema style)
- [Source: packages/shared-contracts/src/ops/ops-queue.schemas.ts] (reference shape for the search response schema)
- [Source: packages/shared-contracts/src/ops/ops-request-detail.schemas.ts] (reference shape — note 4.2 returns a strict subset)
- [Source: packages/shared-contracts/src/requests/intake.schemas.ts] (reuse `serviceLocationSchema`)
- [Source: packages/shared-contracts/src/requests/request-status.schemas.ts] (reuse `publicRequestStatusSchema`)
- [Source: packages/shared-contracts/src/health/health.schemas.ts] (reuse `requestLifecycleStateSchema`)
- [Source: packages/shared-contracts/src/common/api-envelope.ts] (success/error envelope helpers)

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m] (Claude Opus 4.7, 1M context)

### Debug Log References

- `pnpm typecheck` — green (shared-contracts build + handrix-web tsc -b + handrix-api tsc --noEmit)
- `pnpm --filter handrix-api test` — 15 suites / 93 tests passing
- `pnpm --filter handrix-api test:e2e` — 1 suite / 19 tests passing
- `pnpm --filter handrix-web test` — 6 suites / 51 tests passing
- `pnpm lint` — 0 errors, 19 pre-existing supertest typing warnings (same shape already present in Epic 3 / 4.1 tests)
- `pnpm build` — shared-contracts + handrix-api (nest build) + handrix-web (vite build) succeed

### Completion Notes List

- Added two new protected support routes behind the existing role-isolation guards: `GET /support/requests` (search) and `GET /support/requests/:publicId` (minimal detail). Both routes use `@InternalRoles('support')` and return the shared success envelope; detail returns `createErrorResponse({ code: 'SUPPORT_REQUEST_NOT_FOUND', ... })` on miss.
- Implemented search filtering, sorting, and result shape in `SupportService`. Filtering is a trimmed lowercase `String.prototype.includes` scan across `publicId`, `issueLabel`, `addressLine1`, `city`, `postalCode`, and `unitOrAccessNote`. Queries shorter than 2 characters short-circuit without scanning the store. Results sort by latest history occurredAt desc, then by createdAt desc. `limit` defaults to 25 and is capped server-side at 50; `summary.limitReached` reflects truncation.
- `SupportService.getRequestDetail` returns a strict subset compared to Story 3.3's ops detail: no `history`, no `intakeAnswers`, no `customerContext`, no `intervention` object, no `assignment` object. Only `currentAssignmentOwnerLabel` / `interventionLabel` are exposed. The service spec explicitly asserts those keys are not present to prevent Story 4.3 scope creep.
- `SupportModule` now imports `RequestsModule` to inject `RequestStoreService`. `RequestStoreService` reads go through the existing `listRequests()` and `getByPublicId()`; no mutation methods are called from support code.
- Added two new shared-contracts schemas under `packages/shared-contracts/src/support/` and exported them from `index.ts`. Inferred types include `SupportSearchRequestQuery`, `SupportRequestSearchResult`, `SupportRequestSearchSummary`, `SupportRequestSearchResponse`, `SupportRequestDetailCurrentState`, `SupportRequestDetailResponse`.
- Replaced the placeholder support workspace with a real search form. The session-verify effect from Story 4.1 is preserved. On submit, the workspace calls `searchSupportRequests(session.accessToken, { q, limit: 25 })` and renders matches as `ops-queue-item` cards. The empty initial state and the calm "no matches" card both ship; the search input is not cleared on error; 401/403 codes route through the existing `onSessionExpired` callback to clear the support-isolated session and redirect to `/support/login`.
- Added `SupportRequestDetailScreen` that mirrors the verify-then-load pattern from `ops-request-detail-screen.tsx`. Both calls share a single `AbortController` and clean up on unmount. The detail view exposes only the Story 4.2 fields plus a placeholder kicker ("Full request history and prior customer guidance arrive in the next support story.") so the narrower scope is visible to agents.
- `support-routes.ts` now covers `/support/requests/:publicId` via the `SupportRoute` union and a new `getSupportRequestPublicId()` helper (mirrors the ops equivalent including `decodeURIComponent`). `App.tsx` adds the redirect rule (unauthenticated access to `/support/requests/...` routes to `/support/login`), passes `onOpenRequest` to the workspace (encodes ids via `encodeURIComponent`), and renders `SupportRequestDetailScreen` when a support session is present.
- Reused existing `ops-*` CSS classes throughout — no new `support-*` classes were added. This matches the Story 4.1 precedent; a dedicated support visual language is out of scope.
- Test coverage added: `SupportController` controller spec (search envelope + short query + invalid limit + detail envelope + 404 + role isolation), `SupportService` service spec using `RequestStoreService.forFilePath` with a `mkdtempSync` directory (partial matches, case-insensitivity, sort order, limit cap + limitReached, short query, empty query, assignment + intervention labels, detail shape safety, null for unknown id), `app.e2e-spec.ts` (200 envelope for support token, invalid limit, 404 unknown id, 403 ops on both routes, 401 no token), `support-workspace-screen.test.tsx` (form rendering, search submission, calm no-results, error banner + recovery hint, 401/403 session expiry, open request callback, and existing 4.1 regressions), `support-request-detail-screen.test.tsx` (detail render, 404 calm alert, 401/403 on verify + on detail, back + logout buttons), `App.test.tsx` (detail route render, redirect to login when no session, encodeURIComponent on navigation).
- No new runtime dependencies added. No changes to `support-auth-api.ts`, `support-auth-storage.ts`, `support-login-screen.tsx`, auth guards, ops module, requests module, or customer-facing intake/tracking code. Role-isolation invariants from Story 4.1 are preserved.

### File List

**Shared contracts:**
- NEW: `packages/shared-contracts/src/support/support-search.schemas.ts`
- NEW: `packages/shared-contracts/src/support/support-request-detail.schemas.ts`
- MODIFIED: `packages/shared-contracts/src/index.ts`

**Backend (apps/handrix-api):**
- MODIFIED: `apps/handrix-api/src/modules/support/support.module.ts`
- MODIFIED: `apps/handrix-api/src/modules/support/support.service.ts`
- MODIFIED: `apps/handrix-api/src/modules/support/support.controller.ts`
- MODIFIED: `apps/handrix-api/src/modules/support/support.controller.spec.ts`
- NEW: `apps/handrix-api/src/modules/support/support.service.spec.ts`
- MODIFIED: `apps/handrix-api/test/app.e2e-spec.ts`

**Frontend (apps/handrix-web):**
- MODIFIED: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.tsx`
- MODIFIED: `apps/handrix-web/src/features/support-request-view/support-workspace-screen.test.tsx`
- MODIFIED: `apps/handrix-web/src/features/support-request-view/support-routes.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-search-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-api.ts`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.tsx`
- NEW: `apps/handrix-web/src/features/support-request-view/support-request-detail-screen.test.tsx`
- MODIFIED: `apps/handrix-web/src/app/App.tsx`
- MODIFIED: `apps/handrix-web/src/app/App.test.tsx`

**Sprint state:**
- MODIFIED: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- MODIFIED: `_bmad-output/implementation-artifacts/4-2-let-support-search-and-open-individual-requests.md`

## Change Log

- 2026-04-21 — Implemented Story 4.2: support search + minimal detail API and frontend surfaces behind the existing role-isolation guards. Added shared-contracts schemas, backend service + controller routes, frontend search workspace + detail screen, routing wiring, and regression + e2e coverage. All validation commands (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`) pass.
