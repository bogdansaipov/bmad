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
workflowType: 'architecture'
project_name: 'demo1'
user_name: 'Bogdansaipov'
date: '2026-04-07'
lastStep: 8
status: 'complete'
completedAt: '2026-04-07 17:27:21 +0500'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Handrix is a narrow-scope urgent plumbing coordination product whose MVP requirements cluster into five architectural areas.

Customer intake and guidance requirements establish a lightweight, no-account request flow that supports issue selection, clarifying questions, service location capture, immediate containment guidance, summary review, confirmation, and out-of-scope or fallback handling. Architecturally, this implies a guided intake workflow with step continuity, issue-type-driven branching, and a rules-backed guidance layer tied to supported plumbing scenarios.

Expectation-setting and customer confidence requirements define the trust layer of the product: the customer must see believable ETA and pricing expectations, understand what happens next, receive confirmation that the request is progressing, and understand delayed or unavailable states. Architecturally, this means the request model must separate customer-visible lifecycle states from low-level system events while still keeping them tightly aligned.

Dispatch and lifecycle management requirements are the core of the system. The platform must create, classify, update, assign, and track requests across intake, review, assignment, dispatch, completion, and unfulfillable outcomes, while preserving request-state history. This strongly suggests a request-centric domain model with explicit state transitions and durable event/history recording.

Operations requirements define a lean internal coordination layer. Operations staff must review incoming requests, inspect fulfillment-relevant details, assign providers or handlers, update statuses, and identify exceptions. Architecturally, this implies an internal dashboard backed by queue-oriented request views, assignment actions, and guarded lifecycle transition controls.

Support requirements add a third consumer of the same request domain. Support must be able to search requests, inspect history, view prior customer guidance, understand delays or blocks, and provide consistent reassurance. This implies shared request visibility, history/audit support, and a unified interpretation of request state across internal roles.

**Non-Functional Requirements:**
The strongest NFRs are reliability, clarity, and mobile-first performance rather than extreme scale or complex compliance.

Performance requirements call for a fast, low-friction SPA experience on modern mobile browsers, sub-2-second standard interactions under normal conditions, and frequent enough status refreshes to make progress feel active. This favors a simple SPA plus API architecture with careful payload sizing, optimistic UX discipline, and lightweight polling for the MVP.

Reliability requirements are especially important because trust is the product. Confirmed requests cannot be lost or duplicated, request state must remain recoverable, and customer-visible status must remain aligned with internal operational truth. This creates pressure for explicit lifecycle modeling, transactional request updates, and durable state-history capture.

Security requirements are moderate but important: encrypted transport, controlled access to customer and operational data, role-restricted internal access, and auditable state changes. This points to role-based access control and request history as a core architectural concern, not an afterthought.

Accessibility requirements are strong and directly tied to product success. WCAG 2.1 AA, readable contrast, touch-friendly interaction, clear labeling, and low-cognitive-load language all affect both UI architecture and component-system choices.

Scalability expectations are moderate but real. The MVP should support at least a 10x increase from initial volume and retain a clean path from polling to more efficient real-time updates if growth justifies it. This suggests choosing lifecycle and API contracts that will survive transport evolution later.

**Scale & Complexity:**
Handrix is a medium-complexity MVP. The product scope is intentionally narrow by category, but the operational trust model adds meaningful complexity because the system must coordinate customer-facing progression, internal assignment, and support visibility without contradiction.

- Primary domain: Mobile-first web application with backend orchestration for service requests
- Complexity level: Medium
- Estimated architectural components: 7-9 major components across customer flow, request lifecycle, guidance/serviceability rules, status tracking, operations tooling, support visibility, auth/roles, and persistence

### Technical Constraints & Dependencies

The confirmed technical direction is a React SPA frontend with a NestJS API backend. The frontend must be mobile-first and optimized for modern mobile browsers, with desktop as a secondary layout. The MVP should use polling for request status updates rather than push-based real-time delivery.

The architecture must preserve the core confidence loop defined by product and UX: issue selection, immediate containment guidance, ETA and price expectation, one-tap confirmation, and dispatch tracking. It must also support manual or semi-manual operational fulfillment in the MVP, which means internal tooling and lifecycle controls are part of the product architecture rather than an external back-office concern.

The design direction adds an important dependency on coherent state presentation. Warm, reassuring intake screens and more structured post-confirmation tracking screens should both be driven from the same underlying request lifecycle model.

### Cross-Cutting Concerns Identified

The dominant cross-cutting concern is lifecycle consistency. Customer screens, ops actions, and support responses must all reflect the same request truth.

