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

export const OwnerRoleSchema = v.picklist(["admin_owner", "regular_owner"]);
export type OwnerRole = v.InferOutput<typeof OwnerRoleSchema>;

export const HealthResponseSchema = v.object({
  status: v.literal("ok"),
  service: v.literal("dc-chatbot-api"),
});
export type HealthResponse = v.InferOutput<typeof HealthResponseSchema>;

export const OwnerMeResponseSchema = v.object({
  ownerDiscordUserId: DiscordSnowflakeSchema,
  role: OwnerRoleSchema,
  connectionStatus: v.picklist(["connected", "needs_reconnect", "missing"]),
});
export type OwnerMeResponse = v.InferOutput<typeof OwnerMeResponseSchema>;

export const TriggerKindSchema = v.picklist([
  "dm",
  "guild_mention",
  "automated_trigger_source",
]);
export type TriggerKind = v.InferOutput<typeof TriggerKindSchema>;

export const BotMessageIntakeRequestSchema = v.object({
  requestId: UlidSchema,
  messageId: DiscordSnowflakeSchema,
  channelId: DiscordSnowflakeSchema,
  guildId: v.optional(DiscordSnowflakeSchema),
  authorDiscordUserId: DiscordSnowflakeSchema,
  triggerKind: TriggerKindSchema,
  isAllowedUser: v.boolean(),
  isAutomatedSource: v.boolean(),
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

export const BotMessageIntakeResponseSchema = v.object({
  requestId: UlidSchema,
  action: IntakeActionSchema,
  reason: v.picklist([
    "allowed_dm",
    "allowed_guild_mention",
    "allowed_automated_source",
    "non_allowed_user",
    "automated_source_ignored",
  ]),
  contextMessageLimit: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(50)),
  ),
});
export type BotMessageIntakeResponse = v.InferOutput<
  typeof BotMessageIntakeResponseSchema
>;

export const BotRespondRequestSchema = v.object({
  requestId: UlidSchema,
  triggerMessageId: DiscordSnowflakeSchema,
  triggerAuthorDiscordUserId: DiscordSnowflakeSchema,
  triggerKind: TriggerKindSchema,
  effectiveConnectionId: UlidSchema,
  model: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  conversationContextMessageIds: v.array(DiscordSnowflakeSchema),
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
