# Implementation tasks

このファイルは、実装時にそのまま着手するための実タスク backlog です。

各タスクは小さく、原則として「1 task = 1 focused commit」程度にします。`apps/api-spike` は対象外です。

## Legend

- `Deps`: 先に完了すべき task
- `Output`: 作成・変更する主な成果物
- `Verify`: 完了時に実行する確認

## Milestone A — Workspace foundation

### A001 Root scripts を定義する

- Deps: none
- Output:
  - `package.json`
- Tasks:
  - `check`, `build`, `lint`, `format`, `format:check`, `test`, `test:unit`, `test:e2e` を追加する
  - workspace 全体に対して `pnpm --recursive --if-present` で実行できる形にする
  - 既存 `spike:*` scripts は残すが、本実装 gate とは分離する
- Verify:
  - `pnpm check` が no-op または既存 package の範囲で成功する

### A002 共通 TypeScript package 設定を整理する

- Deps: A001
- Output:
  - `tsconfig.base.json`
  - optional: `tsconfig.json`
- Tasks:
  - strict options を維持する
  - package ごとに extend しやすい compiler options にする
  - generated / dist / node_modules を除外する
- Verify:
  - `pnpm check`

### A003 package naming と workspace dependency 方針を固定する

- Deps: A001
- Output:
  - `README.md`
  - package 作成時の package name
- Tasks:
  - `@dc-chatbot/shared`
  - `@dc-chatbot/domain`
  - `@dc-chatbot/data`
  - `@dc-chatbot/provider`
  - app package は `@dc-chatbot/api`, `@dc-chatbot/web`, `@dc-chatbot/bot`
- Verify:
  - package 名が docs と一致する

## Milestone B — Shared/domain packages

### B001 `packages/shared` を作成する

- Deps: A001, A002, A003
- Output:
  - `packages/shared/package.json`
  - `packages/shared/tsconfig.json`
  - `packages/shared/src/index.ts`
- Tasks:
  - ESM package にする
  - `exports` を設定する
  - `check` / `build` scripts を追加する
- Verify:
  - `pnpm --filter @dc-chatbot/shared check`

### B002 Valibot を導入し DTO schema の最小形を作る

- Deps: B001
- Output:
  - `packages/shared/src/bot-intake.ts`
  - `packages/shared/src/common.ts`
- Tasks:
  - Discord snowflake ID を string として schema 化する
  - Bot intake request/response の metadata-only schema を作る
  - message content は transient field として扱い、persistence DTO と分ける
- Verify:
  - `pnpm --filter @dc-chatbot/shared check`

### B003 `packages/domain` を作成する

- Deps: A001, A002, A003
- Output:
  - `packages/domain/package.json`
  - `packages/domain/tsconfig.json`
  - `packages/domain/src/index.ts`
- Tasks:
  - runtime dependency なしで package を作る
  - role/status literals を定義する
- Verify:
  - `pnpm --filter @dc-chatbot/domain check`

### B004 Owner role scope helper を実装する

- Deps: B003
- Output:
  - `packages/domain/src/owner-policy.ts`
- Tasks:
  - Admin Owner は owner-level 操作可能
  - Regular Owner は assigned own connection scope のみ操作可能
  - disabled owner は操作不可
- Verify:
  - `pnpm --filter @dc-chatbot/domain check`

### B005 Effective connection resolution helper を実装する

- Deps: B003
- Output:
  - `packages/domain/src/effective-connection.ts`
- Tasks:
  - user direct connection 優先
  - なければ assigned Owner connection
  - unavailable reason を safe category として返す
- Verify:
  - `pnpm --filter @dc-chatbot/domain check`

## Milestone C — Data/provider packages

### C001 `packages/data` を作成する

- Deps: A001, A002, A003
- Output:
  - `packages/data/package.json`
  - `packages/data/tsconfig.json`
  - `packages/data/src/index.ts`
  - `packages/data/migrations/README.md`
- Tasks:
  - D1 schema / migration / repository の配置を作る
  - migration は forward-only と明記する
