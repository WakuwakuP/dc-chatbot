# Work breakdown

タスクは小さく保つ。各 task は原則 1 pull request 相当、または 1 commit 相当に分割できる粒度にする。

## Phase 0 — 実装前の決定と整備

### P0-01 Bot deployment target を決める

- 対象: `docs/adr/` または `docs/deploy/`
- 内容:
  - Bot Worker の hosting target を決める
  - deploy method を GitHub Actions から呼べる形にする
  - 必要な Actions Secrets を確定する
- 完了条件:
  - Bot deploy target が文書化されている
  - `BOT_DEPLOY_*` secrets の具体名と用途が決まっている

### P0-02 Root scripts 方針を確定する

- 対象: `package.json`
- 内容:
  - `check`, `build`, `lint`, `format`, `format:check`, `test`, `test:unit`, `test:e2e` の root script を定義する
- 完了条件:
  - root から全 package の品質コマンドを実行できる

### P0-03 package naming convention を決める

- 対象: `package.json`, `pnpm-workspace.yaml`, package README
- 内容:
  - 例: `@dc-chatbot/shared`, `@dc-chatbot/domain`, `@dc-chatbot/data`, `@dc-chatbot/provider`
- 完了条件:
  - import path と workspace dependency が一貫している

## Phase 1 — Workspace skeleton

### P1-01 `packages/shared` skeleton

- 対象: `packages/shared`
- 内容:
  - package.json
  - tsconfig
  - `src/index.ts`
  - Valibot dependency
  - minimal DTO schema
- 完了条件:
  - `pnpm --filter @dc-chatbot/shared check` が成功する

### P1-02 `packages/domain` skeleton

- 対象: `packages/domain`
- 内容:
  - domain enum / status helper
  - runtime 依存なしの testable helper
- 完了条件:
  - Cloudflare / Discord / provider dependency がない
  - unit test 対象 helper がある

### P1-03 `packages/data` skeleton

- 対象: `packages/data`
- 内容:
  - D1 schema directory
  - forward-only migrations directory
  - repository interface skeleton
  - migration README
- 完了条件:
  - Discord snowflake ID が `TEXT` 方針で表現されている
  - migration naming rule がある

### P1-04 `packages/provider` skeleton

- 対象: `packages/provider`
- 内容:
  - provider adapter interface
  - safe error category type
  - fake provider implementation for tests/e2e
- 完了条件:
  - raw provider body を外へ出さない interface になっている

### P1-05 `apps/api` skeleton

- 対象: `apps/api`
- 内容:
  - Cloudflare Workers app
  - health endpoint
  - `/api/v1/owner/*` と `/api/v1/bot/*` route group skeleton
  - dev-only auth guard skeleton
- 完了条件:
  - Worker build が成功する
  - owner/bot route の境界が code 上分かれている

### P1-06 `apps/web` skeleton

- 対象: `apps/web`
- 内容:
  - Cloudflare Pages frontend skeleton
  - minimal Owner UI shell
  - API client skeleton using `packages/shared`
- 完了条件:
  - Web build が成功する

### P1-07 `apps/bot` skeleton

- 対象: `apps/bot`
- 内容:
  - Node.js + discord.js package skeleton
  - dev safety rails config
  - Bot API client skeleton
- 完了条件:
  - Bot build が成功する
  - D1 / provider dependency がない

## Phase 2 — Quality tooling

### P2-01 TypeScript project references or workspace checks

- 対象: root/package tsconfig
- 内容:
  - strict typecheck を全 package に適用する
- 完了条件:
  - `pnpm check` が全 package で成功する

### P2-02 Oxlint を導入する

- 対象: root config
- 内容:
  - `pnpm lint` を追加
  - warning を失敗扱いにする
- 完了条件:
  - Error / Warn / Info が残らない

### P2-03 Oxfmt を導入する

- 対象: root config
- 内容:
  - `pnpm format`
  - `pnpm format:check`
- 完了条件:
  - format check が差分なしで成功する

### P2-04 Biome fallback 判断点を文書化する

- 対象: README or docs/tooling
- 内容:
  - Oxfmt/Oxlint で運用困難な場合の Biome fallback 条件を書く
