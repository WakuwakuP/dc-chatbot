import { createUlid } from "@dc-chatbot/shared";
import type {
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
} from "./types";

export type FakeLLMProviderOptions = {
  providerCallIdFactory?: () => string;
};

export class FakeLLMProvider implements LLMProvider {
  private readonly providerCallIdFactory: () => string;

  constructor(options: FakeLLMProviderOptions = {}) {
    this.providerCallIdFactory = options.providerCallIdFactory ?? createUlid;
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
}
