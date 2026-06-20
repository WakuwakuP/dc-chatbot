# Deployment secrets and variables

Do not commit secret values. Configure these names in GitHub Actions and Cloudflare dashboards only.

## GitHub Actions Secrets

| Name                                     | Used by                        | Purpose                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                   | Deploy workflow                | Cloudflare API token with permission to deploy Workers/Pages, manage Worker secrets, and apply D1 migrations.                                                             |
| `CLOUDFLARE_ACCOUNT_ID`                  | Deploy workflow                | Cloudflare account ID. Treat as deployment-sensitive metadata.                                                                                                            |
| `CF_ACCESS_CLIENT_ID`                    | API Worker secret, Bot runtime | Cloudflare Access Service Token client ID used by the Bot Worker for `/api/v1/bot/*`.                                                                                     |
| `CF_ACCESS_CLIENT_SECRET`                | API Worker secret, Bot runtime | Cloudflare Access Service Token client secret used by the Bot Worker for `/api/v1/bot/*`.                                                                                 |
| `CHATGPT_CREDENTIAL_MASTER_KEY_CURRENT`  | API Worker secret              | Current base64 or base64url encoded 32-byte AES-GCM master key used to wrap per-connection data encryption keys for ChatGPT Subscription Connection credential envelopes. |
| `CHATGPT_CREDENTIAL_MASTER_KEY_PREVIOUS` | API Worker secret              | Optional previous master wrapping key reserved for rotation/decryption workflows. Remove after all active data encryption keys are rewrapped.                             |
| `DISCORD_TOKEN`                          | Future Bot target only         | Production Discord Bot token. Do not expose to local Compose or API/Web deployments.                                                                                      |

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

The Bot Worker must call `/api/v1/bot/*` with Cloudflare Access Service Token headers. It must not access D1, ChatGPT credential material, or provider backends directly.

## ChatGPT Subscription Connection credential encryption

`CHATGPT_CREDENTIAL_MASTER_KEY_CURRENT` is required before completing a ChatGPT Subscription Connection flow. The API Worker decodes this secret as a 32-byte AES-GCM master wrapping key from standard base64 or base64url. For each completed ChatGPT Subscription Connection, the API Worker generates a fresh random 32-byte data encryption key (DEK), encrypts the provider-returned credential material with that DEK, then wraps the DEK with the current master key.

D1 stores only a JSON encryption envelope with safe metadata, IVs, credential ciphertext, and wrapped DEK ciphertext:

```json
{
  "v": 2,
  "credentialAlg": "AES-GCM",
  "keyWrapAlg": "AES-GCM",
  "masterKeyId": "current",
  "additionalAuthenticatedData": {
    "envelopeType": "chatgpt_subscription_connection_credential",
    "envelopeVersion": 2,
    "credentialAlg": "AES-GCM",
    "keyWrapAlg": "AES-GCM",
    "masterKeyId": "current",
    "ownerDiscordUserId": "...",
    "connectionFlowStateId": "...",
    "connectionId": "..."
  },
  "credentialIv": "...",
  "credentialCiphertext": "...",
  "wrappedDataKeyIv": "...",
  "wrappedDataKeyCiphertext": "..."
}
```

The IV and ciphertext fields are base64 encoded. The Owner Discord User ID, connection flow state ID, and connection ID are safe metadata and are also used as AES-GCM additional authenticated data. Provider-returned credential material and plaintext DEKs are never stored in D1. If the master key is missing, has the wrong length, or encryption/wrapping fails, the API returns `503 credential_encryption_unavailable` and does not complete persistence.

Generate the key outside the repository with a cryptographically secure random source. It must decode to exactly 32 bytes. For example, use an operator workstation or secret manager to generate 32 random bytes and base64 encode the bytes; do not paste generated values into docs, commits, tickets, or logs.

## Master encryption key rotation caveat

New credential envelopes encrypt credential material with a per-connection DEK, wrap that DEK with `CHATGPT_CREDENTIAL_MASTER_KEY_CURRENT`, and record `masterKeyId: "current"`. The optional `CHATGPT_CREDENTIAL_MASTER_KEY_PREVIOUS` secret is reserved for a rotation/rewrap workflow, but this implementation does not yet decrypt or rewrap existing DEKs automatically.

Manual rotation must therefore be planned before replacing the current key:

1. Generate a new high-entropy 32-byte master key outside the repository and encode it as base64 or base64url.
2. Keep the existing current key available as `CHATGPT_CREDENTIAL_MASTER_KEY_PREVIOUS` only while a rewrap workflow can still decrypt envelopes encrypted by the old key.
3. Set the new key as `CHATGPT_CREDENTIAL_MASTER_KEY_CURRENT`.
4. Deploy the API Worker.
5. Rewrap active ChatGPT Subscription Connection DEKs through a metadata-only maintenance job before removing the previous key.
6. Verify no active envelope requires the previous master key.
7. Remove `CHATGPT_CREDENTIAL_MASTER_KEY_PREVIOUS` from Cloudflare and GitHub Actions.

Do not print keys in workflow logs. Do not place real key material in `.env`, docs, snapshots, D1, frontend state, or Bot runtime logs.

## Local development safety

Local development may use fake Cloudflare Access Service Token values and `ALLOW_LOCAL_AUTH_BYPASS=true` inside Docker Compose. Production must not.

Local Bot development must use a dedicated development Discord Application/Bot token via `DISCORD_DEV_TOKEN`; `docker-compose.yml` intentionally passes `DISCORD_TOKEN` as an empty value so a production token from the host shell is not forwarded into the local container.
