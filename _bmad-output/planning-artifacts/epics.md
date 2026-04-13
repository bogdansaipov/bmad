---
stepsCompleted:
  - 'step-01-validate-prerequisites'
  - 'step-02-design-epics'
  - 'step-03-create-stories'
  - 'step-04-final-validation'
inputDocuments:
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md'
---

# demo1 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for demo1, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Customers can start a service request without creating an account first.
FR2: Customers can select from a constrained set of supported small-plumbing issue types.
FR3: Customers can answer issue-specific follow-up questions to clarify their problem.
FR4: Customers can provide service location details needed to evaluate and fulfill a request.
FR5: Customers can receive immediate containment or stabilization guidance relevant to their selected issue.
FR6: Customers can review a summary of their issue and request details before confirming submission.
FR7: Customers can submit a request for service once required information is complete.
FR8: Customers can see when their issue is outside current service scope or cannot be fulfilled as requested.
FR9: Customers can receive fallback guidance or next-step instructions when immediate fulfillment is not available.
FR10: Customers can see what happens next after submitting a request.
FR11: Customers can view a clear service status for their request throughout its lifecycle.
FR12: Customers can view estimated response expectations associated with their request.
FR13: Customers can view pricing information or pricing expectations before committing to service.
FR14: Customers can receive trust-building information that helps them feel confident using the service.
FR15: Customers can see confirmation that their request has been successfully received and is being processed.
FR16: Customers can understand when a request is delayed, pending clarification, or unavailable.
FR17: The system can create and store a service request with all required customer-provided details.
FR18: The system can classify requests by issue type, status, and fulfillment state.
FR19: The system can update request status as the request moves through intake, review, assignment, dispatch, and completion.
FR20: The system can maintain a customer-visible lifecycle for each request.
FR21: The system can support manual or semi-manual dispatch decisions during the MVP.
FR22: The system can associate a request with an assigned provider or internal fulfillment owner.
FR23: The system can record when a request cannot be fulfilled and communicate that state appropriately.
FR24: The system can preserve a history of request-state changes for operational visibility and support.
FR25: Operations staff can view a queue of incoming service requests.
FR26: Operations staff can review request details needed to decide assignment and fulfillment.
FR27: Operations staff can assign requests to available providers or internal handlers.
FR28: Operations staff can update request status as fulfillment progresses.
FR29: Operations staff can identify requests requiring intervention, clarification, or escalation.
FR30: Operations staff can view what guidance and expectations have already been shown to the customer.
FR31: Operations staff can manage requests in a way that keeps internal actions aligned with customer-facing status updates.
FR32: Support staff can search for and access an individual customer request.
FR33: Support staff can view request history, current status, and prior customer-facing guidance.
FR34: Support staff can identify why a request is delayed, blocked, or unfulfilled.
FR35: Support staff can provide consistent reassurance and next-step information based on the current request state.
FR36: Support staff can intervene in requests that require manual follow-up or clarification.
FR37: The system can enforce MVP scope by limiting requests to supported issue categories.
FR38: The system can determine whether a request is serviceable within the current operating area or fulfillment model.
FR39: The system can support management of supported issue types and service coverage rules.
FR40: The system can support internal control over request states, operational workflows, and fulfillment visibility needed to run the MVP.
FR41: The system can support expansion to additional categories, geographies, and richer customer features without redefining the core request lifecycle.

### NonFunctional Requirements

NFR1: The core customer request flow should allow a user to move from issue selection to request confirmation in a responsive, low-friction experience on modern mobile browsers.
NFR2: Standard user-facing actions in the core flow should complete within 2 seconds under normal operating conditions, excluding external network limitations.
NFR3: Customer-visible request status refreshes should occur frequently enough that the dispatch experience feels actively progressing rather than stalled.
NFR4: Internal operations screens should surface active request information quickly enough to support timely assignment and intervention.
NFR5: The system should preserve request state consistently throughout intake, confirmation, dispatch tracking, and internal status management.
NFR6: No confirmed customer request should be lost, duplicated, or left without a recoverable operational record.
NFR7: Customer-facing status information and internal operational status should remain aligned closely enough to avoid contradictory communication.
NFR8: If part of the flow fails or becomes temporarily unavailable, the system should present a recoverable state or fallback guidance rather than leaving the user in ambiguity.
NFR9: All customer and operational data should be encrypted in transit.
NFR10: Stored request and user data should be protected with appropriate access controls and encryption at rest where applicable.
NFR11: Operational and support access should be restricted according to role and business need.
NFR12: The system should maintain an auditable record of meaningful request-state changes and internal actions relevant to fulfillment and support.
NFR13: The MVP should avoid collecting sensitive data that is not necessary to fulfill the service request.
NFR14: The core request flow should meet WCAG 2.1 AA standards for the customer-facing experience.
NFR15: The interface should support readable contrast, clear focus states, keyboard accessibility for essential interactions, and understandable form labeling.
NFR16: Content should be written in clear, low-cognitive-load language suitable for stressed users making quick decisions.
NFR17: Touch targets and layout behavior should support reliable use on mobile devices in distracting or physically inconvenient situations.
NFR18: The MVP architecture should support growth beyond the initial launch geography and service volume without requiring a full redesign of the request lifecycle.
NFR19: The system should support at least a 10x increase from initial MVP request volume with incremental operational and infrastructure scaling.
NFR20: Polling-based status updates should remain manageable at MVP scale, with a clear path to more efficient real-time mechanisms if usage grows materially.

