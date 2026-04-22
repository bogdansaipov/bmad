# Story 5.1: Establish Durable Persistence and Schema Management

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product platform,
I want a PostgreSQL and Prisma-backed persistence layer with explicit lifecycle entities and migrations,
so that request, assignment, and history data remain durable and evolvable.

## Acceptance Criteria

1. Given the MVP requires durable request and lifecycle storage, when the persistence layer is implemented, then PostgreSQL is used as the system of record for requests, assignments, status history, users, and related reference data, and the schema reflects the request-centric lifecycle model defined in the architecture.
2. Given schema changes are needed during development, when the backend data model evolves, then Prisma migrations are used to manage schema changes predictably, and the migration workflow supports repeatable setup across environments.
3. Given request lifecycle data is persisted, when confirmed requests, assignments, or status transitions are stored, then the records remain recoverable and auditable, and the persistence design does not require redefining the core lifecycle for future expansion.

## Tasks / Subtasks

- [x] Introduce the API-owned Prisma and PostgreSQL foundation in the backend app without changing public API contracts (AC: 1, 2)
  - [x] Add Prisma runtime and CLI dependencies to `apps/handrix-api/package.json` and wire backend scripts for generate and migrate workflows.
  - [x] Create the architecture-aligned Prisma layout under `apps/handrix-api/prisma/` with `schema.prisma` and an initial migration owned only by the API app.
  - [x] Add backend database bootstrapping seams such as `apps/handrix-api/src/prisma/prisma.service.ts` and, if needed, a small Prisma module/provider registration path in the API app.
  - [x] Extend backend environment configuration so database connection settings are validated early alongside the existing auth and port config, and document them in `apps/handrix-api/.env.example`.

- [x] Model the core request-centric persistence schema around the existing lifecycle and role boundaries instead of mirroring controller DTOs or raw JSON blobs (AC: 1, 3)
  - [x] Define Prisma models for service requests, request status history, assignments, internal users, and the minimum related reference data required to keep today’s request, ops, and support flows durable.
  - [x] Follow the architecture naming rules exactly: `snake_case` in persistence, plural table names, singular `_id` foreign keys, lowercase snake_case lifecycle values, and ISO 8601 timestamps at the API boundary.
  - [x] Preserve the internal lifecycle versus derived public-status split already enforced by `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts` and `request-status.presenter.ts`.
  - [x] Keep the schema append-only and audit-friendly for status history and intervention visibility so future support notes, analytics, and richer assignment models can extend it without redesigning the request core.

- [x] Replace the file-based request store with a repository-backed persistence seam that keeps current behavior intact for requests, ops, and support modules (AC: 1, 3)
  - [x] Use the current `apps/handrix-api/src/modules/requests/request-store.service.ts` as the migration anchor: either evolve it behind the same service boundary or introduce a repository/service split that preserves callers in `requests`, `ops`, and `support`.
  - [x] Stop writing request lifecycle data to the JSON file path fallback for normal runtime behavior once Prisma-backed persistence is in place.
  - [x] Migrate all persisted concepts already represented in the current store, including request snapshots, assignment data, customer-visible history, internal-only history visibility, and structured intervention metadata.
  - [x] Ensure controllers still do not talk directly to Prisma; persistence access must remain centralized through backend services or repositories per the architecture.

- [x] Preserve backward-compatible request behavior and seeded internal access while moving storage into PostgreSQL (AC: 1, 3)
  - [x] Keep the existing request creation, tracking, ops queue/detail, assignment, lifecycle update, and support follow-up flows working against the new persistence layer.
  - [x] Introduce a durable internal-user persistence approach that supports the current env-driven ops/support users now, with a clean path to richer auth storage later.
  - [x] Avoid breaking the signed request-tracking credential model or public request lookup behavior already implemented in the `requests` module.
  - [x] If a one-time migration or bootstrap seed is needed for reference/internal user data, keep it explicit and repeatable rather than hidden in ad hoc startup writes.

- [x] Add a repeatable local and test workflow for schema generation, migration, and clean setup (AC: 2)
  - [x] Document the minimum commands needed to generate Prisma client artifacts, apply migrations, and start the backend against PostgreSQL.
  - [x] Make sure local setup remains predictable for a fresh checkout and does not require hand-editing generated files.
  - [x] Keep CI-oriented migration verification feasible, but leave broader deployment gating and environment-matrix hardening to Story 5.4.
  - [x] Do not introduce a second non-PostgreSQL runtime persistence path that could drift from production lifecycle behavior.

