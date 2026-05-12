---
stepsCompleted:
  - 'step-01-init'
  - 'step-02-discovery'
  - 'step-02b-vision'
  - 'step-02c-executive-summary'
  - 'step-03-success'
  - 'step-04-journeys'
  - 'step-05-domain'
  - 'step-06-innovation'
  - 'step-07-project-type'
  - 'step-08-scoping'
  - 'step-09-functional'
  - 'step-10-nonfunctional'
  - 'step-11-polish'
  - 'step-12-complete'
  - 'step-e-01-discovery'
  - 'step-e-02-review'
  - 'step-e-03-edit'
inputDocuments:
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/brainstorming/brainstorming-session-2026-04-07-142531.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-11-124054.md'
workflowType: 'prd'
workflow: 'edit'
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'general'
  complexity: 'medium'
  projectContext: 'greenfield'
lastEdited: '2026-05-12'
editHistory:
  - date: '2026-05-11'
    changes: 'Rewrote PRD from urgent plumbing coordination into a two-sided handyman marketplace MVP based on the approved sprint change proposal.'
  - date: '2026-05-12'
    changes: 'Added lightweight post-completion customer rating capability for assigned handymen.'
  - date: '2026-05-12'
    changes: 'Simplified map to a two-pin static view (no live location streaming), unified signup with role selection at registration, added handyman job history surface, scoped WebSocket realtime to status-change push only (not location streaming).'
---

# Product Requirements Document - demo1

**Author:** Bogdansaipov  
**Last Updated:** 2026-05-12

## Executive Summary

Handrix is a greenfield mobile-first web application for fast home-repair request fulfillment. The MVP is a two-sided marketplace where customers create repair requests, nearby qualified handymen receive matching jobs, and both sides follow service progress through clear lifecycle states and a simple two-pin map view.

The core problem Handrix solves is not generic home-services discovery. Users with a home repair issue need a fast, low-friction way to request help, understand who is responding, and avoid the back-and-forth uncertainty of calling providers one by one. Handymen need an equally lightweight way to receive relevant jobs, accept work quickly, see the customer location, and update progress without administrative overhead.

Handrix addresses this with an account-based marketplace loop:

- users register or log in with a chosen role (customer or handyman)
- customers create a request with category, description, image, and location
- the platform automatically routes the request to relevant nearby handymen
- the first handyman to accept becomes assigned
- both sides follow lifecycle progression and view a two-pin map (customer and handyman locations) until the job is complete

For the MVP, product value should be judged by how quickly a valid request becomes an assigned job, how clearly both sides understand the current state, and how simply the product supports completion without manual internal coordination as a primary operating model.

### What Makes This Special

Handrix is differentiated by combining marketplace speed with low-cognitive-load execution. The product should feel closer to an on-demand service app than to a directory, lead marketplace, or long-form booking system.

Its core advantage is operational clarity:

- customers do not need to compare many providers before acting
- handymen only see jobs they are eligible to perform
- assignment happens through automatic matching and first acceptance
- the lifecycle states and two-pin map make progress visible rather than ambiguous

This makes Handrix strongest when the user already knows they need help and wants a quick path from issue recognition to active fulfillment. The MVP should optimize for speed, confidence, and lifecycle visibility, not marketplace depth or complex pricing.

## Project Classification

Handrix is classified as a greenfield web application in the general software domain. It remains low in regulatory complexity, but the revised MVP is now medium in product and technical complexity because it is a two-sided marketplace with authenticated users, automatic matching, clear lifecycle states, a two-pin map view, and supply-demand coordination.

The main complexity drivers are:

- two distinct user roles with different workflows, selected at signup
- location-aware matching and assignment correctness
- clear lifecycle state visibility for both sides
- pricing that must be simple but credible
- platform evolution without locking to a single map provider

## Success Criteria

### User Success

