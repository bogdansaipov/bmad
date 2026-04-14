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