- Verify:
  - `pnpm --filter @dc-chatbot/data check`

### C002 Core D1 schema を追加する

- Deps: C001
- Output:
  - `packages/data/src/schema.ts`
- Tasks:
  - `discord_users`
  - `owners`
  - `registered_members`
  - `chatgpt_connections`
  - Discord snowflake ID は `TEXT`
  - timestamp は ISO 8601 UTC text
- Verify:
  - `pnpm --filter @dc-chatbot/data check`

### C003 Audit/retention schema skeleton を追加する

- Deps: C002
- Output:
  - `packages/data/src/audit-schema.ts` or same schema file
- Tasks:
  - request audit metadata
  - provider call audit metadata
  - selected context message metadata
  - owner notification history metadata
  - content fields を持たない
- Verify:
  - schema に forbidden content fields がないことを review
  - `pnpm --filter @dc-chatbot/data check`

### C004 Initial forward-only migration を追加する

- Deps: C002, C003
- Output:
  - `packages/data/migrations/0001_initial.sql`
- Tasks:
  - core tables
  - targeted indexes
  - core foreign keys
  - no down migration
- Verify:
  - local D1 migration command が docs 化されている

### C005 `packages/provider` を作成する

- Deps: A001, A002, A003
- Output:
  - `packages/provider/package.json`
  - `packages/provider/tsconfig.json`
  - `packages/provider/src/index.ts`
- Tasks:
  - provider adapter interface を定義する
  - safe error category を定義する
- Verify:
  - `pnpm --filter @dc-chatbot/provider check`

### C006 Fake provider を追加する

- Deps: C005
- Output:
  - `packages/provider/src/fake-provider.ts`
- Tasks:
  - unit/e2e 用 fake response を返す
  - raw request/response body を返さない interface にする
- Verify:
  - `pnpm --filter @dc-chatbot/provider check`

## Milestone D — API skeleton

### D001 `apps/api` を作成する

- Deps: A001, A002, B001, B003, C001, C005
- Output:
  - `apps/api/package.json`
  - `apps/api/tsconfig.json`
  - `apps/api/src/index.ts`
  - `apps/api/wrangler.toml`
- Tasks:
  - Cloudflare Workers entrypoint を作る
  - Workers-compatible Elysia app を構成する
  - `/health` を追加する
  - build script を追加する
- Verify:
  - `pnpm --filter @dc-chatbot/api check`
  - `pnpm --filter @dc-chatbot/api build`

### D002 Owner/Bot route group を分ける

- Deps: D001
- Output:
  - `apps/api/src/routes/owner.ts`
  - `apps/api/src/routes/bot.ts`
- Tasks:
  - `/api/v1/owner/*` skeleton
  - `/api/v1/bot/*` skeleton
  - route group が code 上分かれている状態にする
- Verify:
  - `pnpm --filter @dc-chatbot/api check`

### D003 Auth guard skeleton を追加する

- Deps: D002, B004
- Output:
  - `apps/api/src/auth/owner-auth.ts`
  - `apps/api/src/auth/bot-auth.ts`
- Tasks:
  - Owner: Cloudflare Access JWT 検証 interface
  - Bot: Service Token 検証 interface
  - local dev-only auth は explicit flag + shared secret 必須
- Verify:
  - `pnpm --filter @dc-chatbot/api check`

### D004 Bot intake endpoint skeleton を追加する

- Deps: D002, B002
- Output:
  - `apps/api/src/routes/bot-messages.ts`
- Tasks:
  - `/api/v1/bot/messages/intake`
  - Valibot schema validation
  - metadata-only response
  - message content を永続化しない境界を明確化
- Verify:
  - `pnpm --filter @dc-chatbot/api check`

### D005 Scheduled cleanup skeleton を追加する

- Deps: D001, C003
- Output:
  - `apps/api/src/scheduled.ts`
- Tasks:
  - Cloudflare scheduled handler
  - retention category ごとの cleanup stub
- Verify:
  - `pnpm --filter @dc-chatbot/api check`

## Milestone E — Bot skeleton

