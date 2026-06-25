import type {
  ConfiguredProviderAccessStatus,
  ConversationContextMessageInput,
  ProviderKind,
  SafeProviderErrorCategory as SharedSafeProviderErrorCategory,
  TriggerKind,
} from "@dc-chatbot/shared";

export type LLMProviderKind = ProviderKind;

export type SafeProviderErrorCategory = SharedSafeProviderErrorCategory;

export type ProviderRuntimeStatus = {
  providerKind: ProviderKind;
  configuredProviderAccessStatus: ConfiguredProviderAccessStatus;
  safeErrorCategory?: SafeProviderErrorCategory;
};

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
  readonly providerKind: ProviderKind;

  getStatus(): ProviderRuntimeStatus;

  generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse>;
}
