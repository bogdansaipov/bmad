# Sprint Change Proposal - Handrix MVP Marketplace Pivot

**Date:** 2026-05-11 12:40:54 +05  
**Project:** demo1 / Handrix  
**Workflow:** `bmad-correct-course`  
**Mode:** Batch  
**Scope Classification:** Major

## 1. Issue Summary

### Change Trigger

The current Handrix MVP was planned and partially implemented as a guided urgent-plumbing coordination flow centered on:

- anonymous customer intake
- immediate containment guidance
- manual or semi-manual internal dispatch
- dedicated `ops` and `support` workspaces
- customer-safe projected statuses derived from internal operations

The updated product vision is materially different. Handrix now needs to behave like a two-sided on-demand handyman marketplace web app with:

- authenticated customers
- authenticated handymen
- category- and location-based automatic request routing
- handyman accept/decline behavior
- live job tracking on a map
- no dedicated `ops` workspace in MVP
- no dedicated `support` workspace in MVP

### Problem Statement

The current MVP direction no longer matches the intended product model, user roles, or fulfillment workflow. The existing PRD, UX, architecture, epics, stories, and sprint plan are optimized for a trust-through-guidance dispatch coordinator product, while the new vision requires a trust-through-marketplace-and-live-tracking product.

This is not a small feature addition. It is a structural change to:

- user identity model
- fulfillment model
- request lifecycle
- real-time interaction model
- map/location requirements
- dashboard structure
- epic/story decomposition

### Evidence

- Current PRD explicitly prioritizes anonymous customer intake and a narrow small-plumbing wedge.
- Current UX specification explicitly avoids marketplace-style behavior and emphasizes calm intake plus one-tap confirmation.
- Current architecture explicitly assumes internal `ops` and `support` roles, manual assignment, and polling-based customer tracking.
- Current epics dedicate Epic 3 to operations dispatch and Epic 4 to support intervention.
- Current implementation already contains real `ops` and `support` backend/frontend modules that would no longer be MVP-critical.

## 2. Impact Analysis

### Checklist Summary

- `1.1` Triggering story: `[!] Action-needed`
  The change was not caused by one story; it invalidates the current Epic 3 and Epic 4 structure and substantially reframes Epics 1-2.
- `1.2` Core problem definition: `[x] Done`
  Issue type: strategic pivot / failed approach for updated product vision.
- `1.3` Evidence gathered: `[x] Done`
- `2.1` Current epic viability: `[!] Action-needed`
  Current Epic 5 remains partially useful; Epics 3-4 no longer fit MVP; Epics 1-2 need heavy rewrite.
- `2.2` Required epic-level changes: `[x] Done`
- `2.3` Future epic changes reviewed: `[x] Done`
- `2.4` Future epics invalidated/new epics needed: `[x] Done`
- `2.5` Epic order and priority changes: `[x] Done`
- `3.1` PRD conflicts: `[x] Done`
- `3.2` Architecture conflicts: `[x] Done`
- `3.3` UX conflicts: `[x] Done`
- `3.4` Secondary artifact impact: `[x] Done`
- `4.1` Direct adjustment: `[ ] Viable` only as a partial tactic
- `4.2` Potential rollback: `[ ] Viable` only for selected MVP assumptions, not for whole-platform reset
- `4.3` PRD MVP review: `[x] Viable`
- `4.4` Recommended path: `[x] Done`

### PRD Impact

The PRD needs major revision.

#### Current PRD assumptions that conflict

- Anonymous request creation is a core requirement today.
- MVP scope is intentionally narrow to urgent small-plumbing only.
- Value proposition is framed around uncertainty reduction before provider arrival, not a two-sided service marketplace.
- Internal operations and support are treated as primary actors in the MVP service loop.

#### PRD changes required

- Replace anonymous request creation with customer account creation and login.
- Add handyman account creation and login.
- Reframe MVP from “urgent small-plumbing coordination” to “fast, low-friction handyman marketplace with live service tracking.”
- Broaden category model from plumbing-only to configurable home-repair categories, while still allowing a constrained launch set.
- Replace manual dispatch model with automatic matching and first-accept assignment.
- Add real-time map tracking as a core MVP capability.
- Add pricing estimate logic as a lightweight MVP subsystem.
- Remove dedicated support and ops roles from MVP scope.

### UX Impact

The UX specification needs a major rewrite.

#### Current UX assumptions that conflict