Customers should be able to sign up with a chosen role, sign in, create a request in a few short steps, receive an estimate, and see whether a handyman has accepted. Once assigned, they should be able to follow progress through simple lifecycle states and view the job and handyman locations on a two-pin map.

Handymen should be able to sign up with a chosen role, sign in, see only relevant jobs, accept work with minimal friction, and update job status quickly without interrupting their workflow.

For the MVP, user success should mean:

- customers can create a request with minimal clicks and low confusion
- customers understand whether the request is pending, assigned, in progress, or complete
- handymen can evaluate and accept relevant jobs quickly
- both sides can rely on the dashboard lifecycle view as the source of truth during fulfillment
- both sides can review their past requests or jobs from a dedicated history surface

### Business Success

The MVP should prove that Handrix can coordinate real repair demand and real handyman supply through a lightweight marketplace model.

Initial business success should mean:

- a meaningful share of authenticated customers complete request creation after logging in
- a meaningful share of valid requests receive a handyman acceptance in a reasonable time
- accepted jobs progress through fulfillment without heavy internal manual intervention
- the launch category set and geography show enough marketplace liquidity to justify continued expansion

### Technical Success

Technical success depends on correctness and clarity rather than advanced infrastructure breadth.

For the MVP, technical success should mean:

- unified authentication with role selection is reliable and secure
- matching and assignment prevent duplicate acceptance
- lifecycle state changes are reflected on the next dashboard load without loss or corruption
- request, assignment, status, and rating history remain durable and recoverable
- the platform preserves a clean path to additional categories, providers, and map vendors

### Measurable Outcomes

Suggested MVP measurable outcomes:

- a majority of logged-in customers who start request creation complete submission
- median time from request submission to handyman assignment stays within the target service window for the launch market
- a meaningful share of eligible requests receive at least one handyman acceptance opportunity
- job status changes are received by connected customers within 1 second without users needing offline follow-up for basic progress visibility
- completed-job rate is high enough to demonstrate the marketplace loop is operationally viable
- support-dependent interventions remain low enough to justify keeping chat and dedicated support tooling out of MVP

## Product Scope

### MVP - Minimum Viable Product

The MVP should include:

