# Story 2.6: Preserve Customer-Visible Request History

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operations-ready platform,
I want meaningful request-state changes recorded with customer-facing context,
so that later support and ops workflows can stay aligned with what the customer saw.

## Acceptance Criteria

1. Given a request is created and progresses through lifecycle states, when a meaningful public or internal-to-public status transition occurs, then the system records the transition in durable request history, and the history includes the previous state, next state, timestamp, and relevant actor or system context when available.
2. Given customer-facing messages accompany a lifecycle transition, when the request history entry is stored, then the record preserves the public status context needed to reconstruct what the customer saw, and the history supports later support and operational visibility requirements.
3. Given request history is used by tracking or later internal tools, when historical lifecycle data is queried, then the system can return ordered state transitions without losing recoverability or consistency, and confirmed requests are not left without an auditable operational record.

## Tasks / Subtasks

- [x] Enrich the persisted request-history model so each meaningful transition stores auditable before/after lifecycle context instead of only the latest note string (AC: 1, 3)
  - [x] Extend [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) history types and append APIs to capture `previousLifecycleState`, `nextLifecycleState`, `previousPublicStatus`, `nextPublicStatus`, `occurredAt`, `actorType`, and optional `actorId`.
  - [x] Keep the current request record’s canonical `lifecycleState` and `publicStatus` fields as the source of truth, while the history array remains append-only for meaningful transitions only.
  - [x] Preserve backward compatibility for existing JSON-backed records that only have the older `{ lifecycleState, publicStatus, createdAt, note }` shape by normalizing them during read or timeline assembly rather than breaking current requests.
- [x] Preserve customer-visible messaging context inside each history entry so later support and ops surfaces can reconstruct the customer experience accurately (AC: 1, 2)
  - [x] Add the minimum stored customer-facing snapshot needed to replay what the customer saw at each transition, such as status label/detail, transition summary, next-step detail, and any recovery-state payload that was shown.
  - [x] Reuse backend-owned presenters in [request-status.presenter.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status.presenter.ts), [request-status-recovery.presenter.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts), and [request-status-timeline.presenter.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts) so stored customer context is derived from the same authoritative mapping already used by the tracking API.
  - [x] Avoid storing raw frontend copy decisions or ad hoc UI-only metadata that could drift from the shared contracts.
- [x] Introduce a request-history seam that can power both current customer tracking and later internal tooling without prematurely building Epic 3 or Epic 4 APIs (AC: 2, 3)
  - [x] Add or extend a focused history-normalization/presenter helper in `apps/handrix-api/src/modules/requests/` if the logic becomes too large for `request-store.service.ts` or `request-status-timeline.presenter.ts`.
  - [x] Keep `POST /requests/status-lookups` in [requests.controller.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.ts) as the only customer-facing lookup seam for Epic 2, but shape its response so ordered history remains consistent with what future support and ops surfaces will need.
  - [x] Do not create internal queue, search, assignment, or intervention endpoints in this story; this work is history-modeling and projection readiness only.
- [x] Extend the shared contracts so request-history data has an explicit, stable type instead of remaining an implicit persistence detail (AC: 1, 2, 3)
  - [x] Add request-history schemas and exported types in `packages/shared-contracts/src/requests/`, keeping JSON fields `camelCase` and timestamps ISO 8601.
  - [x] Decide whether the current customer status response should expose a richer `history` field, a refined `timeline` source model, or both, but keep the public contract consistent with existing Epic 2 tracking behavior.
  - [x] Preserve the architecture rule that lifecycle truth and customer-context derivation are backend-owned and shared-contract-backed.
- [x] Keep the customer tracking experience consistent while history storage becomes richer and more durable in practice (AC: 2, 3)
  - [x] Ensure [request-tracking-screen.tsx](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx) can continue rendering the current timeline and recovery modules without copy drift or ordering regressions if the response shape expands.
  - [x] If richer history is exposed to the frontend, keep the UI focused on calm customer tracking rather than surfacing internal-only actor or audit noise.
  - [x] Preserve the current invalid-token and refresh-failure handling from Stories 2.3 through 2.5 as separate concerns from valid tracked-request history.
- [x] Add automated coverage for durable history recording, normalization, and ordered retrieval (AC: 1, 2, 3)
  - [x] Extend [requests.service.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.spec.ts) with scenarios covering request creation, clarification, delay, unavailable, and completion transitions, asserting both the current state and the appended history metadata.
  - [x] Add focused tests for [request-store.service.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts) and/or new presenter helpers to verify append-only ordering, backward-compatible normalization of older entries, and customer-context preservation.
  - [x] Update [requests.controller.spec.ts](/home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.controller.spec.ts) and any relevant frontend tests so the shared response envelope remains stable while history data becomes richer.
  - [x] Validate the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

## Dev Notes

