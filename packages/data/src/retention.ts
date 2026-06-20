export type RetentionCleanupPlan = {
  tableName: string;
  sql: string;
};

const RETENTION_TABLES = [
  "candidate_discord_users",
  "request_audit_metadata",
  "provider_call_audit_metadata",
  "selected_context_message_ids",
] as const;

export function buildRetentionCleanupPlan(
  nowIsoUtc: string,
): RetentionCleanupPlan[] {
  return RETENTION_TABLES.map((tableName) => ({
    tableName,
    sql: `DELETE FROM ${tableName} WHERE retain_until < '${nowIsoUtc.replaceAll("'", "''")}'`,
  }));
}
