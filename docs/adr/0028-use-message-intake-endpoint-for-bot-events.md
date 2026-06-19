# Use message intake endpoint for bot events

The Bot Worker sends relevant Discord message events to `/api/v1/bot/messages/intake`. The intake endpoint performs membership checks, candidate updates, owner notification decisions, idempotency handling, request audit creation, and preliminary response decisions.

This makes the API the source of truth for whether a Discord event should be ignored or proceed to context fetching and response generation.