### Additional Requirements

- Initialize the project as a paired foundation using a Vite React TypeScript SPA frontend and a NestJS CLI backend as the first implementation story.
- Implement the MVP as a request-centric modular monolith with distinct frontend and backend apps plus a shared contract package.
- Use PostgreSQL as the system of record and Prisma ORM with migrations for request, assignment, history, guidance, coverage, user, and support-note data.
- Model the platform around an explicit request lifecycle state machine with guarded transitions and append-only status history.
- Expose a REST-first JSON API in NestJS with OpenAPI documentation and consistent `{ data, meta? }` / `{ error: { ... } }` response wrappers.
- Separate richer internal operational states from curated customer-visible public statuses and derive public status labels from backend mappings.
- Support anonymous customer request creation with a signed request-tracking token for revisit and status lookup.
- Restrict operations and support tooling behind authenticated JWT-based role-based access control.
- Use polling for customer status tracking in the MVP, with backend contracts and lifecycle models that can evolve to push-based updates later.
- Use React Router for SPA routing and TanStack Query for server-state synchronization and polling behavior.
- Keep route-local flow state on the client and treat backend lifecycle rules as the only source of truth for business-critical state transitions.
- Centralize structured config for issue types, containment guidance templates, coverage rules, and public status labels rather than scattering constants.
- Add structured application logs, request correlation IDs, health endpoints, rate limiting, and error monitoring from the first release.
- Enforce naming and contract consistency: `snake_case` in persistence, `camelCase` in JSON and TypeScript, ISO 8601 timestamps, and stable machine-readable error codes.
- Maintain separate local, staging, and production environments with typed config validation, plus CI/CD gates for lint, tests, migrations, and deployment.

### UX Design Requirements

UX-DR1: The customer experience must be a mobile-first React SPA optimized for one-handed use, strong state continuity, and no-account urgent request completion.
UX-DR2: The intake flow must use progressive disclosure so each screen presents one dominant question or action at a time with minimal branching.
UX-DR3: The opening issue-selection experience must use plain-language issue labels and descriptions so users do not need plumbing vocabulary to proceed.
UX-DR4: Issue selection interactions must provide immediate relevant follow-up behavior, either advancing the flow or revealing clarifying questions without dead ends.
UX-DR5: Immediate containment guidance must appear early in the flow and deliver brief, specific, calm stabilization instructions before booking.
UX-DR6: Address entry, request details, review, and confirmation must feel lightweight and sequential rather than like a long administrative form.
UX-DR7: Pre-confirmation screens must present believable ETA, pricing expectation, and what-happens-next information in a fast-scanning trust-building summary.
UX-DR8: Post-confirmation screens must shift into a reassurance mode that makes it obvious the request was received, what stage it is in, and whether the user needs to do anything else.
UX-DR9: Dispatch tracking must be glanceable and use visible progress states so waiting feels active rather than uncertain.
UX-DR10: Delay, clarification-needed, out-of-scope, and unavailable states must use calm recovery UX with explanation, next-best action, and optional support path.
UX-DR11: The visual system must use a calm trust-building palette centered on deep slate-blue or blue-teal primary tones, warm neutrals, and restrained semantic status colors.
UX-DR12: Status presentation must never rely on color alone and must pair labels, icons, and clear state wording for every customer-visible state.
UX-DR13: The typography system must prioritize mobile readability, fast scanning, clear hierarchy, and avoid small or low-emphasis text for critical guidance.
UX-DR14: Layout must use an 8px spacing scale, a single-column mobile-first grid, generous touch targets, and clear grouping of related information.
UX-DR15: The product must meet WCAG 2.1 AA expectations in practice through contrast compliance, focus states, keyboard support, understandable labels, and low-cognitive-load copy.
UX-DR16: The chosen visual direction must use Warm Utility for intake and guidance experiences and Precision Dispatch patterns for post-confirmation tracking experiences.
UX-DR17: Implement a reusable Issue Selection Card component with label, short description, optional icon, urgency cue, selectable states, and keyboard accessibility.
UX-DR18: Implement a reusable Containment Guidance Panel component that supports informational, warning, and recovery variants with structured headings and calm step content.
UX-DR19: Implement a reusable Expectation Summary Module component for ETA, pricing, explanation, and confirmation across standard and revised-expectation states.
UX-DR20: Implement a reusable Request Status Timeline component with explicit state labels, timestamps or notes, automatic refresh behavior, and compact/full variants.
UX-DR21: Implement a reusable Request Recovery State Card component for clarification, delay, unavailable, and resolved scenarios with strong next-step actions.
UX-DR22: Implement a reusable Operations Request Queue Item component that supports rapid scanning of issue type, urgency, address summary, state, and assignment status.
UX-DR23: Loading behavior must use reserved layouts or skeletons for initial loads and calm inline refresh indicators for polling instead of resetting the full screen.
UX-DR24: The copy and interaction design must prioritize emotional de-escalation, grounded transparency, and visible progress over excitement, marketplace browsing, or novelty.

### FR Coverage Map