- [x] Add automated coverage proving durability, auditability, and migration-safe behavior (AC: 1, 2, 3)
  - [x] Update backend unit tests around the request persistence seam so request creation, assignment, lifecycle transitions, support interventions, and public/internal history visibility still behave correctly.
  - [x] Add focused tests for any new repository or Prisma mapping logic, especially around history append behavior, nullable customer-context fields, and lifecycle/public-status consistency.
  - [x] Extend backend e2e or integration coverage enough to prove the API can persist and read back request lifecycle records through the new store.
  - [x] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and any new Prisma generate or migration verification commands introduced by the story.

## Dev Notes

- The current backend does not yet have Prisma or a database schema in the repo. Today, `apps/handrix-api/src/modules/requests/request-store.service.ts` persists request data into a JSON file path, including assignments, history, customer snapshots, and support intervention metadata. Story 5.1 is the story that should replace that temporary durability seam with the architecture’s real persistence model.
- The safest path is to preserve the existing service-level behavior first and swap the storage implementation underneath it, rather than rewriting request, ops, and support flows all at once.
- Do not change frontend or shared-contract payload shapes in this story unless a persistence-driven correction is unavoidable. Story 5.5 is where explicit contract hardening is centered.
- Keep the request lifecycle state machine as the business source of truth. The database schema must support it, not redefine it.

### Architecture Compliance

- Architecture requires PostgreSQL 17 as the system of record and Prisma ORM v6 with Prisma Migrate for schema evolution.
- Persistence belongs to the API app only. Shared contracts stay in `packages/shared-contracts`, and controllers must not return raw Prisma models.
- The request lifecycle remains centered in `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`; public status stays a derived projection rather than a separate persisted truth source.
- Follow the documented naming split: `snake_case` in persistence and `camelCase` in JSON/TypeScript.
- Keep data boundaries aligned with module ownership:
  - `requests` owns request creation, lifecycle truth, and public-status projection.
  - `ops` owns assignment and operational writes.
  - `support` owns search, visibility, and intervention-oriented workflows.
  - `reference-data` owns structured issue/guidance/serviceability configuration.

### Library / Framework Requirements

- Introduce Prisma in `apps/handrix-api` and keep NestJS as the application/runtime boundary.
- Continue using the existing repo stack and patterns:
  - NestJS 11 modules/services/controllers
  - TypeScript 5
  - Zod shared contracts in `@handrix/shared-contracts`
  - Jest and Supertest for backend coverage
- Do not add a parallel ORM, database wrapper, or bespoke migration system.

### Testing Requirements

- Backend coverage must prove:
  - persisted requests survive create/read/update flows that currently rely on the JSON-backed store
  - assignment, lifecycle transition, and support intervention history remain auditable and readable after persistence changes
  - public-history views do not leak internal-only entries
  - repeated setup through Prisma generate and migration workflows is deterministic
- Verification should include the standard workspace checks plus the new persistence-specific commands required by the implementation.

### Previous Story Intelligence

- Epic 4 closed with support intervention persistence added to the current request store. Story 5.1 must carry forward:
  - structured intervention metadata
  - history visibility (`customer` vs `internal`)
  - refreshed support and ops detail semantics
- Story 4.5 also reinforced that lifecycle updates must continue to flow through the request state machine and public-status presenter. Do not let repository writes bypass those rules during the migration.
- Earlier Epic 3 and Epic 4 stories already established the internal role split and protected API surfaces. This story should preserve those behaviors while replacing the backing store.

### Git Intelligence Summary

- Recent commit messages are too coarse to be implementation guidance, but the current codebase shows these stable continuity points:
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/src/modules/requests/domain/request-state-machine.ts`
  - `apps/handrix-api/src/modules/requests/request-status.presenter.ts`
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/main.ts`
- The repo structure already anticipates the target architecture, including `src/config/` and an API-owned `prisma/` directory, so prefer filling those seams instead of inventing a different layout.

### Project Structure Notes

