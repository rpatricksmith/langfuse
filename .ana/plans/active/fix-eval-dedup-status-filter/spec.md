# Spec: Fix eval job dedup to exclude cancelled and errored executions

**Created by:** AnaPlan
**Date:** 2026-05-28
**Scope:** .ana/plans/active/fix-eval-dedup-status-filter/scope.md

## Approach

The batch dedup query in `createEvalJobs()` fetches all existing job executions for a trace+config combination but does not filter by status. CANCELLED and ERROR jobs are terminal — they will never produce a score — yet they block new job creation forever.

The fix adds a `status: { notIn: [CANCELLED, ERROR] }` clause to the Prisma `findMany` WHERE condition. This means only PENDING, COMPLETED, and DELAYED jobs block dedup. The `notIn` approach is intentional: if a new status is added to the `JobExecutionStatus` enum in the future, it blocks dedup by default (fail-closed), which is the safe behavior.

This aligns with existing patterns in the same file:
- The cancellation path (line 688) already uses status-aware Prisma queries (`status: { not: COMPLETED }`).
- The executor (line 1061) treats CANCELLED as terminal and deletes the record.
- `JobExecutionStatus` is already imported from `@prisma/client` at line 6.

No changes to the observation-level eval path — it uses upsert with deterministic IDs and is unaffected.

## Output Mockups

No user-visible output changes. The fix is internal to the eval scheduling pipeline. The observable behavior change:

**Before fix:**
1. Trace matches evaluator → job created (PENDING)
2. Trace updated, no longer matches → job set to CANCELLED
3. Trace updated again, matches again → **no new job created** (bug)

**After fix:**
1. Trace matches evaluator → job created (PENDING)
2. Trace updated, no longer matches → job set to CANCELLED
3. Trace updated again, matches again → **new job created** (fixed)

Same pattern for ERROR: a trace whose eval failed with ERROR will get a new job on the next trace upsert event.

## File Changes

### `worker/src/features/evaluation/evalService.ts` (modify)
**What changes:** Add `status: { notIn: [JobExecutionStatus.CANCELLED, JobExecutionStatus.ERROR] }` to the `where` clause of the batch dedup query around line 349. This is a single property addition to an existing Prisma `findMany` call.
**Pattern to follow:** The `updateMany` at line 688 which already uses `status: { not: JobExecutionStatus.COMPLETED }` — same style of status-aware Prisma filtering.
**Why:** Without this, CANCELLED and ERROR jobs permanently block re-evaluation for that trace+config combination.

### `worker/src/__tests__/evalService.test.ts` (modify)
**What changes:** Add two new test cases after the existing "cancels a job if the second event deselects" test (line 1256). Both follow the same setup scaffold as that test.
**Pattern to follow:** The existing cancel test at lines 1256–1361 — same helper usage, same assertion style, same timeout.
**Why:** The fix needs proof. AC1 and AC2 each need a dedicated test.

## Acceptance Criteria

- [ ] AC1: A trace-level evaluator whose job was CANCELLED (trace de-selected then re-selected) creates a new job execution when the trace re-matches.
- [ ] AC2: A trace-level evaluator whose job is in ERROR state creates a new job execution when a new trace upsert event arrives.
- [ ] AC3: Existing dedup behavior is preserved — PENDING, COMPLETED, and DELAYED jobs still block new job creation for the same trace+config combination.
- [ ] AC4: The observation-level eval path is not modified (it uses a different dedup mechanism via upsert).
- [ ] AC5: All existing eval tests continue to pass.
- [ ] AC6: No lint errors in modified files.

## Testing Strategy

- **Test 1 — CANCELLED re-match (AC1):** Extend the existing cancel flow. After the trace is deselected and the job is CANCELLED, update the trace to re-match the filter, call `createEvalJobs` again, and assert that a second job execution exists with PENDING status alongside the CANCELLED one.
- **Test 2 — ERROR re-match (AC2):** Create a trace that matches, call `createEvalJobs` to create a PENDING job, then manually update that job's status to ERROR via `prisma.jobExecution.updateMany`. Trigger another trace upsert + `createEvalJobs` and assert a new PENDING job exists alongside the ERROR one.
- **Regression (AC3, AC5):** Existing tests already cover PENDING dedup (duplicate `createEvalJobs` calls) and CANCELLED creation. These must continue to pass unchanged.

## Dependencies

None. `JobExecutionStatus` enum is already imported. No new packages or infrastructure required.

## Constraints

- Do not modify the observation-level eval path (`scheduleObservationEvals.ts`).
- Do not change the cancellation logic (lines 678–701) — only the dedup query.
- The DELAYED status must continue to block dedup (it represents an active retry in progress).

## Gotchas

