# 開発環境立ち上げ・本番デプロイ手順書

この手順書は `dc-chatbot` の production package を対象にします。`apps/api-spike` は Cloudflare Workers + Drizzle + D1 の compatibility/reference spike であり、開発環境立ち上げや本番デプロイの対象ではありません。

## 重要な安全ルール

- production Discord Bot token を local development に使わないでください。
- `.env`、GitHub Actions log、Cloudflare log、D1、frontend state に secret や sensitive content を残さないでください。
- 保存・ログ出力してはいけないもの:
  - Discord message content
  - selected Conversation Context content
  - prompt body
  - response text
  - plaintext credential material
  - ChatGPT credential history
  - attachment URLs / attachment bytes
  - provider raw request / response body
- Bot Worker は D1、ChatGPT credential、provider backend に直接アクセスしません。必ず Cloudflare Access Service Token で `/api/v1/bot/*` を呼びます。
- Owner human routes は `/api/v1/owner/*`、Bot service routes は `/api/v1/bot/*` です。

## 1. 開発環境立ち上げ

### 1.1 前提

- Node.js `24` (`.node-version`)
- pnpm `10.25.0`
- Docker / Docker Compose
- local Bot を動かす場合のみ、development 用 Discord Application / Bot

### 1.2 初回セットアップ

```bash
pnpm install
cp .env.example .env
```

Windows PowerShell では次でも構いません。

```powershell
Copy-Item .env.example .env
```

`.env` は local development 値だけにしてください。production Discord Bot token、ChatGPT Subscription Connection credential material、prompt body、response text、attachment URLs、provider raw bodies は入れないでください。

### 1.3 API / Web を起動する

```bash
docker compose up api web
```

起動後に確認します。

- API health: <http://localhost:8787/health>
- Web: <http://localhost:5173>

`docker-compose.yml` の local API は次の local-only auth bypass を有効化します。

- `DC_CHATBOT_ENV=development`
- `ALLOW_LOCAL_AUTH_BYPASS=true`
- `LOCAL_AUTH_BYPASS_SECRET`

local auth bypass を使って API を呼ぶ場合は、同じ値を `x-dev-auth-secret` header に入れてください。production では `apps/api/wrangler.toml` が `ALLOW_LOCAL_AUTH_BYPASS=false` を維持し、誤設定されても bypass は拒否されます。

### 1.4 local Bot Worker を起動する

Bot Worker は実際の Discord Gateway に接続するため、明示的に `bot` profile を指定したときだけ起動します。

1. development 用 Discord Application / Bot を作成します。
2. `.env` に development 用の値だけを設定します。
   - `DC_CHATBOT_ALLOW_DEV_BOT=true`
   - `DISCORD_DEV_TOKEN`
   - `DISCORD_DEV_GUILD_ID`
   - `DISCORD_DEV_ALLOWED_USER_IDS`
3. host process の `pnpm dev:all` で起動する場合は、local service 用の値も `.env` に設定します。
   - `DC_CHATBOT_API_BASE_URL=http://127.0.0.1:8787`
   - `CF_ACCESS_CLIENT_ID=local-dev-client-id`
   - `CF_ACCESS_CLIENT_SECRET=local-dev-client-secret`
   - `LOCAL_AUTH_BYPASS_SECRET=local-auth-bypass-secret`
4. `.env` の `DISCORD_TOKEN` は空のままにします。
5. 起動します。

```bash
docker compose --profile bot up bot
```

host process で起動する場合は、root の dev launcher が `.env` を読み込んで API/Web/Bot に渡します。

```bash
pnpm dev:all
```

local Bot Worker は次を満たさない場合に起動を拒否します。

- `DC_CHATBOT_ALLOW_DEV_BOT=true`
- `DISCORD_DEV_TOKEN` が設定されている
- `DISCORD_DEV_GUILD_ID` が設定されている
- `DISCORD_DEV_ALLOWED_USER_IDS` が設定されている

`docker-compose.yml` は host 側の production `DISCORD_TOKEN` を container に渡さないよう、明示的に空文字を渡します。

### 1.5 local D1 migration の扱い

production data layer は `packages/data/migrations` の hand-written forward-only D1 migrations を使います。

