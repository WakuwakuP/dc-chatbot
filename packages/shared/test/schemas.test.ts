import { describe, expect, it } from "vitest";
import { BotMessageIntakeRequestSchema, parseJson } from "../src/index";

describe("BotMessageIntakeRequestSchema", () => {
  it("accepts metadata-only message intake", () => {
    const parsed = parseJson(BotMessageIntakeRequestSchema, {
      requestId: "01HY0000000000000000000000",
      messageId: "123",
      channelId: "456",
      authorDiscordUserId: "789",
      triggerKind: "dm",
      isAllowedUser: true,
      isAutomatedSource: false,
      attachmentCount: 0,
      observedAt: "2026-06-20T00:00:00.000Z",
    });

    expect(parsed.triggerKind).toBe("dm");
    expect("messageContent" in parsed).toBe(false);
  });
});
