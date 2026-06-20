import { describe, expect, it } from "vitest";
import { FakeChatGPTSubscriptionProvider } from "../src/index";

describe("FakeChatGPTSubscriptionProvider", () => {
  it("returns a deterministic reply without exposing provider raw body", async () => {
    const provider = new FakeChatGPTSubscriptionProvider();
    const response = await provider.generateResponse({
      requestId: "01HY0000000000000000000000",
      effectiveConnectionId: "01HY0000000000000000000002",
      model: "fake-model",
      triggerKind: "dm",
      conversationContextMessageIds: ["123"],
    });

    expect(response.providerCallId).toBe("01HY0000000000000000000001");
    expect(typeof response.replyText).toBe("string");
    expect(Object.keys(response)).not.toContain("rawResponseBody");
  });
});
