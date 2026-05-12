---
stepsCompleted:
  - 'step-01-validate-prerequisites'
  - 'step-02-design-epics'
  - 'step-03-create-stories'
  - 'step-04-final-validation'
inputDocuments:
  - '/Users/spider/Documents/GitHub/bg-bmad/_bmad-output/planning-artifacts/prd.md'
  - '/Users/spider/Documents/GitHub/bg-bmad/_bmad-output/planning-artifacts/architecture.md'
  - '/Users/spider/Documents/GitHub/bg-bmad/_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Handrix - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Handrix, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Authentication and Role Flows**
FR1: Users can register a single account with email and password, choosing a role of customer or handyman at signup.
FR2: Users can log in with email and password and are routed to the experience associated with their selected role.
FR3: A user's role is set at signup and is not changeable through the MVP self-service flow.
FR4: The system can prevent the same email from registering more than one account.
FR5: The system can maintain separate customer and handyman role flows and authorization surfaces after authentication.

**Customer Request Creation and Dashboard**
FR6: Customers can view a list of their current and previous service requests after login.
FR7: Customers can start a new service request from the customer home screen.
FR8: Customers can create a request with a title, description, category, and at least one optional image.
FR9: Customers can select from a configurable set of supported service categories.
FR10: Customers can allow browser geolocation to set a default job location when available.
FR11: Customers can manually adjust the job location on a map before submission.
FR12: The system can store the final selected job location as latitude and longitude.
FR13: The system can show a simple price estimate before the customer confirms request submission.
FR14: Customers can submit a request once required fields are complete.

**Matching, Assignment, and Handyman Jobs**
FR15: The system can identify eligible handymen based on request category and configured service area rules.
FR16: The system can route newly created requests to multiple eligible handymen automatically.
FR17: Handymen can view available requests that match their supported categories and service area.
FR18: Handymen can view a history of their past accepted, declined, and completed jobs from their dashboard.
FR19: Handymen can accept or decline a matching request.
FR20: If a handyman declines a request, that request no longer appears in that handyman's available jobs list.
FR21: If a handyman accepts first, the system assigns the request to that handyman and prevents duplicate assignment.
FR22: If no handyman has accepted yet, the customer-visible status remains `pending`.
FR23: If a request cannot be fulfilled through the current matching flow, the system can expose a `rejected` outcome clearly.

