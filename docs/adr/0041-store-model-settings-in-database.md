# Store model settings in the database

The bot will store purpose-specific ChatGPT/Codex model settings in database settings instead of hard-coding them or relying only on environment variables. The settings cover context selection, response decision, and response generation models.

This makes model changes possible without redeploying and aligns with future management UI configuration. The trade-off is that invalid model settings can break runtime behavior, so model-setting changes should be restricted to Admin Owners and validated before saving or use.
