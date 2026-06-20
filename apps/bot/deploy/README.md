# Bot deployment placeholder

The concrete production hosting target for `apps/bot` is intentionally pending. See `docs/deploy/decisions/bot-deploy-target-pending.md`.

Until that decision is made, this directory documents the target-neutral deployment contract instead of adding platform-specific infrastructure.

## Runtime contract

The Bot Worker is a long-running Node.js process that connects to Discord Gateway and calls the Cloudflare Workers API through Cloudflare Access Service Token headers.

Required production environment variables for the eventual target:

- `DC_CHATBOT_ENV=production`
- `DISCORD_TOKEN`
- `DC_CHATBOT_API_BASE_URL`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`
- `DC_CHATBOT_MODEL` (optional; defaults in code while the provider adapter is still being completed)

Production runtime must not receive:

- `DISCORD_DEV_TOKEN`
- `DISCORD_DEV_GUILD_ID`
- `DC_CHATBOT_ALLOW_DEV_BOT=true`
- `DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN=true`

## Safety requirements for the future target

Before enabling a real Bot deploy job, document and implement:

- secret injection for the Discord Bot token and Cloudflare Access Service Token
- process supervision/restart policy
- metadata-only logging controls
- network egress expectations for Discord and the API origin
- rollout/forward-fix policy
- smoke check that does not send Discord message content, prompt body, response text, attachment URLs, or provider raw bodies

The GitHub Actions deploy workflow currently treats `BOT_DEPLOY_TARGET` as pending. If the variable is set before a target-specific job exists, the placeholder job fails instead of pretending to deploy the Bot Worker.
