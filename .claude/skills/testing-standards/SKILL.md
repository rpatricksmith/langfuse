---
name: testing-standards
description: "Invoke when writing tests, reviewing test quality, or setting up test infrastructure. Contains project-specific testing framework conventions, fixture patterns, and coverage expectations."
---

# Testing Standards

## Detected
- Framework: Vitest, Playwright, Testing Library (289 test files)
- Test command: pnpm run test -- --run
- Testing patterns: vitest
- Test location: co-located with source

### Library Rules
- Always pass `--run` flag when invoking Vitest in CI or non-interactive contexts. Vitest defaults to watch mode, which hangs pipelines waiting for input.

## Rules
- Test behavior, not implementation. Assert on what the code returns or produces — not which internal functions it calls. Tests should survive refactoring when behavior is unchanged.
- Prefer real implementations over mocks. Mock only what you can't control: network calls, time, randomness. Every mock is a lie about how the system actually behaves.
- Cover the error path, not just the happy path. For each feature test, write at least one test for invalid input, missing data, or service failure.
- Assert on specific expected values from real inputs. `expect(status).toBe(200)` not `expect(status).toBeDefined()`. A test that passes regardless of whether the feature works catches nothing.
- Never weaken a test to make it pass. If a test fails, fix the code or fix the expectation — never broaden assertions or catch exceptions to force green.
- Use scoped test data helpers (`createOrgProjectAndApiKey`, `createTrace`, `createTracesCh`) instead of manual org/project setup. Manual setup risks leaking state across test runs and causing flaky failures.
- Tests use real Postgres and ClickHouse databases, not mocks. MSW (Mock Service Worker) is used for external HTTP calls only.
- Test files use `.servertest.ts` suffix for server-side integration tests.

## Gotchas
- Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments.
- Tests require running database infrastructure (`pnpm run infra:dev:up` or docker-compose). Test files show `(0 test)` locally if databases aren't running — this is expected.
- Tests pass individually but fail when run together — mock from one test bleeds into another. Call `vi.restoreAllMocks()` in `afterEach`.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
