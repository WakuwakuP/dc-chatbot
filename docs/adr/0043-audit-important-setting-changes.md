# Audit important setting changes as metadata

The bot will store metadata audit records for important setting and administration changes for one year. Audited changes include owner role or status changes, notification target changes, registered member status changes, assigned owner connection changes, model setting changes, prompt setting metadata changes, and connection status changes.

Audit records should include who changed the setting, when it changed, the setting category, and safe before/after identifiers or non-secret values. They must not store secrets, credential material, message content, selected conversation context, response text, or prompt body history.