### E001 `apps/bot` を作成する

- Deps: A001, A002, B001, B003
- Output:
  - `apps/bot/package.json`
  - `apps/bot/tsconfig.json`
  - `apps/bot/src/index.ts`
- Tasks:
  - Node.js ESM package
  - discord.js dependency
  - build/check scripts
- Verify:
  - `pnpm --filter @dc-chatbot/bot check`

### E002 Bot config と dev safety rails を追加する

- Deps: E001
- Output:
  - `apps/bot/src/config.ts`
- Tasks:
  - production token は env からのみ読む
  - dev guild allowlist
  - dev DM user allowlist
  - missing safety rails なら local start を拒否
- Verify:
  - `pnpm --filter @dc-chatbot/bot check`

### E003 Bot API client skeleton を追加する

- Deps: E001, B002
- Output:
  - `apps/bot/src/api-client.ts`
- Tasks:
  - Cloudflare Access Service Token header を付ける
  - `/api/v1/bot/messages/intake` client
  - response schema validation
- Verify:
  - `pnpm --filter @dc-chatbot/bot check`

### E004 Discord message handler skeleton を追加する

- Deps: E002, E003
- Output:
  - `apps/bot/src/message-handler.ts`
- Tasks:
  - DM / guild mention 判定
  - automated source default ignore
  - context fetch plan を受け取るだけの skeleton
- Verify:
  - `pnpm --filter @dc-chatbot/bot check`

### E005 Discord reply split helper を追加する

- Deps: E001
- Output:
  - `apps/bot/src/reply-split.ts`
- Tasks:
  - safe Discord length limit
  - paragraph/line boundary 優先
  - code fence repair の最小実装または TODO 境界
- Verify:
  - `pnpm --filter @dc-chatbot/bot check`

## Milestone F — Web skeleton

### F001 `apps/web` を作成する

- Deps: A001, A002, B001, B003
- Output:
  - `apps/web/package.json`
  - `apps/web/tsconfig.json`
  - `apps/web/vite.config.ts`
  - `apps/web/components.json`
  - Tailwind CSS config/global CSS
  - Vite + React + React Router + Tailwind CSS + shadcn/ui frontend scaffold
- Tasks:
  - Cloudflare Pages deploy 可能な Vite frontend skeleton
  - React Router の root route を作る
  - Tailwind CSS を設定する
  - shadcn/ui を pnpm dlx shadcn@latest で初期化する
  - Owner UI shell を shadcn/ui の Card / Button / Badge 等で構成する
- Verify:
  - `pnpm --filter @dc-chatbot/web check`
  - `pnpm --filter @dc-chatbot/web build`

### F002 Web API client skeleton を追加する

- Deps: F001, B002
- Output:
  - `apps/web/src/api-client.ts`
  - `apps/web/src/routes/*`
- Tasks:
  - API base URL config
  - shared schema validation
  - React Router protected route で unauthorized state を扱う
- Verify:
  - `pnpm --filter @dc-chatbot/web check`

### F003 shadcn/ui ベースの minimal settings/candidates shell を追加する

- Deps: F001
- Output:
  - Owner management shell components
- Tasks:
  - Candidate Discord User area placeholder
  - Registered Member area placeholder
  - Automated Trigger Source settings placeholder
- Verify:
  - `pnpm --filter @dc-chatbot/web build`

## Milestone G — Unit tests

### G001 Test runner を導入する

- Deps: A001
- Output:
  - root/package test config
- Tasks:
  - Vitest 等を導入
  - root `test:unit` を設定
- Verify:
  - `pnpm test:unit`

### G002 `packages/domain` unit tests を追加する

- Deps: B004, B005, G001
- Output:
  - `packages/domain/src/*.test.ts`
- Tasks:
  - owner role scope
  - effective connection resolution
- Verify:
  - `pnpm --filter @dc-chatbot/domain test:unit`

### G003 `packages/shared` schema tests を追加する

- Deps: B002, G001
- Output:
  - `packages/shared/src/*.test.ts`
- Tasks:
  - valid DTO parse
  - invalid DTO rejection
