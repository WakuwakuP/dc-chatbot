# Implementation plan index

このディレクトリは、実装に入る前の計画を保持します。実装中は各タスクの完了条件を満たしたら checklist を更新します。

## 目的

Actions Secret を設定し、GitHub の main branch へ push したら本実装の API / Web / Bot が検証・デプロイされる状態を作る。

## 計画ファイル

- [`01-scope-and-assumptions.md`](01-scope-and-assumptions.md) — 対象範囲、前提、未決定事項
- [`02-work-breakdown.md`](02-work-breakdown.md) — 小さな実装タスク一覧
- [`03-ci-cd-and-secrets.md`](03-ci-cd-and-secrets.md) — GitHub Actions、Actions Secrets、deploy flow
- [`04-quality-and-test-plan.md`](04-quality-and-test-plan.md) — lint/format/check/test/unit/e2e の品質計画
- [`05-task-checklist.md`](05-task-checklist.md) — 実装中に更新する checklist
- [`06-implementation-tasks.md`](06-implementation-tasks.md) — そのまま着手できる実タスク backlog

## 完了条件

- [x] `apps/api` / `apps/web` / `apps/bot` / `packages/*` の本実装 skeleton がある
- [x] root scripts と各 package scripts が揃っている
- [x] `pnpm check` が成功する
- [x] `pnpm lint` が Error / Warn / Info なしで成功する
- [x] `pnpm format` または `pnpm format:check` が差分なしで成功する
- [x] unit test が存在し、`pnpm test:unit` が成功する
- [x] e2e test が存在し、`pnpm test:e2e` が成功する
- [x] GitHub Actions CI が check / lint / format / unit / e2e / build を実行する
- [x] GitHub Actions CD skeleton が preflight を実行し、デプロイ先未決定時は platform command 前に安全に skip する
- [x] Required Actions Secrets の一覧が `README.md` または deploy docs に記載されている
- [x] Bot deploy target はユーザー指示により保留し、理由と後続判断を `docs/deploy/decisions/bot-deploy-target-pending.md` に記録している

## 実装時の注意

- `apps/api-spike` は検証用なので、本実装の責務分離や package 境界の中心として扱わない。
- ADR と矛盾する実装判断が必要になった場合は、実装前に ADR を追加または更新する。
- Discord message content / prompt / response / credential / attachment URL・bytes / provider raw body は保存・ログ出力しない。