**Fulfillment Lifecycle and Rating**
FR24: Customers can view the current lifecycle state for each request.
FR25: The customer-visible request lifecycle includes `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, and `rejected`.
FR26: Once assigned, customers can view the assigned handyman identity for the request.
FR27: Once assigned, customers can view a two-pin map showing the job location and the handyman's location at the time of view.
FR28: Handymen can update assigned jobs to `on the way`, `arrived`, `working`, and `complete`.
FR29: Status changes made by the assigned handyman are pushed in real time to the customer and to the handyman's own active job view via WebSocket.
FR30: The system can preserve a durable history of meaningful request and status changes.
FR31: After a request is marked `complete`, the customer can submit a 1-5 star rating for the assigned handyman.
FR32: Customers can optionally include short text feedback with the rating.
FR33: Each completed request can be rated only once by the customer who created that request.
FR34: Submitting or skipping a rating does not block request completion.

**Service Categories, Pricing, and Platform Configuration**
FR35: The system can manage supported service categories without requiring a redesign of the request flow.
FR36: The system can associate handymen with only the categories they support.
FR37: The system can support simple launch-market eligibility rules such as service radius or equivalent location filtering.
FR38: The system can calculate a simple estimate using a base service fee, category-based pricing, and optional distance and parts allowances.
FR39: The system can present the estimate as an estimate rather than a guaranteed final total.
FR40: Handyman profiles can support future aggregation of ratings without requiring an MVP reputation system.

**Platform Continuity and Future Growth**
FR41: The system can preserve a stable request and assignment model that supports future category expansion.
FR42: The system can support future map-provider replacement without redefining customer or handyman workflows.
FR43: The system can preserve a clean future path for chat without including chat in MVP.
FR44: The system can preserve a clean future path for richer rating aggregation and reputation features without including public reviews, moderation systems, or disputes in MVP.

### NonFunctional Requirements

**Performance**
NFR1: Standard customer and handyman dashboard loads should complete within 2 seconds for typical requests under normal operating conditions, excluding third-party network variance.
NFR2: Request submission and handyman accept/decline actions should complete quickly enough that users do not perceive the action as stalled under normal operating conditions.
NFR3: WebSocket-pushed job status updates should reach connected clients within 1 second of the handyman submitting the status change under normal operating conditions.
NFR4: The two-pin map view for an assigned job should render fully within 2 seconds of opening or refreshing the job view under normal operating conditions.

**Reliability**
NFR5: No submitted customer request should be lost, duplicated, or left without a recoverable persisted record.
NFR6: Assignment logic should prevent more than one handyman from being assigned to the same request.
NFR7: The system should preserve a durable history of request creation, assignment, major lifecycle transitions, and completion outcomes such that any dashboard refresh reflects the latest authoritative state.
NFR8: If a WebSocket connection drops, the client should reconnect and restore the latest job status without corrupting lifecycle truth or requiring the user to manually refresh.
NFR9: Rating submission should be idempotent enough to prevent a completed request from being recorded with more than one customer rating.

**Security**
NFR10: All customer, handyman, and operational data should be encrypted in transit.
NFR11: Stored account, request, location, and rating data should be protected by appropriate access controls and encryption at rest where applicable.
NFR12: Authentication and authorization should enforce separation between customer and handyman access surfaces and prevent role escalation after signup.
NFR13: Uploaded images should be validated and stored through a secure media-handling path appropriate for MVP use.
NFR14: The system should avoid collecting sensitive data that is not required for request fulfillment, location display, and lightweight rating capture.

**Accessibility**
NFR15: The core customer and handyman flows should meet WCAG 2.1 AA expectations for accessible interaction and readable status communication.
NFR16: Critical request states, job controls, and rating inputs should never rely on color alone and should remain understandable through labels and structured layout.
NFR17: The interface should maintain large touch targets, clear form labeling, and low-cognitive-load copy suitable for mobile use in real-world contexts.

**Scalability**
NFR18: The MVP architecture should support at least a 10x increase from initial request and active-job volume without requiring a full redesign of the request, assignment, and rating model.
NFR19: The platform should support adding new service categories and new launch geographies through configuration and bounded data-model extension rather than core workflow replacement.
NFR20: Map-provider integration should be isolated behind replaceable seams so vendor changes do not require product-flow rewrites.
NFR21: WebSocket connections should be scoped to active job status updates only, so the realtime layer scales incrementally with job volume rather than total active users.

### Additional Requirements

**Starter Template / Foundation**
- Selected foundation: Vite React TypeScript SPA frontend + NestJS backend + shared contracts package (existing repository foundations preserved)
- Existing reusable foundations to carry forward: React SPA + NestJS split, shared contracts discipline, Prisma + PostgreSQL persistence direction, observability and structured logging, security and rate-limiting patterns, explicit lifecycle modeling

**Technology Stack**
- Frontend: React SPA with Vite and TypeScript
- Backend: NestJS modular monolith
- Database: PostgreSQL with Prisma ORM and migrations
- Realtime: NestJS WebSocket gateway for active-job status push only (no live location streaming)
- State management: TanStack Query for server state; route-local state for create-request progression and image selections; WebSocket session hooks for active assigned jobs
- Shared contracts: Zod schemas in a shared package between frontend and backend
- API documentation: OpenAPI for REST endpoints; consistent success/error response envelopes

**Backend Module Architecture (NestJS)**
- `auth` — login, registration, JWT issuance, role guards
- `users` — customer and handyman profile reads and updates
- `categories` — supported service categories and handyman category preferences
- `requests` — request creation, detail, history, lifecycle state machine ownership
- `matching` — eligible handyman selection and offer generation
- `assignments` — accept/decline handling, concurrency control, assignment record ownership
- `realtime` — WebSocket gateway, channel authorization, fanout for assigned-job status events
- `ratings` — one-time post-completion rating submission and retrieval
- `pricing` — estimate pricing calculation and snapshots
- `maps` — geocoding and provider abstraction seams
- `uploads` — image validation and storage orchestration
- `observability` — structured logging, request correlation baselines

**Infrastructure and Integration Seams**
- Object storage for uploaded request images (backend-mediated, with signed or controlled URLs, metadata in PostgreSQL)
- Map rendering: MapLibre GL JS + OpenStreetMap-backed tiles
- Geocoding: Nominatim-compatible integration (provider-agnostic seam)
- Email provider for auth flows
- Frontend and backend map abstraction seams must be provider-agnostic (NFR20, FR42)

**Domain Model (Core Entities)**
- `users`, `customer_profiles`, `handyman_profiles`, `service_categories`, `handyman_category_preferences`
- `service_requests`, `request_images`, `request_assignments`, `job_offer_visibilities`
- `request_status_history` (append-only), `handyman_location_updates` (REST-fetched, not streamed)
- `pricing_estimates`, `request_ratings`

**Concurrency and Assignment Protection**
- First-accept assignment via database transaction with row-level lock on request row
- Unique constraint ensuring one live assignment per request
- Re-check of request status inside transaction; fail fast for second acceptors

**Frontend Feature Architecture**
- Feature areas: `customer-auth`, `customer-dashboard`, `request-create`, `request-tracking`, `request-history`, `request-rating`, `handyman-auth`, `handyman-dashboard`, `handyman-jobs`, `handyman-active-job`
- Shared features: `maps`, `ratings`, `status`, `ui-shell`

### UX Design Requirements

UX-DR1: The customer experience must begin from an authenticated dashboard, not an anonymous intake flow.
UX-DR2: The handyman experience must prioritize job receipt, acceptance, and active-job control over profile browsing or administrative depth.
UX-DR3: The create-request flow must be completable in a small number of focused steps with one dominant action per screen (category/title → description/image → location confirmation → estimate/submit).
UX-DR4: Location confirmation must use browser geolocation when available and allow map-based manual adjustment before submission.
UX-DR5: The request tracking screen must make the map and current status the primary visual focus after assignment.
UX-DR6: Bottom sheets must be the primary pattern for layered job details and action controls on mobile tracking screens.
UX-DR7: Customer request cards must surface active state, estimate or final amount, and assigned handyman context without opening the full request.
UX-DR8: Handyman job cards must surface category, distance, estimate, and accept or decline controls in a fast-scanning format.
UX-DR9: Pending and rejected states must be explicit, understandable, and free from legacy support-workspace assumptions.
UX-DR10: Customer and handyman surfaces must share one brand system while maintaining clearly different visual modes (warm neutral + navy for customer; dark navy/charcoal + teal-green for handyman).
UX-DR11: WebSocket-driven updates must feel immediate on active-job screens without causing full-screen refresh patterns.
UX-DR12: Pricing presentation must stay simple, compact, and estimate-based.
UX-DR13: Post-completion rating must use a lightweight 1-5 star interaction with optional short feedback and must not feel like a long review form.
UX-DR14: Each completed request should expose rating at most once through the customer experience and should indicate when rating has already been submitted.
UX-DR15: The UX must preserve low cognitive load and fast action flows across both user roles.
UX-DR16: Customer MVP navigation must include Home, New Request, History, and Profile — no more than 4 top-level items.
UX-DR17: Handyman MVP navigation must include Dashboard, Jobs, Earnings/History, and Settings — no more than 4 top-level items.
UX-DR18: The design system must implement a split-surface visual language with shared brand tokens (warm neutral for customer mode; dark navy/charcoal for handyman mode).
UX-DR19: Core shared components must be implemented: map shell, bottom sheet, status chip, section header, primary CTA, empty-state module, loading skeletons.
UX-DR20: Customer-specific components must be implemented: request summary card, active request hero card, category selection tile, image upload tile, map location confirmation panel, estimate breakdown card, request history row, status pill set, tracking bottom sheet, rating prompt sheet/modal, star rating input, compact feedback field.
UX-DR21: Handyman-specific components must be implemented: online/offline toggle, match preview card, active job summary card, preference chip group, service radius control row, earnings summary card, job history row, active-job status action rail.
UX-DR22: Bottom sheets must support three states: collapsed glance, half-open action, and full detail.
UX-DR23: Map interaction must differ by context: create-request (pin adjustment and location confirmation), tracking (movement visibility, no editing), handyman active job (route/context visibility).
UX-DR24: Desktop adaptation must expand to split-pane layouts without functionally diverging from mobile flows.
UX-DR25: Motion must be used sparingly and meaningfully: map pin transition on assignment, bottom-sheet rise for job details, status pill transitions, job card entrance for newly matched work.

### FR Coverage Map

FR1: Epic 1 — Registration with role selection (customer or handyman)
FR2: Epic 1 — Login and role-based routing to respective experience
FR3: Epic 1 — Role fixed at signup, not changeable in MVP self-service
FR4: Epic 1 — Prevent duplicate account registration for same email
FR5: Epic 1 — Maintain separate customer and handyman authorization surfaces
FR6: Epic 2 — Customer dashboard listing current and previous requests
FR7: Epic 2 — Start new service request from customer home screen
FR8: Epic 2 — Request creation with title, description, category, optional image
FR9: Epic 2 — Select from configurable supported service categories
FR10: Epic 2 — Browser geolocation for default job location
FR11: Epic 2 — Manual map pin adjustment before submission
FR12: Epic 2 — Store final job location as lat/lng
FR13: Epic 2 — Show simple price estimate before submission
FR14: Epic 2 — Submit request once required fields are complete
FR15: Epic 3 — Identify eligible handymen by category and service area
FR16: Epic 3 — Auto-route new requests to multiple eligible handymen
FR17: Epic 3 — Handyman job feed filtered by categories and service area
FR18: Epic 3 — Handyman job history (accepted, declined, completed)
FR19: Epic 3 — Handyman accept or decline a matching request
FR20: Epic 3 — Declined request removed from that handyman's feed
FR21: Epic 3 — First-accept assignment with duplicate protection
FR22: Epic 3 — Customer status remains `pending` until assignment
FR23: Epic 3 — Expose `rejected` outcome when request cannot be matched
FR24: Epic 4 — Customer can view current lifecycle state per request
FR25: Epic 4 — Full customer-visible lifecycle: pending, assigned, on the way, arrived, working, complete, rejected
FR26: Epic 4 — Customer sees assigned handyman identity after assignment
FR27: Epic 4 — Customer sees two-pin map (job + handyman location) for assigned jobs
FR28: Epic 4 — Handyman updates status: on the way, arrived, working, complete
FR29: Epic 4 — WebSocket push of status changes to customer and handyman active view
FR30: Epic 4 — Durable history of meaningful request and status changes
FR31: Epic 4 — Customer submits 1-5 star rating after completion
FR32: Epic 4 — Optional short text feedback with rating
FR33: Epic 4 — One-time rating per completed request
FR34: Epic 4 — Rating submission (or skip) does not block completion
FR35: Epic 2 — Service category management without request flow redesign
FR36: Epic 3 — Associate handymen with only their supported categories
FR37: Epic 3 — Simple service radius eligibility rules for matching
FR38: Epic 2 — Calculate estimate: base fee + category + optional distance/parts
FR39: Epic 2 — Present estimate as estimate, not guaranteed total
FR40: Epic 3 — Handyman profile supports future rating aggregation (cache fields)
FR41: Epic 5 — Stable request/assignment model for future category expansion
FR42: Epic 5 — Map-provider replacement without redefining workflows
FR43: Epic 5 — Clean future path for chat without including it in MVP
FR44: Epic 5 — Clean future path for richer ratings/reputation without MVP public reviews

## Epic List

### Epic 1: Foundation — Project Setup & Unified Authentication
Both customers and handymen can register with role selection and log in to their respective experiences. The project is scaffolded with the React SPA + NestJS + shared contracts foundation that all subsequent epics build upon.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: Customer Request Creation & Dashboard
Customers can log in, view their request dashboard, create a service request with category, description, image, and location, receive a price estimate, and submit — completing the core customer side of the marketplace.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR35, FR38, FR39

### Epic 3: Handyman Job Marketplace & Matching
Handymen can view available jobs matched to their categories and service area, accept or decline, and view their job history. The system automatically routes requests to eligible handymen and assigns the first to accept with duplicate protection.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR36, FR37, FR40

### Epic 4: Fulfillment Lifecycle, Live Tracking & Rating
Both customers and handymen follow the full job lifecycle from `assigned` through `complete`. Customers see a two-pin map of assigned jobs and receive real-time WebSocket status updates. Customers can submit a lightweight post-completion rating.
**FRs covered:** FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34

### Epic 5: Platform Hardening & Production Readiness
The platform runs on a durable, secure, and observable architecture. Lifecycle models, map abstraction seams, and data structures preserve clean paths for future categories, map provider replacement, chat, and richer ratings.
**FRs covered:** FR41, FR42, FR43, FR44 (plus NFR cross-cutting coverage across all epics)

---

## Epic 1: Foundation — Project Setup & Unified Authentication

Both customers and handymen can register with role selection and log in to their respective experiences. The project is scaffolded with the React SPA + NestJS + shared contracts foundation that all subsequent epics build upon.

### Story 1.1: Initialize Project Foundation

As a development team,
I want the Vite React TypeScript SPA, NestJS backend, and shared contracts package initialized with Prisma + PostgreSQL connectivity,
So that all subsequent stories have a consistent technical foundation to build upon.

**Acceptance Criteria:**

**Given** the repository is ready for MVP implementation
**When** the foundation is set up
**Then** the workspace includes a Vite React TypeScript SPA, a NestJS backend, and a shared contracts package
**And** both apps start successfully in development mode

**Given** the foundation is in place
**When** a developer runs local setup commands
**Then** Prisma connects to PostgreSQL and migrations apply cleanly
**And** the shared contracts package can be imported by both apps without manual file copying

**Given** both apps are running
**When** the frontend makes a request to the backend health endpoint
**Then** a successful response is returned confirming connectivity

**Given** the project is bootstrapped
**When** baseline tooling is verified
**Then** TypeScript config, ESLint, environment examples, OpenAPI scaffold, structured logging, request correlation IDs, and a health endpoint are in place

### Story 1.2: User Registration with Role Selection

As a new user,
I want to register an account with my email, password, and chosen role (customer or handyman),
So that I can access the Handrix experience built for my role.

**Acceptance Criteria:**

**Given** a user visits the registration screen
**When** they submit a valid email, password, and role selection
**Then** a new account is created with the chosen role stored durably in the database
**And** the user is routed to the dashboard appropriate for their selected role

**Given** a user attempts to register with an already-registered email
**When** they submit the form
**Then** the system rejects the registration with a clear error
**And** no duplicate account is created

**Given** required fields are missing or invalid
**When** the user submits the form
**Then** accessible inline validation feedback is shown for each invalid field
**And** the form does not submit until all required fields pass validation

**Given** a user has registered
**When** they review their account
**Then** their role is fixed and cannot be changed through any self-service flow
**And** role is enforced at the API authorization layer, not only on the frontend

### Story 1.3: Login and Role-Based Dashboard Routing

As a registered user,
I want to log in with my email and password and be taken directly to my role's home screen,
So that I land on the right experience without extra navigation steps.

**Acceptance Criteria:**

**Given** a registered customer logs in with valid credentials
**When** login completes
**Then** they are routed to the customer dashboard
**And** the session is authenticated with a JWT containing the correct role claim

**Given** a registered handyman logs in with valid credentials
**When** login completes
**Then** they are routed to the handyman dashboard
**And** the session is authenticated with a JWT containing the correct role claim

**Given** a user submits incorrect credentials
**When** the login form is submitted
**Then** a non-specific error is shown (no hint as to which field is wrong)
**And** no session is created

**Given** a logged-in user attempts to access a route protected for the other role
**When** the route is requested
**Then** access is denied at the API layer regardless of frontend routing
**And** no cross-role data is exposed

**Given** a session expires or becomes invalid
**When** the user attempts to access a protected route
**Then** they are redirected to login without data corruption

---

## Epic 2: Customer Request Creation & Dashboard

Customers can log in, view their request dashboard, create a service request with category, description, image, and location, receive a price estimate, and submit — completing the core customer side of the marketplace.

### Story 2.1: Customer Dashboard with Request List

As a logged-in customer,
I want to land on a dashboard that shows my current and past service requests with their status,
So that I always have a clear home screen and can start a new request from one place.

**Acceptance Criteria:**

**Given** a customer logs in successfully
**When** the customer dashboard loads
**Then** it displays their current and previous service requests with status, title, and estimate
**And** the page loads within 2 seconds under normal conditions

**Given** the customer has no requests yet
**When** the dashboard loads
**Then** an empty-state module is shown with a clear prompt to create a first request
**And** the `New Request` action is prominently accessible

**Given** the dashboard is displayed on mobile
**When** the customer scans the screen
**Then** request cards are glanceable with status, assigned handyman (if any), and estimate visible without opening the full request
**And** touch targets meet minimum accessible size requirements

**Given** the customer navigation is rendered
**When** the nav is visible
**Then** it contains no more than 4 top-level items: Home, New Request, History, and Profile

### Story 2.2: Service Category Selection and Request Details

As a customer creating a new request,
I want to pick a service category and fill in a title, description, and optional image in focused steps,
So that I can describe my problem quickly without being overwhelmed.

**Acceptance Criteria:**

**Given** a customer taps `New Request`
**When** the create-request flow opens
**Then** the first step presents only supported service categories as selectable tiles
**And** each category tile shows a clear label with no technical jargon required

**Given** a customer selects a category
**When** they advance to the next step
**Then** they can enter a short title and description for the request
**And** the step has one dominant action and minimal surrounding noise

**Given** the customer is on the description step
**When** they optionally attach an image
**Then** the image is validated for file type and size before upload
**And** the image is stored via the secure object storage path with metadata persisted in the database

**Given** required fields (category, title) are incomplete
**When** the customer attempts to advance
**Then** clear, accessible validation feedback is shown inline
**And** the flow does not advance until required fields are filled

**Given** service categories are managed in the backend
**When** the category list is requested
**Then** categories are served from structured backend configuration, not hardcoded on the frontend
**And** adding or disabling a category does not require a frontend code change

### Story 2.3: Location Capture with Geolocation and Map Pin

As a customer creating a request,
I want my location set automatically from my device and adjustable on a map,
So that the handyman knows exactly where to come without me typing an address.

**Acceptance Criteria:**

**Given** the customer reaches the location step
**When** the browser grants geolocation permission
**Then** the map centers on the customer's detected location with a pin placed automatically
**And** the customer can see and adjust the pin before confirming

**Given** geolocation is denied or unavailable
**When** the location step loads
**Then** the map loads in a default state and the customer can place the pin manually
**And** the flow does not stall or error because geolocation was unavailable

**Given** the customer wants to adjust their location
**When** they drag or tap the map to reposition the pin
**Then** the pin moves to the selected position
**And** the final confirmed lat/lng is stored as the authoritative job location

**Given** the location step map renders
**When** it opens
**Then** the map renders fully within 2 seconds under normal conditions
**And** map rendering uses the provider-agnostic abstraction layer, not vendor-locked logic

### Story 2.4: Pricing Estimate and Request Submission

As a customer ready to submit,
I want to review a simple price estimate and confirm my request in one final step,
So that I know roughly what to expect before committing.

**Acceptance Criteria:**

**Given** a customer has completed category, details, and location steps
**When** they reach the estimate and review step
**Then** the system calculates and displays an estimate using base fee + category fee + optional distance/parts allowance
**And** the estimate is presented clearly as an estimate, not a guaranteed total

**Given** the estimate is displayed
**When** the customer reviews the screen
**Then** the pricing breakdown is compact and scannable — not a multi-screen pricing explanation
**And** the customer can see a summary of what they are submitting before confirming

**Given** the customer confirms submission
**When** the request is submitted
**Then** a service request is created and persisted durably with status `pending`
**And** a pricing estimate snapshot is saved alongside the request record

**Given** the submission fails due to a temporary error
**When** the customer taps confirm
**Then** a recoverable error state is shown without losing the entered data
**And** duplicate confirmed requests are prevented on retry

**Given** the request is created successfully
**When** the customer is returned to the dashboard
**Then** the new request appears in the list with `pending` status
**And** the full request history remains durable and recoverable

---

## Epic 3: Handyman Job Marketplace & Matching

Handymen can view available jobs matched to their categories and service area, accept or decline, and the system correctly assigns the first-accepting handyman with duplicate protection. Handymen can also view their full job history.

### Story 3.1: Handyman Profile Setup with Categories and Service Radius

As a registered handyman,
I want to set my supported service categories and service area after registering,
So that the platform knows which jobs to show me and I only receive relevant work.

**Acceptance Criteria:**

**Given** a handyman logs in for the first time
**When** they land on the handyman dashboard
**Then** they are prompted to complete their profile by selecting supported categories and service radius
**And** they cannot receive matching jobs until at least one category and a service radius are set

**Given** a handyman is on the profile setup screen
**When** they select their supported categories
**Then** only the platform's configured service categories are available for selection
**And** their category preferences are persisted as `handyman_category_preferences` records

**Given** a handyman sets their service radius
**When** the value is saved
**Then** the radius is stored on the handyman profile and used as the matching boundary for incoming requests
**And** the handyman can update their categories and radius from their profile settings later

**Given** a handyman profile is saved
**When** the backend evaluates future rating submissions
**Then** the handyman profile includes `average_rating_cache` and `ratings_count_cache` fields (nullable) to support future rating aggregation without requiring a schema change

### Story 3.2: Handyman Jobs Dashboard and Available Job Feed

As a logged-in handyman,
I want to see a feed of available jobs that match my categories and service area,
So that I can quickly identify relevant work without wading through irrelevant requests.

**Acceptance Criteria:**

**Given** a handyman is logged in with categories and service radius set
**When** the jobs dashboard loads
**Then** only requests matching their supported categories and within their service radius are shown
**And** the dashboard loads within 2 seconds under normal conditions

**Given** a matching request exists
**When** the handyman views the job card
**Then** the card shows category, distance, rough area, estimate, and short description
**And** accept and decline actions are accessible directly from the card without opening a detail screen

**Given** the handyman navigation is rendered
**When** the nav is visible
**Then** it contains no more than 4 top-level items: Dashboard, Jobs, History, and Settings

**Given** no matching jobs are currently available
**When** the jobs feed loads
**Then** a clear empty-state is shown
**And** the handyman's online/offline status toggle is visible and actionable

**Given** a new request is routed to eligible handymen
**When** the backend identifies matching handymen by category and service radius
**Then** a `job_offer_visibility` record is created for each eligible handyman
**And** the offer appears in their feed without requiring a manual refresh

### Story 3.3: Accept or Decline a Job with First-Accept Assignment Protection

As a handyman reviewing a job,
I want to accept or decline it, knowing that if I accept first I get the job and no one else can,
So that the system is fair and I can act quickly with confidence.

**Acceptance Criteria:**

**Given** a handyman taps accept on a matching job
**When** the accept request reaches the backend
**Then** the backend opens a database transaction, applies a row-level lock on the request, re-checks the request status, and creates the assignment record
**And** the request status transitions to `assigned` and is visible to the customer

**Given** two handymen attempt to accept the same request simultaneously
**When** both accept requests are processed
**Then** only the first to complete the transaction receives the assignment
**And** the second receives a clear "already assigned" error without a confusing failure state

**Given** a handyman declines a job
**When** the decline action is submitted
**Then** the offer record for that handyman is marked declined
**And** the job no longer appears in that handyman's feed while remaining visible to other eligible handymen

**Given** a request has been routed to eligible handymen but none has accepted
**When** the customer views the request
**Then** the customer-visible status remains `pending`
**And** no partial or misleading assignment information is shown

**Given** a request exhausts available matching opportunities without acceptance
**When** the system determines the request cannot be fulfilled
**Then** the request status transitions to `rejected`
**And** the customer sees a clear `rejected` state with no ambiguity

### Story 3.4: Handyman Job History

As a handyman,
I want to view a history of all my past accepted, declined, and completed jobs,
So that I have continuity across sessions and can review past work.

**Acceptance Criteria:**

**Given** a handyman navigates to their job history
**When** the history screen loads
**Then** all past jobs are listed with their final status (accepted, declined, completed) and basic details
**And** the list is ordered with the most recent jobs first

**Given** the handyman opens a past job from history
**When** the job detail loads
**Then** they can see the full request details without affecting any live workflow
**And** viewing a past job does not change its status or create any side effects

**Given** the handyman has no job history yet
**When** the history screen loads
**Then** a clear empty-state is shown
**And** the handyman is not shown any other handyman's job data

**Given** a newly completed or declined job exists
**When** the handyman views history
**Then** the record appears in history and remains durable across sessions and logins

---

## Epic 4: Fulfillment Lifecycle, Live Tracking & Rating

Both customers and handymen follow the full job lifecycle from `assigned` through `complete`. Customers see a two-pin map of assigned jobs and receive real-time WebSocket status updates. Customers can submit a lightweight post-completion rating.

### Story 4.1: Customer Request Tracking View with Two-Pin Map

As a customer with an assigned request,
I want to see the handyman's identity and a map showing both our locations when I open my job,
So that I know who is coming and where they are right now.

**Acceptance Criteria:**

**Given** a customer opens a request that has been assigned
**When** the tracking view loads
**Then** the assigned handyman's display name is shown
**And** a two-pin map renders with one pin at the job location and one at the handyman's most recently recorded location

**Given** the tracking view map loads
**When** it opens or the customer refreshes
**Then** the map renders fully within 2 seconds under normal conditions
**And** the handyman location pin is fetched via REST from the latest `handyman_location_updates` record — not streamed via WebSocket

**Given** the customer is on the tracking view
**When** the current lifecycle state is displayed
**Then** the full customer-visible lifecycle is supported: `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, `rejected`
**And** the current status is always visible without requiring the customer to scroll or open a detail panel