- Verify:
  - `pnpm --filter @dc-chatbot/shared test:unit`

### G004 `packages/provider` safe error tests を追加する

- Deps: C005, C006, G001
- Output:
  - `packages/provider/src/*.test.ts`
- Tasks:
  - raw provider error から safe category へ変換
  - fake provider の deterministic result
- Verify:
  - `pnpm --filter @dc-chatbot/provider test:unit`

### G005 API auth/health tests を追加する

- Deps: D001, D003, G001
- Output:
  - `apps/api/src/*.test.ts`
- Tasks:
  - health endpoint
  - dev-only auth guard
  - bot/owner route guard skeleton
- Verify:
  - `pnpm --filter @dc-chatbot/api test:unit`

### G006 Bot reply split tests を追加する

- Deps: E005, G001
- Output:
  - `apps/bot/src/reply-split.test.ts`
- Tasks:
  - length limit
  - line boundary
  - code fence case
- Verify:
  - `pnpm --filter @dc-chatbot/bot test:unit`

## Milestone H — E2E tests

### H001 E2E test runner を導入する

- Deps: G001
- Output:
  - e2e config
  - root `test:e2e`
- Tasks:
  - external production services に依存しない runner を設定
  - fake provider を使う
- Verify:
  - `pnpm test:e2e`

### H002 Bot intake → fake response e2e を追加する

- Deps: D004, E003, C006, H001
- Output:
  - e2e test file
- Tasks:
  - fake Discord event metadata
  - Bot API client → API intake
  - fake provider response
  - persistence payload が metadata-only であることを確認
- Verify:
  - `pnpm test:e2e`

### H003 Web shell e2e を追加する

- Deps: F001, H001
- Output:
  - web e2e test file
- Tasks:
  - Owner UI shell 表示
  - unauthorized state 表示
- Verify:
  - `pnpm test:e2e`

## Milestone I — Lint/format

### I001 Oxlint を導入する

- Deps: A001
- Output:
  - lint config
  - root/package scripts
- Tasks:
  - `pnpm lint`
  - warning/info を許容しない設定または wrapper
- Verify:
  - `pnpm lint`

### I002 Oxfmt を導入する

- Deps: A001
- Output:
  - format config
  - root/package scripts
- Tasks:
  - `pnpm format`
  - `pnpm format:check`
- Verify:
  - `pnpm format:check`

### I003 Generated code / dist exclusions を設定する

- Deps: I001, I002
- Output:
  - lint/format config
- Tasks:
  - `node_modules`, `dist`, `.wrangler`, generated code を適切に除外
  - 手書き source はすべて対象にする
- Verify:
  - `pnpm lint`
  - `pnpm format:check`

## Milestone J — Build and deploy config

### J000 Docker Compose local development を追加する

- Deps: D001, E001, F001
- Output:
  - `docker-compose.yml`
  - `.env.example`
  - package/app local dev docs
- Tasks:
  - API / Web / Bot を local で立ち上げる compose service を定義する
  - API は Wrangler/local Workers dev を使う
  - Web は Vite dev server を使う
  - Bot は dev Discord Application/Bot Token と dev guild/DM allowlist がない場合に起動拒否する
  - D1 local migration 手順を compose workflow に合わせる
  - production token / credential を `.env.example` に入れない
- Verify:
  - `docker compose config`
  - local docs の safety rails と一致

### J001 API Wrangler config を本実装用に作る

- Deps: D001
- Output:
  - `apps/api/wrangler.toml`
- Tasks:
  - production Worker name
  - D1 binding
  - scheduled trigger
  - secret names は docs と一致
- Verify:
  - `pnpm --filter @dc-chatbot/api build`

### J002 Web Pages config を作る

- Deps: F001
- Output:
  - `apps/web` deploy config
- Tasks:
  - build output directory
  - API base URL env
- Verify:
  - `pnpm --filter @dc-chatbot/web build`

### J003 Bot build artifact を作る

- Deps: E001
- Output:
  - `apps/bot` build config
  - optional Dockerfile if selected deploy target requires container
