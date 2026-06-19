# Keep Bot Worker DB access behind API

The Bot Worker will not access D1 directly. All database access, membership checks, candidate updates, audit writes, credential handling, and provider calls go through the Cloudflare Worker API.

This keeps the Bot Worker simpler and avoids distributing D1 bindings, credential access, or authorization rules into the Discord gateway process.
