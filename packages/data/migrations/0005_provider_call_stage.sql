ALTER TABLE provider_call_audit_metadata
  ADD COLUMN provider_call_stage TEXT NOT NULL DEFAULT 'response_generation'
  CHECK (provider_call_stage IN ('context_selection', 'response_decision', 'response_generation'));

CREATE INDEX IF NOT EXISTS provider_call_stage_created_idx
  ON provider_call_audit_metadata (provider_call_stage, created_at);