**Given** the assigned job view is open on mobile
**When** the layout renders
**Then** the map fills most of the viewport and a bottom sheet holds the handyman identity, status, estimate, and job details
**And** the bottom sheet supports collapsed, half-open, and full-detail states

### Story 4.2: Handyman Active Job Mode with Status Updates and Location Posting

As an assigned handyman,
I want to enter a focused active-job view where I can update my status and share my location,
So that the customer always knows where I am and what stage the job is at.

**Acceptance Criteria:**

**Given** a handyman accepts a job
**When** they enter the active-job view
**Then** the map shows the customer/job location pin
**And** the current job status and next required status action are clearly visible

**Given** the handyman is in active-job mode
**When** they update their status (on the way → arrived → working → complete)
**Then** only the valid next transition is available as the dominant action
**And** the status is persisted and the transition recorded in `request_status_history`

**Given** the handyman is navigating to the job
**When** their device location is available
**Then** the handyman app posts the current location to the backend via REST
**And** the location is stored as a `handyman_location_updates` record tied to the request and handyman

**Given** the active job bottom sheet is visible on mobile
**When** the handyman interacts with it
**Then** status controls sit in a persistent bottom sheet or fixed action area — never buried in deep navigation
**And** the bottom sheet supports collapsed, half-open, and full-detail states

