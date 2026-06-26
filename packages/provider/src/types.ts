import type {
  AttachmentMetadataInput,
  ConfiguredProviderAccessStatus,
  ConversationContextMessageInput,
  FinalResponseDecision,
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
  attachmentMetadata?: readonly AttachmentMetadataInput[];
};

export type ProviderGenerateResponse = {
  providerCallId: string;
  replyText: string;
  model: string;
};

export type ProviderResponseDecisionRequest = {
  requestId: string;
  model: string;
  triggerKind: TriggerKind;
  triggerMessageId: string;
  selectedContextMessageIds: readonly string[];
  conversationContextMessages: readonly ConversationContextMessageInput[];
};

export type ProviderResponseDecisionResponse = {
  providerCallId: string;
  model: string;
  decision: FinalResponseDecision;
};

export interface LLMProvider {
  readonly providerKind: ProviderKind;

  getStatus(): ProviderRuntimeStatus;

  generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse>;

  decideResponse(
    request: ProviderResponseDecisionRequest,
  ): Promise<ProviderResponseDecisionResponse>;
}
