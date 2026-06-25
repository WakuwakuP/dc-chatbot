import { describe, expect, it, vi } from "vitest";
import type { BotMessageIntakeResponse } from "@dc-chatbot/shared";
import type { Client, Message } from "discord.js";
import type { BotApiClient, BotConfig } from "../src/index";
import {
  BOT_API_UNAVAILABLE_MESSAGE,
  CONTEXT_FETCH_FAILED_MESSAGE,
  RESPONSE_GENERATION_FAILED_MESSAGE,
  handleDiscordMessageCreate,
} from "../src/index";

const BASE_CONFIG: BotConfig = {
  mode: "development",
  discordToken: "token",
  apiBaseUrl: "https://api.test",
  cloudflareAccessClientId: "client-id",
  cloudflareAccessClientSecret: "client-secret",
  localAuthBypassSecret: null,
  devGuildId: "10",
  devAllowedDiscordUserIds: ["100"],
  defaultModel: "test-model",
};

const IGNORE_RESPONSE: BotMessageIntakeResponse = {
  requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  action: "ignore",
  reason: "non_allowed_user",
};

function createApiClient(): BotApiClient {
  return {
    checkHealth: vi.fn<BotApiClient["checkHealth"]>(),
    intakeMessage: vi
      .fn<BotApiClient["intakeMessage"]>()
      .mockResolvedValue(IGNORE_RESPONSE),
    requestResponse: vi.fn<BotApiClient["requestResponse"]>(),
  };
}

function createClient(): Client {
  return {
    user: { id: "999" },
    channels: {
      fetch: vi.fn(),
    },
  } as unknown as Client;
}

function createLogger() {
  return { info: vi.fn() };
}

type MockChannel = {
  send: ReturnType<typeof vi.fn>;
  sendTyping: ReturnType<typeof vi.fn>;
  messages: {
    fetch: ReturnType<typeof vi.fn>;
  };
};

function createChannel(): MockChannel {
  return {
    send: vi.fn(async () => undefined),
    sendTyping: vi.fn(async () => undefined),
    messages: {
      fetch: vi.fn(),
    },
  };
}

function createMessage(options: {
  id: string;
  authorId: string;
  channel: MockChannel;
  guildId?: string | null;
  mentionedBot?: boolean;
  bot?: boolean;
  content?: string;
  reference?: { messageId: string; channelId?: string } | null;
}): Message {
  return {
    id: options.id,
    channelId: "20",
    guildId: options.guildId ?? null,
    channel: options.channel,
    author: {
      id: options.authorId,
      bot: options.bot ?? false,
      globalName: null,
      username: `user-${options.authorId}`,
    },
    webhookId: null,
    content: options.content ?? "x",
    attachments: { size: 0 },
    createdTimestamp: Number(options.id),
    member: null,
    reference: options.reference ?? null,
    mentions: {
      users: {
        has: vi.fn((userId: string) =>
          options.mentionedBot ? userId === "999" : false,
        ),
      },
    },
    inGuild: vi.fn(
      () => options.guildId !== undefined && options.guildId !== null,
    ),
    reply: vi.fn(async () => undefined),
  } as unknown as Message;
}

