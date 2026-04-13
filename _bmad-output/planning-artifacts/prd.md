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
inputDocuments:
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/brainstorming/brainstorming-session-2026-04-07-142531.md'
workflowType: 'prd'
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'general'
  complexity: 'low'
  projectContext: 'greenfield'
---

# Product Requirements Document - demo1

**Author:** Bogdansaipov
**Date:** 2026-04-07 14:25:31

## Executive Summary

Handrix is a greenfield web application focused on urgent minor home repair situations, with the MVP intentionally narrowed to small-plumbing issues such as leaking faucets, minor pipe leaks, and common toilet problems. The product is designed around a specific user state: a homeowner or tenant experiencing a stressful but common repair issue and needing immediate confidence, clear next steps, and fast access to trusted help.

The core problem Handrix solves is not simply "finding a handyman." The deeper problem is uncertainty during the first minutes of a home repair incident: users do not know what to do immediately, how serious the issue is, what it may cost, when help can arrive, or whether the provider can be trusted. Existing alternatives such as search, directories, and generic service marketplaces often increase cognitive load instead of reducing it.

Handrix addresses this with a guided confidence loop: issue selection, immediate containment guidance, expectation setting, one-tap confirmation, and visible dispatch progress. The intended result is that users move from panic and ambiguity to control and forward motion within minutes. For the MVP, product value should be judged by how quickly and credibly Handrix reduces uncertainty and gets a qualified provider moving, rather than by breadth of categories or marketplace depth.

### What Makes This Special

Handrix is differentiated by framing the service as an uncertainty-reduction product rather than a generic home-services marketplace. Users are not primarily buying listings, discovery, or AI novelty; they are buying reassurance, trust, speed, and clarity during a moment that feels urgent and disruptive.

The key insight is that the highest-value part of the experience happens before the technician arrives. If Handrix can help users stabilize the situation, understand what happens next, and feel confident that help is truly on the way, it creates a materially better experience than traditional search-and-call behavior or broad service platforms.

This makes the initial plumbing wedge strategically attractive. Minor plumbing emergencies are common, time-sensitive, emotionally charged, and more operationally standardizable than a broad handyman launch. By focusing the MVP on a narrow category with repeatable workflows and clearer expectation-setting, Handrix increases its chance of delivering a believable and trust-building first experience within a 3-4 month build window.

## Project Classification

Handrix is classified as a web application in the general software domain with a greenfield project context. Domain complexity is low in the BMAD classification framework because the concept does not currently depend on regulated-industry compliance or unusually specialized technical constraints. However, product and operational execution still carry meaningful complexity around provider trust, dispatch responsiveness, pricing clarity, and service consistency.

## Success Criteria

### User Success

Users should be able to identify their issue, receive immediate containment guidance, understand what happens next, and request help with minimal friction during a stressful moment. The core success moment is not just booking a provider; it is the moment the user feels the situation is under control because they know what to do now, what to expect, and that help is actively progressing.

For the MVP, user success should mean:
- Users can complete the request flow in a few minutes without needing to call support.
- Users feel reassured and informed before technician arrival.
- Users can track dispatch progress clearly enough that they do not need to seek updates elsewhere.
- Users receive a service experience that feels more certain and less chaotic than search, calling local providers, or using a generic marketplace.

### Business Success

The MVP should prove that a narrow urgent-plumbing wedge can generate repeatable demand and an operationally believable fulfillment model. Early business success is not broad category expansion; it is evidence that Handrix can create trust, conversion, and service completion in one focused category.

Initial business success should mean:
- The small-plumbing use case generates meaningful booking conversion from submitted issue flows.
- A significant share of booked jobs are successfully fulfilled within the promised service window.
- Users report enough trust and clarity that referral and repeat-intent signals emerge.
- The operating model shows that a focused city or service area could be expanded without collapsing quality or response times.

### Technical Success

The product must be technically reliable enough to support urgent-use behavior. In this context, technical success is less about advanced architecture and more about trust-preserving execution. Slow flows, broken status updates, or unclear confirmation states directly damage the value proposition.

For the MVP, technical success should mean:
- The guided request flow is fast, mobile-friendly, and dependable.
- Dispatch/progress states are clear and update consistently.
- The core booking path works without critical drop-offs caused by UX or system reliability issues.
- Internal operations can manage requests, statuses, and provider assignment without excessive manual confusion.

