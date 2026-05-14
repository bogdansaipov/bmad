# Story 2.6: Preserve Customer-Visible Request History

Status: deprecated

## Deprecation Notice

This story also belongs to the pre-reset plumbing/ops/support plan and should not be implemented literally against the current marketplace MVP.

The old version assumed a request-history model designed around:

- anonymous revisit/tracking flows
- support and operations visibility growing directly out of the same request-history seam
- a custom file-backed request-history implementation in the old `apps/handrix-api` / `apps/handrix-web` stack

The current product and codebase now use:

- authenticated customer and handyman dashboards
- a new NestJS + React marketplace architecture under `apps/backend` and `apps/frontend`
- request and job continuity spread across dashboard lists, marketplace feeds, job history, lifecycle tracking, and later durable persistence work

## What Changed

The current plan moved the original “preserve customer-visible request history” intent into several newer areas:

- request creation already requires durable persistence and dashboard continuity in Story 2.4
- handyman job history is now its own explicit story in Epic 3
- assigned-job lifecycle tracking lives in Epic 4
- deeper persistence guarantees and stable lifecycle boundaries live in Epic 5

So the old 2.6 artifact is stale both functionally and technically.

## Current-Plan Mapping

The original history intent now maps to:

- [2-4-pricing-estimate-and-request-submission.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-4-pricing-estimate-and-request-submission.md)
  - request creation must be durable
  - dashboard refresh must show authoritative state
- `Story 3.4` in [epics.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md:578)
  - handyman job history is a dedicated surface
- `Epic 4` in [epics.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md:608)
  - customer-visible lifecycle progression and tracking
- `Epic 5` in [epics.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md:736)
  - durable persistence, schema management, lifecycle hardening, and stable contracts

## Updated Equivalent Scope

If we restate the old story in current-plan terms, the equivalent objective is:

“Ensure request and job continuity remain durable and recoverable across customer dashboard, handyman history, assignment lifecycle, and future persistence hardening.”

That modern objective breaks down like this:

### Customer continuity now means

- a newly created request reappears on dashboard refresh
- `PENDING` remains understandable while matching is active
- once assigned, later tracking surfaces reflect canonical lifecycle state
- historical customer requests remain queryable from dashboard/history surfaces

### Handyman continuity now means

- accepted, declined, and completed jobs can later appear in handyman history
- history is fed by assignment and offer truth, not ad hoc UI state

### Platform continuity now means

- authoritative current state lives on the primary request/assignment records
- supporting history can be added without breaking stable contracts
- future persistence hardening in Epic 5 can extend the model without redesigning customer or handyman surfaces

## What Should Not Be Carried Forward

Do not carry these old assumptions forward unchanged:

- anonymous tracking-token request history
- custom legacy request-history contracts from `packages/shared-contracts`
- support/ops-first history language from the deprecated stack
- a separate customer-history architecture detached from the current `apps/backend` / `apps/frontend` marketplace flow

## Guidance For Future History Work

If the team wants a fresh history-focused story under the marketplace plan, it should be written around the new domain model described in [architecture.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md:489):

- `service_requests`
- `request_assignments`
- `job_offer_visibilities`
- append-only `request_status_history`

And it should follow these guardrails:

- current request row stays canonical for latest status
- history stays append-only for meaningful transitions
- customer surfaces only render customer-safe history context
- handyman history is separate from customer request history where the UX goals differ
- no reintroduction of the old file-backed request store patterns

## Recommended Replacement Note

For the active roadmap, treat this deprecated story as replaced by:

- `2.4` for durable request creation and dashboard continuity
- `3.4` for handyman job history
- `4.x` for customer lifecycle/tracking continuity
- `5.x` for durable persistence and lifecycle hardening

## Change Log

- 2026-05-14: Rewritten as a deprecated legacy artifact and remapped to the active marketplace architecture and epic structure.
