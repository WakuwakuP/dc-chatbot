# Store Discord allowlist in D1

Allowed Discord Users and Registered Members are stored in D1 rather than hard-coded in configuration. This lets Owner Discord Users manage trusted members through the management UI and keeps membership decisions auditable.

The Bot Worker asks the API to evaluate Discord events instead of making allowlist decisions locally.
