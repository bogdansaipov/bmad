# Story 1.1: Set Up Initial Project from Starter Template

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product team,
I want the Vite React SPA, NestJS API, and shared contract foundation initialized,
so that all later customer-request stories can be built on a consistent MVP architecture.

## Acceptance Criteria

1. The codebase includes a Vite React TypeScript frontend, a NestJS backend, and a shared package for cross-app contracts, and the workspace structure follows the architecture direction for separated apps and shared code.
2. A developer can run the local setup commands and start both applications in development mode, and the shared package can be imported by both apps without manual copying of types.
3. The repo includes TypeScript configuration, package management, and environment examples for local development, and the foundation does not introduce unused features beyond MVP scope.
4. The backend can expose OpenAPI documentation for the MVP API surface, and the shared foundation supports the agreed response envelope and schema conventions used across apps.

## Tasks / Subtasks

- [ ] Establish the monorepo/workspace foundation and baseline tooling (AC: 1, 3)
  - [ ] Add root workspace files aligned to the architecture: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, and root `.env.example`.
  - [ ] Define root scripts that support bootstrap, dev, build, lint, test, and typecheck workflows without assuming a single-app repository.
  - [ ] Keep the root minimal and avoid pulling in product features, database setup, auth, or deployment-specific logic in this story.
- [ ] Scaffold the frontend and backend applications in the required locations (AC: 1, 2, 3)
  - [ ] Create `apps/handrix-web/` from the Vite React TypeScript starter and trim default demo assets/components that do not fit Handrix MVP scope.
  - [ ] Create `apps/handrix-api/` from the NestJS CLI starter in strict TypeScript mode and preserve the conventional Nest structure needed for later feature modules.
  - [ ] Ensure both apps have local `.env.example` files and app-level scripts for dev/build/test/lint consistent with the workspace.
- [ ] Create the shared package and baseline cross-app contracts (AC: 1, 2, 4)
  - [ ] Create `packages/shared-contracts/` with a clean public export surface and TypeScript build/typecheck support.
  - [ ] Add initial shared contract primitives for the agreed API envelope shape, machine-readable error shape, and starter request/lifecycle schema placeholders using shared Zod schemas where appropriate.
  - [ ] Wire imports so both `handrix-web` and `handrix-api` can consume the shared package through the workspace rather than copied local files.
- [ ] Add backend API foundation for documented contract delivery (AC: 2, 4)
  - [ ] Configure Nest bootstrap to expose Swagger/OpenAPI documentation for the MVP API surface.
  - [ ] Add a minimal health or starter endpoint plus response-envelope handling so the API demonstrates the shared `{ data, meta? }` and `{ error: { ... } }` conventions from day one.
  - [ ] Keep controllers thin and avoid returning raw ORM-like models or ad hoc JSON shapes.
- [ ] Verify the starter foundation end to end (AC: 1, 2, 3, 4)
  - [ ] Confirm workspace install succeeds with the chosen package manager and that both apps start in dev mode from workspace commands.
  - [ ] Confirm the shared package resolves cleanly in both apps at typecheck/build time.
  - [ ] Confirm backend OpenAPI docs are reachable in local development.
  - [ ] Add or retain baseline automated tests for the starter foundation and document any intentionally deferred setup.

## Dev Notes

- This repo is currently documentation-first. No app code, no existing story files, and no Git history were detected during story creation. Treat implementation as greenfield inside the current `/home/bogdansaipov/Projects/demos/demo1` workspace.
- Do not expand scope into customer flow implementation, Prisma/PostgreSQL wiring, auth, dispatch logic, or UI system polish in this story. This story is only the architectural foundation required for later work.
- Prefer the architecture's paired-starter approach over alternative full-stack React setups. The intent is a true SPA frontend plus a separate NestJS API, not a framework-over-framework arrangement.

### Technical Requirements

- Use a separated mobile-first React SPA frontend and NestJS backend. The selected starter direction is Vite + React + TypeScript for `handrix-web` and NestJS CLI for `handrix-api`. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API]
- Use a request-centric modular monolith structure with distinct frontend and backend apps plus a shared contract package. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements]
- Expose a REST-first JSON API in NestJS with OpenAPI docs and consistent response wrappers from the foundation story onward. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements]
- Enforce `snake_case` in persistence and `camelCase` in JSON/TypeScript. Even if persistence is not implemented yet, shared contracts and API responses in this story must follow the `camelCase` side of that rule. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements] [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Maintain separate local, staging, and production environment expectations by establishing typed config entry points and `.env.example` files now, without fully implementing deployment in this story. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements] [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]

### Architecture Compliance

