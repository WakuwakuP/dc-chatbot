# Deployment

This directory documents the production deployment path for the production packages. `apps/api-spike` is a compatibility/reference spike and is not part of deployment.

The concrete Bot hosting target is still pending; see `docs/deploy/decisions/bot-deploy-target-pending.md` and `apps/bot/deploy/README.md`.

## Deployed components

| Component  | Target                              | Config                                                       |
| ---------- | ----------------------------------- | ------------------------------------------------------------ |
| `apps/api` | Cloudflare Workers                  | `apps/api/wrangler.toml`                                     |
| `apps/web` | Cloudflare Pages                    | `apps/web/wrangler.toml`                                     |
| `apps/bot` | Pending long-running Node.js target | `apps/bot/deploy/README.md`                                  |
| D1         | Cloudflare D1                       | `packages/data/migrations/*.sql` through API Wrangler config |

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
   - reports that Bot deployment is pending when `BOT_DEPLOY_TARGET` is unset
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
5. **Bot deploy placeholder**
   - succeeds only while `BOT_DEPLOY_TARGET` is unset
   - fails if a target is configured before a real target-specific job exists
6. **Smoke check**
   - optional; runs only when `API_SMOKE_URL` and `WEB_SMOKE_URL` are configured
   - checks API `/health` and the Web origin without sending Discord or provider content

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

The Bot Worker deploy target is intentionally pending. Until a target is chosen:

- Do not add platform-specific Bot infrastructure.
- Do not run production Bot deployment from GitHub Actions.
- Do not expose `DISCORD_TOKEN` to local Compose.
- Keep Bot access to API routes through Cloudflare Access Service Token headers.

When a target is selected, update `docs/deploy/decisions/bot-deploy-target-pending.md`, `apps/bot/deploy/README.md`, and `.github/workflows/deploy.yml` in the same change.

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
