<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Product Does

**Detected:** pnpm monorepo, with authentication (NextAuth), database (Prisma → postgresql, 65 models), and AI integration (LangChain). 2164 source files, 289 test files.
**Detected issues:** 1 warning — run `ana scan` for details

Langfuse is an open source LLM engineering platform that gives engineering teams visibility into what their AI applications are doing. Teams instrument their apps (via native SDKs or any OpenTelemetry-compatible instrumentation — no lock-in), and traces flow into Langfuse where they can observe, evaluate, and debug AI behavior.

The core product insight: everything connects through the tracing data. You see a bad output in traces, jump to the playground to iterate on the prompt, run evals to measure the change, build a dataset to prevent regression. It's one loop, not separate tools.

Traditional observability doesn't understand LLM-specific concerns — non-deterministic outputs, prompt versioning, eval loops, multi-step agent traces. Other LLM tools are either closed source with data leaving your infrastructure, or too narrow — just logging without evals or prompt management. Langfuse is the full platform, open source, self-hostable, built on OpenTelemetry.

All product features are MIT-licensed (evals, playground, prompt experiments). Only enterprise security features (SSO, SCIM, audit logs) are commercial. Available as managed cloud or self-hosted via Docker/Kubernetes.

## Architecture

**Detected:** pnpm · 7 packages (web, @langfuse/ee, @repo/eslint-config, @repo/typescript-config, @repo/eslint-plugin)
**Detected surfaces:** web (web, TypeScript, Next.js), worker (worker, TypeScript), shared (packages/shared, TypeScript)
**Detected:** 5 directories mapped: .github/, .vscode/, packages/, scripts/, web/
**Detected deployment:** Docker, GitHub Actions

Langfuse is a pnpm monorepo with three primary packages connected through shared contracts:

- **web** (Next.js, pages router) — UI + tRPC for frontend APIs + public REST API (`pages/api/public/`). 70+ public endpoints covering traces, observations, scores, datasets, prompts, OTel ingestion, and SCIM. Auth via NextAuth with 15+ providers (credentials, Google, GitHub, Okta, Azure AD, custom SSO). tRPC middleware enforces auth, OTel tracing, and error handling at four access levels (public, authenticated, project-scoped, admin).

- **worker** (Express + BullMQ) — 30+ queue processors for async work: ingestion, evaluation execution (LLM-as-judge, code-based), trace/score deletion, analytics integrations (PostHog, Mixpanel), data retention, webhooks, billing metering. Supports sharded queues for horizontal scaling and secondary queues for load shedding during S3 slowdowns.

- **packages/shared** — Domain models, Prisma ORM (Postgres, 65 models), ClickHouse client, queue contracts (Zod-validated payloads), and the repository layer. All queue names and payload schemas are owned here — this is the type-safe contract between web and worker.

**Data flow:** Web validates requests (Zod), writes transactional data to Postgres (Prisma), enqueues jobs to Redis/BullMQ, and reads analytics from ClickHouse. Worker consumes jobs, writes to ClickHouse (ReplacingMergeTree with soft deletes via `event_ts` + `is_deleted`), and stores large payloads in S3.

**Dual database design:** Postgres for transactional data (users, projects, orgs, prompts, API keys, settings). ClickHouse for observability data (traces, observations, scores, events) — columnar, partitioned monthly by `(project_id, toDate(timestamp))`, with bloom filters on frequently queried columns. ClickHouse migrations live in `packages/shared/clickhouse/migrations/{clustered,unclustered}/`.

**Validation:** Zod schemas throughout — co-located with public API types in `web/src/features/public-api/types/`, domain models in `packages/shared/src/domain/`, and queue payloads in `packages/shared/src/server/queues.ts`. Discriminated unions for polymorphic payloads (batch actions, score types).

**Public API contract:** Defined in Fern YAML (`fern/apis/`), auto-generates TypeScript SDK and OpenAPI spec into `generated/`. Never hand-edit generated output.

**EE package** (`ee/`): Enterprise-only features (SSO config, audit logging, billing/Stripe, verified domains, UI customization). License-gated, consumed conditionally by web and worker. Depends on `@langfuse/shared` but isolated from OSS code.

## Where to Make Changes

- **New public API endpoint** → `web/src/pages/api/public/` (REST) + Zod types in `web/src/features/public-api/types/` + Fern spec in `fern/apis/`
- **New tRPC route** → `web/src/server/api/routers/` + register in `web/src/server/api/root.ts`
- **New UI feature** → `web/src/features/{feature-name}/` (components, hooks, utils co-located)
- **New queue/background job** → Define queue name + payload schema in `packages/shared/src/server/queues.ts` → processor in `worker/src/queues/` → register in `worker/src/app.ts`
- **Database schema change (Postgres)** → `packages/shared/prisma/schema.prisma` → `pnpm run db:generate`
- **ClickHouse schema change** → Add migration in `packages/shared/clickhouse/migrations/{clustered,unclustered}/`
- **Domain model change** → `packages/shared/src/domain/` (Zod schemas + inferred types)
- **Repository/query change** → `packages/shared/src/server/repositories/` (handles both Postgres and ClickHouse queries)
- **Enterprise feature** → `ee/src/` + `web/src/ee/features/`
- **Prompt management** → prompts tRPC router + shared domain
- **Evaluation pipeline** → eval queue processors in worker + eval creation in shared

