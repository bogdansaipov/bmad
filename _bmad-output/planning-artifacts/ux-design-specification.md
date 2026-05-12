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
  - 9
  - 10
  - 11
  - 12
  - 13
  - 14
inputDocuments:
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/brainstorming/brainstorming-session-2026-04-07-142531.md'
  - '/home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-11-124054.md'
workflowType: 'ux-design'
projectName: 'Handrix'
lastUpdated: '2026-05-12'
---

# UX Design Specification Handrix

**Author:** Bogdansaipov  
**Date:** 2026-05-12 +05

---

## Initialization Context

This UX design workflow is regenerated using the rewritten PRD and the approved sprint change proposal as the source of truth.

Additional stakeholder context provided during regeneration:

- Handrix is now a two-sided marketplace, not a guided plumbing coordination flow.
- The UX should feel closer to Uber or Glovo execution than to a directory marketplace.
- Customer experience should be dashboard-first after authentication.
- Handyman experience should be jobs-first, live, and operationally lightweight.
- Live tracking map, job cards, and bottom-sheet interactions are primary interaction patterns.
- The MVP must stay lean:
  - no chat
  - no ops workspace
  - no support workspace
  - simple pricing
  - fast request creation
  - lightweight post-completion rating only
- The product should preserve:
  - mobile-first interaction design
  - low cognitive load
  - simple status communication
  - fast action flows

Attached references suggest:

- soft warm-light customer surfaces
- strong dark-mode handyman surfaces
- map-led tracking views
- bottom sheets for active task control
- card-based request and job management

## Executive Summary

### Project Vision

Handrix should feel like an on-demand home-services app that makes action immediate and understandable. The customer should move from login to request creation to active tracking with minimal friction. The handyman should move from login to available jobs to active fulfillment with minimal overhead.

The revised UX is no longer about calming users through a guided emergency wizard. It is about creating fast marketplace confidence through clear job creation, fast matching, first-accept assignment, visible movement on a map, and simple status progression.

### Target Users

The primary user groups are:

- customers who want a fast way to request home repair help and track service progress
- handymen who want to receive relevant work, accept quickly, and execute jobs efficiently from mobile

Customers are likely to be time-sensitive, impatient with long forms, and reassured by immediate system feedback. Handymen are likely to be task-oriented, mobile-first, and intolerant of clutter, friction, or ambiguous job states.

### Key Design Challenges

The first challenge is making the marketplace feel fast before assignment. A `pending` request can easily feel like a failure if the system does not clearly communicate that matching is active.

The second challenge is keeping map and status experiences clear instead of overwhelming. Real-time tracking can become noisy if the interface competes with itself.

The third challenge is giving customers and handymen product surfaces that feel tailored to their jobs without turning the MVP into two bloated apps.

### Design Opportunities

Handrix can feel differentiated if it treats home repair like a modern dispatch product rather than a long-form booking site:

- customer dashboard as the default home
- a fast create-request sequence with map confirmation and estimate clarity
- a live tracking screen where map and job state are the emotional center
- a handyman jobs dashboard that prioritizes matching, acceptance, and active-job control
- a lightweight completion-to-rating handoff that closes the loop without becoming a review workflow

## Core User Experience

### Defining Experience

The defining Handrix experience is fast service coordination through a simple marketplace loop:

1. sign in
2. create or receive a job
3. confirm assignment
4. track movement and status
5. complete the job

The most important customer moment is not request submission by itself. It is the shift from `pending` to `assigned`, when the product proves that a real handyman is on the job and the map becomes meaningful.

The most important handyman moment is not viewing a dashboard. It is receiving a relevant job, deciding quickly, and entering an active-job mode that supports execution with very little UI friction.

### Platform Strategy

Handrix should remain a mobile-first React SPA, but its interaction model should now resemble an operational app rather than a wizard flow. That means:

- short paths to primary actions
- dashboard-led entry points
- bottom-sheet driven task details on mobile
- persistent status visibility
- map-first tracking when a job becomes active

Desktop layouts should expand the same system rather than inventing separate flows.

### Effortless Interactions

Customers should create a request in 4 short stages:

1. category and title
2. description and image
3. location confirmation on map
4. estimate and submit

Handymen should be able to:

- preview job essentials quickly
- accept or decline in one dominant action area
- switch into active-job mode immediately after acceptance
- update status from a persistent action rail or bottom sheet

### Critical Success Moments

The most important customer UX moments are:

