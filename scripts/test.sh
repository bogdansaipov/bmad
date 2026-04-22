#!/usr/bin/env bash
set -eu

pnpm --filter handrix-api prisma:generate
pnpm --filter @handrix/shared-contracts build
pnpm --filter handrix-web test
pnpm --filter handrix-api test:ci
pnpm --filter handrix-api test:e2e:ci
