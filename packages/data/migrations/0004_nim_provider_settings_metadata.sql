-- Forward-only migration for deployment-scoped provider settings metadata.
-- Do not add down migrations; production rollback is handled by forward fixes.

CREATE TABLE IF NOT EXISTS provider_settings (
  settings_id TEXT PRIMARY KEY,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('fake', 'nvidia_nim')),
  configured_provider_access_status TEXT NOT NULL CHECK (configured_provider_access_status IN ('available', 'not_configured', 'unavailable')),
  configured_provider_access_checked_at TEXT,
  safe_error_category TEXT CHECK (safe_error_category IN ('not_configured', 'authentication_failed', 'rate_limited', 'temporary_unavailable', 'policy_rejected', 'invalid_response', 'unknown')),
  model_settings_id TEXT NOT NULL DEFAULT 'singleton',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_settings_kind_status_idx
  ON provider_settings (provider_kind, configured_provider_access_status);

ALTER TABLE provider_call_audit_metadata
  ADD COLUMN provider_kind TEXT NOT NULL DEFAULT 'fake'
  CHECK (provider_kind IN ('fake', 'nvidia_nim'));

CREATE INDEX IF NOT EXISTS provider_call_kind_created_idx
  ON provider_call_audit_metadata (provider_kind, created_at);
