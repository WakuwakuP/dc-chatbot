# Deployment

This directory documents the production deployment path for the production packages. `apps/api-spike` is a compatibility/reference spike and is not part of deployment.

For the detailed operator runbook, see `docs/deploy/github-actions-cloudflare-vps.md`.

## Deployed components

| Component  | Target                | Config / runbook                                      |
| ---------- | --------------------- | ----------------------------------------------------- |
| `apps/api` | Cloudflare Workers    | `apps/api/wrangler.toml`                              |
| `apps/web` | Cloudflare Pages      | `apps/web/wrangler.toml`                              |
| `apps/bot` | Docker Compose on VPS | `apps/bot/deploy/README.md`                           |
| D1         | Cloudflare D1         | `packages/data/migrations/*.sql` through API Wrangler |

## CI

`.github/workflows/ci.yml` runs the repository quality gates:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm check
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

## Deploy workflow

`.github/workflows/deploy.yml` is manual (`workflow_dispatch`) and runs these stages:

1. **Deploy preflight**
   - verifies required GitHub Secrets and Variables are present
   - verifies production Wrangler config does not enable `ALLOW_LOCAL_AUTH_BYPASS=true`
   - verifies `LLM_PROVIDER=nvidia_nim`
   - validates VPS deploy configuration when `BOT_DEPLOY_TARGET=vps`
2. **Apply D1 migrations**
   - checks the forward-only migration policy
   - patches the D1 binding from GitHub Variables
   - applies `packages/data/migrations` to remote D1 before application deploy
3. **Deploy API Worker**
   - builds `@dc-chatbot/api`
   - deploys `apps/api/wrangler.toml`
   - uploads Worker secrets without printing values after the Worker exists
4. **Deploy Web Pages**
   - builds `@dc-chatbot/web` with `VITE_API_BASE_URL`
   - deploys `apps/web/dist` to Cloudflare Pages
5. **Deploy Bot on VPS**
   - runs only when `BOT_DEPLOY_TARGET=vps`
   - connects to the configured VPS using SSH and pinned `known_hosts`
   - runs `git fetch`, `git checkout`, `git pull --ff-only`, and the configured Docker Compose start command
   - optionally runs the configured VPS health command
6. **Smoke check**
   - optional; runs only when `API_SMOKE_URL` and `WEB_SMOKE_URL` are configured
   - checks API `/health` and the Web origin without sending Discord or provider content

If `BOT_DEPLOY_TARGET` is unset, API/Web/D1 deploy still runs and the Bot deploy job is skipped.

## Cloudflare setup checklist

1. Create or select the Cloudflare account.
2. Create the D1 database for production:

   ```bash
   wrangler d1 create dc-chatbot-production
   ```

3. Record the D1 database name and ID in GitHub Actions Variables.
4. Create the API Worker name and Web Pages project.
5. Configure the API Worker route/custom domain and the Web Pages custom domain.
6. Configure Cloudflare Access:
   - Owner human access protects the Web app and `/api/v1/owner/*` routes.
   - Bot service access protects `/api/v1/bot/*` routes with a Cloudflare Access Service Token.
7. Add the required GitHub Secrets and Variables from `docs/deploy/secrets.md`.
8. Run the deploy workflow manually.
9. Verify smoke checks and Cloudflare logs contain metadata only.

## VPS Bot setup checklist

1. Prepare a dedicated VPS deploy/runtime user.
2. Install Docker Engine, Docker Compose plugin, Git, and OpenSSH server.
3. Clone the repository into the configured `BOT_VPS_APP_DIR`, for example `/srv/dc-chatbot`.
4. Configure the production Bot runtime environment on the VPS, not in the repository:
   - `DC_CHATBOT_ENV=production`
   - `DISCORD_TOKEN`
   - `DC_CHATBOT_API_BASE_URL`
   - `CF_ACCESS_CLIENT_ID`
   - `CF_ACCESS_CLIENT_SECRET`
   - optional `DC_CHATBOT_MODEL`
5. Ensure the Bot runtime does not receive `NVIDIA_NIM_BEARER_TOKEN`, local auth bypass variables, or development Bot variables.
6. Configure Docker Compose deploy commands. Recommended values:
   - `BOT_VPS_START_COMMAND=docker compose -f apps/bot/deploy/compose.production.yml up -d --build bot`
   - `BOT_VPS_HEALTH_COMMAND=docker compose -f apps/bot/deploy/compose.production.yml ps --status running bot`
7. Configure SSH deploy secrets and variables from `docs/deploy/secrets.md`.
8. Set `BOT_DEPLOY_TARGET=vps` to enable the GitHub Actions VPS job.

Detailed VPS setup is in `apps/bot/deploy/README.md` and `docs/deploy/github-actions-cloudflare-vps.md`.

## D1 migration policy

Production data layer decisions are:

- Drizzle ORM + hand-written D1 SQL migrations live in `packages/data`.
- Migrations are forward-only.
- Do not add down migrations.
- Do not rely on rollback by reverting schema.
- Use a new forward-fix migration for production schema corrections.
- Take/export a production backup before applying risky migrations.

The deploy workflow applies D1 migrations before API/Web deploy. If migration application fails, deployment stops.

For local or manual inspection, use the same production migration directory:

```bash
wrangler d1 migrations apply dc-chatbot-production --remote --config apps/api/wrangler.toml
```

Replace `dc-chatbot-production` with the actual configured D1 database name.

## Local auth bypass production rule

`ALLOW_LOCAL_AUTH_BYPASS=true` is allowed only in local development through `docker-compose.yml` and `apps/api/src/local-dev.ts`.

Production deployments must keep `ALLOW_LOCAL_AUTH_BYPASS=false` or unset. The deploy preflight fails if `apps/api/wrangler.toml` enables it.

Do not create a production Worker variable or secret that enables local auth bypass.

## Bot deployment status

The Bot Worker deployment target is the configured dedicated VPS. The deploy workflow does not copy production Discord credentials to the VPS; those secrets must already be present in the VPS-local service environment or secret store.

The Bot Worker keeps the existing boundaries:

- It does not access D1 directly.
- It does not receive the NVIDIA NIM API key / bearer token.
- It does not call the provider backend directly.
- It calls `/api/v1/bot/*` through Cloudflare Access Service Token headers.

## Safety rules

Deployment and runtime logs must not include:

- Discord message content
- selected Conversation Context content
- prompt body
- response text
- NVIDIA NIM API key / bearer token
- plaintext credential material
- attachment URLs or bytes
- provider raw request/response body

Only safe metadata should appear in logs: IDs, actor type, event type, status/error category, model, duration, request ID, provider call ID, counts, sizes, and retention cleanup target timestamps.