**Given** the handyman marks the job `complete`
**When** the final status transition is saved
**Then** the request is durably marked complete with a `completed_at` timestamp
**And** the handyman is returned to their jobs dashboard

### Story 4.3: Real-Time Status Push via WebSocket

As a customer or handyman on an active job screen,
I want status changes to appear instantly without refreshing the page,
So that I always see the current state of the job without manual polling.

**Acceptance Criteria:**

**Given** an assigned handyman updates the job status
**When** the status change is saved by the backend
**Then** the updated status is pushed via WebSocket to the customer's tracking view within 1 second under normal conditions
**And** the same update is pushed to the handyman's active-job view

**Given** a WebSocket event is received on the customer tracking screen
**When** the status update arrives
**Then** the status display updates in place without triggering a full-screen refresh or visual reset
**And** the update feels immediate and does not disrupt the map or bottom sheet state

**Given** a client's WebSocket connection drops
**When** the connection is restored
**Then** the client reconnects automatically and the latest job status is restored from the backend
**And** no lifecycle corruption or duplicate state is introduced by the reconnection

**Given** a user is not on an active assigned job screen
**When** WebSocket connections are evaluated
**Then** no WebSocket connection is maintained — dashboards, history, and other screens use standard REST polling
**And** the realtime layer scales with active job volume, not total active users

