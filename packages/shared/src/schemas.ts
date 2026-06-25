import * as v from "valibot";

export const IsoDateTimeSchema = v.pipe(v.string(), v.isoTimestamp());
export const DiscordSnowflakeSchema = v.pipe(
  v.string(),
  v.regex(/^\d{1,32}$/u),
);
export const UlidSchema = v.pipe(
  v.string(),
  v.regex(/^[0-9A-HJKMNP-TV-Z]{26}$/u),
);
export const NonEmptySafeStringSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(160),
);

export const OwnerRoleSchema = v.picklist(["admin_owner", "regular_owner"]);
export type OwnerRole = v.InferOutput<typeof OwnerRoleSchema>;

export const TriggerKindSchema = v.picklist([
  "dm",
  "guild_mention",
  "automated_trigger_source",
]);
export type TriggerKind = v.InferOutput<typeof TriggerKindSchema>;

export const RegisteredMemberStatusSchema = v.picklist(["active", "disabled"]);
export type RegisteredMemberStatus = v.InferOutput<
  typeof RegisteredMemberStatusSchema
>;

export const OwnerMeResponseSchema = v.object({
  ownerDiscordUserId: DiscordSnowflakeSchema,
  role: OwnerRoleSchema,
});
export type OwnerMeResponse = v.InferOutput<typeof OwnerMeResponseSchema>;

export const HealthResponseSchema = v.object({
  status: v.literal("ok"),
  service: v.literal("dc-chatbot-api"),
});
export type HealthResponse = v.InferOutput<typeof HealthResponseSchema>;

export const ProblemDetailsSchema = v.object({
  type: v.string(),
  title: v.string(),
  status: v.pipe(v.number(), v.integer(), v.minValue(400), v.maxValue(599)),
  code: v.string(),
  requestId: v.optional(UlidSchema),
});
export type ProblemDetails = v.InferOutput<typeof ProblemDetailsSchema>;