Other cross-cutting concerns include:
- Explicit request-state modeling and transition control
- Durable request history and auditability
- Mapping internal operational states to customer-safe visible statuses
- Serviceability and out-of-scope decision logic
- Recovery-path handling for clarification, delay, and unavailable outcomes
- Mobile-first performance and state continuity in the SPA
- Accessibility and low-cognitive-load interaction design
- Role-based internal visibility for operations and support

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with a separated mobile-first React SPA frontend and NestJS API backend, based on project requirements analysis.

### Starter Options Considered

**Option 1: React Router framework starter + NestJS backend**
This is a current and well-supported React path, but it is a weaker fit for Handrix because it introduces a framework-oriented React application model while the project already has a dedicated NestJS backend. It risks overlapping responsibilities between the frontend framework layer and the backend API layer.

**Option 2: Vite + React + TypeScript frontend + NestJS CLI backend**
This is the best fit for Handrix's confirmed tech direction. It keeps the frontend as a true SPA, supports fast mobile-first UX iteration, and pairs cleanly with a separate NestJS API responsible for request lifecycle management, dispatch orchestration, and internal tooling.

**Option 3: NestJS TypeScript starter via Git clone**
This is viable, but weaker than the CLI path because the official CLI is the primary Nest scaffolding path and gives cleaner project initialization and team onboarding.

### Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API

**Rationale for Selection:**
Handrix has a clearly separated architecture: a customer-facing React SPA and a backend API centered on request lifecycle/state management. The paired-starter approach aligns directly with that separation.

Vite gives the frontend a fast, lightweight SPA foundation optimized for modern mobile browsers, which suits the urgent-use request flow. NestJS CLI gives the backend a strongly structured TypeScript foundation with conventional module boundaries, test scaffolding, linting, and a clean path to model the request lifecycle as the core domain.

This combination also keeps MVP complexity under control. It avoids overcommitting to a heavier full-stack React framework while preserving a clean path for future additions such as React Router in SPA mode, stronger form orchestration, background polling abstractions, and eventual push-based status updates.

**Initialization Commands:**

