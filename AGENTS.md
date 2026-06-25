# AGENTS.md

このファイルは、このリポジトリで作業する AI エージェントと開発者向けのプロジェクト固有ルールです。

## 最初に確認するもの

設計や実装方針を判断する前に、必要に応じて以下を確認してください。

1. `CONTEXT.md` — ドメイン用語の正準表現
2. `docs/adr/README.md` — ADR の索引
3. `docs/adr/*.md` — 関連する設計決定
4. `README.md` — 本実装の目標 directory structure と component responsibility
5. 対象 package/app の `README.md` と `package.json`

ADR が実装と矛盾している場合は、勝手に実装へ合わせて設計を変えず、ADR の追加・更新が必要かを明示してください。

## プロジェクト概要

`dc-chatbot` は Private Bot です。Discord users は自分の、または割り当てられた Owner Discord User の ChatGPT Subscription Connection を使って bot 経由で ChatGPT/Codex backend を利用します。

主要コンポーネント:

- Cloud
flare Workers API: authorization、D1、credential handling、provider calls、bot-facing endpoints
- Cloudflare Pages frontend: Owner Discord User 向け management UI
- Bot Worker: `discord.js` を使う長寿命 Node.js process
- Cloudflare D1: operational state と metadata storage
- Provider adapter: ChatGPT/Codex subscription backend との境界

`apps/api-spike` は compatibility spike です。本実装の責務分離や directory structure の中心として扱わないでください。

## 本実装の directory structure 方針

新規実装は原則として以下の配置に寄せます。

```text
apps/api/        # Cloudflare Workers API。D1、auth、credential、provider call、audit を所有
apps/web/        # Cloudflare Pages frontend。Vite + React + React Router + Tailwind CSS + shadcn/ui の Owner UI
apps/bot/        # Node.js + discord.js Bot Worker。Discord Gateway と返信投稿を担当
packages/shared/ # DTO types と Valibot runtime schemas
packages/domain/ # runtime 非依存の domain types / state / policy helper
packages/data/   # Drizzle ORM + D1 schema、hand-written forward-only migrations、repository/data access helper
packages/provider/ # ChatGPT/Codex subscription backend adapter
```

配置ルール:

- API route、D1 access、credential handling、provider calls は `apps/api` 側に置きます。
- Discord Gateway client と Discord message fetch/post は `apps/bot` 側に置きます。
- Owner UI は `apps/web` 側に置き、Vite + React + React Router + Tailwind CSS + shadcn/ui を使います。
- API/Web/Bot 間 DTO は `packages/shared` に置き、Valibot schema と TypeScript type を共有します。
- domain-level helper は `packages/domain` に置き、Cloudflare/Discord/provider runtime に依存させません。
- Drizzle ORM table schema、D1 migrations、query/repository helper は `packages/data` に置きます。
- ChatGPT/Codex の provider-specific protocol、token handling、safe error mapping は `packages/provider` に閉じ込めます。
- `apps/api-spike` は検証・参考用です。本実装の都合で spike を無理に整備しないでください。

## ドメイン用語

`CONTEXT.md` の用語を使ってください。特に以下の表現を優先します。

- ChatGPT Subscription Connection
- Effective ChatGPT Subscription Connection
- Discord User
- Candidate Discord User
- Registered Member
- Owner Discord User
- Admin Owner / Regular Owner
- Private Bot
- Conversation Context
- Response Trigger / Response Decision
- Automated Trigger Source

避ける表現の例:

- API key
- shared session
- scraped browser session
- customer
- subscriber
- public bot / SaaS bot
- memory / transcript archive

## セキュリティ・プライバシーの絶対ルール

以下を D1、ログ、request audit、provider audit、owner notification、frontend state に保存しないでください。

- Discord message content
- selected Conversation Context content
- prompt body
- response text
- plaintext credential material
- ChatGPT credential history
- attachment URLs
- attachment bytes
- provider raw request / response body

ログは metadata-only の structured log にしてください。Error object や stack trace をそのまま出力して、credential・message・prompt・response が混入しないようにしてください。

