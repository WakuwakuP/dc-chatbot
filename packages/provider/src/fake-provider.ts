import type {
  ChatGPTSubscriptionProvider,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
} from "./types";

const FAKE_PROVIDER_CALL_ID = "01HY0000000000000000000001";

export class FakeChatGPTSubscriptionProvider implements ChatGPTSubscriptionProvider {
  async generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse> {
    return {
      providerCallId: FAKE_PROVIDER_CALL_ID,
      model: request.model,
      replyText: `Fake provider response for ${request.triggerKind}.`,
    };
  }
}
