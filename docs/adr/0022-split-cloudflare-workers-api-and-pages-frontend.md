# Split Cloudflare Workers API and Pages frontend

The control plane is split into a Cloudflare Workers API and a Cloudflare Pages frontend. The API owns application authorization, database access, credential handling, provider calls, and bot-facing endpoints. The Pages frontend owns the React management UI.

This separation matches Cloudflare deployment primitives and avoids coupling frontend hosting to Worker API implementation details.
