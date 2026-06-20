# MVP implementation backlog from grill-with-docs log

このリストは `grill-with-docs-log.md` の決定内容を、現 skeleton から本実装へ進めるためのタスクへ分解したものです。`apps/api-spike` は production 実装対象に含めない。

## P0 — 安全な縦断スライス

- [x] Shared DTO を message intake / context fetch / response generation の実運用形へ拡張する
  - Bot intake は trigger message content を transient に送れる
  - API response は context fetch plan を明示する
  - API error は metadata-only Problem Details 形式に寄せる
- [x] Data repository を追加し、API が D1 operational state を参照・更新できるようにする
  - Owner identity lookup
  - Registered Member / Owner allow 判定
  - Effective ChatGPT Subscription Connection lookup
  - Candidate Discord User upsert
  - request/provider/selected context metadata insert
- [x] API intake を skeleton 判定から DB-backed 判定へ置き換える
  - client-provided `isAllowedUser` を認可根拠にしない
  - non-allowed human は Candidate Discord User として metadata-only 記録
  - automated source は default ignore
  - request audit は metadata-only で保存する
- [x] API respond を Effective ChatGPT Subscription Connection 解決 + provider audit + selected context message ID 保存へ接続する
- [x] Bot Worker に実 messageCreate handler を追加する
  - DM / guild mention を Response Trigger として intake 送信
  - API の context fetch plan に従い transient に recent message IDs だけを response request へ渡す
  - Discord 返信分割を使って final response を投稿する
  - automated bot/webhook は default ignore

## P1 — Owner management MVP

- [x] `apps/api` に Owner dashboard summary endpoint を追加する
- [x] `apps/api` に Registered Member list/create/disable endpoint を追加する
- [x] `apps/api` に Candidate Discord User list/promote endpoint を追加する
- [x] `apps/api` に model settings / prompt settings metadata endpoint を追加する
- [x] `apps/web` に Owner dashboard / Members / Candidates / Settings の実 API client を接続する
- [x] Admin Owner / Regular Owner の表示範囲と mutation 権限を API と UI の両方で実装する

## P2 — Credential / provider lifecycle

- [x] ChatGPT Subscription Connection 接続開始・callback・CSRF/state TTL の skeleton を実装する
- [x] credential envelope encryption を API 側で実装し、D1 には AES-GCM envelope のみ保存する
- [x] per-user data encryption key 管理を追加する
- [ ] lazy refresh / refresh lock / needsReconnect transition を実装する
- [ ] reconnect reminder / owner notification metadata と Bot DM 配送フローを end-to-end 接続する
- [ ] fake provider を production provider adapter へ差し替え可能な factory にする

## P3 — Discord behavior completeness

- [x] reply chain / thread / DM の context fetch を transient content payload まで扱う response request へ拡張する
- [x] Markdown-aware splitting で code fence を閉じ直す
- [ ] owner notification DM delivery 指示と delivery status update を end-to-end 接続する
- [x] API unavailable / provider timeout / context fetch failure の日本語 user-facing wording を実装する
- [x] Automated Trigger Source の allowlist、cooldown、reply mode、loop prevention を実装する

## P4 — Retention / operations / deployment

- [x] migration に core foreign keys と不足 table（owner_notifications, settings, automated_trigger_sources, response message metadata など）を追加する
- [x] scheduled cleanup の batch 化、cleanup run audit、失敗時 metadata audit を実装する
- [x] Wrangler / Pages / Bot deployment config と GitHub Actions deploy pipeline skeleton を追加する
- [x] D1 migration deploy gate と smoke check skeleton を追加する

## Remaining external/manual gaps

- [x] Cloudflare Access user JWT の Worker 内検証を追加する
- [ ] 本番 Cloudflare Access app/JWKS/AUD と実 `Cf-Access-Jwt-Assertion` で smoke test する
- [ ] 本番 ChatGPT/Codex provider adapter と token refresh runtime を実装する
- [ ] Bot Worker の本番ホスト先と更新手順を確定し、deploy placeholder を実処理に置き換える
- [ ] Cloudflare D1 / Pages / Workers の実 resource ID、secrets、Access policy を本番環境で設定する

## Privacy checklist

- [x] Discord message content を D1・logs・audit・frontend state に保存していない
- [x] Conversation Context content / prompt / response text を D1・logs・audit・frontend state に保存していない
- [x] plaintext credential material / attachment URL / attachment bytes / provider raw body を保存していない
- [x] logs は metadata-only structured log に限定している