FR1: Epic 1 - Anonymous request start
FR2: Epic 1 - Supported plumbing issue selection
FR3: Epic 1 - Clarifying questions during intake
FR4: Epic 1 - Service location capture
FR5: Epic 1 - Immediate containment guidance
FR6: Epic 1 - Request review before submission
FR7: Epic 1 - Request submission
FR8: Epic 2 - Out-of-scope or unfulfillable visibility
FR9: Epic 2 - Fallback guidance and next steps
FR10: Epic 2 - What-happens-next explanation
FR11: Epic 2 - Customer lifecycle visibility
FR12: Epic 1 - Response expectation display
FR13: Epic 1 - Pricing expectation display
FR14: Epic 1 - Trust-building information in the flow
FR15: Epic 2 - Confirmation state after submission
FR16: Epic 2 - Delay, clarification, or unavailable states
FR17: Epic 1 - Service request creation and storage
FR18: Epic 1 - Request classification at intake
FR19: Epic 2 - Lifecycle status updates
FR20: Epic 2 - Customer-visible lifecycle model
FR21: Epic 3 - Manual or semi-manual dispatch support
FR22: Epic 3 - Assignment to provider or internal owner
FR23: Epic 2 - Unfulfilled request handling
FR24: Epic 2 - Request-state history preservation
FR25: Epic 3 - Operations queue view
FR26: Epic 3 - Operations request review
FR27: Epic 3 - Assignment actions
FR28: Epic 3 - Fulfillment status updates
FR29: Epic 3 - Intervention and escalation identification
FR30: Epic 3 - Visibility into prior customer guidance
FR31: Epic 3 - Internal/customer status alignment
FR32: Epic 4 - Support request search and access
FR33: Epic 4 - Support visibility into history and guidance
FR34: Epic 4 - Support diagnosis of blocked or delayed requests
FR35: Epic 4 - Consistent reassurance and next-step support
FR36: Epic 4 - Manual support intervention
FR37: Epic 1 - MVP scope enforcement in intake
FR38: Epic 1 - Serviceability decisioning
FR39: Epic 3 - Manage issue types and coverage rules
FR40: Epic 3 - Internal control over request states and workflows
FR41: Epic 5 - Expansion-ready lifecycle foundation

## Epic List

### Epic 1: Launch the Handrix Request Flow Foundation
Users can start a plumbing request, move through a calm mobile-first intake flow, receive immediate containment guidance, review expectations, and confirm a request without creating an account.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR12, FR13, FR14, FR17, FR18, FR37, FR38

### Epic 2: Deliver Confirmation, Tracking, and Recovery
Users can see that their request was received, understand what happens next, track progress through clear public statuses, and stay informed when delays, clarification needs, or unavailability occur.
**FRs covered:** FR8, FR9, FR10, FR11, FR15, FR16, FR19, FR20, FR23, FR24

### Epic 3: Enable Operations Dispatch and Lifecycle Control
Operations staff can review incoming requests, assign fulfillment owners, update lifecycle states, and keep internal actions aligned with the customer-facing experience.
**FRs covered:** FR21, FR22, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR39, FR40

### Epic 4: Equip Support for Trust Recovery and Request Intervention
Support staff can locate requests, understand full request history and customer-facing context, explain blockers or delays, and intervene when human follow-up is needed.
**FRs covered:** FR32, FR33, FR34, FR35, FR36

### Epic 5: Harden the Platform for Reliable MVP Operations
The team can run Handrix on a durable, secure, observable architecture that preserves lifecycle integrity now and supports future category and geography expansion later.
**FRs covered:** FR41 plus the architecture-driven cross-cutting requirements needed to make Epics 1-4 production-credible

## Epic 1: Launch the Handrix Request Flow Foundation

Users can start a plumbing request, move through a calm mobile-first intake flow, receive immediate containment guidance, review expectations, and confirm a request without creating an account.

### Story 1.1: Set Up Initial Project from Starter Template

As a product team,
I want the Vite React SPA, NestJS API, and shared contract foundation initialized,
So that all later customer-request stories can be built on a consistent MVP architecture.

**Acceptance Criteria:**

**Given** the repository is ready for MVP implementation
**When** the project foundation is created
**Then** the codebase includes a Vite React TypeScript frontend, a NestJS backend, and a shared package for cross-app contracts
**And** the workspace structure follows the architecture direction for separated apps and shared code

**Given** the frontend and backend foundations exist
**When** a developer runs the local setup commands
**Then** both applications start successfully in development mode
**And** the shared package can be imported by both apps without manual copying of types

**Given** the initial workspace is in place
**When** the baseline tooling is configured
**Then** the repo includes TypeScript configuration, package management, and environment examples for local development
**And** the foundation does not introduce unused features beyond MVP scope

**Given** the frontend, backend, and shared package foundations exist
**When** baseline integration contracts are established
**Then** the backend can expose OpenAPI documentation for the MVP API surface
**And** the shared foundation supports the agreed response envelope and schema conventions used across apps

### Story 1.2: Let Customers Identify a Supported Plumbing Issue

As a customer with an urgent plumbing problem,
I want to choose my issue from clear supported options,
So that I can start the request flow without knowing plumbing terms.

**Acceptance Criteria:**

