# Architecture Decision Records

このディレクトリは `dc-chatbot` の主要な設計決定を記録します。

実装方針を判断するときは、まず `CONTEXT.md` のドメイン用語を確認し、その後に関連 ADR を確認してください。実装と ADR が矛盾する場合は、黙って実装へ合わせるのではなく、ADR の追加・更新が必要かを明示してください。

## 読み方

- 番号が大きい ADR ほど後続の判断です。
- 同じ領域で判断が重なる場合は、後続 ADR の内容を優先して解釈してください。
- ADR は原則として設計上の制約です。実装の都合で変更する場合は、新しい ADR を追加するか既存 ADR を更新してください。
- ADR 0059 は ChatGPT Subscription Connection を前提にした provider credential / connection lifecycle / connection assignment の判断を supersede します。古い ADR の該当部分は historical context として扱い、Private Bot authorization、metadata-only audit、retention、API/Bot/provider 境界などの非競合部分だけを継続して使います。

## 主要テーマ

### セキュリティ / プライバシー

- Production provider credential は NVIDIA NIM API key で、API Worker secret として扱います。
- NVIDIA NIM API key / bearer token は D1、frontend、Bot Worker、repository、audit、log へ出しません。
- Discord message content、Conversation Context content、prompt、response text、NVIDIA NIM API key / bearer token、attachment URL/bytes、provider raw body は保存しません。
- audit/log は metadata-only とします。

関連 ADR: 0001, 0002, 0003, 0032, 0039, 0043, 0048, 0053, 0054, 0059

### Cloudflare / Bot / API 境界

- Control Plane は Cloudflare Workers API と Cloudflare Pages frontend に分離します。
- Bot Worker は `discord.js` の長寿命 Node.js process として実行します。
- Bot Worker は D1 と NVIDIA NIM API key / bearer token に直接アクセスせず、Cloudflare Access Service Token で bot route を呼びます。
- Owner route と Bot route は `/api/v1/owner/*` と `/api/v1/bot/*` に分けます。

関連 ADR: 0004, 0005, 0006, 0022, 0023, 0024, 0027, 0040, 0044

### Discord message handling

- Allowed Discord User の DM と guild channel message を Response Trigger とします。guild mention は明示 mention 付きの互換 trigger として残します。
- non-allowed user には返信せず、Candidate Discord User として記録・更新します。
- Conversation Context は Discord から必要時に取得し、長期保存しません。
- Automated Discord bot / webhook はデフォルト無視し、明示許可された Automated Trigger Source だけ制限付きで扱います。

関連 ADR: 0007, 0008, 0013, 0014, 0015, 0019, 0020, 0021, 0028, 0029, 0030, 0031, 0045, 0046, 0047, 0060

### Owner / Registered Member / provider access

- MVP では Registered Member は owner-controlled authorization と Configured Provider Access によって bot を使います。
- Production provider credential は deployment-scoped NVIDIA NIM API key であり、per-owner / per-member provider credential assignment は行いません。
- Owner は Admin Owner と Regular Owner に分けます。
- Regular Owner が登録した member は、その Regular Owner の management scope に割り当てます。
- Cloudflare Access identity は Owner record に map します。

関連 ADR: 0009, 0010, 0011, 0012, 0036, 0037, 0038, 0040, 0059

### Provider / response generation

- NVIDIA NIM provider backend は API Worker から provider adapter 経由で呼びます。
- Provider-specific protocol、token handling、safe error mapping は adapter に閉じ込めます。
- Provider output は内部的には streaming し、Discord には最終応答または分割済み chunk を投稿します。
- ADR 0059 は ADR 0058 と古い ChatGPT Subscription Connection 前提の provider/credential lifecycle 判断を supersede します。

関連 ADR: 0016, 0017, 0018, 0033, 0034, 0041, 0042, 0052, 0058, 0059

### 本実装の workspace / directory structure

- pnpm workspace で `apps/*` と `packages/*` を分けます。
- `apps/api` は Cloudflare Workers API として、auth、D1、NVIDIA NIM API key handling、provider calls、audit を所有します。
- `apps/web` は Cloudflare Pages frontend として、Vite + React + React Router + Tailwind CSS + shadcn/ui の Owner Discord User 向け management UI を所有します。
- `apps/bot` は Node.js + `discord.js` の Bot Worker として、Discord Gateway と返信投稿を所有します。
- `packages/shared` は API/Web/Bot 間 DTO と Valibot schemas を所有します。
- `packages/domain`、`packages/data`、`packages/provider` は runtime 非依存 domain helper、Drizzle ORM による D1 data access、provider adapter の境界として使います。
- `apps/api-spike` は compatibility/reference spike であり、production directory structure の中心として扱いません。

