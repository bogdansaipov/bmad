# Story 1.6: Submit an Anonymous Service Request

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to confirm my request without creating an account,
so that I can lock in help quickly and have my request stored with a trackable identity.

## Acceptance Criteria

1. When the customer reaches the review step with all required information and taps the primary confirmation action, the system creates and stores a service request with the captured intake details and assigns an internal lifecycle state plus a customer-safe tracking identity.
2. When request creation succeeds, the confirmation response does not require account creation and includes the information needed for later request tracking.
3. When anonymous request tracking is required for the MVP, the system returns a signed tracking token or equivalent signed tracking credential tied only to that request, with a token strategy clear enough to support secure later status lookup without exposing unrelated requests.
4. When submission fails because of validation issues or a temporary system problem, the interface presents a calm recoverable error state without losing progress, and duplicate confirmed requests are prevented.

## Tasks / Subtasks

- [x] Expand shared request-creation contracts in `packages/shared-contracts/src/requests/` to cover anonymous submission inputs and confirmation outputs (AC: 1, 2, 3, 4)
  - [x] Define Zod schemas and exported TypeScript types for the final request submission payload, success response, tracking credential, and machine-readable error shapes used by the SPA and API.
  - [x] Keep JSON and TypeScript fields in `camelCase`, preserve the shared `{ data, meta? }` success envelope, and avoid leaking persistence-only details into the public API shape.
  - [x] Add explicit fields for the customer-safe public request identifier, initial lifecycle/public status information needed for later confirmation and tracking work, and the signed tracking token or signed credential metadata.
- [x] Introduce a durable backend request-creation seam in `apps/handrix-api/src/modules/requests/` and the project persistence layer for MVP storage (AC: 1, 2, 3)
  - [x] Add the persistence model needed to store a service request created from the already-captured issue, answers, location, classification, and review context rather than keeping submission as an in-memory-only step.
  - [x] Persist an initial canonical lifecycle state plus an initial request history entry so later Epic 2 status work builds on a real stored request record instead of retrofitting one.
  - [x] Generate a customer-safe public ID and signed tracking token or equivalent signed credential that can later authorize request-status lookup without exposing unrelated requests.
- [x] Implement the public request-creation API in `apps/handrix-api/src/modules/requests/` (AC: 1, 2, 3, 4)
  - [x] Add `POST /requests` as the confirmation boundary that validates the final payload, creates the request transactionally, and returns the confirmation payload in the shared envelope.
  - [x] Prevent duplicate confirmed requests caused by rapid repeat taps or retry behavior, using an explicit idempotency or duplicate-guard strategy that is practical for the MVP and documented clearly in code/tests.
  - [x] Return calm, machine-readable validation and temporary-failure responses that allow the frontend to preserve state and show a recovery path instead of dropping the user back at the start.
- [x] Complete the review-to-confirmation handoff in `apps/handrix-web/src/features/request-review/` and `apps/handrix-web/src/features/issue-intake/` (AC: 1, 2, 4)
  - [x] Replace the currently disabled confirmation button with a real submission flow that sends the validated request payload to the backend and disables repeat submission while the request is in flight.
  - [x] Keep the customer on a calm, lightweight confirmation path that preserves the captured review data and shows a recoverable inline error state if submission fails.
  - [x] Store the returned public request identifier and tracking credential in the frontend handoff state needed for Story 2.1 and Story 2.3, without trying to implement the entire tracking experience early.
- [x] Define the MVP anonymous tracking-token approach explicitly and keep it implementation-safe (AC: 2, 3)
  - [x] Document and implement the token payload, signing method, and expiry or rotation expectations at the code boundary where the request is created.
  - [x] Keep the token tied only to the created request and customer-safe lookup use case; do not introduce customer accounts, broad session auth, or token shapes that reveal internal IDs directly.
  - [x] Ensure later request-status lookup can validate the credential server-side without the frontend inventing trust assumptions on its own.
- [x] Add automated coverage for anonymous request submission and duplicate protection (AC: 1, 2, 3, 4)
  - [x] Add frontend tests covering successful confirmation, disabled repeat submission while pending, recoverable failure messaging, and preservation of request-review state after a failed submit.
  - [x] Add backend unit, controller, and integration-style coverage for request creation, lifecycle initialization, tracking-token issuance, validation failures, and duplicate-request prevention behavior.
  - [x] Validate the workspace before closing the story with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 1.5 is currently in `review`, not `done`. Build directly on its request-review contracts and UI seam without assuming post-review refinements have already landed.