**Given** a customer opens the Handrix request flow on mobile or desktop
**When** the issue selection screen loads
**Then** the customer sees only the supported small-plumbing issue categories for the MVP
**And** each option uses plain-language labels and short explanatory copy

**Given** the issue selection screen is visible
**When** the customer selects an issue card
**Then** the selection state is visually clear and accessible
**And** the flow advances or reveals the next relevant step without presenting unrelated options

**Given** a requested issue is outside the current MVP scope
**When** the customer looks for unsupported categories
**Then** the interface does not imply unsupported services are available
**And** the scope remains limited to supported plumbing scenarios only

### Story 1.3: Capture Clarifying Answers and Service Location

As a customer,
I want to answer only the follow-up questions needed for my issue and provide my service address,
So that Handrix can determine whether my request is in scope and fulfillable.

**Acceptance Criteria:**

**Given** a customer has selected a supported issue type
**When** the flow requests additional details
**Then** the customer is shown only the clarifying questions relevant to that issue type
**And** the interaction follows a progressive-disclosure pattern with one dominant action per step

**Given** the customer continues through the intake flow
**When** service location details are requested
**Then** the customer can enter the address and required service details needed for fulfillment review
**And** required fields are clearly labeled with accessible validation feedback

**Given** the customer has entered issue details and location
**When** the system evaluates the request
**Then** the request is classified by issue type and serviceability status
**And** unsupported or out-of-area requests are flagged for the correct downstream recovery path

### Story 1.4: Show Immediate Containment Guidance

As a customer dealing with a plumbing issue,
I want to receive calm, actionable containment guidance based on my issue,
So that I can reduce damage and feel more in control before booking.

**Acceptance Criteria:**

**Given** a customer has provided enough issue detail for guidance selection
**When** the containment step is reached
**Then** the system displays issue-specific stabilization guidance tied to the selected plumbing problem
**And** the guidance uses short, calm, low-cognitive-load language

**Given** containment guidance is displayed
**When** the customer reviews the panel
**Then** the screen presents structured steps, warnings where needed, and reassurance copy without overwhelming the user
**And** the content remains readable and accessible on mobile

**Given** a request is trending toward a fallback or recovery state
**When** guidance is shown in that context
**Then** the containment guidance can support warning or recovery variants
**And** the next step remains clear to the customer

### Story 1.5: Review ETA, Pricing Expectations, and Request Summary

As a customer,
I want to review my issue details, price expectations, response window, and next steps,
So that I can make an informed decision before confirming service.

**Acceptance Criteria:**

**Given** a customer has completed issue selection, clarifying answers, and location entry
**When** the review step is displayed
**Then** the screen presents a concise summary of the request details for verification
**And** the customer can understand what information will be submitted

**Given** the customer is on the pre-confirmation summary screen
**When** expectations are shown
**Then** the interface displays believable ETA guidance, pricing information or pricing ranges, and what-happens-next messaging
**And** the presentation is optimized for quick scanning and trust-building clarity

**Given** the customer notices incorrect information before submission
**When** they choose to revise earlier inputs
**Then** they can return to the relevant prior step without losing unrelated progress
**And** the updated summary reflects their changes before confirmation

### Story 1.6: Submit an Anonymous Service Request

As a customer,
I want to confirm my request without creating an account,
So that I can lock in help quickly and have my request stored with a trackable identity.

**Acceptance Criteria:**

**Given** the customer has completed the review step with all required information
**When** they tap the primary confirmation action
**Then** the system creates and stores a service request with the captured intake details
**And** the request is assigned an internal lifecycle state and customer-safe tracking identity

**Given** a request is successfully created
**When** the confirmation response is returned
**Then** the customer does not need to create an account to complete the booking
**And** the response includes the information needed for later request tracking

**Given** anonymous request tracking is required for the MVP
**When** the request is created successfully
**Then** the system returns a signed tracking token or equivalent signed tracking credential tied only to that request
**And** the token strategy is defined clearly enough to support secure later status lookup without exposing unrelated requests

**Given** the request submission fails due to a validation or temporary system problem
**When** the customer submits the request
**Then** the interface presents a calm recoverable error state rather than losing progress
**And** duplicate confirmed requests are prevented

## Epic 2: Deliver Confirmation, Tracking, and Recovery

Users can see that their request was received, understand what happens next, track progress through clear public statuses, and stay informed when delays, clarification needs, or unavailability occur.

### Story 2.1: Show a Clear Request Confirmation State

As a customer,
I want to see immediate confirmation that my request was received,
So that I know Handrix is actively handling my issue.

**Acceptance Criteria:**

**Given** a customer successfully submits a service request
**When** the confirmation view loads
**Then** the interface clearly states that the request has been received and is being processed
**And** the customer can immediately understand the next expected step

**Given** the confirmation state is displayed
**When** the customer reviews the page
**Then** the screen shows a customer-safe summary of the request and the current public status
**And** the content uses calm, trust-building language rather than technical system messages

**Given** the confirmation state appears on mobile
**When** the customer scans the page under stress
**Then** the design emphasizes reassurance, readability, and one dominant next action
**And** the layout remains accessible and touch-friendly

### Story 2.2: Define and Expose Customer-Safe Request Statuses

