# Store connection metadata history only

When a ChatGPT Subscription Connection is reconnected or changed, the current credential ciphertext will be replaced and old credential ciphertext will not be retained. The system may store metadata-only connection events such as connected, refreshed, needsReconnect, and revoked.

Keeping credential history would increase the blast radius of a data leak. Metadata history is enough for operational visibility, while credential rollback is avoided in favor of reconnecting the ChatGPT account.
