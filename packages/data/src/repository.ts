export type OwnerRole = "admin_owner" | "regular_owner";
export type RegisteredMemberStatus = "active" | "disabled";
export type ConnectionStatus = "active" | "needs_reconnect" | "revoked";
export type OwnerNotificationStatus =
  | "pending_delivery"
  | "delivery_requested"
  | "delivered"
  | "failed"
  | "suppressed";
export type AutomatedTriggerSourceStatus = "active" | "disabled";
export type AutomatedTriggerReplyMode = "reply" | "channel_message" | "none";

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

export type ChatGPTSubscriptionConnectionRecord = {
  connectionId: string;
  ownerDiscordUserId: string;
  status: ConnectionStatus;
  updatedAt?: string | null;
};

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

export type InsertProviderCallAuditInput = {
  providerCallId: string;
  requestId: string;
  connectionId: string;
  model: string;
  status: "started" | "completed" | "failed";
  safeErrorCategory: string | null;
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
  safeErrorCategory: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateConnectionFlowInput = {
  connectionFlowStateId: string;
  ownerDiscordUserId: string;
  stateHash: string;
  requestedAt: string;
  expiresAt: string;
  retainUntil: string;
};

export type CompleteConnectionFlowInput = {
  connectionFlowStateId: string;
  ownerDiscordUserId: string;
  expectedStateHash: string;
  connectionId: string;
  encryptedCredentialCiphertext: string;
  completedAt: string;
  retainUntil: string;
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

type ConnectionRow = {
  connection_id: string;
  owner_discord_user_id: string;
  status: ConnectionStatus;
  updated_at: string | null;
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
    safeErrorCategory: row.safe_error_category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  async getOwnerConnectionStatus(
    ownerDiscordUserId: string,
  ): Promise<"connected" | "needs_reconnect" | "missing"> {
    const row = await this.db
      .prepare(
        `SELECT status
         FROM chatgpt_subscription_connections
         WHERE owner_discord_user_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(ownerDiscordUserId)
      .first<{ status: ConnectionStatus }>();

    if (!row || row.status === "revoked") {
      return "missing";
    }

    return row.status === "active" ? "connected" : "needs_reconnect";
  }

  async getLatestConnectionForOwner(
    ownerDiscordUserId: string,
  ): Promise<ChatGPTSubscriptionConnectionRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT connection_id, owner_discord_user_id, status, updated_at
         FROM chatgpt_subscription_connections
         WHERE owner_discord_user_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(ownerDiscordUserId)
      .first<ConnectionRow>();

    return row
      ? {
          connectionId: row.connection_id,
          ownerDiscordUserId: row.owner_discord_user_id,
          status: row.status,
          updatedAt: row.updated_at,
        }
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

  async findActiveConnectionForOwner(
    ownerDiscordUserId: string,
  ): Promise<ChatGPTSubscriptionConnectionRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT connection_id, owner_discord_user_id, status, updated_at
         FROM chatgpt_subscription_connections
         WHERE owner_discord_user_id = ? AND status = 'active'
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(ownerDiscordUserId)
      .first<ConnectionRow>();

    if (!row) {
      return null;
    }

    return {
      connectionId: row.connection_id,
      ownerDiscordUserId: row.owner_discord_user_id,
      status: row.status,
      updatedAt: row.updated_at,
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
           connection_id,
           model,
           status,
           safe_error_category,
           duration_ms,
           created_at,
           retain_until
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.providerCallId,
        input.requestId,
        input.connectionId,
        input.model,
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

  async getDashboardSummary(scope: OwnerScope): Promise<OwnerDashboardSummary> {
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
    const modelSettings = await this.db
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
      modelSettings: modelSettings
        ? {
            contextSelectionModel: modelSettings.context_selection_model,
            responseDecisionModel: modelSettings.response_decision_model,
            responseGenerationModel: modelSettings.response_generation_model,
            updatedAt: modelSettings.updated_at,
          }
        : {
            contextSelectionModel: "fake-context-selection",
            responseDecisionModel: "fake-response-decision",
            responseGenerationModel: "fake-response-generation",
            updatedAt: nowIsoUtc,
          },
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
    safeErrorCategory: string | null;
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

  async updateOwnerNotificationDelivery(input: {
    ownerNotificationId: string;
    status: "delivery_requested" | "delivered" | "failed";
    safeErrorCategory: string | null;
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

  async createConnectionFlow(input: CreateConnectionFlowInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO connection_flow_states (
           connection_flow_state_id,
           owner_discord_user_id,
           provider_kind,
           state_hash,
           status,
           requested_at,
           expires_at,
           completed_at,
           retain_until
         ) VALUES (?, ?, 'fake', ?, 'pending', ?, ?, NULL, ?)`,
      )
      .bind(
        input.connectionFlowStateId,
        input.ownerDiscordUserId,
        input.stateHash,
        input.requestedAt,
        input.expiresAt,
        input.retainUntil,
      )
      .run();
  }

  async completeConnectionFlow(
    input: CompleteConnectionFlowInput,
  ): Promise<ChatGPTSubscriptionConnectionRecord | null> {
    const flow = await this.db
      .prepare(
        `SELECT connection_flow_state_id
         FROM connection_flow_states
         WHERE connection_flow_state_id = ?
           AND owner_discord_user_id = ?
           AND state_hash = ?
           AND status = 'pending'
           AND expires_at >= ?
         LIMIT 1`,
      )
      .bind(
        input.connectionFlowStateId,
        input.ownerDiscordUserId,
        input.expectedStateHash,
        input.completedAt,
      )
      .first<{ connection_flow_state_id: string }>();
    if (!flow) {
      return null;
    }

    await this.db
      .prepare(
        `UPDATE chatgpt_subscription_connections
         SET status = 'revoked', updated_at = ?
         WHERE owner_discord_user_id = ? AND status IN ('active', 'needs_reconnect')`,
      )
      .bind(input.completedAt, input.ownerDiscordUserId)
      .run();
    await this.db
      .prepare(
        `INSERT INTO chatgpt_subscription_connections (
           connection_id,
           owner_discord_user_id,
           status,
           encrypted_credential_ciphertext,
           credential_version,
           created_at,
           updated_at
         ) VALUES (?, ?, 'active', ?, 1, ?, ?)`,
      )
      .bind(
        input.connectionId,
        input.ownerDiscordUserId,
        input.encryptedCredentialCiphertext,
        input.completedAt,
        input.completedAt,
      )
      .run();
    await this.db
      .prepare(
        `UPDATE connection_flow_states
         SET status = 'completed', completed_at = ?, retain_until = ?
         WHERE connection_flow_state_id = ?`,
      )
      .bind(input.completedAt, input.retainUntil, input.connectionFlowStateId)
      .run();

    return this.getLatestConnectionForOwner(input.ownerDiscordUserId);
  }

  async revokeOwnerConnection(
    ownerDiscordUserId: string,
    nowIsoUtc: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE chatgpt_subscription_connections
         SET status = 'revoked', updated_at = ?
         WHERE owner_discord_user_id = ? AND status IN ('active', 'needs_reconnect')`,
      )
      .bind(nowIsoUtc, ownerDiscordUserId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async markOwnerConnectionNeedsReconnect(
    ownerDiscordUserId: string,
    nowIsoUtc: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE chatgpt_subscription_connections
         SET status = 'needs_reconnect', updated_at = ?
         WHERE owner_discord_user_id = ? AND status = 'active'`,
      )
      .bind(nowIsoUtc, ownerDiscordUserId)
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