### Story 4.4: Post-Completion Customer Rating

As a customer whose job has been completed,
I want to leave a quick 1-5 star rating for the handyman with optional feedback,
So that I can close the loop on my experience without it feeling like a review form.

**Acceptance Criteria:**

**Given** a request is marked `complete`
**When** the customer opens that request or returns to the dashboard
**Then** a lightweight rating prompt appears — a compact bottom sheet or modal with a 1-5 star input
**And** the prompt is clearly optional and dismissable

**Given** the customer submits a rating
**When** the rating is saved
**Then** a `request_ratings` record is created with the star score, optional short feedback, customer ID, handyman ID, and request ID
**And** the rating is idempotent — submitting again for the same request is rejected at the backend

**Given** the customer chooses to skip rating
**When** they dismiss the prompt
**Then** the request remains in `complete` state without any blocking behavior
**And** the rating prompt can be reopened from the completed request card if the customer wants to rate later

**Given** a rating has already been submitted for a completed request
**When** the customer views that request
**Then** the submitted rating is shown with no option to re-rate
**And** the request card indicates the rating has been submitted

**Given** a customer views a completed request that is unrated
**When** they open the request card
**Then** the unrated state is clearly indicated so the customer knows they can still rate
**And** this indication does not clutter the card for rated or non-complete requests

