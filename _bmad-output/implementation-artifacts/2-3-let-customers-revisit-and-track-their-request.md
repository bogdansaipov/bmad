# Story 2.3: Let Customers Revisit and Track Their Request

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to open my request status view using my tracking identity,
so that I can check progress without creating an account.

## Acceptance Criteria

1. Given a customer has a successfully created request, when they use the tracking identity returned at confirmation, then they can retrieve the current customer-facing request status without authenticating as a registered account, and access is limited to the intended request only.
2. Given public request lookup depends on an anonymous tracking credential, when the backend validates the supplied tracking token, then the lookup succeeds only for a valid signed token that matches the intended request, and expired, tampered, or mismatched credentials are rejected without leaking request existence details.
3. Given a customer opens the tracking view later, when the request is fetched, then the system returns the current public status, key timestamps or progress context, and the next-step message, and the tracking experience works on modern mobile browsers.
4. Given the tracking identity is invalid, expired, or malformed, when a status lookup is attempted, then the customer sees a calm recoverable error state, and the system does not expose internal request details or sensitive information.

## Tasks / Subtasks

- [x] Add a backend-owned anonymous request-tracking lookup seam that reuses the existing request identity model instead of inventing a second access path (AC: 1, 2, 3, 4)
  - [x] Extend [requests.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts) with a public request-status lookup endpoint under the existing `requests` module, returning the shared `{ data, meta? }` envelope and customer-safe errors only.
  - [x] Add a request-status lookup method in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) that resolves one request by public tracking identity, shapes a customer-safe response, and never exposes internal lifecycle values or request-existence hints.
  - [x] Extend [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) with a focused lookup method such as `getByPublicId(...)` or an equivalent read seam rather than scanning or reshaping persistence ad hoc inside controller code.
- [x] Centralize request-tracking token signing and validation so Story 2.3 does not duplicate or drift from Story 1.6 credential issuance (AC: 1, 2, 4)
  - [x] Extract the current token creation logic in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) into a dedicated helper/service owned by the `requests` domain, and use the same implementation for both issuance and verification.
  - [x] Validate signature, expiry, scope, and public request identity together; treat expired, malformed, tampered, or mismatched tokens as the same customer-safe failure class from the API boundary.
  - [x] Keep the tracking token out of URLs, logs, and frontend error copy. If the frontend needs to persist it for revisit behavior, store it in a controlled client-side seam instead of placing bearer-like secrets in route params or query strings.
- [x] Introduce a shared request-tracking contract that is ready for revisit lookup now and timeline expansion later without overbuilding Story 2.4 early (AC: 1, 3, 4)
  - [x] Extend `packages/shared-contracts/src/requests/` with a customer-safe request-status lookup request/response schema that includes the public status presentation plus the minimal progress context needed now, such as stable identifiers, relevant timestamps, and next-step messaging.
  - [x] Correct or replace the current placeholder export in [request-status.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts) before using it as a source of truth for tracking contracts.
  - [x] Reuse backend-owned public status presentation from Story 2.2 instead of creating a second frontend-only tracking status model.
- [x] Build a dedicated customer request-tracking feature on the web app that supports later revisit without rewriting the intake flow (AC: 1, 3, 4)
  - [x] Add a `request-tracking` frontend seam under `apps/handrix-web/src/features/request-tracking/` for the tracking page, API client, and local view-model helpers, following the architecture's journey-based feature structure.
  - [x] Add the minimal app-level routing or view-entry needed so a customer can reopen a status view after confirmation without replaying the entire intake flow; keep the current intake experience as the default entry and avoid a large frontend shell rewrite.
  - [x] Seed the tracking view from the confirmation handoff in [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx) and/or a small persistence seam for the latest tracking identity, but do not add account creation, share flows, or unrelated request-history UX in this story.
- [x] Make the revisit experience mobile-first, calm, and recoverable while explicitly stopping short of the full live timeline reserved for Story 2.4 (AC: 3, 4)
  - [x] Render the current public status, a concise progress summary, and the next-step message in a dedicated tracking state that is glanceable on mobile and aligned with the Precision Dispatch direction for post-confirmation experiences.
  - [x] Add a calm recoverable error state for invalid or expired tracking credentials using customer-safe language and an obvious next step, without implying whether the request exists.
  - [x] Do not implement polling-driven live refresh history or a multi-step timeline yet; shape the screen so Story 2.4 can add automatic refresh and richer progress states without undoing Story 2.3.
