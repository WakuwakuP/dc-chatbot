# Deployment secrets and variables

Do not commit secret values. Configure these names in GitHub Actions, Cloudflare dashboards, and the VPS-local secret store only.

## GitHub Actions Secrets

| Name                          | Used by                        | Purpose                                                                                                                  |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`        | Deploy workflow                | Cloudflare API token with permission to deploy Workers/Pages, manage Worker secrets, and apply D1 migrations.            |
| `CLOUDFLARE_ACCOUNT_ID`       | Deploy workflow                | Cloudflare account ID. Treat as deployment-sensitive metadata.                                                           |
| `CF_ACCESS_CLIENT_ID`         | API Worker secret, Bot runtime | Cloudflare Access Service Token client ID used by the Bot Worker for `/api/v1/bot/*`.                                    |
| `CF_ACCESS_CLIENT_SECRET`     | API Worker secret, Bot runtime | Cloudflare Access Service Token client secret used by the Bot Worker for `/api/v1/bot/*`.                                |
| `NVIDIA_NIM_BEARER_TOKEN`     | API Worker secret              | NVIDIA NIM API key value used as the provider `Authorization: Bearer ...` token. Never expose it outside API runtime.    |
| `BOT_VPS_HOST`                | Bot VPS deploy                 | Cloudflare Tunnel SSH hostname, for example `ssh.chatbot.waku.dev`. Required only when `BOT_DEPLOY_TARGET=vps`.          |
| `BOT_VPS_USER`                | Bot VPS deploy                 | SSH deploy user for the Bot VPS. Required only when `BOT_DEPLOY_TARGET=vps`.                                             |
| `BOT_VPS_SSH_PRIVATE_KEY`     | Bot VPS deploy                 | Private SSH key used by GitHub Actions to connect to the Bot VPS through Cloudflare Tunnel. Required for VPS deploy.     |
| `BOT_VPS_KNOWN_HOSTS`         | Bot VPS deploy                 | Pinned `known_hosts` entry for the Tunnel SSH hostname and VPS SSH host key. Required only when `BOT_DEPLOY_TARGET=vps`. |
| `CF_TUNNEL_SSH_CLIENT_ID`     | Bot VPS deploy                 | Cloudflare Access Service Token client ID for `ssh.chatbot.waku.dev`. Required only when `BOT_DEPLOY_TARGET=vps`.        |
| `CF_TUNNEL_SSH_CLIENT_SECRET` | Bot VPS deploy                 | Cloudflare Access Service Token client secret for `ssh.chatbot.waku.dev`. Required only when `BOT_DEPLOY_TARGET=vps`.    |

Do not store `DISCORD_TOKEN` in GitHub Actions for the normal VPS pull-and-start deployment flow. Configure it on the VPS-local service environment or secret store.

## GitHub Actions Variables

| Name                            | Used by                 | Purpose                                                                                                                                       |
| ------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_WORKER_NAME`               | API deploy              | Optional Worker name override. Defaults to `dc-chatbot-api` when unset.                                                                       |
| `CF_ACCESS_TEAM_DOMAIN`         | API deploy/API Worker   | Cloudflare Access team domain for Owner route JWT JWKS lookup, for example `team.cloudflareaccess.com`.                                       |
| `CF_ACCESS_AUD`                 | API deploy/API Worker   | Cloudflare Access application audience tag required in `Cf-Access-Jwt-Assertion` for `/api/v1/owner/*` routes.                                |
| `CF_BOT_ACCESS_AUD`             | API deploy/API Worker   | Cloudflare Access application audience tag required for `/api/v1/bot/*` Service Token JWT verification.                                       |
| `CLOUDFLARE_D1_DATABASE_NAME`   | D1 migration/API deploy | Production D1 database name.                                                                                                                  |
| `CLOUDFLARE_D1_DATABASE_ID`     | API deploy              | Production D1 database ID patched into `apps/api/wrangler.toml` during deployment.                                                            |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Web deploy              | Cloudflare Pages project name for `apps/web`.                                                                                                 |
| `VITE_API_BASE_URL`             | Web build               | Public API origin used by the Owner UI build.                                                                                                 |
| `LLM_PROVIDER`                  | API deploy/API Worker   | Set to `nvidia_nim` for production provider calls. Local development may use `fake`.                                                          |
| `NVIDIA_NIM_BASE_URL`           | API deploy/API Worker   | Optional override for the NVIDIA NIM OpenAI-compatible base URL. Omit to use the provider adapter default.                                    |
| `API_SMOKE_URL`                 | Smoke check             | Public or Access-compatible API origin. The workflow checks `${API_SMOKE_URL}/health`.                                                        |
| `WEB_SMOKE_URL`                 | Smoke check             | Web origin checked after Pages deploy.                                                                                                        |
| `BOT_DEPLOY_TARGET`             | Bot VPS deploy          | Set to `vps` to enable Bot deploy to the configured VPS. Leave unset to skip Bot deploy.                                                      |
| `BOT_VPS_APP_DIR`               | Bot VPS deploy          | Repository checkout path on the VPS, for example `/srv/dc-chatbot`. Required when `BOT_DEPLOY_TARGET=vps`.                                    |
| `BOT_VPS_START_COMMAND`         | Bot VPS deploy          | Start/restart command on the VPS, for example `docker compose -f apps/bot/deploy/compose.production.yml up -d --build bot`. Required for VPS. |
| `BOT_VPS_BRANCH`                | Bot VPS deploy          | Optional branch to checkout on the VPS. Defaults to the workflow branch when unset.                                                           |
| `BOT_VPS_PORT`                  | Bot VPS deploy          | Optional SSH port. Defaults to `22` when unset.                                                                                               |
| `BOT_VPS_HEALTH_COMMAND`        | Bot VPS deploy          | Optional post-start health command, for example `docker compose -f apps/bot/deploy/compose.production.yml ps --status running bot`.           |

## Cloudflare Access Owner route JWT verification

Owner human routes under `/api/v1/owner/*` require a verified Cloudflare Access JWT from the `Cf-Access-Jwt-Assertion` request header unless the hardened local development bypass is valid in a non-production environment.

Configure these GitHub Actions variables before production deploy:

- `CF_ACCESS_TEAM_DOMAIN`: the Access team domain used to fetch JWKS from `https://<team-domain>/cdn-cgi/access/certs`. Use the host name such as `team.cloudflareaccess.com`; an `https://` URL with no path is also accepted by the Worker.
- `CF_ACCESS_AUD`: the Cloudflare Access application audience tag that must be present in the Owner route JWT `aud` claim.
- `CF_BOT_ACCESS_AUD`: the Cloudflare Access application audience tag that must be present in the Bot route Service Token JWT `aud` claim.

If either value is missing or invalid, Owner route authentication fails closed with `401 unauthorized`. The forwarded `cf-access-authenticated-user-email` header is not trusted by itself.

## Cloudflare Access Service Token

Create a Cloudflare Access Service Token for the Bot Worker. Use its client ID and client secret in two places:

1. API Worker secrets: `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`.
2. Bot runtime secrets on the VPS-local service environment or secret store.

The Bot Worker must call `/api/v1/bot/*` with Cloudflare Access Service Token headers. It must not access D1, NVIDIA NIM API key material, bearer tokens, or provider backends directly.

## NVIDIA NIM provider credential

The production provider credential is the NVIDIA NIM API key. The API Worker reads it from `NVIDIA_NIM_BEARER_TOKEN` and passes it to the provider adapter as bearer-token material for NVIDIA NIM requests.

Configure the token as a Cloudflare Worker secret and, where deployment automation uploads Worker secrets, as a GitHub Actions secret. Do not configure it as a public Pages variable, Wrangler plain text `vars` entry, `.env` value committed to the repository, D1 row, frontend state, Bot runtime value, test fixture, docs example, issue, PR comment, or log output.

`LLM_PROVIDER=nvidia_nim` selects the NVIDIA NIM provider. `NVIDIA_NIM_BASE_URL` is optional and should remain unset unless an operator intentionally needs to override the default OpenAI-compatible NVIDIA NIM endpoint. The base URL is not credential material, but treat it as deployment-sensitive configuration.

If `NVIDIA_NIM_BEARER_TOKEN` is missing, empty, malformed, revoked, or rejected by the provider, the API must fail with a safe provider/configuration error category. It must not return or log the token, provider raw request body, provider raw response body, prompt body, selected Conversation Context content, or response text.

## Bot VPS runtime secrets

The Bot VPS needs production runtime secrets locally. Do not commit them and do not upload them through the normal GitHub Actions pull-and-start deploy job.

Required VPS-local Bot runtime values:

- `DC_CHATBOT_ENV=production`
- `DISCORD_TOKEN`
- `DC_CHATBOT_API_BASE_URL`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`
- optional `DC_CHATBOT_MODEL`

The Bot VPS must not receive `NVIDIA_NIM_BEARER_TOKEN`, D1 credentials, local auth bypass variables, or development Bot variables.

## Rotation and revocation

Rotate the NVIDIA NIM API key through the provider account and Cloudflare Worker secret flow:

1. Create a replacement NVIDIA NIM API key outside the repository.
2. Upload it as the new `NVIDIA_NIM_BEARER_TOKEN` Worker secret.
3. Deploy or restart the API Worker as required by the hosting flow.
4. Verify metadata-only health/provider checks without sending sensitive prompt or response content to logs.
5. Revoke the old NVIDIA NIM API key in the provider account.
6. Confirm Cloudflare/GitHub logs contain only secret names and safe status metadata.

No D1 credential rewrap or per-user credential migration is required because the NVIDIA NIM API key is not stored in D1.

For Bot VPS rotation:

1. Rotate `DISCORD_TOKEN` in the Discord developer portal and VPS-local secret store.
2. Restart the Bot service through `BOT_VPS_START_COMMAND` or directly on the VPS.
3. Rotate Cloudflare Access Service Token values in both API Worker secrets and VPS-local Bot runtime secrets.
4. Rotate `BOT_VPS_SSH_PRIVATE_KEY` by adding a new public key to the VPS deploy user, updating the GitHub secret, verifying deploy, and removing the old public key.
5. Update `BOT_VPS_KNOWN_HOSTS` only after verifying a host key change through a trusted channel.

## Local development safety

Local development may use fake Cloudflare Access Service Token values and `ALLOW_LOCAL_AUTH_BYPASS=true` inside Docker Compose. Production must not.

Local Bot development must use a dedicated development Discord Application/Bot token via `DISCORD_DEV_TOKEN`; `docker-compose.yml` intentionally passes `DISCORD_TOKEN` as an empty value so a production token from the host shell is not forwarded into the local container.

For local provider work, prefer `LLM_PROVIDER=fake`. If testing real NVIDIA NIM locally is necessary, place `NVIDIA_NIM_BEARER_TOKEN` only in an uncommitted local secret store such as a developer-only `.env` file, never in docs, fixtures, snapshots, or shell history that may be shared.
