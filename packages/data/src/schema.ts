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
  (table) => [index("candidate_expires_at_idx").on(table.expiresAt)],
);

export const chatgptSubscriptionConnections = sqliteTable(
  "chatgpt_subscription_connections",
  {
    connectionId: text("connection_id").primaryKey(),
    ownerDiscordUserId: text("owner_discord_user_id").notNull(),
    status: text("status", {
      enum: ["active", "needs_reconnect", "revoked"],
    }).notNull(),
    encryptedCredentialCiphertext: text(
      "encrypted_credential_ciphertext",
    ).notNull(),
    credentialVersion: integer("credential_version").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("connections_owner_idx").on(table.ownerDiscordUserId)],
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
  ],
);

export const providerCallAuditMetadata = sqliteTable(
  "provider_call_audit_metadata",
  {
    providerCallId: text("provider_call_id").primaryKey(),
    requestId: text("request_id").notNull(),
    connectionId: text("connection_id").notNull(),
    model: text("model").notNull(),
    status: text("status", {
      enum: ["started", "completed", "failed"],
    }).notNull(),
    safeErrorCategory: text("safe_error_category"),
    durationMs: integer("duration_ms"),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [index("provider_call_retain_until_idx").on(table.retainUntil)],
);

export const selectedContextMessageIds = sqliteTable(
  "selected_context_message_ids",
  {
    selectedContextId: text("selected_context_id").primaryKey(),
    requestId: text("request_id").notNull(),
    discordMessageId: text("discord_message_id").notNull(),
    createdAt: text("created_at").notNull(),
    retainUntil: text("retain_until").notNull(),
  },
  (table) => [index("selected_context_retain_until_idx").on(table.retainUntil)],
);