- unified registration and login with email, password, and role selection (customer or handyman)
- role-aware customer and handyman application flows after authentication
- configurable launch service categories such as plumbing and basic electrical/light-installation tasks
- customer request creation with title, description, image upload, category selection, and location capture
- browser geolocation as the default location signal when available
- manual map-based location adjustment before submission
- simple estimate pricing shown before request submission
- automatic routing of requests to eligible handymen by category and location
- first-accept assignment behavior
- customer dashboard with current requests, lifecycle states, and full request history
- handyman dashboard with available jobs, active job workflow, and full job history (accepted, declined, completed)
- two-pin map view (customer location and handyman location) for assigned jobs, refreshed on dashboard load
- handyman-controlled status updates for `on the way`, `arrived`, `working`, and `complete`
- customer-visible request lifecycle states of `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, and `rejected`, with status changes pushed in real time via WebSocket to connected clients
- lightweight post-completion customer rating for the assigned handyman using a 1-5 star score and optional short feedback

### Growth Features (Post-MVP)

Post-MVP growth could include:

- in-app chat between customer and handyman
- richer handyman profiles, ratings, and trust signals
- public reputation surfaces, moderation workflows, and more advanced reputation logic
- advanced pricing logic
- saved addresses and faster repeat booking flows
- broader service-category coverage
- richer service-area rules beyond simple radius matching
- more advanced route, ETA, and navigation features
- internal operations and support tooling if marketplace scale requires it

### Vision (Future)

The longer-term vision is a trusted on-demand home-services platform that can support multiple repair categories, stronger provider quality signals, richer customer convenience features, and broader regional scale without redefining the core marketplace lifecycle.

Chat is explicitly deferred from the MVP. The platform should preserve a technical path to add it later, but the initial product should prove that request creation, matching, assignment, lifecycle visibility, and completion can work clearly without it.

## User Journeys

### Journey 1: Customer Creates a Request and Tracks Fulfillment

Nodira notices a leaking faucet in her kitchen and wants help quickly. She creates a Handrix account with email and password, selecting **Customer** as her role at signup. After login, she lands on a simple home screen that shows her existing requests and a clear action to create a new one.

She creates a request by selecting a service category, entering a short title and description, attaching a photo, and confirming the job location. The product defaults to her browser geolocation when available, then lets her adjust the pin manually on a map before submission. Handrix shows a simple estimate before she confirms.

After submission, Nodira sees the new request in a `pending` state while matching handymen are notified. When a handyman accepts, the request becomes `assigned`, and she can open the job view to see the handyman identity along with a two-pin map: one pin for the job location, one for the handyman's location. As the handyman updates status to `on the way`, `arrived`, `working`, and `complete`, Nodira sees those state changes pushed to her view in real time.

After the request is marked `complete`, Nodira can submit a simple 1-5 star rating for the assigned handyman and optionally add short text feedback. This rating is lightweight, does not block completion, and can only be submitted once for that completed request.

This journey drives requirements for unified auth with role selection, request creation, image upload, geo capture, price estimation, matching, assignment, two-pin map view, dashboard-refreshed lifecycle progression, and post-completion rating.

### Journey 2: Customer Sees No Accepted Match Yet

Jasur has a clogged drain and creates a request in the evening. He completes the same request flow, but no handyman has accepted yet. Instead of showing ambiguous waiting language, Handrix keeps the request visible as `pending` and makes that state understandable: the request exists, matching handymen are being notified, and assignment has not happened yet.

If enough matching opportunities are exhausted without acceptance, the request can transition to `rejected`. Jasur should see that clearly and understand that the current request did not receive acceptance through the MVP marketplace flow. This should feel explicit rather than confusing.

This journey drives requirements for pending-state clarity, rejected-state clarity, and honest lifecycle communication without relying on dedicated support workflows in MVP.

### Journey 3: Handyman Accepts and Completes a Job

Azamat is a handyman who supports plumbing and light-installation categories within a configured service radius. He registers a Handrix account selecting **Handyman** as his role at signup, then signs in and sees available jobs that match his supported categories and current service area.

When a matching request appears, he can open the job, review the request details, and either accept or decline. If he declines, the job disappears from his available list while remaining available to other eligible handymen. If he accepts first, the request becomes assigned to him and no longer remains open to others.

Once assigned, Azamat sees a two-pin map with the customer location and his own location, and updates status as he progresses: `on the way`, `arrived`, `working`, and `complete`. He should be able to handle this flow quickly from mobile without extra administrative steps. He can also browse a history surface listing his past accepted, declined, and completed jobs.

This journey drives requirements for unified auth with role selection, category eligibility, job feed filtering, first-accept assignment, two-pin map view, status controls, and handyman job history.

### Journey 4: Returning Users Review History

A returning customer signs in and lands on the requests dashboard. Instead of starting from a one-off intake flow each time, the customer can see previous and current requests, understand which ones are complete, and create a new request from the same home screen.

Completed requests should also show whether a rating has already been submitted. If the completed request is still unrated, the customer should be able to open it and leave the one-time rating without re-entering the fulfillment flow.

A returning handyman has the equivalent continuity. After signing in, he lands on his jobs dashboard which lists current active work and links to a history view of his past jobs, including accepted/completed jobs and declined ones. The handyman can open a past job to review its details without affecting any live workflow.

This journey drives requirements for account-based continuity, request and job history visibility for both roles, dashboard-first experience, and lightweight rating follow-up.

### Journey Requirements Summary

These journeys point to a focused MVP capability set:

- unified authentication with role selection at signup (customer or handyman)
- dashboard-first customer and handyman entry points
- low-friction request creation
- location-aware matching and assignment
- first-accept job ownership
- two-pin map view and dashboard-refreshed lifecycle visibility
- simple estimate pricing before submission
- request and job history visibility for both customers and handymen
- lightweight post-completion handyman rating

## Web App Specific Requirements

### Project-Type Overview

Handrix should be implemented as a mobile-first single-page application using React, with a NestJS backend responsible for authentication, request management, matching, assignment, realtime delivery, and persistence.

The product should feel app-like on mobile browsers, with fast transitions, clear status presentation, and minimal click depth for both customer and handyman roles. Desktop support remains important, but the primary design target is mobile usage during real-world field or household contexts.

### Technical Architecture Considerations

The frontend should communicate with backend APIs implemented in NestJS. The backend should manage unified account auth with role selection, category eligibility, request creation, pricing estimate generation, matching, assignment, status history, and rating capture.

The MVP uses WebSocket connections for job status push only — when a handyman updates a job status, the change is pushed in real time to both the customer and the handyman's own active job view. This is the only realtime channel in the MVP; live location streaming is not included. The map view for assigned jobs is a two-pin static rendering (customer location and handyman location at the time of view), refreshed when the user opens or reloads the job view. All other surfaces — dashboards, request lists, job history — rely on standard request/response APIs.

Location and mapping should be treated as replaceable platform integrations rather than product-locked dependencies. The architecture should support a provider-agnostic map abstraction so MVP delivery can use a free or low-cost option and swap providers later without rewriting domain logic.

### Browser Support

The MVP should support current versions of major modern mobile browsers and common modern desktop browsers. Legacy browser support is not required.

### Responsive Design

The interface should be optimized for one-handed mobile use, glanceable status comprehension, large touch targets, and short completion paths. Desktop layouts should preserve the same information architecture without requiring separate product logic.

### Performance Targets

The core user flows should feel fast and direct:

- login and request/job list loads should return promptly under normal network conditions
- request creation should avoid long blocking states
- job acceptance and status updates should feel immediate enough to preserve trust
- the two-pin map view should render promptly when the assigned job is opened or refreshed

### SEO Strategy

SEO is not a priority for the authenticated MVP product flows. Marketing and discoverability pages can be added later if category and geography expansion require them.

### Accessibility Level

The customer and handyman experiences should meet WCAG 2.1 AA expectations in practice. Accessible labeling, readable contrast, keyboard support where relevant, clear focus states, and understandable status communication are required.

### Implementation Considerations

Implementation should preserve reusable platform foundations from the existing codebase where they still apply:

- React SPA + NestJS separation
- shared contract discipline
- durable persistence direction
- observability and request correlation
- security and rate limiting baselines
- explicit lifecycle modeling

Implementation should not preserve obsolete product assumptions such as anonymous tracking tokens, operations-first assignment workflows, or support-workspace dependency as MVP-critical functionality.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** marketplace-first, speed-and-clarity MVP. The goal is to prove that Handrix can connect real customer requests to relevant handymen quickly enough that assignment, clear lifecycle progression, and completion create a credible on-demand experience.

The MVP should intentionally stay simple in a few ways:

- limited launch geography
- constrained launch categories
- simple eligibility rules
- simple estimate pricing
- no in-app chat
- realtime scoped to status push only — no live location streaming; map is a two-pin static view
- no dedicated ops or support workspace as a primary operating requirement

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- unified signup with role selection, then role-aware sign-in
- customer request management with history
- handyman job acceptance with history
- request creation with location and image support
- automatic matching and first-accept assignment
- lifecycle progression through completion with a two-pin map view

**Must-Have Capabilities:**

- unified signup/login with role selection (customer or handyman)
- customer requests dashboard with current requests and full history
- handyman jobs dashboard with available jobs, active work, and full history of accepted/declined/completed jobs
- create request flow with category, title, description, image, and location
- browser geolocation with manual map adjustment
- estimate pricing before submission
- request routing to eligible handymen
- accept/decline actions
- two-pin map view (customer and handyman locations) for assigned jobs, refreshed on load
- handyman status updates for `on the way`, `arrived`, `working`, and `complete`, pushed in real time to both the customer and the handyman's active job view via WebSocket
- durable request, assignment, status, and rating history
- one-time 1-5 star customer rating after completion, with optional short feedback

### Post-MVP Features

**Phase 2 (Post-MVP):**

- in-app chat between customer and handyman
- richer rating aggregation surfaces and stronger reputation tooling
- richer provider trust and profile surfaces
- advanced pricing logic
- saved payment or billing improvements if needed
- better route/ETA sophistication
- improved service-area and matching intelligence

**Phase 3 (Expansion):**

- more service categories
- broader geography
- stronger marketplace quality tooling
- optional internal operations tooling if scale or exception handling demands it

### Risk Mitigation Strategy

**Technical Risks:** The biggest technical risks are matching correctness, duplicate acceptance protection, and location reliability. Mitigation: keep matching rules simple, use guarded assignment transactions, validate geolocation inputs, and preserve durable history so dashboard refresh always reflects authoritative state.

**Market Risks:** The biggest market risk is weak supply-demand liquidity in the launch geography or categories. Mitigation: constrain launch categories and geography to where matching can work credibly.

**Resource Risks:** The biggest resource risk is overbuilding pricing, chat, or support workflows before the marketplace loop is proven. Mitigation: keep pricing simple, defer chat, and avoid reintroducing full ops/support MVP structures prematurely.

## Functional Requirements

### Authentication and Role Flows

- FR1: Users can register a single account with email and password, choosing a role of customer or handyman at signup.
- FR2: Users can log in with email and password and are routed to the experience associated with their selected role.
- FR3: A user's role is set at signup and is not changeable through the MVP self-service flow.
- FR4: The system can prevent the same email from registering more than one account.
- FR5: The system can maintain separate customer and handyman role flows and authorization surfaces after authentication.

### Customer Request Creation and Dashboard

- FR6: Customers can view a list of their current and previous service requests after login.
- FR7: Customers can start a new service request from the customer home screen.
- FR8: Customers can create a request with a title, description, category, and at least one optional image.
- FR9: Customers can select from a configurable set of supported service categories.
- FR10: Customers can allow browser geolocation to set a default job location when available.
- FR11: Customers can manually adjust the job location on a map before submission.
- FR12: The system can store the final selected job location as latitude and longitude.
- FR13: The system can show a simple price estimate before the customer confirms request submission.
- FR14: Customers can submit a request once required fields are complete.

### Matching, Assignment, and Handyman Jobs

- FR15: The system can identify eligible handymen based on request category and configured service area rules.
- FR16: The system can route newly created requests to multiple eligible handymen automatically.
- FR17: Handymen can view available requests that match their supported categories and service area.
- FR18: Handymen can view a history of their past accepted, declined, and completed jobs from their dashboard.
- FR19: Handymen can accept or decline a matching request.
- FR20: If a handyman declines a request, that request no longer appears in that handyman's available jobs list.
- FR21: If a handyman accepts first, the system assigns the request to that handyman and prevents duplicate assignment.
- FR22: If no handyman has accepted yet, the customer-visible status remains `pending`.
- FR23: If a request cannot be fulfilled through the current matching flow, the system can expose a `rejected` outcome clearly.

### Fulfillment Lifecycle and Rating

- FR24: Customers can view the current lifecycle state for each request.
- FR25: The customer-visible request lifecycle includes `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, and `rejected`.
- FR26: Once assigned, customers can view the assigned handyman identity for the request.
- FR27: Once assigned, customers can view a two-pin map showing the job location and the handyman's location at the time of view.
- FR28: Handymen can update assigned jobs to `on the way`, `arrived`, `working`, and `complete`.
- FR29: Status changes made by the assigned handyman are pushed in real time to the customer and to the handyman's own active job view via WebSocket.
- FR30: The system can preserve a durable history of meaningful request and status changes.
- FR31: After a request is marked `complete`, the customer can submit a 1-5 star rating for the assigned handyman.
- FR32: Customers can optionally include short text feedback with the rating.
- FR33: Each completed request can be rated only once by the customer who created that request.
- FR34: Submitting or skipping a rating does not block request completion.

