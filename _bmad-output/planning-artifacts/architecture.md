---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-11-124054.md'
workflowType: 'architecture'
project_name: 'demo1'
user_name: 'Bogdansaipov'
date: '2026-05-12'
lastStep: 8
status: 'complete'
completedAt: '2026-05-12 12:00:00 +0500'
---

# Architecture Decision Document

_This document defines the revised Handrix marketplace MVP architecture so downstream implementation stays consistent with the updated PRD and UX direction._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Handrix is now a two-sided marketplace MVP rather than a guided dispatch product. The architecture must support two authenticated user roles, customer and handyman, with different operational surfaces but a shared marketplace lifecycle.

Customer requirements define a dashboard-first authenticated experience:

- register and log in
- create a request with category, description, image, and location
- confirm location through browser geolocation plus manual map pin adjustment
- receive a simple estimate before submission
- track request state and assigned handyman on a live map
- rate the handyman after completion using a lightweight one-time rating flow

Handyman requirements define a jobs-first operational experience:

- register and log in
- declare supported categories
- receive only relevant jobs
- accept or decline quickly
- enter an active-job mode after assignment
- publish live location during active jobs
- advance job status through `on the way`, `arrived`, `working`, and `complete`

Marketplace requirements center on:

- automatic category- and location-aware matching
- first-accept assignment protection
- durable request, assignment, and status history
- customer-visible lifecycle clarity
- provider-agnostic map integration
- selective realtime through WebSockets only for assigned and in-progress jobs

**Non-Functional Requirements:**
The strongest NFRs are assignment correctness, low-friction mobile performance, selective realtime reliability, and extensibility without premature complexity.

The system must:

- keep dashboard and request flows responsive on mobile
- prevent duplicate assignment during first-accept races
- keep active-job status and location updates timely
- preserve observability, structured logging, and security baselines
- allow polling for low-frequency screens such as history and dashboards
- retain a clean future path for chat without implementing chat now

**Scale & Complexity:**
Handrix is a medium-complexity MVP. It is not enterprise-scale by design, but it does require careful lifecycle and concurrency modeling because correctness failures directly damage trust.

- Primary domain: mobile-first marketplace web application
- Complexity level: medium
- Estimated architectural components: 8-10 major components across auth, user profiles, request creation, matching, assignment, realtime tracking, ratings, pricing, persistence, and integration seams

### Technical Constraints & Dependencies

Confirmed technology direction:

- React frontend SPA
- NestJS backend API
- PostgreSQL primary database
- shared contracts package between frontend and backend
- WebSockets for active-job realtime communication

Constraints that shape the architecture:

- mobile-first UX with dashboard-led flows
- no ops workspace or support workspace as MVP-critical architecture
- map provider cannot be hardcoded to a single vendor
- image upload must be secure but lightweight
- realtime should be selective, not global

### Cross-Cutting Concerns Identified

The dominant cross-cutting concerns are:

- lifecycle consistency across customer and handyman views
- assignment race protection
- durable auditability of meaningful state changes
- location privacy and correct location handling
- shared contract stability between apps
- mobile performance and low-cognitive-load interfaces
- future extensibility for chat, richer ratings, and broader service configuration

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with a separated React SPA frontend and NestJS backend, backed by PostgreSQL and shared TypeScript contracts.

### Selected Foundation

**Selected foundation:** Vite React TypeScript frontend + NestJS backend + shared contracts package

**Rationale:**

- React SPA matches the mobile-first app-like UX
- NestJS supports modular domain organization, WebSockets, and strong API conventions
- shared contracts preserve consistency between customer and handyman flows
- the current repository already contains reusable foundations for this split

### Reused Platform Foundations

The revised architecture explicitly preserves:

- React SPA + NestJS split
- shared contracts discipline
- Prisma + PostgreSQL persistence direction
- observability and structured logging
- security and rate-limiting patterns
- explicit lifecycle modeling

The revised architecture explicitly discards as MVP-critical assumptions:

- anonymous customer tracking tokens as the primary model
- ops workspace and support workspace dependencies
- manual dispatch as the primary orchestration flow

## High-Level System Architecture

### System Overview

Handrix should be implemented as a modular monolith backend with one SPA frontend and selective realtime support.

High-level components:

1. React SPA
2. NestJS REST API
3. NestJS WebSocket gateway for active jobs
4. PostgreSQL system of record
5. object storage for uploaded request images
6. map/geocoding abstraction layer

### Architectural Style

**Backend style:** modular monolith  
**Frontend style:** role-aware SPA  
**Communication style:** REST for most product flows, WebSockets for active assigned/in-progress jobs only

