import {
  BotMessageIntakeResponseSchema,
  BotRespondResponseSchema,
  type BotMessageIntakeRequest,
  type BotMessageIntakeResponse,
  type BotRespondRequest,
  type BotRespondResponse,
  parseJson,
} from "@dc-chatbot/shared";

export type BotApiClientOptions = {
  apiBaseUrl: string;
  cloudflareAccessClientId: string;
  cloudflareAccessClientSecret: string;
  fetch?: typeof globalThis.fetch;
};

export type BotApiClient = {
  intakeMessage(
    request: BotMessageIntakeRequest,
  ): Promise<BotMessageIntakeResponse>;
  requestResponse(request: BotRespondRequest): Promise<BotRespondResponse>;
};

export function createBotApiClient(options: BotApiClientOptions): BotApiClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = options.apiBaseUrl.replace(/\/$/u, "");

  async function postJson(path: string, body: unknown): Promise<unknown> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-access-client-id": options.cloudflareAccessClientId,
        "cf-access-client-secret": options.cloudflareAccessClientSecret,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Bot API request failed with status ${response.status}`);
    }

    return response.json();
  }

  return {
    async intakeMessage(request) {
      return parseJson(
        BotMessageIntakeResponseSchema,
        await postJson("/api/v1/bot/messages/intake", request),
      );
    },
    async requestResponse(request) {
      return parseJson(
        BotRespondResponseSchema,
        await postJson("/api/v1/bot/messages/respond", request),
      );
    },
  };
}
