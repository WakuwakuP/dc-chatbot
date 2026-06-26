# Ignore non-members and notify the owner

When a Discord user who is not allowed tries to use the bot, the bot will not reply to that user. It will record or update the user as a Candidate Discord User. Owner Notifications by DM are sent only for non-allowed direct messages to the bot, not for guild channel messages and not for every visible candidate. Non-allowed guild channel messages are visible through management metadata and retained as 30-day request audit records. The MVP rate-limits DM notifications to once per candidate per 24 hours, with room to add a future global notification cap if abuse becomes a problem.

Owner Notification history is retained for 30 days. This is long enough for recent operational review and rate-limit enforcement while avoiding long-term retention of non-member usage attempts.