- Story 2.4 established the current customer timeline response, and Story 2.5 extended it with backend-owned recovery-state messaging. Story 2.6 should preserve that single-source-of-truth approach while making the underlying request history durable and reconstructable enough for later ops and support work.
- The current JSON-backed request store already persists requests and a simple `history` array, so this story should extend that seam rather than inventing a second audit system. The main gap is fidelity: current entries do not preserve previous/next states, actor context, or the exact customer-facing status context shown at each transition.
- Architecture direction is clear even though PostgreSQL and Prisma are planned later in Epic 5: the request record should hold the canonical current state while append-only history captures every meaningful transition and customer-visible messaging context. This story should move the code toward that model without forcing the full database migration early.
- Customer-facing history remains backend-owned. The frontend should render ordered history data and current recovery/timeline modules, but it must not synthesize status transitions, actor context, or customer copy on its own.

### Technical Requirements

- Preserve the internal/public split already established in Epic 2:
  - lifecycle changes remain backend truth
  - public statuses and recovery-state context remain curated, customer-safe projections
- Keep request history append-only for meaningful transitions only; avoid mutating or reordering prior history entries after they are written.
- Preserve backward compatibility for existing request records in the file-backed store so previously created requests still load and render after the history model expands.
- Ensure ordered retrieval is deterministic by timestamp and stored sequence so timeline/history consumers do not lose consistency during repeated reads.
- Record actor context conservatively:
  - use `system` when the transition is automated
  - support optional actor identifiers for future internal staff actions
  - do not expose internal-only actor details on customer surfaces unless the shared contract explicitly allows a customer-safe version
- Reuse backend presenters to derive stored customer-visible context rather than duplicating labels/details at write sites all over the codebase.

### Architecture Compliance

- Keep request-domain persistence and lifecycle logic in `apps/handrix-api/src/modules/requests/`.
- Keep shared request-history, status, and response contracts in `packages/shared-contracts/src/requests/`.
- Keep the customer tracking UI in `apps/handrix-web/src/features/request-tracking/`, with no new Epic 3 or 4 internal feature areas introduced here.
- Follow the architecture target of a request-centric model with explicit lifecycle state plus append-only history, even while the MVP still uses the file-backed store.
- Treat request-history schema changes as architecture-sensitive: backend persistence, shared contracts, presenters, and frontend rendering must stay aligned together.

### Library / Framework Requirements

- Continue using NestJS controller/service boundaries in the existing `requests` module.
- Continue using Zod schemas in `packages/shared-contracts` as the source of truth for request-history and status-response types.
- Continue using the current fetch-based tracking client and React request-tracking feature seams unless a very small helper is needed.
- No new persistence library is required for this story unless the implementation clearly stays within existing repo conventions. Full Prisma/PostgreSQL adoption belongs to Story 5.1, not this story.

### File Structure Requirements

