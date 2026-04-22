# Handrix

Handrix is a request-centric MVP foundation built as a monorepo with a Vite React SPA frontend, a NestJS API backend, and a shared cross-app contracts package.

## Workspace

- `apps/handrix-web`: mobile-first React SPA foundation
- `apps/handrix-api`: NestJS API foundation with Swagger and a health endpoint
- `packages/shared-contracts`: shared response envelopes and starter lifecycle contracts

## Commands

- `pnpm bootstrap`: install workspace dependencies and build shared contracts
- `pnpm dev`: build shared contracts, then start web and api in watch mode
- `pnpm build`: build the shared package, web app, and api
- `pnpm lint`: run lint checks for the web and api apps
- `pnpm test`: run the web unit test plus api unit and e2e tests
- `pnpm typecheck`: typecheck the shared package, web app, and api
- `pnpm ci:contracts`: build the shared contracts package for downstream app verification
- `pnpm ci:frontend`: run frontend typecheck, lint, tests, and build with shared contracts prepared
- `pnpm ci:backend`: run Prisma readiness checks plus backend typecheck, lint, tests, e2e, and build
- `pnpm verify:ci`: run the full CI baseline in shared-contract, frontend, then backend order

## Environment Files

- `apps/handrix-web/.env.example`: local frontend settings
- `apps/handrix-web/.env.staging.example`: staging frontend settings
- `apps/handrix-web/.env.production.example`: production frontend settings
- `apps/handrix-api/.env.example`: local backend settings
- `apps/handrix-api/.env.staging.example`: staging backend settings
- `apps/handrix-api/.env.production.example`: production backend settings

Use the matching example for the environment you are targeting. The frontend expects `VITE_HANDRIX_ENV` and `VITE_API_BASE_URL`. The backend expects `HANDRIX_ENV` plus the API/runtime secrets, database URL, and CORS origins that match the same deployment surface. Staging and production examples intentionally use non-local placeholders so deployed environments do not silently inherit localhost behavior or demo credentials.

## Deployment Readiness

Frontend and backend are verified separately so they can deploy independently while still sharing `@handrix/shared-contracts`. The GitHub Actions CI workflow installs dependencies once, validates shared contracts, runs frontend checks with browser-safe env values, and runs backend checks with an explicit PostgreSQL service plus Prisma generation, schema validation, and migration deployment before tests/builds.

## Contract Boundaries

Request lifecycle contracts now live under `packages/shared-contracts/src/requests/`, while runtime lifecycle behavior stays owned by the API under `apps/handrix-api/src/modules/requests/domain/`.

- Add new request payload or response shapes in `packages/shared-contracts` first, then update the Nest controllers and Swagger examples to match.
- Keep lifecycle transitions, terminal-state rules, and public-status derivation inside the backend request domain; frontend code and shared contracts should consume those meanings, not redefine them.
- Extend issue types, guidance copy, or service-area rules through reference-data/config seams before changing lifecycle enums or public status names.
- Use `pnpm --filter handrix-api test:contracts` when changing lifecycle rules or shared API shapes to catch drift between shared schemas and generated OpenAPI docs.
