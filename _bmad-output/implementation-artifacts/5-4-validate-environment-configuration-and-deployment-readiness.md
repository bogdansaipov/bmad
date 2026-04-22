# Story 5.4: Validate Environment Configuration and Deployment Readiness

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a delivery team,
I want typed configuration, environment separation, and CI/CD quality gates,
so that Handrix can be deployed consistently across local, staging, and production environments.

## Acceptance Criteria

1. Given the frontend and backend run in multiple environments, when configuration is loaded at startup, then environment variables are validated through typed configuration rules, and invalid configuration fails early instead of creating hidden runtime behavior.
2. Given the MVP needs repeatable delivery workflows, when deployment readiness is established, then the project supports distinct local, staging, and production configuration paths, and environment examples exist for both applications.
3. Given code changes are prepared for integration or release, when the CI/CD baseline is executed, then linting, tests, and migration or build checks can run as deployment gates, and the delivery flow supports separate frontend and backend deployment without breaking shared contracts.

## Tasks / Subtasks

- [x] Close the remaining typed-config gap between backend and frontend so both apps fail fast on invalid runtime configuration (AC: 1)
  - [x] Extend `apps/handrix-web/src/lib/env.ts` from a fallback helper into a typed parser that validates required browser-safe env values such as `VITE_API_BASE_URL`, rejects malformed URLs, and keeps the public runtime surface intentionally small.
  - [x] Review `apps/handrix-api/src/config/env.validation.ts` against the current Story 5.3 hardening work and add any missing startup guarantees needed for deployment readiness, especially around environment naming, origin hygiene, and production-only requirements.
  - [x] Keep runtime config inside each app per the architecture rather than moving app env handling into `packages/shared-contracts` or a new shared runtime config package.
  - [x] Ensure failures remain explicit and early in both apps: API startup should throw before listen, and frontend build or startup should surface invalid env values before shipping a broken bundle.

- [x] Establish distinct local, staging, and production configuration paths with concrete example files for both apps (AC: 1, 2)
  - [x] Add environment example coverage for `apps/handrix-api` and `apps/handrix-web` that makes the local, staging, and production variable sets obvious without checking real secrets into the repo.
  - [x] Decide on one repo-consistent naming convention for env examples and loading expectations, such as `.env.example` plus `.env.staging.example` and `.env.production.example`, and document how each maps to the existing dev/build workflows.
  - [x] Preserve safe local defaults where appropriate for development and test, but make staging and production examples explicitly non-local so they do not normalize localhost URLs, fallback secrets, or demo credentials.
  - [x] Document any variables that must stay synchronized across surfaces, especially frontend API base URL expectations and backend CORS or issuer settings.

- [x] Add a baseline CI workflow that enforces separate frontend and backend quality gates while respecting the shared-contract dependency chain (AC: 3)
  - [x] Create a repository CI workflow under `.github/workflows/` that installs workspace dependencies once, then runs shared-contract, frontend, and backend verification in clear stages or jobs.
  - [x] Ensure the pipeline covers the real deployment gates already implied by the repo scripts: shared-contract build, app typechecks, lint, frontend tests/build, backend tests/e2e/build, and Prisma client or migration validation.
  - [x] Keep frontend and backend verification separable so the team can later map them onto separate deployment pipelines without losing the shared-contract dependency ordering.
  - [x] Do not rely on undocumented local state in CI; any required database or container setup for backend verification must be explicit in the workflow or the test harness.

- [x] Make backend deployment checks migration-aware and operationally honest instead of assuming a release is safe after TypeScript compilation alone (AC: 2, 3)
  - [x] Add a repeatable backend gate for Prisma readiness, using the existing `apps/handrix-api/prisma/` ownership model and scripts such as `prisma:generate`, `prisma:migrate:deploy`, or another check that proves migrations are valid for deployment.
  - [x] Reconcile this story with the current backend test harness in `apps/handrix-api/test/`, which shells out to `docker` for Postgres-backed tests; either make CI provide that dependency explicitly or narrow the verification strategy deliberately and document the tradeoff in code or workflow comments.
  - [x] Verify that Story 5.2 health/readiness behavior remains usable as a deployment signal and avoid introducing a second, conflicting readiness mechanism.
  - [x] Leave full infrastructure provisioning, secret rotation, and platform-specific deployment manifests out of scope unless a tiny repo-level prerequisite is needed for reliable gates.

