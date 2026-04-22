#!/usr/bin/env bash
set -eu

pnpm --filter handrix-api prisma:generate
pnpm --filter @handrix/shared-contracts build
pnpm --parallel --filter handrix-web --filter handrix-api dev
