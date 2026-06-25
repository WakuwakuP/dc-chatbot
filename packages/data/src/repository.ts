export type OwnerRole = "admin_owner" | "regular_owner";
export type RegisteredMemberStatus = "active" | "disabled";
export type OwnerNotificationStatus =
  | "pending_delivery"
  | "delivery_requested"
  | "delivered"
  | "failed"
  | "suppressed";
export type OwnerNotificationDeliverySafeErrorCategory =
  | "discord_api_error"
  | "discord_delivery_failed";
export type AutomatedTriggerSourceStatus = "active" | "disabled";
export type AutomatedTriggerReplyMode = "reply" | "channel_message" | "none";
export type ProviderKind = "fake" | "nvidia_nim";
export type ProviderCallStage =
  | "context_selection"
  | "response_decision"
  | "response_generation";
export type ConfiguredProviderAccessStatus =
  | "available"
  | "not_configured"
  | "unavailable";
export type SafeProviderErrorCategory =
  | "not_configured"
  | "authentication_failed"
  | "rate_limited"
  | "temporary_unavailable"
  | "policy_rejected"
  | "invalid_response"
  | "unknown";

export type OwnerRecord = {
  ownerDiscordUserId: string;
  role: OwnerRole;
};

export type OwnerScope = OwnerRecord;

export type AllowedDiscordUserRecord =
  | {
      kind: "owner";
      discordUserId: string;
      assignedOwnerDiscordUserId: string;
      role: OwnerRole;
    }
  | {
      kind: "registered_member";
      discordUserId: string;
      assignedOwnerDiscordUserId: string;
    };

type InsertProviderCallAuditBaseInput = {
  providerCallId: string;
  requestId: string;
  model: string;
  providerCallStage: ProviderCallStage;
  status: "started" | "completed" | "failed";
  safeErrorCategory: SafeProviderErrorCategory | null;
  durationMs: number | null;
  createdAt: string;
  retainUntil: string;
};

export type InsertProviderCallAuditInput = InsertProviderCallAuditBaseInput &
  (
    | { providerKind: "nvidia_nim"; providerRef?: "deployment" }
    | { providerKind?: "fake"; providerRef: string }
  );

export type UpsertDiscordUserInput = {
  discordUserId: string;
  displayNameSnapshot: string | null;
  observedAt: string;
};

export type UpsertCandidateInput = {
  candidateDiscordUserId: string;
  observedInGuildId: string | null;
  observedInChannelId: string | null;
  observedAt: string;
  expiresAt: string;
};

export type InsertRequestAuditInput = {
  requestAuditId: string;
  requestId: string;
  actorType: "owner" | "bot_service" | "scheduled";
  eventType: string;
  status: "accepted" | "rejected" | "failed" | "completed";
  errorCategory: string | null;
  durationMs: number | null;
  createdAt: string;
  retainUntil: string;
};

export type InsertSelectedContextMessageInput = {
  selectedContextId: string;
  requestId: string;
  discordMessageId: string;
  contextSource?: string | null;
  authorRelation?: string | null;
  createdAt: string;
  retainUntil: string;
};

export type RegisteredMemberListItem = {
  memberDiscordUserId: string;
  displayNameSnapshot: string | null;
  assignedOwnerDiscordUserId: string;
  status: RegisteredMemberStatus;
  createdAt: string;
  updatedAt: string;
};

export type CandidateDiscordUserListItem = {
  candidateDiscordUserId: string;
  displayNameSnapshot: string | null;
  observedInGuildId: string | null;
  observedInChannelId: string | null;
  firstObservedAt: string;
  lastObservedAt: string;
  expiresAt: string;
};

export type OwnerDashboardSummary = {
  registeredMemberCounts: { active: number; disabled: number };
  candidateDiscordUserCount: number;
  pendingOwnerNotificationCount: number;
  automatedTriggerSourceCounts: { active: number; disabled: number };
  usage: OwnerDashboardUsageSummary;
  recentErrors: OwnerDashboardRecentError[];
  settingsWarnings: OwnerDashboardSettingsWarning[];
};

export type OwnerDashboardUsageBucket = {
  label: string;
  periodStart: string;
  periodEnd: string;
  requestCount: number;
  providerCallCount: number;
  errorCount: number;
};

export type OwnerDashboardUsageSummary = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  requestCount: number;
  providerCallCount: number;
  errorCount: number;
  buckets: OwnerDashboardUsageBucket[];
};

export type OwnerDashboardRecentError = {
  id: string;
  occurredAt: string;
  surface: "request" | "provider";
  category: string;
  requestId: string | null;
};

export type OwnerDashboardSettingsWarning = {
  code: string;
  title: string;
  severity: "info" | "warning";
};

export type BotSettingsRecord = {
  notificationOwnerDiscordUserId: string | null;
  automatedTriggerDefaultCooldownSeconds: number;
  updatedAt: string;
};

export type ModelSettingsRecord = {
  contextSelectionModel: string;
  responseDecisionModel: string;
  responseGenerationModel: string;
  updatedAt: string;
};

export type ConfiguredProviderAccessMetadataRecord = {
  status: ConfiguredProviderAccessStatus;
  checkedAt: string | null;
  safeErrorCategory: SafeProviderErrorCategory | null;
};

export type ProviderConfigMetadataRecord = {
  providerKind: ProviderKind;
  configuredProviderAccess: ConfiguredProviderAccessMetadataRecord;
  modelSettings: ModelSettingsRecord;
  updatedAt: string;
};

export type PromptSettingsMetadataRecord = {
  promptSettingId: string;
  promptKey: string;
  activeVersionId: string | null;
  activePromptBodySha256: string | null;
  activePromptBodyLength: number | null;
  updatedAt: string;
};

export type OwnerSettingsRecord = {
  botSettings: BotSettingsRecord;
  modelSettings: ModelSettingsRecord;
  providerConfig: ProviderConfigMetadataRecord;
  promptSettings: PromptSettingsMetadataRecord[];
};