### Service Categories, Pricing, and Platform Configuration

- FR35: The system can manage supported service categories without requiring a redesign of the request flow.
- FR36: The system can associate handymen with only the categories they support.
- FR37: The system can support simple launch-market eligibility rules such as service radius or equivalent location filtering.
- FR38: The system can calculate a simple estimate using a base service fee, category-based pricing, and optional distance and parts allowances.
- FR39: The system can present the estimate as an estimate rather than a guaranteed final total.
- FR40: Handyman profiles can support future aggregation of ratings without requiring an MVP reputation system.

### Platform Continuity and Future Growth

- FR41: The system can preserve a stable request and assignment model that supports future category expansion.
- FR42: The system can support future map-provider replacement without redefining customer or handyman workflows.
- FR43: The system can preserve a clean future path for chat without including chat in MVP.
- FR44: The system can preserve a clean future path for richer rating aggregation and reputation features without including public reviews, moderation systems, or disputes in MVP.

## Non-Functional Requirements

### Performance

- NFR1: Standard customer and handyman dashboard loads should complete within 2 seconds for typical requests under normal operating conditions, excluding third-party network variance.
- NFR2: Request submission and handyman accept/decline actions should complete quickly enough that users do not perceive the action as stalled under normal operating conditions.
- NFR3: WebSocket-pushed job status updates should reach connected clients within 1 second of the handyman submitting the status change under normal operating conditions.
- NFR4: The two-pin map view for an assigned job should render fully within 2 seconds of opening or refreshing the job view under normal operating conditions.

