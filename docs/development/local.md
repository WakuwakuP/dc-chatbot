# Local development

This repository provides a target-neutral local development skeleton for the production packages. `apps/api-spike` remains a compatibility spike and is not part of this workflow.

## Setup

```bash
pnpm install
cp .env.example .env
```

Do not put production Discord Bot tokens, ChatGPT Subscription Connection credential material, prompt bodies, response text, attachment URLs, or provider raw bodies in `.env` or logs.

## Run API and Web

```bash
docker compose up api web
```

- API: <http://localhost:8787/health>
- Web: <http://localhost:5173>

The API container enables `ALLOW_LOCAL_AUTH_BYPASS=true` only for local development. Production deployments must not enable local auth bypass.

## Run the Bot Worker locally

The Bot Worker connects to the real Discord Gateway, so it is behind an explicit Compose profile and dev safety rails.

1. Create a development Discord Application/Bot.
2. Set `DISCORD_DEV_TOKEN` and `DISCORD_DEV_GUILD_ID` in `.env`.
3. Keep `DISCORD_TOKEN` empty locally.
4. Run:

```bash
docker compose --profile bot up bot
```

The Bot Worker refuses to start in local development unless `DC_CHATBOT_ALLOW_DEV_BOT=true`, `DISCORD_DEV_TOKEN`, and `DISCORD_DEV_GUILD_ID` are set. It also refuses `DISCORD_TOKEN` outside production unless `DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN=true` is explicitly set.

## Local D1 migration workflow

The production data layer uses forward-only D1 migrations in `packages/data/migrations`. The current local API skeleton does not require D1 to serve `/health` or metadata-only fake-provider e2e flow.

When a local D1 binding is introduced, apply migrations in filename order and do not design down migrations as the primary rollback path. Forward-fix with a new migration instead.

## Quality gates

Before handing off changes, run:

```bash
pnpm check
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:e2e
pnpm build
```