local D1 を使う場合は、migration filename の順に適用してください。down migration を rollback 手段として設計せず、修正が必要な場合は新しい forward-fix migration を追加します。

production migration の operator 参考コマンドは次です。local では local 用に作成した database name / Wrangler target に置き換えてください。

```bash
wrangler d1 migrations apply dc-chatbot-production --remote --config apps/api/wrangler.toml
```

### 1.6 開発時の品質確認

変更範囲に近い check から実行します。docs / deploy workflow だけの変更でも最低限 `format:check` を実行します。

```bash
pnpm format:check
```

production code、DTO、data layer、API、Bot、Web を変更した場合は、可能な範囲で次も実行します。

```bash
pnpm check
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

まとめて確認する場合:

```bash
pnpm test
```

### 1.7 停止

```bash
docker compose down
```

volume も削除して dependency cache を捨てる場合だけ次を使います。

```bash
docker compose down --volumes
```

## 2. 本番デプロイ

### 2.1 現在のデプロイ対象

| Component  | Target                              | Status                       |
| ---------- | ----------------------------------- | ---------------------------- |
| `apps/api` | Cloudflare Workers                  | Deploy workflow 対象         |
| `apps/web` | Cloudflare Pages                    | Deploy workflow 対象         |
| D1         | Cloudflare D1                       | Deploy workflow で migration |
| `apps/bot` | Pending long-running Node.js target | まだ本番デプロイ対象ではない |

Bot Worker の本番 hosting target は未決定です。`BOT_DEPLOY_TARGET` を設定すると、現在の deploy workflow は placeholder job で失敗します。Bot 本番デプロイを有効化する前に、`docs/deploy/decisions/bot-deploy-target-pending.md`、`apps/bot/deploy/README.md`、`.github/workflows/deploy.yml` を同じ変更で更新してください。

### 2.2 Cloudflare 側の事前準備

1. Cloudflare account を作成または選択します。
2. production D1 database を作成します。

   ```bash
   wrangler d1 create dc-chatbot-production
   ```

3. D1 database name / database ID を控えます。
4. API Worker name と Web Pages project を作成または決定します。
5. API Worker route / custom domain と Web Pages custom domain を設定します。
6. Cloudflare Access を設定します。
   - Web app と `/api/v1/owner/*` を Owner human access で保護します。
   - `/api/v1/bot/*` を Cloudflare Access Service Token で保護します。
7. Owner route JWT verification 用に次を控えます。
   - `CF_ACCESS_TEAM_DOMAIN`
   - `CF_ACCESS_AUD`
8. Bot Worker 用 Cloudflare Access Service Token を作成し、client ID / client secret を控えます。

### 2.3 GitHub Actions Secrets / Variables を設定する

値そのものは repository、docs、issue、PR、log に貼らないでください。名前と用途の詳細は `docs/deploy/secrets.md` を正とします。

Required GitHub Actions Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`
- `CHATGPT_CREDENTIAL_MASTER_KEY_CURRENT`

Optional GitHub Actions Secrets:

- `CHATGPT_CREDENTIAL_MASTER_KEY_PREVIOUS` — master key rotation / rewrap 時だけ
- `DISCORD_TOKEN` — future Bot target 用。現在の API/Web deploy では使いません

Required GitHub Actions Variables:

- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- `CLOUDFLARE_D1_DATABASE_NAME`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_PAGES_PROJECT_NAME`
- `VITE_API_BASE_URL`

Optional GitHub Actions Variables:

- `API_WORKER_NAME` — 未設定なら `dc-chatbot-api`
- `API_SMOKE_URL` — 設定時のみ smoke check
- `WEB_SMOKE_URL` — 設定時のみ smoke check
- `BOT_DEPLOY_TARGET` — 現時点では未設定にしてください

### 2.4 デプロイ前チェック

main branch に反映する前、または workflow_dispatch の前に、local / CI で次が通ることを確認します。

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm check
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

migration を追加した場合は、次も確認します。

- `packages/data/migrations` に down migration file を追加していない
- SQL 内に `-- down` section を追加していない
- production rollback を schema revert 前提にしていない
- 必要に応じて production D1 backup / export の手順を operator 側で済ませた

### 2.5 GitHub Actions から本番デプロイする

1. GitHub の repository で **Actions** を開きます。
2. **Deploy** workflow を選択します。
3. **Run workflow** を押し、対象 branch を選びます。
4. workflow の各 job を確認します。

Deploy workflow の流れ:

1. **Deploy preflight**
   - required Secrets / Variables の存在確認
   - production Wrangler config が `ALLOW_LOCAL_AUTH_BYPASS=true` ではないことの確認
   - `BOT_DEPLOY_TARGET` が未設定であることの notice
2. **Apply D1 migrations**
   - forward-only migration policy check
   - D1 binding patch
   - remote D1 migration apply
3. **Deploy API Worker**
   - `@dc-chatbot/api` build
   - `apps/api/wrangler.toml` deploy
   - Worker secrets upload
4. **Deploy Web Pages**
   - `VITE_API_BASE_URL` 付きで `@dc-chatbot/web` build
   - `apps/web/dist` を Cloudflare Pages に deploy
5. **Bot deploy placeholder**
   - `BOT_DEPLOY_TARGET` 未設定なら成功
   - 設定済みなら失敗
6. **Smoke check**
   - `API_SMOKE_URL` と `WEB_SMOKE_URL` が両方ある場合のみ実行
   - API `/health` と Web origin を確認

### 2.6 デプロイ後確認

1. Deploy workflow が成功していることを確認します。
2. `API_SMOKE_URL` を設定している場合は、workflow の smoke check が API `/health` に成功していることを確認します。
3. `WEB_SMOKE_URL` を設定している場合は、workflow の smoke check が Web origin に成功していることを確認します。
4. Cloudflare Workers / Pages logs を確認します。
   - metadata-only log だけであること
   - Discord message content、Conversation Context content、prompt body、response text、credential、attachment URL/bytes、provider raw body が出ていないこと
5. Cloudflare Access 設定を確認します。
   - Owner human route が Cloudflare Access JWT なしで通らないこと
   - `/api/v1/bot/*` が Cloudflare Access Service Token なしで通らないこと
6. D1 migration 状態を確認します。

   ```bash
   wrangler d1 migrations list dc-chatbot-production --remote --config apps/api/wrangler.toml
   ```

   database name は実際の `CLOUDFLARE_D1_DATABASE_NAME` に置き換えてください。

### 2.7 失敗時の切り分け

- **preflight が失敗した場合**
  - GitHub Actions Secrets / Variables の不足を修正します。
  - `ALLOW_LOCAL_AUTH_BYPASS=true` が production Wrangler config に入っていないか確認します。
  - `BOT_DEPLOY_TARGET` は未設定に戻します。
- **D1 migration が失敗した場合**
  - deploy は停止します。
  - down migration ではなく、新しい forward-fix migration で修正します。
  - risky migration の場合は production backup / export の有無を確認します。
- **API deploy が失敗した場合**
  - `@dc-chatbot/api` build、Wrangler config patch、Cloudflare API token 権限を確認します。
  - Worker secrets の値を log に出さず、設定名だけ確認します。
- **Web deploy が失敗した場合**
  - `@dc-chatbot/web` build と `VITE_API_BASE_URL` を確認します。
  - Cloudflare Pages project name を確認します。
- **smoke check が失敗した場合**
  - `API_SMOKE_URL` / `WEB_SMOKE_URL` の origin、Access policy、route/custom domain を確認します。
  - smoke check では Discord message content や provider payload を送らないでください。

### 2.8 Bot 本番デプロイを有効化する前に必要なこと

Bot hosting target を選ぶまでは、本番 Bot デプロイは実施しません。有効化する変更では最低限、次を文書化・実装してください。

- long-running Node.js process の hosting target
- secret injection mechanism
- process supervision / restart policy
- metadata-only logging controls
- Discord と API origin への network egress
- rollout / forward-fix policy
- `DISCORD_TOKEN` と Cloudflare Access Service Token の runtime mapping
- `.github/workflows/deploy.yml` の Bot placeholder を置き換える target-specific job
- sensitive content を送らない smoke check

Bot production runtime に必要な環境変数は `apps/bot/deploy/README.md` を正とします。local-only の `DISCORD_DEV_TOKEN`、`DISCORD_DEV_GUILD_ID`、`DC_CHATBOT_ALLOW_DEV_BOT=true` は production runtime に渡さないでください。
