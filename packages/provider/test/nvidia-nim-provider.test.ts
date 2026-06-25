import { describe, expect, it, vi } from "vitest";
import { NvidiaNimLLMProvider, ProviderError } from "../src/index";

const TEST_PROVIDER_CALL_ID = "01HY0000000000000000000003";

describe("NvidiaNimLLMProvider", () => {
  it("calls the NVIDIA NIM chat completions endpoint without exposing context IDs", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init: RequestInit | undefined) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          messages: readonly { role: string; content: string }[];
          stream: boolean;
        };

        expect(body).toMatchObject({ model: "meta/llama-3.1-70b-instruct" });
        expect(body.stream).toBe(false);
        expect(body.messages.map((message) => message.role)).toEqual([
          "system",
          "user",
        ]);
        expect(JSON.stringify(body)).not.toContain("100");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer x",
        );

        return new Response(null, { status: 204 });
      },
    );
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "x",
      baseUrl: "https://nim.test/v1/",
      fetch: fetchMock,
      providerCallIdFactory: () => TEST_PROVIDER_CALL_ID,
    });

    const response = provider.generateResponse({
      requestId: "01HY0000000000000000000000",
      model: "meta/llama-3.1-70b-instruct",
      triggerKind: "dm",
      conversationContextMessageIds: ["100", "101"],
    });

    await expect(response).rejects.toMatchObject({
      name: "ProviderError",
      safeCategory: "invalid_response",
    } satisfies Partial<ProviderError>);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://nim.test/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("reports metadata-only configured provider access status", () => {
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "x",
      providerCallIdFactory: () => TEST_PROVIDER_CALL_ID,
    });

    expect(provider.providerKind).toBe("nvidia_nim");
    expect(provider.getStatus()).toEqual({
      providerKind: "nvidia_nim",
      configuredProviderAccessStatus: "available",
    });
  });

  it("maps missing NVIDIA NIM API Key configuration to a safe category", () => {
    expect(
      () =>
        new NvidiaNimLLMProvider({
          bearerToken: "",
          providerCallIdFactory: () => TEST_PROVIDER_CALL_ID,
        }),
    ).toThrowError(
      expect.objectContaining({
        name: "ProviderError",
        safeCategory: "not_configured",
      }),
    );
  });

  it("maps invalid NVIDIA NIM access to a safe provider error category", async () => {
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "x",
      fetch: async () => new Response(null, { status: 401 }),
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
      safeCategory: "authentication_failed",
    } satisfies Partial<ProviderError>);
  });

  it("maps rate limits to a safe provider error category", async () => {
    const provider = new NvidiaNimLLMProvider({
      bearerToken: "x",
      fetch: async () => new Response(null, { status: 429 }),
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
