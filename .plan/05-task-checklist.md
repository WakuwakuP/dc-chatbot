# Task checklist

実装中の進捗管理用 checklist。

## Phase 0

- [x] P0-01 Bot deployment target 保留判断を文書化する
- [x] P0-02 Root scripts 方針を確定する
- [x] P0-03 package naming convention を決める

## Phase 1

- [x] P1-01 `packages/shared` skeleton
- [x] P1-02 `packages/domain` skeleton
- [x] P1-03 `packages/data` skeleton
- [x] P1-04 `packages/provider` skeleton
- [x] P1-05 `apps/api` skeleton
- [x] P1-06 `apps/web` skeleton
- [x] P1-07 `apps/bot` skeleton

## Phase 2

- [x] P2-01 TypeScript project references or workspace checks
- [x] P2-02 Oxlint を導入する
- [x] P2-03 Oxfmt/format gate を導入する
- [x] P2-04 Biome fallback 判断点を文書化する

## Phase 3

- [x] P3-01 Unit test framework を導入する
- [x] P3-02 `packages/domain` unit test を追加する
- [x] P3-03 `packages/shared` schema unit test を追加する
- [x] P3-04 API route unit/integration test を追加する
- [x] P3-05 E2E test framework を導入する
- [x] P3-06 Minimal e2e scenario を追加する

## Phase 4

- [x] P4-01 CI workflow を追加する
- [x] P4-02 CI cache を追加する
- [x] P4-03 CI artifacts を整理する

## Phase 5

- [x] J000 Docker Compose local development を追加する
- [x] P5-01 Cloudflare D1 migration workflow skeleton を追加する
- [x] P5-02 API deploy job skeleton を追加する
- [x] P5-03 Web deploy job skeleton を追加する
- [x] P5-04 Bot deploy job は target 保留として preflight skip にする
- [x] P5-05 Deployment verification は target 保留として docs に後続化する

## Phase 6

- [x] P6-01 Actions Secrets docs を追加する
- [x] P6-02 Local development docs を追加する
- [x] P6-03 Deployment runbook を追加する

## Final gate

- [x] `pnpm check`
- [x] `pnpm lint` Error / Warn / Info なし
- [x] `pnpm format:check`
- [x] `pnpm test:unit`
- [x] `pnpm test:e2e`
- [x] `pnpm build`
- [x] GitHub Actions CI workflow を追加
- [x] GitHub Actions deploy skeleton は target 保留時に安全に skip
