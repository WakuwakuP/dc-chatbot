# CI/CD and Actions Secrets plan

## Goal

GitHub Actions Secrets を設定し、main branch へ push したら以下が自動で完了する状態を作る。

1. install
2. check
3. lint
4. format check
5. unit test
6. e2e test
7. build
8. D1 migration
9. API deploy
10. Web deploy
11. Bot deploy
12. post-deploy smoke check

## Workflows

### `.github/workflows/ci.yml`

Trigger:

- `pull_request`
- `push`

Jobs:

1. `quality`
   - `corepack enable`
   - `pnpm install --frozen-lockfile`
   - `pnpm check`
   - `pnpm lint`
   - `pnpm format:check`
2. `test`
   - `pnpm test:unit`
   - `pnpm test:e2e`
3. `build`
   - `pnpm build`

Quality gate:

- lint は warning/info を含めて clean な状態だけを pass とする。
- format check は差分がある場合に fail する。
- test fixture / artifact には message content、prompt、response、credential、attachment URL/bytes を含めない。

### `.github/workflows/deploy.yml`

Trigger:

- `push` to `main`
- optional `workflow_dispatch`

Required dependency:

- CI 相当の check/lint/format/test/build を deploy workflow 内でも実行するか、branch protection で CI success を必須にする。

Jobs:

1. `preflight`
   - lockfile install
   - check / lint / format:check / unit / e2e / build
2. `migrate-d1`
   - Cloudflare auth
   - production D1 backup/export if supported by chosen process
   - forward-only migration apply
3. `deploy-api`
   - Wrangler deploy `apps/api`
4. `deploy-web`
   - Cloudflare Pages deploy `apps/web`
5. `deploy-bot`
   - P0-01 で決めた Bot target へ deploy
6. `smoke`
   - API health endpoint
   - Web URL fetch
   - Bot version/health check

Deployment order:

```text
preflight -> migrate-d1 -> deploy-api -> deploy-web -> deploy-bot -> smoke
```

## Required Actions Secrets

### Cloudflare common

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy / Pages deploy / D1 migration 用 token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### API / Workers

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_WORKER_NAME` | API Worker name |
| `CLOUDFLARE_D1_DATABASE_ID` | Production D1 database ID |
| `CLOUDFLARE_D1_DATABASE_NAME` | Production D1 database name |
| `CHATGPT_MASTER_KEY_ACTIVE_VERSION` | active master key version |
| `CHATGPT_MASTER_KEY_V1` | DEK wrapping 用 master key。version は実装時の命名規則に合わせる |
| `BOT_ACCESS_SERVICE_TOKEN_ID` | Bot Worker が API を呼ぶ Cloudflare Access service token ID |
| `BOT_ACCESS_SERVICE_TOKEN_SECRET` | Bot Worker が API を呼ぶ Cloudflare Access service token secret |
| `OWNER_ACCESS_AUDIENCE` | Owner routes の Cloudflare Access JWT audience |

### Web / Pages

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Web deploy 先の Pages project |
| `PUBLIC_API_BASE_URL` | Web から呼ぶ API base URL。secret ではないが Actions variable/secret として管理可能 |

### Bot Worker

Bot hosting target は P0-01 で確定する。抽象的には以下が必要。

| Secret | 用途 |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Bot Worker production token。repository に保存しない |
| `DISCORD_APPLICATION_ID` | Discord Application ID |
| `BOT_API_BASE_URL` | Bot Worker が呼ぶ API base URL |
| `BOT_DEPLOY_TARGET` | Bot deploy target identifier |
| `BOT_DEPLOY_TOKEN` | Deploy provider token / deploy hook token / SSH key 等 |
| `BOT_DEPLOY_HEALTH_URL` | Deploy 後 smoke check URL。target により不要なら省略 |

Bot deploy target が SSH の場合の候補:

| Secret | 用途 |
| --- | --- |
| `BOT_DEPLOY_HOST` | SSH host |
| `BOT_DEPLOY_USER` | SSH user |
| `BOT_DEPLOY_SSH_KEY` | deploy key |
| `BOT_DEPLOY_SERVICE_NAME` | systemd service name |

Bot deploy target が container registry + webhook の場合の候補:

| Secret | 用途 |
| --- | --- |
| `BOT_IMAGE_REGISTRY_TOKEN` | image push token |
| `BOT_DEPLOY_WEBHOOK_URL` | deploy hook URL |
| `BOT_DEPLOY_WEBHOOK_SECRET` | deploy hook secret |

## GitHub Actions permissions

最小権限から始める。

```yaml
permissions:
  contents: read
```

必要な場合のみ追加する。

- `packages: write` — Bot Docker image を GHCR に push する場合
- `id-token: write` — OIDC を使う deploy provider の場合

## Branch protection

main branch は以下を必須にする。

- CI workflow success
- review required if team workflow requires it
- direct push 禁止は運用に合わせて判断

## Smoke checks

### API

- `GET /health` or `GET /api/v1/health`
- response body は metadata-only

### Web

- Pages URL に GET
- expected shell text または asset response を確認

### Bot

- Bot deploy target の health/version endpoint
- Discord Gateway に本番 token で実際に message を送る smoke test は避ける
- 必要なら Bot process の version endpoint または deploy marker を確認する

## Failure policy

- migration failure: deploy 停止
- API deploy failure: Web/Bot deploy 停止
- Web deploy failure: Bot deploy は原則停止。運用上 API-only release を許す場合は明示する
- Bot deploy failure: API/Web は既に更新済みの可能性があるため、roll-forward 修正を優先
- migration 後の問題: forward-only corrective migration または schema-compatible app rollback