export const OwnerDashboardSummaryResponseSchema = v.object({
  owner: OwnerMeResponseSchema,
  registeredMemberCounts: v.object({
    active: v.pipe(v.number(), v.integer(), v.minValue(0)),
    disabled: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
  candidateDiscordUserCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  pendingOwnerNotificationCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  automatedTriggerSourceCounts: v.object({
    active: v.pipe(v.number(), v.integer(), v.minValue(0)),
    disabled: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
});
export type OwnerDashboardSummaryResponse = v.InferOutput<
  typeof OwnerDashboardSummaryResponseSchema
>;

export const RegisteredMemberItemSchema = v.object({
  memberDiscordUserId: DiscordSnowflakeSchema,
  displayNameSnapshot: v.optional(v.union([v.string(), v.null()])),
  assignedOwnerDiscordUserId: DiscordSnowflakeSchema,
  status: RegisteredMemberStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type RegisteredMemberItem = v.InferOutput<
  typeof RegisteredMemberItemSchema
>;

export const RegisteredMemberListResponseSchema = v.object({
  members: v.array(RegisteredMemberItemSchema),
});
export type RegisteredMemberListResponse = v.InferOutput<
  typeof RegisteredMemberListResponseSchema
>;

export const CreateRegisteredMemberRequestSchema = v.object({
  memberDiscordUserId: DiscordSnowflakeSchema,
  displayNameSnapshot: v.optional(v.pipe(v.string(), v.maxLength(120))),
  assignedOwnerDiscordUserId: v.optional(DiscordSnowflakeSchema),
});
export type CreateRegisteredMemberRequest = v.InferOutput<
  typeof CreateRegisteredMemberRequestSchema
>;

export const DisableRegisteredMemberResponseSchema = v.object({
  memberDiscordUserId: DiscordSnowflakeSchema,
  status: v.literal("disabled"),
});
export type DisableRegisteredMemberResponse = v.InferOutput<
  typeof DisableRegisteredMemberResponseSchema
>;

export const CandidateDiscordUserItemSchema = v.object({
  candidateDiscordUserId: DiscordSnowflakeSchema,
  displayNameSnapshot: v.optional(v.union([v.string(), v.null()])),
  observedInGuildId: v.optional(v.union([DiscordSnowflakeSchema, v.null()])),
  observedInChannelId: v.optional(v.union([DiscordSnowflakeSchema, v.null()])),
  firstObservedAt: IsoDateTimeSchema,
  lastObservedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});
export type CandidateDiscordUserItem = v.InferOutput<
  typeof CandidateDiscordUserItemSchema
>;

export const CandidateDiscordUserListResponseSchema = v.object({
  candidates: v.array(CandidateDiscordUserItemSchema),
});
export type CandidateDiscordUserListResponse = v.InferOutput<
  typeof CandidateDiscordUserListResponseSchema
>;

export const PromoteCandidateDiscordUserRequestSchema = v.object({
  assignedOwnerDiscordUserId: v.optional(DiscordSnowflakeSchema),
});
export type PromoteCandidateDiscordUserRequest = v.InferOutput<
  typeof PromoteCandidateDiscordUserRequestSchema
>;

export const ModelSettingsSchema = v.object({
  contextSelectionModel: NonEmptySafeStringSchema,
  responseDecisionModel: NonEmptySafeStringSchema,
  responseGenerationModel: NonEmptySafeStringSchema,
});
export type ModelSettings = v.InferOutput<typeof ModelSettingsSchema>;

export const UpdateModelSettingsRequestSchema = ModelSettingsSchema;
export type UpdateModelSettingsRequest = v.InferOutput<
  typeof UpdateModelSettingsRequestSchema
>;

export const PromptSettingsMetadataSchema = v.object({
  promptSettingId: UlidSchema,
  promptKey: NonEmptySafeStringSchema,
  activeVersionId: v.optional(v.union([UlidSchema, v.null()])),
  activePromptBodySha256: v.optional(v.union([v.string(), v.null()])),
  activePromptBodyLength: v.optional(
    v.union([v.pipe(v.number(), v.integer(), v.minValue(0)), v.null()]),
  ),
  updatedAt: IsoDateTimeSchema,
});
export type PromptSettingsMetadata = v.InferOutput<
  typeof PromptSettingsMetadataSchema
>;

export const UpdatePromptSettingsMetadataRequestSchema = v.object({
  promptKey: NonEmptySafeStringSchema,
  promptBodySha256: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)),
  promptBodyLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  label: v.optional(v.pipe(v.string(), v.maxLength(120))),
});
export type UpdatePromptSettingsMetadataRequest = v.InferOutput<
  typeof UpdatePromptSettingsMetadataRequestSchema
>;

export const OwnerSettingsResponseSchema = v.object({
  botSettings: v.object({
    notificationOwnerDiscordUserId: v.optional(
      v.union([DiscordSnowflakeSchema, v.null()]),
    ),
    automatedTriggerDefaultCooldownSeconds: v.pipe(
      v.number(),
      v.integer(),
      v.minValue(10),
      v.maxValue(3600),
    ),
    updatedAt: IsoDateTimeSchema,
  }),
  modelSettings: ModelSettingsSchema,
  promptSettings: v.array(PromptSettingsMetadataSchema),
});
export type OwnerSettingsResponse = v.InferOutput<
  typeof OwnerSettingsResponseSchema
>;

export const UpdateBotSettingsRequestSchema = v.object({
  notificationOwnerDiscordUserId: v.optional(
    v.union([DiscordSnowflakeSchema, v.null()]),
  ),
  automatedTriggerDefaultCooldownSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(3600)),
  ),
});
export type UpdateBotSettingsRequest = v.InferOutput<
  typeof UpdateBotSettingsRequestSchema
>;

export const AutomatedTriggerReplyModeSchema = v.picklist([
  "reply",
  "channel_message",
  "none",
]);
export type AutomatedTriggerReplyMode = v.InferOutput<
  typeof AutomatedTriggerReplyModeSchema
>;

export const AutomatedTriggerSourceStatusSchema = v.picklist([
  "active",
  "disabled",
]);
export type AutomatedTriggerSourceStatus = v.InferOutput<
  typeof AutomatedTriggerSourceStatusSchema
>;

export const AutomatedTriggerSourceItemSchema = v.object({
  automatedTriggerSourceId: UlidSchema,
  sourceDiscordUserId: v.optional(v.union([DiscordSnowflakeSchema, v.null()])),
  sourceApplicationId: v.optional(v.union([DiscordSnowflakeSchema, v.null()])),
  assignedOwnerDiscordUserId: DiscordSnowflakeSchema,
  status: AutomatedTriggerSourceStatusSchema,
  replyMode: AutomatedTriggerReplyModeSchema,
  cooldownSeconds: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(10),
    v.maxValue(3600),
  ),
  lastTriggeredAt: v.optional(v.union([IsoDateTimeSchema, v.null()])),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type AutomatedTriggerSourceItem = v.InferOutput<
  typeof AutomatedTriggerSourceItemSchema
>;

export const AutomatedTriggerSourceListResponseSchema = v.object({
  automatedTriggerSources: v.array(AutomatedTriggerSourceItemSchema),
});
export type AutomatedTriggerSourceListResponse = v.InferOutput<
  typeof AutomatedTriggerSourceListResponseSchema
>;

export const CreateAutomatedTriggerSourceRequestSchema = v.object({
  sourceDiscordUserId: v.optional(DiscordSnowflakeSchema),
  sourceApplicationId: v.optional(DiscordSnowflakeSchema),
  assignedOwnerDiscordUserId: DiscordSnowflakeSchema,
  replyMode: v.optional(AutomatedTriggerReplyModeSchema),
  cooldownSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(3600)),
  ),
});
export type CreateAutomatedTriggerSourceRequest = v.InferOutput<
  typeof CreateAutomatedTriggerSourceRequestSchema
>;

export const UpdateAutomatedTriggerSourceRequestSchema = v.object({
  assignedOwnerDiscordUserId: v.optional(DiscordSnowflakeSchema),
  status: v.optional(AutomatedTriggerSourceStatusSchema),
  replyMode: v.optional(AutomatedTriggerReplyModeSchema),
  cooldownSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(3600)),
  ),
});
export type UpdateAutomatedTriggerSourceRequest = v.InferOutput<
  typeof UpdateAutomatedTriggerSourceRequestSchema