This is the smallest architecture that still supports lifecycle correctness and realtime tracking without premature service decomposition.

## Frontend / Backend Responsibility Split

### Frontend Responsibilities

The React frontend should own:

- customer and handyman route flows
- form interaction and temporary UI state
- map presentation and pin interactions
- dashboard composition
- bottom-sheet interaction behavior
- polling for low-frequency surfaces
- WebSocket session handling for active jobs

The frontend must not own business-critical lifecycle rules, assignment decisions, or rating eligibility rules.

### Backend Responsibilities

The NestJS backend should own:

- authentication and role authorization
- request lifecycle truth
- matching and assignment decisions
- concurrency protection for first acceptance
- status transition validation
- handyman location capture and REST retrieval for static two-pin map display
- estimate pricing calculation
- one-time rating eligibility and persistence
- map integration abstractions at the service layer

## Core Architectural Decisions

### Identity and Authorization

**Decision:** Use authenticated accounts for both customers and handymen with JWT-based auth.

**Rationale:**

- the customer experience is dashboard-first and account-based
- the handyman experience requires identity, category preferences, and job history
- role separation must be explicit and backend-enforced

**Authorization model:**

- role claim: `customer` or `handyman`
- route and API guards enforced in NestJS
- request-scoped authorization for customer-owned requests and handyman-assigned jobs

### API and Contract Strategy

**Decision:** Use REST-first JSON APIs plus dedicated WebSocket channels for active jobs.

**REST is used for:**

- auth
- dashboards and history
- request creation
- available jobs feed
- request and job detail fetches
- pricing estimate retrieval
- rating submission

**WebSockets are used only for:**

- assigned/in-progress request status updates (status changes only)

**Contract standard:**

- shared Zod schemas in shared contracts
- consistent success and error envelopes
- OpenAPI for REST documentation

### State Management Strategy

**Frontend:** TanStack Query for server state + route-local state for UI-specific flows  
**Backend:** request and assignment state stored durably in PostgreSQL, with WebSocket delivery as a transport layer over backend truth

## Domain Model Recommendations

### Core Entities

Recommended primary entities:

- `users`
- `customer_profiles`
- `handyman_profiles`
- `service_categories`
- `handyman_category_preferences`
- `service_requests`
- `request_images`
- `request_assignments`
- `job_offer_visibilities` or `job_offers`
- `request_status_history`
- `handyman_location_updates`
- `pricing_estimates`
- `request_ratings`

### Entity Notes

**users**

- id
- email
- password_hash
- role
- account_status
- created_at

**customer_profiles**

- user_id
- display_name
- phone if needed later

**handyman_profiles**

- user_id
- display_name
- availability_status
- service_radius_km
- average_rating_cache nullable for future use
- ratings_count_cache nullable for future use

**service_requests**

- id
- customer_id
- category_id
- title
- description
- status
- location_lat
- location_lng
- estimated_total
- pricing_explanation_snapshot
- assigned_handyman_id nullable
- completed_at nullable

**request_assignments**

- request_id
- handyman_id
- accepted_at
- assignment_status

**job_offer_visibilities / job_offers**

- request_id
- handyman_id
- offer_status (`pending`, `declined`, `accepted`, `expired`, `hidden`)
- offered_at
- responded_at nullable

**request_status_history**

- request_id
- status
- actor_type
- actor_id nullable
- created_at
- metadata snapshot

**handyman_location_updates**

- request_id
- handyman_id
- lat
- lng
- recorded_at

Stored via REST (handyman device posts current location). Customer fetches the latest record via REST when opening or refreshing the assigned job map view. Not streamed via WebSocket.

**pricing_estimates**

- request_id
- base_fee
- category_fee
- distance_fee
- parts_allowance
- estimated_total
- version

**request_ratings**

- request_id unique
- customer_id
- handyman_id
- stars 1-5
- short_feedback nullable
- created_at

## Request Lifecycle / State Machine Recommendations

### Customer-Visible Lifecycle

Canonical customer-visible states:

- `pending`
- `assigned`
- `on_the_way`
- `arrived`
- `working`
- `complete`
- `rejected`

### Lifecycle Rules

Recommended transition model:

1. request created -> `pending`
2. first handyman accepts -> `assigned`
3. assigned handyman marks start of travel -> `on_the_way`
4. assigned handyman arrives -> `arrived`
5. assigned handyman begins work -> `working`
6. assigned handyman completes work -> `complete`
7. system closes unmatched request -> `rejected`

### Transition Guardrails

