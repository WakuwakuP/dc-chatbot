# Select conversation context by Discord conversation boundary

Conversation Context is selected based on Discord conversation boundaries. DMs use recent DM messages, guild threads use thread context, reply chains follow reply references, and normal guild channel mentions use a Context Selection layer over recent channel messages.

Guild normal channel context uses Context Selection LLM for human mentions. Context Selection runs before final Response Decision so the response decision can consider selected context. The trigger message is always included by the API as a forced context item even if the selector does not return it.

DM context uses recent DM messages. Thread context includes the thread starter plus recent thread messages. Reply-chain context follows reply references up to the configured depth. Automated Trigger Sources use trigger-only context and skip Context Selection LLM.

When Context Selection fails, the bot uses a rule-based fallback rather than including all recent channel messages. Fallback-selected content remains transient and is not persisted.
