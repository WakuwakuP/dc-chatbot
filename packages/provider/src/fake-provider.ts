import { createUlid } from "@dc-chatbot/shared";
import type {
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
  ProviderResponseDecisionRequest,
  ProviderResponseDecisionResponse,
  ProviderRuntimeStatus,
} from "./types";

export type FakeLLMProviderOptions = {
  providerCallIdFactory?: () => string;
};

export class FakeLLMProvider implements LLMProvider {
  readonly providerKind = "fake";

  private readonly providerCallIdFactory: () => string;

  constructor(options: FakeLLMProviderOptions = {}) {
    this.providerCallIdFactory = options.providerCallIdFactory ?? createUlid;
  }

  getStatus(): ProviderRuntimeStatus {
    return {
      providerKind: this.providerKind,
      configuredProviderAccessStatus: "available",
    };
  }

  async generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse> {
    return {
      providerCallId: this.providerCallIdFactory(),
      model: request.model,
      replyText: `Fake provider response for ${request.triggerKind}.`,
    };
  }

  async decideResponse(
    request: ProviderResponseDecisionRequest,
  ): Promise<ProviderResponseDecisionResponse> {
    return {
      providerCallId: this.providerCallIdFactory(),
      model: request.model,
      decision: {
        shouldRespond: true,
        reason:
          request.triggerKind === "dm"
            ? "dm_allowed"
            : "selected_context_available",
      },
    };
  }
}
