import { describe, expect, it, vi } from "vitest";
import type { Client } from "discord.js";
import type { BotApiClient } from "../src/index";
import {
  buildOwnerNotificationDmText,
  deliverPendingOwnerNotifications,
} from "../src/index";

const OWNER_NOTIFICATION = {
  ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  notificationOwnerDiscordUserId: "123",
  candidateDiscordUserId: "456",
  requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
  triggerKind: "dm",
  status: "delivery_requested",
  safeErrorCategory: null,
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:01.000Z",
} as const;

function createApiClient(): BotApiClient {
  return {
    checkHealth: vi.fn<BotApiClient["checkHealth"]>(),
    intakeMessage: vi.fn<BotApiClient["intakeMessage"]>(),
    requestResponse: vi.fn<BotApiClient["requestResponse"]>(),
    fetchPendingOwnerNotifications: vi
      .fn<BotApiClient["fetchPendingOwnerNotifications"]>()
      .mockResolvedValue({ ownerNotifications: [OWNER_NOTIFICATION] }),
    updateOwnerNotificationDelivery: vi.fn<
      BotApiClient["updateOwnerNotificationDelivery"]
    >(),
  };
}

function createClient(send: ReturnType<typeof vi.fn>): Client {
  return {
    users: {
      fetch: vi.fn(async () => ({ send })),
    },
  } as unknown as Client;
}

describe("owner notification delivery", () => {
  it("builds fixed Japanese DM text from metadata only", () => {
    const text = buildOwnerNotificationDmText(OWNER_NOTIFICATION);

    expect(text).toContain("未許可のDiscord User");
    expect(text).toContain("Candidate Discord User ID: 456");
    expect(text).toContain("Response Trigger: dm");
    expect(text).toContain("Owner Notification ID: 01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(text).not.toContain("messageContent");
    expect(text).not.toContain("SAFE_SENTINEL_FORBIDDEN_TOKEN_001");
  });

  it("sends claimed Owner Notifications and reports delivered status", async () => {
    const send = vi.fn(async () => undefined);
    const client = createClient(send);
    const apiClient = createApiClient();

    await expect(
      deliverPendingOwnerNotifications(client, apiClient, {
        limit: 3,
        now: () => new Date("2026-06-20T00:00:02.000Z"),
      }),
    ).resolves.toEqual({
      fetchedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
    });

    expect(apiClient.fetchPendingOwnerNotifications).toHaveBeenCalledWith(3);
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining("Candidate Discord User ID: 456"),
    );
    expect(apiClient.updateOwnerNotificationDelivery).toHaveBeenCalledWith({
      ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "delivered",
      deliveredAt: "2026-06-20T00:00:02.000Z",
    });
  });

  it("reports failed status with a safe category when Discord DM fails", async () => {
    const send = vi.fn(async () => {
      throw new Error("missing permission");
    });
    const client = createClient(send);
    const apiClient = createApiClient();

    await expect(
      deliverPendingOwnerNotifications(client, apiClient),
    ).resolves.toEqual({
      fetchedCount: 1,
      deliveredCount: 0,
      failedCount: 1,
    });

    expect(apiClient.updateOwnerNotificationDelivery).toHaveBeenCalledWith({
      ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "failed",
      safeErrorCategory: "discord_delivery_failed",
    });
  });
});
