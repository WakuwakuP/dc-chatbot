# Send message content to intake

The Bot Worker sends the triggering message content to the intake endpoint. The API needs current message content to evaluate triggers, direct usage attempts, candidate attempts, and preliminary response decisions.

The content is processed transiently. It must not be stored in D1, logs, audit records, or owner notifications.
