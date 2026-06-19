# Record visible message authors as candidates

The bot records visible human Discord message authors as Candidate Discord Users when they are not already allowed, across guilds and channels visible to the bot. Candidate records keep identity and display snapshots such as Discord user ID, username snapshot, display name snapshot, avatar URL snapshot, first seen time, and last seen time. The MVP does not provide a guild-level opt-out for candidate discovery.

Candidate records must not store message content, selected context content, prompts, response text, guild location, or channel location. Candidate state expires after 30 days from last observation, but the underlying `discord_users` row remains as the observed Discord user ledger. The MVP does not include hard delete for `discord_users`; candidate state, member status, and owner status are managed separately.
