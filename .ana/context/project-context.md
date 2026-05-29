<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Project Does

**Detected:** pnpm monorepo, with authentication (NextAuth), database (Prisma → postgresql, 65 models), and AI integration (LangChain). 2164 source files, 289 test files.
**Detected issues:** 1 warning — run `ana scan` for details

Langfuse Is Doubling Down On Open Source

*What does this product do? Who uses it? What problem does it solve?*

## Architecture

**Detected:** pnpm · 7 packages (web, @langfuse/ee, @repo/eslint-config, @repo/typescript-config, @repo/eslint-plugin)
**Detected surfaces:** web (web, TypeScript, Next.js), worker (worker, TypeScript)
**Detected:** 5 directories mapped: .github/, .vscode/, packages/, scripts/, web/
**Detected deployment:** Docker, GitHub Actions

*How is the codebase organized and why? What are the layer boundaries?*

## Where to Make Changes

*Common tasks and where to find the relevant code. What files are entry points for what kind of work?*

## Key Decisions

*Technology choices and patterns that look wrong but are intentional. What was tried and rejected?*

## Key Files

- Database schema: `packages/shared/prisma/schema.prisma`
- Deployment config: `web/Dockerfile`
- CI pipeline: `.github/workflows/_deploy_ecs_service.yml`, `.github/workflows/_notify_slack_failure.yml`, `.github/workflows/cla-assistant.yml` + 17 more

*Add: database client location, auth config, AI wrapper, shared types, test helpers.*

## What Looks Wrong But Is Intentional

*Patterns that seem wrong for this stack but are deliberate. Anti-intuitive decisions with rationale.*

## Active Constraints

*Current priorities. Areas under active refactoring. Features not to touch right now.*

## Domain Vocabulary

*Terms with project-specific meaning. E.g., "workspace" = pnpm workspace package, not Slack workspace.*
