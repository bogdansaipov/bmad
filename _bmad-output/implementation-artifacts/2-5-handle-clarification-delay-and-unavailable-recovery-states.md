# Story 2.5: Handle Clarification, Delay, and Unavailable Recovery States

Status: deprecated

## Deprecation Notice

This story belonged to the pre-reset plumbing/ops/support plan and is no longer an active Epic 2 implementation target.

The current marketplace plan changed the product shape in three important ways:

1. Customer request access now starts from an authenticated dashboard, not an anonymous tracking-token flow.
2. Matching and assignment are now driven by handyman marketplace behavior, not internal dispatch/support workflows.
3. The MVP customer lifecycle is intentionally simplified around `PENDING`, `ASSIGNED`, `ON_THE_WAY`, `ARRIVED`, `WORKING`, `COMPLETE`, and `REJECTED`.

Because of that, the original clarification/delay/unavailable story should not be implemented as written against the current codebase.

## What Changed

The old version assumed:

- anonymous request lookup and recovery cards
- backend-owned support-style recovery states
- a customer journey centered on “tracking a request token”

The current plan instead centers on:

- authenticated customer dashboards and request lists
- marketplace matching and first-accept assignment
- a simpler customer-visible lifecycle with `PENDING` meaning matching is still active
- `REJECTED` as the explicit “no handyman accepted” outcome

## Current-Plan Mapping

The original intent of this story is now split across multiple current stories:

- [2-4-pricing-estimate-and-request-submission.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/2-4-pricing-estimate-and-request-submission.md)
  - request is created durably with `PENDING`
  - customer sees clear confirmation and dashboard continuity
- [3-2-handyman-jobs-dashboard-and-available-job-feed.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/3-2-handyman-jobs-dashboard-and-available-job-feed.md)
  - matching handymen are found and offers are created
- `Story 3.3` in [epics.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md:544)
  - no-acceptance path becomes `REJECTED`
  - accept/decline behavior is defined cleanly
- `Epic 4` tracking stories in [epics.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md:608)
  - assigned-job tracking and live status visibility move here

## Updated Equivalent Scope

If the team wants to preserve the business intent of “honest recovery states” under the marketplace plan, the equivalent modern scope should be:

### Customer-safe states that still matter

- `PENDING`
  - matching is in progress
  - no handyman has accepted yet
- `REJECTED`
  - the request was not accepted through the marketplace flow
- normal assigned/in-progress states
  - `ASSIGNED`
  - `ON_THE_WAY`
  - `ARRIVED`
  - `WORKING`
  - `COMPLETE`

### States no longer in active MVP scope

- dedicated “clarification needed” customer state
- dedicated “delayed” customer recovery state before assignment
- support-workspace-style unavailable recovery copy

Those can return later, but only as a new change request built on the current marketplace lifecycle rather than the deprecated tracking-token design.

## Guidance If Reintroduced Later

If clarification/delay states are reintroduced in a future marketplace story, they should follow these updated guardrails:

- extend the current `RequestStatus` model only if the business flow truly needs a new customer-visible state
- do not recreate the old anonymous lookup flow
- attach the experience to authenticated customer request detail or tracking surfaces
- preserve the internal/public split described in [architecture.md](/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md:392)
- keep matching internals separate from customer-visible lifecycle language
- align any recovery outcomes with the newer matching/assignment model, especially `REJECTED`

## Recommended Replacement Note

For the active roadmap, treat this deprecated story as replaced by:

- `2.4` for durable request creation and clear `PENDING` confirmation
- `3.2` for visible marketplace matching setup
- `3.3` for `REJECTED` and assignment truth
- `4.x` for post-assignment tracking clarity

## Change Log

- 2026-05-14: Rewritten as a deprecated legacy artifact and mapped to the current marketplace plan after the sprint reset.
