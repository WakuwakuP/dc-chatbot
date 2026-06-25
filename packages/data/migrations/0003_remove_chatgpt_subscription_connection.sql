DROP TABLE IF EXISTS generation_locks;
DROP TABLE IF EXISTS refresh_locks;
DROP TABLE IF EXISTS connection_flow_states;
DROP TABLE IF EXISTS chatgpt_subscription_connections;
ALTER TABLE provider_call_audit_metadata RENAME COLUMN connection_id TO provider_ref;
