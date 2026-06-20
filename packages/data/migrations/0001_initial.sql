-- Forward-only migration skeleton for Cloudflare D1.
-- Do not add down migrations; production rollback is handled by forward fixes.

CREATE TABLE IF NOT EXISTS discord_users (
  discord_user_id TEXT PRIMARY KEY,
  display_name_snapshot TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS owner_discord_users (
  owner_discord_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin_owner', 'regular_owner')),
  cloudflare_access_subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS owner_access_subject_uidx ON owner_discord_users (cloudflare_access_subject);

CREATE TABLE IF NOT EXISTS registered_members (
  member_discord_user_id TEXT PRIMARY KEY,
  assigned_owner_discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registered_members_owner_idx ON registered_members (assigned_owner_discord_user_id);

CREATE TABLE IF NOT EXISTS candidate_discord_users (
  candidate_discord_user_id TEXT PRIMARY KEY,
  observed_in_guild_id TEXT,
  observed_in_channel_id TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS candidate_expires_at_idx ON candidate_discord_users (expires_at);

CREATE TABLE IF NOT EXISTS chatgpt_subscription_connections (
  connection_id TEXT PRIMARY KEY,
  owner_discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'needs_reconnect', 'revoked')),
  encrypted_credential_ciphertext TEXT NOT NULL,
  credential_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS connections_owner_idx ON chatgpt_subscription_connections (owner_discord_user_id);

CREATE TABLE IF NOT EXISTS request_audit_metadata (
  request_audit_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('owner', 'bot_service', 'scheduled')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'failed', 'completed')),
  error_category TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL,
  retain_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS request_audit_request_id_idx ON request_audit_metadata (request_id);
CREATE INDEX IF NOT EXISTS request_audit_retain_until_idx ON request_audit_metadata (retain_until);

CREATE TABLE IF NOT EXISTS provider_call_audit_metadata (
  provider_call_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  safe_error_category TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL,
  retain_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_call_retain_until_idx ON provider_call_audit_metadata (retain_until);

CREATE TABLE IF NOT EXISTS selected_context_message_ids (
  selected_context_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  discord_message_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retain_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS selected_context_retain_until_idx ON selected_context_message_ids (retain_until);
