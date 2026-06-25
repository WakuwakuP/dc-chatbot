# Use NVIDIA NIM API key as provider credential

Status: Accepted

Supersedes: ADR 0058 for provider strategy. Supersedes the ChatGPT Subscription Connection credential, lifecycle, and connection-assignment requirements in ADR 0001, 0002, 0003, 0009, 0010, 0016, 0032, 0033, 0034, 0035, 0036, 0037, 0038, 0039, 0047, and 0052. Their non-conflicting decisions about Private Bot authorization, API/Bot boundaries, metadata-only audit, retention, owner roles, model settings, and provider-adapter isolation remain accepted.

The production provider credential is the NVIDIA NIM API key. The API Worker reads it from a secret such as `NVIDIA_NIM_BEARER_TOKEN` and calls NVIDIA NIM through `packages/provider`. The Bot Worker still calls only `/api/v1/bot/*`; provider-specific protocol, bearer token handling, raw provider errors, and safe error mapping stay inside the API/provider boundary.

ChatGPT Subscription Connection and Effective ChatGPT Subscription Connection are no longer active implementation requirements. The system does not require per-user ChatGPT account connection, per-owner provider credential connection, direct member provider credential connection, lazy refresh, reconnect status, connection flow state, credential ciphertext, wrapped data encryption keys, or ChatGPT credential metadata history.

Private Bot authorization remains explicit and owner-controlled. Allowed Discord Users may receive responses. Active Registered Members may use the bot because an Owner Discord User registered them and Configured Provider Access is available through the deployment-scoped NVIDIA NIM API key, not because they own or inherit a ChatGPT Subscription Connection. Owner Discord User assignment remains useful for management scope, notification routing, audit visibility, and Regular Owner permissions, but it does not select a provider credential.

NVIDIA NIM API key material and bearer token material must never be stored in D1, frontend state, Bot Worker runtime configuration, structured logs, request audit, provider audit, owner notifications, docs examples, tests fixtures, or snapshots. Provider raw request and response bodies remain transient and must not be logged or persisted. Safe metadata may include provider name, model, request ID, provider call ID, duration, status, safe error category, token/count estimates when available, and retention cleanup timestamps.

The accepted trade-off is that provider access is now deployment-scoped rather than per-owner. This simplifies credential handling, removes the unstable ChatGPT connection lifecycle, and makes production use depend on a stable provider API. The cost is that per-owner provider isolation and per-owner provider credential status are not product features in this architecture.