- [x] Add automated coverage for token validation, anonymous lookup, and revisit rendering behavior (AC: 1, 2, 3, 4)
  - [x] Update backend unit tests in [requests.service.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.spec.ts) and add any focused token helper tests needed to cover valid lookup, expiry, tampering, scope mismatch, and public ID mismatch behavior.
  - [x] Update controller and/or e2e coverage in [requests.controller.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.spec.ts) and [app.e2e-spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/app.e2e-spec.ts) to prove the API returns a customer-safe success shape and a non-leaky failure shape.
  - [x] Add frontend tests in [App.test.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.test.tsx) and/or feature-local tests for successful revisit, persisted tracking handoff, and calm invalid-token recovery rendering.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.6 already established the anonymous tracking identity seam by returning `publicId` plus `trackingCredential` from request creation. Story 2.3 should extend that exact seam into lookup behavior, not introduce a second anonymous-access model.
- Story 2.1 deliberately improved the post-submit confirmation experience without adding a real revisit page. The current confirmation handoff in [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx) is therefore the right place to launch or seed tracking, but not the place to keep all long-term tracking UI.
- Story 2.2 centralized customer-safe public status presentation in the backend. Reuse `resolvePublicRequestStatusPresentation(...)` and the shared presentation schema rather than rebuilding labels or detail text in the frontend.
- The live backend currently signs tracking tokens inside `RequestsService.createTrackingCredential(...)`, and the persisted request already stores both `publicId` and `trackingCredential`. That is useful foundation, but token verification does not exist yet and should be centralized before lookup logic is added.
- The current frontend app still renders only [App.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx) -> `IssueIntakeScreen`. The architecture expects route- and feature-based separation for tracking, so this story may introduce the minimum React Router-style entry needed for revisit, but should avoid rewriting the entire intake flow in one pass.
- The shared contracts package currently defines `requestStatusSchema` inside [request.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts), while [request-status.schemas.ts](/home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts) is only a placeholder alias. Clean this up before adding tracking contracts so future stories do not build on the wrong source file.
- This story is about secure lookup and a stable tracking screen entry. Polling cadence, inline refresh indicators, and richer timeline progression belong to Story 2.4.

### Technical Requirements

- Keep anonymous request tracking customer-safe and request-scoped: a valid token must only unlock the intended request, and invalid tokens must fail without confirming whether a request exists.
- Reuse one backend-owned token helper/service for issuance and verification so signing inputs, expiry rules, and scope checks cannot drift across code paths.
- Preserve the internal/public lifecycle split: the tracking response may expose public status presentation and customer-safe progress context, but it must not leak internal lifecycle states such as `intake_in_review` or `dispatch_in_progress`.
- Keep JSON contracts `camelCase`, timestamps ISO 8601, and response envelopes aligned with the shared API conventions already used by the `requests` controller.
- Prefer a dedicated tracking response shape in the shared contracts package over reusing the confirmation response verbatim; the tracking screen needs stable lookup semantics and progress context, not confirmation-only copy.
- Keep the token off URLs. If the web app needs revisit persistence on the same device, store the credential in a narrowly scoped client-side persistence seam keyed by `publicId` or equivalent, and make that storage path easy to replace later if product requirements evolve.

### Architecture Compliance

- Keep customer-facing request APIs in `apps/handrix-api/src/modules/requests/`.
- Keep shared tracking contracts in `packages/shared-contracts/src/requests/`.
- Add frontend tracking UI under `apps/handrix-web/src/features/request-tracking/`, matching the architecture's journey-based feature organization.
- Follow the architecture rule that the request lifecycle/state-machine remains the source of truth and public status projection stays backend-derived.
- Keep the MVP polling upgrade path open by designing the tracking contract so it can serve both one-time revisit lookup now and repeated refreshes in Story 2.4.

### UX / Interaction Guardrails

- The tracking screen should feel calm, explicit, and easy to scan on mobile. Customers should immediately understand the current state, whether they need to do anything, and what happens next.
- Invalid, expired, or malformed tracking credentials should produce a recoverable state card, not a raw HTTP-style error dump or ambiguous blank page.
- Use labels, headings, and explanatory copy together; do not rely on color alone to communicate the current request state.
- Preserve the Warm Utility to Precision Dispatch transition established in Epic 2: revisit/tracking should feel more structured than intake, but still reassuring and human.
- Do not add the full timeline visualization, background polling indicators, or request history archive yet. Those belong to Story 2.4 and Story 2.6.

### Implementation Notes

- A low-risk backend path is:
  - move tracking token creation/verification into a dedicated request-domain helper
  - add store lookup by `publicId`
  - add a customer-safe request-status lookup service method
  - expose that lookup through a public request-status endpoint
- A low-risk frontend path is:
  - add a `request-tracking` feature folder with one API client and one screen component
  - introduce only the minimal routing or mode switching needed for direct revisit
  - seed the initial tracking identity from the existing confirmation result
  - keep current intake screens intact
- If React Router or TanStack Query are introduced here to align with architecture, keep adoption narrow and story-driven. Do not refactor unrelated intake behavior solely for framework purity.
- Avoid placing signed tokens in shareable URLs or exposing them in visible page chrome. Customers may see request IDs or customer-safe labels, but the token itself should remain an implementation credential.

### Testing Requirements

