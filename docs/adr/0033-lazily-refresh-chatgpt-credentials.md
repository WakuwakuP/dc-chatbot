# Lazily refresh ChatGPT credentials

ChatGPT Subscription Connection credentials are refreshed lazily when a request needs to use a connection and the stored credential requires refresh. Scheduled health checks may be added later, but they are not required for the MVP.

Lazy refresh keeps background activity low and discovers connection problems at the point of use. If refresh fails in a way that requires user action, the connection moves to `needsReconnect`.