---

## Epic 5: Platform Hardening & Production Readiness

The platform runs on a durable, secure, and observable architecture. Lifecycle models, map abstraction seams, and data structures preserve clean paths for future categories, map provider replacement, chat, and richer ratings.

### Story 5.1: Harden Request and Assignment Integrity

As a product platform,
I want durable persistence guarantees, append-only status history, and idempotency protections across the critical request lifecycle,
So that no request is ever lost, corrupted, or left in an unrecoverable state.

**Acceptance Criteria:**

**Given** a customer submits a request
**When** the request is persisted
**Then** no confirmed request can be lost, duplicated, or left without a recoverable record under normal or failure conditions
**And** the request schema supports future category and geography extension without a core lifecycle redesign

**Given** meaningful lifecycle transitions occur (creation, assignment, status updates, completion)
**When** each transition is processed
**Then** an append-only `request_status_history` entry is created with actor, timestamp, and previous/next state
**And** any dashboard refresh reflects the latest authoritative state from these durable records

**Given** the unique assignment constraint and row-level lock are in place
**When** concurrent accept requests arrive for the same request
**Then** the database enforces that only one live assignment per request exists at the schema level
**And** the concurrency protection holds under load without requiring application-level distributed locks

**Given** a rating submission is replayed or retried
**When** the backend processes the duplicate submission
**Then** the `request_ratings` unique constraint on `request_id` prevents more than one rating record per completed request
**And** the response is stable and does not create inconsistent rating data

