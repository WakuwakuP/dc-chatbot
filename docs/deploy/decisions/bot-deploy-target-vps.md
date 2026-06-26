# Bot deploy target is a Dockerized dedicated VPS

## Status

Accepted by user instruction.

## Context

`apps/bot` is a long-running Node.js + `discord.js` Bot Worker. It keeps a Discord Gateway connection open and calls the Cloudflare Workers API through Cloudflare Access Service Token headers.

The Web frontend and API Worker are deployed to Cloudflare. The Bot Worker needs a long-running runtime outside Cloudflare Workers, and the selected operation model is a specific operator-controlled VPS running Docker Compose. GitHub Actions updates the repository on the VPS and starts/restarts the Dockerized Bot process.

## Decision

Deploy `apps/bot` to a dedicated VPS through GitHub Actions over SSH and run it with Docker Compose.

The GitHub Actions deploy workflow performs the Bot deployment only when `BOT_DEPLOY_TARGET=vps` is configured. The VPS deployment job:

1. SSHes into the configured VPS using a repository secret private key and pinned `known_hosts` entry.
2. Changes into the configured repository directory.
3. Runs `git fetch --prune origin`.
4. Checks out the configured branch, or the workflow branch when `BOT_VPS_BRANCH` is unset.
5. Runs `git pull --ff-only origin <branch>`.
6. Runs the configured `BOT_VPS_START_COMMAND`.
7. Optionally runs `BOT_VPS_HEALTH_COMMAND` when configured.

The recommended command is:

```text
BOT_VPS_START_COMMAND=docker compose -f apps/bot/deploy/compose.production.yml up -d --build bot
BOT_VPS_HEALTH_COMMAND=docker compose -f apps/bot/deploy/compose.production.yml ps --status running bot
```

`apps/bot/deploy/Dockerfile` builds and checks the Bot package inside Docker, so the VPS host does not need Node.js or pnpm installed directly.

## Runtime constraints

- The container must run with `DC_CHATBOT_ENV=production`.
- The VPS must inject `DISCORD_TOKEN`, `DC_CHATBOT_API_BASE_URL`, `CF_ACCESS_CLIENT_ID`, and `CF_ACCESS_CLIENT_SECRET` locally through `/etc/dc-chatbot/bot.env` or an equivalent Docker secret/env mechanism.
- GitHub Actions does not copy `DISCORD_TOKEN` to the VPS during normal deploy. The production Discord Bot token should already exist on the VPS.
- The Bot Worker must not receive `NVIDIA_NIM_BEARER_TOKEN`; provider credential material stays in the API Worker runtime.
- The Bot Worker must not access D1 directly and must not call the NVIDIA NIM provider backend directly.
- The Bot Worker calls `/api/v1/bot/*` through Cloudflare Access Service Token headers.

## Process supervision

Docker Compose with `restart: unless-stopped` is the baseline process supervision mechanism for the Bot container. The VPS operator is responsible for keeping the Docker daemon running and for configuring host-level boot behavior.

Do not give the deploy user broad passwordless sudo access. If Docker access requires a privileged group, scope it to the deploy user and understand that Docker group membership is effectively host-level privilege.

## Rollout and recovery

The Bot deployment is forward-only at the operation level:

- Prefer a forward-fix commit and redeploy.
- If an urgent revert is necessary, revert through Git history and redeploy; do not mutate production state outside the documented flow without recording the action.
- Keep D1 schema rollback separate from Bot process rollback. Production D1 migrations remain forward-only.

## Privacy/security note

Deployment logs must remain metadata-only. Do not print Discord message content, selected Conversation Context content, prompt body, response text, NVIDIA NIM API key /
bearer token, plaintext credential material, attachment URLs/bytes, or provider raw request/response body.
