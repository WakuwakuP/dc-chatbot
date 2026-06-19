# Use two-stage response decisions

The bot uses a two-stage response decision process. Intake performs a preliminary decision and returns whether the Bot Worker should fetch context. The response stream stage performs the final response decision after recent context is available.

This supports guild mention cases where the trigger alone is not enough to decide whether the bot should reply.
