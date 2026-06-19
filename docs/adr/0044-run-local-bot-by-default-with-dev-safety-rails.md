# Run local bot by default with dev safety rails

Docker Compose local development will start API, Web, and Bot services by default. Because the Bot service connects to the real Discord Gateway, local development must use a dedicated development Discord Application/Bot Token rather than the production bot token.

Local bot behavior is further restricted by a development guild allowlist and a development DM user allowlist. Guild messages are processed only in allowed development guilds, and DMs are processed only from explicitly allowed development Discord user IDs. This preserves one-command local startup while reducing the risk of the local bot reacting in production or unrelated Discord contexts.
