# Ignore automated Discord sources by default

Messages from other Discord bots and webhooks will not be included in Conversation Context and will not trigger responses by default. The bot's own prior responses are the only automated messages included as context, because they are needed for conversation continuity.

Admin Owners may explicitly allow automated trigger sources by Discord user or application ID. This supports intentional integrations while reducing the risk of bot-to-bot loops, noisy automated notifications, and accidental responses to unrelated bot output.

The MVP management UI will include a minimal Settings screen for automated trigger sources: add/remove an allowed Discord user or application ID and choose the assigned Owner Discord User whose ChatGPT Subscription Connection is used for that source.

Allowed automated trigger sources have `active` or `disabled` state. Admin Owners can add sources and configure assignment. Regular Owners can view and disable sources assigned to their own connection, but cannot add sources or reassign them.

Allowed automated trigger sources use trigger-only context. They do not use Context Selection LLM, do not use Response Decision LLM, and do not process image or text attachments in the MVP. Their trigger message content may be used transiently, but surrounding automated messages and attachments are ignored.

Each source has a reply mode: `reply`, `channel_message`, or `none`. The default reply mode is `reply`, so the Settings UI should warn about loop risk. To reduce loops, sources have a source-specific cooldown, applied per source and channel. The default cooldown is 60 seconds, with a valid range of 10 to 3600 seconds. Cooldown-suppressed triggers are ignored and retained as 30-day metadata audit records without storing content.