- Recommended backend touch points:
  - `apps/handrix-api/package.json`
  - `apps/handrix-api/.env.example`
  - `apps/handrix-api/src/app.module.ts`
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/modules/requests/request-store.service.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.ts`
  - `apps/handrix-api/src/modules/support/support.service.ts`
  - `apps/handrix-api/prisma/schema.prisma`
  - `apps/handrix-api/prisma/migrations/`
  - new Prisma service/module files under `apps/handrix-api/src/prisma/`
- Recommended test touch points:
  - `apps/handrix-api/src/modules/requests/request-store.service.spec.ts`
  - `apps/handrix-api/src/modules/requests/requests.service.spec.ts`
  - `apps/handrix-api/src/modules/ops/ops.service.spec.ts`
  - `apps/handrix-api/src/modules/support/support.service.spec.ts`
  - `apps/handrix-api/test/app.e2e-spec.ts`
- Avoid these structural mistakes:
  - keeping the JSON file store as the main runtime persistence path beside Prisma
  - persisting public status as an independent truth source that can drift from lifecycle state
  - letting controllers own Prisma queries directly
  - introducing SQLite-only shortcuts that create production/test behavior drift

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 5.1: Establish Durable Persistence and Schema Management]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/4-5-support-manual-intervention-and-follow-up.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/modules/requests/request-store.service.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/config/env.validation.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/main.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add Prisma and PostgreSQL foundations to the API app with validated environment configuration and repeatable migration commands.
- Model the request-centric schema around service requests, assignments, history, internal users, and the current lifecycle/public-status split.
- Replace the JSON-backed request-store persistence with a Prisma-backed seam that preserves existing request, ops, and support behavior.
- Verify the migration with unit and e2e coverage plus workspace checks and Prisma workflow commands.

### Debug Log References

- 2026-04-21: Selected `5-1-establish-durable-persistence-and-schema-management` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-21: Loaded the BMAD create-story workflow, BMAD config, sprint status, Epic 5 planning context, architecture guidance, PRD reliability constraints, and the latest implemented story artifact for continuity.
- 2026-04-21: Reviewed the live backend seams and confirmed the current persistence layer is JSON-file-backed via `request-store.service.ts`, with no Prisma schema present yet.
- 2026-04-21: Marked Epic 5 `in-progress` and Story 5.1 `ready-for-dev` in `sprint-status.yaml`.
- 2026-04-21: Added Prisma dependencies, backend Prisma bootstrap modules, validated `HANDRIX_DATABASE_URL`, and the initial Postgres migration under `apps/handrix-api/prisma/`.
- 2026-04-21: Replaced the file-backed `RequestStoreService` implementation with a Prisma-backed request, assignment, and history store while preserving the service interface used by requests, ops, and support flows.
- 2026-04-21: Added internal user sync-on-startup for env-backed ops/support users so the `internal_users` table is seeded without changing the current auth contract.
- 2026-04-21: Updated backend request/controller/e2e test plumbing to run against isolated Postgres schemas, then verified `pnpm --filter handrix-api prisma:generate`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and repo-root `pnpm test`.
- 2026-04-21: Verified repo-level `pnpm typecheck`, `pnpm lint`, and `pnpm build` after the persistence migration; lint still reports pre-existing `no-unsafe-argument` warnings in `app.e2e-spec.ts`, but no errors remain.

### Completion Notes List

- Added Prisma/PostgreSQL as the API persistence foundation, including schema, migration, generation/deploy scripts, validated database configuration, and a shared Nest Prisma module.
- Replaced JSON-file request persistence with a Prisma-backed `RequestStoreService` that keeps request creation, assignment, lifecycle history, internal-only visibility, and support intervention metadata intact.
- Added internal-user persistence seeding for the current env-backed ops/support accounts without changing the existing login/session API shape.
- Added Postgres-backed test infrastructure for isolated schemas and updated request/controller/e2e coverage so persistence behavior is verified through the new data path.
- Verified the full story with `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test` at the repo level.

### File List

- _bmad-output/implementation-artifacts/5-1-establish-durable-persistence-and-schema-management.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/handrix-api/.env.example
- apps/handrix-api/package.json
- apps/handrix-api/prisma/schema.prisma
- apps/handrix-api/prisma/migrations/migration_lock.toml
- apps/handrix-api/prisma/migrations/20260421223000_init/migration.sql
- apps/handrix-api/src/app.module.ts
- apps/handrix-api/src/config/env.validation.ts
- apps/handrix-api/src/modules/auth/auth.module.ts
- apps/handrix-api/src/modules/auth/internal-user-sync.service.ts
- apps/handrix-api/src/modules/requests/request-store.service.ts
- apps/handrix-api/src/modules/requests/request-store.service.spec.ts
- apps/handrix-api/src/modules/requests/requests.controller.spec.ts
- apps/handrix-api/src/modules/requests/requests.module.ts
- apps/handrix-api/src/modules/requests/requests.service.spec.ts
- apps/handrix-api/src/prisma/prisma.module.ts
- apps/handrix-api/src/prisma/prisma.service.ts
- apps/handrix-api/test/app.e2e-spec.ts
- apps/handrix-api/test/jest-e2e.json
- apps/handrix-api/test/postgres-jest.global-setup.ts
- apps/handrix-api/test/postgres-jest.global-teardown.ts
- apps/handrix-api/test/support/postgres-test-helpers.ts
- pnpm-lock.yaml

## Change Log

- 2026-04-21: Created Story 5.1 and advanced sprint tracking so Epic 5 is now in progress and Story 5.1 is ready for development.
- 2026-04-21: Implemented Story 5.1 by migrating request persistence to Prisma/PostgreSQL, adding the initial schema/migration and internal-user seeding, and updating backend test infrastructure to run against isolated Postgres schemas.
