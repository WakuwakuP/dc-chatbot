# Map Cloudflare Access identity to owner records

The management web/API will map Cloudflare Access identity claims to Owner Discord User records. Owner records store the Access subject as the stable application identity and the Access email as display or fallback metadata.

The Worker API will validate Cloudflare Access JWTs for owner routes instead of only trusting forwarded headers. This gives the application its own authorization boundary for owner roles and reduces the impact of Cloudflare Access misconfiguration. Bot routes remain separate and authenticate with Cloudflare Access service-token credentials.