- The current confirmation button in [request-review-panel.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-review/request-review-panel.tsx) is intentionally disabled and explicitly says request creation belongs to Story 1.6. This story should convert that placeholder into the real submission boundary rather than adding a second confirmation surface elsewhere.
- The current review-loading API already posts a validated payload to [requests.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts) at `POST /requests/review-summaries`. Story 1.6 should add the true `POST /requests` creation endpoint alongside it, not overload the review-summary endpoint with persistence behavior.
- The request review payload produced in [requests.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts) already depends on machine-readable intake answers, service location, and classification. Reuse that same source data for final submission instead of reconstructing it from rendered strings in the frontend.
- The intake flow in [issue-intake-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx) already preserves issue selection, answers, service location, classification, containment guidance, and review summary in local state. Extend that flow carefully so submission errors do not clear progress or send the customer back to the first step.
- Architecture guidance calls for durable request storage, explicit lifecycle modeling, public/customer-safe status projection, and signed anonymous tracking. This story is where the first real implementation of those cross-cutting concerns should land, even if later stories expand them further.

### Technical Requirements

- Final request creation must be backend-owned and durable. Do not keep confirmed request data only in route-local React state or a mock in-memory object.
- The created request should persist the intake facts already gathered in Epic 1: selected issue, clarifying answers, service location, serviceability/classification outcome, and the expectation context needed for trustworthy confirmation and later support visibility.
- Request creation should initialize a canonical internal lifecycle state and enough status metadata for Epic 2 confirmation and tracking stories to build on without redefining the model.
- The anonymous tracking credential must be signed and scoped to a single request lookup use case. Avoid designs that expose sequential/internal identifiers or imply broader authorization.
- Duplicate confirmed requests must be prevented for obvious repeat-submit cases, especially double taps and retries after slow network responses.
- Failure handling must preserve customer progress and offer a calm retry path. Do not wipe the review step or lose the entered request details after a temporary failure.

### Architecture Compliance

- Follow the documented structure mapping for one-tap confirmation and request creation:
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
- Keep `requests` as the owner of request creation, lifecycle initialization, history creation, and public-status projection logic. Do not spread lifecycle truth into the frontend.
- Preserve the architecture rule that public customer APIs expose customer-safe data only, while richer internal state remains internal and later maps to curated public status values.
- Maintain shared Zod contracts for request submission and confirmation shapes so frontend/backend drift does not emerge at the moment the MVP introduces persistence.
- If persistence scaffolding is required, align it with the architecture direction toward PostgreSQL + Prisma migrations rather than inventing a parallel temporary storage layer that will be discarded immediately.

### UX / Interaction Guardrails

- The confirmation action should feel like the final low-friction step in the same calm intake flow, not like a heavy checkout or account-registration detour.
- Keep one dominant action on the review screen, and show progress or disabled state clearly while submission is pending so users understand Handrix is working rather than frozen.
- Error states should preserve reassurance and agency. Use grounded language that explains the request was not yet confirmed and that retrying will reuse the details already reviewed.
- Do not expose technical token language as the primary customer message. The customer-facing copy should emphasize that the request has been received and can be tracked later, while implementation details stay mostly behind the scenes.
- Stay aligned with the Warm Utility direction for pre-confirmation and the transition into Precision Dispatch readiness for confirmation and tracking.

### Implementation Notes

- A strong MVP path is to submit essentially the same machine-readable snapshot already used for review summary generation, then enrich it server-side with request identity, lifecycle initialization, and tracking-token issuance.
- Because the architecture explicitly notes that the exact lifecycle enum and token strategy needed early implementation definition, Story 1.6 should establish those foundations in a way Epic 2 can reuse directly.
- The current repository does not yet show Prisma schema or request-persistence files in active use. If new persistence infrastructure needs to be introduced, keep the first slice narrowly focused on request creation and the minimal history/status records required by this story.
- The initial confirmation response should include only what the next customer-facing step needs: a public identifier, customer-safe status/summary fields, and the tracking credential or its managed equivalent. This is an implementation recommendation inferred from the architecture and current code seams, not a locked contract.