- only the backend can change canonical status
- only the assigned handyman can advance `assigned` through `complete`
- only eligible backend jobs can move `pending` to `rejected`
- `complete` and `rejected` are terminal
- post-completion rating does not alter completion status

### Internal Status and Offer Model

Do not overload the customer-visible lifecycle with all matching internals. Keep separate internal offer state such as:

- offer issued
- offer declined
- offer expired
- assignment locked

This keeps the customer state model simple while preserving backend operational correctness.

## Matching and Assignment Lifecycle

### Matching Strategy

Recommended MVP matching filters:

- handyman is online or available
- handyman supports request category
- request location falls within handyman service radius

This should remain intentionally simple. Do not build complex scoring, batching, surge logic, or advanced routing in MVP.

### Assignment Flow

1. customer submits request
2. backend calculates estimate and persists request as `pending`
3. backend finds eligible handymen
4. backend creates offer visibility records for matching handymen
5. matching handymen see the request in their jobs feed
6. first handyman to accept wins assignment
7. backend locks assignment transactionally
8. request becomes `assigned`
9. customer active tracking view becomes live

### First-Accept Concurrency Protection Strategy

**Decision:** protect first acceptance with a database transaction and unique assignment guarantees.

Recommended protections:

- transactional accept endpoint
- row-level lock on the request row during accept
- unique constraint that ensures one live assignment per request
- re-check request status inside the transaction
- fail fast for second acceptors with a stable “already assigned” error

This is sufficient for MVP and avoids distributed lock overengineering.

## Realtime Transport Strategy

### Transport Split

**Polling remains acceptable for:**

- customer dashboard
- customer history
- handyman jobs feed
- handyman history
- ratings visibility

**WebSockets are used only for:**

- assigned job status updates
- customer tracking screen status updates
- assigned handyman active-job status updates

Handyman location is fetched via REST when the customer opens or refreshes the assigned job map view. No WebSocket streaming for location.

### WebSocket Channel Model

Recommended channel pattern:

- customer subscribes to a request-specific channel for requests they own
- assigned handyman subscribes to a request-specific or handyman-active-job channel

Suggested event types:

- `request.status.updated`
- `request.assignment.confirmed`
- `request.completed`

### Why Selective Realtime

This matches the UX and keeps the MVP lean:

- active jobs need immediacy
- dashboards and history do not
- global realtime infrastructure is unnecessary

## Persistence and Storage Considerations

### Primary Database

**Database:** PostgreSQL  
**ORM:** Prisma ORM with migrations

**Rationale:**

- strong relational fit
- transactional safety for assignment races
- easy indexing for queries by customer, handyman, category, and status
- straightforward history and rating modeling

### Recommended Indexing

Prioritize indexes on:

- requests by `customer_id`, `status`, `created_at`
- requests by `category_id`, `status`
- handyman profiles by availability and service radius-relevant attributes
- offer records by `handyman_id`, `offer_status`
- location updates by `request_id`, `recorded_at`
- ratings by `handyman_id`

### History Strategy

Use append-only request status history for:

- lifecycle auditing
- customer and handyman timeline rendering
- debugging and observability

The current request row should hold canonical current status. History should preserve every meaningful transition.

## Image Upload / Storage Strategy

### Upload Approach

Use object storage with backend-issued upload credentials or a backend-mediated upload path.

Recommended MVP path:

- backend validates upload intent
- image stored in object storage
- metadata persisted in PostgreSQL
- frontend references signed or controlled URLs

### Why This Approach

- avoids bloating PostgreSQL with binary data
- keeps image handling scalable enough for MVP
- supports secure validation and future CDN usage

### Image Rules

- restrict file types
- enforce size limits
- validate ownership and request linkage
- do not require multiple heavy images for MVP

## Location and Map Abstraction Strategy

### Map Abstraction

Introduce a backend and frontend seam that treats maps as provider-agnostic.

Frontend seam:

- map rendering interface
- marker abstraction
- pin placement behavior
- optional route display hooks

Backend seam:

- geocoding / reverse geocoding service interface
- optional service-area helper functions

### Recommended MVP Provider Direction

- MapLibre GL JS for rendering
- OpenStreetMap-backed tiles
- low-cost or free geocoding provider such as Nominatim-compatible integration, with awareness of usage limits

### Location Capture Model

The frontend should:

- request browser geolocation
- fall back to manual pin placement if needed
- submit final lat/lng plus human-readable address snapshot if available

The backend should treat final submitted coordinates as authoritative for matching.

### Location Privacy

