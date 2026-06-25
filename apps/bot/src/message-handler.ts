import {
  createUlid,
  type BotMessageIntakeRequest,
  type BotMessageIntakeResponse,
  type BotRespondRequest,
  type ContextFetchPlan,
  type ConversationContextMessageInput,
  type TriggerKind,
} from "@dc-chatbot/shared";
import type { Client, Message } from "discord.js";
import type { BotApiClient } from "./api-client";
import type { BotConfig } from "./config";
import { splitDiscordReply } from "./reply-split";

export type BotEventLogger = {
  info(message: string, metadata: Record<string, unknown>): void;
};

export const BOT_API_UNAVAILABLE_MESSAGE =
  "現在 Bot API に接続できません。時間をおいてもう一度お試しください。";
export const CONTEXT_FETCH_FAILED_MESSAGE =
  "会話の文脈を取得できませんでした。もう一度メッセージを送ってください。";
export const RESPONSE_GENERATION_FAILED_MESSAGE =
  "現在回答を生成できません。時間をおいてもう一度お試しください。";

const TYPING_REFRESH_INTERVAL_MS = 8_000;
const MAX_CONTEXT_MESSAGE_CONTENT_LENGTH = 2_000;

type MessageCollectionLike = {
  values(): IterableIterator<Message>;
};

type MessageManagerLike = {
  fetch(
    options:
      | string
      | {
          limit?: number;
          before?: string;
          around?: string;
        },
  ): Promise<Message | MessageCollectionLike>;
};

type ChannelWithMessages = {
  messages: MessageManagerLike;
};

type SendableChannel = {
  send(content: string): Promise<unknown>;
};

type TypingChannel = {
  sendTyping(): Promise<void>;
};

type ThreadLikeChannel = ChannelWithMessages & {
  isThread(): boolean;
  fetchStarterMessage(): Promise<Message | null>;
};

function isDirectMessage(message: Message): boolean {
  return !message.inGuild();
}

function isGuildMention(message: Message, client: Client): boolean {
  const botUserId = client.user?.id;
  return botUserId ? message.mentions.users.has(botUserId) : false;
}

function isAutomatedMessage(message: Message): boolean {
  return message.author.bot || message.webhookId !== null;
}

function logDiscordMessageReceived(
  message: Message,
  client: Client,
  logger: BotEventLogger,
): void {
  logger.info("dc-chatbot Discord message received", {
    eventType: "discord_message_received",
    messageId: message.id,
    channelId: message.channelId,
    guildId: message.guildId ?? null,
    authorDiscordUserId: message.author.id,
    authorIsBot: message.author.bot,
    authorIsWebhook: message.webhookId !== null,
    isDirectMessage: isDirectMessage(message),
    mentionsBot: isGuildMention(message, client),
    isSelf: message.author.id === client.user?.id,
    attachmentCount: message.attachments.size,
    contentLength: message.content.length,
    createdAt: new Date(message.createdTimestamp).toISOString(),
  });
}

function getTriggerKind(message: Message, client: Client): TriggerKind | null {
  const isTrigger = isDirectMessage(message) || isGuildMention(message, client);
  if (!isTrigger) {
    return null;
  }

  if (isAutomatedMessage(message)) {
    return "automated_trigger_source";
  }

  if (isDirectMessage(message)) {
    return "dm";
  }

  return "guild_mention";
}

function displayNameSnapshot(message: Message): string {
  return (
    message.member?.displayName ??
    message.author.globalName ??
    message.author.username
  );
}

function buildIntakeRequest(
  message: Message,
  client: Client,
  triggerKind: TriggerKind,
): BotMessageIntakeRequest {
  const request: BotMessageIntakeRequest = {
    requestId: createUlid(),
    messageId: message.id,
    channelId: message.channelId,
    authorDiscordUserId: message.author.id,
    authorDisplayNameSnapshot: displayNameSnapshot(message),
    triggerKind,
    // API must not trust this hint when D1 is available. It is kept for no-DB dev fallback.
    isAllowedUser: false,
    isAutomatedSource: isAutomatedMessage(message),
    authorIsBot: message.author.bot,
    authorIsWebhook: message.webhookId !== null,
    messageContent: message.content,
    attachmentCount: message.attachments.size,
    observedAt: new Date(message.createdTimestamp).toISOString(),
  };

  if (message.guildId) {
    return { ...request, guildId: message.guildId };
  }

  return request;
}