- Align the implementation to the proposed monorepo shape:
  - `apps/handrix-web/`
  - `apps/handrix-api/`
  - `packages/shared-contracts/`
  - root workspace/tooling files such as `pnpm-workspace.yaml` and `tsconfig.base.json`
  - optional shared tooling package area only if needed for lint/type reuse
  [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- Frontend and backend must run independently while sharing contracts through the workspace. Shared package changes must propagate without manual copying. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Development Workflow Integration]
- Controllers should not define ad hoc response shapes that drift from the shared package. Start with envelope helpers/contracts now so later request APIs inherit a stable pattern. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Keep the foundation intentionally slim. Do not add infrastructure such as Redis, WebSockets/SSE, global client state stores, or microservice boundaries. Those are explicitly not part of the MVP foundation. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]

### Library / Framework Requirements

- Package manager/workspace: use `pnpm` workspaces because the architecture tree explicitly centers `pnpm-workspace.yaml`. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns] [Source: https://pnpm.io/workspaces]
- Frontend starter: use the current official Vite React TypeScript starter flow and keep the generated app minimal. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API] [Source: https://vite.dev/guide/]
- Backend starter: use the official Nest CLI path rather than cloning starter repos manually. Prefer a managed CLI invocation such as `npx @nestjs/cli new handrix-api --strict` over relying on a globally installed binary. This is an implementation inference based on Nest's own guidance that `npx` is a reasonable alternative to global installation. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API] [Source: https://docs.nestjs.com/cli/overview]
- Shared validation contracts: use Zod 4 in `packages/shared-contracts` for high-value request and response schemas that both apps can import. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Data Architecture] [Source: https://zod.dev/]
- Frontend follow-on libraries such as React Router and TanStack Query are architecture requirements, but this story only needs the foundation to accommodate them cleanly; do not force full route/query architecture unless needed for starter viability. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Frontend Architecture]

### File Structure Requirements

- Create the apps under `apps/` and the shared contracts under `packages/`; do not flatten the repo or put app code in the root. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- Preserve the expected backend entry points so later stories can add `src/main.ts`, `src/app.module.ts`, `src/config/`, `src/common/`, and feature modules under `src/modules/`. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Preserve the expected frontend entry points so later stories can add `src/main.tsx`, `src/app/`, `src/features/`, `src/components/`, `src/lib/`, and `src/styles/`. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Keep shared contracts focused on schemas/types/index exports. Do not move backend-only concerns such as Prisma or Nest DTO decorators into the shared package. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Data Boundaries]

### Testing Requirements

- Retain or add the starter backend unit/e2e test setup that comes from Nest CLI. This story should not leave the API without a runnable baseline test path. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API]
- Follow the architecture testing pattern of co-located `*.test.ts` / `*.test.tsx` where practical and dedicated `e2e/` locations for end-to-end tests. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- Because later dev workflow requires real tests before completion, add enough baseline coverage to prove workspace wiring, shared-contract imports, and API bootstrap/documentation behavior. Suggested coverage:
  - backend smoke test for app bootstrap or health route
  - shared-contract package test or typecheck proving exports resolve
  - frontend starter test setup if needed to keep the web app aligned with the repo’s testing standard
- Do not let tests depend on future stories' domain logic.

### UX / Product Guardrails

- Even though this story is mostly structural, the frontend foundation must leave room for the UX direction: mobile-first SPA, one-handed use, low cognitive load, and a themeable design-system foundation rather than a rigid visual framework. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Design System Strategy] [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#The overall experience]
- Do not spend this story building finished customer UI flows. The UI requirement here is simply to avoid starter cruft and preserve a clean base for the later Warm Utility / Precision Dispatch visual system. [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Visual Direction Decision]

### Project Structure Notes

- No `project-context.md` file was found, so the planning artifacts are the authoritative source for this story.
- No previous story exists for cross-story learnings; this is the first execution story in Epic 1.
- No Git repository metadata was available from the current workspace, so there is no commit history to mine for implementation patterns.

### References

- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Story 1.1: Set Up Initial Project from Starter Template]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/epics.md#Additional Requirements]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Selected Starter: Paired Foundation of Vite React SPA + NestJS CLI API]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#File Organization Patterns]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/architecture.md#Development Workflow Integration]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Design System Strategy]
- [Source: /home/bogdansaipov/Projects/demos/demo1/_bmad-output/planning-artifacts/ux-design-specification.md#Visual Direction Decision]
- [Source: https://vite.dev/guide/]
- [Source: https://docs.nestjs.com/cli/overview]
- [Source: https://pnpm.io/workspaces]
- [Source: https://zod.dev/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- No project-context file found.
- No prior story files found in `/home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts`.
- `git log` unavailable because the workspace is not currently a Git repository.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story targets the first backlog item from `sprint-status.yaml`.
- Story intentionally constrains implementation to workspace/app/shared-contract foundation only.

### File List

- /home/bogdansaipov/Projects/demos/demo1/_bmad-output/implementation-artifacts/1-1-set-up-initial-project-from-starter-template.md
