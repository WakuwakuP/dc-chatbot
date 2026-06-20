-- Forward-only migration for Owner management and metadata-only lifecycle state.
-- Do not add down migrations; production rollback is handled by forward fixes.

CREATE INDEX IF NOT EXISTS registered_members_status_owner_idx ON registered_members (status, assigned_owner_discord_user_id);
CREATE INDEX IF NOT EXISTS candidate_last_seen_idx ON candidate_discord_users (last_observed_at);
CREATE INDEX IF NOT EXISTS connections_owner_status_idx ON chatgpt_subscription_connections (owner_discord_user_id, status);
CREATE INDEX IF NOT EXISTS request_audit_created_at_idx ON request_audit_metadata (created_at);
CREATE INDEX IF NOT EXISTS provider_call_request_idx ON provider_call_audit_metadata (request_id);
CREATE INDEX IF NOT EXISTS selected_context_request_idx ON selected_context_message_ids (request_id);

ALTER TABLE selected_context_message_ids ADD COLUMN context_source TEXT CHECK (context_source IN ('selector', 'forced_trigger', 'rule_fallback', 'reply_chain', 'thread_starter', 'thread_recent', 'dm_recent', 'automated_trigger'));
ALTER TABLE selected_context_message_ids ADD COLUMN author_relation TEXT CHECK (author_relation IN ('trigger_user', 'bot_self', 'other_allowed', 'non_allowed', 'automated_source'));

CREATE TABLE IF NOT EXISTS owner_notifications (
  owner_notification_id TEXT PRIMARY KEY,
  notification_owner_discord_user_id TEXT NOT NULL,
  candidate_discord_user_id TEXT,
  request_id TEXT,
  trigger_kind TEXT CHECK (trigger_kind IN ('dm', 'guild_mention', 'automated_trigger_source')),
  status TEXT NOT NULL CHECK (status IN ('pending_delivery', 'delivery_requested', 'delivered', 'failed', 'suppressed')),
  safe_error_category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retain_until TEXT NOT NULL,
  FOREIGN KEY (notification_owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id),
  FOREIGN KEY (candidate_discord_user_id) REFERENCES discord_users(discord_user_id)
);
CREATE INDEX IF NOT EXISTS owner_notifications_owner_status_idx ON owner_notifications (notification_owner_discord_user_id, status);
CREATE INDEX IF NOT EXISTS owner_notifications_retain_until_idx ON owner_notifications (retain_until);

CREATE TABLE IF NOT EXISTS bot_settings (
  settings_id TEXT PRIMARY KEY,
  notification_owner_discord_user_id TEXT,
  automated_trigger_default_cooldown_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (notification_owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id)
);

CREATE TABLE IF NOT EXISTS model_settings (
  settings_id TEXT PRIMARY KEY,
  context_selection_model TEXT NOT NULL,
  response_decision_model TEXT NOT NULL,
  response_generation_model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_settings (
  prompt_setting_id TEXT PRIMARY KEY,
  prompt_key TEXT NOT NULL,
  active_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_settings_key_uidx ON prompt_settings (prompt_key);

CREATE TABLE IF NOT EXISTS prompt_setting_versions (
  prompt_setting_version_id TEXT PRIMARY KEY,
  prompt_setting_id TEXT NOT NULL,
  label TEXT,
  prompt_body_sha256 TEXT NOT NULL,
  prompt_body_length INTEGER NOT NULL,
  created_by_owner_discord_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (prompt_setting_id) REFERENCES prompt_settings(prompt_setting_id),
  FOREIGN KEY (created_by_owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id)
);
CREATE INDEX IF NOT EXISTS prompt_versions_setting_created_idx ON prompt_setting_versions (prompt_setting_id, created_at);

CREATE TABLE IF NOT EXISTS setting_audit_metadata (
  setting_audit_id TEXT PRIMARY KEY,
  actor_owner_discord_user_id TEXT NOT NULL,
  setting_category TEXT NOT NULL,
  event_type TEXT NOT NULL,
  before_ref TEXT,
  after_ref TEXT,
  created_at TEXT NOT NULL,
  retain_until TEXT NOT NULL,
  FOREIGN KEY (actor_owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id)
);
CREATE INDEX IF NOT EXISTS setting_audit_retain_until_idx ON setting_audit_metadata (retain_until);
CREATE INDEX IF NOT EXISTS setting_audit_created_at_idx ON setting_audit_metadata (created_at);

CREATE TABLE IF NOT EXISTS automated_trigger_sources (
  automated_trigger_source_id TEXT PRIMARY KEY,
  source_discord_user_id TEXT,
  source_application_id TEXT,
  assigned_owner_discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  reply_mode TEXT NOT NULL CHECK (reply_mode IN ('reply', 'channel_message', 'none')),
  cooldown_seconds INTEGER NOT NULL CHECK (cooldown_seconds BETWEEN 10 AND 3600),
  last_triggered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id)
);
CREATE INDEX IF NOT EXISTS automated_sources_owner_status_idx ON automated_trigger_sources (assigned_owner_discord_user_id, status);
CREATE INDEX IF NOT EXISTS automated_sources_discord_user_idx ON automated_trigger_sources (source_discord_user_id);
CREATE INDEX IF NOT EXISTS automated_sources_application_idx ON automated_trigger_sources (source_application_id);

CREATE TABLE IF NOT EXISTS discord_response_messages (
  response_message_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  discord_message_id TEXT NOT NULL,
  guild_id TEXT,
  channel_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('posted', 'failed')),
  created_at TEXT NOT NULL,
  retain_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_response_request_idx ON discord_response_messages (request_id);
CREATE INDEX IF NOT EXISTS discord_response_retain_until_idx ON discord_response_messages (retain_until);

CREATE TABLE IF NOT EXISTS connection_flow_states (
  connection_flow_state_id TEXT PRIMARY KEY,
  owner_discord_user_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('fake')),
  state_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  requested_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  retain_until TEXT NOT NULL,
  FOREIGN KEY (owner_discord_user_id) REFERENCES owner_discord_users(owner_discord_user_id)
);
CREATE INDEX IF NOT EXISTS connection_flow_owner_status_idx ON connection_flow_states (owner_discord_user_id, status);
CREATE INDEX IF NOT EXISTS connection_flow_expires_at_idx ON connection_flow_states (expires_at);
CREATE INDEX IF NOT EXISTS connection_flow_retain_until_idx ON connection_flow_states (retain_until);

CREATE TABLE IF NOT EXISTS cleanup_run_metadata (
  cleanup_run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  deleted_row_count INTEGER NOT NULL,
  safe_error_category TEXT,
  retain_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cleanup_run_retain_until_idx ON cleanup_run_metadata (retain_until);
CREATE INDEX IF NOT EXISTS cleanup_run_started_at_idx ON cleanup_run_metadata (started_at);

CREATE TABLE IF NOT EXISTS generation_locks (
  connection_id TEXT PRIMARY KEY,
  lock_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES chatgpt_subscription_connections(connection_id)
);
CREATE INDEX IF NOT EXISTS generation_locks_locked_until_idx ON generation_locks (locked_until);

CREATE TABLE IF NOT EXISTS refresh_locks (
  connection_id TEXT PRIMARY KEY,
  lock_id TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES chatgpt_subscription_connections(connection_id)
);
CREATE INDEX IF NOT EXISTS refresh_locks_locked_until_idx ON refresh_locks (locked_until);