- “No account required” is a core experience principle.
- The flow is a guided intake sequence rather than a dashboard-based marketplace experience.
- Marketplace browsing is explicitly treated as an anti-pattern.
- Containment guidance is a major emotional differentiator.
- Tracking is designed as a reassurance surface after internal dispatch, not as live two-sided service tracking.
- Operations and support journeys are first-class parts of the UX plan.

#### UX changes required

- Introduce separate customer and handyman authentication flows.
- Make customer home/dashboard the main entry point after login.
- Replace current intake-first landing model with “requests list + create request CTA.”
- Redesign request creation around title, description, category, image upload, location capture, and estimate preview.
- Create a tracking screen centered on live status and map.
- Create a handyman jobs dashboard with available jobs, active job, live route/tracking, and status controls.
- Remove ops queue and support workspace UX from MVP.
- Keep low-friction and mobile-first principles, but redirect them toward an on-demand service interaction model.

### Architecture Impact

The architecture document needs major revision, but not a blind restart.

#### Current architecture assumptions that conflict

- Anonymous customer tracking token model.
- Internal `ops` and `support` authenticated roles as core MVP actors.
- Manual/semi-manual assignment flows.
- Polling-centric tracking assumption.
- Request domain modeled around internal operational states projected into customer-safe statuses.
- Reference-data model optimized for supported plumbing intake and containment guidance.

#### Architecture changes required

- Introduce first-class `customer` and `handyman` identities, profiles, and auth flows.
- Add handyman service categories and service-area eligibility.
- Replace internal assignment flow with automatic matching and acceptance workflow.
- Add job-offer lifecycle and acceptance race handling.
- Add live location ingestion for handyman devices during active jobs.
- Add map-provider abstraction so MVP can launch on a free/low-cost stack and swap later.
- Upgrade transport assumptions:
  - polling remains acceptable for low-frequency dashboard refresh
  - live tracking should move to SSE or WebSocket for assigned/in-progress jobs
- Reframe status model around two-sided fulfillment:
  - `pending`
  - `assigned`
  - `on_the_way`
  - `arrived`
  - `working`
  - `complete`
  - `rejected`

### Epic and Story Impact

#### Existing epics

- Epic 1: heavily rewritten
- Epic 2: heavily rewritten
- Epic 3: removed from MVP
- Epic 4: removed from MVP
- Epic 5: partially preserved and retargeted

#### Existing implementation stories

Stories likely obsolete at MVP level:

- `3-1` through `3-7` operations-auth/queue/assignment/lifecycle-control stories
- `4-1` through `4-5` support-auth/search/context/intervention stories

Stories partially reusable conceptually:

- `1-1` project foundation
- `5-1` durable persistence and schema management
- `5-2` observability and health monitoring
- `5-3` security/rate limiting/data protection
- `5-4` env validation and deployment readiness
- `5-5` stable contracts and lifecycle boundaries

Stories requiring strong rewrite or replacement:

- all anonymous intake and request-tracking stories in Epics 1-2
- current request status timeline and recovery-state assumptions

### Sprint Plan Impact

Current sprint status shows:

- Epics 1-4: marked done
- Epic 5: in progress
- Stories `5-1` to `5-5`: in review
- Story `5-6`: backlog

This status no longer reflects the right product plan. It reflects progress against the previous MVP.

Implications:

- sprint tracking should not be “continued as-is”
- current completed status should be treated as “completed against deprecated plan”
- a new backlog and epic sequence should be generated after artifact approval
- in-progress hardening work from Epic 5 should be evaluated for retention, not discarded by default

### Current Implementation Assumptions Impact

The current codebase includes:

- backend modules for `auth`, `ops`, `support`, `requests`, `reference-data`, `health`, `prisma`, `observability`
- frontend features for `ops-queue`, `support-request-view`, intake, containment guidance, request review, and request tracking
- shared contracts for ops/support/request flows

Assessment:

- `ops` and `support` product surfaces are no longer MVP-critical and should be de-scoped
- auth infrastructure, shared contracts discipline, Prisma/persistence foundation, observability, rate limiting, and lifecycle modeling remain valuable
- request-domain code can be evolved into marketplace job flows
- current UI feature structure contains useful patterns but not the right product flows

## 3. Recommended Approach

### Scope Classification

This correction is **Major**.

### Option Evaluation

#### Option 1: Direct Adjustment