関連 ADR: 0022, 0023, 0025, 0027, 0049, 0052, 0056, 0057, 0059

### Data layer / D1 / tooling

- D1 table は lifecycle ごとに分けます。
- Discord snowflake ID は `TEXT`、一般 ID は ULID text、timestamp は ISO 8601 UTC text を使います。
- Production migration は forward-only で、GitHub Actions による自動適用を想定します。
- Production data layer は Drizzle ORM + hand-written forward-only D1 migrations を採用し、ZenStack は採用しません。
- Access policy と authorization-sensitive mutation は domain/API/repository helper に明示します。
- ADR 0026 は ZenStack spike の判断材料として残し、production data layer の決定は ADR 0056 を優先します。
- pnpm workspace、Workers-compatible Elysia、Valibot shared DTO、Oxlint/Oxfmt を初期方針とします。

関連 ADR: 0025, 0026, 0035, 0049, 0050, 0051, 0055, 0056

## ADR 一覧

| ADR                                                                          | 決定                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [0001](0001-store-chatgpt-credentials-encrypted-in-d1.md)                    | Store ChatGPT credentials encrypted in D1                                       |
| [0002](0002-use-per-user-data-encryption-keys.md)                            | Use per-user data encryption keys                                               |
| [0003](0003-use-cloudflare-secrets-for-master-key.md)                        | Use Cloudflare secrets for master key                                           |
| [0004](0004-host-control-plane-on-cloudflare-behind-zero-trust.md)           | Host control plane on Cloudflare behind Zero Trust                              |
| [0005](0005-run-discord-bot-worker-as-node-process.md)                       | Run Discord bot worker as Node process                                          |
| [0006](0006-authenticate-bot-worker-with-cloudflare-access-service-token.md) | Authenticate Bot Worker with Cloudflare Access service token                    |
| [0007](0007-store-discord-allowlist-in-d1.md)                                | Store Discord allowlist in D1                                                   |
| [0008](0008-derive-conversation-context-from-discord.md)                     | Derive conversation context from Discord                                        |
| [0009](0009-use-user-chatgpt-connection-for-response-decisions.md)           | Use effective ChatGPT connection for response decisions                         |
| [0010](0010-use-owner-chatgpt-connection-for-members-in-mvp.md)              | Use owner ChatGPT connection for members in MVP                                 |
| [0011](0011-owner-manages-registered-members.md)                             | Owner manages registered members                                                |
| [0012](0012-owner-only-management-web-in-mvp.md)                             | Owner-only management web in MVP                                                |
| [0013](0013-support-manual-and-candidate-member-registration.md)             | Support manual and candidate member registration                                |
| [0014](0014-record-visible-message-authors-as-candidates.md)                 | Record visible message authors as candidates                                    |
| [0015](0015-enable-discord-message-content-intent.md)                        | Enable Discord Message Content Intent                                           |
| [0016](0016-call-chatgpt-codex-backend-from-serverless-api.md)               | Call ChatGPT Codex backend from serverless API                                  |
| [0017](0017-stream-internally-but-post-final-discord-reply.md)               | Stream internally but post final Discord reply                                  |
| [0018](0018-split-long-discord-replies-during-streaming.md)                  | Split long Discord replies during streaming                                     |
| [0019](0019-select-conversation-context-by-discord-conversation-boundary.md) | Select conversation context by Discord conversation boundary                    |
| [0020](0020-allow-visible-non-member-messages-in-conversation-context.md)    | Allow visible non-member messages in conversation context                       |
| [0021](0021-ignore-non-members-and-notify-owner.md)                          | Ignore non-members and notify the owner                                         |
| [0022](0022-split-cloudflare-workers-api-and-pages-frontend.md)              | Split Cloudflare Workers API and Pages frontend                                 |
| [0023](0023-separate-owner-and-bot-api-routes.md)                            | Separate owner and bot API routes                                               |
| [0024](0024-use-dev-only-auth-headers-locally.md)                            | Use dev-only auth headers locally                                               |
| [0025](0025-use-pnpm-workspace-and-workers-compatible-elysia.md)             | Use pnpm workspace and Workers-compatible Elysia                                |
| [0026](0026-spike-zenstack-on-cloudflare-workers-d1.md)                      | Spike ZenStack on Cloudflare Workers and D1                                     |
| [0027](0027-keep-bot-worker-db-access-behind-api.md)                         | Keep Bot Worker DB access behind API                                            |
| [0028](0028-use-message-intake-endpoint-for-bot-events.md)                   | Use message intake endpoint for bot events                                      |
| [0029](0029-send-message-content-to-intake.md)                               | Send message content to intake                                                  |
| [0030](0030-fetch-recent-discord-messages-after-intake-decision.md)          | Fetch recent Discord messages after intake decision                             |
| [0031](0031-use-two-stage-response-decisions.md)                             | Use two-stage response decisions                                                |
| [0032](0032-store-request-audit-metadata-only.md)                            | Store request audit metadata only                                               |
| [0033](0033-lazily-refresh-chatgpt-credentials.md)                           | Lazily refresh ChatGPT credentials                                              |
| [0034](0034-notify-owner-when-chatgpt-connection-needs-reconnect.md)         | Notify the owner when ChatGPT connection needs reconnect                        |
| [0035](0035-separate-d1-tables-by-lifecycle.md)                              | Separate D1 tables by lifecycle                                                 |
| [0036](0036-support-multiple-owners-and-member-connection-assignment.md)     | Support multiple owners and member connection assignment                        |
| [0037](0037-use-admin-and-regular-owner-roles.md)                            | Use admin and regular owner roles                                               |
| [0038](0038-assign-regular-owner-registrations-to-self.md)                   | Assign regular-owner registrations to self                                      |
| [0039](0039-store-connection-metadata-history-only.md)                       | Store connection metadata history only                                          |
| [0040](0040-map-cloudflare-access-identity-to-owner.md)                      | Map Cloudflare Access identity to owner records                                 |
| [0041](0041-store-model-settings-in-database.md)                             | Store model settings in the database                                            |
| [0042](0042-separate-prompt-settings-from-bot-settings.md)                   | Separate prompt settings from singleton bot settings                            |
| [0043](0043-audit-important-setting-changes.md)                              | Audit important setting changes as metadata                                     |
| [0044](0044-run-local-bot-by-default-with-dev-safety-rails.md)               | Run local bot by default with dev safety rails                                  |
| [0045](0045-support-discord-image-vision-without-persisting-images.md)       | Support Discord image vision without persisting images                          |
| [0046](0046-support-limited-text-attachments-without-persisting-content.md)  | Support limited text attachments without persisting content                     |
| [0047](0047-ignore-automated-discord-sources-by-default.md)                  | Ignore automated Discord sources by default                                     |
| [0048](0048-log-metadata-only.md)                                            | Log metadata only                                                               |
| [0049](0049-share-dto-schemas-with-valibot.md)                               | Share DTO schemas with Valibot                                                  |
| [0050](0050-use-oxlint-and-oxfmt-with-biome-fallback.md)                     | Use Oxlint and Oxfmt with Biome fallback                                        |
| [0051](0051-automate-d1-migrations-with-forward-only-policy.md)              | Automate D1 migrations with a forward-only policy                               |
| [0052](0052-use-provider-adapter-for-chatgpt-subscription-backend.md)        | Use a provider adapter for the ChatGPT subscription backend                     |
| [0053](0053-use-scheduled-cleanup-for-retention.md)                          | Use scheduled cleanup for retention                                             |
| [0054](0054-store-selected-context-message-ids-separately.md)                | Store selected context message IDs separately                                   |
| [0055](0055-use-targeted-d1-indexes-and-core-foreign-keys.md)                | Use targeted D1 indexes and core foreign keys                                   |
| [0056](0056-use-drizzle-for-d1-data-layer.md)                                | Use Drizzle ORM for the D1 data layer                                           |
| [0057](0057-use-vite-react-router-tailwind-shadcn-for-web-frontend.md)       | Use Vite, React, React Router, Tailwind CSS, and shadcn/ui for the web frontend |
| [0058](0058-support-nvidia-nim-llm-provider.md)                              | Support NVIDIA NIM as an LLM provider (superseded by ADR 0059)                  |
| [0059](0059-use-nvidia-nim-api-key-as-provider-credential.md)                | Use NVIDIA NIM API key as provider credential                                   |
| [0060](0060-allow-guild-message-response-triggers.md)                        | Allow guild message Response Triggers without mention                           |

## 新しい ADR を追加するとき

1. 次の連番で `NNNN-short-title.md` を作成します。
2. タイトルは `# Decision title` の形式にします。
3. 決定内容、理由、制約、受け入れた trade-off を簡潔に記録します。
4. `CONTEXT.md` のドメイン用語を使います。
5. この `README.md` の一覧と必要なテーマ欄を更新します。