```bash
npm create vite@latest handrix-web -- --template react-ts
npm i -g @nestjs/cli
nest new handrix-api --strict
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
Both starters establish TypeScript-based projects on Node.js tooling. This is a strong fit for Handrix because shared request-state concepts, DTOs, and lifecycle semantics benefit from strict typing across frontend and backend.

**Styling Solution:**
Vite's React TypeScript starter does not force a heavyweight styling framework. That is helpful here because the UX direction calls for a custom, themeable design system rather than a rigid visual framework. We can layer the Handrix design tokens and component primitives on top deliberately.

**Build Tooling:**
Vite provides fast local development and production frontend bundling optimized for modern browsers. Nest CLI provides the standard Nest application build and development workflow for the backend.

**Testing Framework:**
Nest's starter includes a conventional test setup for unit and end-to-end testing. Vite's starter keeps the frontend foundation minimal, allowing us to add the testing stack that best fits the architecture decisions we make later.

**Code Organization:**
Vite starts with a simple frontend structure suitable for a focused SPA. Nest's starter establishes a modular backend structure that supports feature modules and request-lifecycle-oriented domain organization.

**Development Experience:**
This pairing gives fast frontend iteration, conventional backend scaffolding, TypeScript-first development, and a low-friction foundation for a small team building an MVP.

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Use PostgreSQL as the system of record for requests, assignments, status history, and internal user access.
- Model the platform around a request lifecycle state machine with explicit transition rules.
- Use Prisma ORM with migrations for backend persistence and schema evolution.
- Use REST APIs in NestJS with OpenAPI documentation as the contract surface between frontend, backend, and internal tools.
- Use React Router plus TanStack Query in the SPA to separate route flow from server-state synchronization.
- Use anonymous customer request creation with a request-tracking token, while restricting internal tools behind authenticated role-based access.

**Important Decisions (Shape Architecture):**
- Use Zod schemas in a shared package for request payload and response contract validation where cross-app consistency matters.
- Keep customer-visible status values as a curated public projection of richer internal operational states.
- Use polling for customer dispatch tracking in the MVP, with a later upgrade path to push-based transport.
- Use a modular monolith NestJS backend rather than splitting services in the MVP.
- Use structured logs, request IDs, and auditable status history from day one.

**Deferred Decisions (Post-MVP):**
- Push-based realtime updates such as WebSockets or SSE
- Customer accounts and saved-address identity flows
- Distributed caching beyond targeted query/result caching if load justifies it
- Multi-region deployment and more advanced infrastructure segmentation
- Rich analytics/event streaming architecture

### Data Architecture

**Primary database:** PostgreSQL 17 as the main relational store  
**Rationale:** Handrix has strongly relational MVP needs: requests, request history, assignments, staff users, supported issue types, serviceability rules, and support visibility. PostgreSQL is a strong fit for transactional consistency and audit-friendly lifecycle modeling.

**ORM and migration approach:** Prisma ORM v6 with Prisma Migrate  
**Rationale:** Prisma gives the NestJS API type-safe persistence, clear schema management, and a migration workflow that fits a small TypeScript-heavy team.

**Data modeling approach:** Request-centric relational model with explicit lifecycle fields plus append-only status/event history  
Core entities:
- `service_requests`
- `request_status_history`
- `request_assignments`
- `issue_types`
- `containment_guidance_rules`
- `service_coverage_rules`
- `internal_users`
- `support_notes`

**State machine strategy:** The request record holds the current canonical state, while `request_status_history` stores every meaningful transition and customer-visible messaging context. This supports operations, support, and auditability without forcing event sourcing complexity into the MVP.

**Validation strategy:** Shared Zod 4 schemas for high-value request contracts, with backend enforcement in NestJS request handling and frontend use for form-safe parsing and API response confidence.

**Caching strategy:** No distributed cache in the MVP. Use database indexes, efficient polling endpoints, and HTTP-friendly API contracts first. Revisit Redis only if request volume or polling load materially justifies it.

### Authentication & Security

**Customer authentication:** No customer account required in MVP  
**Approach:** Create requests anonymously and return a signed request-tracking token for status retrieval and revisits.

**Internal authentication:** Authenticated internal staff access for operations and support  
**Approach:** JWT-based auth in NestJS with role-based access control for `ops` and `support`.

**Authorization model:** Role-based guards at the API layer with request-scoped visibility rules where needed  
**Rationale:** Ops and support share request visibility, but not necessarily the same write privileges.

**Security middleware:** Standard NestJS security middleware plus rate limiting using `@nestjs/throttler`  
**Rationale:** The public request flow and polling endpoints need baseline abuse protection without overcomplicating the stack.

**Encryption approach:** TLS in transit, managed encryption at rest through the database platform, and minimal storage of nonessential personal data.

### API & Communication Patterns

**API style:** REST-first JSON API  
**Rationale:** The product flow is request/resource-oriented, polling-friendly, easy to document, and a strong fit for React SPA plus ops/support tooling.

**Documentation:** OpenAPI via NestJS Swagger  
**Rationale:** This creates a stable contract for frontend work and future AI-agent implementation consistency.

**Error handling standard:** Uniform API error envelope with machine-readable code, human-safe message, and optional recovery hint  
**Rationale:** Handrix needs trust-preserving recovery, so errors should map cleanly into calm UX states rather than raw backend failures.

**Polling pattern:** Customer tracking screen polls a request-status endpoint on a short interval tuned for MVP responsiveness and infrastructure cost.
Suggested shape:
- `GET /requests/:publicId/status`
- `GET /ops/requests`
- `PATCH /ops/requests/:id/status`
- `POST /requests`

**Service communication:** Single NestJS application with module boundaries, not microservices, for MVP simplicity and consistency.

### Frontend Architecture

**Routing strategy:** React Router in SPA mode  
**Rationale:** The Handrix flow is a compact, sequential, mobile-first journey with a few high-value routes rather than a framework-heavy app surface.

**Server-state management:** TanStack Query v5  
**Rationale:** Polling, stale/fresh status handling, retry control, and request detail fetching all fit naturally into TanStack Query.

**Client-state management:** Local component state plus route-scoped flow state; no global app store in MVP  
**Rationale:** The product has a primary guided flow, not a deeply collaborative or highly state-shared client. A global store would be premature.

**Component architecture:** Design-system primitives plus product-specific flow components  
Priority custom components:
- Issue Selection Card
- Containment Guidance Panel
- Expectation Summary Module
- Request Status Timeline
- Recovery State Card
- Operations Request Queue Item

**Performance approach:** Mobile-first bundle discipline, route-level code splitting where useful, compact payloads for polling, and no unnecessary client-side data layers.

### Infrastructure & Deployment

**Deployment model:** Separated frontend and backend deployment, but still treated as one MVP system  
- Static SPA deployment on a frontend hosting platform
- Dockerized or managed NestJS API deployment
- Managed PostgreSQL database

**Environment strategy:** Distinct local, staging, and production environments with typed config validation at startup.

**CI/CD approach:** Simple pipeline with lint, tests, migration checks, and deploy gates for frontend and backend separately.

**Monitoring and logging:** Structured application logs, request correlation IDs, health endpoints, and error monitoring from the first release.

**Scaling strategy:** Scale vertically first and keep the architecture simple. Optimize polling endpoints and database indexes before introducing more infrastructure layers.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize Vite frontend and NestJS backend
2. Establish shared types/schemas and request lifecycle definitions
3. Build database schema and migrations for request-centric entities
4. Implement public request intake APIs and customer tracking endpoint
5. Implement ops/support auth and internal request management APIs
6. Build customer SPA flow
7. Build ops/support internal views
8. Add observability, rate limiting, and deployment hardening

**Cross-Component Dependencies:**
- The request state machine drives database schema, API design, polling behavior, and UX status presentation.
- Shared contract validation affects frontend forms, backend DTO handling, and support/ops consistency.
- The internal/public status split affects both API resource shape and UI copy strategy.
- Anonymous customer access influences token design, request lookup endpoints, and support recovery behavior.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
10 areas where AI agents could make different choices and create integration problems: database naming, API naming, file naming, lifecycle naming, route structure, response format, error format, state update patterns, validation boundaries, and loading/recovery behavior.

### Naming Patterns

**Database Naming Conventions:**
- Use `snake_case` for all table and column names.
- Use plural snake_case for tables: `service_requests`, `request_status_history`, `internal_users`.
- Use singular snake_case foreign keys ending in `_id`: `request_id`, `assigned_provider_id`.
- Use timestamps named `created_at`, `updated_at`, and optional domain timestamps like `confirmed_at`, `assigned_at`.
- Use enum-like lifecycle values in lowercase snake_case: `awaiting_confirmation`, `dispatch_in_progress`, `clarification_needed`.
- Use index names in the form `idx_<table>_<column>`.

**API Naming Conventions:**
- Use plural resource nouns for REST endpoints: `/requests`, `/ops/requests`, `/support/requests`.
- Use path params with `:param` in frontend route definitions and `{param}` only in OpenAPI documentation examples.
- Use `camelCase` for JSON request and response fields.
- Use lowercase kebab-case for URL path segments: `/request-status` only if needed as a subresource.
- Public request identifiers should use `publicId` in JSON, distinct from internal numeric or UUID `id`.

**Code Naming Conventions:**
- Use `PascalCase` for React components, Nest classes, DTO classes, and Prisma-facing domain types.
- Use `camelCase` for functions, variables, hooks, and object properties in TypeScript.
- Use `kebab-case` for most frontend file names and route folders: `request-status-timeline.tsx`, `issue-selection-page.tsx`.
- Use `PascalCase` file names only for React components if the repo standard later chooses that consistently. Until then, prefer `kebab-case` files everywhere except class names inside files.
- Prefix hooks with `use`: `useRequestStatus`, `useIssueSelectionFlow`.

### Structure Patterns

**Project Organization:**
- Organize both frontend and backend by feature/domain first, not by technical layer alone.
- Frontend top-level features should mirror user-facing flows: `issue-intake`, `containment-guidance`, `request-review`, `request-tracking`, `ops-queue`, `support-request-view`.
- Backend Nest modules should align to domain boundaries: `requests`, `dispatch`, `support`, `ops`, `auth`, `reference-data`.
- Shared cross-app schemas should live in a dedicated shared package, not duplicated between frontend and backend.
- Co-locate tests with implementation files where practical using `*.test.ts` / `*.test.tsx`; keep true end-to-end suites in dedicated `e2e/` locations.

**File Structure Patterns:**
- Keep API contract schemas in one predictable place per domain, such as `shared/contracts/requests`.
- Keep frontend API client code separate from UI components.
- Keep lifecycle/state-machine definitions in a dedicated backend domain location and expose public status mapping from that same source.
- Keep design-system primitives separate from Handrix-specific product components.
- Keep static copy/config for issue types, containment guidance templates, and public status labels in structured config modules, not scattered constants.

### Format Patterns

**API Response Formats:**
- Success responses should use a consistent wrapper:
  - `{ data, meta? }`
- Error responses should use:
  - `{ error: { code, message, details?, retryable? } }`
- Collection responses should use:
  - `{ data: [...], meta: { total?, nextCursor? } }`
- Single resource responses should still use the `data` wrapper for consistency.
- Do not mix wrapped and unwrapped JSON responses across endpoints.

**Data Exchange Formats:**
- Use `camelCase` in all JSON exchanged with the SPA.
- Use ISO 8601 strings for all timestamps in API responses.
- Use booleans as `true` / `false`, never `1` / `0`.
- Use `null` intentionally for absent optional values; do not overload empty strings as missing data.
- Keep customer-visible status separate from internal status when needed:
  - `internalStatus`: richer operational lifecycle
  - `publicStatus`: curated customer-facing lifecycle

### Communication Patterns

**Event System Patterns:**
- Even without a distributed event bus in MVP, name internal domain events consistently in past tense snake_case or dot-case and keep them internal.
- Preferred internal event names:
  - `request.created`
  - `request.confirmed`
  - `request.assignment_started`
  - `request.assigned`
  - `request.delayed`
  - `request.unavailable`
- Event payloads should always include:
  - `requestId`
  - `occurredAt`
  - `actorType`
  - `actorId` when available
  - `previousStatus`
  - `nextStatus`

**State Management Patterns:**
- Treat server state and UI state as separate concerns.
- Server state belongs in TanStack Query.
- Local flow progression and temporary form choices belong in route-local React state or form state.
- Do not introduce a global client store unless a concrete shared-state problem appears.
- All state transitions that matter to business behavior must originate from backend lifecycle rules, not frontend-only assumptions.

### Process Patterns

**Error Handling Patterns:**
- Every backend error returned to the frontend must map to a stable error code.
- Customer-facing messages should be calm and actionable; logs may contain richer technical detail, but APIs should not leak internals.
- Validation errors should be field-specific where possible.
- Recovery-state UX should prefer explicit fallback or next-step guidance over generic failure messages.
- Support and ops tools may show more diagnostic detail than customer flows, but still through structured error shapes.

**Loading State Patterns:**
- Use skeletons or reserved layout placeholders for primary page loads.
- Use inline status indicators for polling refreshes instead of full-screen spinners after initial load.
- Keep polling refreshes visually calm; never reset the whole tracking screen on each status fetch.
- Name loading booleans consistently:
  - `isLoading` for initial load
  - `isFetching` for background refresh
  - `isSubmitting` for mutations
- Mutation success should update query caches or invalidate precise keys, not force broad full-app reloads.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use the request lifecycle/state-machine definition as the single source of truth for status handling.
- Follow `snake_case` in persistence and `camelCase` in JSON/TypeScript without mixing conventions.
- Use the standard API success and error wrappers consistently.
- Keep public status labels derived from backend mappings, not hardcoded independently in multiple frontend components.
- Add or update tests when changing lifecycle transitions, contract schemas, or public status behavior.

**Pattern Enforcement:**
- Verify naming and format rules through ESLint, TypeScript, schema validation, and code review.
- Treat lifecycle mapping changes as architecture-sensitive changes requiring updates to backend logic, shared contracts, and frontend rendering together.
- Document any intentional pattern deviation inside the architecture doc or a follow-up ADR before implementation diverges.

### Pattern Examples

**Good Examples:**
- Database table: `service_requests`
- JSON field: `publicStatus`
- React hook: `useRequestStatus`
- API success: `{ "data": { "publicId": "req_123", "publicStatus": "dispatch_in_progress" } }`
- API error: `{ "error": { "code": "OUT_OF_SERVICE_AREA", "message": "This address is outside the current service area.", "retryable": false } }`

**Anti-Patterns:**
- Mixing `snake_case` and `camelCase` in the same JSON response
- Returning raw Prisma models directly from controllers
- Hardcoding request status copy in multiple frontend files
- Using one status set for ops, support, and customer without an explicit mapping decision
- Replacing inline polling refresh with repeated full-page loading spinners

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
handrix/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── .env.example
├── docs/
│   └── architecture-notes/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-web.yml
│       └── deploy-api.yml
├── apps/
│   ├── handrix-web/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── public/
│   │   │   └── icons/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app/
│   │   │   │   ├── router.tsx
│   │   │   │   ├── providers.tsx
│   │   │   │   ├── query-client.ts
│   │   │   │   └── routes/
│   │   │   │       ├── landing-route.tsx
│   │   │   │       ├── issue-intake-route.tsx
│   │   │   │       ├── containment-route.tsx
│   │   │   │       ├── request-review-route.tsx
│   │   │   │       ├── request-confirmed-route.tsx
│   │   │   │       ├── request-status-route.tsx
│   │   │   │       ├── ops-login-route.tsx
│   │   │   │       ├── ops-queue-route.tsx
│   │   │   │       ├── ops-request-detail-route.tsx
│   │   │   │       ├── support-login-route.tsx
│   │   │   │       └── support-request-route.tsx
│   │   │   ├── features/
│   │   │   │   ├── issue-intake/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── api/
│   │   │   │   │   └── issue-intake.test.tsx
│   │   │   │   ├── containment-guidance/
│   │   │   │   ├── request-review/
│   │   │   │   ├── request-tracking/
│   │   │   │   ├── request-recovery/
│   │   │   │   ├── ops-queue/
│   │   │   │   └── support-request-view/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   └── handrix/
│   │   │   ├── lib/
│   │   │   │   ├── http-client.ts
│   │   │   │   ├── env.ts
│   │   │   │   ├── formatters/
│   │   │   │   └── utils/
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css
│   │   │   │   └── globals.css
│   │   │   └── test/
│   │   │       ├── setup.ts
│   │   │       └── fixtures/
│   │   └── e2e/
│   │       ├── customer-flow.spec.ts
│   │       ├── dispatch-tracking.spec.ts
│   │       └── ops-queue.spec.ts
│   └── handrix-api/
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── .env.example
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   ├── app.config.ts
│       │   │   ├── database.config.ts
│       │   │   └── env.validation.ts
│       │   ├── common/
│       │   │   ├── dto/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── pipes/
│       │   │   └── utils/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── controllers/
│       │   │   │   ├── services/
│       │   │   │   ├── guards/
│       │   │   │   └── auth.module.ts
│       │   │   ├── requests/
│       │   │   │   ├── controllers/
│       │   │   │   ├── services/
│       │   │   │   ├── repositories/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── request-state-machine.ts
│       │   │   │   │   ├── public-status-mapper.ts
│       │   │   │   │   └── request-events.ts
│       │   │   │   └── requests.module.ts
│       │   │   ├── dispatch/
│       │   │   ├── ops/
│       │   │   ├── support/
│       │   │   ├── reference-data/
│       │   │   └── health/
│       │   └── prisma/
│       │       └── prisma.service.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── seed.ts
│       │   └── migrations/
│       └── test/
│           ├── integration/
│           ├── e2e/
│           └── fixtures/
├── packages/
│   ├── shared-contracts/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── requests/
│   │   │   │   ├── request.schemas.ts
│   │   │   │   ├── request.types.ts
│   │   │   │   └── request-status.schemas.ts
│   │   │   ├── auth/
│   │   │   └── index.ts
│   └── shared-config/
│       ├── eslint/
│       ├── typescript/
│       └── prettier/
└── scripts/
    ├── bootstrap.sh
    ├── dev.sh
    └── test.sh
```

