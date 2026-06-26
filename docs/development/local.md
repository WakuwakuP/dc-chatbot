# Local development

This repository provides a target-neutral local development skeleton for the production packages. `apps/api-spike` remains a compatibility/reference spike and is not part of this workflow.

## Setup

```bash
pnpm install
cp .env.example .env
```

If `.env.example` is unavailable in your checkout, create a local `.env` with only development values. Do not put production Discord Bot tokens, production NVIDIA NIM API keys, prompt bodies, response text, attachment URLs, or provider raw bodies in `.env` or logs. Real local NVIDIA NIM testing may use a developer-only NVIDIA NIM bearer token in an uncommitted local secret file.

## Run API and Web

Docker Compose:

```bash
docker compose up api web
```

Host process:

```bash
pnpm dev
```

The host launcher uses a small terminal UI. Press `q` or `Ctrl+C` in that terminal to stop all child services together.

- API: <http://localhost:8787/health>
- Web: <http://localhost:5173>

The API container runs `wrangler dev --local` with a local D1 database (`dc-chatbot-local`). On startup it applies forward-only migrations from `packages/data/migrations` and seeds a development Owner row that matches the default Web dev auth headers.

The API container enables the local-only auth bypass with `DC_CHATBOT_ENV=development`, `ALLOW_LOCAL_AUTH_BYPASS=true`, and `LOCAL_AUTH_BYPASS_SECRET`. Compose provides a safe local default via `${LOCAL_AUTH_BYPASS_SECRET:-local-auth-bypass-secret}`. The root `pnpm dev` launcher reads root `.env` once and syncs local API values such as `LOCAL_AUTH_BYPASS_SECRET`, `LLM_PROVIDER`, and NVIDIA NIM provider settings into `apps/api/.dev.vars` for `wrangler dev`; it also passes `.env` values to Web/Bot child processes. Set matching `VITE_LOCAL_AUTH_BYPASS_SECRET`, `VITE_DEV_ACCESS_SUBJECT`, and `VITE_DEV_OWNER_DISCORD_USER_ID` there when running on the host. Local callers using the bypass must send an `x-dev-auth-secret` header with the same value. Production deployments use `apps/api/wrangler.toml`, which keeps `ALLOW_LOCAL_AUTH_BYPASS=false`; production also disables/refuses the bypass even if local-only settings are supplied accidentally.

### Local D1

Local D1 state is stored under `apps/api/.wrangler/` (gitignored). To reset local data, stop Compose and remove that directory.

Host-only API development:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @dc-chatbot/api dev:prepare
pnpm --filter @dc-chatbot/api dev
```

When running `pnpm --filter @dc-chatbot/api dev` directly, put local API provider settings in `apps/api/.dev.vars`. The root `pnpm dev` launcher does this sync from root `.env` automatically.

If you change `VITE_DEV_ACCESS_SUBJECT` or `VITE_DEV_OWNER_DISCORD_USER_ID` for the Web UI, update the matching row in `owner_discord_users` or edit `apps/api/scripts/seed-local-d1.sql` and rerun `pnpm --filter @dc-chatbot/api d1:seed:local`.

## Run the Bot Worker locally

The Bot Worker connects to the real Discord Gateway, so it remains behind an explicit Compose profile.

1. Create a development Discord Application/Bot.
2. Set development-only Bot values in `.env`:
   - `DC_CHATBOT_ALLOW_DEV_BOT=true`
   - `DISCORD_DEV_TOKEN`
   - `DISCORD_DEV_GUILD_ID`
   - `DISCORD_DEV_ALLOWED_USER_IDS`
3. For host `pnpm dev:all`, also set local service values in `.env`:
   - `DC_CHATBOT_API_BASE_URL=http://127.0.0.1:8787`
   - `CF_ACCESS_CLIENT_ID=local-dev-client-id`
   - `CF_ACCESS_CLIENT_SECRET=local-dev-client-secret`
   - `LOCAL_AUTH_BYPASS_SECRET=local-auth-bypass-secret`
4. Keep `DISCORD_TOKEN` empty locally.
5. Run with Docker Compose or host processes:

```bash
docker compose --profile bot up bot
pnpm dev:all
```

Local Compose intentionally passes `DISCORD_TOKEN` as an empty value so a production token from the host shell is not forwarded into the Bot container.

The Bot Worker refuses to start in local development unless `DC_CHATBOT_ALLOW_DEV_BOT=true`, `DISCORD_DEV_TOKEN`, `DISCORD_DEV_GUILD_ID`, and `DISCORD_DEV_ALLOWED_USER_IDS` are set. It also refuses `DISCORD_TOKEN` outside production unless `DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN=true` is explicitly set; Compose sets that flag to `false`.

## Local D1 migration workflow

The production data layer uses Drizzle ORM and hand-written forward-only D1 migrations in `packages/data/migrations`.

When using local D1, apply migrations in filename order and do not design down migrations as the primary rollback path. Forward-fix with a new migration instead.

Example remote production command for operator reference:

```bash
wrangler d1 migrations apply dc-chatbot-production --remote --config apps/api/wrangler.toml
```

For local development, replace the database name/config with the local Wrangler target you created. Do not use `apps/api-spike` migrations as production migrations.

## Docker Compose services

`docker-compose.yml` provides:

- `api` — runs `pnpm --filter @dc-chatbot/api dev` on port `8787` with local auth bypass.
- `web` — runs `pnpm --filter @dc-chatbot/web dev` on port `5173` after API health check passes.
- `bot` — optional `bot` profile; uses a development Discord Bot token and calls API at `http://api:8787`.

Compose health checks use Node.js `fetch` and do not log Discord message content, Conversation Context content, prompt body, response text, attachment URLs, credentials, or provider raw bodies.

## Local provider configuration

Prefer the default fake provider for local development:

```bash
LLM_PROVIDER=fake
```

When real NVIDIA NIM testing is necessary, use uncommitted local values only:

```bash
LLM_PROVIDER=nvidia_nim
NVIDIA_NIM_BEARER_TOKEN=
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

`NVIDIA_NIM_BEARER_TOKEN` is NVIDIA NIM API key material. Do not store it in D1, logs, frontend state, Bot Worker runtime configuration, docs examples, fixtures, snapshots, committed `.env` files, or shared shell history.

## Quality gates

Before handing off changes, run the closest relevant checks. For operations/deployment docs and workflows, at minimum run:

```bash
pnpm format:check
```

For broader changes, run:

```bash
pnpm check
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```
