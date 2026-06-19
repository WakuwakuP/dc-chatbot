# Host control plane on Cloudflare behind Zero Trust

The API server and management web frontend will be hosted on Cloudflare and protected by Cloudflare Zero Trust. The API uses Cloudflare Workers, the frontend uses Cloudflare Pages, and D1 is the persistent database.

Cloudflare Access is the external access boundary for the management surface. The application still performs its own owner and bot authorization checks inside the Worker API.
