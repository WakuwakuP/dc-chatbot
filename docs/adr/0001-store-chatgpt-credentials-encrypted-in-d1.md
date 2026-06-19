# Store ChatGPT credentials encrypted in D1

ChatGPT Subscription Connection credentials will be stored in Cloudflare D1 only as application-encrypted ciphertext. Plain credential material must never be stored in D1, logs, request audits, owner notifications, or frontend state.

This allows the Cloudflare Worker API to refresh and use subscription-backed ChatGPT access while keeping credential exposure limited to the API runtime and encryption services.
