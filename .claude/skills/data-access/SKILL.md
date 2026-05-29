---
name: data-access
description: "Invoke when working with database queries, schema changes, migrations, or data models. Contains project-specific ORM conventions and data access patterns."
---

# Data Access

## Detected
- Database: Prisma
- Schema: prisma → postgresql, 65 models, packages/shared/prisma/schema.prisma

### Library Rules
- Run `prisma generate` after any `schema.prisma` change. The Prisma client is generated code — schema changes require regeneration before the new types are available.
- Scope every user-specific query to the authenticated user. Include `userId` (or equivalent ownership field) in every WHERE clause for user-specific data.
- Never interpolate user input into `$queryRaw` or `$executeRaw`. Use parameterized queries.
- Paginate all list queries. Never return unbounded results from `findMany()`.

## Rules
- Always use the shared `prisma` export from `@langfuse/shared/src/db` (PrismaClientSingleton). Never instantiate new PrismaClient in route handlers or services — each instance opens its own connection pool.
- Wrap multi-step mutations in a transaction. If any step can fail, partial writes corrupt data — all steps succeed or all roll back.
- Avoid querying the database inside loops — use eager loading or joins for related data. Each loop iteration is a separate round trip.
- Select only the fields you need. Avoid fetching entire records when the consumer needs a few columns.
- Always scope data queries to the authorized context (`projectId`). Filter by the authenticated project or organization — don't rely solely on API-layer checks to prevent unauthorized access.
- **Dual database awareness.** Postgres (Prisma) holds transactional data (users, projects, prompts, settings). ClickHouse holds observability data (traces, observations, scores, events). Know which database owns which data. Don't query Postgres for trace analytics or ClickHouse for user settings.
- **ClickHouse queries use parameterized templates** (e.g., `{projectId: String}`) passed via a params dict. Never interpolate user input into ClickHouse query strings. Use the query builder utilities in `packages/shared/src/server/repositories/`.
- **Repository functions in `packages/shared/src/server/repositories/`** handle all data fetching. Call repositories from services or routers, not raw queries from route handlers. Repositories handle both Postgres and ClickHouse queries for their domain.
- **ClickHouse soft deletes.** All ClickHouse queries must account for `is_deleted` flags. Tables use `ReplacingMergeTree(event_ts, is_deleted)` — rows are never physically deleted. Queries that don't filter `is_deleted = 0` will return stale/deleted data.
- **ClickHouse migrations must be added to both directories:** `packages/shared/clickhouse/migrations/clustered/` (for replicated setups using `ON CLUSTER`) and `unclustered/` (for single-node). Both must be kept in sync.

## Gotchas
- Always run `npx prisma generate` after schema changes. The Prisma client is generated code — schema changes are not reflected until regenerated.
- No foreign key between traces and observations in Postgres — this is intentional for out-of-order ingestion. The relationship is enforced in application code.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
