export type RetentionCleanupPlan = {
  tableName: string;
  sql: string;
};

type RetentionTable = {
  tableName: string;
  columnName: "retain_until" | "expires_at" | "locked_until";
};

const RETENTION_TABLES: readonly RetentionTable[] = [
  { tableName: "candidate_discord_users", columnName: "expires_at" },
  { tableName: "request_audit_metadata", columnName: "retain_until" },
  { tableName: "provider_call_audit_metadata", columnName: "retain_until" },
  { tableName: "selected_context_message_ids", columnName: "retain_until" },
  { tableName: "owner_notifications", columnName: "retain_until" },
  { tableName: "setting_audit_metadata", columnName: "retain_until" },
  { tableName: "discord_response_messages", columnName: "retain_until" },
  { tableName: "connection_flow_states", columnName: "retain_until" },
  { tableName: "cleanup_run_metadata", columnName: "retain_until" },
  { tableName: "generation_locks", columnName: "locked_until" },
  { tableName: "refresh_locks", columnName: "locked_until" },
] as const;

export function buildRetentionCleanupPlan(
  nowIsoUtc: string,
): RetentionCleanupPlan[] {
  const escapedNow = nowIsoUtc.replaceAll("'", "''");
  return RETENTION_TABLES.map(({ tableName, columnName }) => ({
    tableName,
    sql: `DELETE FROM ${tableName} WHERE ${columnName} < '${escapedNow}'`,
  }));
}