As a product system,
I want internal lifecycle updates mapped to clear public statuses,
So that customers always see trustworthy progress language instead of operational noise.

**Acceptance Criteria:**

**Given** the backend tracks richer internal lifecycle states
**When** customer-facing status data is returned
**Then** the API exposes curated public statuses that are safe and understandable for customers
**And** each public status is derived from a single authoritative backend mapping

**Given** a request changes state internally
**When** the public status is resolved
**Then** the customer-visible status remains aligned with the true lifecycle state
**And** unsupported or contradictory status combinations are prevented

**Given** public statuses are defined
**When** frontend experiences render them
**Then** the copy, labels, and status treatments come from the shared status model rather than duplicated hardcoded strings
**And** the response format follows the agreed API contract conventions

### Story 2.3: Let Customers Revisit and Track Their Request

As a customer,
I want to open my request status view using my tracking identity,
So that I can check progress without creating an account.

**Acceptance Criteria:**

**Given** a customer has a successfully created request
**When** they use the tracking identity returned at confirmation
**Then** they can retrieve the current customer-facing request status without authenticating as a registered account
**And** access is limited to the intended request only

**Given** public request lookup depends on an anonymous tracking credential
**When** the backend validates the supplied tracking token
**Then** the lookup succeeds only for a valid signed token that matches the intended request
**And** expired, tampered, or mismatched credentials are rejected without leaking request existence details

**Given** a customer opens the tracking view later
**When** the request is fetched
**Then** the system returns the current public status, key timestamps or progress context, and the next-step message
**And** the tracking experience works on modern mobile browsers

**Given** the tracking identity is invalid, expired, or malformed
**When** a status lookup is attempted
**Then** the customer sees a calm recoverable error state
**And** the system does not expose internal request details or sensitive information

### Story 2.4: Present a Live Request Status Timeline

As a customer,
I want to see a glanceable timeline of request progress and next steps,
So that waiting feels active and understandable.

**Acceptance Criteria:**

**Given** a customer is viewing the request status screen
**When** the tracking interface loads
**Then** the page displays a timeline or progress module showing the current public status and prior meaningful progress states
**And** each state includes clear labels with no color-only meaning

**Given** the customer remains on the status screen
**When** the application refreshes status updates using polling
**Then** the timeline updates without resetting the whole screen or causing visual instability
**And** background refresh behavior feels calm and non-technical

**Given** a new status becomes available
**When** the tracking screen refreshes
**Then** the customer can see what changed and what happens next
**And** the presentation remains optimized for fast scanning on mobile

### Story 2.5: Handle Clarification, Delay, and Unavailable Recovery States

As a customer,
I want honest recovery states when fulfillment changes,
So that I stay informed and know the next best action instead of feeling abandoned.

**Acceptance Criteria:**

**Given** a request needs clarification, is delayed, or cannot be fulfilled
**When** the customer views the request flow or tracking screen
**Then** the interface shows a dedicated recovery state with a clear explanation of what changed
**And** the message includes a next-best action or expectation update

**Given** the request falls outside current service scope or operating availability
**When** the customer reaches a recovery state
**Then** the product provides fallback guidance or alternative next steps rather than a dead-end failure
**And** the tone remains honest, calm, and trust-preserving

**Given** recovery messaging is shown
**When** the state is rendered across customer-facing surfaces
**Then** the copy stays consistent with the backend public status model and prior expectation-setting
**And** the customer can distinguish between clarification-needed, delayed, and unavailable outcomes

### Story 2.6: Preserve Customer-Visible Request History

As an operations-ready platform,
I want meaningful request-state changes recorded with customer-facing context,
So that later support and ops workflows can stay aligned with what the customer saw.

**Acceptance Criteria:**

**Given** a request is created and progresses through lifecycle states
**When** a meaningful public or internal-to-public status transition occurs
**Then** the system records the transition in durable request history
**And** the history includes the previous state, next state, timestamp, and relevant actor or system context when available

**Given** customer-facing messages accompany a lifecycle transition
**When** the request history entry is stored
**Then** the record preserves the public status context needed to reconstruct what the customer saw
**And** the history supports later support and operational visibility requirements

**Given** request history is used by tracking or later internal tools
**When** historical lifecycle data is queried
**Then** the system can return ordered state transitions without losing recoverability or consistency
**And** confirmed requests are not left without an auditable operational record

## Epic 3: Enable Operations Dispatch and Lifecycle Control

Operations staff can review incoming requests, assign fulfillment owners, update lifecycle states, and keep internal actions aligned with the customer-facing experience.

### Story 3.1: Enable Operations Staff Authentication and Access

As an operations staff member,
I want secure access to the internal operations area,
So that only authorized users can review and manage customer requests.

**Acceptance Criteria:**

**Given** an internal user has an operations role
**When** they access the operations login flow with valid credentials
**Then** they can authenticate successfully and enter the operations area
**And** their session is authorized according to the defined internal access model

**Given** a user is not authenticated or does not have the required role
**When** they attempt to access operations routes or APIs
**Then** access is denied
**And** no protected request-management data is exposed

**Given** operations authentication is enabled
**When** the backend enforces access control
**Then** operations access is protected through role-based authorization rather than frontend-only gating
**And** the implementation supports future separation of ops and support privileges

### Story 3.2: Show an Operations Request Queue

