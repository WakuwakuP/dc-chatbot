# Separate owner and bot API routes

The API separates human owner routes from Bot Worker service routes. Owner routes live under `/api/v1/owner/*`; bot service routes live under `/api/v1/bot/*`.

Owner routes require validated Cloudflare Access user identity and owner role checks. Bot routes require validated Cloudflare Access service identity. This keeps human administration and Discord event processing as separate authorization surfaces.
