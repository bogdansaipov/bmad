#!/usr/bin/env bash
set -eu

pnpm install
pnpm --filter @handrix/shared-contracts build
