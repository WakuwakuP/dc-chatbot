# Local development

This repository provides a target-neutral local development skeleton for the production packages. `apps/api-spike` remains a compatibility/reference spike and is not part of this workflow.

## Setup

```bash
pnpm install
cp .env.example .env
```

If `.env.example` is unavailable in your checkout, create a local `.env` with only development values. Do not put production Discord Bot tokens, ChatGPT Subscription Connection credential material, prompt bodies, response text, attachment URLs, or provider raw bodies in `.env` or logs.

## Run API and Web

```bash
docker compose up api web
```

- API: <http://localhost:8787/health>
- Web: <http://localhost:5173>

The API container enables the local-only auth bypass with `DC_CHATBOT_ENV=development`, `ALLOW_LOCAL_AUTH_BYPASS=true`, and `LOCAL_AUTH_BYPASS_SECRET`. Compose provides a safe local default via `${LOCAL_AUTH_BYPASS_SECRET:-local-auth-bypass-secret}`. Local callers using the bypass must send an `x-dev-auth-secret` header with the same value. Production deployments use `apps/api/wrangler.toml`, which keeps `ALLOW_LOCAL_AUTH_BYPASS=false`; production also disables/refuses the bypass even if local-only settings are supplied accidentally.

## Run the Bot Worker locally

The Bot Worker connects to the real Discord Gateway, so it remains behind an explicit Compose profile.

1. Create a development Discord Application/Bot.
2. Set `DISCORD_DEV_TOKEN` and `DISCORD_DEV_GUILD_ID` in `.env`.
3. Keep `DISCORD_TOKEN` empty locally.
4. Run:

```bash
docker compose --profile bot up bot
```

Local Compose intentionally passes `DISCORD_TOKEN` as an empty value so a production token from the host shell is not forwarded into the Bot container.

The Bot Worker refuses to start in local development unless `DC_CHATBOT_ALLOW_DEV_BOT=true`, `DISCORD_DEV_TOKEN`, and `DISCORD_DEV_GUILD_ID` are set. It also refuses `DISCORD_TOKEN` outside production unless `DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN=true` is explicitly set; Compose sets that flag to `false`.

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
