# Deployment skeleton

Deployment is intentionally a skeleton. The concrete Bot deploy target is pending; see `docs/deploy/decisions/bot-deploy-target-pending.md`.

## CI

`.github/workflows/ci.yml` runs:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:e2e
pnpm build
```

## Deploy preflight policy

`.github/workflows/deploy.yml` is target-neutral and must run preflight before any deployment.

When required secrets or target variables are not configured, the workflow should guide the operator and skip deployment before invoking platform deploy commands.

Required configuration placeholders:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `BOT_DEPLOY_TARGET` (intentionally unset until a target is chosen)
- Bot runtime secrets for the selected target

## Safety rules

Deployment and runtime logs must not include:

- Discord message content
- selected Conversation Context content
- prompt body
- response text
- plaintext credential material
- ChatGPT credential history
- attachment URLs or bytes
- provider raw request/response body

Only safe metadata should appear in logs: IDs, actor type, event type, status/error category, model, duration, request ID, provider call ID, counts, sizes, and retention cleanup target timestamps.
