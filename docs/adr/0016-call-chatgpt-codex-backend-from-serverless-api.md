# Call ChatGPT Codex backend from serverless API

The Cloudflare Worker API will call the ChatGPT/Codex subscription-backed backend directly rather than shelling out to a CLI from the Bot Worker. Credential handling and provider calls stay behind the API boundary.

This is a compatibility and maintenance risk because subscription-backed ChatGPT access is less stable than a public API. The risk is accepted for the project goal and isolated behind a provider adapter.