As an operations coordinator,
I want to see a queue of incoming service requests,
So that I can quickly understand what needs attention and act in priority order.

**Acceptance Criteria:**

**Given** authenticated operations staff enter the internal dashboard
**When** the request queue loads
**Then** they can see active incoming requests in a fast-scanning queue view
**And** each queue item shows issue type, address summary, current state, received time, and assignment status

**Given** the operations queue contains requests in different conditions
**When** the coordinator scans the list
**Then** requests needing prompt action are distinguishable from already-assigned or blocked requests
**And** the presentation supports quick triage without opening every record first

**Given** the queue is accessed during ongoing request activity
**When** new data is fetched
**Then** the queue updates reliably without losing clarity or creating contradictory lifecycle visibility
**And** performance is sufficient for timely operational intervention

### Story 3.3: Let Operations Review Full Request Details

As an operations coordinator,
I want to open a request and inspect issue details, serviceability context, and customer-facing guidance,
So that I can make a confident assignment decision without guessing.

**Acceptance Criteria:**

**Given** an operations coordinator selects a request from the queue
**When** the request detail view loads
**Then** they can see the full intake details needed for fulfillment review
**And** the detail view includes issue classification, service location, current lifecycle state, and request history context

**Given** a request has already shown guidance or expectation-setting to the customer
**When** operations reviews the record
**Then** the coordinator can see what containment guidance, status, and expectations the customer has already received
**And** this context is presented clearly enough to avoid conflicting follow-up actions

**Given** a request may be in or out of scope
**When** the coordinator reviews serviceability information
**Then** they can understand the factors affecting dispatch readiness
**And** they can distinguish between serviceable, clarification-needed, and unavailable scenarios

### Story 3.4: Assign Requests to a Provider or Internal Fulfillment Owner

As an operations coordinator,
I want to assign each request to the right fulfillment owner,
So that active requests move into dispatch instead of stalling in review.

**Acceptance Criteria:**

**Given** a request is eligible for assignment
**When** the coordinator chooses a provider or internal fulfillment owner
**Then** the system records the assignment against the request
**And** the request can move into the next appropriate lifecycle state

**Given** an assignment is made
**When** the operation succeeds
**Then** the queue and request detail views reflect the assigned owner consistently
**And** the assignment is captured in request history for later ops and support visibility

**Given** a request is not ready for assignment
**When** the coordinator attempts to assign it in an invalid condition
**Then** the system prevents the invalid action
**And** the response guides the operator toward the correct next step

### Story 3.5: Manage Lifecycle Status Updates with Guardrails

As an operations coordinator,
I want to update request statuses through valid transitions only,
So that internal actions remain consistent with the customer-facing timeline.

**Acceptance Criteria:**

**Given** a request is in a known lifecycle state
**When** operations attempts to change its status
**Then** only valid next transitions are permitted according to the request state machine
**And** invalid transitions are rejected before they create inconsistent request history

**Given** a valid lifecycle transition occurs
**When** the new status is saved
**Then** the system updates the internal state, resolves the corresponding public status, and records the transition durably
**And** customer-facing progress remains aligned with operational truth

**Given** a lifecycle change impacts the customer experience
**When** the transition is completed
**Then** the customer-safe status view can reflect the change through the existing tracking model
**And** the transition remains auditable by internal teams

### Story 3.6: Flag Requests That Need Intervention or Clarification

As an operations coordinator,
I want to identify requests that are blocked, unclear, or at risk,
So that I can intervene before customer trust breaks down.

**Acceptance Criteria:**

**Given** a request cannot move cleanly through the standard dispatch path
**When** its state indicates missing details, delay risk, or operational blockage
**Then** the request is visibly identifiable as needing intervention or clarification
**And** the ops queue supports recognizing these requests quickly

**Given** a request needs clarification or escalation
**When** operations reviews the record
**Then** the coordinator can understand why the intervention is needed
**And** the request can be managed without losing lifecycle continuity or history

**Given** an at-risk request is updated by operations
**When** the intervention status changes
**Then** the internal and public lifecycle states remain consistent with the approved recovery behavior
**And** later support users can understand what happened from the stored record

### Story 3.7: Maintain Scope Rules and Supported Service Configuration

As an operations-ready platform,
I want supported issue types and coverage rules managed in a structured way,
So that intake and dispatch behavior stay aligned with the MVP operating model.

**Acceptance Criteria:**

**Given** the MVP supports only a constrained set of plumbing scenarios and service areas
**When** the system evaluates intake and dispatch behavior
**Then** supported issue types and service coverage rules come from structured configuration or managed reference data
**And** the same source can be used consistently across intake, ops review, and assignment decisions

**Given** scope or coverage definitions need adjustment
**When** the configuration is updated through the supported implementation path
**Then** future requests follow the revised rules without requiring a redesign of the request lifecycle
**And** unsupported categories are still prevented from entering the active fulfillment flow

**Given** operations relies on issue and coverage rules
**When** a request is reviewed for assignment
**Then** the platform can explain or expose the relevant scope decision context
**And** lifecycle control remains aligned with the configured MVP service model

## Epic 4: Equip Support for Trust Recovery and Request Intervention

Support staff can locate requests, understand full request history and customer-facing context, explain blockers or delays, and intervene when human follow-up is needed.

