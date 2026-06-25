import { describe, expect, it, vi } from "vitest";
import { NvidiaNimLLMProvider, ProviderError } from "../src/index";

const TEST_PROVIDER_CALL_ID = "01HY0000000000000000000003";

describe("NvidiaNimLLMProvider", () => {
  it("calls the NVIDIA NIM chat completions endpoint without exposing raw response body", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init: RequestInit | undefined) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          messages: readonly { role: string; content: string }[];
          stream: boolean;
        };

        expect(body).toMatchObject({ model: "meta/llama-3.1-70b-instruct" });
        expect(body.stream).toBe(false);
        expect(body.messages).toEqual([
          {
            role: "system",
            content: "System instruction for test.",
          },
          {
            role: "user",
            content: "[trigger_user] こんにちは",
          },
          {
            role: "assistant",
            content: "[bot_self] どうしましたか？",
          },
        ]);
        expect(JSON.stringify(body)).not.toContain("100");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer TEST_NVIDIA_NIM_BEARER_TOKEN",
        );

        return new Response(
          JSON.stringify({
            id: "provider-raw-id-not-returned",
            model: "meta/llama-3.1-70b-instruct",
            choices: [{ message: { content: "NIM reply" } }],
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    );
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "TEST_NVIDIA_NIM_BEARER_TOKEN",
      baseUrl: "https://nim.test/v1/",
      fetch: fetchMock,
      providerCallIdFactory: () => TEST_PROVIDER_CALL_ID,
      systemInstruction: "System instruction for test.",
    });

    const response = await provider.generateResponse({
      requestId: "01HY0000000000000000000000",
      model: "meta/llama-3.1-70b-instruct",
      triggerKind: "dm",
      conversationContextMessageIds: ["100", "101"],
      conversationContextMessages: [
        {
          messageId: "100",
          authorRelation: "trigger_user",
          content: "こんにちは",
        },
        {
          messageId: "101",
          authorRelation: "bot_self",
          content: "どうしましたか？",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://nim.test/v1/chat/completions",
      expect.any(Object),
    );
    expect(response).toEqual({
      providerCallId: TEST_PROVIDER_CALL_ID,
      model: "meta/llama-3.1-70b-instruct",
      replyText: "NIM reply",
    });
    expect(Object.keys(response)).not.toContain("rawResponseBody");
  });

  it("maps rate limits to a safe provider error category", async () => {
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "TEST_NVIDIA_NIM_BEARER_TOKEN",
      fetch: async () =>
        new Response(JSON.stringify({ error: "do not expose" }), {
          status: 429,
        }),
      providerCallIdFactory: () => TEST_PROVIDER_CALL_ID,
    });

    await expect(
      provider.generateResponse({
        requestId: "01HY0000000000000000000000",
        model: "meta/llama-3.1-70b-instruct",
        triggerKind: "dm",
        conversationContextMessageIds: [],
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      safeCategory: "rate_limited",
    } satisfies Partial<ProviderError>);
  });
});
