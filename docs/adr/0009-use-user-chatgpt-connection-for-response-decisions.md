# Use effective ChatGPT connection for response decisions

Response Decision and Context Selection provider calls use the triggering user's Effective ChatGPT Subscription Connection. This keeps AI-assisted decision-making under the same delegated subscription model as final response generation.

If no effective connection is available, the bot falls back to rule-based behavior or returns a safe unavailable result rather than using an unrelated global connection.