### Story 4.1: Enable Support Staff Authentication and Access

As a support staff member,
I want secure access to the support workspace,
So that only authorized users can view and assist customer requests.

**Acceptance Criteria:**

**Given** an internal user has a support role
**When** they authenticate through the support login flow with valid credentials
**Then** they can enter the support workspace successfully
**And** their access is limited to the permissions granted for support users

**Given** a user is unauthenticated or lacks the support role
**When** they attempt to access support routes or APIs
**Then** the system blocks access
**And** protected request data remains unavailable

**Given** support access exists alongside operations access
**When** authorization is enforced
**Then** role checks occur at the backend layer
**And** the permission model supports different capabilities for support and operations users

### Story 4.2: Let Support Search and Open Individual Requests

As a support agent,
I want to find a customer request quickly,
So that I can respond without wasting time or asking the customer to repeat everything.

**Acceptance Criteria:**

**Given** a support agent is authenticated in the support workspace
**When** they search for a request using available identifying information
**Then** they can retrieve matching individual requests efficiently
**And** they can open the correct request record for further review

**Given** multiple requests may exist in different lifecycle states
**When** search results are shown
**Then** the results provide enough summary context to distinguish the correct request
**And** the search experience remains useful for real support workflows

**Given** no request matches the search input
**When** the lookup completes
**Then** the system returns a clear no-results state
**And** no unrelated customer data is exposed

### Story 4.3: Show Support the Full Request Context

As a support agent,
I want to see request history, current status, prior customer guidance, and operational notes,
So that I can understand the situation before replying.

**Acceptance Criteria:**

**Given** a support agent opens a request
**When** the request detail view loads
**Then** the workspace shows the current public and internal status context, request history, and fulfillment details relevant to support
**And** the information is organized for fast situational understanding

**Given** the customer has already received guidance, expectation-setting, or recovery messaging
**When** support reviews the request
**Then** the agent can see what the customer has already been told
**And** the context is sufficient to avoid contradictory reassurance

**Given** support context depends on operations and lifecycle history
**When** the request detail is displayed
**Then** prior meaningful transitions and notes are visible in ordered form
**And** the data remains consistent with the single request source of truth

### Story 4.4: Explain Delays, Blocks, and Unavailable Outcomes Clearly

As a support agent,
I want the system to surface why a request is delayed, blocked, or unfulfilled,
So that I can give the customer a consistent and credible explanation.

**Acceptance Criteria:**

**Given** a request is in a delayed, clarification-needed, blocked, or unavailable state
**When** support opens the request
**Then** the workspace surfaces the reason or recovery context behind that state
**And** the explanation is understandable enough for support to translate into customer-facing reassurance

**Given** the request has a customer-visible recovery status
**When** support references the current situation
**Then** the support context aligns with the same public-status model used in the customer experience
**And** the agent can distinguish between different failure or delay scenarios

**Given** a request cannot be fulfilled as originally expected
**When** support responds to the customer
**Then** the platform provides the context needed to communicate the next best action
**And** support does not need to infer or invent explanations from incomplete system data

### Story 4.5: Support Manual Intervention and Follow-Up

As a support agent,
I want to record or trigger manual follow-up when a request needs human help,
So that recovery actions are visible and aligned with the request lifecycle.

**Acceptance Criteria:**

**Given** a request requires human follow-up or clarification outside the normal self-serve flow
**When** a support agent records an intervention
**Then** the action is saved against the request in a structured and auditable way
**And** later support or operations users can see that the intervention occurred

**Given** a support intervention affects the current request handling state
**When** the intervention is completed
**Then** the request lifecycle and related history remain consistent with the approved status model
**And** customer-facing progress is not contradicted by undocumented manual actions

**Given** a support agent adds follow-up context to a request
**When** the request is reviewed later by another internal user
**Then** the stored intervention detail helps preserve continuity across support and operations
**And** the request remains recoverable and auditable end to end

## Epic 5: Harden the Platform for Reliable MVP Operations

The team can run Handrix on a durable, secure, observable architecture that preserves lifecycle integrity now and supports future category and geography expansion later.

### Story 5.1: Establish Durable Persistence and Schema Management

As a product platform,
I want a PostgreSQL and Prisma-backed persistence layer with explicit lifecycle entities and migrations,
So that request, assignment, and history data remain durable and evolvable.

**Acceptance Criteria:**

**Given** the MVP requires durable request and lifecycle storage
**When** the persistence layer is implemented
**Then** PostgreSQL is used as the system of record for requests, assignments, status history, users, and related reference data
**And** the schema reflects the request-centric lifecycle model defined in the architecture

**Given** schema changes are needed during development
**When** the backend data model evolves
**Then** Prisma migrations are used to manage schema changes predictably
**And** the migration workflow supports repeatable setup across environments

**Given** request lifecycle data is persisted
**When** confirmed requests, assignments, or status transitions are stored
**Then** the records remain recoverable and auditable
**And** the persistence design does not require redefining the core lifecycle for future expansion

### Story 5.2: Add Request-Centric Observability and Health Monitoring

As an MVP operations team,
I want structured logs, correlation IDs, health checks, and error monitoring foundations,
So that we can detect issues and trace request failures before trust erodes.

