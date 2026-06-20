# dc-chatbot implementation skill の決定メモ

## 目的

今後の `dc-chatbot` 実装作業で、AI agent が毎回同じ前提を確認し、ドメイン用語・ADR・runtime 境界・security/privacy 制約を外さずに作業できるよう、project-local Zed agent skill を追加する。

## スコープ判断

この skill は project-local scope とする。

理由:

- 内容が `dc-chatbot` 固有の domain language、ADR、directory structure、Cloudflare/API/Bot/provider 境界に依存する。
- 他リポジトリで再利用する汎用 workflow ではなく、この repository の collaborators と共有すべき作業ルールである。
- built-in `create-skill` skill の guidance でも、repository 固有 skill は `<project>/.agents/skills/<skill-name>/SKILL.md` に置くことが推奨されている。

## skill 名の判断

skill 名は `dc-chatbot-implementation` とした。

理由:

- repository 名と用途が明確で、将来の agent catalog で見つけやすい。
- lowercase alphanumeric と single hyphen の命名制約を満たす。
- directory 名 `.agents/skills/dc-chatbot-implementation/` と frontmatter の `name` を一致させられる。
- 実装作業全般に使う skill であり、特定 package や単一作業に限定しない名前が適切である。

## 推論した不足情報

明示されていない情報は、次のように推論した。

- **skill の具体的な description**: future implementation work 用であるため、feature/fix 実装時に読むべき skill と分かるよう、domain terms、ADR constraints、runtime boundaries、package placement、metadata-only privacy requirements を明記した。
- **skill body の粒度**: `AGENTS.md` 全文の複製ではなく、実装時に agent が参照しやすい check order、placement、禁止データ、boundary、validation、ADR 判断に絞った実用的な checklist 形式にした。
- **decision note の位置**: product architecture の ADR ではなく agent/developer workflow の記録なので、既存の `docs/development/` 配下に置いた。
- **ADR 追加の要否**: product runtime、data model、deployment、security architecture を変更しないため、新規 ADR は不要と判断した。
- **validation 実行**: user が「Do not run validation; a separate validation agent will do that」と指定したため、この作業では validation を実行せず、skill 内に future implementation work 向けの validation reporting 方針だけを書いた。

## 参照・依拠した docs / ADR

- `AGENTS.md`
  - project-local rules、security/privacy 絶対ルール、directory boundaries、Bot/API/provider 境界を反映。
- `CONTEXT.md`
  - ChatGPT Subscription Connection、Effective ChatGPT Subscription Connection、Discord User、Candidate Discord User、Registered Member、Owner Discord User、Private Bot、Conversation Context、Response Trigger / Response Decision、Automated Trigger Source などの正準用語を反映。
- `README.md`
  - target directory structure、component responsibility、runtime boundary、保存してよいもの / いけないもの、tooling と基本 check 方針を反映。
- `docs/adr/README.md`
  - ADR precedence、関連 ADR の探し方、矛盾時に ADR 追加・更新を検討する方針を反映。
- `docs/adr/0022-split-cloudflare-workers-api-and-pages-frontend.md`
  - API と Web の責務分離を反映。
- `docs/adr/0027-keep-bot-worker-db-access-behind-api.md`
  - Bot Worker が D1・credential・provider call を直接扱わない境界を反映。
- `docs/adr/0032-store-request-audit-metadata-only.md`
  - request/provider audit は metadata-only とし、message/context/prompt/response を保存しない制約を反映。
- `docs/adr/0048-log-metadata-only.md`
  - structured metadata log と sensitive data logging 禁止を反映。
- `docs/adr/0049-share-dto-schemas-with-valibot.md`
  - DTO types と Valibot schemas を `packages/shared` に置く方針を反映。
- `docs/adr/0052-use-provider-adapter-for-chatgpt-subscription-backend.md`
  - provider-specific protocol、token handling、safe error mapping を `packages/provider` に閉じ込める方針を反映。
- `docs/adr/0056-use-drizzle-for-d1-data-layer.md`
  - production data layer は Drizzle ORM + hand-written forward-only D1 migrations とする方針を反映。
- `docs/adr/0057-use-vite-react-router-tailwind-shadcn-for-web-frontend.md`
  - Owner UI は Vite + React + React Router + Tailwind CSS + shadcn/ui を使う方針を反映。
- `docs/development/local.md`, `docs/development/tooling.md`
  - local development safety rails と check command の現状を validation guidance に反映。

## ADR を追加しない理由

この変更は agent workflow artifact の追加であり、以下を変更しない。

- product architecture
- runtime boundary
- data retention / privacy policy
- database schema / migration policy
- provider strategy
- deployment topology
- user-facing behavior

そのため ADR ではなく `docs/development/` の decision note として記録する。将来、この skill が product architecture と矛盾する実装判断を含むようになった場合は、skill を ADR に合わせて更新するか、先に ADR の追加・更新を検討する。

## validation plan

この作業では user 指定により validation を実行しない。別 validation agent が確認する場合は、少なくとも次を確認する。

1. `.agents/skills/dc-chatbot-implementation/SKILL.md` の frontmatter が YAML として妥当である。
2. frontmatter `name` が `dc-chatbot-implementation` で directory 名と一致する。
3. frontmatter `description` が 1024 文字未満で、用途が具体的である。
4. skill body が required items を含み、`AGENTS.md` 全文の過剰な重複になっていない。
5. `docs/development/agent-skill-dc-chatbot-implementation.md` が purpose、scope decision、skill name decision、推論した不足情報、参照 docs/ADR、ADR を追加しない理由、validation plan を含む。
6. application code に変更がない。
