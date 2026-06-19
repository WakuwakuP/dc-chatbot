# Store selected context message IDs separately

Selected Conversation Context message IDs will be stored in a separate `selected_context_messages` table instead of embedding JSON in request audit rows. The table stores message IDs and safe metadata only; it must not store message content, selected context content, prompts, attachment URLs, attachment bytes, or response text.

Selected context message metadata is retained for 30 days, even when the parent allowed-user request audit is retained for one year. This separate table makes retention cleanup straightforward and avoids keeping context-selection diagnostics longer than necessary.

The table records the final context message IDs actually sent to the provider, including the forced trigger message. Each row may record a source such as `selector`, `forced_trigger`, `rule_fallback`, `reply_chain`, `thread_starter`, `thread_recent`, `dm_recent`, or `automated_trigger`. It also records only the author's relation to the request, such as `trigger_user`, `bot_self`, `other_allowed`, `non_allowed`, or `automated_source`, rather than storing every context author's Discord user ID.

The table is linked to `request_audits` by request audit ID. It does not duplicate `guildId`; guild-level metadata remains on the parent request audit, and channel IDs are not stored.
