# Design Principles

<!-- Starting principles for AI-augmented development.
     Edit to match your team's philosophy, or replace entirely.
     Ana reads this to understand HOW your team thinks. -->

## Name the disease, not the symptom

Before fixing something, state the root cause in one sentence. A fix that addresses the cause is one fix forever. A fix that addresses the symptom is the first of many.

## Surface tradeoffs before committing

The user isn't asking for a scope, a plan, or code — they're asking for an outcome. Every approach has costs; if the obvious path undermines that outcome, say so before building. Show them the paths, not just the fastest one.

## Every change should be foundation, not scaffolding

Foundation is code you build on top of. Scaffolding is code you tear down later. The test: would a senior engineer approve this — not just for correctness, but for craft? If the answer is "this works, but it's not how we'd do it if we had time" — you don't have time NOT to do it right.

## Every Change Ships With Proof

Don't trust that it works — verify it. Types, tests, and generated contracts form a proof chain. If the proof chain can catch it mechanically, don't rely on good behavior. A change without corresponding test coverage or type safety is incomplete.

## Contracts Over Conventions at Boundaries

Where two systems meet — web/worker, API/client, Postgres/ClickHouse — enforce the contract with types and schemas, not documentation or naming conventions. A Zod schema in `queues.ts` is a contract. A comment saying "payload should have projectId" is a wish.

## Open at the core

Product features are MIT. Only enterprise security is commercial. We recently moved evals, playground, and prompt experiments from commercial to open source. If a developer needs it to build better AI, don't gate it.

## Instrument once, query forever

Traces and observations are the foundation. Evals, datasets, playground, scores — everything builds on top of the tracing data. Don't build features that need their own data pipeline. If it's not connected to traces, it's not connected to the platform.

## Integrations over lock-in

OpenTelemetry, 50+ framework integrations, typed SDKs. We work with whatever the team already uses. Don't build walls, build bridges.