Viability: limited

Directly editing the current stories without revisiting the PRD and architecture would create drift and confusion. Too many “done” artifacts would describe the wrong product.

Effort: High  
Risk: High

#### Option 2: Rollback

Viability: limited

Rolling back the existing code or artifacts wholesale would waste usable platform work, especially:

- project setup
- auth primitives
- Prisma/persistence direction
- observability/security/deployment hardening
- shared contract patterns

Effort: High  
Risk: Medium

#### Option 3: PRD MVP Review and Replan

Viability: strong

The best path is to formally redefine the MVP, regenerate the affected planning artifacts, and then resume implementation from the revised plan while salvaging reusable platform pieces.

Effort: High  
Risk: Medium

### Recommended Path

**Recommended approach: Hybrid leaning heavily toward Option 3**

1. Update PRD to redefine the MVP around customer + handyman marketplace flows.
2. Redesign UX around customer dashboard, create-request flow, tracking map, and handyman workspace.
3. Redesign architecture around account-based actors, automatic matching, real-time tracking, and provider-agnostic maps.
4. Regenerate epics and stories from the revised artifacts.
5. Preserve reusable implementation foundation where it still helps.
6. De-scope ops/support workspaces from MVP without blindly deleting hardening infrastructure.

### Why this is the best path

- It matches the updated product vision cleanly.
- It avoids forcing the team to implement the wrong product through stale stories.
- It preserves real engineering work that is still useful.
- It reduces future confusion in BMAD artifacts and sprint planning.
- It keeps MVP complexity bounded by explicitly deferring nonessential features such as full support tooling and likely chat.

## 4. Detailed Change Proposals

## 4.1 PRD Changes

### PRD Direction: Old -> New

**Section: Executive Summary**

OLD:
- Handrix is an urgent small-plumbing coordination product focused on uncertainty reduction and internal dispatch credibility.

NEW:
- Handrix is a mobile-first handyman marketplace web app where customers create repair requests, nearby qualified handymen can accept them, and both sides track progress in real time.

Rationale:
- This aligns the product narrative with the new two-sided marketplace model.

**Section: MVP Scope**

OLD:
- anonymous request intake
- plumbing-only intake
- internal ops assignment
- support-assisted recovery

NEW:
- customer registration/login
- handyman registration/login
- configurable launch categories
- create request with image and geo location
- automatic routing to matching handymen
- accept/decline flow
- live status tracking with map
- simple estimate pricing

Rationale:
- These are now the core product behaviors.

**Section: User Roles**

OLD:
- customer
- operations coordinator
- support staff

NEW:
- customer
- handyman

Rationale:
- Ops/support are removed from MVP.

**Section: Functional Requirements**

REMOVE:
- anonymous request token requirements
- internal queue requirements
- support search/intervention requirements
- manual assignment as primary model

ADD:
- email/password auth for customers and handymen
- handyman profile with supported categories
- location-aware request creation
- auto-routing and first-accept assignment
- live handyman location updates
- real-time customer tracking view
- handyman status update controls
- simple estimate pricing rules

### Chat Recommendation

Chat should be **post-MVP / next phase**, not part of the revised MVP.

Reason:

- It adds message persistence, moderation, notifications, unread state, and UX complexity.
- The revised MVP already includes a major shift to auth, matching, mapping, and live tracking.
- Statuses plus map will cover the core trust loop for MVP.

Recommended compromise:

- design the architecture so chat can be added later
- do not include real-time chat in the current MVP scope

## 4.2 UX Changes

### Remove

- anonymous intake-first homepage
- containment guidance as a central early-flow differentiator
- ops queue screens
- support workspace screens
- support-intervention and delay-recovery-first UX structure

### Rewrite

- request creation flow
- request tracking flow
- status language and lifecycle visuals
- landing and dashboard structure

### Add

- customer sign-up/login
- handyman sign-up/login
- customer requests dashboard
- fast create-request wizard
- location picker with browser geo default + draggable map adjustment
- assigned-job live tracking map
- handyman available-jobs list
- handyman active-job screen
- handyman status control panel

### UX guidance for revised MVP

- customer first screen after login should be request list + create CTA
- create flow should be 4-5 short steps max
- status map view should become the emotional center after assignment
- handyman dashboard should prioritize action speed over rich profile detail
- low-friction remains a priority, but the product should now feel more like an on-demand service app than a guided emergency wizard

