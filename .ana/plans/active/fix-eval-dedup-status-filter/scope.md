# Scope: Fix eval job dedup to exclude cancelled and errored executions

**Created by:** Ana
**Date:** 2026-05-28

## Intent

The trace-level eval dedup query in `createEvalJobs()` finds ALL existing job executions for a trace+config combination regardless of status. This means CANCELLED and ERROR jobs permanently block new job creation — traces that re-match an evaluator after cancellation or LLM failure are silently never evaluated. The user wants to fix this bug and contribute it as a PR to the Langfuse project.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — 1 production file, 1 test file, ~5 lines of production change + ~80 lines of test
- **Surface:** worker
- **Files affected:**
  - `worker/src/features/evaluation/evalService.ts` (dedup query)
  - `worker/src/__tests__/evalService.test.ts` (extend existing cancel test + new ERROR test)
- **Blast radius:** Eval job scheduling only. Does not touch eval execution, score writing, queue payloads, or observation-level evals. The observation-level path (`scheduleObservationEvals.ts`) uses upsert with deterministic IDs and is unaffected.
- **Estimated effort:** 1–2 hours including tests
- **Multi-phase:** no

## Approach

Add a status filter to the batch dedup query in `createEvalJobs()` so that only active or successfully completed jobs block new job creation. CANCELLED and ERROR jobs should be excluded from dedup, allowing the trace+config combination to be re-evaluated when a new trace event arrives.

This aligns with the existing design intent: the cancellation path (lines 688–700) transitions jobs to CANCELLED expecting them to be cleared by the executor (line 1063–1068). The status filter closes the timing window where a CANCELLED record blocks re-creation before the executor cleans it up. For ERROR, this provides a recovery path after transient LLM failures without requiring manual database intervention.

## Acceptance Criteria
- AC1: A trace-level evaluator whose job was CANCELLED (trace de-selected then re-selected) creates a new job execution when the trace re-matches.
- AC2: A trace-level evaluator whose job is in ERROR state creates a new job execution when a new trace upsert event arrives.
- AC3: Existing dedup behavior is preserved — PENDING, COMPLETED, and DELAYED jobs still block new job creation for the same trace+config combination.
- AC4: The observation-level eval path is not modified (it uses a different dedup mechanism via upsert).
- AC5: All existing eval tests continue to pass.

## Edge Cases & Risks
- **Race with executor cleanup:** If the executor deletes a CANCELLED record (line 1063–1068) at the same moment a new createEvalJobs runs, there's no conflict — the query just won't find the record. No race condition introduced.
- **Multiple ERROR jobs for same trace+config:** After the fix, if a trace triggers eval, fails (ERROR), triggers again, fails again (ERROR), there could be multiple ERROR records. This is acceptable — the dedup only considers active statuses, and old ERROR records are inert. The evaluator block mechanism (`blockEvaluatorConfigs`) already handles cascading LLM failures at the config level.
- **DELAYED status:** Jobs with DELAYED status are mid-retry with exponential backoff in the eval queue. They should continue to block dedup (they're actively being retried).

## Rejected Approaches

**Delete CANCELLED/ERROR records instead of filtering them out:** Would require additional write operations in `createEvalJobs()` and create a race condition with the executor's own cleanup. The status filter is cheaper and idempotent.

**Filter only CANCELLED (not ERROR):** ERROR jobs also represent a terminal failure state. After BullMQ exhausts retries, the eval is dead. A new trace event should give it another chance. Excluding ERROR from dedup is consistent with the system's existing retry philosophy — `evalQueue.ts` already implements exponential backoff for transient errors, and only sets ERROR for truly failed attempts.

**Modify the observation-level eval path to match:** The observation path uses upsert with deterministic IDs, which inherently handles re-evaluation. No change needed there — it's a different design that already works correctly.

## Open Questions

None — all design decisions are verified against the source code.

## Exploration Findings

### Patterns Discovered
- `evalService.ts`: The dedup is a batch optimization (line 334 comment: "Instead of querying once per config, fetch all at once and filter in-memory"). The status filter adds one more WHERE clause to this batch query.
- `evalQueue.ts` lines 242–257 and 338–352: ERROR status is explicitly set on eval failure, confirming ERROR jobs exist in the database.
- `evalService.ts` line 1061–1068: Executor deletes CANCELLED jobs and returns early. Confirms the system expects CANCELLED to be a terminal, clearable state.
- `observationEvalProcessor.ts` line 121: Observation executor also checks for CANCELLED and ERROR, returning early for both. This confirms both are terminal states.

### Constraints Discovered
- [TYPE-VERIFIED] JobExecutionStatus enum (schema.prisma:1005) — `COMPLETED`, `ERROR`, `PENDING`, `CANCELLED`, `DELAYED`. All 5 statuses must be accounted for in the fix.
- [OBSERVED] Existing test (evalService.test.ts:1300–1361) — covers trace match → de-select → CANCELLED. Stops one step short of the re-match scenario.
- [OBSERVED] The cancellation uses `updateMany` with `status: { not: COMPLETED }` (line 689) — shows status-aware queries are an established pattern in this code path.

### Test Infrastructure
- `worker/src/__tests__/evalService.test.ts` — 3,634 lines, uses Vitest, real Prisma DB, real ClickHouse. Tests import `createEvalJobs` directly and set up traces/configs via helpers. Existing cancel test at line 1300 provides the exact setup scaffold.
- Test helpers: `createOrgProjectAndApiKey`, `createTrace`, `createTracesCh`, `upsertTrace` from `@langfuse/shared/src/server`.

## For AnaPlan

### Structural Analog
`worker/src/__tests__/evalService.test.ts` lines 1280–1361 — the existing cancel+deselect test. The new tests follow the exact same setup pattern, extended by one more trace update + `createEvalJobs` call.

### Relevant Code Paths
- `worker/src/features/evaluation/evalService.ts` lines 340–355 — the dedup query to modify
- `worker/src/features/evaluation/evalService.ts` lines 607–616 — the dedup check that uses the query results
- `worker/src/features/evaluation/evalService.ts` lines 678–701 — the cancellation path (context for understanding the fix)
- `worker/src/queues/evalQueue.ts` lines 242–257 — where ERROR status is set (context for ERROR test)
- `worker/src/__tests__/evalService.test.ts` lines 1280–1361 — existing cancel test to extend

### Patterns to Follow
- The existing `updateMany` at line 688 already uses `status: { not: COMPLETED }` — follow this pattern of status-aware Prisma queries.
- Tests use real database fixtures, not mocks. Follow the existing helper pattern (`createOrgProjectAndApiKey`, `createTrace`, etc.).
- Test naming: descriptive strings like `"should cancel existing eval when trace is deselected"` (line 1281).

### Known Gotchas
- Tests run against real Postgres and ClickHouse — need `pnpm run infra:dev:up` or equivalent. CI handles this automatically.
- The `createEvalJobs` function uses `EvalExecutionQueue.getInstance()` to enqueue. Tests may need to handle or mock this queue. Check how the existing cancel test handles it (it doesn't call createEvalJobs after cancel, so queue behavior wasn't tested).
- `jobTimestamp` (used at line 1329) must be set up — check test setup for the variable declaration.

### Things to Investigate
- Whether the new test for the re-match scenario needs to mock `EvalExecutionQueue.getInstance()` to prevent actual queue enqueue during test. The existing tests that call `createEvalJobs` must already handle this — check the test setup.