**Acceptance Criteria:**

**Given** the backend handles customer and internal request workflows
**When** meaningful application events occur
**Then** the system emits structured logs that support operational debugging
**And** request processing can be traced with correlation or request identifiers

**Given** the MVP must be monitored in deployed environments
**When** the platform is running
**Then** health endpoints or equivalent readiness checks are available
**And** failures can be detected without relying solely on user reports

**Given** unexpected errors occur in customer or internal flows
**When** those errors are captured
**Then** the monitoring foundation preserves enough context to investigate lifecycle-impacting failures
**And** observability remains aligned with the request-centric architecture rather than generic undifferentiated logging

**Given** the MVP must later prove product and operational outcomes
**When** key lifecycle events occur across intake, confirmation, tracking, assignment, fulfillment, cancellation, support contact, and recovery states
**Then** the platform emits structured instrumentation events or metrics for those milestones
**And** the data foundation supports measurement of confirmation conversion, time-to-confirmation, fulfillment within promised windows, support-contact rate, and cancellation trends

### Story 5.3: Enforce Security, Rate Limiting, and Data Protection Baselines

As a product platform,
I want the MVP protected by baseline transport, access, and abuse controls,
So that customer and internal data remain secure without overengineering.

**Acceptance Criteria:**

**Given** the platform exposes public intake and tracking endpoints plus internal staff tooling
**When** security baselines are applied
**Then** data is protected in transit and internal access is role-restricted
**And** the implementation avoids collecting unnecessary sensitive customer data

**Given** the public request flow can be abused or overused
**When** rate-limiting protections are enabled
**Then** the system can reduce abuse risk on intake and polling endpoints
**And** legitimate customer behavior remains supported for the MVP use case

**Given** internal and external request data is stored or retrieved
**When** data protection controls are reviewed
**Then** access boundaries, storage practices, and auditability align with the security requirements in the PRD and architecture
**And** the security baseline leaves a clean path for future hardening if scale or risk increases

### Story 5.4: Validate Environment Configuration and Deployment Readiness

As a delivery team,
I want typed configuration, environment separation, and CI/CD quality gates,
So that Handrix can be deployed consistently across local, staging, and production environments.

**Acceptance Criteria:**

**Given** the frontend and backend run in multiple environments
**When** configuration is loaded at startup
**Then** environment variables are validated through typed configuration rules
**And** invalid configuration fails early instead of creating hidden runtime behavior

**Given** the MVP needs repeatable delivery workflows
**When** deployment readiness is established
**Then** the project supports distinct local, staging, and production configuration paths
**And** environment examples exist for both applications

**Given** code changes are prepared for integration or release
**When** the CI/CD baseline is executed
**Then** linting, tests, and migration or build checks can run as deployment gates
**And** the delivery flow supports separate frontend and backend deployment without breaking shared contracts

### Story 5.5: Protect Future Expansion Through Stable Contracts and Lifecycle Boundaries

As a product team,
I want the request lifecycle, API contracts, and shared schemas kept stable and explicit,
So that new categories, geographies, and richer customer features can be added without redefining the core system.

**Acceptance Criteria:**

**Given** the MVP uses shared request and status concepts across frontend and backend
**When** contracts are defined and consumed
**Then** the API shapes, shared schemas, and lifecycle boundaries are explicit and versionable
**And** frontend and backend do not drift into incompatible interpretations of request state

**Given** the backend is the source of truth for request APIs
**When** contract definitions are published for implementation use
**Then** OpenAPI documentation and the shared schema package describe the supported endpoints, payloads, and status models consistently
**And** the standard `{ data, meta? }` success envelope and `{ error: { ... } }` failure envelope are enforced rather than left implicit

**Given** future features may add categories, locations, or richer account capabilities
**When** the team extends the product later
**Then** the core request lifecycle can support those additions without a fundamental redesign
**And** public-status handling remains derived from the same backend source of truth

**Given** new work touches lifecycle rules or shared contracts
**When** those changes are introduced
**Then** they can be validated against the architecture consistency rules
**And** the platform retains a clear path for 10x MVP growth and post-MVP evolution

### Story 5.6: Instrument MVP Success Measurement

As a product team,
I want the MVP to capture the core funnel and operational signals defined in the PRD,
So that we can verify whether Handrix actually reduces uncertainty and fulfills requests credibly after launch.

**Acceptance Criteria:**

**Given** the PRD defines measurable MVP outcomes
**When** the implementation is prepared for launch
**Then** the product records the key events needed to measure flow start, issue selection, request confirmation, tracking revisits, fulfillment outcome, cancellation, and support contact
**And** event naming and payloads stay consistent with the shared contract and lifecycle model

**Given** the product promise depends on speed and credibility
**When** lifecycle timestamps are stored or emitted
**Then** the team can calculate median time from flow start to confirmation and fulfillment performance against promised response windows
**And** the measurement approach does not rely on manual reconstruction from raw logs alone

**Given** the PRD includes stress-reduction and trust-oriented outcomes
**When** the MVP measurement foundation is defined
**Then** there is an explicit implementation path for capturing post-service feedback or equivalent outcome signals tied to completed requests
**And** the resulting data is sufficient to evaluate whether the product reduced uncertainty without requiring a later analytics redesign
