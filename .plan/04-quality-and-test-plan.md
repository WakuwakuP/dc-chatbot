# Quality and test plan

## Quality gate

実装完了時点で以下をすべて満たす。

```bash
pnpm check
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:e2e
pnpm build
```

## Lint / format 要件

- `pnpm lint` は Error / Warn / Info が残らない状態で成功する。
- warning を許容しない。設定上可能な場合は `--max-warnings 0` 相当を使う。
- Info レベルの diagnostic を出す tool を採用する場合は、CI で Info も fail にする wrapper を用意する。
- `pnpm format:check` は差分がある場合に fail する。
- `pnpm format` は開発者がローカルで整形するためのコマンドとして用意する。

## Typecheck 要件

- TypeScript strict mode を維持する。
- `noUncheckedIndexedAccess` と `exactOptionalPropertyTypes` を維持する。
- generated code を導入する場合は、lint 対象から外すか生成元で clean にする。手作業で警告を握りつぶさない。

## Unit test 方針

Unit test は runtime dependency が少ない順に増やす。

### 最初に追加する unit tests

1. `packages/domain`
   - Owner role scope 判定
   - Effective ChatGPT Subscription Connection resolution
   - retention category helper
2. `packages/shared`
   - Valibot DTO schema parse success
   - invalid payload rejection
3. `packages/provider`
   - safe error mapping
   - fake provider behavior
4. `apps/api`
   - auth guard helper
   - route handler health check

### Unit test 禁止事項

- production Discord token を使わない。
- real ChatGPT/Codex backend を呼ばない。
- fixture に Discord message content、prompt、response text、credential、attachment URL/bytes を入れない。

## E2E test 方針

E2E は external production services に依存しない最小 flow から始める。

### 最初の e2e scenario

名前: `bot intake to fake provider response`

Flow:

1. fake Discord event metadata を作る
2. Bot API client が `/api/v1/bot/messages/intake` 相当へ送る
3. API が rule-based response plan を返す
4. fake provider adapter が safe response metadata を返す
5. Bot side が Discord post payload を組み立てる
6. audit に保存される payload が metadata-only であることを確認する

確認すること:

- message content が audit/log payload に残らない
- prompt / response text が persistence payload に残らない
- Bot Worker が D1/provider を直接呼ばない設計を保つ
- response split helper が Discord length limit を守る

### Web e2e scenario

初期段階では minimal shell でよい。

1. Web app を起動
2. Owner UI shell が表示される
3. API health endpoint を mock または test API に向ける
4. 認可されていない状態では protected content を表示しない

## Test package candidates

実装時に dependency compatibility を確認して採用する。

- Unit: Vitest
- API/Workers: Miniflare / Wrangler test utilities / direct handler invocation
- Web e2e: Playwright
- Bot e2e: Discord Gateway に接続しない adapter-level e2e

## Test data safety checklist

- [ ] Discord message content を fixture に含めない
- [ ] prompt body を fixture に含めない
- [ ] response text を fixture に含めない
- [ ] plaintext credential を fixture に含めない
- [ ] attachment URL を fixture に含めない
- [ ] attachment bytes を fixture に含めない
- [ ] provider raw request / response body を fixture に含めない
- [ ] logs/artifacts は metadata-only

## Package-level scripts

各 package/app は原則として以下を提供する。

```json
{
  "scripts": {
    "check": "tsc --noEmit",
    "build": "...",
    "lint": "...",
    "format": "...",
    "format:check": "...",
    "test:unit": "...",
    "test:e2e": "..."
  }
}
```

Package に該当 test がない場合でも、root script が失敗しないように `--if-present` を使うか、空 test を置く。ただし repository 全体では unit と e2e が必ず存在する状態にする。

## Definition of done

- [ ] local で `pnpm check` 成功
- [ ] local で `pnpm lint` が Error / Warn / Info なし
- [ ] local で `pnpm format:check` 成功
- [ ] local で `pnpm test:unit` 成功
- [ ] local で `pnpm test:e2e` 成功
- [ ] local で `pnpm build` 成功
- [ ] GitHub Actions CI で同じ gate が成功
- [ ] GitHub Actions deploy workflow の smoke check が成功