- first-load dashboard clarity
- fast request creation with obvious progress
- understandable `pending` state
- strong assigned-state handoff
- live tracking with no confusion about what happens next
- a lightweight post-completion rating prompt that feels optional, fast, and satisfying

The most important handyman UX moments are:

- seeing only relevant jobs
- trusting the preview enough to accept quickly
- entering a focused active-job mode with map, route, and status controls

## Desired Emotional Response

### Customer Emotional Goals

Customers should feel:

- fast orientation after login
- confidence during request creation
- reassurance during `pending`
- control and visibility after `assigned`

The tone should be calm but not passive. This is not a guided-care product anymore; it is a fast-response product.

### Handyman Emotional Goals

Handymen should feel:

- efficient
- informed
- in control
- not micromanaged

The handyman experience should feel more like a compact work console than a consumer marketplace.

### Emotional Design Principles

- Replace uncertainty with status clarity.
- Let the map carry meaning, not decoration.
- Give each screen one dominant job.
- Reduce reading load by making cards and labels scan well.
- Use motion to confirm progress, not to entertain.

## UX Pattern Analysis & Inspiration

### Primary Pattern Direction

The strongest product references are Uber and Glovo-style operational interfaces:

- dashboard-first home
- live task tracking
- bottom sheets over maps
- strong current-state emphasis
- large decisive actions

Handrix should not behave like a directory or marketplace browsing app with heavy comparison patterns.

### Reference Translation for Handrix

From the customer references:

- retain warm light surfaces for trust and readability
- use cards with soft elevation and restrained accents
- keep create-request flow compact and obviously sequenced
- use history and dashboard layouts that make status scanning immediate

From the handyman references:

- use dark, high-contrast work surfaces
- emphasize availability, next match, active job, and earnings context
- make job preview and active work states feel dense but not cramped

### Anti-Patterns to Avoid

- directory-style provider browsing
- multi-step guidance detours that slow request submission
- support-oriented fallback UX in MVP
- over-detailed pricing explanation screens
- cluttered maps with too many overlays
- navigation systems with too many tabs for the lean MVP

## Design System Foundation

### Overall Design Direction

Handrix should use a split-surface design language:

- **Customer Mode:** warm neutral backgrounds, deep navy actions, soft cards, restrained accent orange for highlights
- **Handyman Mode:** dark navy or charcoal surfaces, teal-green action accents, strong contrast, utilitarian cards

This split makes the two roles feel meaningfully different while preserving one brand system.

### Typography

The typography should feel modern, large, and fast-scanning.

- headings: bold, compact, high-contrast sans-serif
- labels: compact uppercase or small caps when used as meta-text
- body: readable and neutral, never overly small on mobile

### Color Strategy

Customer palette:

- warm ivory or bone background
- deep ink or navy text
- muted slate-blue primary action
- restrained orange for emphasis
- green only for positive status

Handyman palette:

- deep charcoal or navy background
- white or near-white text
- teal-green for active action and online states
- muted blue-gray for data cards
- warm amber for cautionary signals

### Motion

Use motion sparingly but meaningfully:

- map pin transition on assignment
- bottom-sheet rise for job details
- status pill transitions
- job card entrance for newly matched work

Avoid ornamental motion.

## Visual Foundation

### Customer Visual Language

Customer screens should feel open, calm, and lightly premium. The request dashboard and create-request flow should use:

- wide spacing
- large headings
- clear section breaks
- card clusters for history and active requests
- rounded panels with low visual noise

### Handyman Visual Language

Handyman screens should feel tighter and more operational. The product should support:

- high-signal summaries near the top
- job match panels that feel urgent and actionable
- settings/preferences presented as compact chips and rows
- a clear separation between available jobs, active job, and job history

## Design Directions

### Direction 1: Customer Warm Dispatch

This direction governs customer-facing screens:

- warm neutral canvas
- strong dark type
- soft card borders
- clear status pills
- large bottom CTA bars

It should preserve calm without feeling passive or clinical.

### Direction 2: Handyman Night Ops

This direction governs handyman-facing screens:

- dark dashboards
- glowing action accents
- compact analytics and preference surfaces
- strong task focus

It should feel like a professional live-ops surface, not a lifestyle dashboard.

### Direction 3: Map as Product Surface

The map is not background decoration. Once a request is assigned, it becomes the main stage. The system should:

- keep the map visible for active jobs
- layer essential information in bottom sheets and chips
- avoid heavy chrome around the map
- emphasize the distance and movement relationship between handyman and job location

## User Journeys

### Journey 1: Customer Dashboard-First Entry

