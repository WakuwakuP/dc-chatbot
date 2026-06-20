import type {
  BeginConnectionFlowRequest,
  BeginConnectionFlowResponse,
  ChatGPTSubscriptionProvider,
  CompleteConnectionFlowRequest,
  CompleteConnectionFlowResponse,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
} from "./types";

const FAKE_PROVIDER_CALL_ID = "01HY0000000000000000000001";

export class FakeChatGPTSubscriptionProvider implements ChatGPTSubscriptionProvider {
  async beginConnectionFlow(
    request: BeginConnectionFlowRequest,
  ): Promise<BeginConnectionFlowResponse> {
    const authorizationUrl = new URL("https://provider.invalid/fake/connect");
    authorizationUrl.searchParams.set("state", request.state);
    authorizationUrl.searchParams.set(
      "connection_flow_state_id",
      request.connectionFlowStateId,
    );
    authorizationUrl.searchParams.set("expires_at", request.expiresAt);
    return {
      providerKind: "fake",
      authorizationUrl: authorizationUrl.toString(),
    };
  }

  async completeConnectionFlow(
    request: CompleteConnectionFlowRequest,
  ): Promise<CompleteConnectionFlowResponse> {
    return {
      providerKind: "fake",
      credentialCiphertext: request.opaqueCredentialCiphertext,
    };
  }

  async revokeConnection(_connectionId: string): Promise<void> {
    return;
  }

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

export function createChatGPTSubscriptionProvider(): ChatGPTSubscriptionProvider {
  return new FakeChatGPTSubscriptionProvider();
}