- [x] Add focused tests and documentation that prove the new configuration and delivery baseline is real, not aspirational (AC: 1, 2, 3)
  - [x] Add or extend automated tests around frontend env parsing and backend env validation so invalid configuration paths fail deterministically.
  - [x] Add lightweight developer-facing documentation covering how to choose the right env example, which commands act as release gates, and how frontend/backend deployments stay decoupled while sharing contracts.
  - [x] Run and record the verification commands needed for this story, at minimum `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, plus any new CI-only or Prisma-specific checks introduced during implementation.
  - [x] Keep documentation honest about what is and is not automated today; do not imply full CD rollout automation if the story only establishes CI and deployment readiness.

## Dev Notes

- Story 5.3 already gave the API a meaningful typed env surface in `apps/handrix-api/src/config/env.validation.ts`, including production-only secret checks, rate-limit config, and proxy-awareness. Story 5.4 should build on that seam rather than replacing it with `@nestjs/config`, a dotenv abstraction layer, or scattered `process.env` reads.
- The frontend currently has only `apps/handrix-web/src/lib/env.ts` with a simple fallback for `VITE_API_BASE_URL`. That is the biggest remaining typed-config gap in the repo and should be treated as a core part of this story.
- The architecture explicitly says runtime config stays inside each app, with backend validation in `config/env.validation.ts` and frontend validation in `lib/env.ts`. Do not centralize browser and server runtime config into one cross-environment package.
- There is no `.github/workflows/` directory in the repo today. This story is the right place to introduce the first CI workflow rather than assuming one already exists.
- Current root scripts provide a useful baseline:
  - `pnpm typecheck` already forces `@handrix/shared-contracts` to build before app typechecks.
  - `pnpm lint` runs both app lint commands.
  - `./scripts/test.sh` runs frontend tests, backend unit tests, and backend e2e tests.
  - `pnpm build` builds the workspace.
  Story 5.4 should preserve and reuse these entry points where practical so local and CI behavior stay aligned.
- The backend e2e/global setup currently shells out to Docker to provision PostgreSQL. If CI adopts those tests unchanged, the runner must provide Docker access. If the implementation chooses a service-container path or another adjustment, keep the decision explicit and compatible with the existing Postgres-backed test architecture.
- Deployment readiness here means repo-level confidence and environment discipline, not full production infrastructure. Do not introduce Kubernetes manifests, Terraform, or hosting-vendor lock-in unless the smallest possible repo-owned artifact is truly necessary.

### Technical Requirements

- Preserve the monorepo separation:
  - frontend runtime config stays in `apps/handrix-web`
  - backend runtime config stays in `apps/handrix-api`
  - shared schemas remain in `packages/shared-contracts`
- Keep configuration naming and behavior explicit. Avoid hidden fallback chains that make staging or production silently behave like local development.
- Maintain the API bootstrap flow already established in `apps/handrix-api/src/main.ts` and `apps/handrix-api/src/app.bootstrap.ts`; env validation should remain a prerequisite to safe startup, not an afterthought inside individual modules.
- Frontend env parsing must stay browser-safe. Do not expose server-only secrets through `VITE_` variables or broaden the public client env surface without a clear need.
- CI gates must reflect real deployability:
  - shared contracts must be built or checked before dependent app verification
  - backend checks must include Prisma readiness, not just TypeScript compilation
  - frontend and backend jobs should be independently understandable for future split deploys
- Keep Story 5.5 in mind and avoid baking contract validation logic into ad hoc scripts that bypass the shared-contract package or OpenAPI surface.

### Architecture Compliance

- Architecture requires:
  - distinct local, staging, and production environments with typed config validation at startup
  - separate frontend and backend deployment paths
  - simple CI/CD gates for lint, tests, migration checks, and deploy readiness
  - shared-contract alignment across the workspace
- Follow the documented file-organization rule that root contains shared workspace and CI config, while app-specific runtime config stays inside each app.
- Preserve the request-centric modular monolith boundaries. Deployment-readiness changes must not move lifecycle logic or auth rules into CI scripts or config files.
- Reuse the existing health endpoint and observability foundation from Story 5.2 instead of inventing parallel deployment-status plumbing.

### Library / Framework Requirements

- Frontend remains Vite + React with env access through `import.meta.env`.
- Backend remains NestJS 11 with the existing bootstrap/config seams.
- Continue using Prisma as the backend migration/runtime data layer.
- Prefer native repo tooling and GitHub Actions-style YAML for CI unless the repo already has a stronger established alternative.

### File Structure Requirements

- Likely frontend touch points:
  - `apps/handrix-web/src/lib/env.ts`
  - `apps/handrix-web/.env.example`
  - new environment example files under `apps/handrix-web/`
  - frontend tests adjacent to `src/lib/env.ts` if env parsing gains dedicated coverage
- Likely backend touch points:
  - `apps/handrix-api/src/config/env.validation.ts`
  - `apps/handrix-api/src/config/env.validation.spec.ts`
  - `apps/handrix-api/.env.example`
  - new environment example files under `apps/handrix-api/`
  - `apps/handrix-api/package.json` only if an explicit CI/deployment verification script meaningfully improves clarity
- Likely repo-level touch points:
  - `.github/workflows/ci.yml` or equivalent workflow file
  - `package.json`
  - `scripts/bootstrap.sh`
  - `scripts/dev.sh`
  - `scripts/test.sh`
  - `README.md` or a focused deployment/setup doc if one is added
- Avoid these structural mistakes:
  - moving runtime env parsing into `packages/shared-contracts`
  - adding production secrets or real staging URLs to example files
  - creating a CI workflow that skips shared-contract verification but still claims frontend/backend safety
  - introducing deploy scripts that couple frontend release to backend release when the architecture expects separation

### Testing Requirements

- Add deterministic automated coverage for:
  - frontend env validation failures and success cases
  - backend env validation for any new staging/production rules
  - CI-oriented commands or scripts if they encapsulate nontrivial logic
- Verification should cover the actual release gates, not only local unit tests.
- If backend e2e remains Docker-backed, confirm the CI environment supports that path instead of silently omitting those tests.
- Standard verification target for this story:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm --filter handrix-api prisma:generate`
  - any migration-readiness command added by the implementation

