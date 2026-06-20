import type {
  ConversationContextMessageInput,
  TriggerKind,
} from "@dc-chatbot/shared";

export type SafeProviderErrorCategory =
  | "needs_reconnect"
  | "rate_limited"
  | "temporary_unavailable"
  | "policy_rejected"
  | "unknown";

export type ProviderGenerateRequest = {
  requestId: string;
  effectiveConnectionId: string;
  model: string;
  triggerKind: TriggerKind;
  conversationContextMessageIds: readonly string[];
  conversationContextMessages?: readonly ConversationContextMessageInput[];
};

export type ProviderGenerateResponse = {
  providerCallId: string;
  replyText: string;
  model: string;
};

export type BeginConnectionFlowRequest = {
  connectionFlowStateId: string;
  state: string;
  expiresAt: string;
};

export type BeginConnectionFlowResponse = {
  providerKind: "fake";
  authorizationUrl: string;
};

export type CompleteConnectionFlowRequest = {
  connectionFlowStateId: string;
  state: string;
  opaqueCredentialCiphertext: string;
};

export type CompleteConnectionFlowResponse = {
  providerKind: "fake";
  credentialCiphertext: string;
};

export interface ChatGPTSubscriptionProvider {
  beginConnectionFlow(
    request: BeginConnectionFlowRequest,
  ): Promise<BeginConnectionFlowResponse>;
  completeConnectionFlow(
    request: CompleteConnectionFlowRequest,
  ): Promise<CompleteConnectionFlowResponse>;
  revokeConnection(connectionId: string): Promise<void>;
  generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse>;
}
