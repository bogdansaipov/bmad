#!/usr/bin/env bash
set -eu

pnpm --filter @handrix/contracts build
pnpm --filter handrix-backend prisma:generate
pnpm --parallel --filter handrix-frontend --filter handrix-backend dev