### Measurable Outcomes

Suggested MVP measurable outcomes:
- A majority of users who start the guided flow complete issue selection and reach confirmation.
- Median time from flow start to confirmed request stays under 3 minutes.
- A high percentage of fulfilled requests occur within the promised response window.
- Post-service feedback shows users strongly agree that Handrix reduced stress and uncertainty.
- Support contact rate during the pre-dispatch period remains low enough to indicate the flow is self-explanatory.
- Cancellation rate after confirmation stays low enough to show expectation-setting is credible.

## Product Scope

### MVP - Minimum Viable Product

The MVP should include:
- Narrow issue intake for small plumbing problems only.
- Immediate containment/stabilization guidance by issue type.
- Clear expectation setting around response window and service process.
- One-tap request confirmation.
- Visible dispatch/progress tracking for the user.
- Internal workflow for provider assignment and status management.
- Basic pricing clarity or pricing expectation framework that avoids surprise.

### Growth Features (Post-MVP)

Post-MVP growth could include:
- Additional repair categories beyond small plumbing.
- Richer provider profiles, reviews, and trust indicators.
- Smarter triage, photo upload, and issue qualification.
- Dynamic pricing sophistication.
- Customer accounts, saved addresses, and repeat booking optimizations.
- Broader service-area expansion and marketplace tooling.

### Vision (Future)

The longer-term vision could evolve into:
- A trusted rapid-response home repair platform across multiple urgent service categories.
- A proactive home-maintenance confidence product, not just an incident-response tool.
- A system that becomes the default first stop when something goes wrong at home because it combines guidance, dispatch, trust, and predictable outcomes better than search or generic marketplaces.

## User Journeys

### Journey 1: Primary User - Success Path

Nodira is a renter who notices water pooling under her kitchen sink late in the afternoon. She is not sure whether the leak is serious, whether she should shut something off immediately, or whether calling around will waste the next hour. Her main goal is simple: stop the situation from getting worse and get reliable help fast without having to become an expert in plumbing.

She opens Handrix and is met with a narrow issue-selection flow that feels designed for her exact situation rather than a generic service marketplace. She selects a small-plumbing issue, answers a few clarifying prompts, and receives immediate containment guidance that helps her reduce stress and take one or two sensible actions. At this point, the product has already created value because it replaced panic with a sense of control.

As she continues, Handrix sets expectations clearly: what kind of issue this seems to be, what kind of response window to expect, and what the next step is. Nodira confirms the request in one tap and begins watching visible dispatch progress. The emotional climax is not just the booking itself; it is the moment she believes the situation is being handled and she no longer needs to search, compare, or chase updates.

The resolution is a completed service request that feels calm, understandable, and trustworthy from start to finish. This journey reveals requirements for issue triage, containment guidance, expectation setting, one-tap confirmation, status tracking, and trust-building UX.

### Journey 2: Primary User - Edge Case / Expectation Recovery

Jasur discovers that his toilet is overflowing in the evening and needs help urgently. He starts the Handrix flow, but his situation is slightly outside the clean happy path: the issue may be serviceable, but immediate dispatch is limited or the request needs additional clarification before assignment.

He still expects fast certainty, so the risk here is not only operational delay but loss of trust. If Handrix simply stalls or produces vague messaging, the product fails at its core promise. Instead, the system asks one or two additional clarifying questions, gives immediate containment instructions, and transparently explains the current status and expected next step.

The critical moment in this journey is recovery from uncertainty. Jasur may not get an instant technician assignment, but he should still feel that the system is honest, useful, and actively helping him move forward. If necessary, Handrix presents fallback messaging such as revised response expectations or next-best actions while preserving confidence.

The resolution is that even when the perfect path is unavailable, the user remains informed, supported, and less likely to abandon the experience in frustration. This journey reveals requirements for error handling, transparent fallback states, serviceability checks, revised expectation messaging, and trust-preserving recovery UX.

### Journey 3: Operations User - Dispatch Coordinator

Malika is the internal operations coordinator responsible for making sure incoming requests are assigned quickly and do not disappear into ambiguity. Her job is not glamorous, but for the MVP she is central to whether the promise of Handrix is real. If the user sees progress but the operations side is disorganized, trust breaks immediately.