**Active development areas** (high churn, last 30 days): Events repository and table (query/UI refinement), observations API types (V2 expansion), widget/dashboard builder, environment config.

## Key Decisions

- **Dual database (Postgres + ClickHouse):** Transactional data in Postgres, high-volume observability data in ClickHouse. ClickHouse uses ReplacingMergeTree with soft deletes — no hard deletes, which means queries must account for `is_deleted` flags.
- **OpenTelemetry-native ingestion:** OTel protocol support alongside native SDKs, so teams aren't locked into Langfuse-specific instrumentation.
- **Fern for API contracts:** Public API defined in YAML, auto-generates SDKs. Ensures consistency across Python/JS/TS clients.
- **Queue-based architecture:** Web never does heavy processing synchronously. All ingestion, evaluation, deletion, and integration work flows through BullMQ queues with typed Zod payloads.
- **Sharded queues for scale:** Eval execution and trace upsert use multiple shards. Secondary ingestion queues handle load shedding during S3 slowdowns.
- **No foreign key between traces and observations in Postgres:** Allows unordered ingestion — observations can arrive before their parent trace.

## Key Files

- Database schema: `packages/shared/prisma/schema.prisma`
- ClickHouse migrations: `packages/shared/clickhouse/migrations/{clustered,unclustered}/`
- Queue contracts: `packages/shared/src/server/queues.ts`
- Domain models: `packages/shared/src/domain/{traces,observations,scores}.ts`
- Repository layer: `packages/shared/src/server/repositories/{traces,observations,scores,events}.ts`
- Shared barrel export: `packages/shared/src/server/index.ts`
- Auth config: `web/src/server/auth.ts`
- tRPC root router: `web/src/server/api/root.ts`
- tRPC middleware: `web/src/server/api/trpc.ts`
- Worker entry: `worker/src/app.ts`
- Public API types: `web/src/features/public-api/types/`
- Fern API specs: `fern/apis/`
- Environment config: `packages/shared/src/env.ts`
- Deployment config: `web/Dockerfile`
- CI pipeline: `.github/workflows/pipeline.yml`, `.github/workflows/deploy.yml`
- EE license check: `ee/src/ee-license-check/index.ts`

## What Looks Wrong But Is Intentional

- **Missing foreign key on `trace_id` in observations:** Intentional — allows out-of-order ingestion where observations arrive before their parent trace. The relationship is enforced in application code, not the database.
- **ClickHouse migrations in two directories (clustered/unclustered):** Both are needed. Clustered migrations use `ON CLUSTER` for replicated setups; unclustered for single-node. Both must be kept in sync.
- **Start date of 2000-01-01 in data migrations:** Workaround for ClickHouse edge cases with epoch dates. Intentional, not a bug.

## Active Constraints

- **Automations/Monitors** is the newest product surface — heavy active development, not yet stable.
- **MCP server integration** being built out.
- **Code evaluators** just launched alongside existing LLM-as-a-judge.
- **Migrating from legacy tracing IO search** to new full-text search infrastructure (`LANGFUSE_DISABLE_LEGACY_TRACING_IO_SEARCH` flag).
- **Recently open-sourced evals, playground, and prompt experiments** — moving from commercial to MIT is ongoing.
- **ClickHouse data model uses soft deletes** — queries must always account for `is_deleted` flags.
- Active migration from V1 to V2 observations API — V2 uses field groups for partial responses.

## Domain Vocabulary

- **Trace** — Top-level transaction container. Groups observations into a single request/session flow. Has environment, tags, user, session context.
- **Observation** — A discrete unit of work within a trace. 10 types: SPAN (generic timed operation), GENERATION (LLM call with model/tokens/cost), AGENT, TOOL, CHAIN, RETRIEVER, EVENT (leaf node), EVALUATOR, EMBEDDING, GUARDRAIL.
- **Score** — Evaluation result attached to a trace, observation, session, or dataset run. Four data types (NUMERIC, CATEGORICAL, BOOLEAN, TEXT) and three sources (API, EVAL, ANNOTATION). Annotations require a configId except for CORRECTION type.
- **Dataset** — Collection of test items (input/expected output pairs) for benchmarking. Items can be sourced from traces or created manually. Supports versioning via `validFrom`.
- **Prompt** — Versioned prompt template. Centrally managed with labels, tags, config, and commit messages. Referenced by observations via promptId/promptName/promptVersion.
- **Session** — Implicit grouping of traces sharing a sessionId. Represents a user conversation or workflow.
- **Generation** — Observation subtype specifically for LLM calls. Carries model, parameters, token usage, cost details, and pricing tier information.
- **Surface** — (monorepo term) A deployable package with its own test/build/lint commands: web, worker, shared.
- **Field group** — Subset of observation fields requested in V2 API to reduce payload size (core, io, scores, observations, metrics).