- Tasks:
  - Node.js 22 runtime
  - production start command
- Verify:
  - `pnpm --filter @dc-chatbot/bot build`

### J004 Bot deploy target ADR/docs を確定する

- Deps: none
- Output:
  - `docs/adr/0056-*.md` or `docs/deploy/bot.md`
- Tasks:
  - hosting target
  - deploy method
  - health/smoke method
  - required secrets
- Verify:
  - `.plan/03-ci-cd-and-secrets.md` と矛盾しない

## Milestone K — GitHub Actions CI/CD

### K001 CI workflow を追加する

- Deps: A001, G001, H001, I001, I002
- Output:
  - `.github/workflows/ci.yml`
- Tasks:
  - install
  - check
  - lint
  - format:check
  - test:unit
  - test:e2e
  - build
- Verify:
  - GitHub Actions dry review
  - local で同じ command が成功

### K002 Deploy workflow preflight を追加する

- Deps: K001
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - main push trigger
  - workflow_dispatch
  - preflight job
- Verify:
  - workflow syntax review

### K003 D1 migration job を追加する

- Deps: C004, K002
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - Cloudflare auth
  - migration apply
  - failure で deploy 停止
- Verify:
  - secret names docs と一致

### K004 API deploy job を追加する

- Deps: J001, K003
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - Wrangler deploy
  - migration job に依存
- Verify:
  - deploy order が正しい

### K005 Web deploy job を追加する

- Deps: J002, K004
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - Cloudflare Pages deploy
  - API deploy job に依存
- Verify:
  - deploy order が正しい

### K006 Bot deploy job を追加する

- Deps: J003, J004, K005
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - selected Bot target へ deploy
  - `DISCORD_BOT_TOKEN` は secret から注入
- Verify:
  - production token が repo に入っていない

### K007 Smoke check job を追加する

- Deps: K004, K005, K006
- Output:
  - `.github/workflows/deploy.yml`
- Tasks:
  - API health
  - Web URL
  - Bot health/version
- Verify:
  - smoke check output が metadata-only

## Milestone L — Deployment docs

### L001 GitHub Actions Secrets docs を追加する

- Deps: K002
- Output:
  - `docs/deploy/github-actions.md`
- Tasks:
  - required secrets
  - optional secrets
  - GitHub UI 設定手順
  - least privilege
- Verify:
  - `.plan/03-ci-cd-and-secrets.md` と一致

### L002 Cloudflare setup docs を追加する

- Deps: J001, J002
- Output:
  - `docs/deploy/cloudflare.md`
- Tasks:
  - Worker
  - Pages
  - D1
  - Access
  - secrets
- Verify:
  - Actions Secrets と Cloudflare resource 名が対応している

### L003 Local development docs を追加する

- Deps: D003, E002
- Output:
  - `docs/development/local.md`
- Tasks:
  - Docker Compose local startup
  - dev-only auth headers
  - dev shared secret
  - dev Discord Bot token
  - guild/DM allowlist
- Verify:
  - production token を使わない警告がある

## Milestone M — Final gates

### M001 Full local quality gate を通す

- Deps: all implementation tasks
- Output:
  - none
- Tasks:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm test:unit`
  - `pnpm test:e2e`
  - `pnpm build`
- Verify:
  - すべて成功
  - lint は Error / Warn / Info なし

### M002 Forbidden persistence/log fields review

- Deps: all implementation tasks
- Output:
  - review notes if needed
- Tasks:
  - `message content`
  - `prompt`
  - `response text`
  - `credential`
  - `attachment URL`
  - `attachment bytes`
  - `provider raw body`
  - 上記が persistence/log/audit/frontend state にないことを grep/review
- Verify:
  - 問題があれば修正 task を追加

### M003 GitHub Actions deploy dry review

- Deps: K001-K007, L001-L002
- Output:
  - none
- Tasks:
  - required secrets が docs と workflow で一致しているか確認
  - main push deploy order を確認
- Verify:
  - Actions Secrets 設定後、push deploy 可能と判断できる
