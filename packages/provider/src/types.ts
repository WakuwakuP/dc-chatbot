import type {
  ConversationContextMessageInput,
  TriggerKind,
} from "@dc-chatbot/shared";

export type LLMProviderKind = "fake" | "nvidia_nim";

export type SafeProviderErrorCategory =
  | "rate_limited"
  | "temporary_unavailable"
  | "policy_rejected"
  | "unknown";

export type ProviderGenerateRequest = {
  requestId: string;
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

export interface LLMProvider {
  generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse>;
}
