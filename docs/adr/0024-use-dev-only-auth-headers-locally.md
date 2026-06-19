# Use dev-only auth headers locally

Local development will bypass Cloudflare Access by using guarded dev-only headers to simulate either the owner identity or the bot worker service identity. This keeps Docker Compose development simple while preserving owner-vs-bot route authorization in tests; the bypass must only be enabled in the local environment and ignored or rejected in production.

Dev-only auth headers require an explicit local enable flag and a local shared secret. Requests must provide the shared secret along with simulated Access subject, email, Discord user ID, and caller type. This avoids enabling identity spoofing merely because the runtime reports a development environment.