## 4.3 Architecture Changes

### Core domain model changes

Replace the previous request domain emphasis:

- request
- request history
- internal assignment
- support notes

With a marketplace-oriented model:

- users
- customer profiles
- handyman profiles
- handyman supported categories
- handyman service radius or service coverage
- service requests
- request images
- job offers / offer visibility state
- accepted assignment
- live location updates
- request status history
- pricing estimate breakdown

### Automatic matching / assignment

Recommended MVP approach:

1. Customer creates request with category and lat/lng.
2. Backend finds eligible handymen by:
   - active status
   - category support
   - service area or radius match
3. Backend publishes request to matching handymen.
4. First handyman to accept receives assignment.
5. Request becomes unavailable to other handymen immediately.

Implementation note:

- Use optimistic locking or a transactional assignment guard to prevent double-accept.

### Category-based handyman eligibility

Recommended model:

- `service_categories`
- `handyman_categories` join table
- optional `service_radius_km` or polygon later
- launch with simple radius-based eligibility

### Real-time status updates

Recommended MVP transport:

- Only WebSocket for assigned/in-progress jobs
- polling fallback for dashboard list refresh

Reason:

- live map tracking and status changes need faster, more natural updates than polling alone
- full realtime everywhere is unnecessary; use it selectively

### Live location tracking

Recommended MVP design:

- handyman client sends location updates during active assigned jobs
- backend stores latest location plus lightweight history
- customer tracking screen subscribes to active job updates
- display both job location and handyman location

### Map provider abstraction

Recommended MVP approach:

- define a `MapProvider` abstraction for:
  - tile rendering
  - geocoding / reverse geocoding
  - route display hooks if added later
- default MVP provider stack:
  - MapLibre GL JS for map rendering
  - OpenStreetMap tiles
  - Nominatim or a compatible low-cost geocoding option

Future-safe path:

- allow later adapter for Google Maps, Mapbox, or another provider without rewriting domain logic

### Pricing model

Recommended MVP pricing:

- `base_service_fee`
- `category_base_price`
- optional simple distance surcharge
- optional simple estimated parts allowance

Suggested displayed formula:

`estimated_total = base_fee + category_price + distance_fee + parts_allowance`

Guidance:

- show estimate, not guaranteed final invoice
- keep pricing configurable in admin/reference data later
- do not build a complex dynamic pricing engine now

## 4.4 Epic and Story Redesign

### Proposed New Epic Structure

**Epic 1: Establish Marketplace Accounts and Shared Foundation**

Goal:
- customer and handyman authentication
- user/profile foundations
- preserve hardening/platform baseline

Sample stories:
- Customer registration and login
- Handyman registration and login
- Role-aware app routing and session management
- Shared user/profile schema foundation

**Epic 2: Deliver Customer Request Creation and Dashboard**

Goal:
- customer home screen
- requests list
- create request flow
- category, image, description, and location capture
- estimate preview

Sample stories:
- Customer request dashboard
- Create request form and category selection
- Browser geolocation and manual map adjustment
- Image upload and request submission
- Request list and pending/rejected states

**Epic 3: Enable Handyman Matching and Job Acceptance**

Goal:
- handyman category eligibility
- available jobs feed
- accept/decline flows
- automatic first-accept assignment

Sample stories:
- Handyman category profile setup
- Matching engine v1
- Available jobs list
- Accept/decline and assignment race handling

**Epic 4: Deliver Live Tracking and Job Execution**

Goal:
- assigned handyman visibility
- customer tracking map
- handyman active-job screen
- live location and status progression

Sample stories:
- Assigned request detail for customer
- Handyman active job view
- Live location updates
- Status changes: on the way, arrived, working, complete
- Real-time status transport

**Epic 5: Harden Marketplace Operations and Future Expansion**

Goal:
- reuse and retarget existing hardening work
- secure media upload
- pricing config
- analytics
- map/provider abstraction

Sample stories:
- Persist marketplace entities and relationships
- Provider-agnostic map integration seam
- Pricing estimate configuration
- Observability/security/deployment validation
- MVP funnel and fulfillment metrics

### Existing Epic Mapping

OLD:
- Epic 1: anonymous plumbing intake
- Epic 2: confirmation/tracking/recovery
- Epic 3: operations dispatch
- Epic 4: support intervention
- Epic 5: hardening