function shouldProceedToRespond(intake: BotMessageIntakeResponse): boolean {
  return (
    intake.action === "fetch_context" ||
    intake.action === "respond_without_context"
  );
}

function authorRelationFor(
  message: Message,
  triggerAuthorDiscordUserId: string,
  botUserId: string | null,
): ConversationContextMessageInput["authorRelation"] {
  if (message.author.id === triggerAuthorDiscordUserId) {
    return "trigger_user";
  }
  if (botUserId && message.author.id === botUserId) {
    return "bot_self";
  }
  if (isAutomatedMessage(message)) {
    return "automated_source";
  }
  return "non_allowed";
}

async function fetchContextMessages(
  triggerMessage: Message,
  client: Client,
  plan: ContextFetchPlan | undefined,
): Promise<ConversationContextMessageInput[]> {
  if (!plan || plan.kind === "none" || plan.limit === 0) {
    return [];
  }

  switch (plan.kind) {
    case "automated_trigger_only":
      return [
        toContextMessage(
          triggerMessage,
          triggerMessage.author.id,
          client.user?.id ?? null,
        ),
      ];
    case "dm_recent":
    case "guild_recent":
      return toContextMessages(
        await fetchRecentMessages(triggerMessage, plan),
        triggerMessage,
        client,
      );
    case "thread_recent":
      return toContextMessages(
        await fetchThreadMessages(triggerMessage, plan),
        triggerMessage,
        client,
      );
    case "reply_chain":
      return toContextMessages(
        await fetchReplyChainMessages(triggerMessage, client, plan),
        triggerMessage,
        client,
      );
  }
}

async function fetchRecentMessages(
  triggerMessage: Message,
  plan: ContextFetchPlan,
): Promise<Message[]> {
  const messages = await fetchMessagesBefore(
    triggerMessage.channel,
    triggerMessage.id,
    contextFetchLimitBeforeTrigger(plan),
  );

  if (plan.includeTriggerMessage) {
    messages.push(triggerMessage);
  }

  return sortAndDedupeMessages(messages);
}

async function fetchThreadMessages(
  triggerMessage: Message,
  plan: ContextFetchPlan,
): Promise<Message[]> {
  if (!isThreadLikeChannel(triggerMessage.channel)) {
    return fetchRecentMessages(triggerMessage, plan);
  }

  const messages: Message[] = [];
  const starterMessage = await triggerMessage.channel.fetchStarterMessage();
  if (starterMessage && starterMessage.id !== triggerMessage.id) {
    messages.push(starterMessage);
  }

  const remainingLimit = Math.max(
    0,
    plan.limit - messages.length - (plan.includeTriggerMessage ? 1 : 0),
  );
  messages.push(
    ...(await fetchMessagesBefore(
      triggerMessage.channel,
      triggerMessage.id,
      remainingLimit,
    )),
  );

  if (plan.includeTriggerMessage) {
    messages.push(triggerMessage);
  }

  return sortAndDedupeMessages(messages).slice(-plan.limit);
}

async function fetchReplyChainMessages(
  triggerMessage: Message,
  client: Client,
  plan: ContextFetchPlan,
): Promise<Message[]> {
  const ancestors: Message[] = [];
  let currentMessage: Message | null = triggerMessage;
  const ancestorLimit = Math.max(
    0,
    plan.limit - (plan.includeTriggerMessage ? 1 : 0),
  );

  while (currentMessage && ancestors.length < ancestorLimit) {
    const referencedMessage = await fetchReferencedMessage(
      currentMessage,
      client,
    );
    if (!referencedMessage) {
      break;
    }
    ancestors.push(referencedMessage);
    currentMessage = referencedMessage;
  }

  const messages = ancestors.reverse();
  if (plan.includeTriggerMessage) {
    messages.push(triggerMessage);
  }

  return sortAndDedupeMessages(messages).slice(-plan.limit);
}

