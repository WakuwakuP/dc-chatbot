import { relations, sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ownerRoles = ["admin", "regular"] as const;
export const ownerStatuses = ["active", "disabled"] as const;
export const chatGptConnectionStatuses = ["active", "needsReconnect", "revoked"] as const;
export const registeredMemberStatuses = ["active", "disabled"] as const;

export type OwnerRole = (typeof ownerRoles)[number];
export type OwnerStatus = (typeof ownerStatuses)[number];
export type ChatGptConnectionStatus = (typeof chatGptConnectionStatuses)[number];
export type RegisteredMemberStatus = (typeof registeredMemberStatuses)[number];

export const discordUsers = sqliteTable("discord_users", {
  id: text("id").primaryKey(),
  username: text("username"),
  displayName: text("display_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const owners = sqliteTable(
  "owners",
  {
    discordUserId: text("discord_user_id")
      .primaryKey()
      .references(() => discordUsers.id, { onDelete: "restrict", onUpdate: "cascade" }),
    accessSubject: text("access_subject").notNull().unique(),
    accessEmail: text("access_email").notNull(),
    role: text("role", { enum: ownerRoles }).notNull(),
    status: text("status", { enum: ownerStatuses }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("owners_role_check", sql`${table.role} in ('admin', 'regular')`),
    check("owners_status_check", sql`${table.status} in ('active', 'disabled')`),
  ],
);

export const chatGptConnections = sqliteTable(
  "chatgpt_connections",
  {
    ownerDiscordUserId: text("owner_discord_user_id")
      .primaryKey()
      .references(() => owners.discordUserId, { onDelete: "restrict", onUpdate: "cascade" }),
    status: text("status", { enum: chatGptConnectionStatuses }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "chatgpt_connections_status_check",
      sql`${table.status} in ('active', 'needsReconnect', 'revoked')`,
    ),
  ],
);

export const registeredMembers = sqliteTable(
  "registered_members",
  {
    discordUserId: text("discord_user_id")
      .primaryKey()
      .references(() => discordUsers.id, { onDelete: "restrict", onUpdate: "cascade" }),
    assignedOwnerDiscordUserId: text("assigned_owner_discord_user_id")
      .notNull()
      .references(() => owners.discordUserId, { onDelete: "restrict", onUpdate: "cascade" }),
    status: text("status", { enum: registeredMemberStatuses }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_registered_members_assigned_owner").on(table.assignedOwnerDiscordUserId),
    check("registered_members_status_check", sql`${table.status} in ('active', 'disabled')`),
  ],
);

export const discordUsersRelations = relations(discordUsers, ({ one }) => ({
  owner: one(owners),
  registeredMember: one(registeredMembers),
}));

export const ownersRelations = relations(owners, ({ one, many }) => ({
  discordUser: one(discordUsers, {
    fields: [owners.discordUserId],
    references: [discordUsers.id],
  }),
  connection: one(chatGptConnections),
  assignedMembers: many(registeredMembers, { relationName: "assignedOwner" }),
}));

export const chatGptConnectionsRelations = relations(chatGptConnections, ({ one }) => ({
  owner: one(owners, {
    fields: [chatGptConnections.ownerDiscordUserId],
    references: [owners.discordUserId],
  }),
}));

export const registeredMembersRelations = relations(registeredMembers, ({ one }) => ({
  discordUser: one(discordUsers, {
    fields: [registeredMembers.discordUserId],
    references: [discordUsers.id],
  }),
  assignedOwner: one(owners, {
    fields: [registeredMembers.assignedOwnerDiscordUserId],
    references: [owners.discordUserId],
    relationName: "assignedOwner",
  }),
}));

export type DiscordUser = typeof discordUsers.$inferSelect;
export type NewDiscordUser = typeof discordUsers.$inferInsert;

export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;

export type ChatGptConnection = typeof chatGptConnections.$inferSelect;
export type NewChatGptConnection = typeof chatGptConnections.$inferInsert;

export type RegisteredMember = typeof registeredMembers.$inferSelect;
export type NewRegisteredMember = typeof registeredMembers.$inferInsert;
