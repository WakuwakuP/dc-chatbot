# Support NVIDIA NIM as an LLM provider

Status: Superseded by ADR 0059 for provider strategy and credential model.

The API may use NVIDIA NIM for response generation through the provider adapter boundary when `LLM_PROVIDER=nvidia_nim` is configured. The Bot Worker still calls only `/api/v1/bot/*`; provider-specific protocol, bearer token handling, and safe error mapping stay in `packages/provider`.

This is a generation-backend option, not a replacement for Owner / Registered Member authorization. The API still resolves or validates the Effective ChatGPT Subscription Connection before generation so the existing private-bot access boundary remains explicit.

NVIDIA NIM credential material must be configured as a Cloudflare secret such as `NVIDIA_NIM_BEARER_TOKEN`, never stored in D1, frontend state, logs, request audit, provider audit, or documentation examples. Provider request and response bodies remain transient and must not be logged or persisted.

The accepted trade-off is that model execution can use a stable OpenAI-compatible NIM endpoint while the product language and connection lifecycle still describe ChatGPT Subscription Connection authorization. If NIM becomes the primary product model rather than an implementation option, the domain language and connection model should be revisited in a later ADR.
