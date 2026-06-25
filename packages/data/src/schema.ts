import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const discordUsers = sqliteTable("discord_users", {
  discordUserId: text("discord_user_id").primaryKey(),
  displayNameSnapshot: text("display_name_snapshot"),
  firstObservedAt: text("first_observed_at").notNull(),
  lastObservedAt: text("last_observed_at").notNull(),
});

export const ownerDiscordUsers = sqliteTable(
  "owner_discord_users",
  {
    ownerDiscordUserId: text("owner_discord_user_id").primaryKey(),
    role: text("role", { enum: ["admin_owner", "regular_owner"] }).notNull(),
    cloudflareAccessSubject: text("cloudflare_access_subject").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("owner_access_subject_uidx").on(table.cloudflareAccessSubject),
  ],
);

export const registeredMembers = sqliteTable(
  "registered_members",
  {
    memberDiscordUserId: text("member_discord_user_id").primaryKey(),
    assignedOwnerDiscordUserId: text(
      "assigned_owner_discord_user_id",
    ).notNull(),
    status: text("status", { enum: ["active", "disabled"] }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("registered_members_owner_idx").on(table.assignedOwnerDiscordUserId),
    index("registered_members_status_owner_idx").on(
      table.status,
      table.assignedOwnerDiscordUserId,
    ),
  ],
);

export const candidateDiscordUsers = sqliteTable(
  "candidate_discord_users",
  {
    candidateDiscordUserId: text("candidate_discord_user_id").primaryKey(),
    observedInGuildId: text("observed_in_guild_id"),
    observedInChannelId: text("observed_in_channel_id"),
    firstObservedAt: text("first_observed_at").notNull(),
    lastObservedAt: text("last_observed_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("candidate_expires_at_idx").on(table.expiresAt),
    index("candidate_last_seen_idx").on(table.lastObservedAt),
  ],
);

export const requestAuditMetadata = sqliteTable(
  "request_audit_metadata",
  {
    requestAuditId: text("request_audit_id").primaryKey(),
    requestId: text("request_id").notNull(),
    actorType: text("actor_type", {
      enum: ["owner", "bot_service", "scheduled"],
    }).notNull(),
    eventType: text("event_type").notNull(),
    status: text("status", {
      enum: ["accepted", "rejected", "failed", "completed"],
    }).notNull(),
    errorCategory: text("error_category"),
    durationMs: integer("duration_ms"),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("request_audit_request_id_idx").on(table.requestId),
    index("request_audit_retain_until_idx").on(table.retainUntil),
    index("request_audit_created_at_idx").on(table.createdAt),
  ],
);

export const providerCallAuditMetadata = sqliteTable(
  "provider_call_audit_metadata",
  {
    providerCallId: text("provider_call_id").primaryKey(),
    requestId: text("request_id").notNull(),
    providerKind: text("provider_kind", {
      enum: ["fake", "nvidia_nim"],
    }).notNull(),
    providerRef: text("provider_ref").notNull(),
    model: text("model").notNull(),
    status: text("status", {
      enum: ["started", "completed", "failed"],
    }).notNull(),
    safeErrorCategory: text("safe_error_category"),
    durationMs: integer("duration_ms"),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("provider_call_retain_until_idx").on(table.retainUntil),
    index("provider_call_request_idx").on(table.requestId),
    index("provider_call_kind_created_idx").on(
      table.providerKind,
      table.createdAt,
    ),
  ],
);

export const providerSettings = sqliteTable(
  "provider_settings",
  {
    settingsId: text("settings_id").primaryKey(),
    providerKind: text("provider_kind", {
      enum: ["fake", "nvidia_nim"],
    }).notNull(),
    configuredProviderAccessStatus: text("configured_provider_access_status", {
      enum: ["available", "not_configured", "unavailable"],
    }).notNull(),
    configuredProviderAccessCheckedAt: text(
      "configured_provider_access_checked_at",
    ),
    safeErrorCategory: text("safe_error_category", {
      enum: [
        "not_configured",
        "authentication_failed",
        "rate_limited",
        "temporary_unavailable",
        "policy_rejected",
        "invalid_response",
        "unknown",
      ],
    }),
    modelSettingsId: text("model_settings_id").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("provider_settings_kind_status_idx").on(
      table.providerKind,
      table.configuredProviderAccessStatus,
    ),
  ],
);

export const selectedContextMessageIds = sqliteTable(
  "selected_context_message_ids",
  {
    selectedContextId: text("selected_context_id").primaryKey(),
    requestId: text("request_id").notNull(),
    discordMessageId: text("discord_message_id").notNull(),
    contextSource: text("context_source", {
      enum: [
        "selector",
        "forced_trigger",
        "rule_fallback",
        "reply_chain",
        "thread_starter",
        "thread_recent",
        "dm_recent",
        "automated_trigger",
      ],
    }),
    authorRelation: text("author_relation", {
      enum: [
        "trigger_user",
        "bot_self",
        "other_allowed",
        "non_allowed",
        "automated_source",
      ],
    }),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("selected_context_retain_until_idx").on(table.retainUntil),
    index("selected_context_request_idx").on(table.requestId),
  ],
);

export const ownerNotifications = sqliteTable(
  "owner_notifications",
  {
    ownerNotificationId: text("owner_notification_id").primaryKey(),
    notificationOwnerDiscordUserId: text(
      "notification_owner_discord_user_id",
    ).notNull(),
    candidateDiscordUserId: text("candidate_discord_user_id"),
    requestId: text("request_id"),
    triggerKind: text("trigger_kind", {
      enum: ["dm", "guild_mention", "automated_trigger_source"],
    }),
    status: text("status", {
      enum: [
        "pending_delivery",
        "delivery_requested",
        "delivered",
        "failed",
        "suppressed",
      ],
    }).notNull(),
    safeErrorCategory: text("safe_error_category"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("owner_notifications_owner_status_idx").on(
      table.notificationOwnerDiscordUserId,
      table.status,
    ),
    index("owner_notifications_retain_until_idx").on(table.retainUntil),
  ],
);

export const botSettings = sqliteTable("bot_settings", {
  settingsId: text("settings_id").primaryKey(),
  notificationOwnerDiscordUserId: text("notification_owner_discord_user_id"),
  automatedTriggerDefaultCooldownSeconds: integer(
    "automated_trigger_default_cooldown_seconds",
  ).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const modelSettings = sqliteTable("model_settings", {
  settingsId: text("settings_id").primaryKey(),
  contextSelectionModel: text("context_selection_model").notNull(),
  responseDecisionModel: text("response_decision_model").notNull(),
  responseGenerationModel: text("response_generation_model").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const promptSettings = sqliteTable(
  "prompt_settings",
  {
    promptSettingId: text("prompt_setting_id").primaryKey(),
    promptKey: text("prompt_key").notNull(),
    activeVersionId: text("active_version_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("prompt_settings_key_uidx").on(table.promptKey)],
);

export const promptSettingVersions = sqliteTable(
  "prompt_setting_versions",
  {
    promptSettingVersionId: text("prompt_setting_version_id").primaryKey(),
    promptSettingId: text("prompt_setting_id").notNull(),
    label: text("label"),
    promptBodySha256: text("prompt_body_sha256").notNull(),
    promptBodyLength: integer("prompt_body_length").notNull(),
    createdByOwnerDiscordUserId: text(
      "created_by_owner_discord_user_id",
    ).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("prompt_versions_setting_created_idx").on(
      table.promptSettingId,
      table.createdAt,
    ),
  ],
);

export const settingAuditMetadata = sqliteTable(
  "setting_audit_metadata",
  {
    settingAuditId: text("setting_audit_id").primaryKey(),
    actorOwnerDiscordUserId: text("actor_owner_discord_user_id").notNull(),
    settingCategory: text("setting_category").notNull(),
    eventType: text("event_type").notNull(),
    beforeRef: text("before_ref"),
    afterRef: text("after_ref"),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("setting_audit_retain_until_idx").on(table.retainUntil),
    index("setting_audit_created_at_idx").on(table.createdAt),
  ],
);

export const automatedTriggerSources = sqliteTable(
  "automated_trigger_sources",
  {
    automatedTriggerSourceId: text("automated_trigger_source_id").primaryKey(),
    sourceDiscordUserId: text("source_discord_user_id"),
    sourceApplicationId: text("source_application_id"),
    assignedOwnerDiscordUserId: text(
      "assigned_owner_discord_user_id",
    ).notNull(),
    status: text("status", { enum: ["active", "disabled"] }).notNull(),
    replyMode: text("reply_mode", {
      enum: ["reply", "channel_message", "none"],
    }).notNull(),
    cooldownSeconds: integer("cooldown_seconds").notNull(),
    lastTriggeredAt: text("last_triggered_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("automated_sources_owner_status_idx").on(
      table.assignedOwnerDiscordUserId,
      table.status,
    ),
    index("automated_sources_discord_user_idx").on(table.sourceDiscordUserId),
    index("automated_sources_application_idx").on(table.sourceApplicationId),
  ],
);

export const discordResponseMessages = sqliteTable(
  "discord_response_messages",
  {
    responseMessageId: text("response_message_id").primaryKey(),
    requestId: text("request_id").notNull(),
    discordMessageId: text("discord_message_id").notNull(),
    guildId: text("guild_id"),
    channelId: text("channel_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    chunkCount: integer("chunk_count").notNull(),
    status: text("status", { enum: ["posted", "failed"] }).notNull(),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("discord_response_request_idx").on(table.requestId),
    index("discord_response_retain_until_idx").on(table.retainUntil),
  ],
);

export const cleanupRunMetadata = sqliteTable(
  "cleanup_run_metadata",
  {
    cleanupRunId: text("cleanup_run_id").primaryKey(),
    status: text("status", {
      enum: ["started", "completed", "failed"],
    }).notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    deletedRowCount: integer("deleted_row_count").notNull(),
    safeErrorCategory: text("safe_error_category"),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [
    index("cleanup_run_retain_until_idx").on(table.retainUntil),
    index("cleanup_run_started_at_idx").on(table.startedAt),
  ],
);
