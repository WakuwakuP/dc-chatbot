import { describe, expect, it, vi } from "vitest";
import { BotApiRequestError, createBotApiClient } from "../src/index";

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
});