### Reliability

- NFR5: No submitted customer request should be lost, duplicated, or left without a recoverable persisted record.
- NFR6: Assignment logic should prevent more than one handyman from being assigned to the same request.
- NFR7: The system should preserve a durable history of request creation, assignment, major lifecycle transitions, and completion outcomes such that any dashboard refresh reflects the latest authoritative state.
- NFR8: If a WebSocket connection drops, the client should reconnect and restore the latest job status without corrupting lifecycle truth or requiring the user to manually refresh.
- NFR9: Rating submission should be idempotent enough to prevent a completed request from being recorded with more than one customer rating.

### Security

- NFR10: All customer, handyman, and operational data should be encrypted in transit.
- NFR11: Stored account, request, location, and rating data should be protected by appropriate access controls and encryption at rest where applicable.
- NFR12: Authentication and authorization should enforce separation between customer and handyman access surfaces and prevent role escalation after signup.
- NFR13: Uploaded images should be validated and stored through a secure media-handling path appropriate for MVP use.
- NFR14: The system should avoid collecting sensitive data that is not required for request fulfillment, location display, and lightweight rating capture.

### Accessibility

- NFR15: The core customer and handyman flows should meet WCAG 2.1 AA expectations for accessible interaction and readable status communication.
- NFR16: Critical request states, job controls, and rating inputs should never rely on color alone and should remain understandable through labels and structured layout.
- NFR17: The interface should maintain large touch targets, clear form labeling, and low-cognitive-load copy suitable for mobile use in real-world contexts.

### Scalability

- NFR18: The MVP architecture should support at least a 10x increase from initial request and active-job volume without requiring a full redesign of the request, assignment, and rating model.
- NFR19: The platform should support adding new service categories and new launch geographies through configuration and bounded data-model extension rather than core workflow replacement.
- NFR20: Map-provider integration should be isolated behind replaceable seams so vendor changes do not require product-flow rewrites.
- NFR21: WebSocket connections should be scoped to active job status updates only, so the realtime layer scales incrementally with job volume rather than total active users.
