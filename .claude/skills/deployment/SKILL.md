---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

# Deployment

## Detected
- Platform: Docker
- Config: web/Dockerfile
- CI: GitHub Actions

## Rules
- Push to main auto-deploys to staging (staging.langfuse.com). Production is a separate promotion — main is promoted to the `production` branch via `promote-main-to-production.yml` workflow or `pnpm run release:cloud` (runs preflight checks first).
- CI runs lint, typecheck, tests for web/worker/shared, Playwright E2E, and Docker build on every PR. All must pass via the `all-ci-passed` gate before merge.
- Open source Docker releases use version tags via `release.yml` workflow. Multi-platform builds (amd64 + arm64) published to GHCR and Docker Hub.
- Env vars: add to `.env.dev.example` and `packages/shared/src/env.ts`. Features must work in both Langfuse Cloud (ECS) and self-hosted Docker environments.

## Gotchas
- Staging environment needs manual migration application for DB schema changes — merging a migration PR doesn't automatically apply it to staging.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
