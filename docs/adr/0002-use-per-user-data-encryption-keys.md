# Use per-user data encryption keys

We will encrypt each ChatGPT Subscription Connection credential with a per-user data encryption key, and wrap that key with an application master key. This is more complex than using one global encryption key, but it gives us a cleaner path for key rotation, per-user credential rewrapping, and limiting the blast radius of future storage changes.

Wrapped DEKs will record the master key version used for wrapping. The MVP supports manual master key rotation through an operator-run rewrap procedure: keep the old and new master keys available as Cloudflare secrets, rewrap DEKs to the active version, verify completion, then remove the old key. Automatic rotation is deferred to avoid introducing credential-loss risk in the MVP.
