# Use Cloudflare secrets for master key

The application master key used to wrap per-user data encryption keys will be stored as a Cloudflare Worker secret. It must not be committed to the repository, stored in D1, or exposed to the frontend or Bot Worker.

This keeps the master key in Cloudflare's secret storage while allowing the API Worker to unwrap DEKs when it needs to use a ChatGPT Subscription Connection.