- Add backend tests that cover:
  - successful anonymous lookup with a valid token for the intended request
  - rejection of expired, malformed, tampered, wrong-scope, and wrong-request tokens
  - customer-safe success payload shaping using backend-owned public status presentation
  - customer-safe failure envelopes that do not leak request existence
- Add frontend tests that cover:
  - entering the tracking experience from the confirmation handoff
  - reopening a previously tracked request using the stored tracking identity on the same device, if persistence is added
  - rendering a calm status view for a successful lookup
  - rendering a recoverable invalid-token state without exposing technical details
- Keep tests close to the existing seams unless the new `request-tracking` feature justifies its own focused test file.

### Previous Story Learnings

- Story 1.6 proved the anonymous request boundary and signed tracking credential model. Story 2.3 should build on those contracts instead of changing how requests are identified after confirmation.
- Story 2.1 showed that the confirmation moment should stay customer-safe and reassuring. Tracking should continue that tone while shifting into clearer structured progress.
- Story 2.2 established that public status labels and detail copy are backend-owned and shared-contract-backed. Reuse that pattern for tracking so confirmation, revisit, and later timeline views all speak the same status language.
- The live codebase is more informative than git history here: commit history is sparse, but current request-domain seams already point clearly toward a secure lookup implementation path.

### Project Structure Notes

- Current seams that this story should extend:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-web/src/features/issue-intake/`
- New seam expected by architecture and this story:
  - `apps/handrix-web/src/features/request-tracking/`
- There is no `project-context.md` file in the repository, so the planning artifacts and the current codebase remain the authoritative source context.
- The main structural risks are duplicating token logic in multiple files, putting signed credentials in URLs, and creating a tracking UI that Story 2.4 will have to replace instead of extend.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.3: Let Customers Revisit and Track Their Request]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Desired Emotional Response]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Request Status Timeline]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-6-submit-an-anonymous-service-request.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-1-show-a-clear-request-confirmation-state.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-2-define-and-expose-customer-safe-request-statuses.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/app/App.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 2.3 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Analyzed Epic 2, PRD lifecycle requirements, architecture constraints for signed tracking tokens and public polling endpoints, and UX guidance for post-confirmation status experiences.
- 2026-04-20: Reviewed the implemented Story 2.1 and Story 2.2 artifacts plus the current `requests` backend, shared contracts, and web app seams to ground this story in live code rather than planning docs alone.
- 2026-04-20: No additional web research was required because this story is constrained by the repository's current architecture, code seams, and already-selected stack.
- 2026-04-20: Added a backend request-status lookup endpoint, store lookup by `publicId`, and a centralized request-tracking credential helper for issuance and validation.
- 2026-04-20: Moved request-status tracking contracts into `packages/shared-contracts/src/requests/request-status.schemas.ts` and added request-status lookup request/response schemas for both apps.
- 2026-04-20: Added a dedicated `request-tracking` frontend feature with same-device tracking persistence, confirmation handoff into tracking, saved-request reopen entry, and a calm invalid-credential recovery state.
- 2026-04-20: Verified Story 2.3 with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story scope is explicitly limited to secure anonymous lookup and revisit entry, leaving timeline polling and richer progress history to Stories 2.4 and 2.6.
- Captured a concrete implementation hazard: `packages/shared-contracts/src/requests/request-status.schemas.ts` is currently a placeholder alias and must not become the long-term source of truth unchanged.
- Added a customer-safe `POST /requests/status-lookups` backend seam that validates signed tracking credentials, rejects mismatches without leaking request existence, and returns a tracking response shaped from backend-owned public status presentation.
- Centralized request-tracking credential issuance and verification in a dedicated request-domain helper and reused it for both request creation and status lookup.
- Added shared request-status lookup schemas/types and moved status-related contract ownership into `request-status.schemas.ts` so tracking contracts no longer depend on the old placeholder export.
- Added a dedicated web `request-tracking` feature, persisted the latest tracking identity on the same device, and connected confirmation-state handoff plus saved-request reopen behavior.
- Added frontend and backend regression coverage for successful revisit, invalid-token recovery, and customer-safe anonymous lookup behavior; all required validation commands passed.

### File List

- _bmad-output/implementation-artifacts/2-3-let-customers-revisit-and-track-their-request.md
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/request-tracking-credential.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/app/App.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/request-review/request-review-panel.tsx
- apps/handrix-web/src/features/request-tracking/request-tracking-api.ts
- apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx
- apps/handrix-web/src/features/request-tracking/request-tracking-storage.ts
- apps/handrix-web/src/styles/globals.css
- packages/shared-contracts/src/requests/request-status.schemas.ts
- packages/shared-contracts/src/requests/request.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-20: Implemented Story 2.3 by adding secure anonymous request-status lookup, centralized tracking credential validation, shared tracking contracts, same-device request-tracking UI, and regression coverage across backend and frontend.
