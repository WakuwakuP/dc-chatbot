import { describe, expect, it, vi } from "vitest";
import {
  BotApiRequestError,
  createBotApiClient,
  type BotApiClient,
} from "../src/index";

const INTAKE_RESPONSE = {
  requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  action: "ignore",
  reason: "non_allowed_user",
};

const HEALTH_RESPONSE = {
  status: "ok",
  service: "dc-chatbot-api",
};

function createResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createClient(fetchMock: typeof globalThis.fetch) {
  return createBotApiClient({
    apiBaseUrl: "https://api.test/",
    cloudflareAccessClientId: "client-id",
    cloudflareAccessClientSecret: "client-secret",
    fetch: fetchMock,
    retryPolicy: {
      maxAttempts: 3,
      baseDelayMs: 0,
      maxDelayMs: 0,
      timeoutMs: 10,
    },
  });
}

describe("createBotApiClient", () => {
  it("retries transient Bot API status codes", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(createResponse({}, 500))
      .mockResolvedValueOnce(createResponse(INTAKE_RESPONSE));

    const client = createClient(fetchMock);
    await expect(
      client.intakeMessage({
        requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        messageId: "100",
        channelId: "200",
        authorDiscordUserId: "300",
        triggerKind: "dm",
        isAllowedUser: false,
        isAutomatedSource: false,
        attachmentCount: 0,
        observedAt: "2026-06-20T00:00:00.000Z",
      }),
    ).resolves.toEqual(INTAKE_RESPONSE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries timeout-like fetch failures", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new DOMException("", "AbortError"))
      .mockResolvedValueOnce(createResponse(HEALTH_RESPONSE));

    const client = createClient(fetchMock);
    await expect(client.checkHealth()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends local auth bypass headers when configured", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(createResponse(HEALTH_RESPONSE));

    const client = createBotApiClient({
      apiBaseUrl: "https://api.test/",
      cloudflareAccessClientId: "client-id",
      cloudflareAccessClientSecret: "client-secret",
      localAuthBypassSecret: "local-auth-bypass-secret",
      fetch: fetchMock,
    });

    await client.checkHealth();

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("x-dev-auth-secret")).toBe(
      "local-auth-bypass-secret",
    );
    expect(new Headers(init?.headers).get("x-dev-bot-service")).toBe("true");
  });

  it("does not retry non-transient 4xx responses", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(createResponse({}, 400));

    const client = createClient(fetchMock);
    await expect(client.checkHealth()).rejects.toMatchObject({
      status: 400,
      isTransient: false,
    } satisfies Partial<BotApiRequestError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches pending Owner Notifications for delivery", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      createResponse({
        ownerNotifications: [
          {
            ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            notificationOwnerDiscordUserId: "123",
            candidateDiscordUserId: "456",
            requestId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
            triggerKind: "dm",
            status: "delivery_requested",
            safeErrorCategory: null,
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:01.000Z",
          },
        ],
      }),
    );

    const client = createClient(fetchMock);
    await expect(client.fetchPendingOwnerNotifications(5)).resolves.toEqual({
      ownerNotifications: [
        expect.objectContaining({
          ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          notificationOwnerDiscordUserId: "123",
          candidateDiscordUserId: "456",
        }),
      ],
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.test/api/v1/bot/owner-notifications/pending?limit=5",
    );
  });

  it("reports Owner Notification delivery status", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(createResponse({ ok: true }));

    const client = createClient(fetchMock);
    await client.updateOwnerNotificationDelivery({
      ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "delivered",
      deliveredAt: "2026-06-20T00:00:02.000Z",
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.test/api/v1/bot/owner-notifications/delivery-status",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({
        ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        status: "delivered",
        deliveredAt: "2026-06-20T00:00:02.000Z",
      }),
    );
  });

  it("rejects arbitrary Owner Notification delivery error categories", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>();
    const client = createClient(fetchMock);
    const request = {
      ownerNotificationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "failed",
      safeErrorCategory: "unsafe_freeform_category",
    } as unknown as Parameters<
      BotApiClient["updateOwnerNotificationDelivery"]
    >[0];

    await expect(
      client.updateOwnerNotificationDelivery(request),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
