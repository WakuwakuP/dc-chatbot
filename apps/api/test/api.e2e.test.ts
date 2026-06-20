import { describe, expect, it } from "vitest";
import worker, { type Env } from "../src/worker";

const env: Env = {
  ALLOW_LOCAL_AUTH_BYPASS: "true",
  CF_ACCESS_CLIENT_ID: "client-id",
  CF_ACCESS_CLIENT_SECRET: "client-secret",
};

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("API Worker routes", () => {
  it("serves health", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/health"),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({ status: "ok" });
  });

  it("serves local owner identity behind explicit dev bypass", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "x-dev-owner-discord-user-id": "123",
          "x-dev-owner-role": "regular_owner",
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      ownerDiscordUserId: "123",
      role: "regular_owner",
    });
  });

  it("accepts metadata-only bot message intake", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          messageId: "100",
          channelId: "200",
          authorDiscordUserId: "300",
          triggerKind: "dm",
          isAllowedUser: true,
          isAutomatedSource: false,
          attachmentCount: 0,
          observedAt: "2026-06-20T00:00:00.000Z",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      action: "respond_without_context",
    });
  });

  it("returns safe response metadata for bot respond", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          effectiveConnectionId: "01HY0000000000000000000002",
          model: "fake-model",
          conversationContextMessageIds: [],
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toMatchObject({
      requestId: "01HY0000000000000000000000",
      providerCallId: "01HY0000000000000000000001",
    });
    expect(body).toHaveProperty("replyChunks");
  });
});
