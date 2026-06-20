# Drizzle + D1 + Workers compatibility spike

Cloudflare Workers 上で Drizzle ORM + D1 が動くかを検証する最小 Worker です。

`apps/api-spike` は互換性検証用であり、本実装の directory structure や責務分離の中心としては扱いません。

## 前提

- Node.js 22+
- pnpm 10+
- Wrangler 4+

## セットアップ

```bash
pnpm install
pnpm --filter api-spike d1:migrate:local
```

## 実行

```bash
pnpm spike:dev
curl http://127.0.0.1:8787/spike/health
curl http://127.0.0.1:8787/spike/run
```

`/spike/run` は互換性チェック一覧を JSON で返します。

## 検証内容

### 動作確認対象 (`compatible`)

- Drizzle D1 driver による D1 CRUD
- Drizzle relations を使ったリレーション読み取り
- Admin Owner / Regular Owner / disabled Owner を想定した手書き policy helper
- policy helper を通した Registered Member の read / create / update

### 既知の制限 (`limitation`)

Cloudflare D1 は Workers binding 経由の interactive transaction をサポートしていないため、Drizzle の `transaction()` も D1 では利用できません。

`/spike/run` では、この interactive transaction limitation を既知の制限として確認します。複数 statement の原子的な実行が必要な箇所は、D1 の制約を前提に `batch()` や処理設計で補う必要があります。

## スキーマ

Drizzle schema は `src/db/schema.ts` に定義しています。dc-chatbot 本番想定の最小モデル（Discord User / Owner / ChatGPT Subscription Connection / Registered Member）を Drizzle の SQLite table 定義として表現しています。

D1 マイグレーションは `migrations/` に手書き SQL として置いています（Workers 実行時は Wrangler D1 binding を使用）。