NEW:
- Epic 1: marketplace auth foundation
- Epic 2: customer request creation/dashboard
- Epic 3: handyman matching/acceptance
- Epic 4: live tracking/job execution
- Epic 5: hardening and expansion seams

### Story-level removal / rewrite / salvage

REMOVE from MVP plan:

- all ops stories `3-1` to `3-7`
- all support stories `4-1` to `4-5`

REWRITE heavily:

- issue intake stories `1-2` to `1-6`
- customer tracking stories `2-1` to `2-6`

SALVAGE / adapt:

- `1-1` initial foundation
- `5-1` persistence
- `5-2` observability
- `5-3` security
- `5-4` env/deployment readiness
- `5-5` contract/lifecycle boundaries

## 4.5 Existing Work Disposition

### Keep and reuse

- monorepo/project setup
- NestJS + React + shared contracts structure
- Prisma and persistence direction
- auth module patterns
- observability and request-correlation setup
- rate limiting and security baselines
- deployment/config validation
- contract discipline and lifecycle boundary patterns

### Keep but repurpose

- request domain and status history concepts
- tracking UI patterns
- shared schema structure
- reference-data/config patterns

### De-scope from MVP

- ops web workspace
- support web workspace
- ops backend APIs
- support backend APIs
- manual intervention-first flows
- anonymous tracking-token-centered product model

### Important caution

De-scope does **not** necessarily mean immediate physical deletion. The safer path is:

1. approve revised artifacts
2. regenerate backlog
3. decide whether to archive or remove obsolete modules in a dedicated cleanup story

## 5. Implementation Handoff

### Recommended Next Steps After Approval

1. **PM / PRD update**
   Rewrite the PRD around the marketplace MVP, updated roles, request lifecycle, categories, pricing estimate model, and deferred chat decision.

2. **UX redesign**
   Replace the current guided plumbing flow with:
   - customer auth
   - customer dashboard
   - create-request flow
   - live tracking map
   - handyman dashboard and active job flow

3. **Architecture redesign**
   Update the architecture to support:
   - two-sided identity
   - matching engine
   - provider-agnostic map layer
   - realtime transport for active jobs
   - live location ingestion
   - marketplace-oriented persistence model

4. **Regenerate epics and stories**
   Produce a fresh epic/story breakdown from the updated PRD + UX + architecture artifacts.

5. **Reset sprint planning**
   Replace the current sprint status plan with a new marketplace-oriented backlog and sequencing.

6. **Resume implementation**
   Continue from the revised stories, preserving reusable platform work and explicitly retiring stale MVP assumptions.

### Handoff Classification

This is a **Major** change and should be routed to:

- Product Manager / PRD workflow
- UX Design workflow
- Architecture workflow
- Epic/story regeneration workflow
- then Developer workflow

### Recommended ownership

- PM / Product artifact owner:
  redefine MVP, roles, goals, scope boundaries, and chat/pricing decisions
- UX owner:
  redesign core customer and handyman flows
- Architect:
  redesign domain, matching, realtime, mapping, and persistence
- Delivery planning owner:
  regenerate epics, stories, and sprint plan
- Developer:
  implement from the revised backlog after planning artifacts are approved

### Success Criteria for the revised plan

- all planning artifacts describe the same marketplace MVP
- no remaining MVP-critical dependency on ops/support workspaces
- automatic matching and acceptance flow is clearly specified
- category eligibility and live tracking are architecturally grounded
- map integration is provider-agnostic
- MVP stays simple enough to build quickly
- chat remains deferred unless the PM explicitly expands scope

## 6. Final Recommendation

Proceed with a full BMAD planning-artifact refresh rather than incremental story edits.

This proposal recommends:

- approve the marketplace pivot as a major correction
- rewrite PRD, UX, and architecture first
- regenerate epics/stories/sprint plan from those revised artifacts
- preserve reusable engineering foundation from the existing codebase
- defer chat to the next phase

## 7. Workflow Completion Summary

- Issue addressed: Handrix MVP no longer matches updated marketplace-style product vision
- Change scope: Major
- Artifacts impacted:
  - PRD
  - UX design specification
  - architecture
  - epics
  - implementation stories
  - sprint-status plan
- Recommended handoff:
  - PM / PRD update
  - UX redesign
  - architecture redesign
  - epic/story regeneration
  - implementation resume

## Approval Prompt

Review complete proposal. Continue `[c]` or Edit `[e]`?