>;

export const OwnerNotificationStatusSchema = v.picklist([
  "pending_delivery",
  "delivery_requested",
  "delivered",
  "failed",
  "suppressed",
]);
export type OwnerNotificationStatus = v.InferOutput<
  typeof OwnerNotificationStatusSchema
>;

export const OwnerNotificationItemSchema = v.object({
  ownerNotificationId: UlidSchema,
  notificationOwnerDiscordUserId: DiscordSnowflakeSchema,
  candidateDiscordUserId: v.optional(
    v.union([DiscordSnowflakeSchema, v.null()]),
  ),
  requestId: v.optional(v.union([UlidSchema, v.null()])),
  triggerKind: v.optional(v.union([TriggerKindSchema, v.null()])),
  status: OwnerNotificationStatusSchema,
  safeErrorCategory: v.optional(v.union([v.string(), v.null()])),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type OwnerNotificationItem = v.InferOutput<
  typeof OwnerNotificationItemSchema
>;

export const OwnerNotificationListResponseSchema = v.object({
  ownerNotifications: v.array(OwnerNotificationItemSchema),
});
export type OwnerNotificationListResponse = v.InferOutput<
  typeof OwnerNotificationListResponseSchema
>;

export const BotOwnerNotificationDeliveryUpdateRequestSchema = v.object({
  ownerNotificationId: UlidSchema,
  status: v.picklist(["delivery_requested", "delivered", "failed"]),
  safeErrorCategory: v.optional(v.pipe(v.string(), v.maxLength(80))),
  deliveredAt: v.optional(IsoDateTimeSchema),
});
export type BotOwnerNotificationDeliveryUpdateRequest = v.InferOutput<
  typeof BotOwnerNotificationDeliveryUpdateRequestSchema
>;

export const DiscordResponseMessageMetadataRequestSchema = v.object({
  requestId: UlidSchema,
  discordMessageId: DiscordSnowflakeSchema,
  guildId: v.optional(v.union([DiscordSnowflakeSchema, v.null()])),
  channelId: DiscordSnowflakeSchema,
  chunkIndex: v.pipe(v.number(), v.integer(), v.minValue(0)),
  chunkCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  status: v.picklist(["posted", "failed"]),
  createdAt: IsoDateTimeSchema,
});
export type DiscordResponseMessageMetadataRequest = v.InferOutput<
  typeof DiscordResponseMessageMetadataRequestSchema
>;

export const CleanupRunMetadataSchema = v.object({
  cleanupRunId: UlidSchema,
  status: v.picklist(["started", "completed", "failed"]),
  startedAt: IsoDateTimeSchema,
  finishedAt: v.optional(v.union([IsoDateTimeSchema, v.null()])),
  deletedRowCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  safeErrorCategory: v.optional(v.union([v.string(), v.null()])),
});
export type CleanupRunMetadata = v.InferOutput<typeof CleanupRunMetadataSchema>;

export const MessageContentSchema = v.pipe(v.string(), v.maxLength(2000));
export type MessageContent = v.InferOutput<typeof MessageContentSchema>;

export const BotMessageIntakeRequestSchema = v.object({
  requestId: UlidSchema,
  messageId: DiscordSnowflakeSchema,
  channelId: DiscordSnowflakeSchema,
  guildId: v.optional(DiscordSnowflakeSchema),
  authorDiscordUserId: DiscordSnowflakeSchema,
  authorApplicationId: v.optional(DiscordSnowflakeSchema),
  authorDisplayNameSnapshot: v.optional(v.pipe(v.string(), v.maxLength(120))),
  triggerKind: TriggerKindSchema,
  // Legacy hint kept for local skeleton tests; API must not trust it when D1 is available.
  isAllowedUser: v.boolean(),
  isAutomatedSource: v.boolean(),
  authorIsBot: v.optional(v.boolean()),
  authorIsWebhook: v.optional(v.boolean()),
  messageContent: v.optional(MessageContentSchema),
  attachmentCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  observedAt: IsoDateTimeSchema,
});
export type BotMessageIntakeRequest = v.InferOutput<
  typeof BotMessageIntakeRequestSchema
>;

export const IntakeActionSchema = v.picklist([
  "ignore",
  "record_candidate",
  "fetch_context",
  "respond_without_context",
]);
export type IntakeAction = v.InferOutput<typeof IntakeActionSchema>;

export const ContextFetchPlanKindSchema = v.picklist([
  "none",
  "dm_recent",
  "thread_recent",
  "reply_chain",
  "guild_recent",
  "automated_trigger_only",
]);
export type ContextFetchPlanKind = v.InferOutput<
  typeof ContextFetchPlanKindSchema
>;

export const ContextFetchPlanSchema = v.object({
  kind: ContextFetchPlanKindSchema,
  limit: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(50)),
  includeTriggerMessage: v.boolean(),
});
export type ContextFetchPlan = v.InferOutput<typeof ContextFetchPlanSchema>;

export const BotMessageIntakeResponseSchema = v.object({
  requestId: UlidSchema,
  action: IntakeActionSchema,
  reason: v.picklist([
    "allowed_dm",
    "allowed_guild_mention",
    "allowed_automated_source",
    "non_allowed_user",
    "automated_source_ignored",
    "automated_source_cooldown",
  ]),
  contextMessageLimit: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(50)),
  ),
  contextFetchPlan: v.optional(ContextFetchPlanSchema),
});
export type BotMessageIntakeResponse = v.InferOutput<
  typeof BotMessageIntakeResponseSchema
