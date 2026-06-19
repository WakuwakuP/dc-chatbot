# Task checklist

実装中の進捗管理用 checklist。

## Phase 0

- [ ] P0-01 Bot deployment target を決める
- [ ] P0-02 Root scripts 方針を確定する
- [ ] P0-03 package naming convention を決める

## Phase 1

- [ ] P1-01 `packages/shared` skeleton
- [ ] P1-02 `packages/domain` skeleton
- [ ] P1-03 `packages/data` skeleton
- [ ] P1-04 `packages/provider` skeleton
- [ ] P1-05 `apps/api` skeleton
- [ ] P1-06 `apps/web` skeleton
- [ ] P1-07 `apps/bot` skeleton

## Phase 2

- [ ] P2-01 TypeScript project references or workspace checks
- [ ] P2-02 Oxlint を導入する
- [ ] P2-03 Oxfmt を導入する
- [ ] P2-04 Biome fallback 判断点を文書化する

## Phase 3

- [ ] P3-01 Unit test framework を導入する
- [ ] P3-02 `packages/domain` unit test を追加する
- [ ] P3-03 `packages/shared` schema unit test を追加する
- [ ] P3-04 API route unit/integration test を追加する
- [ ] P3-05 E2E test framework を導入する
- [ ] P3-06 Minimal e2e scenario を追加する

## Phase 4

- [ ] P4-01 CI workflow を追加する
- [ ] P4-02 CI cache を追加する
- [ ] P4-03 CI artifacts を整理する

## Phase 5

- [ ] P5-01 Cloudflare D1 migration workflow を追加する
- [ ] P5-02 API deploy job を追加する
- [ ] P5-03 Web deploy job を追加する
- [ ] P5-04 Bot deploy job を追加する
- [ ] P5-05 Deployment verification を追加する

## Phase 6

- [ ] P6-01 Actions Secrets docs を追加する
- [ ] P6-02 Local development docs を追加する
- [ ] P6-03 Deployment runbook を追加する

## Final gate

- [ ] `pnpm check`
- [ ] `pnpm lint` Error / Warn / Info なし
- [ ] `pnpm format:check`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`
- [ ] GitHub Actions CI pass
- [ ] GitHub Actions deploy pass