- 完了条件:
  - fallback 条件が明文化されている

## Phase 3 — Tests

### P3-01 Unit test framework を導入する

- 対象: root/package config
- 内容:
  - Vitest など Workers/Node で扱いやすい test runner を導入
- 完了条件:
  - `pnpm test:unit` が root から実行できる

### P3-02 `packages/domain` unit test を追加する

- 対象: `packages/domain`
- 内容:
  - Effective connection resolution または owner role scope helper の unit test
- 完了条件:
  - 失敗時に domain regression が分かる test 名になっている

### P3-03 `packages/shared` schema unit test を追加する

- 対象: `packages/shared`
- 内容:
  - Valibot DTO schema の parse success/failure test
- 完了条件:
  - invalid payload が拒否されることを確認する

### P3-04 API route unit/integration test を追加する

- 対象: `apps/api`
- 内容:
  - health endpoint
  - owner/bot route auth guard の最小 test
- 完了条件:
  - credential/message content を fixture に含めない

### P3-05 E2E test framework を導入する

- 対象: root/e2e config
- 内容:
  - API Worker と Web/Bot skeleton の最小 e2e を実行できる runner を用意
- 完了条件:
  - `pnpm test:e2e` が root から実行できる

### P3-06 Minimal e2e scenario を追加する

- 対象: e2e tests
- 内容:
  - fake provider を使う
  - Bot intake → API decision → fake response の metadata-only flow を検証
- 完了条件:
  - Discord 本番 API や production credential に依存しない

## Phase 4 — CI

### P4-01 CI workflow を追加する

- 対象: `.github/workflows/ci.yml`
- 内容:
  - pnpm install
  - check
  - lint
  - format:check
  - test:unit
  - test:e2e
  - build
- 完了条件:
  - pull_request と push で実行される

### P4-02 CI cache を追加する

- 対象: `.github/workflows/ci.yml`
- 内容:
  - pnpm store cache
- 完了条件:
  - lockfile に基づく cache key になっている

### P4-03 CI artifacts を整理する

- 対象: `.github/workflows/ci.yml`
- 内容:
  - e2e failure logs など safe metadata のみ artifact 化
- 完了条件:
  - message content / credential が artifact に入らない

## Phase 5 — CD / Deploy

### P5-01 Cloudflare D1 migration workflow を追加する

- 対象: `.github/workflows/deploy.yml`
- 内容:
  - deploy 前に D1 migration を apply
  - failure したら deploy を止める
- 完了条件:
  - forward-only migration 前提になっている

### P5-02 API deploy job を追加する

- 対象: `.github/workflows/deploy.yml`, `apps/api`
- 内容:
  - Wrangler deploy
- 完了条件:
  - API deploy が D1 migration 後に実行される

### P5-03 Web deploy job を追加する

- 対象: `.github/workflows/deploy.yml`, `apps/web`
- 内容:
  - Cloudflare Pages deploy
- 完了条件:
  - API deploy 成功後に Web deploy が実行される

### P5-04 Bot deploy job を追加する

- 対象: `.github/workflows/deploy.yml`, `apps/bot`
- 内容:
  - P0-01 で決めた target へ deploy
- 完了条件:
  - main push で Bot Worker が更新される

### P5-05 Deployment verification を追加する

- 対象: `.github/workflows/deploy.yml`
- 内容:
  - API health check
  - Web URL check
  - Bot deploy target health or version check
- 完了条件:
  - deploy 後の smoke check が成功する

## Phase 6 — Docs / Operations

### P6-01 Actions Secrets docs を追加する

- 対象: `README.md` or `docs/deploy/github-actions.md`
- 内容:
  - required secrets
  - optional secrets
  - least-privilege guidance
- 完了条件:
  - secrets 設定者が GitHub UI で迷わない

### P6-02 Local development docs を追加する

- 対象: README or package README
- 内容:
  - local auth bypass
  - dev Bot token safety rails
  - local D1 migration
- 完了条件:
  - production token を使わない注意が明記されている

### P6-03 Deployment runbook を追加する

- 対象: `docs/deploy/`
- 内容:
  - push deploy flow
  - migration failure recovery
  - rollback/roll-forward policy
- 完了条件:
  - forward-only migration と一致している