- Prefer extending existing files first:
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/requests/request-status.presenter.ts`
  - `apps/handrix-api/src/modules/requests/request-status-recovery.presenter.ts`
  - `apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts`
  - `apps/handrix-api/src/modules/requests/requests.controller.ts`
  - `packages/shared-contracts/src/requests/request-status.schemas.ts`
  - `packages/shared-contracts/src/requests/request.types.ts`
  - `apps/handrix-web/src/features/request-tracking/request-tracking-screen.tsx`
- If normalization or history assembly becomes complex, add one small helper beside the existing request-status presenters rather than scattering transformation logic across the service, controller, and React component layers.
- Do not create Prisma schema files, operations dashboards, support dashboards, or separate event-bus infrastructure in this story.

### Testing Requirements

- Add backend coverage for:
  - initial history creation when a request is confirmed
  - append-only transition recording with previous and next state context
  - preserving customer-facing status and recovery context in history entries
  - backward-compatible reading of older request records
  - deterministic ordering when history is queried repeatedly
- Add frontend and contract coverage for:
  - stable rendering of the current timeline and recovery modules after history contract changes
  - avoiding exposure of internal-only actor or audit details on customer surfaces
  - preserving current invalid-token and refresh-failure behavior

### UX / Interaction Guardrails

- Customer tracking should continue to feel calm, structured, and easy to scan.
- If richer history reaches the customer UI, it should improve trust and continuity, not make the screen feel like an internal audit log.
- Preserve the existing Precision Dispatch direction for status/timeline surfaces after confirmation.
- The customer should never see contradictory history ordering or wording that differs from the backend-owned public status and recovery vocabulary.

### Implementation Notes

- A low-risk backend path is:
  - enrich the persisted history entry model
  - normalize older entries on read
  - keep the current request record as canonical current state
  - derive timeline/history response data from the normalized append-only history
- A low-risk contract path is:
  - add explicit request-history schemas
  - keep current response compatibility where possible
  - expose only the minimum customer-safe subset needed for Epic 2 tracking while retaining richer persistence for later internal use
- The main modeling trap is jumping straight to the Epic 5 persistence migration. Story 2.6 is about preserving and shaping history faithfully now, not replacing the current storage architecture wholesale.

### Previous Story Learnings

- Story 2.3 established the anonymous tracking credential seam and the separation between valid tracked-request states and invalid lookup failures.
- Story 2.4 established that one backend lookup response can drive both current summary and timeline rendering without a second polling endpoint.
- Story 2.5 established backend-owned recovery-state payloads and a distinct delayed public status, which means history preservation now needs to retain those customer-visible semantics rather than flattening them to a generic note string.
- The current codebase is the most reliable guide for this story: `request-store.service.ts` already provides the append point, `request-status-timeline.presenter.ts` already provides ordered customer history projection, and the shared contracts already express the customer-safe status vocabulary that history must preserve.

### Git Intelligence Summary

- Recent visible git history is still sparse (`feat: epic2 is almost done`, `feat: completeled epic 1`, `first commit`), so commit titles provide less guidance than the current live request-domain code and existing Epic 2 artifacts.
- The current repository seams around `request-store.service.ts`, shared contracts, and request-status presenters are the authoritative extension path.

### Project Structure Notes

- Current seams this story should extend:
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
  - `apps/handrix-web/src/features/request-tracking/`
- There is no `project-context.md` file in the repository, so the planning artifacts and current source tree remain the authoritative context.
- The main structural risks are:
  - storing customer-visible history in an ad hoc shape that cannot support later internal tools
  - exposing internal audit details directly to customers
  - duplicating backend-owned status history logic in the frontend
  - pulling Epic 5 persistence work forward unnecessarily

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 2.6: Preserve Customer-Visible Request History]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 2: Deliver Confirmation, Tracking, and Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Dispatch & Request Lifecycle Management]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Operations & Internal Coordination]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Support & Trust Recovery]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Reliability]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Security]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Data & Persistence]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Process Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Implementation Approach]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-4-present-a-live-request-status-timeline.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-5-handle-clarification-delay-and-unavailable-recovery-states.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/requests.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request-status.schemas.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/packages/shared-contracts/src/requests/request.types.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-04-20: Selected Story 2.6 from the first `backlog` story entry in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-20: Loaded BMAD create-story workflow, project config, Epic 2 story definitions, and prior Story 2.5 implementation artifact.
- 2026-04-20: Analyzed PRD, architecture, and UX sections related to request history, auditability, support visibility, and customer tracking continuity.
- 2026-04-20: Reviewed the live `requests` module and shared contracts to ground the story in the current JSON-backed persistence seam, timeline presenter, and recovery-state model.
- 2026-04-20: Created this story artifact and updated sprint tracking status to `ready-for-dev`.
- 2026-04-20: Marked Story 2.6 in progress in the story artifact and `_bmad-output/implementation-artifacts/sprint-status.yaml` before implementation.
- 2026-04-20: Added durable request-history modeling with previous/next lifecycle and public status context, actor metadata, and backend-derived customer snapshots while preserving compatibility with older JSON-backed records.
- 2026-04-20: Extended the shared request-status contract with an explicit customer-safe `history` array and kept `POST /requests/status-lookups` as the single lookup seam for current tracking.
- 2026-04-20: Added request-store, service, controller, e2e, and frontend fixture coverage and validated the workspace with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### Completion Notes List

- Implemented durable request-history entries in the JSON-backed request store, including previous/next lifecycle context, previous/next public status context, actor metadata, and a backend-owned customer snapshot for each meaningful transition.
- Added backward-compatible normalization so older request records that still contain `{ lifecycleState, publicStatus, createdAt, note }` history entries continue to load, project, and render correctly.
- Extended the shared request-status contract and presenter flow so customer status lookups now return an explicit `history` array alongside the existing `timeline`, without exposing internal actor metadata on customer surfaces.
- Preserved the existing Epic 2 customer experience by keeping `POST /requests/status-lookups` as the only lookup seam and leaving invalid-token and refresh-failure handling separate from valid tracked-request history.
- Added regression coverage across request-store, request service, controller, e2e, and frontend tracking fixtures.
- Verified the implementation with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.

### File List

- _bmad-output/implementation-artifacts/2-6-preserve-customer-visible-request-history.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/src/modules/requests/request-status-content.presenter.ts
- apps/handrix-api/src/modules/requests/request-status-timeline.presenter.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-web/src/app/App.test.tsx
- packages/shared-contracts/src/requests/request-status.schemas.ts
- packages/shared-contracts/src/requests/request.types.ts

### Change Log

- 2026-04-20: Implemented Story 2.6 by introducing durable append-only request-history entries, legacy-history normalization, customer-safe history responses, and regression coverage across backend and frontend tracking seams.