Her day begins with a queue of incoming small-plumbing requests. She needs to see new requests clearly, understand issue type and urgency, know what the customer has already been told, and assign the right provider without bouncing between disconnected tools. She also needs to update statuses in a way that keeps the customer-facing timeline credible and accurate.

The climax in Malika's journey is the dispatch decision: matching a request to an available provider quickly enough to preserve the promised response window. If assignment is delayed, she needs the ability to update status and adjust expectations without creating conflicting information for the customer.

The resolution is an operational flow that is simple enough for a lean MVP team to run consistently. This journey reveals requirements for an internal ops dashboard, request queue visibility, assignment workflow, status management, and coordination between internal updates and customer-facing progress.

### Journey 4: Support / Trust Recovery User

Aziza works in customer support and steps in when a user is confused, anxious, or uncertain whether their request is actually progressing. She represents the recovery layer when the self-serve flow is not enough or when the user needs reassurance from a human.

She receives a message from a customer asking whether anyone is really coming and what they should do while waiting. To be effective, Aziza needs a single view of the request history, issue type, containment guidance already shown, current dispatch state, and latest operational notes. Without that context, support becomes repetitive and inconsistent, which increases rather than reduces uncertainty.

The key moment in this journey is fast situational understanding. Support should be able to answer with confidence, reinforce the next step, and avoid contradicting what the product already communicated. The best support experience feels like a continuation of the same confidence loop, not a separate and confusing channel.

The resolution is that the customer leaves the interaction reassured rather than escalated. This journey reveals requirements for support visibility into request state, interaction history, consistent messaging, and a lightweight intervention path when the automated flow needs human backup.

### Journey Requirements Summary

These journeys point to a focused but complete MVP capability set:
- Customer-side issue selection and guided triage for a narrow plumbing scope.
- Immediate containment guidance that creates value before dispatch.
- Clear expectation-setting and trust-building messaging throughout the flow.
- One-tap confirmation and visible status progression after request submission.
- Internal operations tooling for request intake, assignment, and status updates.
- Recovery paths for unserviceable, delayed, or ambiguous requests.
- Support visibility so human interventions reinforce rather than break the confidence loop.

## Web App Specific Requirements

### Project-Type Overview

Handrix should be implemented as a single-page application using React to support a smooth, app-like request flow optimized for urgent-use behavior. The frontend experience should minimize reloads, preserve context between steps, and keep the user focused on the confidence loop from issue selection through dispatch tracking.

The MVP web application should be mobile-first, with modern mobile browsers as the primary target environment and desktop browser support as a secondary priority. This reflects the likely real-world usage pattern in which users open the product on their phone while dealing with a live home repair issue.

### Technical Architecture Considerations

The frontend should communicate with backend APIs implemented in NestJS, which will handle issue intake, request creation, dispatch logic, status updates, and internal operational workflows. This creates a clean separation between the customer-facing guided experience and the service orchestration logic needed to fulfill requests reliably.

Real-time behavior is required for dispatch and status visibility, but the MVP does not need a complex live architecture on day one. Initial implementation can use polling for status updates, with the option to evolve later to push-based mechanisms if operational scale or UX needs justify it.

Performance and state continuity are especially important because the product is used in stressful, time-sensitive contexts. The request flow should feel fast and stable on mobile networks, preserve user progress across steps, and avoid unnecessary latency or jarring transitions that increase anxiety.

### Browser Support

The MVP should explicitly support current versions of major modern mobile browsers, with desktop support for common modern browsers as a secondary requirement. Legacy browser compatibility is not required for the initial release.

### Responsive Design

The interface should be designed mobile-first, with layouts, controls, and content hierarchy optimized for one-handed use and quick comprehension on small screens. Desktop layouts should preserve the same flow clarity without introducing extra complexity or divergent interaction patterns.

### Performance Targets

The core request flow should load quickly, remain responsive on average mobile connections, and avoid interruptions that could cause abandonment during urgent-use scenarios. Status refresh behavior should provide timely updates without making the experience feel stalled or overly technical.

### SEO Strategy

Search engine optimization is a low priority for the MVP request flow because the initial product value is in the guided service experience rather than discoverable content pages. SEO should be considered later for marketing, landing, and location/category pages once go-to-market expansion becomes relevant.