After login, the customer lands on a dashboard that shows:

- active requests first
- recent history below
- one strong `New request` CTA

If there is an active assigned or in-progress request, that card should dominate the screen visually and open directly into the tracking view.

### Journey 2: Customer Create-Request Flow

The create-request flow should be fast, visual, and progressive:

1. pick category
2. add title and short description
3. attach image
4. confirm location on map
5. review estimate and submit

This should feel more like a ride-request flow than a service application. Each step should have one main question and one main action.

### Journey 3: Customer Pending State

After request creation, if no handyman has accepted yet, the customer enters a `pending` state. This should not feel like a dead end.

The pending screen should communicate:

- matching is active
- what category/location was submitted
- current estimate remains attached to the request
- the user does not need to re-enter data
- the next state is assignment or rejection

### Journey 4: Customer Assigned Tracking

Once a handyman accepts, the experience transitions into a live tracking screen:

- map fills most of the viewport
- bottom sheet shows handyman name, status, estimate, and job details
- two-pin model: customer/job location and handyman location
- current status remains visible at all times

This screen should feel closest to Uber-style ride tracking, adapted for home service.

### Journey 5: Customer Post-Completion Rating

After the handyman marks the request `complete`, the customer should receive a lightweight rating prompt tied to that completed request.

The rating interaction should be:

- simple 1-5 star selection
- optional short feedback
- usable from mobile in a few seconds
- clearly optional
- available only once per completed request

This should feel like a quick closure moment, not a long-form review flow. The ideal pattern is a compact modal or bottom sheet that appears after completion and can also be reopened from the completed request card if the customer dismisses it initially.

### Journey 6: Handyman Dashboard

After login, the handyman lands on a jobs dashboard with:

- online/offline status
- current shift or availability summary
- job preferences and categories
- current or next match module
- recent jobs or earnings context

The MVP should keep this focused. Rich analytics are secondary to getting the handyman to jobs quickly.

### Journey 7: Handyman Available Job Preview

When a job matches, the handyman should see a clear preview containing:

- category
- distance
- rough area
- estimate
- short description
- accept/decline actions

The preview should be usable as either:

- a list card in the jobs feed
- a priority panel
- a mobile bottom sheet over a map

### Journey 8: Handyman Active Job Flow

After acceptance, the handyman enters active-job mode:

- map is visible
- customer/job location is clear
- current status is clear
- next action is large and obvious

Status progression should never require deep navigation. Controls should sit in a persistent bottom sheet or fixed action area.

## Information Architecture

### Customer Navigation

The customer MVP should use a lean navigation model:

- `Home`
- `New request`
- `History`
- `Profile` or compact account menu

`Track request` should usually be entered from active request cards rather than as a permanent heavy nav item.
Rating should usually be entered from the completion prompt or the completed request detail, not from a dedicated navigation destination.

### Handyman Navigation

The handyman MVP should use:

- `Dashboard`
- `Jobs`
- `Earnings` or `History`
- `Settings`

If this feels too heavy on mobile, `Earnings` can be reduced in priority and surfaced as a secondary screen rather than a main tab.

## Component Strategy

### Customer Components

Core customer components:

- request summary card
- active request hero card
- category selection tile
- image upload tile
- map location confirmation panel
- estimate breakdown card
- request history row
- status pill set
- tracking bottom sheet
- rating prompt sheet or modal
- star rating input
- compact feedback field

### Handyman Components

Core handyman components:

- online/offline toggle
- match preview card
- active job summary card
- preference chip group
- service radius control row
- earnings summary card
- job history row
- active-job status action rail

### Shared Components

Shared components:

- map shell
- bottom sheet
- status chip
- section header
- primary CTA
- empty-state module
- loading skeletons for lists and tracking transitions

## UX Patterns

### Bottom-Sheet Behavior

Bottom sheets should be a first-class interaction pattern in both roles.

Customer tracking bottom sheet should hold:

- current status
- handyman identity
- estimate summary
- request details
- next action if needed

Customer completion sheet should support:

- completion confirmation
- 1-5 star input
- optional short feedback
- dismiss or submit action

This sheet should open lightly and avoid pushing the user into a long review task.

Handyman active-job bottom sheet should hold:

- customer/job summary
- next required status update
- address and route context
- short issue summary

Bottom sheets should support:

- collapsed glance state
- half-open action state
- full detail state

### Card Patterns

Cards should be glanceable and strongly hierarchical.

Customer request cards should prioritize:

