---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

# Coding Standards

## Detected
- Language: TypeScript with Next.js (2164 source files)
- Functions: camelCase (72%, 1150 sampled)
- Classes: PascalCase (90%)
- Files: PascalCase (41%, 750 sampled)
- Imports: relative (100%)
- Indentation: spaces, 2 wide
- Error handling: exceptions (nextjs)
- Data fetching: react-query
- Form handling: react-hook-form
- UI: shadcn/ui (Tailwind)

### Library Rules
- All local imports use `.js` extensions (`import { foo } from "./bar.js"`). TypeScript compiles without them but ESM resolution crashes at runtime.
- Use `import type` for type-only imports, separate from value imports. Prevents runtime imports of pure types.
- This project is primarily Next.js Pages Router. UI rendering, data fetching (`getServerSideProps`), and most API routes use `pages/` directory and `pages/api/`. A small number of API routes use App Router (`web/src/app/api/` — in-app-agent, chatCompletion, stripe-webhook). Don't add new App Router routes without reason — Pages Router is the standard.

## Rules
- Prefer named exports. Default exports only where the framework requires them (e.g., Next.js pages, layouts).
- Use path aliases from tsconfig when configured. Relative imports: never deeper than two levels.
- Avoid `any` — use `unknown` and narrow with type guards. `any` is acceptable only for untyped third-party boundaries. Define an interface for complex types — don't escape the type system.
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Intentional graceful degradation — catching a failure and continuing with a fallback — is fine when the degradation is logged and observable.
- Never hardcode API keys, secrets, database URLs, or credentials. Use environment variables or a secrets manager.
- Avoid disabling lint rules inline. When necessary, add a comment explaining why the disable is required.
- Explicit return types on all exported functions. Internal helpers can use inference.
- Use the project's BaseError hierarchy for typed errors (`UnauthorizedError`, `ForbiddenError`, `LangfuseNotFoundError`, etc. from `@langfuse/shared`). Don't throw raw Error objects or string errors — typed errors enable consistent API response formatting.
- Scope all data queries to the authorized context (`projectId`, `orgId`). A query without ownership scoping is an IDOR vulnerability. The tRPC middleware provides `ctx.session.projectId` — always use it.

## Gotchas
- Primarily Pages Router. Don't default to App Router patterns. Use `pages/api/` for new API routes and `getServerSideProps` for server-side data fetching. The few App Router routes in `web/src/app/api/` are exceptions, not the pattern to follow.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
