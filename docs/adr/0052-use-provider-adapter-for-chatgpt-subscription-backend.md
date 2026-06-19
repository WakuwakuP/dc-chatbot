# Use a provider adapter for the ChatGPT subscription backend

The API will call the ChatGPT/Codex subscription-backed backend through a provider adapter interface instead of coupling the bot workflow directly to one concrete implementation. The initial implementation targets a ChatGPT/Codex subscription connector, but the rest of the system should depend on adapter operations such as connection, refresh, generation, vision-capable generation, and safe error mapping.

This boundary is necessary because subscription-backed ChatGPT access has compatibility and maintenance risk compared with a stable public API. The adapter should be pragmatic rather than over-generalized, but it must keep provider-specific protocol details, token handling, and error mapping out of Discord bot workflow code.
