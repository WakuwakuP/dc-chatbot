# Use targeted D1 indexes and core foreign keys

The initial D1 schema will include indexes for the main query paths rather than only unique constraints or excessive indexing. Required index areas include owner/member lookup, candidate `lastSeenAt` and attempted-candidate ordering, audit date ranges for usage graphs, connection owner/status lookup, automated trigger source lookup, and retention cleanup queries.

Discord snowflake IDs are stored as TEXT to avoid JavaScript number precision problems. General row IDs for audit, event, and settings records use ULID text IDs. Timestamps are stored as ISO 8601 UTC text.

Foreign keys are used for core lifecycle tables where referential integrity is important: owners, registered members, candidate Discord users, assigned owner references, automated trigger sources, and ChatGPT connections. Audit and diagnostic metadata tables are more cautious with foreign keys because they have independent retention periods and may outlive or be decoupled from operational state.

The `discord_users` table is the observed Discord user ledger. Candidate TTL deletes candidate state, not the underlying `discord_users` row. The MVP does not include hard delete for `discord_users`; if privacy deletion or anonymization is needed later, it should be designed as a dedicated data-removal feature that accounts for audit and operational metadata.