### Previous Story Intelligence

- Story 5.1 established Prisma/PostgreSQL and API-owned migration flow. Story 5.4 should turn that into a deployment gate, not redesign the persistence layer.
- Story 5.2 established structured logs, correlation IDs, and `/health` readiness behavior. Story 5.4 should treat those as deployability inputs, not duplicate them.
- Story 5.3 hardened backend env validation, throttling, and secret handling. Story 5.4 should preserve those guarantees while adding environment separation and delivery workflow clarity.
- Across Epic 5 so far, the repo has favored small, explicit seams over framework-heavy abstractions. Continue that pattern here.

### Git Intelligence Summary

- Recent commit messages are too coarse to guide implementation details, so the live repository remains the primary source of truth.
- The current repo state shows:
  - backend env validation already exists and is testable
  - frontend env handling is still minimal
  - root verification scripts already exist and can anchor CI
  - no CI workflow directory exists yet
- That makes the safest implementation path: strengthen app-local env parsing, add environment example files, and layer CI around the existing repo commands plus Prisma-aware checks.

### Project Structure Notes

- Recommended implementation order:
  1. Finalize frontend and backend env validation behavior.
  2. Add environment example files for local, staging, and production in both apps.
  3. Add or refine verification scripts only where they improve clarity.
  4. Introduce CI workflow(s) that call the established commands.
  5. Verify the workflow against the backend’s Postgres/Docker test reality.
