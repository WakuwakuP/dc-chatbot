# Authenticate Bot Worker with Cloudflare Access service token

The Bot Worker will call bot-only API routes using a Cloudflare Access Service Token. The API separates owner human routes from bot service routes and validates the service identity for `/api/v1/bot/*`.

This avoids giving the Bot Worker direct database credentials or bypassing the Cloudflare Access boundary.
