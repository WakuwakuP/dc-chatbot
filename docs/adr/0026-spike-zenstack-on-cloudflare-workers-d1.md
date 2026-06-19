# Spike ZenStack on Cloudflare Workers and D1

We want to use ZenStack as the data layer, but we will not treat it as accepted until a compatibility spike proves it works with Cloudflare Workers and Cloudflare D1. The spike must verify bundling and runtime behavior in Workers, D1/Kysely dialect support or an adapter path, generated client compatibility, migration workflow with D1, and any bundle/runtime limitations before replacing the safer fallback.

The spike is successful only if a Cloudflare Worker can use D1 bindings for relation-aware CRUD, owner/member authorization policy or a clear equivalent, transaction-like consistency for multi-row changes, and a Workers-compatible bundle/runtime profile. Schema generation alone is not enough, and basic CRUD alone is not enough. If the spike fails or creates too much runtime risk, the project will fall back to Drizzle ORM with drizzle-kit for D1.
