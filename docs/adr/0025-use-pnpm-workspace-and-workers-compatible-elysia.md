# Use pnpm workspace and Workers-compatible Elysia

The project will use a pnpm workspace monorepo with separate API, Web, Bot, and shared packages. The API uses Elysia with a Cloudflare Workers-compatible adapter and must not rely on Bun-specific runtime APIs.

Bun may be useful for local tooling elsewhere, but the deployed API runtime is Cloudflare Workers, so API code must remain Workers-compatible.
