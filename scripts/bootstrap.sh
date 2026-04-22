#!/usr/bin/env bash
set -eu

pnpm install
pnpm --filter handrix-api prisma:generate
pnpm --filter @handrix/shared-contracts build
