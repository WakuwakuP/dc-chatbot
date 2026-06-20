import type { TriggerKind } from "@dc-chatbot/shared";

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
};

export type ProviderGenerateResponse = {
  providerCallId: string;
  replyText: string;
  model: string;
};

export interface ChatGPTSubscriptionProvider {
  generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse>;
}