>;

export const ContextAuthorRelationSchema = v.picklist([
  "trigger_user",
  "bot_self",
  "other_allowed",
  "non_allowed",
  "automated_source",
]);
export type ContextAuthorRelation = v.InferOutput<
  typeof ContextAuthorRelationSchema
>;

export const ConversationContextMessageInputSchema = v.object({
  messageId: DiscordSnowflakeSchema,
  authorRelation: ContextAuthorRelationSchema,
  content: MessageContentSchema,
});
export type ConversationContextMessageInput = v.InferOutput<
  typeof ConversationContextMessageInputSchema
>;

export const BotRespondRequestSchema = v.object({
  requestId: UlidSchema,
  triggerMessageId: DiscordSnowflakeSchema,
  triggerAuthorDiscordUserId: DiscordSnowflakeSchema,
  triggerAuthorApplicationId: v.optional(DiscordSnowflakeSchema),
  triggerKind: TriggerKindSchema,
  model: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  conversationContextMessageIds: v.array(DiscordSnowflakeSchema),
  conversationContextMessages: v.optional(
    v.array(ConversationContextMessageInputSchema),
  ),
});
export type BotRespondRequest = v.InferOutput<typeof BotRespondRequestSchema>;

export const BotRespondResponseSchema = v.object({
  requestId: UlidSchema,
  replyChunks: v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(2000))),
  providerCallId: UlidSchema,
});
export type BotRespondResponse = v.InferOutput<typeof BotRespondResponseSchema>;

export function parseJson<
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(schema: TSchema, value: unknown): v.InferOutput<TSchema> {
  return v.parse(schema, value);
}