### Testing Requirements

- Add or update frontend tests to verify:
  - the review screen can submit a real request from the primary confirmation action
  - the confirmation action becomes non-repeatable while the request is pending
  - recoverable API failures preserve the review state and show calm retry messaging
  - the frontend captures the returned request identity and tracking credential for the next story handoff
- Add backend coverage to verify:
  - request creation persists the expected intake data and initializes lifecycle/history state
  - the success payload returns a customer-safe identifier and signed tracking credential
  - invalid submission payloads and temporary failures return stable machine-readable errors
  - duplicate request prevention works for rapid repeat submits or equivalent retry paths
- Keep tests co-located where practical, with backend integration-style coverage remaining in `apps/handrix-api/test/`.

### Previous Story Learnings

- Story 1.5 established a dedicated `request-review` frontend seam and backend review-summary assembly. Story 1.6 should complete that seam by attaching real submission behavior rather than routing confirmation back through the intake screen.
- Story 1.4 and Story 1.5 already shaped the pre-confirmation journey around containment guidance, expectation setting, and state continuity. Preserve that continuity when submission fails.
- Earlier Epic 1 stories consistently kept the backend as the source of truth for machine-readable issue, classification, and guidance data. Continue that pattern for lifecycle initialization and tracking identity.
- Git history is still effectively just the initial commit, so the implementation artifacts and current source tree are more trustworthy than commit history for established project patterns.

### Project Structure Notes

- No `project-context.md` file was found; the planning artifacts remain the authoritative source for product, architecture, and UX constraints.
- The codebase already contains `apps/handrix-web/src/features/request-review/` and `apps/handrix-api/src/modules/requests/`, which are the correct seams for this story.
- The shared contracts package currently includes intake, containment, review, and basic request-status types, but it does not yet expose a completed anonymous request-creation contract. This story should add that boundary before the API and SPA implementations diverge.
- Architecture planning explicitly reserves later customer tracking work for `apps/handrix-web/src/features/request-tracking/` and backend public-status mapping, so Story 1.6 should prepare those futures without trying to implement all of Epic 2 at once.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.6: Submit an Anonymous Service Request]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 1: Launch the Handrix Request Flow Foundation]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Final Recommendations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Core User Experience]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Desired Emotional Response]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-5-review-eta-pricing-expectations-and-request-summary.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-14: Created Story 1.6 from sprint backlog and assembled implementation context from epics, architecture, UX, the current request-review flow, and prior Epic 1 implementation artifacts.
- 2026-04-14: Added shared anonymous request submission and confirmation schemas, including public request status and signed tracking credential shapes.
- 2026-04-14: Implemented backend request creation with durable JSON-backed storage, initial lifecycle/history records, signed tracking tokens, and idempotency-key duplicate protection.
- 2026-04-14: Wired the review screen to submit real requests, preserve reviewed state on failure, and show a lightweight account-free confirmation state on success.
- 2026-04-14: Verified the workspace successfully with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Added shared request-creation contracts so the SPA and API now agree on confirmation payloads, customer-safe IDs, signed tracking credentials, and recoverable error envelopes.
- Implemented backend-owned anonymous request creation with durable file-backed persistence, initial lifecycle/history state, signed request-status credentials, and idempotent duplicate-submit handling.
- Completed the review-to-confirmation handoff in the SPA, including pending-state protection, calm retry messaging, and a lightweight success state that keeps the account-free promise visible.
- Added frontend, backend unit, backend controller, and backend e2e coverage for successful confirmation and failure/duplicate protection paths.

### File List

- _bmad-output/implementation-artifacts/1-6-submit-an-anonymous-service-request.md
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.ts
- apps/handrix-api/src/modules/requests/requests.module.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- apps/handrix-web/src/features/issue-intake/issue-intake-screen.tsx
- apps/handrix-web/src/features/request-review/request-confirmation-api.ts
- apps/handrix-web/src/features/request-review/request-review-panel.tsx
- packages/shared-contracts/src/requests/request.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-14: Created Story 1.6 from the next backlog item in `sprint-status.yaml` and populated it with implementation context, architecture guardrails, and testing expectations.
- 2026-04-14: Implemented anonymous request confirmation with shared contracts, backend request persistence, signed tracking credentials, frontend confirmation UX, and full workspace validation.