describe("handleDiscordMessageCreate", () => {
  it("logs received Discord message metadata without message content", async () => {
    const channel = createChannel();
    const message = createMessage({
      id: "11",
      authorId: "101",
      channel,
      content: "ログに出してはいけない本文",
    });
    const apiClient = createApiClient();
    const logger = { info: vi.fn() };

    await handleDiscordMessageCreate(
      message,
      createClient(),
      BASE_CONFIG,
      apiClient,
      logger,
    );

    expect(logger.info).toHaveBeenCalledWith(
      "dc-chatbot Discord message received",
      expect.objectContaining({
        eventType: "discord_message_received",
        messageId: "11",
        channelId: "20",
        guildId: null,
        authorDiscordUserId: "101",
        isDirectMessage: true,
        contentLength: "ログに出してはいけない本文".length,
      }),
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
      "ログに出してはいけない本文",
    );
    expect(apiClient.intakeMessage).not.toHaveBeenCalled();
  });

  it("ignores development DMs from users outside the dev allowlist", async () => {
    const channel = createChannel();
    const message = createMessage({ id: "1", authorId: "101", channel });
    const apiClient = createApiClient();

    await handleDiscordMessageCreate(
      message,
      createClient(),
      BASE_CONFIG,
      apiClient,
      createLogger(),
    );

    expect(apiClient.intakeMessage).not.toHaveBeenCalled();
    expect(message.reply).not.toHaveBeenCalled();
  });

  it("sends a safe Japanese fallback when intake cannot reach the API", async () => {
    const channel = createChannel();
    const message = createMessage({ id: "2", authorId: "100", channel });
    const apiClient = createApiClient();
    vi.mocked(apiClient.intakeMessage).mockRejectedValue(new Error("network"));

    await handleDiscordMessageCreate(
      message,
      createClient(),
      BASE_CONFIG,
      apiClient,
      createLogger(),
    );

    expect(message.reply).toHaveBeenCalledWith(BOT_API_UNAVAILABLE_MESSAGE);
  });

  it("sends a safe Japanese fallback when context fetch fails", async () => {
    const channel = createChannel();
    channel.messages.fetch.mockRejectedValue(new Error("missing access"));
    const message = createMessage({ id: "3", authorId: "100", channel });
    const apiClient = createApiClient();
    vi.mocked(apiClient.intakeMessage).mockResolvedValue({
      requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      action: "fetch_context",
      reason: "allowed_dm",
      contextFetchPlan: {
        kind: "dm_recent",
        limit: 5,
        includeTriggerMessage: true,
      },
    });

    await handleDiscordMessageCreate(
      message,
      createClient(),
      BASE_CONFIG,
      apiClient,
      createLogger(),
    );

    expect(message.reply).toHaveBeenCalledWith(CONTEXT_FETCH_FAILED_MESSAGE);
    expect(apiClient.requestResponse).not.toHaveBeenCalled();
  });

  it("sends transient context content to respond and posts the final reply", async () => {
    const channel = createChannel();
    const priorMessage = createMessage({
      id: "4",
      authorId: "200",
      channel,
      content: "p",
    });
    const automatedMessage = createMessage({
      id: "5",
      authorId: "300",
      channel,
      bot: true,
      content: "b",
    });
    const triggerMessage = createMessage({
      id: "6",
      authorId: "100",
      channel,
      content: "t",
    });
    channel.messages.fetch.mockResolvedValue(
      new Map([
        [priorMessage.id, priorMessage],
        [automatedMessage.id, automatedMessage],
      ]),
    );
    const apiClient = createApiClient();
    vi.mocked(apiClient.intakeMessage).mockResolvedValue({
      requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      action: "fetch_context",
      reason: "allowed_dm",
      contextFetchPlan: {
        kind: "dm_recent",
        limit: 5,
        includeTriggerMessage: true,
      },
    });
    vi.mocked(apiClient.requestResponse).mockResolvedValue({
      requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      replyChunks: ["r"],
      providerCallId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    });

    await handleDiscordMessageCreate(
      triggerMessage,
      createClient(),
      BASE_CONFIG,
      apiClient,
      createLogger(),
    );

    expect(apiClient.requestResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationContextMessageIds: ["4", "6"],
        conversationContextMessages: [
          expect.objectContaining({ messageId: "4", content: "p" }),
          expect.objectContaining({ messageId: "6", content: "t" }),
        ],
      }),
    );
    expect(channel.sendTyping).toHaveBeenCalled();
    expect(triggerMessage.reply).toHaveBeenCalledWith("r");
  });

  it("sends a safe Japanese fallback when response generation fails", async () => {
    const channel = createChannel();
    const message = createMessage({ id: "7", authorId: "100", channel });
    const apiClient = createApiClient();
    vi.mocked(apiClient.intakeMessage).mockResolvedValue({
      requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      action: "respond_without_context",
      reason: "allowed_dm",
    });
    vi.mocked(apiClient.requestResponse).mockRejectedValue(
      new Error("provider"),
    );

    await handleDiscordMessageCreate(
      message,
      createClient(),
      BASE_CONFIG,
      apiClient,
      createLogger(),
    );

    expect(message.reply).toHaveBeenCalledWith(
      RESPONSE_GENERATION_FAILED_MESSAGE,
    );
  });
});
