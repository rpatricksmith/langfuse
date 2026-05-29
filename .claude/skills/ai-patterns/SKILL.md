---
name: ai-patterns
description: "Invoke when building features that call LLM APIs, handling AI responses, managing prompts, or integrating AI SDKs. Contains error handling, security, prompt management, and observability patterns."
---

# AI Patterns

## Detected
- AI SDK: LangChain (used for Langfuse's own AI features — playground, evals, prompt testing — not just as an integration dependency)

## Rules
- All LLM calls go through the `fetchLLMCompletion` service in worker. Configure retry, timeout, and error handling once — not per-call. This service handles provider abstraction across OpenAI, Anthropic, Gemini, and other models.
- ChatML adapters in `packages/shared/src/utils/chatml/adapters/` handle model-specific message formatting (OpenAI, LangGraph, Gemini, etc.). When adding a new model provider, add an adapter — don't special-case in the caller.
- Never interpolate raw user input into system prompts. User content goes in user messages with clear role boundaries. System instructions stay immutable.
- Treat all LLM output as untrusted. Validate and sanitize before using in database queries, HTML rendering, or business logic.
- Handle LLM errors by type: retry rate limits with backoff, truncate input for context overflow, log content filter triggers, fail gracefully for API outages. The `fetchLLMCompletion` service handles timeouts — check `fetchLLMCompletionTimeout.test.ts` for expected behavior.
- Use structured output (JSON mode, tool_use) for data extraction. Never regex-parse free-text LLM responses for application data. Tool extraction utilities live in `web/src/utils/chatml/extractTools.ts`.
- Centralize prompt templates — don't scatter prompt strings across business logic. Prompts should be versionable, testable, and reviewable independently. Langfuse's own prompt management features (versioning, labels, config) apply to its own prompts too.
- Log model, token count, and latency per LLM call. Langfuse instruments its own LLM calls via `getInternalTracingHandler` for dogfooding observability.

## Gotchas
- LangChain appears in dependencies but is used for Langfuse's product features (playground evals, LLM-as-a-judge), not as a general-purpose framework dependency. Don't add LangChain abstractions for new features unless they specifically involve multi-model orchestration.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
