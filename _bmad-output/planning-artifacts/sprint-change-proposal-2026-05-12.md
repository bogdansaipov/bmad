# Sprint Change Proposal — PRD Refinement: Static Map and Rating Additions

**Date:** 2026-05-12  
**Project:** demo1 / Handrix  
**Workflow:** `bmad-correct-course`  
**Mode:** Batch  
**Scope Classification:** Moderate

---

## 1. Issue Summary

### Change Trigger

PRD updated on 2026-05-12 with four material changes relative to the sprint change proposal approved on 2026-05-11:

1. **Static two-pin map** — no live location streaming; map shows customer location and handyman location fetched via REST on view open or refresh
2. **WebSocket scope narrowed** — status-change push only; location is not streamed via WebSocket
3. **Post-completion customer rating** — lightweight 1-5 star rating with optional short text feedback, one-time per completed request
4. **Handyman job history** — handyman can view past accepted, declined, and completed jobs from their dashboard

Additionally, the epics.md file was never updated following the 2026-05-11 marketplace pivot. It still describes the old anonymous plumbing intake model.

### Problem Statement

Three artifacts were out of sync with the updated PRD:

- **Architecture**: still specified live WebSocket location streaming (conflicting with static two-pin map and status-only WebSocket scope)
- **UX**: Journey 4 implied live-streamed tracking rather than refresh-based static view
- **Epics**: completely stale — still described anonymous plumbing intake, ops dispatch, and support intervention epics from the previous product model

Sprint status also needed a reset to reflect the new marketplace epic structure.

---

## 2. Impact Analysis

### Checklist Summary

- `1.1` Trigger: PRD edit on 2026-05-12 — four changes listed above `[x]`
- `1.2` Issue type: new requirements / approach refinement `[x]`
- `1.3` Evidence: PRD editHistory, architecture conflicts, stale epics.md `[x]`
- `2.1` Current epics viability: `[!]` Epics.md is fully stale (old model), requires regeneration
- `2.2` Epic-level changes: full regeneration required `[x]`
- `2.3` Future epic dependencies: no new epics invalidated `[x]`
- `2.4` New epics needed: no — existing 5-epic structure from sprint change proposal remains correct `[x]`
- `2.5` Epic order/priority: unchanged `[x]`
- `3.1` PRD conflicts: PRD is the source of truth, no conflicts `[x]`
- `3.2` Architecture conflicts: 5 targeted sections required update `[x]`
- `3.3` UX conflicts: 1 minor Journey 4 clarification required `[x]`
- `3.4` Secondary artifact impact: sprint-status.yaml reset required `[x]`
- `4.1` Direct adjustment: viable for architecture and UX `[x]`
- `4.2` Rollback: not applicable `[N/A]`
- `4.3` MVP review: not required — scope unchanged `[N/A]`
- `4.4` Recommended path: direct adjustment + epic regeneration `[x]`

### Architecture Conflicts Resolved

| Section | Old | New |
|---|---|---|
| WebSockets (API Contract) | included live location updates | status changes only |
| Transport Split (Realtime) | WebSocket for location streaming | WebSocket for status only; location via REST |
| WebSocket events | included `request.location.updated` | removed |
| Backend responsibilities | "live location ingestion and publication" | "handyman location capture and REST retrieval for static map display" |
| `handyman_location_updates` entity | no clarification | REST-stored, REST-fetched, not streamed |

### UX Conflict Resolved

| Section | Old | New |
|---|---|---|
| Journey 4 map description | "two-pin model: customer/job location and handyman location" | "two-pin static view: fetched on view open or refresh — not live-streamed" |

### Epics Status

epics.md was fully stale (old anonymous plumbing model). Requires full regeneration via `bmad-create-epics-and-stories` using the updated PRD, architecture, and UX as inputs.

New epic structure (per 2026-05-11 sprint change proposal, confirmed unchanged):

- **Epic 1**: Marketplace Accounts and Shared Foundation
- **Epic 2**: Customer Request Creation and Dashboard
- **Epic 3**: Handyman Matching and Job Acceptance
- **Epic 4**: Fulfillment Lifecycle, Static Map View, and Rating
- **Epic 5**: Harden Platform for Reliable MVP Operations

---

## 3. Recommended Approach

**Direct Adjustment** — targeted edits to architecture and UX, plus epic regeneration.

No MVP scope change. No rollback. No replan required. The PRD changes refine the implementation approach (static map vs live streaming) and add two features (rating, handyman history) that were already partially anticipated in the architecture and UX.

---

## 4. Changes Applied

### Architecture (applied)

- CP-1: Removed live location from WebSocket API contract section
- CP-2: Updated transport split — WebSocket status-only; location via REST
- CP-3: Removed `request.location.updated` from WebSocket event types
- CP-4: Updated backend responsibility from "live location ingestion" to "REST retrieval for static map"
- CP-4b: Added note to `handyman_location_updates` entity clarifying REST-only usage

### UX (applied)

- CP-5: Updated Journey 4 map description to "two-pin static view, fetched on load"

### Sprint Status (applied)

- CP-7: Reset sprint-status.yaml to 5 new marketplace epics in backlog state

---

## 5. Implementation Handoff

### Immediate Next Step

Run `bmad-create-epics-and-stories` using:
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX: `_bmad-output/planning-artifacts/ux-design-specification.md`

This will regenerate epics.md and the full story breakdown for the marketplace model.

### Reuse Guidance for Epic 5 Stories

Existing hardening stories (5-1 through 5-5) may be partially reusable after review. They cover persistence, observability, security, deployment, and contracts — foundations that still apply. Story 5-6 (success measurement) should be reviewed against new marketplace funnel signals (time to assignment, rating submission rate, etc.).

### Handoff Classification

**Moderate** — route to:
- Epic/story regeneration: `bmad-create-epics-and-stories` (next step)
- Implementation: Developer agent (after epics are generated)

---

## 6. Workflow Completion Summary

- Issue addressed: PRD updated with static map, status-only WebSocket, rating, and handyman history — architecture and UX synced, epics flagged for regeneration
- Change scope: Moderate
- Artifacts modified: `architecture.md`, `ux-design-specification.md`, `sprint-status.yaml`
- Artifacts pending: `epics.md` — to be regenerated via `bmad-create-epics-and-stories`
- Routed to: Epic/story generation workflow