- Keep docs concise and colocated with the workflow they describe. A short root `README.md` section or focused deployment-readiness doc is better than a large speculative operations manual.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 5.4: Validate Environment Configuration and Deployment Readiness]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Epic 5: Harden the Platform for Reliable MVP Operations]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Development Workflow Integration]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-1-establish-durable-persistence-and-schema-management.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-2-add-request-centric-observability-and-health-monitoring.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/5-3-enforce-security-rate-limiting-and-data-protection-baselines.md]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/src/config/env.validation.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/.env.example]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/src/lib/env.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-web/.env.example]
- [Source: /home/bogdansaipov/Projects/demos/demo1/apps/handrix-api/test/postgres-jest.global-setup.ts]
- [Source: /home/bogdansaipov/Projects/demos/demo1/scripts/bootstrap.sh]
- [Source: /home/bogdansaipov/Projects/demos/demo1/scripts/dev.sh]
- [Source: /home/bogdansaipov/Projects/demos/demo1/scripts/test.sh]
- [Source: /home/bogdansaipov/Projects/demos/demo1/package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Strengthen app-local env parsing so both frontend and backend validate runtime configuration explicitly and fail early.
- Add environment example files for local, staging, and production without introducing real secrets or vendor lock-in.
- Introduce CI quality gates that preserve shared-contract ordering and verify backend Prisma readiness alongside app checks.
- Keep deployment readiness aligned with the current repo structure, Postgres-backed backend tests, and existing health/observability seams.

### Debug Log References

- 2026-04-22: Selected `5-4-validate-environment-configuration-and-deployment-readiness` as the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2026-04-22: Loaded the BMAD create-story workflow, config, sprint status, Epic 5 planning context, and the latest Epic 5 implementation artifacts for continuity.
- 2026-04-22: Inspected the live repo and confirmed backend env validation exists in `apps/handrix-api/src/config/env.validation.ts`, while frontend env handling is still minimal in `apps/handrix-web/src/lib/env.ts`.
- 2026-04-22: Confirmed the current repo has no `.github/workflows/` directory, making CI workflow introduction part of this story rather than a pre-existing dependency.
- 2026-04-22: Confirmed the existing root verification entry points in `package.json` and `scripts/`, and noted that backend Postgres-backed tests currently require Docker through `apps/handrix-api/test/postgres-jest.global-setup.ts`.
- 2026-04-22: Marked Story 5.4 in progress, added failing frontend/backend env validation coverage, and used those failures to drive the typed env parser and stricter backend startup validation changes.
- 2026-04-22: Added staging and production env example files for both apps, documented the environment strategy in `README.md`, and introduced a GitHub Actions CI workflow with an explicit PostgreSQL service for backend deployment checks.
- 2026-04-22: Added Prisma validation plus CI-specific backend test scripts that run in-band to avoid flaky timeout behavior under CI-style load while preserving the existing local test commands.
- 2026-04-22: Verified the story with `pnpm --filter handrix-web test -- src/lib/env.test.ts`, `pnpm --filter handrix-api test -- src/config/env.validation.spec.ts`, `pnpm --filter handrix-api prisma:generate`, `pnpm --filter handrix-api prisma:validate`, `pnpm --filter handrix-api prisma:migrate:deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm verify:ci` against a temporary PostgreSQL container using staging-style env values.

### Completion Notes List

- Replaced the frontend API base URL fallback with a typed startup parser that validates `VITE_API_BASE_URL` and `VITE_HANDRIX_ENV`, normalizes URLs, and fails fast during app initialization.
- Expanded backend env validation to support `staging` as a deployed environment, reject malformed or localhost-only deployed CORS origins, and require an explicit internal auth issuer outside local/test flows.
- Added `staging` and `production` env example files for both apps and documented how env files, shared contracts, and separate frontend/backend release gates fit together.
- Introduced `.github/workflows/ci.yml` plus repo-level `ci:*` and `verify:ci` scripts so shared-contract, frontend, and backend verification can run independently while still preserving dependency order.
- Added Prisma schema validation and deployment checks to the backend CI path, and switched CI-only backend Jest execution to in-band mode to keep the pipeline reliable under CI resource constraints.
- Verified all story acceptance criteria through focused env tests, repo-wide typecheck/lint/test/build runs, and the aggregate staged `verify:ci` workflow path.

### File List

- README.md
- _bmad-output/implementation-artifacts/5-4-validate-environment-configuration-and-deployment-readiness.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .github/workflows/ci.yml
- apps/handrix-api/.env.production.example
- apps/handrix-api/.env.staging.example
- apps/handrix-api/package.json
- apps/handrix-api/src/config/env.validation.spec.ts
- apps/handrix-api/src/config/env.validation.ts
- apps/handrix-web/.env.example
- apps/handrix-web/.env.production.example
- apps/handrix-web/.env.staging.example
- apps/handrix-web/src/lib/env.test.ts
- apps/handrix-web/src/lib/env.ts
- apps/handrix-web/src/test/setup.ts
- package.json

### Change Log

- 2026-04-22: Implemented Story 5.4, added typed frontend/backend env validation hardening, environment example files, CI/deployment verification scripts, a GitHub Actions workflow, and moved the story to review after successful verification.