### Story 5.2: Apply Security Baselines and Data Protection

As a product platform,
I want baseline transport security, role-based access enforcement, image validation, and rate limiting in place across all endpoints,
So that customer and handyman data is protected without over-engineering for MVP scale.

**Acceptance Criteria:**

**Given** any API endpoint is called
**When** data is transmitted
**Then** all traffic is encrypted in transit (HTTPS/WSS enforced)
**And** the platform does not collect or store sensitive data beyond what is required for request fulfillment, location display, and rating capture

**Given** a request targets a customer-only or handyman-only API surface
**When** the request is authenticated
**Then** the backend enforces role-based access via NestJS guards — not frontend routing alone
**And** a customer cannot access handyman assignment endpoints and vice versa

**Given** an image is uploaded as part of request creation
**When** the upload reaches the backend
**Then** file type and size are validated before storage
**And** the image is stored through the secure object storage path with ownership and request linkage validated

**Given** public intake and tracking endpoints are exposed
**When** rate-limiting protections are evaluated
**Then** rate limits are applied to submission, auth, and polling endpoints to reduce abuse risk
**And** legitimate customer behavior under normal MVP usage patterns is not blocked

### Story 5.3: Instrument Observability and Validate Deployment Readiness

As a delivery team,
I want structured logging, correlation IDs, health checks, typed environment config, and CI/CD quality gates in place,
So that the platform can be deployed consistently and failures can be traced before users report them.

