# Scope and assumptions

## 対象範囲

本計画は `apps/api-spike` ではなく、本実装の monorepo 構成を対象にする。

作成対象:

```text
apps/api/        # Cloudflare Workers API
apps/web/        # Cloudflare Pages frontend
apps/bot/        # Node.js + discord.js Bot Worker
packages/shared/ # DTO types + Valibot schemas
packages/domain/ # runtime independent domain helpers
packages/data/   # D1 schema / migrations / repositories
packages/provider/ # ChatGPT/Codex provider adapter
```

## 必須到達点

1. GitHub Actions Secrets を設定すれば、main branch への push で deploy が完了する。
2. CI は lint / format / typecheck / unit test / e2e test / build を必ず通す。
3. lint / format は Error / Warn / Info が残らない状態を gate にする。
4. unit test と e2e test を少なくとも 1 本ずつ用意し、継続的に実行する。
5. production D1 migration は deploy 前に forward-only で自動適用する。

## 既存 ADR からの制約

- API は Cloudflare Workers 互換を維持し、Bun 固有 API に依存しない。
- Web は Cloudflare Pages frontend として構築する。
- Bot Worker は長寿命 Node.js process として実行する。
- Bot Worker は D1 / credential / provider backend に直接アクセスしない。
- Owner routes は `/api/v1/owner/*`、Bot routes は `/api/v1/bot/*` に分離する。
- DTO は `packages/shared` で Valibot schema と TypeScript type を共有する。
- Provider-specific protocol と token handling は `packages/provider` に閉じ込める。
- 保存・ログ出力は metadata-only とする。

## Deployment target assumptions

API と Web の deploy target は ADR で決定済み。

- API: Cloudflare Workers
- Web: Cloudflare Pages
- D1: Cloudflare D1

Bot Worker は「Node.js 長寿命 process」として決定済みだが、具体的な hosting target は ADR 上まだ固定されていない。Actions Secrets 設定後に push deploy を完了させるには、Bot deploy target を実装前に確定する必要がある。

### Bot deploy target の最小方針

実装前タスクとして、次のいずれかを ADR または deploy docs に固定する。

- Container host へ deploy: GitHub Actions で Docker image を build/push し、deploy hook または SSH で再起動する
- Managed Node host へ deploy: GitHub Actions から provider CLI/API で deploy する
- Self-hosted runner 上で systemd service を更新する

本計画では target 非依存の抽象名として `BOT_DEPLOY_*` secret を定義し、実装タスク内で具体 target に合わせて確定する。

## 非対象

- `apps/api-spike` の整備
- ChatGPT/Codex provider の完全実装
- 管理 UI の全画面完成
- 本番 credential onboarding flow の完全実装

ただし、deploy pipeline、quality gate、unit/e2e test が成立する最小 skeleton は対象に含める。