async function fetchReferencedMessage(
  message: Message,
  client: Client,
): Promise<Message | null> {
  const reference = message.reference;
  if (!reference?.messageId) {
    return null;
  }

  const referencedChannel = await resolveMessageChannel(
    message,
    client,
    reference.channelId ?? message.channelId,
  );
  if (!referencedChannel) {
    return null;
  }

  const fetched = await referencedChannel.messages.fetch(reference.messageId);
  return isMessageLike(fetched) ? fetched : null;
}

async function resolveMessageChannel(
  message: Message,
  client: Client,
  channelId: string,
): Promise<ChannelWithMessages | null> {
  if (channelId === message.channelId && hasMessageManager(message.channel)) {
    return message.channel;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  return hasMessageManager(channel) ? channel : null;
}

function contextFetchLimitBeforeTrigger(plan: ContextFetchPlan): number {
  return Math.max(0, plan.limit - (plan.includeTriggerMessage ? 1 : 0));
}

async function fetchMessagesBefore(
  channel: unknown,
  beforeMessageId: string,
  limit: number,
): Promise<Message[]> {
  if (limit <= 0) {
    return [];
  }
  if (!hasMessageManager(channel)) {
    throw new Error("Discord channel does not support message fetching.");
  }

  const fetched = await channel.messages.fetch({
    limit,
    before: beforeMessageId,
  });

  return collectionToMessages(fetched);
}

function collectionToMessages(
  fetched: Message | MessageCollectionLike,
): Message[] {
  if (isMessageLike(fetched)) {
    return [fetched];
  }
  return [...fetched.values()];
}

function toContextMessages(
  messages: readonly Message[],
  triggerMessage: Message,
  client: Client,
): ConversationContextMessageInput[] {
  const botUserId = client.user?.id ?? null;
  return sortAndDedupeMessages(messages)
    .filter((message) =>
      isEligibleContextMessage(message, triggerMessage, botUserId),
    )
    .map((message) =>
      toContextMessage(message, triggerMessage.author.id, botUserId),
    );
}

function sortAndDedupeMessages(messages: readonly Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort(
    (left, right) => left.createdTimestamp - right.createdTimestamp,
  );
}

function isEligibleContextMessage(
  message: Message,
  triggerMessage: Message,
  botUserId: string | null,
): boolean {
  if (message.content.length > MAX_CONTEXT_MESSAGE_CONTENT_LENGTH) {
    return false;
  }

  if (message.id === triggerMessage.id) {
    return true;
  }

  if (botUserId && message.author.id === botUserId) {
    return true;
  }

  return !isAutomatedMessage(message);
}

function toContextMessage(
  message: Message,
  triggerAuthorDiscordUserId: string,
  botUserId: string | null,
): ConversationContextMessageInput {
  return {
    messageId: message.id,
    authorRelation: authorRelationFor(
      message,
      triggerAuthorDiscordUserId,
      botUserId,
    ),
    content: message.content,
  };
}

function isSendableChannel(channel: unknown): channel is SendableChannel {
  const candidate = asRecord(channel);
  return typeof candidate?.send === "function";
}

function isTypingChannel(channel: unknown): channel is TypingChannel {
  const candidate = asRecord(channel);
  return typeof candidate?.sendTyping === "function";
}

function hasMessageManager(channel: unknown): channel is ChannelWithMessages {
  const candidate = asRecord(channel);
  const messages = asRecord(candidate?.messages);
  return typeof messages?.fetch === "function";
}

function isThreadLikeChannel(channel: unknown): channel is ThreadLikeChannel {
  const candidate = asRecord(channel);
  return (
    hasMessageManager(channel) &&
    typeof candidate?.isThread === "function" &&
    candidate.isThread() === true &&
    typeof candidate.fetchStarterMessage === "function"
  );
}

function isMessageLike(value: unknown): value is Message {
  const candidate = asRecord(value);
  return (
    typeof candidate?.id === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.author === "object" &&
    typeof candidate.createdTimestamp === "number"
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

async function sendReplyChunks(
  message: Message,
  chunks: readonly string[],
): Promise<void> {
  let isFirst = true;
  const replyText = chunks.join("");
  for (const chunk of splitDiscordReply(replyText)) {
    if (isFirst) {
      await message.reply(chunk);
      isFirst = false;
    } else if (isSendableChannel(message.channel)) {
      await message.channel.send(chunk);
    }
  }
}

async function safeReply(message: Message, content: string): Promise<void> {
  await message.reply(content).catch(() => {
    // Intentionally ignored: user-facing fallback delivery failures must not log content.
  });
}

async function runWithTypingMaintenance<T>(
  channel: unknown,
  operation: () => Promise<T>,
): Promise<T> {
  if (!isTypingChannel(channel)) {
    return operation();
  }

  await channel.sendTyping().catch(() => {
    // Typing indicator failures are non-fatal and contain no useful metadata for users.
  });
  const interval = setInterval(() => {
    void channel.sendTyping().catch(() => {
      // Keep logs metadata-only and avoid noisy typing failure logs.
    });
  }, TYPING_REFRESH_INTERVAL_MS);
  interval.unref?.();

  try {
    return await operation();
  } finally {
    clearInterval(interval);
  }
}

function isAllowedDevDiscordUser(message: Message, config: BotConfig): boolean {
  if (config.mode !== "development") {
    return true;
  }

  if (message.guildId) {
    return message.guildId === config.devGuildId;
  }

  return config.devAllowedDiscordUserIds.includes(message.author.id);
}

export async function handleDiscordMessageCreate(
  message: Message,
  client: Client,
  config: BotConfig,
  apiClient: BotApiClient,
  logger: BotEventLogger = console,
): Promise<void> {
  logDiscordMessageReceived(message, client, logger);

  if (message.author.id === client.user?.id) {
    return;
  }

  if (!isAllowedDevDiscordUser(message, config)) {
    return;
  }

  const triggerKind = getTriggerKind(message, client);
  if (!triggerKind) {
    return;
  }

  const shouldAvoidAutomatedReply = triggerKind === "automated_trigger_source";
  const intakeRequest = buildIntakeRequest(message, client, triggerKind);
  let intakeResponse: BotMessageIntakeResponse;
  try {
    intakeResponse = await apiClient.intakeMessage(intakeRequest);
  } catch {
    if (!shouldAvoidAutomatedReply) {
      await safeReply(message, BOT_API_UNAVAILABLE_MESSAGE);
    }
    return;
  }

  if (!shouldProceedToRespond(intakeResponse)) {
    return;
  }

  await runWithTypingMaintenance(message.channel, async () => {
    let contextMessages: ConversationContextMessageInput[];
    try {
      contextMessages = await fetchContextMessages(
        message,
        client,
        intakeResponse.contextFetchPlan,
      );
    } catch {
      if (!shouldAvoidAutomatedReply) {
        await safeReply(message, CONTEXT_FETCH_FAILED_MESSAGE);
      }
      return;
    }

    const responseRequest: BotRespondRequest = {
      requestId: intakeRequest.requestId,
      triggerMessageId: message.id,
      triggerAuthorDiscordUserId: message.author.id,
      triggerKind,
      model: config.defaultModel,
      conversationContextMessageIds: contextMessages.map(
        (contextMessage) => contextMessage.messageId,
      ),
      conversationContextMessages: contextMessages,
    };

    try {
      const response = await apiClient.requestResponse(responseRequest);
      if (response.decision?.shouldRespond === false) {
        return;
      }
      await sendReplyChunks(message, response.replyChunks);
    } catch {
      if (!shouldAvoidAutomatedReply) {
        await safeReply(message, RESPONSE_GENERATION_FAILED_MESSAGE);
      }
    }
  });
}

export function registerDiscordMessageHandlers(
  client: Client,
  config: BotConfig,
  apiClient: BotApiClient,
  logger: BotEventLogger = console,
): void {
  client.on("messageCreate", (message) => {
    void handleDiscordMessageCreate(
      message,
      client,
      config,
      apiClient,
      logger,
    ).catch(() => {
      // Keep logs metadata-only. The next message can still be processed by discord.js.
    });
  });
}