**Acceptance Criteria:**

**Given** the backend handles requests across all MVP flows
**When** meaningful application events occur
**Then** structured logs are emitted with request correlation IDs that tie log entries to specific user actions
**And** the logs are sufficient to trace a request lifecycle failure without relying on raw unstructured output

**Given** the platform is running in a deployed environment
**When** a health check is performed
**Then** the health endpoint returns readiness status covering database connectivity and critical service dependencies
**And** failures are detectable before users report them

**Given** the frontend and backend run across local, staging, and production environments
**When** each environment starts
**Then** environment variables are validated through typed configuration at startup
**And** invalid or missing configuration fails fast with a clear error rather than a hidden runtime defect

**Given** code changes are prepared for integration
**When** the CI/CD pipeline runs
**Then** lint, type checks, tests, and migration verification run as deployment gates
**And** the pipeline supports separate frontend and backend builds without breaking the shared contracts package

### Story 5.4: Accessibility Audit and UX Polish

As a customer or handyman using Handrix on any device,
I want the full product to meet WCAG 2.1 AA standards with consistent shared components and desktop layouts,
So that the experience is usable, readable, and trustworthy across all contexts.

**Acceptance Criteria:**

**Given** all core customer and handyman flows are implemented
**When** an accessibility audit is performed
**Then** all critical flows meet WCAG 2.1 AA for contrast, focus states, keyboard support, and screen-reader-compatible labeling
**And** no request state, job status, or rating input relies on color alone — each is paired with a label or icon

**Given** the shared component set is in use across both role surfaces
**When** shared components are reviewed
**Then** map shell, bottom sheet, status chip, section header, primary CTA, empty-state module, and loading skeletons are implemented as reusable components — not duplicated per screen
**And** the split-surface design tokens (warm neutral for customer, dark navy/charcoal for handyman) are applied consistently from a shared design token foundation

**Given** a user opens Handrix on a desktop browser
**When** the layout renders
**Then** customer tracking expands to a split-pane layout (larger map + side detail panel)
**And** the handyman dashboard expands to summary grids with side modules without introducing functionally different flows from mobile

**Given** key lifecycle transitions occur in the UI
**When** they are rendered
**Then** meaningful motion is applied: map pin transition on assignment, bottom-sheet rise for job details, status pill transitions, job card entrance for newly matched work
**And** motion is not used ornamentally — no animations without a clear state-change purpose

### Story 5.5: Preserve Extensibility Seams for Future Growth

As a product team planning post-MVP expansion,
I want the map abstraction, request lifecycle, category model, and rating data structure to preserve clean extension paths,
So that adding new categories, swapping map providers, or building chat and richer ratings later does not require rewriting core product logic.

**Acceptance Criteria:**

**Given** the map rendering and geocoding integrations are in place
**When** the integration layer is reviewed
**Then** map rendering and geocoding are accessed through provider-agnostic abstraction seams on both frontend and backend
**And** replacing the map or geocoding provider does not require changes to request creation, tracking, or assignment workflows

**Given** the service category model is in use
**When** new categories need to be added post-MVP
**Then** categories can be added through configuration or data changes without modifying the request creation flow, matching logic, or handyman profile structure
**And** the request schema supports new category types through bounded extension rather than redesign

**Given** the assignment and request identity model is stable
**When** a chat feature is considered post-MVP
**Then** the request and assignment identifiers provide stable anchors for a future chat transport
**And** no MVP lifecycle assumption requires support chat to function correctly

**Given** the `request_ratings` entity and handyman profile cache fields are in place
**When** richer reputation features are planned post-MVP
**Then** ratings are stored as a separate entity with handyman ID, stars, and optional feedback — ready for aggregation
**And** no public review surfaces, moderation workflows, or dispute logic are included in the MVP data model