- issue title
- status
- assigned handyman or pending state
- estimate or final price
- open action
- unrated-complete state when a rating is still available

Handyman job cards should prioritize:

- category
- distance
- area
- estimate
- urgency or freshness
- accept/decline

### Map Interaction Patterns

Map interaction should differ by context:

- **Create-request:** pin adjustment and location confirmation
- **Tracking:** movement visibility, no complex editing
- **Active handyman job:** route/context visibility and location sharing confidence

The user should never have to fight the map. Key actions belong outside the map layer.

## Responsive and Accessibility Strategy

### Mobile-First Layout

Mobile is the primary environment. The core screens should rely on:

- large touch targets
- vertically stacked cards
- sticky bottom CTA zones
- bottom sheets instead of heavy side panels
- simplified top navigation

### Desktop Adaptation

Desktop can expand into split-pane layouts:

- customer tracking with larger map + side detail panel
- handyman dashboard with summary grids and side modules

Desktop should feel richer, but not functionally different.

### Accessibility

The revised UX must maintain:

- strong contrast in both light and dark modes
- no color-only status meaning
- readable status labels
- keyboard support for key flows
- clear focus states
- map alternatives through textual state summaries

## Pricing UX Strategy

Pricing should remain simple and credible.

The estimate module should communicate:

- estimated total
- what is included in the estimate
- that final charges may vary if parts or job conditions change

This explanation should stay compact. The product should avoid turning estimate review into a pricing education screen.

## Rating UX Strategy

Rating should be treated as lightweight completion feedback, not as a public review system.

The rating interaction should communicate:

- who completed the job
- simple star-based satisfaction input
- optional short feedback
- that the step is fast and optional

The UI should avoid:

- large text areas
- multi-question surveys
- public-facing social framing
- moderation or dispute language

## Pending and Rejected State Strategy

### Pending

`Pending` should mean:

- the request is valid
- matching is still in progress
- no handyman has accepted yet

The UI should make this feel active, not broken. Use live wording such as:

- matching nearby pros
- waiting for first acceptance
- request sent to eligible handymen

### Rejected

`Rejected` should mean:

- the request was not accepted through the current marketplace flow

The UI should keep the message short and direct. Do not introduce support-heavy recovery UI in MVP. The main next action can be:

- create a new request later
- adjust details and resubmit

## MVP Boundaries

The UX should explicitly exclude:

- in-app chat
- ops workspace
- support workspace
- manual dispatch-first flows
- heavy provider comparison
- complex pricing explanation
- long-form reviews
- public review feeds
- moderation and dispute UX for ratings

## UX Design Requirements

- UX-DR1: The customer experience must begin from an authenticated dashboard, not an anonymous intake flow.
- UX-DR2: The handyman experience must prioritize job receipt, acceptance, and active-job control over profile browsing or administrative depth.
- UX-DR3: The create-request flow must be completable in a small number of focused steps with one dominant action per screen.
- UX-DR4: Location confirmation must use browser geolocation when available and allow map-based manual adjustment before submission.
- UX-DR5: The request tracking screen must make the map and current status the primary visual focus after assignment.
- UX-DR6: Bottom sheets must be the primary pattern for layered job details and action controls on mobile tracking screens.
- UX-DR7: Customer request cards must surface active state, estimate or final amount, and assigned handyman context without opening the full request.
- UX-DR8: Handyman job cards must surface category, distance, estimate, and accept or decline controls in a fast-scanning format.
- UX-DR9: Pending and rejected states must be explicit, understandable, and free from legacy support-workspace assumptions.
- UX-DR10: Customer and handyman surfaces must share one brand system while maintaining clearly different visual modes.
- UX-DR11: WebSocket-driven updates must feel immediate on active-job screens without causing full-screen refresh patterns.
- UX-DR12: Pricing presentation must stay simple, compact, and estimate-based.
- UX-DR13: Post-completion rating must use a lightweight 1-5 star interaction with optional short feedback and must not feel like a long review form.
- UX-DR14: Each completed request should expose rating at most once through the customer experience and should indicate when rating has already been submitted.
- UX-DR15: The UX must preserve low cognitive load and fast action flows across both user roles.

## Final Recommendation

Handrix UX should be rebuilt around a compact marketplace operating model:

- dashboard first
- request creation fast
- assignment meaningful
- map central after assignment
- handyman work surfaces operational and dark
- customer surfaces warm and clear
- post-completion rating lightweight and optional

The strongest version of the MVP will feel less like “guided repair education” and more like “modern service dispatch with human readability.”
