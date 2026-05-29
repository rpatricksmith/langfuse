---
name: troubleshooting
description: "Invoke when debugging failures, diagnosing unexpected behavior, or investigating test failures. Contains project-specific failure modes, diagnostic workflows, and known issues."
---

# Troubleshooting

## Detected

### Common Issues
- **Hydration error: "Text content does not match server-rendered HTML"** — Find the component that renders differently on server vs client. Common causes: `Date.now()`, `Math.random()`, browser-only APIs.
- **Type errors after schema changes: "PrismaClient is not generated"** — Run `npx prisma generate` after any `schema.prisma` change.
- **Tests hang indefinitely** — Vitest defaults to watch mode. Pass `--run` flag.

## Rules
- **Primarily Pages Router, not App Router.** This is Next.js 14 with pages router for UI and most APIs. A few API routes use App Router (`web/src/app/api/` — in-app-agent, chatCompletion, stripe-webhook) but these are exceptions. New contributors constantly assume App Router — `getServerSideProps`, `pages/api/` routes, and `_app.tsx` are the correct default patterns.
- **tRPC for internal frontend APIs, Fern-generated REST for external APIs.** Two completely different API systems. tRPC routes (`web/src/server/api/routers/`) serve the frontend via React Query. Public REST endpoints (`web/src/pages/api/public/`) serve external clients (SDKs, integrations). Don't add tRPC routes for things that should be public REST endpoints, or vice versa.
- **ee/ folder has different licensing — it is NOT MIT.** Accidentally moving MIT code into `ee/` or referencing `ee/` code from the OSS side changes licensing implications. Keep the boundary clean. OSS code must never import from `@langfuse/ee`.
- **CLA bot gets stuck sometimes after signing.** Known cla-assistant bug. Comment `/check-cla` on the PR to retrigger it.
- **Staging environment needs manual migration application for DB schema changes.** You can't just merge a migration PR and expect staging to pick it up automatically. Apply migrations explicitly after deploy.
- **ClickHouse query failures with memory/timeout errors.** `ClickHouseResourceError` wraps memory limit, overcommit tracker, and timeout errors. The fix is reducing query scope or paginating — not retrying. Check query complexity and data volume.
- **ClickHouse migrations must exist in both `clustered/` and `unclustered/` directories.** Missing one silently breaks the other deployment mode. Always add to both and keep them in sync.
- **Use `createOrgProjectAndApiKey()` or `createOrgProjectAndUser()` test helpers** instead of manual org/project setup in tests. Manual setup risks leaking state across test runs and causing flaky failures.

## Gotchas
- CI fails with unusual errors? Check if you're running against the wrong database. Tests use separate Postgres (`langfuse_test`) and Redis (database 1) for isolation.

## Examples
*Not yet captured. Add diagnostic workflows showing how to investigate common failures.*
