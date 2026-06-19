# Derive conversation context from Discord

Conversation Context is derived from recent Discord messages at response time and is not stored as long-term bot memory. The bot may fetch recent DM messages, thread messages, reply-chain messages, or recent guild channel messages depending on the conversation boundary.

Message content, selected context content, prompts, and response text must not be persisted in D1 or logs.