- customer exact location is exposed only to the assigned handyman
- location should not be broadcast to non-assigned handymen
- location updates should be retained only as needed for operational history and product behavior

## Module Boundaries

Recommended NestJS module boundaries:

- `auth`
- `users`
- `categories`
- `requests`
- `matching`
- `assignments`
- `realtime`
- `ratings`
- `pricing`
- `maps`
- `uploads`
- `observability`

### Module Responsibility Summary

**auth**

- login, registration, JWT issuance, guards

**users**

- customer and handyman profile reads and updates

**categories**

- supported service categories and handyman category preferences

**requests**

- request creation, request detail, history, lifecycle state machine ownership

**matching**

- eligible handyman selection and offer generation

**assignments**

- accept/decline handling, concurrency control, assignment record ownership

**realtime**

- WebSocket gateways, channel authorization, fanout

**ratings**

- one-time post-completion rating submission and retrieval

**pricing**

- estimate pricing calculation and snapshots

**maps**

- geocoding and provider abstraction seams

**uploads**

- image validation and storage orchestration

## Frontend Architecture

### Route Areas

Recommended frontend route groups:

- auth routes
- customer dashboard and request routes
- handyman dashboard and jobs routes
- shared account/settings surfaces

### Feature Boundaries

Recommended feature areas:

- `customer-auth`
- `customer-dashboard`
- `request-create`
- `request-tracking`
- `request-history`
- `request-rating`
- `handyman-auth`
- `handyman-dashboard`
- `handyman-jobs`
- `handyman-active-job`
- shared `maps`, `ratings`, `status`, and `ui-shell` features

### State Strategy

Use TanStack Query for:

- dashboard fetches
- history fetches
- request detail
- jobs feed
- rating eligibility fetches

Use WebSocket session hooks for:

- active request tracking
- assigned active job control

Use route-local state for:

- create-request step progression
- temporary image selections
- rating prompt visibility

## Scalability Considerations

### MVP-Pragmatic Scalability

The goal is not infinite scale. The goal is credible linear growth from launch without architectural replacement.

Keep scalability simple:

- one relational database
- one backend app
- one WebSocket gateway layer inside the backend
- object storage for images
- no distributed queue required unless matching load or async media processing grows materially

### Growth Levers

If usage grows:

- add connection-aware WebSocket scaling
- introduce a small async job queue for notifications or cleanup
- add caching for category and read-heavy dashboard surfaces
- add rating aggregates as cached fields on handyman profiles

## External Integration Seams

Recommended integration seams:

- map tiles provider
- geocoding provider
- object storage provider
- email provider for auth flows

Optional later seams:

- push notifications
- chat transport and storage
- navigation and richer ETA provider

## Future Extensibility Guidance

### Chat

Do not implement chat now. Preserve extension seams by:

- keeping request and assignment identity stable
- preserving request-specific communication ownership concepts
- avoiding lifecycle assumptions that require support chat for MVP correctness

### Ratings

Support future richer reputation systems by:

- storing ratings as a separate entity
- allowing cached aggregates on handyman profiles
- avoiding public review surfaces in MVP

### Categories and Geography

Support growth by:

- configuration-driven categories
- bounded service-area modeling
- request schema that is category-extensible without redesign

## Risk Areas and Mitigation Guidance

### Risk: Duplicate Assignment

**Mitigation:**

- transactional accept endpoint
- unique assignment constraints
- append-only audit history

### Risk: Overusing Realtime

**Mitigation:**

- WebSockets only for assigned and active jobs
- polling for dashboards and history

### Risk: Map Vendor Lock-In

**Mitigation:**

- abstract map rendering and geocoding seams
- avoid embedding vendor-specific business logic in request workflows

### Risk: Marketplace Liquidity Failure

**Mitigation:**

- simple eligibility rules
- constrained launch categories and geography
- explicit `pending` and `rejected` lifecycle support

### Risk: UX/Architecture Drift

**Mitigation:**

- keep customer-visible lifecycle simple
- keep shared contracts explicit
- keep rating, assignment, and status rules backend-owned

## Final Recommendation

Handrix should be implemented as a marketplace-oriented modular monolith:

- React SPA for customer and handyman experiences
- NestJS backend for lifecycle truth, assignment correctness, and selective realtime
- PostgreSQL for durable relational persistence
- WebSockets only for active assigned and in-progress jobs
- provider-agnostic map and upload seams
- one-time lightweight ratings after completion

This architecture is deliberately MVP-pragmatic. It is strong enough to protect the hard parts of the marketplace loop, but simple enough to avoid overengineering before the product proves demand, matching quality, and operational trust.
