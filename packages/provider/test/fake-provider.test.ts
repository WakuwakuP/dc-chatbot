import { describe, expect, it } from "vitest";
import { FakeLLMProvider } from "../src/index";

describe("FakeLLMProvider", () => {
  it("returns a deterministic reply without exposing provider raw body", async () => {
    const provider = new FakeLLMProvider({
      providerCallIdFactory: () => "01HY0000000000000000000001",
    });
    const response = await provider.generateResponse({
      requestId: "01HY0000000000000000000000",
      model: "fake-model",
      triggerKind: "dm",
      conversationContextMessageIds: ["123"],
    });

    expect(response.providerCallId).toBe("01HY0000000000000000000001");
    expect(typeof response.replyText).toBe("string");
    expect(Object.keys(response)).not.toContain("rawResponseBody");
  });

  it("reports metadata-only configured provider access status", () => {
    const provider = new FakeLLMProvider();

    expect(provider.providerKind).toBe("fake");
    expect(provider.getStatus()).toEqual({
      providerKind: "fake",
      configuredProviderAccessStatus: "available",
    });
  });

  it("generates a distinct provider call ID for each response by default", async () => {
    const provider = new FakeLLMProvider();
    const request = {
      requestId: "01HY0000000000000000000000",
      model: "fake-model",
      triggerKind: "dm" as const,
      conversationContextMessageIds: ["123"],
    };

    const firstResponse = await provider.generateResponse(request);
    const secondResponse = await provider.generateResponse(request);

    expect(firstResponse.providerCallId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(secondResponse.providerCallId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(secondResponse.providerCallId).not.toBe(
      firstResponse.providerCallId,
    );
  });
});
