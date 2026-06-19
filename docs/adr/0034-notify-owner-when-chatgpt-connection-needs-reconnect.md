# Notify the owner when ChatGPT connection needs reconnect

When a ChatGPT Subscription Connection enters `needsReconnect`, the bot will notify the connection-owning Owner Discord User by DM and show the connection status in the management web app. Notifications should be rate-limited per connection, and registered members should receive only a generic unavailable message rather than detailed credential state.

If an Owner uses the bot without a connection, Discord should show a Japanese connection CTA with the management web link. If a Registered Member's assigned Owner connection is unavailable because the connection is missing, needs reconnect, revoked, or the assigned Owner is disabled, the member receives one generic Japanese unavailable message and no internal connection details. If an Automated Trigger Source's assigned connection is unavailable, the bot does not reply in Discord to avoid automated loops.

`needsReconnect` and initial missing-connection cases may notify the affected connection owner. `revoked` does not trigger repeated use-time notifications because it is an explicit owner action. Admin Owners can manually send a reconnect reminder DM to the connection owner, rate-limited to once per connection per hour.
