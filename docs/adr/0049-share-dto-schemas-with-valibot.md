# Share DTO schemas with Valibot

API, Web, and Bot packages will share hand-written DTO types and runtime validation schemas from `packages/shared`. The shared schemas will use Valibot.

This keeps the API contract explicit and reusable across the Cloudflare Worker API, React frontend, and Node.js Bot Worker without depending on framework-specific client generation. Valibot is chosen for lightweight runtime validation suitable for Worker bundles while still providing TypeScript-friendly schema definitions.
