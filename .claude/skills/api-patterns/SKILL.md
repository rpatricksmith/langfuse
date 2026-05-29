---
name: api-patterns
description: "Invoke when implementing API routes, request handling, middleware, or error responses. Contains validation, error format, route architecture, and authorization patterns."
---

# API Patterns

## Detected
- Framework: Next.js
- Validation: zod (95%)
- Auth: NextAuth

### Library Rules
- Verify Stripe webhook signatures using `stripe.webhooks.constructEvent()` with the raw body and signing secret. Never trust webhook payloads without signature verification — they can be forged.
- Use `.safeParse()` instead of `.parse()` for user input validation in public API routes. `.parse()` throws on invalid input — `.safeParse()` returns a result object with typed errors, enabling structured 400 responses. Use `.parse()` for internal contracts (queue payloads, domain models) where invalid data is a bug, not user error.
- This project uses Pages Router. API routes live in `pages/api/` as handler functions, not `app/` route handlers.

## Rules
- Validate all input at the API boundary. Parse request bodies, query params, and path params with Zod before any processing.
- Return a consistent error response shape from every endpoint: `{ error: string, message: string }` with appropriate HTTP status code. Never leak stack traces, database errors, or internal paths in production responses. BaseError subclasses (`UnauthorizedError`, `ForbiddenError`, `LangfuseNotFoundError`, `MethodNotAllowedError`) map to specific HTTP codes.
- Keep route handlers thin. Validation, then service call, then response. Business logic and data access belong in separate modules.
- Verify the requesting user owns the requested resource. An authenticated user should not access another user's data by changing an ID in the URL.
- **Two API systems — don't mix them.** tRPC routes (`web/src/server/api/routers/`) serve the frontend via React Query. Public REST endpoints (`web/src/pages/api/public/`) serve external clients (SDKs, integrations, Fern-generated). Internal features use tRPC. Anything external clients consume uses REST with Fern specs.
- Public REST endpoints authenticate via `ApiAuthService.verifyAuthHeaderAndReturnScope()` which returns a scope object. Always check scope level — reject bearer/org keys for project-scoped endpoints with `ForbiddenError`.
- Apply rate limiting on public endpoints using `RateLimitService.getInstance().rateLimitRequest()`. Rate limits protect against abuse and are enforced per API key.
- Public API types live in `web/src/features/public-api/types/` as Zod schemas. Domain models live in `packages/shared/src/domain/`. Don't duplicate — import and extend.

## Gotchas
- Don't add tRPC routes for things external clients should consume, or public REST endpoints for internal UI features. The boundary is: tRPC = internal frontend, REST = external SDKs/integrations.
- Always verify webhook signatures before processing Stripe events.
- PrismaException errors must be caught separately and return a generic 500 — never expose Prisma error details to clients.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
