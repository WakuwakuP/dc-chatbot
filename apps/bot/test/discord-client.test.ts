import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "discord.js";
import type { BotApiClient, BotConfig } from "../src/index";
import { startBot } from "../src/index";

const BASE_CONFIG: BotConfig = {
  mode: "development",
  discordToken: "token",
  apiBaseUrl: "https://api.test",
  cloudflareAccessClientId: "client-id",
  cloudflareAccessClientSecret: "client-secret",
  localAuthBypassSecret: "local-auth-bypass-secret",
  devGuildId: "10",
  devAllowedDiscordUserIds: ["100"],
  defaultModel: "test-model",
};

function createApiClient(events: string[] = []): BotApiClient {
  return {
    checkHealth: vi.fn(async () => {
      events.push("health");
    }),
    intakeMessage: vi.fn<BotApiClient["intakeMessage"]>(),
    requestResponse: vi.fn<BotApiClient["requestResponse"]>(),
    fetchPendingOwnerNotifications: vi.fn<
      BotApiClient["fetchPendingOwnerNotifications"]
    >(),
    updateOwnerNotificationDelivery: vi.fn<
      BotApiClient["updateOwnerNotificationDelivery"]
    >(),
  };
}

function createClient(events: string[] = []): Client {
  return {
    user: { id: "999" },
    on: vi.fn((eventName: string) => {
      events.push(`on:${eventName}`);
      return undefined;
    }),
    login: vi.fn(async () => {
      events.push("login");
      return "token";
    }),
    destroy: vi.fn(() => {
      events.push("destroy");
    }),
  } as unknown as Client;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("startBot", () => {
  it("starts Owner Notification delivery polling after health, handlers, and login", async () => {
    const events: string[] = [];
    const client = createClient(events);
    const apiClient = createApiClient(events);
    const deliverOwnerNotifications = vi.fn(async () => {
      events.push("owner-notification-poll");
      return { fetchedCount: 0, deliveredCount: 0, failedCount: 0 };
    });

    await startBot(BASE_CONFIG, client, {
      apiClient,
      deliverOwnerNotifications,
      ownerNotificationPollIntervalMs: 60_000,
    });

    expect(events).toEqual([
      "health",
      "on:messageCreate",
      "login",
      "owner-notification-poll",
    ]);
    expect(deliverOwnerNotifications).toHaveBeenCalledWith(
      client,
      apiClient,
      {},
    );
  });

  it("stops Owner Notification delivery polling when the client is destroyed", async () => {
    vi.useFakeTimers();
    const client = createClient();
    const apiClient = createApiClient();
    const deliverOwnerNotifications = vi.fn(async () => ({
      fetchedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
    }));

    await startBot(BASE_CONFIG, client, {
      apiClient,
      deliverOwnerNotifications,
      ownerNotificationPollIntervalMs: 1_000,
    });
    expect(deliverOwnerNotifications).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(deliverOwnerNotifications).toHaveBeenCalledTimes(2);

    client.destroy();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(deliverOwnerNotifications).toHaveBeenCalledTimes(2);
  });
});