### Architectural Boundaries

**API Boundaries:**
- Public customer APIs live under the `requests` module and expose only customer-safe request creation, review, and status retrieval.
- Internal operations APIs live under `ops` and support queue retrieval, assignment actions, and operational status updates.
- Internal support APIs live under `support` and provide read-heavy request history plus controlled intervention actions.
- Auth boundaries apply only to internal modules in MVP; customer status access uses a signed request-tracking token rather than account auth.

**Component Boundaries:**
- Customer-facing SPA flow is separated by journey stage: intake, guidance, review, confirmation, tracking, and recovery.
- Internal views for ops and support are separate features, even if they reuse lower-level request-summary components.
- Design-system primitives in `components/ui` must remain presentation-oriented; product semantics belong in feature modules or `components/handrix`.

**Service Boundaries:**
- `requests` owns request creation, lifecycle transitions, and public-status projection.
- `dispatch` owns assignment workflows and dispatch-specific transition triggers.
- `ops` owns queue-oriented orchestration surfaces and operational write actions.
- `support` owns search, visibility, and intervention-oriented workflows.
- `reference-data` owns issue types, containment guidance templates, and serviceability rules.

**Data Boundaries:**
- PostgreSQL is the system of record for all request lifecycle data.
- Prisma access is centralized through backend repositories/services; controllers do not talk directly to Prisma.
- Shared Zod contracts define request/response shape boundaries between frontend and backend.
- Public status is a derived projection, not a separate source of truth disconnected from the internal request lifecycle.