export type AutomatedTriggerSourceRecord = {
  automatedTriggerSourceId: string;
  sourceDiscordUserId: string | null;
  sourceApplicationId: string | null;
  assignedOwnerDiscordUserId: string;
  status: AutomatedTriggerSourceStatus;
  replyMode: AutomatedTriggerReplyMode;
  cooldownSeconds: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OwnerNotificationRecord = {
  ownerNotificationId: string;
  notificationOwnerDiscordUserId: string;
  candidateDiscordUserId: string | null;
  requestId: string | null;
  triggerKind: "dm" | "guild_mention" | "automated_trigger_source" | null;
  status: OwnerNotificationStatus;
  safeErrorCategory: OwnerNotificationDeliverySafeErrorCategory | null;
  createdAt: string;
  updatedAt: string;
};

export type InsertCleanupRunMetadataInput = {
  cleanupRunId: string;
  status: "started" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  deletedRowCount: number;
  safeErrorCategory: string | null;
  retainUntil: string;
};

type OwnerRow = {
  owner_discord_user_id: string;
  role: OwnerRole;
};

type MemberRow = {
  member_discord_user_id: string;
  display_name_snapshot: string | null;
  assigned_owner_discord_user_id: string;
  status: RegisteredMemberStatus;
  created_at: string;
  updated_at: string;
};

type CandidateRow = {
  candidate_discord_user_id: string;
  display_name_snapshot: string | null;
  observed_in_guild_id: string | null;
  observed_in_channel_id: string | null;
  first_observed_at: string;
  last_observed_at: string;
  expires_at: string;
};

type CountRow = { count: number };

type BotSettingsRow = {
  notification_owner_discord_user_id: string | null;
  automated_trigger_default_cooldown_seconds: number;
  updated_at: string;
};

type ModelSettingsRow = {
  context_selection_model: string;
  response_decision_model: string;
  response_generation_model: string;
  updated_at: string;
};

type ProviderSettingsRow = {
  provider_kind: ProviderKind;
  configured_provider_access_status: ConfiguredProviderAccessStatus;
  configured_provider_access_checked_at: string | null;
  safe_error_category: SafeProviderErrorCategory | null;
  model_settings_id: string;
  updated_at: string;
};

type PromptSettingsRow = {
  prompt_setting_id: string;
  prompt_key: string;
  active_version_id: string | null;
  prompt_body_sha256: string | null;
  prompt_body_length: number | null;
  updated_at: string;
};

type AutomatedSourceRow = {
  automated_trigger_source_id: string;
  source_discord_user_id: string | null;
  source_application_id: string | null;
  assigned_owner_discord_user_id: string;
  status: AutomatedTriggerSourceStatus;
  reply_mode: AutomatedTriggerReplyMode;
  cooldown_seconds: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

type OwnerNotificationRow = {
  owner_notification_id: string;
  notification_owner_discord_user_id: string;
  candidate_discord_user_id: string | null;
  request_id: string | null;
  trigger_kind: "dm" | "guild_mention" | "automated_trigger_source" | null;
  status: OwnerNotificationStatus;
  safe_error_category: string | null;
  created_at: string;
  updated_at: string;
};

type UsageTotalRow = {
  request_count?: number | null;
  request_error_count?: number | null;
  provider_call_count?: number | null;
  provider_error_count?: number | null;
};

type RequestUsageBucketRow = {
  bucket_date: string;
  request_count: number;
  request_error_count: number;
};

type ProviderUsageBucketRow = {
  bucket_date: string;
  provider_call_count: number;
  provider_error_count: number;
};

type RecentErrorRow = {
  id: string;
  occurred_at: string;
  surface: "request" | "provider";
  category: string | null;
  request_id: string | null;
};

type D1AllResult<T> = { results?: T[] };

function mapMember(row: MemberRow): RegisteredMemberListItem {
  return {
    memberDiscordUserId: row.member_discord_user_id,
    displayNameSnapshot: row.display_name_snapshot,
    assignedOwnerDiscordUserId: row.assigned_owner_discord_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCandidate(row: CandidateRow): CandidateDiscordUserListItem {
  return {
    candidateDiscordUserId: row.candidate_discord_user_id,
    displayNameSnapshot: row.display_name_snapshot,
    observedInGuildId: row.observed_in_guild_id,
    observedInChannelId: row.observed_in_channel_id,
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
    expiresAt: row.expires_at,
  };
}

function mapAutomatedSource(
  row: AutomatedSourceRow,
): AutomatedTriggerSourceRecord {
  return {
    automatedTriggerSourceId: row.automated_trigger_source_id,
    sourceDiscordUserId: row.source_discord_user_id,
    sourceApplicationId: row.source_application_id,
    assignedOwnerDiscordUserId: row.assigned_owner_discord_user_id,
    status: row.status,
    replyMode: row.reply_mode,
    cooldownSeconds: row.cooldown_seconds,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOwnerNotification(
  row: OwnerNotificationRow,
): OwnerNotificationRecord {
  return {
    ownerNotificationId: row.owner_notification_id,
    notificationOwnerDiscordUserId: row.notification_owner_discord_user_id,
    candidateDiscordUserId: row.candidate_discord_user_id,
    requestId: row.request_id,
    triggerKind: row.trigger_kind,
    status: row.status,
    safeErrorCategory: mapOwnerNotificationSafeErrorCategory(
      row.safe_error_category,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOwnerNotificationSafeErrorCategory(
  value: string | null,
): OwnerNotificationDeliverySafeErrorCategory | null {
  return value === "discord_api_error" || value === "discord_delivery_failed"
    ? value
    : null;
}

function defaultModelSettings(nowIsoUtc: string): ModelSettingsRecord {
  return {
    contextSelectionModel: "fake-context-selection",
    responseDecisionModel: "fake-response-decision",
    responseGenerationModel: "fake-response-generation",
    updatedAt: nowIsoUtc,
  };
}

function mapModelSettings(
  row: ModelSettingsRow | null | undefined,
  nowIsoUtc: string,
): ModelSettingsRecord {
  return row
    ? {
        contextSelectionModel: row.context_selection_model,
        responseDecisionModel: row.response_decision_model,
        responseGenerationModel: row.response_generation_model,
        updatedAt: row.updated_at,
      }
    : defaultModelSettings(nowIsoUtc);
}

function mapProviderConfig(
  row: ProviderSettingsRow | null | undefined,
  modelSettings: ModelSettingsRecord,
  nowIsoUtc: string,
): ProviderConfigMetadataRecord {
  return row
    ? {
        providerKind: row.provider_kind,
        configuredProviderAccess: {
          status: row.configured_provider_access_status,
          checkedAt: row.configured_provider_access_checked_at,
          safeErrorCategory: row.safe_error_category,
        },
        modelSettings,
        updatedAt: row.updated_at,
      }
    : {
        providerKind: "fake",
        configuredProviderAccess: {
          status: "available",
          checkedAt: null,
          safeErrorCategory: null,
        },
        modelSettings,
        updatedAt: nowIsoUtc,
      };
}

async function allRows<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = (await statement.all<T>()) as D1AllResult<T>;
  return result.results ?? [];
}

async function countFrom(statement: D1PreparedStatement): Promise<number> {
  const row = await statement.first<CountRow>();
  return row?.count ?? 0;
}

function numberFrom(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function bucketLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createEmptyUsageSummary(nowIsoUtc: string): OwnerDashboardUsageSummary {
  const periodEnd = new Date(nowIsoUtc);
  const firstBucketStart = addUtcDays(startOfUtcDay(periodEnd), -6);
  const buckets: OwnerDashboardUsageBucket[] = Array.from(
    { length: 7 },
    (_, index) => {
      const bucketStart = addUtcDays(firstBucketStart, index);
      const bucketEnd = addUtcDays(bucketStart, 1);
      return {
        label: bucketLabel(bucketStart),
        periodStart: bucketStart.toISOString(),
        periodEnd: bucketEnd.toISOString(),
        requestCount: 0,
        providerCallCount: 0,
        errorCount: 0,
      };
    },
  );

  return {
    periodStart: firstBucketStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodLabel: "Last 7 days",
    requestCount: 0,
    providerCallCount: 0,
    errorCount: 0,
    buckets,
  };
}

function settingsWarningsFrom(
  settings: OwnerSettingsRecord,
): OwnerDashboardSettingsWarning[] {
  const warnings: OwnerDashboardSettingsWarning[] = [];
  const providerAccess = settings.providerConfig.configuredProviderAccess;

  if (providerAccess.status === "not_configured") {
    warnings.push({
      code: "configured_provider_access_not_configured",
      title: "Configured Provider Access is not configured",
      severity: "warning",
    });
  } else if (providerAccess.status === "unavailable") {
    warnings.push({
      code: "configured_provider_access_unavailable",
      title: "Configured Provider Access is unavailable",
      severity: "warning",
    });
  }

  if (!settings.botSettings.notificationOwnerDiscordUserId) {
    warnings.push({
      code: "notification_owner_missing",
      title: "Owner Notification target is not set",
      severity: "info",
    });
  }

  if (
    settings.promptSettings.length === 0 ||
    settings.promptSettings.some((prompt) => !prompt.activeVersionId)
  ) {
    warnings.push({
      code: "prompt_metadata_missing",
      title: "Prompt settings metadata is incomplete",
      severity: "info",
    });
  }

  return warnings;
}

export class D1DcChatbotRepository {
  constructor(private readonly db: D1Database) {}

  async findOwnerByAccessSubject(
    cloudflareAccessSubject: string,
  ): Promise<OwnerRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT owner_discord_user_id, role
         FROM owner_discord_users
         WHERE cloudflare_access_subject = ?
         LIMIT 1`,
      )
      .bind(cloudflareAccessSubject)
      .first<OwnerRow>();

    if (!row) {
      return null;
    }

    return {
      ownerDiscordUserId: row.owner_discord_user_id,
      role: row.role,
    };
  }

  async findOwnerByDiscordUserId(
    ownerDiscordUserId: string,
  ): Promise<OwnerRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT owner_discord_user_id, role
         FROM owner_discord_users
         WHERE owner_discord_user_id = ?
         LIMIT 1`,
      )
      .bind(ownerDiscordUserId)
      .first<OwnerRow>();

    return row
      ? { ownerDiscordUserId: row.owner_discord_user_id, role: row.role }
      : null;
  }

  async findAllowedDiscordUser(
    discordUserId: string,
  ): Promise<AllowedDiscordUserRecord | null> {
    const owner = await this.db
      .prepare(
        `SELECT owner_discord_user_id, role
         FROM owner_discord_users
         WHERE owner_discord_user_id = ?
         LIMIT 1`,
      )
      .bind(discordUserId)
      .first<OwnerRow>();

    if (owner) {
      return {
        kind: "owner",
        discordUserId: owner.owner_discord_user_id,
        assignedOwnerDiscordUserId: owner.owner_discord_user_id,
        role: owner.role,
      };
    }

    const member = await this.db
      .prepare(
        `SELECT member_discord_user_id, NULL AS display_name_snapshot,
                assigned_owner_discord_user_id, status, created_at, updated_at
         FROM registered_members
         WHERE member_discord_user_id = ? AND status = 'active'
         LIMIT 1`,
      )
      .bind(discordUserId)
      .first<MemberRow>();

    if (!member) {
      return null;
    }

    return {
      kind: "registered_member",
      discordUserId: member.member_discord_user_id,
      assignedOwnerDiscordUserId: member.assigned_owner_discord_user_id,
    };
  }

  async upsertDiscordUser(input: UpsertDiscordUserInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO discord_users (
           discord_user_id,
           display_name_snapshot,
           first_observed_at,
           last_observed_at
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(discord_user_id) DO UPDATE SET
           display_name_snapshot = COALESCE(excluded.display_name_snapshot, discord_users.display_name_snapshot),
           last_observed_at = excluded.last_observed_at`,
      )
      .bind(
        input.discordUserId,
        input.displayNameSnapshot,
        input.observedAt,
        input.observedAt,
      )
      .run();
  }

  async upsertCandidate(input: UpsertCandidateInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO candidate_discord_users (
           candidate_discord_user_id,
           observed_in_guild_id,
           observed_in_channel_id,
           first_observed_at,
           last_observed_at,
           expires_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(candidate_discord_user_id) DO UPDATE SET
           observed_in_guild_id = excluded.observed_in_guild_id,
           observed_in_channel_id = excluded.observed_in_channel_id,
           last_observed_at = excluded.last_observed_at,
           expires_at = excluded.expires_at`,
      )
      .bind(
        input.candidateDiscordUserId,
        input.observedInGuildId,
        input.observedInChannelId,
        input.observedAt,
        input.observedAt,
        input.expiresAt,
      )
      .run();
  }

  async insertRequestAudit(input: InsertRequestAuditInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO request_audit_metadata (
           request_audit_id,
           request_id,
           actor_type,
           event_type,
           status,
           error_category,
           duration_ms,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.requestAuditId,
        input.requestId,
        input.actorType,
        input.eventType,
        input.status,
        input.errorCategory,
        input.durationMs,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  async insertProviderCallAudit(
    input: InsertProviderCallAuditInput,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO provider_call_audit_metadata (
           provider_call_id,
           request_id,
           provider_kind,
           provider_ref,
           model,
           provider_call_stage,
           status,
           safe_error_category,
           duration_ms,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.providerCallId,
        input.requestId,
        input.providerKind ?? "fake",
        input.providerRef ?? "deployment",
        input.model,
        input.providerCallStage,
        input.status,
        input.safeErrorCategory,
        input.durationMs,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  async insertSelectedContextMessage(
    input: InsertSelectedContextMessageInput,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO selected_context_message_ids (
           selected_context_id,
           request_id,
           discord_message_id,
           context_source,
           author_relation,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.selectedContextId,
        input.requestId,
        input.discordMessageId,
        input.contextSource ?? null,
        input.authorRelation ?? null,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  private async readAdminDashboardUsage(
    nowIsoUtc: string,
  ): Promise<OwnerDashboardUsageSummary> {
    const usage = createEmptyUsageSummary(nowIsoUtc);
    const totals = await this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM request_audit_metadata
            WHERE created_at >= ? AND created_at <= ?) AS request_count,
           (SELECT COUNT(*) FROM request_audit_metadata
            WHERE created_at >= ? AND created_at <= ?
              AND (status = 'failed' OR error_category IS NOT NULL)) AS request_error_count,
           (SELECT COUNT(*) FROM provider_call_audit_metadata
            WHERE created_at >= ? AND created_at <= ?) AS provider_call_count,
           (SELECT COUNT(*) FROM provider_call_audit_metadata
            WHERE created_at >= ? AND created_at <= ?
              AND (status = 'failed' OR safe_error_category IS NOT NULL)) AS provider_error_count`,
      )
      .bind(
        usage.periodStart,
        usage.periodEnd,
        usage.periodStart,
        usage.periodEnd,
        usage.periodStart,
        usage.periodEnd,
        usage.periodStart,
        usage.periodEnd,
      )
      .first<UsageTotalRow>();

    const requestBuckets = await allRows<RequestUsageBucketRow>(
      this.db
        .prepare(
          `SELECT substr(created_at, 1, 10) AS bucket_date,
                  COUNT(*) AS request_count,
                  SUM(CASE WHEN status = 'failed' OR error_category IS NOT NULL THEN 1 ELSE 0 END)
                    AS request_error_count
           FROM request_audit_metadata
           WHERE created_at >= ? AND created_at <= ?
           GROUP BY substr(created_at, 1, 10)
           ORDER BY bucket_date ASC`,
        )
        .bind(usage.periodStart, usage.periodEnd),
    );
    const providerBuckets = await allRows<ProviderUsageBucketRow>(
      this.db
        .prepare(
          `SELECT substr(created_at, 1, 10) AS bucket_date,
                  COUNT(*) AS provider_call_count,
                  SUM(CASE WHEN status = 'failed' OR safe_error_category IS NOT NULL THEN 1 ELSE 0 END)
                    AS provider_error_count
           FROM provider_call_audit_metadata
           WHERE created_at >= ? AND created_at <= ?
           GROUP BY substr(created_at, 1, 10)
           ORDER BY bucket_date ASC`,
        )
        .bind(usage.periodStart, usage.periodEnd),
    );

    const bucketByLabel = new Map(
      usage.buckets.map((bucket) => [bucket.label, bucket]),
    );
    for (const row of requestBuckets) {
      const bucket = bucketByLabel.get(row.bucket_date);
      if (!bucket) {
        continue;
      }
      bucket.requestCount = numberFrom(row.request_count);
      bucket.errorCount += numberFrom(row.request_error_count);
    }
    for (const row of providerBuckets) {
      const bucket = bucketByLabel.get(row.bucket_date);
      if (!bucket) {
        continue;
      }
      bucket.providerCallCount = numberFrom(row.provider_call_count);
      bucket.errorCount += numberFrom(row.provider_error_count);
    }

    usage.requestCount = numberFrom(totals?.request_count);
    usage.providerCallCount = numberFrom(totals?.provider_call_count);
    usage.errorCount =
      numberFrom(totals?.request_error_count) +
      numberFrom(totals?.provider_error_count);

    return usage;
  }

  private async readAdminDashboardRecentErrors(
    periodStart: string,
    periodEnd: string,
  ): Promise<OwnerDashboardRecentError[]> {
    const rows = await allRows<RecentErrorRow>(
      this.db
        .prepare(
          `SELECT request_audit_id AS id,
                  created_at AS occurred_at,
                  'request' AS surface,
                  COALESCE(error_category, status) AS category,
                  request_id
           FROM request_audit_metadata
           WHERE created_at >= ? AND created_at <= ?
             AND (status = 'failed' OR error_category IS NOT NULL)
           UNION ALL
           SELECT provider_call_id AS id,
                  created_at AS occurred_at,
                  'provider' AS surface,
                  COALESCE(safe_error_category, status) AS category,
                  request_id
           FROM provider_call_audit_metadata
           WHERE created_at >= ? AND created_at <= ?
             AND (status = 'failed' OR safe_error_category IS NOT NULL)
           ORDER BY occurred_at DESC
           LIMIT 5`,
        )
        .bind(periodStart, periodEnd, periodStart, periodEnd),
    );

    return rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      surface: row.surface,
      category: row.category ?? "unknown",
      requestId: row.request_id,
    }));
  }

  async getDashboardSummary(
    scope: OwnerScope,
    nowIsoUtc = new Date().toISOString(),
  ): Promise<OwnerDashboardSummary> {
    const ownerFilter =
      scope.role === "admin_owner"
        ? ""
        : " WHERE assigned_owner_discord_user_id = ?";
    const memberBinds =
      scope.role === "admin_owner" ? [] : [scope.ownerDiscordUserId];
    const activeMembers = await countFrom(
      this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM registered_members WHERE status = 'active'${
            scope.role === "admin_owner"
              ? ""
              : " AND assigned_owner_discord_user_id = ?"
          }`,
        )
        .bind(...memberBinds),
    );
    const disabledMembers = await countFrom(
      this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM registered_members WHERE status = 'disabled'${
            scope.role === "admin_owner"
              ? ""
              : " AND assigned_owner_discord_user_id = ?"
          }`,
        )
        .bind(...memberBinds),
    );
    const candidateDiscordUserCount = await countFrom(
      this.db.prepare("SELECT COUNT(*) AS count FROM candidate_discord_users"),
    );
    const pendingOwnerNotificationCount = await countFrom(
      this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM owner_notifications
           WHERE status IN ('pending_delivery', 'delivery_requested')${
             scope.role === "admin_owner"
               ? ""
               : " AND notification_owner_discord_user_id = ?"
           }`,
        )
        .bind(...memberBinds),
    );
    const activeSources = await countFrom(
      this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM automated_trigger_sources WHERE status = 'active'${ownerFilter.replace(
            " WHERE",
            " AND",
          )}`,
        )
        .bind(...memberBinds),
    );
    const disabledSources = await countFrom(
      this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM automated_trigger_sources WHERE status = 'disabled'${ownerFilter.replace(
            " WHERE",
            " AND",
          )}`,
        )
        .bind(...memberBinds),
    );
    const usage =
      scope.role === "admin_owner"
        ? await this.readAdminDashboardUsage(nowIsoUtc)
        : createEmptyUsageSummary(nowIsoUtc);
    const recentErrors =
      scope.role === "admin_owner"
        ? await this.readAdminDashboardRecentErrors(
            usage.periodStart,
            usage.periodEnd,
          )
        : [];
    const settings = await this.getOwnerSettings(nowIsoUtc);

    return {
      registeredMemberCounts: {
        active: activeMembers,
        disabled: disabledMembers,
      },
      candidateDiscordUserCount,
      pendingOwnerNotificationCount,
      automatedTriggerSourceCounts: {
        active: activeSources,
        disabled: disabledSources,
      },
      usage,
      recentErrors,
      settingsWarnings: settingsWarningsFrom(settings),
    };
  }

  async listRegisteredMembers(
    scope: OwnerScope,
  ): Promise<RegisteredMemberListItem[]> {
    const rows = await allRows<MemberRow>(
      this.db
        .prepare(
          `SELECT rm.member_discord_user_id,
                  du.display_name_snapshot,
                  rm.assigned_owner_discord_user_id,
                  rm.status,
                  rm.created_at,
                  rm.updated_at
           FROM registered_members rm
           LEFT JOIN discord_users du ON du.discord_user_id = rm.member_discord_user_id
           ${scope.role === "admin_owner" ? "" : "WHERE rm.assigned_owner_discord_user_id = ?"}
           ORDER BY rm.updated_at DESC, rm.member_discord_user_id ASC`,
        )
        .bind(
          ...(scope.role === "admin_owner" ? [] : [scope.ownerDiscordUserId]),
        ),
    );
    return rows.map(mapMember);
  }

  async createRegisteredMember(input: {
    memberDiscordUserId: string;
    assignedOwnerDiscordUserId: string;
    nowIsoUtc: string;
  }): Promise<RegisteredMemberListItem> {
    await this.db
      .prepare(
        `INSERT INTO registered_members (
           member_discord_user_id,
           assigned_owner_discord_user_id,
           status,
           created_at,
           updated_at
         ) VALUES (?, ?, 'active', ?, ?)
         ON CONFLICT(member_discord_user_id) DO UPDATE SET
           assigned_owner_discord_user_id = excluded.assigned_owner_discord_user_id,
           status = 'active',
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.memberDiscordUserId,
        input.assignedOwnerDiscordUserId,
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();

    const member = await this.getRegisteredMember(input.memberDiscordUserId);
    if (!member) {
      throw new Error("registered_member_create_failed");
    }
    return member;
  }

  async getRegisteredMember(
    memberDiscordUserId: string,
  ): Promise<RegisteredMemberListItem | null> {
    const row = await this.db
      .prepare(
        `SELECT rm.member_discord_user_id,
                du.display_name_snapshot,
                rm.assigned_owner_discord_user_id,
                rm.status,
                rm.created_at,
                rm.updated_at
         FROM registered_members rm
         LEFT JOIN discord_users du ON du.discord_user_id = rm.member_discord_user_id
         WHERE rm.member_discord_user_id = ?
         LIMIT 1`,
      )
      .bind(memberDiscordUserId)
      .first<MemberRow>();
    return row ? mapMember(row) : null;
  }

  async disableRegisteredMember(
    scope: OwnerScope,
    memberDiscordUserId: string,
    nowIsoUtc: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE registered_members
         SET status = 'disabled', updated_at = ?
         WHERE member_discord_user_id = ?${
           scope.role === "admin_owner"
             ? ""
             : " AND assigned_owner_discord_user_id = ?"
         }`,
      )
      .bind(
        nowIsoUtc,
        memberDiscordUserId,
        ...(scope.role === "admin_owner" ? [] : [scope.ownerDiscordUserId]),
      )
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listCandidateDiscordUsers(
    limit: number,
  ): Promise<CandidateDiscordUserListItem[]> {
    const rows = await allRows<CandidateRow>(
      this.db
        .prepare(
          `SELECT c.candidate_discord_user_id,
                  du.display_name_snapshot,
                  c.observed_in_guild_id,
                  c.observed_in_channel_id,
                  c.first_observed_at,
                  c.last_observed_at,
                  c.expires_at
           FROM candidate_discord_users c
           LEFT JOIN discord_users du ON du.discord_user_id = c.candidate_discord_user_id
           ORDER BY c.last_observed_at DESC, c.candidate_discord_user_id ASC
           LIMIT ?`,
        )
        .bind(limit),
    );
    return rows.map(mapCandidate);
  }

  async promoteCandidateDiscordUser(input: {
    candidateDiscordUserId: string;
    assignedOwnerDiscordUserId: string;
    nowIsoUtc: string;
  }): Promise<RegisteredMemberListItem | null> {
    const candidate = await this.db
      .prepare(
        `SELECT candidate_discord_user_id,
                NULL AS display_name_snapshot,
                observed_in_guild_id,
                observed_in_channel_id,
                first_observed_at,
                last_observed_at,
                expires_at
         FROM candidate_discord_users
         WHERE candidate_discord_user_id = ?
         LIMIT 1`,
      )
      .bind(input.candidateDiscordUserId)
      .first<CandidateRow>();
    if (!candidate) {
      return null;
    }

    const member = await this.createRegisteredMember({
      memberDiscordUserId: input.candidateDiscordUserId,
      assignedOwnerDiscordUserId: input.assignedOwnerDiscordUserId,
      nowIsoUtc: input.nowIsoUtc,
    });
    await this.db
      .prepare(
        `DELETE FROM candidate_discord_users WHERE candidate_discord_user_id = ?`,
      )
      .bind(input.candidateDiscordUserId)
      .run();
    return member;
  }

  private async readModelSettings(
    nowIsoUtc: string,
  ): Promise<ModelSettingsRecord> {
    const row = await this.db
      .prepare(
        `SELECT context_selection_model,
                response_decision_model,
                response_generation_model,
                updated_at
         FROM model_settings
         WHERE settings_id = 'singleton'
         LIMIT 1`,
      )
      .first<ModelSettingsRow>();
    return mapModelSettings(row, nowIsoUtc);
  }

  private async readProviderSettings(): Promise<ProviderSettingsRow | null> {
    return this.db
      .prepare(
        `SELECT provider_kind,
                configured_provider_access_status,
                configured_provider_access_checked_at,
                safe_error_category,
                model_settings_id,
                updated_at
         FROM provider_settings
         WHERE settings_id = 'singleton'
         LIMIT 1`,
      )
      .first<ProviderSettingsRow>();
  }

  async getProviderConfigMetadata(
    nowIsoUtc: string,
  ): Promise<ProviderConfigMetadataRecord> {
    const modelSettings = await this.readModelSettings(nowIsoUtc);
    const providerSettings = await this.readProviderSettings();
    return mapProviderConfig(providerSettings, modelSettings, nowIsoUtc);
  }

  async getOwnerSettings(nowIsoUtc: string): Promise<OwnerSettingsRecord> {
    const botSettings = await this.db
      .prepare(
        `SELECT notification_owner_discord_user_id,
                automated_trigger_default_cooldown_seconds,
                updated_at
         FROM bot_settings
         WHERE settings_id = 'singleton'
         LIMIT 1`,
      )
      .first<BotSettingsRow>();
    const modelSettings = await this.readModelSettings(nowIsoUtc);
    const providerSettings = await this.readProviderSettings();
    const promptRows = await allRows<PromptSettingsRow>(
      this.db.prepare(
        `SELECT ps.prompt_setting_id,
                ps.prompt_key,
                ps.active_version_id,
                psv.prompt_body_sha256,
                psv.prompt_body_length,
                ps.updated_at
         FROM prompt_settings ps
         LEFT JOIN prompt_setting_versions psv
           ON psv.prompt_setting_version_id = ps.active_version_id
         ORDER BY ps.prompt_key ASC`,
      ),
    );

    return {
      botSettings: botSettings
        ? {
            notificationOwnerDiscordUserId:
              botSettings.notification_owner_discord_user_id,
            automatedTriggerDefaultCooldownSeconds:
              botSettings.automated_trigger_default_cooldown_seconds,
            updatedAt: botSettings.updated_at,
          }
        : {
            notificationOwnerDiscordUserId: null,
            automatedTriggerDefaultCooldownSeconds: 60,
            updatedAt: nowIsoUtc,
          },
      modelSettings,
      providerConfig: mapProviderConfig(
        providerSettings,
        modelSettings,
        nowIsoUtc,
      ),
      promptSettings: promptRows.map((row) => ({
        promptSettingId: row.prompt_setting_id,
        promptKey: row.prompt_key,
        activeVersionId: row.active_version_id,
        activePromptBodySha256: row.prompt_body_sha256,
        activePromptBodyLength: row.prompt_body_length,
        updatedAt: row.updated_at,
      })),
    };
  }

  async updateBotSettings(input: {
    notificationOwnerDiscordUserId: string | null | undefined;
    automatedTriggerDefaultCooldownSeconds: number | undefined;
    nowIsoUtc: string;
  }): Promise<void> {
    const current = await this.getOwnerSettings(input.nowIsoUtc);
    await this.db
      .prepare(
        `INSERT INTO bot_settings (
           settings_id,
           notification_owner_discord_user_id,
           automated_trigger_default_cooldown_seconds,
           created_at,
           updated_at
         ) VALUES ('singleton', ?, ?, ?, ?)
         ON CONFLICT(settings_id) DO UPDATE SET
           notification_owner_discord_user_id = excluded.notification_owner_discord_user_id,
           automated_trigger_default_cooldown_seconds = excluded.automated_trigger_default_cooldown_seconds,
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.notificationOwnerDiscordUserId === undefined
          ? current.botSettings.notificationOwnerDiscordUserId
          : input.notificationOwnerDiscordUserId,
        input.automatedTriggerDefaultCooldownSeconds ??
          current.botSettings.automatedTriggerDefaultCooldownSeconds,
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();
  }

  async updateModelSettings(input: {
    contextSelectionModel: string;
    responseDecisionModel: string;
    responseGenerationModel: string;
    nowIsoUtc: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO model_settings (
           settings_id,
           context_selection_model,
           response_decision_model,
           response_generation_model,
           created_at,
           updated_at
         ) VALUES ('singleton', ?, ?, ?, ?, ?)
         ON CONFLICT(settings_id) DO UPDATE SET
           context_selection_model = excluded.context_selection_model,
           response_decision_model = excluded.response_decision_model,
           response_generation_model = excluded.response_generation_model,
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.contextSelectionModel,
        input.responseDecisionModel,
        input.responseGenerationModel,
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();
  }

  async upsertProviderConfigMetadata(input: {
    providerKind: ProviderKind;
    configuredProviderAccessStatus: ConfiguredProviderAccessStatus;
    checkedAt: string | null;
    safeErrorCategory: SafeProviderErrorCategory | null;
    modelSettingsId?: string;
    nowIsoUtc: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO provider_settings (
           settings_id,
           provider_kind,
           configured_provider_access_status,
           configured_provider_access_checked_at,
           safe_error_category,
           model_settings_id,
           created_at,
           updated_at
         ) VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(settings_id) DO UPDATE SET
           provider_kind = excluded.provider_kind,
           configured_provider_access_status = excluded.configured_provider_access_status,
           configured_provider_access_checked_at = excluded.configured_provider_access_checked_at,
           safe_error_category = excluded.safe_error_category,
           model_settings_id = excluded.model_settings_id,
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.providerKind,
        input.configuredProviderAccessStatus,
        input.checkedAt,
        input.safeErrorCategory,
        input.modelSettingsId ?? "singleton",
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();
  }

  async upsertPromptSettingsMetadata(input: {
    promptSettingId: string;
    promptSettingVersionId: string;
    promptKey: string;
    promptBodySha256: string;
    promptBodyLength: number;
    label: string | null;
    actorOwnerDiscordUserId: string;
    nowIsoUtc: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO prompt_settings (
           prompt_setting_id,
           prompt_key,
           active_version_id,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(prompt_key) DO UPDATE SET
           active_version_id = excluded.active_version_id,
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.promptSettingId,
        input.promptKey,
        input.promptSettingVersionId,
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();

    const promptSetting = await this.db
      .prepare(
        `SELECT prompt_setting_id FROM prompt_settings WHERE prompt_key = ? LIMIT 1`,
      )
      .bind(input.promptKey)
      .first<{ prompt_setting_id: string }>();

    await this.db
      .prepare(
        `INSERT INTO prompt_setting_versions (
           prompt_setting_version_id,
           prompt_setting_id,
           label,
           prompt_body_sha256,
           prompt_body_length,
           created_by_owner_discord_user_id,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.promptSettingVersionId,
        promptSetting?.prompt_setting_id ?? input.promptSettingId,
        input.label,
        input.promptBodySha256,
        input.promptBodyLength,
        input.actorOwnerDiscordUserId,
        input.nowIsoUtc,
      )
      .run();
  }

  async insertSettingAudit(input: {
    settingAuditId: string;
    actorOwnerDiscordUserId: string;
    settingCategory: string;
    eventType: string;
    beforeRef: string | null;
    afterRef: string | null;
    createdAt: string;
    retainUntil: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO setting_audit_metadata (
           setting_audit_id,
           actor_owner_discord_user_id,
           setting_category,
           event_type,
           before_ref,
           after_ref,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.settingAuditId,
        input.actorOwnerDiscordUserId,
        input.settingCategory,
        input.eventType,
        input.beforeRef,
        input.afterRef,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  async listAutomatedTriggerSources(
    scope: OwnerScope,
  ): Promise<AutomatedTriggerSourceRecord[]> {
    const rows = await allRows<AutomatedSourceRow>(
      this.db
        .prepare(
          `SELECT automated_trigger_source_id,
                  source_discord_user_id,
                  source_application_id,
                  assigned_owner_discord_user_id,
                  status,
                  reply_mode,
                  cooldown_seconds,
                  last_triggered_at,
                  created_at,
                  updated_at
           FROM automated_trigger_sources
           ${scope.role === "admin_owner" ? "" : "WHERE assigned_owner_discord_user_id = ?"}
           ORDER BY updated_at DESC, automated_trigger_source_id ASC`,
        )
        .bind(
          ...(scope.role === "admin_owner" ? [] : [scope.ownerDiscordUserId]),
        ),
    );
    return rows.map(mapAutomatedSource);
  }

  async createAutomatedTriggerSource(input: {
    automatedTriggerSourceId: string;
    sourceDiscordUserId: string | null;
    sourceApplicationId: string | null;
    assignedOwnerDiscordUserId: string;
    replyMode: AutomatedTriggerReplyMode;
    cooldownSeconds: number;
    nowIsoUtc: string;
  }): Promise<AutomatedTriggerSourceRecord> {
    await this.db
      .prepare(
        `INSERT INTO automated_trigger_sources (
           automated_trigger_source_id,
           source_discord_user_id,
           source_application_id,
           assigned_owner_discord_user_id,
           status,
           reply_mode,
           cooldown_seconds,
           last_triggered_at,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL, ?, ?)`,
      )
      .bind(
        input.automatedTriggerSourceId,
        input.sourceDiscordUserId,
        input.sourceApplicationId,
        input.assignedOwnerDiscordUserId,
        input.replyMode,
        input.cooldownSeconds,
        input.nowIsoUtc,
        input.nowIsoUtc,
      )
      .run();
    const source = await this.getAutomatedTriggerSource(
      input.automatedTriggerSourceId,
    );
    if (!source) {
      throw new Error("automated_trigger_source_create_failed");
    }
    return source;
  }

  async getAutomatedTriggerSource(
    automatedTriggerSourceId: string,
  ): Promise<AutomatedTriggerSourceRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT automated_trigger_source_id,
                source_discord_user_id,
                source_application_id,
                assigned_owner_discord_user_id,
                status,
                reply_mode,
                cooldown_seconds,
                last_triggered_at,
                created_at,
                updated_at
         FROM automated_trigger_sources
         WHERE automated_trigger_source_id = ?
         LIMIT 1`,
      )
      .bind(automatedTriggerSourceId)
      .first<AutomatedSourceRow>();
    return row ? mapAutomatedSource(row) : null;
  }

  async updateAutomatedTriggerSource(
    scope: OwnerScope,
    input: {
      automatedTriggerSourceId: string;
      assignedOwnerDiscordUserId?: string;
      status?: AutomatedTriggerSourceStatus;
      replyMode?: AutomatedTriggerReplyMode;
      cooldownSeconds?: number;
      nowIsoUtc: string;
    },
  ): Promise<AutomatedTriggerSourceRecord | null> {
    const current = await this.getAutomatedTriggerSource(
      input.automatedTriggerSourceId,
    );
    if (!current) {
      return null;
    }
    if (
      scope.role !== "admin_owner" &&
      current.assignedOwnerDiscordUserId !== scope.ownerDiscordUserId
    ) {
      return null;
    }
    if (
      scope.role !== "admin_owner" &&
      (input.assignedOwnerDiscordUserId ||
        input.replyMode ||
        input.cooldownSeconds)
    ) {
      return null;
    }

    await this.db
      .prepare(
        `UPDATE automated_trigger_sources
         SET assigned_owner_discord_user_id = ?,
             status = ?,
             reply_mode = ?,
             cooldown_seconds = ?,
             updated_at = ?
         WHERE automated_trigger_source_id = ?`,
      )
      .bind(
        input.assignedOwnerDiscordUserId ?? current.assignedOwnerDiscordUserId,
        input.status ?? current.status,
        input.replyMode ?? current.replyMode,
        input.cooldownSeconds ?? current.cooldownSeconds,
        input.nowIsoUtc,
        input.automatedTriggerSourceId,
      )
      .run();
    return this.getAutomatedTriggerSource(input.automatedTriggerSourceId);
  }

  async findActiveAutomatedTriggerSource(input: {
    sourceDiscordUserId: string;
    sourceApplicationId: string | null;
  }): Promise<AutomatedTriggerSourceRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT automated_trigger_source_id,
                source_discord_user_id,
                source_application_id,
                assigned_owner_discord_user_id,
                status,
                reply_mode,
                cooldown_seconds,
                last_triggered_at,
                created_at,
                updated_at
         FROM automated_trigger_sources
         WHERE status = 'active'
           AND (
             source_discord_user_id = ?
             OR (? IS NOT NULL AND source_application_id = ?)
           )
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(
        input.sourceDiscordUserId,
        input.sourceApplicationId,
        input.sourceApplicationId,
      )
      .first<AutomatedSourceRow>();
    return row ? mapAutomatedSource(row) : null;
  }

  async markAutomatedTriggerSourceTriggered(
    automatedTriggerSourceId: string,
    triggeredAt: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE automated_trigger_sources
         SET last_triggered_at = ?, updated_at = ?
         WHERE automated_trigger_source_id = ?`,
      )
      .bind(triggeredAt, triggeredAt, automatedTriggerSourceId)
      .run();
  }

  async getNotificationOwnerDiscordUserId(): Promise<string | null> {
    const settings = await this.db
      .prepare(
        `SELECT notification_owner_discord_user_id
         FROM bot_settings
         WHERE settings_id = 'singleton'
         LIMIT 1`,
      )
      .first<{ notification_owner_discord_user_id: string | null }>();
    if (settings?.notification_owner_discord_user_id) {
      return settings.notification_owner_discord_user_id;
    }
    const owner = await this.db
      .prepare(
        `SELECT owner_discord_user_id
         FROM owner_discord_users
         WHERE role = 'admin_owner'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .first<{ owner_discord_user_id: string }>();
    return owner?.owner_discord_user_id ?? null;
  }

  async insertOwnerNotification(input: {
    ownerNotificationId: string;
    notificationOwnerDiscordUserId: string;
    candidateDiscordUserId: string | null;
    requestId: string | null;
    triggerKind: "dm" | "guild_mention" | "automated_trigger_source" | null;
    status: OwnerNotificationStatus;
    safeErrorCategory: OwnerNotificationDeliverySafeErrorCategory | null;
    createdAt: string;
    retainUntil: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO owner_notifications (
           owner_notification_id,
           notification_owner_discord_user_id,
           candidate_discord_user_id,
           request_id,
           trigger_kind,
           status,
           safe_error_category,
           created_at,
           updated_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.ownerNotificationId,
        input.notificationOwnerDiscordUserId,
        input.candidateDiscordUserId,
        input.requestId,
        input.triggerKind,
        input.status,
        input.safeErrorCategory,
        input.createdAt,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  async listOwnerNotifications(
    scope: OwnerScope,
    limit: number,
  ): Promise<OwnerNotificationRecord[]> {
    const rows = await allRows<OwnerNotificationRow>(
      this.db
        .prepare(
          `SELECT owner_notification_id,
                  notification_owner_discord_user_id,
                  candidate_discord_user_id,
                  request_id,
                  trigger_kind,
                  status,
                  safe_error_category,
                  created_at,
                  updated_at
           FROM owner_notifications
           ${scope.role === "admin_owner" ? "" : "WHERE notification_owner_discord_user_id = ?"}
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .bind(
          ...(scope.role === "admin_owner" ? [] : [scope.ownerDiscordUserId]),
          limit,
        ),
    );
    return rows.map(mapOwnerNotification);
  }

  async claimPendingOwnerNotifications(input: {
    limit: number;
    nowIsoUtc: string;
  }): Promise<OwnerNotificationRecord[]> {
    const rows = await allRows<OwnerNotificationRow>(
      this.db
        .prepare(
          `SELECT owner_notification_id,
                  notification_owner_discord_user_id,
                  candidate_discord_user_id,
                  request_id,
                  trigger_kind,
                  status,
                  safe_error_category,
                  created_at,
                  updated_at
           FROM owner_notifications
           WHERE status = 'pending_delivery'
           ORDER BY created_at ASC, owner_notification_id ASC
           LIMIT ?`,
        )
        .bind(input.limit),
    );

    const claimed: OwnerNotificationRecord[] = [];
    for (const row of rows) {
      const result = await this.db
        .prepare(
          `UPDATE owner_notifications
           SET status = 'delivery_requested',
               safe_error_category = NULL,
               updated_at = ?
           WHERE owner_notification_id = ?
             AND status = 'pending_delivery'`,
        )
        .bind(input.nowIsoUtc, row.owner_notification_id)
        .run();
      if ((result.meta.changes ?? 0) > 0) {
        claimed.push({
          ...mapOwnerNotification(row),
          status: "delivery_requested",
          safeErrorCategory: null,
          updatedAt: input.nowIsoUtc,
        });
      }
    }

    return claimed;
  }

  async updateOwnerNotificationDelivery(input: {
    ownerNotificationId: string;
    status: "delivery_requested" | "delivered" | "failed";
    safeErrorCategory: OwnerNotificationDeliverySafeErrorCategory | null;
    updatedAt: string;
  }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE owner_notifications
         SET status = ?, safe_error_category = ?, updated_at = ?
         WHERE owner_notification_id = ?`,
      )
      .bind(
        input.status,
        input.safeErrorCategory,
        input.updatedAt,
        input.ownerNotificationId,
      )
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async insertDiscordResponseMessage(input: {
    responseMessageId: string;
    requestId: string;
    discordMessageId: string;
    guildId: string | null;
    channelId: string;
    chunkIndex: number;
    chunkCount: number;
    status: "posted" | "failed";
    createdAt: string;
    retainUntil: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO discord_response_messages (
           response_message_id,
           request_id,
           discord_message_id,
           guild_id,
           channel_id,
           chunk_index,
           chunk_count,
           status,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.responseMessageId,
        input.requestId,
        input.discordMessageId,
        input.guildId,
        input.channelId,
        input.chunkIndex,
        input.chunkCount,
        input.status,
        input.createdAt,
        input.retainUntil,
      )
      .run();
  }

  async insertCleanupRunMetadata(
    input: InsertCleanupRunMetadataInput,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO cleanup_run_metadata (
           cleanup_run_id,
           status,
           started_at,
           finished_at,
           deleted_row_count,
           safe_error_category,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.cleanupRunId,
        input.status,
        input.startedAt,
        input.finishedAt,
        input.deletedRowCount,
        input.safeErrorCategory,
        input.retainUntil,
      )
      .run();
  }
}

export function addDaysIso(baseIsoUtc: string, days: number): string {
  const date = new Date(baseIsoUtc);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
