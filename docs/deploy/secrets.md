# Deployment secrets and variables

Do not commit secret values. Configure these names in GitHub Actions and Cloudflare dashboards only.

## GitHub Actions Secrets

| Name                      | Used by                        | Purpose                                                                                                               |
| ------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`    | Deploy workflow                | Cloudflare API token with permission to deploy Workers/Pages, manage Worker secrets, and apply D1 migrations.         |
| `CLOUDFLARE_ACCOUNT_ID`   | Deploy workflow                | Cloudflare account ID. Treat as deployment-sensitive metadata.                                                        |
| `CF_ACCESS_CLIENT_ID`     | API Worker secret, Bot runtime | Cloudflare Access Service Token client ID used by the Bot Worker for `/api/v1/bot/*`.                                 |
| `CF_ACCESS_CLIENT_SECRET` | API Worker secret, Bot runtime | Cloudflare Access Service Token client secret used by the Bot Worker for `/api/v1/bot/*`.                             |
| `NVIDIA_NIM_BEARER_TOKEN` | API Worker secret              | NVIDIA NIM API key value used as the provider `Authorization: Bearer ...` token. Never expose it outside API runtime. |
| `DISCORD_TOKEN`           | Future Bot target only         | Production Discord Bot token. Do not expose to local Compose or API/Web deployments.                                  |

## GitHub Actions Variables

| Name                            | Used by                 | Purpose                                                                                                        |
| ------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `API_WORKER_NAME`               | API deploy              | Optional Worker name override. Defaults to `dc-chatbot-api` when unset.                                        |
| `CF_ACCESS_TEAM_DOMAIN`         | API deploy/API Worker   | Cloudflare Access team domain for Owner route JWT JWKS lookup, for example `team.cloudflareaccess.com`.        |
| `CF_ACCESS_AUD`                 | API deploy/API Worker   | Cloudflare Access application audience tag required in `Cf-Access-Jwt-Assertion` for `/api/v1/owner/*` routes. |
| `CLOUDFLARE_D1_DATABASE_NAME`   | D1 migration/API deploy | Production D1 database name.                                                                                   |
| `CLOUDFLARE_D1_DATABASE_ID`     | API deploy              | Production D1 database ID patched into `apps/api/wrangler.toml` during deployment.                             |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Web deploy              | Cloudflare Pages project name for `apps/web`.                                                                  |
| `VITE_API_BASE_URL`             | Web build               | Public API origin used by the Owner UI build.                                                                  |
| `LLM_PROVIDER`                  | API deploy/API Worker   | Set to `nvidia_nim` for production provider calls. Local development may use `fake`.                           |
| `NVIDIA_NIM_BASE_URL`           | API deploy/API Worker   | Optional override for the NVIDIA NIM OpenAI-compatible base URL. Omit to use the provider adapter default.     |
| `API_SMOKE_URL`                 | Smoke check             | Public or Access-compatible API origin. The workflow checks `${API_SMOKE_URL}/health`.                         |
| `WEB_SMOKE_URL`                 | Smoke check             | Web origin checked after Pages deploy.                                                                         |
| `BOT_DEPLOY_TARGET`             | Bot placeholder         | Leave unset until a concrete Bot hosting target is documented and implemented.                                 |

## Cloudflare Access Owner route JWT verification

Owner human routes under `/api/v1/owner/*` require a verified Cloudflare Access JWT from the `Cf-Access-Jwt-Assertion` request header unless the hardened local development bypass is valid in a non-production environment.

Configure these GitHub Actions variables before production deploy:

- `CF_ACCESS_TEAM_DOMAIN`: the Access team domain used to fetch JWKS from `https://<team-domain>/cdn-cgi/access/certs`. Use the host name such as `team.cloudflareaccess.com`; an `https://` URL with no path is also accepted by the Worker.
- `CF_ACCESS_AUD`: the Cloudflare Access application audience tag that must be present in the JWT `aud` claim.

If either value is missing or invalid, Owner route authentication fails closed with `401 unauthorized`. The forwarded `cf-access-authenticated-user-email` header is not trusted by itself.

## Cloudflare Access Service Token

Create a Cloudflare Access Service Token for the Bot Worker. Use its client ID and client secret in two places:

1. API Worker secrets: `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`.
2. Bot runtime secrets on the future Bot hosting target.

The Bot Worker must call `/api/v1/bot/*` with Cloudflare Access Service Token headers. It must not access D1, NVIDIA NIM API key material, bearer tokens, or provider backends directly.

## NVIDIA NIM provider credential

The production provider credential is the NVIDIA NIM API key. The API Worker reads it from `NVIDIA_NIM_BEARER_TOKEN` and passes it to the provider adapter as bearer-token material for NVIDIA NIM requests.

Configure the token as a Cloudflare Worker secret and, where deployment automation uploads Worker secrets, as a GitHub Actions secret. Do not configure it as a public Pages variable, Wrangler plain text `vars` entry, `.env` value committed to the repository, D1 row, frontend state, Bot runtime value, test fixture, docs example, issue, PR comment, or log output.

`LLM_PROVIDER=nvidia_nim` selects the NVIDIA NIM provider. `NVIDIA_NIM_BASE_URL` is optional and should remain unset unless an operator intentionally needs to override the default OpenAI-compatible NVIDIA NIM endpoint. The base URL is not credential material, but treat it as deployment-sensitive configuration.

If `NVIDIA_NIM_BEARER_TOKEN` is missing, empty, malformed, revoked, or rejected by the provider, the API must fail with a safe provider/configuration error category. It must not return or log the token, provider raw request body, provider raw response body, prompt body, selected Conversation Context content, or response text.

## Rotation and revocation

Rotate the NVIDIA NIM API key through the provider account and Cloudflare Worker secret flow:

1. Create a replacement NVIDIA NIM API key outside the repository.
2. Upload it as the new `NVIDIA_NIM_BEARER_TOKEN` Worker secret.
3. Deploy or restart the API Worker as required by the hosting flow.
4. Verify metadata-only health/provider checks without sending sensitive prompt or response content to logs.
5. Revoke the old NVIDIA NIM API key in the provider account.
6. Confirm Cloudflare/GitHub logs contain only secret names and safe status metadata.

No D1 credential rewrap or per-user credential migration is required because the NVIDIA NIM API key is not stored in D1.

## Local development safety

Local development may use fake Cloudflare Access Service Token values and `ALLOW_LOCAL_AUTH_BYPASS=true` inside Docker Compose. Production must not.

Local Bot development must use a dedicated development Discord Application/Bot token via `DISCORD_DEV_TOKEN`; `docker-compose.yml` intentionally passes `DISCORD_TOKEN` as an empty value so a production token from the host shell is not forwarded into the local container.

For local provider work, prefer `LLM_PROVIDER=fake`. If testing real NVIDIA NIM locally is necessary, place `NVIDIA_NIM_BEARER_TOKEN` only in an uncommitted local secret store such as a developer-only `.env` file, never in docs, fixtures, snapshots, or shell history that may be shared.
