---
name: dc-chatbot-implementation
description: Implement features and fixes in dc-chatbot while preserving repo-specific domain terms, ADR constraints, Cloudflare/API/Bot/provider boundaries, package placement rules, and metadata-only privacy requirements. Use before changing production code, tests, docs, migrations, DTOs, or UI in this repository.
---

# dc-chatbot Implementation

Use this skill before implementation work in `dc-chatbot`, especially when adding or changing production code, tests, migrations, DTO contracts, provider behavior, Bot Worker behavior, API routes, or Owner UI. Keep the work focused on the requested change and do not treat `apps/api-spike` as production structure.

## 1. Check order

Before deciding an implementation approach, check these in order:

1. `CONTEXT.md` for canonical domain terms and avoided terms.
2. `docs/adr/README.md` for the relevant ADR theme and precedence rule.
3. Relevant `docs/adr/*.md` files for the area you are changing.
4. `README.md` for target directory structure and component responsibility.
5. The target app/package `README.md` and `package.json`, when present.

If implementation and ADRs conflict, do not silently follow the implementation. Call out the conflict and propose an ADR update or new ADR before changing the design.

## 2. Use canonical domain language

Prefer the repository terms from `CONTEXT.md`, including:

- NVIDIA NIM API Key
- Configured Provider Access
- Discord User / Candidate Discord User / Allowed Discord User
- Registered Member
- Owner Discord User / Admin Owner / Regular Owner
- Private Bot
- Conversation Context
- Response Trigger / Response Decision
- Automated Trigger Source

Avoid terms such as shared session, scraped browser session, customer, subscriber, public bot, memory, transcript archive, ChatGPT Subscription Connection, and Effective ChatGPT Subscription Connection unless you are explicitly discussing superseded historical ADR context. Use `NVIDIA NIM API Key` rather than generic API key when referring to the production provider credential.

## 3. Place code by boundary

Use these production boundaries:

- `apps/api`: Cloudflare Workers API; owns authorization, D1 access, NVIDIA NIM API key handling, provider calls, audit, retention cleanup, `/api/v1/owner/*`, and `/api/v1/bot/*`.
- `apps/web`: Cloudflare Pages frontend; Vite + React + React Router + Tailwind CSS + shadcn/ui Owner Discord User management UI.
- `apps/bot`: long-running Node.js + `discord.js` Bot Worker; owns Discord Gateway handling, transient Discord message fetches, typing/reply posting, and owner notification delivery when instructed by API.
- `packages/shared`: DTO types and Valibot runtime schemas shared by API/Web/Bot.
- `packages/domain`: runtime-independent domain types, state/policy helpers, role/status/decision helpers, and safe user-facing wording helpers.
- `packages/data`: Drizzle ORM D1 table schema, hand-written forward-only migrations, targeted indexes, repository/data access helpers, and retention cleanup queries.
- `packages/provider`: NVIDIA NIM provider backend adapter, provider-specific protocol, token handling, response generation, vision-capable generation, and safe error mapping.

`apps/api-spike` is compatibility/reference material only. You may consult it for Drizzle + D1 behavior and D1 transaction risks, but do not copy its structure as production architecture or move production responsibilities into it.

## 4. Respect runtime and security boundaries

- Bot Worker must not access D1 directly.
- Bot Worker must not hold, decrypt, refresh, or log NVIDIA NIM API key / bearer token material.
- Bot Worker must not call the provider backend directly.
- Bot Worker calls `/api/v1/bot/*` through Cloudflare Access Service Token service identity.
- Owner human routes live under `/api/v1/owner/*` and validate Cloudflare Access user identity plus Owner role.
- Bot service routes live under `/api/v1/bot/*` and validate Cloudflare Access service identity.
- API code must stay Cloudflare Workers-compatible and avoid Bun-only APIs.
- Provider-specific protocol, token handling, raw provider errors, and safe error mapping stay inside `packages/provider`.
- Local auth bypass and development bot safety rails must be impossible or refused in production.

## 5. Keep sensitive content out of storage and logs

Do not store or log the following in D1, structured logs, request audit, provider audit, owner notifications, frontend state, docs examples, tests fixtures, or snapshots:

- Discord message content
- selected Conversation Context content
- prompt body
- response text
- NVIDIA NIM API key
- NVIDIA NIM bearer token
- plaintext credential material
- attachment URLs
- attachment bytes
- provider raw request / response body

Use metadata-only structured logs and audits. Safe examples include IDs, actor type, event type, status/error category, model, duration, request ID, provider call ID, counts, sizes, and retention cleanup target timestamps. Sanitize `Error` objects and stack traces before logging or returning them.

## 6. Implementation guidance

- Start with shared contracts when behavior crosses process boundaries: define DTO types and Valibot schemas in `packages/shared` before API/Web/Bot call sites.
- Put environment-independent business rules in `packages/domain`; keep Cloudflare bindings, Discord clients, D1 bindings, and provider protocol out of domain code.
- Put D1 schema and queries in `packages/data`; use Discord snowflake IDs as `TEXT`, general audit/event/setting IDs as ULID text, and timestamps as ISO 8601 UTC text. Migrations are forward-only; prefer forward-fix migrations over down migration design.
- Keep authorization-sensitive mutations explicit in domain/API/repository helpers; do not hide policy behavior in implicit data-layer runtime magic.
- Put provider compatibility, NVIDIA NIM token handling, and raw error translation behind `packages/provider` interfaces.
- In `apps/api`, enforce route-level identity and role boundaries before mutation or provider work. Store only metadata audits.
- In `apps/bot`, handle Discord events and transient content only long enough to call API and post Discord replies. Ignore automated bot/webhook messages by default unless they are configured Automated Trigger Sources.
- In `apps/web`, use existing shadcn/ui components and semantic tokens/variants. Do not keep sensitive content in React state or browser storage.

## 7. Documentation and decision records

Create or update an ADR when a change alters product architecture, runtime boundaries, data retention, security/privacy posture, provider strategy, major tooling direction, or conflicts with an accepted ADR.

Use a lighter decision note under `docs/development/` for implementation workflow notes, scaffolding tradeoffs, temporary tooling details, or inferred agent/developer-process decisions that do not change product architecture.

Document inferred decisions and reasons when the user asks you to infer missing information, or when future agents would otherwise repeat the same ambiguity.

## 8. Validation and reporting

Run the nearest practical checks for the files changed, then broaden only when useful. Prefer package/app-local checks first, followed by root checks if available.

Common root checks, when relevant and available:

```bash
pnpm check
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:e2e
pnpm build
```

For migrations or data-layer changes, also validate migration ordering and any repository/domain tests. For UI changes, include the closest component/unit tests and format checks. For Bot/API/provider changes, include boundary tests that prove sensitive content is not persisted or logged where practical.

In your final response, state exactly which validation commands were run and whether they passed. If validation is intentionally skipped or delegated, say so clearly.

## 9. Large-task coordination

For large tasks, consider splitting work into focused passes such as domain/ADR review, implementation, and verification. If the user requests sub-agents or separated responsibilities, keep implementation and verification independent: one agent changes code, another validates behavior and privacy/security constraints without making unrelated changes.
