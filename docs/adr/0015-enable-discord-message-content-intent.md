# Enable Discord Message Content Intent

The Bot Worker will enable Discord Message Content Intent because the bot must handle DMs, mentions, contextual replies, and non-application-command message events.

Message content may be processed transiently to generate responses, select context, and make response decisions, but it must not be stored in D1 or logs.
