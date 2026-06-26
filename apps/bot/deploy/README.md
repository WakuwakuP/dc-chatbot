# Bot deployment to VPS with Docker Compose

`apps/bot` is deployed as a long-running Node.js + `discord.js` process on a dedicated VPS. GitHub Actions connects to the VPS over SSH, pulls the repository, and runs a Docker Compose start command.

See also `docs/deploy/github-actions-cloudflare-vps.md` and `docs/deploy/decisions/bot-deploy-target-vps.md`.

## Runtime contract

The Bot Worker connects to Discord Gateway and calls the Cloudflare Workers API through Cloudflare Access Service Token headers.

Required production environment variables on the VPS:

- `DC_CHATBOT_ENV=production`
- `DISCORD_TOKEN`
- `DC_CHATBOT_API_BASE_URL`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`
- `DC_CHATBOT_MODEL` (optional; defaults in code while the provider adapter is still being completed)

Production runtime must not receive:

- `DISCORD_DEV_TOKEN`
- `DISCORD_DEV_GUILD_ID`
- `DISCORD_DEV_ALLOWED_USER_IDS`
- `DC_CHATBOT_ALLOW_DEV_BOT=true`
- `DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN=true`
- `NVIDIA_NIM_BEARER_TOKEN`
- `ALLOW_LOCAL_AUTH_BYPASS=true`
- `LOCAL_AUTH_BYPASS_SECRET`

## VPS setup

Recommended layout:

```text
/srv/dc-chatbot         # Git checkout used as Docker build context
/etc/dc-chatbot/bot.env # VPS-local runtime secrets, not committed
```

Initial setup on the VPS:

```bash
git clone <repository-url> /srv/dc-chatbot
cd /srv/dc-chatbot
docker compose -f apps/bot/deploy/compose.production.yml build bot
docker compose -f apps/bot/deploy/compose.production.yml up -d bot
```

Use the actual repository URL and avoid placing secrets in shell history.

## Docker Compose production file

The committed `apps/bot/deploy/compose.production.yml` builds `apps/bot/deploy/Dockerfile` from the repository root and reads runtime secrets from `/etc/dc-chatbot/bot.env`.

The production env file is outside the repository and must be created on the VPS. Example names only:

```text
DC_CHATBOT_ENV=production
DISCORD_TOKEN=<production Discord Bot token>
DC_CHATBOT_API_BASE_URL=<Cloudflare API origin>
CF_ACCESS_CLIENT_ID=<Cloudflare Access Service Token client ID>
CF_ACCESS_CLIENT_SECRET=<Cloudflare Access Service Token client secret>
DC_CHATBOT_MODEL=<optional default model override>
```

Do not put `NVIDIA_NIM_BEARER_TOKEN` in this file. Provider credential material belongs only to the API Worker runtime.

## GitHub Actions variables for VPS deploy

Set `BOT_DEPLOY_TARGET=vps` to enable the VPS Bot deploy job.

Required VPS variables:

- `BOT_VPS_APP_DIR`, for example `/srv/dc-chatbot`
- `BOT_VPS_START_COMMAND`, recommended:

  ```bash
  docker compose -f apps/bot/deploy/compose.production.yml up -d --build bot
  ```

Optional VPS variables:

- `BOT_VPS_BRANCH`, defaults to the workflow branch when unset
- `BOT_VPS_PORT`, defaults to `22` when unset
- `BOT_VPS_HEALTH_COMMAND`, recommended:

  ```bash
  docker compose -f apps/bot/deploy/compose.production.yml ps --status running bot
  ```

Required VPS secrets:

- `BOT_VPS_HOST`
- `BOT_VPS_USER`
- `BOT_VPS_SSH_PRIVATE_KEY`
- `BOT_VPS_KNOWN_HOSTS`

The workflow does not upload `DISCORD_TOKEN` to the VPS. Keep production Discord and Cloudflare Access Service Token runtime secrets in the VPS-local environment file or secret store.

## GitHub Actions deploy steps

When `BOT_DEPLOY_TARGET=vps`, `.github/workflows/deploy.yml` runs:

1. SSH to the configured VPS with strict host key checking.
2. `cd` into `BOT_VPS_APP_DIR`.
3. `git fetch --prune origin`.
4. `git checkout <branch>`.
5. `git pull --ff-only origin <branch>`.
6. `BOT_VPS_START_COMMAND`.
7. Optional `BOT_VPS_HEALTH_COMMAND`.

The recommended start command builds the Docker image and starts the Bot container. The Dockerfile runs `pnpm --filter @dc-chatbot/bot build` inside the image build, so the VPS host does not need Node.js or pnpm installed directly.

## Safety requirements

- Deployment logs must remain metadata-only.
- Do not print `DISCORD_TOKEN`, Cloudflare Access Service Token secret, NVIDIA NIM API key / bearer token, Discord message content, Conversation Context content, prompt body, response text, attachment URLs/bytes, or provider raw request/response body.
- The Bot Worker must not access D1 directly.
- The Bot Worker must not call the NVIDIA NIM provider backend directly.
- The Bot Worker must not receive `NVIDIA_NIM_BEARER_TOKEN`.
- The Bot Worker must call `/api/v1/bot/*` through Cloudflare Access Service Token headers.

## Troubleshooting

- SSH failure: verify `BOT_VPS_HOST`, `BOT_VPS_USER`, `BOT_VPS_PORT`, `BOT_VPS_SSH_PRIVATE_KEY`, and `BOT_VPS_KNOWN_HOSTS`.
- Pull failure: remove local uncommitted changes from the VPS checkout or recreate the checkout.
- Docker build failure: verify Docker/Compose, network access, lockfile consistency, and Bot package build errors.
- Container start failure: inspect Docker Compose output and the VPS-local `/etc/dc-chatbot/bot.env` file.
- Health failure: inspect `docker compose ps` and metadata-only container logs.
