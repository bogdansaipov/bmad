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
lastEdited: '2026-05-11'
editHistory:
  - date: '2026-05-11'
    changes: 'Rewrote PRD from urgent plumbing coordination into a two-sided handyman marketplace MVP based on the approved sprint change proposal.'
---

# Product Requirements Document - demo1

**Author:** Bogdansaipov  
**Last Updated:** 2026-05-11

## Executive Summary

Handrix is a greenfield mobile-first web application for fast home-repair request fulfillment. The MVP is a two-sided marketplace where customers create repair requests, nearby qualified handymen receive matching jobs, and both sides track service progress in real time through a simple map-driven experience.

The core problem Handrix solves is not generic home-services discovery. Users with a home repair issue need a fast, low-friction way to request help, understand who is responding, see when help is moving, and avoid the back-and-forth uncertainty of calling providers one by one. Handymen need an equally lightweight way to receive relevant jobs, accept work quickly, navigate to the customer, and update progress without administrative overhead.

Handrix addresses this with an account-based marketplace loop:

- customers register or log in
- customers create a request with category, description, image, and location
- the platform automatically routes the request to relevant nearby handymen
- the first handyman to accept becomes assigned
- both sides see live status progression and map-based tracking until the job is complete

For the MVP, product value should be judged by how quickly a valid request becomes an assigned and trackable job, how clearly both sides understand the current state, and how simply the product supports completion without manual internal coordination as a primary operating model.

### What Makes This Special

Handrix is differentiated by combining marketplace speed with low-cognitive-load execution. The product should feel closer to an on-demand service app than to a directory, lead marketplace, or long-form booking system.

Its core advantage is operational clarity:

- customers do not need to compare many providers before acting
- handymen only see jobs they are eligible to perform
- assignment happens through automatic matching and first acceptance
- the map and status model make progress visible rather than ambiguous

This makes Handrix strongest when the user already knows they need help and wants a quick path from issue recognition to active fulfillment. The MVP should optimize for speed, confidence, and progress visibility, not marketplace depth or complex pricing.

## Project Classification

Handrix is classified as a greenfield web application in the general software domain. It remains low in regulatory complexity, but the revised MVP is now medium in product and technical complexity because it is a two-sided marketplace with authenticated users, automatic matching, live status updates, map-based tracking, and supply-demand coordination.

The main complexity drivers are:

- two distinct user roles with different workflows
- location-aware matching and assignment correctness
- real-time status and location visibility
- pricing that must be simple but credible
- platform evolution without locking to a single map provider

## Success Criteria

### User Success

Customers should be able to sign in, create a request in a few short steps, receive an estimate, and quickly see whether a handyman has accepted. Once assigned, they should be able to follow progress clearly on a map and through simple lifecycle states.

Handymen should be able to sign in, see only relevant jobs, accept work with minimal friction, update job status quickly, and keep location/status signals accurate without interrupting their workflow.

For the MVP, user success should mean:

- customers can create a request with minimal clicks and low confusion
- customers understand whether the request is pending, assigned, in progress, or complete
- handymen can evaluate and accept relevant jobs quickly
- both sides can rely on the tracking view as the primary source of truth during fulfillment

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

- customer and handyman authentication are reliable and secure
- matching and assignment prevent duplicate acceptance
- live status and location updates remain timely enough to support trust
- request, assignment, and status history remain durable and recoverable
- the platform preserves a clean path to additional categories, providers, and map vendors

### Measurable Outcomes

Suggested MVP measurable outcomes:

- a majority of logged-in customers who start request creation complete submission
- median time from request submission to handyman assignment stays within the target service window for the launch market
- a meaningful share of eligible requests receive at least one handyman acceptance opportunity
- live status and location updates are reflected quickly enough that users do not need offline follow-up for basic tracking
- completed-job rate is high enough to demonstrate the marketplace loop is operationally viable
- support-dependent interventions remain low enough to justify keeping chat and dedicated support tooling out of MVP

## Product Scope

### MVP - Minimum Viable Product

The MVP should include:

- customer registration and login with email and password
- handyman registration and login with email and password
- role-aware customer and handyman application flows
- configurable launch service categories such as plumbing and basic electrical/light-installation tasks
- customer request creation with title, description, image upload, category selection, and location capture
- browser geolocation as the default location signal when available
- manual map-based location adjustment before submission
- simple estimate pricing shown before request submission
- automatic routing of requests to eligible handymen by category and location
- first-accept assignment behavior
- customer request dashboard with request history and current statuses
- handyman jobs list and active job workflow
- map-based live tracking for assigned and in-progress jobs
- handyman-controlled status updates for `on the way`, `arrived`, `working`, and `complete`
- customer-visible request lifecycle states of `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, and `rejected`

### Growth Features (Post-MVP)

Post-MVP growth could include:

- in-app chat between customer and handyman
- richer handyman profiles, ratings, and trust signals
- advanced pricing logic
- saved addresses and faster repeat booking flows
- broader service-category coverage
- richer service-area rules beyond simple radius matching
- more advanced route, ETA, and navigation features
- internal operations and support tooling if marketplace scale requires it

### Vision (Future)

The longer-term vision is a trusted on-demand home-services platform that can support multiple repair categories, stronger provider quality signals, richer customer convenience features, and broader regional scale without redefining the core marketplace lifecycle.

Chat is explicitly deferred from the MVP. The platform should preserve a technical path to add it later, but the initial product should prove that request creation, matching, assignment, live tracking, and completion can work clearly without it.

## User Journeys

### Journey 1: Customer Creates a Request and Tracks Fulfillment

Nodira notices a leaking faucet in her kitchen and wants help quickly. She already has or creates a Handrix customer account with email and password. After login, she lands on a simple home screen that shows her existing requests and a clear action to create a new one.

She creates a request by selecting a service category, entering a short title and description, attaching a photo, and confirming the job location. The product defaults to her browser geolocation when available, then lets her adjust the pin manually on a map before submission. Handrix shows a simple estimate before she confirms.

After submission, Nodira sees the new request in a `pending` state while matching handymen are notified. When a handyman accepts, the request immediately becomes `assigned`, and she can open a tracking view that shows the handyman identity, the job location, and live movement on a map. As the handyman updates status to `on the way`, `arrived`, `working`, and `complete`, Nodira sees those changes reflected in real time.

This journey drives requirements for customer auth, request creation, image upload, geo capture, price estimation, matching, assignment, live map tracking, and visible lifecycle progression.

### Journey 2: Customer Sees No Accepted Match Yet

Jasur has a clogged drain and creates a request in the evening. He completes the same request flow, but no handyman has accepted yet. Instead of showing ambiguous waiting language, Handrix keeps the request visible as `pending` and makes that state understandable: the request exists, matching handymen are being notified, and assignment has not happened yet.

If enough matching opportunities are exhausted without acceptance, the request can transition to `rejected`. Jasur should see that clearly and understand that the current request did not receive acceptance through the MVP marketplace flow. This should feel explicit rather than confusing.

This journey drives requirements for pending-state clarity, rejected-state clarity, and honest lifecycle communication without relying on dedicated support workflows in MVP.

### Journey 3: Handyman Accepts and Completes a Job

Azamat is a handyman who supports plumbing and light-installation categories within a configured service radius. He signs into Handrix and sees available jobs that match his supported categories and current service area.

When a matching request appears, he can open the job, review the request details, and either accept or decline. If he declines, the job disappears from his available list while remaining available to other eligible handymen. If he accepts first, the request becomes assigned to him and no longer remains open to others.

Once assigned, Azamat sees the customer/job location on a map, begins sharing live location during the active job, and updates status as he progresses: `on the way`, `arrived`, `working`, and `complete`. He should be able to handle this flow quickly from mobile without extra administrative steps.

This journey drives requirements for handyman auth, category eligibility, job feed filtering, first-accept assignment, active job tracking, location updates, and status controls.

### Journey 4: Returning Customer Manages Multiple Requests

A returning customer signs in and lands on the requests dashboard. Instead of starting from a one-off intake flow each time, the customer can see previous and current requests, understand which ones are complete, and create a new request from the same home screen.

This journey drives requirements for account-based continuity, request history visibility, and a dashboard-first customer experience.

### Journey Requirements Summary

These journeys point to a focused MVP capability set:

- authenticated customer and handyman roles
- dashboard-first customer and handyman entry points
- low-friction request creation
- location-aware matching and assignment
- first-accept job ownership
- real-time status and map-based tracking
- simple estimate pricing before submission
- clear request history and lifecycle visibility

## Web App Specific Requirements

### Project-Type Overview

Handrix should be implemented as a mobile-first single-page application using React, with a NestJS backend responsible for authentication, request management, matching, assignment, realtime delivery, and persistence.

The product should feel app-like on mobile browsers, with fast transitions, clear status presentation, and minimal click depth for both customer and handyman roles. Desktop support remains important, but the primary design target is mobile usage during real-world field or household contexts.

### Technical Architecture Considerations

The frontend should communicate with backend APIs implemented in NestJS. The backend should manage account auth, category eligibility, request creation, pricing estimate generation, matching, assignment, status history, and realtime updates.

Realtime behavior is a core MVP requirement for assigned and active jobs. Handrix should use WebSocket-based live job updates for status and location changes during assigned and in-progress requests. Polling can remain acceptable for lower-frequency dashboard refreshes such as customer request lists or handyman available-jobs lists.

Location and mapping should be treated as replaceable platform integrations rather than product-locked dependencies. The architecture should support a provider-agnostic map abstraction so MVP delivery can use a free or low-cost option and swap providers later without rewriting domain logic.

### Browser Support

The MVP should support current versions of major modern mobile browsers and common modern desktop browsers. Legacy browser support is not required.

### Responsive Design

The interface should be optimized for one-handed mobile use, glanceable status comprehension, large touch targets, and short completion paths. Desktop layouts should preserve the same information architecture without requiring separate product logic.

### Performance Targets

The core user flows should feel fast and direct:

- login and request list loads should return promptly under normal network conditions
- request creation should avoid long blocking states
- job acceptance and status updates should feel immediate enough to preserve trust
- map and tracking screens should update without jarring resets

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

**MVP Approach:** marketplace-first, speed-and-clarity MVP. The goal is to prove that Handrix can connect real customer requests to relevant handymen quickly enough that assignment, live tracking, and completion create a credible on-demand experience.

The MVP should intentionally stay simple in a few ways:

- limited launch geography
- constrained launch categories
- simple eligibility rules
- simple estimate pricing
- no in-app chat
- no dedicated ops or support workspace as a primary operating requirement

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- customer authentication and request management
- handyman authentication and job acceptance
- request creation with location and image support
- automatic matching and first-accept assignment
- live tracking and status progression through completion

**Must-Have Capabilities:**

- customer signup/login
- handyman signup/login
- customer requests dashboard
- handyman jobs dashboard
- create request flow with category, title, description, image, and location
- browser geolocation with manual map adjustment
- estimate pricing before submission
- request routing to eligible handymen
- accept/decline actions
- WebSocket-based status and live-location updates for assigned jobs
- durable request, assignment, and status history

### Post-MVP Features

**Phase 2 (Post-MVP):**

- in-app chat between customer and handyman
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

**Technical Risks:** The biggest technical risks are matching correctness, duplicate acceptance protection, location reliability, and WebSocket stability. Mitigation: keep matching rules simple, use guarded assignment transactions, limit realtime scope to active jobs, and preserve durable fallback history.

**Market Risks:** The biggest market risk is weak supply-demand liquidity in the launch geography or categories. Mitigation: constrain launch categories and geography to where matching can work credibly.

**Resource Risks:** The biggest resource risk is overbuilding pricing, chat, or support workflows before the marketplace loop is proven. Mitigation: keep pricing simple, defer chat, and avoid reintroducing full ops/support MVP structures prematurely.

## Functional Requirements

### Authentication and Role Flows

- FR1: Customers can register with email and password.
- FR2: Customers can log in with email and password.
- FR3: Handymen can register with email and password.
- FR4: Handymen can log in with email and password.
- FR5: The system can maintain separate customer and handyman role flows after authentication.

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

### Matching and Assignment

- FR15: The system can identify eligible handymen based on request category and configured service area rules.
- FR16: The system can route newly created requests to multiple eligible handymen automatically.
- FR17: Handymen can view available requests that match their supported categories and service area.
- FR18: Handymen can accept or decline a matching request.
- FR19: If a handyman declines a request, that request no longer appears in that handyman's available jobs list.
- FR20: If a handyman accepts first, the system assigns the request to that handyman and prevents duplicate assignment.
- FR21: If no handyman has accepted yet, the customer-visible status remains `pending`.
- FR22: If a request cannot be fulfilled through the current matching flow, the system can expose a `rejected` outcome clearly.

### Live Tracking and Fulfillment Lifecycle

- FR23: Customers can view the current lifecycle state for each request.
- FR24: The customer-visible request lifecycle includes `pending`, `assigned`, `on the way`, `arrived`, `working`, `complete`, and `rejected`.
- FR25: Once assigned, customers can view the assigned handyman identity for the request.
- FR26: Once assigned, customers can view both the job location and handyman location on a map.
- FR27: Handymen can update assigned jobs to `on the way`, `arrived`, `working`, and `complete`.
- FR28: Status changes made by the assigned handyman are reflected to the customer in real time.
- FR29: The assigned handyman can send live location updates while a job is active.
- FR30: The system can preserve a durable history of meaningful request and status changes.

### Service Categories, Pricing, and Platform Configuration

- FR31: The system can manage supported service categories without requiring a redesign of the request flow.
- FR32: The system can associate handymen with only the categories they support.
- FR33: The system can support simple launch-market eligibility rules such as service radius or equivalent location filtering.
- FR34: The system can calculate a simple estimate using a base service fee, category-based pricing, and optional distance and parts allowances.
- FR35: The system can present the estimate as an estimate rather than a guaranteed final total.

### Platform Continuity and Future Growth

- FR36: The system can preserve a stable request and assignment model that supports future category expansion.
- FR37: The system can support future map-provider replacement without redefining customer or handyman workflows.
- FR38: The system can preserve a clean future path for chat without including chat in MVP.

## Non-Functional Requirements

### Performance

- NFR1: Standard customer and handyman dashboard loads should complete within 2 seconds for typical requests under normal operating conditions, excluding third-party network variance.
- NFR2: Request submission and handyman accept/decline actions should complete quickly enough that users do not perceive the action as stalled under normal operating conditions.
- NFR3: WebSocket-delivered active-job status updates should reach connected clients with low enough latency to keep tracking credible during live fulfillment.
- NFR4: Map-based tracking screens should update incrementally without full-screen resets during normal active-job usage.

### Reliability

- NFR5: No submitted customer request should be lost, duplicated, or left without a recoverable persisted record.
- NFR6: Assignment logic should prevent more than one handyman from being assigned to the same request.
- NFR7: The system should preserve a durable history of request creation, assignment, major lifecycle transitions, and completion outcomes.
- NFR8: If a realtime connection drops, the system should recover state gracefully through reconnect or fallback refresh behavior without corrupting lifecycle truth.

### Security

- NFR9: All customer, handyman, and operational data should be encrypted in transit.
- NFR10: Stored account, request, and location data should be protected by appropriate access controls and encryption at rest where applicable.
- NFR11: Authentication and authorization should enforce separation between customer and handyman access surfaces.
- NFR12: Uploaded images should be validated and stored through a secure media-handling path appropriate for MVP use.
- NFR13: The system should avoid collecting sensitive data that is not required for request fulfillment and tracking.

### Accessibility

- NFR14: The core customer and handyman flows should meet WCAG 2.1 AA expectations for accessible interaction and readable status communication.
- NFR15: Critical request states and job controls should never rely on color alone and should remain understandable through labels and structured layout.
- NFR16: The interface should maintain large touch targets, clear form labeling, and low-cognitive-load copy suitable for mobile use in real-world contexts.

### Scalability

- NFR17: The MVP architecture should support at least a 10x increase from initial request and active-job volume without requiring a full redesign of the request and assignment model.
- NFR18: The platform should support adding new service categories and new launch geographies through configuration and bounded data-model extension rather than core workflow replacement.
- NFR19: Map-provider integration should be isolated behind replaceable seams so vendor changes do not require product-flow rewrites.
- NFR20: WebSocket-based live-job updates should remain scoped to assigned and active jobs so the realtime layer can scale incrementally with usage.