保存してよいものは、原則として安全な metadata のみです。例: IDs、actor type、event type、status/error category、model、duration、request ID、provider call ID、件数、サイズ、retention cleanup 対象日時。

## アーキテクチャ上の境界

- Bot Worker は D1 に直接アクセスしません。
- Bot Worker は ChatGPT credential を保持・復号・refresh しません。
- Bot Worker は provider backend を直接呼びません。
- Bot Worker は Cloudflare Access Service Token で `/api/v1/bot/*` を呼び出します。
- Owner human routes は `/api/v1/owner/*` に置き、Cloudflare Access user identity と owner role を検証します。
- Bot service routes は `/api/v1/bot/*` に置き、Cloudflare Access service identity を検証します。
- Provider-specific protocol、token handling、safe error mapping は provider adapter の内側に閉じ込めます。
- API code は Cloudflare Workers 互換を維持し、Bun 固有 API に依存しません。

## Discord message handling

- DM は Allowed Discord User からのものだけ応答検討対象です。
- Guild では bot mention を Response Trigger とします。
- non-allowed user には返信せず、Candidate Discord User として記録・更新します。
- non-allowed DM は owner notification 対象ですが、guild mention は DM 通知しません。
- Automated Discord bot / webhook messages はデフォルトで無視します。
- 明示的に許可された Automated Trigger Source は trigger-only context を使い、MVP では Context Selection LLM、Response Decision LLM、画像/テキスト attachment 処理を使いません。
- Conversation Context は必要時に Discord から取得し、長期 memory として保存しません。

## Data retention / D1 方針

- Discord snowflake ID は JavaScript number precision を避けるため `TEXT` として扱います。
- audit/event/settings 系の一般 ID は ULID text ID を使う方針です。
- timestamp は ISO 8601 UTC text を使います。
- D1 schema は lifecycle ごとに table を分けます。
- request/provider audit metadata は原則 1 年保持します。
- candidate state、owner notification history、non-allowed usage attempts、selected context message IDs など短期診断 metadata は 30 日保持を基本とします。
- retention は API Worker の scheduled cleanup job で自動化します。
- production data layer は Drizzle ORM + hand-written forward-only D1 migrations を採用します。
- access policy と authorization-sensitive mutation は domain/API/repository helper に明示し、data layer runtime の暗黙 policy mutation に委譲しません。
- production migration は forward-only です。down migration 前提の rollback を設計しないでください。

## Tooling / workspace

- Node.js: `24` (`.node-version`)
- Package manager: `pnpm@10.25.0`
- Workspace: `apps/*`, `packages/*`
- TypeScript は strict mode を前提にします。
- lint/format の初期方針は Oxlint/Oxfmt、問題があれば Biome fallback です。
- shadcn/ui を使う UI は既存 component を優先し、semantic tokens と component variants を使います。

現時点の基本コマンド:

```bash
pnpm install
```

本実装 package を追加した後は、root scripts を以下のように揃える想定です。

```bash
pnpm check
pnpm build
pnpm lint
pnpm format
pnpm test
```

## `apps/api-spike` に関する注意

`apps/api-spike` は Cloudflare Workers + Drizzle + D1 の compatibility/reference spike です。

本実装時に参照してよい点:

- Drizzle + D1 CRUD の検証観点
- relation read の検証観点
- hand-written D1 migration の検証観点
- D1 transaction 制限のリスク

本実装時に避けること:

- `apps/api-spike` の構成を production directory structure として扱う
- spike の都合で API/Web/Bot/shared の境界を崩す
- transaction 制限を無視して production data layer を決める

ADR 0026 は ZenStack spike の判断材料として残し、production data layer は ADR 0056 に従って Drizzle ORM + hand-written forward-only D1 migrations を採用してください。

## 変更時の姿勢

- 既存 ADR と矛盾する変更は避けてください。
- 仕様判断を変える場合は ADR を追加または更新してください。
- user-facing Discord message は、日本語が必要な場面では日本語で書いてください。
- secrets や token を repository に追加しないでください。
- production Bot token を local development に使わないでください。
- local auth bypass は production で無効化・拒否される前提で実装してください。
- 実装後は、変更範囲に最も近い check/test/build を実行し、結果を報告してください。