- **Test infrastructure:** `evalService.test.ts` requires real Postgres and ClickHouse. Tests run with `pnpm run infra:dev:up` or equivalent docker-compose. CI handles this. The test file shows `(0 test)` locally if databases aren't running — this is expected.
- **Queue enqueue in tests:** `createEvalJobs` calls `EvalExecutionQueue.getInstance()` to enqueue. The existing tests already handle this via the OpenAI mock server setup and module-level vi.mock. New tests follow the same pattern — no additional mocking needed.
- **`jobTimestamp` variable:** Declared at file scope (line 65) as `new Date()`. All tests in the file use this shared variable. New tests use it the same way.
- **Prisma `status` field:** `JobExecutionStatus` is a Prisma enum, not a string. Use the enum values from `@prisma/client` for the `updateMany` in the ERROR test setup. However, assertions in existing tests use `.toString()` comparison (e.g., `expect(jobs[0].status.toString()).toBe("CANCELLED")`) — follow that pattern for consistency.
- **Test data isolation:** Each test calls `createOrgProjectAndApiKey()` for a fresh project. No cross-test contamination, but the ERROR test must create its own full fixture set (trace, LLM key, template, config) rather than sharing with the CANCELLED test.

## Build Brief

### Rules That Apply
- Use `import type` for type-only imports, separate from value imports.
- Every catch block must do something deliberate — no empty catches.
- Test behavior, not implementation. Assert on what the code produces.
- Prefer real implementations over mocks. Tests use real Postgres and ClickHouse.
- Assert on specific expected values: `expect(jobs.length).toBe(2)` not `expect(jobs.length).toBeGreaterThan(0)`.
- Commit messages follow Conventional Commits: `fix(evals): description`.

### Pattern Extracts

**Dedup query to modify** (`worker/src/features/evaluation/evalService.ts` lines 340–355):
```typescript
const allExistingJobs =
  configIds.length > 0
    ? await prisma.jobExecution.findMany({
        select: {
          id: true,
          jobConfigurationId: true,
          jobInputDatasetItemId: true,
          jobInputObservationId: true,
        },
        where: {
          projectId: event.projectId,
          jobInputTraceId: event.traceId,
          jobConfigurationId: { in: configIds },
        },
      })
    : [];
```

**Status-aware query pattern** (`worker/src/features/evaluation/evalService.ts` lines 688–700):
```typescript
await prisma.jobExecution.updateMany({
  where: {
    id: existingJob[0].id,
    projectId: event.projectId,
    status: {
      not: JobExecutionStatus.COMPLETED,
    },
  },
  data: {
    status: JobExecutionStatus.CANCELLED,
    endTime: new Date(),
  },
});
```

**Existing cancel test scaffold** (`worker/src/__tests__/evalService.test.ts` lines 1256–1361):
```typescript
test("cancels a job if the second event deselects", async () => {
  const { projectId } = await createOrgProjectAndApiKey();
  const traceId = randomUUID();

  await upsertTrace({
    id: traceId,
    project_id: projectId,
    user_id: "a",
    timestamp: convertDateToClickhouseDateTime(new Date()),
    created_at: convertDateToClickhouseDateTime(new Date()),
    updated_at: convertDateToClickhouseDateTime(new Date()),
  });

  // ... LLM key, template, config setup ...

  await createEvalJobs({
    sourceEventType: "trace-upsert",
    event: payload,
    jobTimestamp,
  });

  // update the trace to deselect the trace
  await upsertTrace({
    id: traceId,
    project_id: projectId,
    user_id: "b",
    // ...
  });

  await createEvalJobs({
    sourceEventType: "trace-upsert",
    event: payload,
    jobTimestamp,
  });

  const jobs = await prisma.jobExecution.findMany({
    where: { projectId },
  });

  expect(jobs.length).toBe(1);
  expect(jobs[0].status.toString()).toBe("CANCELLED");
}, 10_000);
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After modifying `evalService.ts`: `(cd 'worker' && pnpm run lint)` — Expected: clean
- After all changes: `(cd 'worker' && pnpm run test -- --run)` — Expected: 93+ tests pass (evalService tests require database infrastructure)
- Lint: `pnpm --filter worker run lint`

### Build Baseline

- Current tests: 93 passed, 2 skipped (95 total) across 9 passing test files out of 105 (96 fail to load due to local env/import issues, not test failures)
- evalService.test.ts: requires database infrastructure to run — shows 0 tests when DBs unavailable
- Command used: `(cd 'worker' && pnpm run test -- --run)`
- After build: 93+ passed (2 new tests added, but only runnable with DB infrastructure)
- Regression focus: `worker/src/__tests__/evalService.test.ts` — existing cancel and dedup tests
