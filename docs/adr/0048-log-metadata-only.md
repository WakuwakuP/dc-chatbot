# Log metadata only

Bot Worker and API Worker logs must be structured metadata logs only. Logs may include identifiers, actor type, event type, status or error category, model name, duration, and request or provider call IDs.

Logs must not include Discord message content, selected Conversation Context content, prompts, response text, credential material, attachment bytes, attachment URLs, provider raw request bodies, or provider raw response bodies. Error objects and stack traces must be sanitized before logging or returning to avoid leaking sensitive values.