### Accessibility Level

Accessibility is important for the MVP core flow because users may be stressed, distracted, or operating the product in physically inconvenient conditions. The product should prioritize clear language, strong visual hierarchy, touch-friendly controls, readable contrast, and predictable interaction patterns throughout the request and status-tracking experience.

### Implementation Considerations

Implementation should prioritize the integrity of the core confidence loop over secondary embellishments. The React SPA and NestJS API stack should first support issue triage, containment guidance, one-tap confirmation, request state management, dispatch visibility, and internal operator coordination. Additional marketing, SEO, or richer account features should not compromise the speed and clarity of the core urgent-use flow.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience-first, problem-solving MVP. The goal is to prove that Handrix can reduce uncertainty during urgent minor plumbing incidents better than search or generic service marketplaces.

**Resource Requirements:** A small cross-functional team is likely enough for the MVP if the category and geography stay narrow: 1 product/design lead, 2-3 full-stack engineers across React and NestJS, and operational support for provider coordination and customer handling. The main constraint is not feature count alone; it is operational credibility.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Primary user success path for urgent small-plumbing intake through dispatch tracking.
- Primary user recovery path when serviceability or timing is uncertain.
- Internal operations journey for request assignment and status management.
- Lightweight support journey for reassurance and trust recovery.

**Must-Have Capabilities:**
- Narrow issue intake limited to small-plumbing cases.
- Guided triage and immediate containment instructions.
- Clear expectation setting on service flow and likely response timing.
- One-tap request confirmation.
- Request creation and status management via NestJS APIs.
- Customer-facing dispatch/progress tracking using polling-based updates.
- Internal operations dashboard for queue visibility, assignment, and status changes.
- Support visibility into request history and current state.
- Mobile-first React SPA optimized for speed, clarity, and accessibility.

### Post-MVP Features

**Phase 2 (Post-MVP):**
- Photo upload and richer issue qualification.
- Expanded provider trust signals such as reviews, credentials, and richer profiles.
- Customer accounts, saved addresses, and repeat booking optimization.
- Better pricing sophistication and improved serviceability logic.
- Broader support tooling and more automated dispatch workflows.

**Phase 3 (Expansion):**
- Expansion into additional urgent repair categories beyond plumbing.
- New geographies and broader supply-side operations.
- Push-based real-time updates if justified by scale.
- Marketing/SEO page system for category and location growth.
- More complete marketplace or home-maintenance platform capabilities.

### Risk Mitigation Strategy

**Technical Risks:** The biggest technical risk is overbuilding real-time systems, category breadth, or complex orchestration too early. Mitigation: keep the frontend flow narrow, use polling first, and constrain the backend to the minimum viable request-state model.

**Market Risks:** The biggest market risk is that users may not trust the service enough to choose it during a real repair event. Mitigation: focus the MVP on reassurance, expectation clarity, visible progress, and a narrow category where fulfillment quality can be controlled.

**Resource Risks:** The biggest resource risk is trying to launch with too many features, categories, or operator workflows for a small team. Mitigation: keep the launch to one repair wedge, one main geography, and one lean ops model with selective manual handling behind the scenes where needed.

## Functional Requirements

### Customer Issue Intake & Guidance

- FR1: Customers can start a service request without creating an account first.
- FR2: Customers can select from a constrained set of supported small-plumbing issue types.
- FR3: Customers can answer issue-specific follow-up questions to clarify their problem.
- FR4: Customers can provide service location details needed to evaluate and fulfill a request.
- FR5: Customers can receive immediate containment or stabilization guidance relevant to their selected issue.
- FR6: Customers can review a summary of their issue and request details before confirming submission.
- FR7: Customers can submit a request for service once required information is complete.
- FR8: Customers can see when their issue is outside current service scope or cannot be fulfilled as requested.
- FR9: Customers can receive fallback guidance or next-step instructions when immediate fulfillment is not available.

### Expectation Setting & Customer Confidence

- FR10: Customers can see what happens next after submitting a request.
- FR11: Customers can view a clear service status for their request throughout its lifecycle.
- FR12: Customers can view estimated response expectations associated with their request.
- FR13: Customers can view pricing information or pricing expectations before committing to service.
- FR14: Customers can receive trust-building information that helps them feel confident using the service.
- FR15: Customers can see confirmation that their request has been successfully received and is being processed.
- FR16: Customers can understand when a request is delayed, pending clarification, or unavailable.

