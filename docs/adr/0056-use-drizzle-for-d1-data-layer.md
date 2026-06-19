# Use Drizzle ORM for the D1 data layer

## Status

Accepted.

## Context

ADR 0026 recorded the ZenStack compatibility spike criteria for Cloudflare Workers and D1, including a fallback to Drizzle ORM if ZenStack introduced too much runtime risk. The spike work has shown enough concern around D1 transaction limitations and policy mutation behavior that we do not want to make ZenStack part of the production data layer.

The production implementation needs a data layer that keeps Cloudflare Workers compatibility explicit, keeps D1 migration behavior predictable, and does not hide authorization or policy mutation logic behind runtime features that are hard to reason about in D1.

## Decision

Use Drizzle ORM for the production D1 data layer.

`packages/data` will own Drizzle table schema definitions, repository/data access helpers, and hand-written forward-only D1 migrations. Production migrations remain forward-only as described in ADR 0051.

Do not adopt ZenStack for the production data layer. ADR 0026 remains as the historical spike result and decision input, but this ADR supersedes it for the production data-layer decision.

Access policy and authorization-sensitive mutation rules will be expressed explicitly in domain helpers, API route/application logic, and repository helpers rather than delegated to ZenStack runtime policy mutation.

## Consequences

- D1 access paths are more explicit and easier to review for Cloudflare Workers compatibility.
- Authorization and policy behavior must be tested at the domain/API/repository boundaries instead of relying on generated ZenStack policy behavior.
- Hand-written migrations add some manual work, but keep production D1 migration behavior predictable and forward-only.
- The Drizzle + D1 spike in `apps/api-spike` can be used as compatibility/reference material, but production boundaries still belong in `apps/api` and `packages/data`.