### Requirements to Structure Mapping

**Feature Mapping:**
- Customer issue intake and follow-up questions:
  - `apps/handrix-web/src/features/issue-intake/`
  - `apps/handrix-api/src/modules/requests/`
  - `packages/shared-contracts/src/requests/`
- Immediate containment guidance:
  - `apps/handrix-web/src/features/containment-guidance/`
  - `apps/handrix-api/src/modules/reference-data/`
- ETA and price expectation review:
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-api/src/modules/requests/`
  - `apps/handrix-api/src/modules/reference-data/`
- One-tap confirmation and request creation:
  - `apps/handrix-web/src/features/request-review/`
  - `apps/handrix-api/src/modules/requests/`
- Dispatch tracking:
  - `apps/handrix-web/src/features/request-tracking/`
  - `apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts`
  - `apps/handrix-api/src/modules/dispatch/`
- Operations queue and assignment:
  - `apps/handrix-web/src/features/ops-queue/`
  - `apps/handrix-api/src/modules/ops/`
  - `apps/handrix-api/src/modules/dispatch/`
- Support visibility and trust recovery:
  - `apps/handrix-web/src/features/support-request-view/`
  - `apps/handrix-api/src/modules/support/`

**Cross-Cutting Concerns:**
- Request lifecycle state machine:
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
- Public/internal status mapping:
  - `apps/handrix-api/src/modules/requests/domain/public-status-mapper.ts`
- Shared request schemas:
  - `packages/shared-contracts/src/requests/`
- Auth and role guards:
  - `apps/handrix-api/src/modules/auth/`
  - `apps/handrix-api/src/common/guards/`
- Global error formatting:
  - `apps/handrix-api/src/common/filters/`
- Frontend query/polling behavior:
  - `apps/handrix-web/src/app/query-client.ts`
  - `apps/handrix-web/src/features/request-tracking/api/`

### Integration Points

**Internal Communication:**
- Frontend features communicate with the API through feature-local API adapters built on `lib/http-client.ts`.
- Backend module-to-module coordination happens through Nest services and domain-level transition helpers, not direct controller coupling.
- Shared contracts package provides the stable type/schema boundary used by both apps.

**External Integrations:**
- Managed PostgreSQL connects to the NestJS API via Prisma.
- Deployment targets are separate for SPA and API.
- Future integrations such as analytics, notifications, or provider systems should enter through dedicated modules rather than being mixed into `requests`.

**Data Flow:**
1. Customer progresses through SPA intake flow.
2. Frontend validates shape locally with shared schemas where appropriate.
3. `POST /requests` creates the request and initial lifecycle history.
4. Ops updates assignment and lifecycle through internal APIs.
5. Customer tracking polls a public status endpoint.
6. Support reads the same underlying request history through support-scoped APIs.

### File Organization Patterns

**Configuration Files:**
- Root contains shared workspace and CI config.
- App-specific runtime config stays inside each app.
- Environment validation lives in backend `config/env.validation.ts` and frontend `lib/env.ts`.

**Source Organization:**
- Domain-first inside both apps.
- Shared contracts in `packages/shared-contracts`.
- Backend domain rules concentrated under `requests/domain`.

**Test Organization:**
- Unit and feature tests are mostly co-located.
- Frontend browser E2E tests live in `apps/handrix-web/e2e/`.
- Backend integration and API E2E tests live in `apps/handrix-api/test/`.

**Asset Organization:**
- Static browser assets live under `apps/handrix-web/public/`.
- Design tokens and global CSS live under `apps/handrix-web/src/styles/`.
- No backend-owned presentation assets outside docs/test fixtures.

### Development Workflow Integration

**Development Server Structure:**
- Frontend and backend run independently but share contracts through the workspace.
- Shared package changes should propagate into both apps without manual copy steps.

**Build Process Structure:**
- Build frontend and backend separately.
- Shared contracts must build or typecheck before dependent app builds.
- Prisma schema and migrations are owned only by the API app.

**Deployment Structure:**
- SPA deploys as a static frontend artifact.
- API deploys as a Node/Nest service with Prisma migrations applied through backend deployment workflow.
- Database lifecycle is managed independently from frontend deployment.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All major technology decisions work together cleanly. The Vite React SPA and NestJS API are intentionally separated, which avoids framework overlap and keeps the frontend focused on the guided customer flow. PostgreSQL, Prisma, NestJS, shared Zod contracts, and TanStack Query all support a request-centric, strongly typed architecture without conflicting assumptions.

The chosen approach also aligns with the MVP constraint of polling-based dispatch tracking. No selected technology requires premature real-time infrastructure or a distributed service model.

**Pattern Consistency:**
The implementation patterns support the architectural decisions well. Naming conventions are internally consistent across persistence, JSON contracts, and TypeScript code. The separation of `snake_case` in storage and `camelCase` in API/code is explicit enough to guide implementation safely.

The public/internal status split is reinforced across decisions, patterns, and structure, which is especially important for Handrix because customer trust depends on consistent lifecycle presentation across customer, ops, and support contexts.

**Structure Alignment:**
The proposed monorepo structure supports the architecture directly. The apps/packages split matches the separated SPA/API design while still allowing shared contracts and shared tooling. Feature/domain-first organization also supports the request-lifecycle-centered architecture better than a generic layer-first tree would.

Module boundaries are clear: `requests` owns lifecycle truth, `dispatch` owns assignment behavior, `ops` and `support` own role-specific workflows, and `reference-data` owns issue/guidance/serviceability configuration.

### Requirements Coverage Validation ✅

**Feature Coverage:**
All major PRD capability areas are architecturally covered:
- Customer intake and issue clarification are supported by the SPA feature flow, shared request schemas, and `requests` backend module.
- Immediate containment guidance is covered by the `containment-guidance` frontend feature and `reference-data` backend ownership.
- ETA and pricing expectation handling are supported through the request-review flow plus reference/config-driven backend data.
- One-tap confirmation is covered through the request creation boundary and request review feature.
- Dispatch tracking is covered through the polling status endpoint, public-status mapper, and request-tracking frontend feature.
- Operations workflow is covered by dedicated internal routes/features and `ops` plus `dispatch` backend modules.
- Support visibility is covered through support-scoped frontend/backend surfaces and shared request-history access.

**Functional Requirements Coverage:**
The architecture supports all FR groupings from the PRD:
- Customer intake and fallback handling
- Expectation setting and confirmation
- Dispatch lifecycle management
- Operations queue and assignment
- Support search, visibility, and intervention
- Scope enforcement and future category/geography expansion

The most important FR cluster, request lifecycle/state visibility, is strongly addressed by the state machine, request history, public/internal status mapping, and role-separated APIs.

**Non-Functional Requirements Coverage:**
- Performance: addressed through SPA architecture, route-focused UX, compact polling endpoints, and lean MVP infrastructure.
- Reliability: addressed through PostgreSQL as system of record, append-only status history, lifecycle rules, and auditable transitions.
- Security: addressed through JWT-based internal auth, role guards, signed customer tracking tokens, rate limiting, and minimal data collection.
- Accessibility: addressed in UX constraints and reinforced by component/pattern rules.
- Scalability: addressed through modular monolith boundaries, managed database, clean polling architecture, and explicit future path to push-based updates.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical implementation-blocking decisions are present:
- persistence choice
- contract style
- auth approach
- lifecycle ownership
- frontend routing/state approach
- deployment direction
- shared-schema strategy

The architecture is specific enough that AI agents should not need to invent core platform decisions during implementation.

**Structure Completeness:**
The structure is concrete rather than generic. It defines apps, shared packages, domain modules, feature locations, testing locations, and lifecycle-specific files such as the request state machine and public status mapper.

**Pattern Completeness:**
The major conflict-prone areas are covered:
- naming
- file structure
- API envelopes
- loading patterns
- error handling
- status handling
- state ownership
- test expectations

This is sufficient for a consistent MVP implementation pass.

### Gap Analysis Results

**Critical Gaps:**
None identified.

**Important Gaps:**
- The architecture intentionally does not yet define the exact request lifecycle state enum and allowed transition matrix. That should be one of the first implementation artifacts because many components depend on it.
- The token format and expiry strategy for anonymous customer request tracking is not yet specified in detail. The authentication direction is clear, but the exact token design should be documented during implementation kickoff.
- Pricing/ETA calculation logic is structurally accounted for, but the source-of-truth rules for those estimates are not yet modeled in detail. That is acceptable at architecture level but should be refined before backend implementation.

**Nice-to-Have Gaps:**
- ADRs for request lifecycle transitions and public-status mapping would help future expansion.
- A small API contract example set would make agent implementation even smoother.
- CI workflow details can be refined once the repo is scaffolded.

### Validation Issues Addressed

No blocking issues were found during validation.

A few intentionally deferred details remain, but they are implementation-level refinements rather than architecture gaps. The current document is strong enough to guide consistent AI-agent implementation as long as the first implementation stories establish the lifecycle enum, transition rules, and request tracking token behavior early.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Strong alignment around a request lifecycle/state machine as the product core
- Clear separation of customer, ops, and support surfaces without splitting the MVP into premature microservices
- Consistent shared-contract strategy for frontend/backend alignment
- Practical MVP scope with a clean future path to richer real-time and operational sophistication
- Concrete enough structure and patterns to reduce AI-agent drift during implementation

**Areas for Future Enhancement:**
- Formal lifecycle transition matrix
- Detailed anonymous tracking-token specification
- More explicit ETA/pricing rule modeling
- Optional ADR set for future architectural evolution

### Implementation Handoff

**AI Agent Guidelines:**
- Follow the request lifecycle/state machine as the primary source of truth for request behavior.
- Implement shared contracts before building dependent frontend and backend features.
- Keep public status projection derived from backend lifecycle logic.
- Respect the defined module and feature boundaries.
- Do not introduce a global client state store or microservice split unless the documented architecture is explicitly revised.

**First Implementation Priority:**
Initialize the monorepo foundation, scaffold `handrix-web` and `handrix-api`, add the shared contracts package, and define the initial request lifecycle enum plus transition rules before building end-user flows.