### Dispatch & Request Lifecycle Management

- FR17: The system can create and store a service request with all required customer-provided details.
- FR18: The system can classify requests by issue type, status, and fulfillment state.
- FR19: The system can update request status as the request moves through intake, review, assignment, dispatch, and completion.
- FR20: The system can maintain a customer-visible lifecycle for each request.
- FR21: The system can support manual or semi-manual dispatch decisions during the MVP.
- FR22: The system can associate a request with an assigned provider or internal fulfillment owner.
- FR23: The system can record when a request cannot be fulfilled and communicate that state appropriately.
- FR24: The system can preserve a history of request-state changes for operational visibility and support.

### Operations & Internal Coordination

- FR25: Operations staff can view a queue of incoming service requests.
- FR26: Operations staff can review request details needed to decide assignment and fulfillment.
- FR27: Operations staff can assign requests to available providers or internal handlers.
- FR28: Operations staff can update request status as fulfillment progresses.
- FR29: Operations staff can identify requests requiring intervention, clarification, or escalation.
- FR30: Operations staff can view what guidance and expectations have already been shown to the customer.
- FR31: Operations staff can manage requests in a way that keeps internal actions aligned with customer-facing status updates.

### Support & Trust Recovery

- FR32: Support staff can search for and access an individual customer request.
- FR33: Support staff can view request history, current status, and prior customer-facing guidance.
- FR34: Support staff can identify why a request is delayed, blocked, or unfulfilled.
- FR35: Support staff can provide consistent reassurance and next-step information based on the current request state.
- FR36: Support staff can intervene in requests that require manual follow-up or clarification.

### Scope, Serviceability & Platform Administration

- FR37: The system can enforce MVP scope by limiting requests to supported issue categories.
- FR38: The system can determine whether a request is serviceable within the current operating area or fulfillment model.
- FR39: The system can support management of supported issue types and service coverage rules.
- FR40: The system can support internal control over request states, operational workflows, and fulfillment visibility needed to run the MVP.
- FR41: The system can support expansion to additional categories, geographies, and richer customer features without redefining the core request lifecycle.

## Non-Functional Requirements

### Performance

- The core customer request flow should allow a user to move from issue selection to request confirmation in a responsive, low-friction experience on modern mobile browsers.
- Standard user-facing actions in the core flow should complete within 2 seconds under normal operating conditions, excluding external network limitations.
- Customer-visible request status refreshes should occur frequently enough that the dispatch experience feels actively progressing rather than stalled.
- Internal operations screens should surface active request information quickly enough to support timely assignment and intervention.

### Reliability

- The system should preserve request state consistently throughout intake, confirmation, dispatch tracking, and internal status management.
- No confirmed customer request should be lost, duplicated, or left without a recoverable operational record.
- Customer-facing status information and internal operational status should remain aligned closely enough to avoid contradictory communication.
- If part of the flow fails or becomes temporarily unavailable, the system should present a recoverable state or fallback guidance rather than leaving the user in ambiguity.

### Security

- All customer and operational data should be encrypted in transit.
- Stored request and user data should be protected with appropriate access controls and encryption at rest where applicable.
- Operational and support access should be restricted according to role and business need.
- The system should maintain an auditable record of meaningful request-state changes and internal actions relevant to fulfillment and support.
- The MVP should avoid collecting sensitive data that is not necessary to fulfill the service request.

### Accessibility

- The core request flow should meet WCAG 2.1 AA standards for the customer-facing experience.
- The interface should support readable contrast, clear focus states, keyboard accessibility for essential interactions, and understandable form labeling.
- Content should be written in clear, low-cognitive-load language suitable for stressed users making quick decisions.
- Touch targets and layout behavior should support reliable use on mobile devices in distracting or physically inconvenient situations.

### Scalability

- The MVP architecture should support growth beyond the initial launch geography and service volume without requiring a full redesign of the request lifecycle.
- The system should support at least a 10x increase from initial MVP request volume with incremental operational and infrastructure scaling.
- Polling-based status updates should remain manageable at MVP scale, with a clear path to more efficient real-time mechanisms if usage grows materially.
