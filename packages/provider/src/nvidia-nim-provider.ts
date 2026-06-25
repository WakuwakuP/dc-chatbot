import { createUlid } from "@dc-chatbot/shared";
import type { AttachmentMetadataInput } from "@dc-chatbot/shared";
import type {
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
  ProviderRuntimeStatus,
  SafeProviderErrorCategory,
} from "./types";

const DEFAULT_NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_SYSTEM_INSTRUCTION =
  "You are a helpful assistant responding through a Discord Private Bot. Reply concisely in the user's language when possible.";

type FetchLike = typeof fetch;

type NvidiaNimMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NvidiaNimChatCompletionResponse = {
  choices?: readonly {
    message?: {
      content?: unknown;
    };
  }[];
  model?: unknown;
};

export type NvidiaNimLLMProviderOptions = {
  bearerToken: string;
  baseUrl?: string;
  fetch?: FetchLike;
  providerCallIdFactory?: () => string;
  systemInstruction?: string;
};

export class ProviderError extends Error {
  readonly safeCategory: SafeProviderErrorCategory;

  constructor(safeCategory: SafeProviderErrorCategory, message: string) {
    super(message);
    this.name = "ProviderError";
    this.safeCategory = safeCategory;
  }
}

export class NvidiaNimLLMProvider implements LLMProvider {
  readonly providerKind = "nvidia_nim";

  private readonly bearerToken: string;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly providerCallIdFactory: () => string;
  private readonly systemInstruction: string;

  constructor(options: NvidiaNimLLMProviderOptions) {
    const bearerToken = options.bearerToken.trim();
    if (bearerToken.length === 0) {
      throw new ProviderError(
        "not_configured",
        "NVIDIA NIM API Key is not configured",
      );
    }

    this.bearerToken = bearerToken;
    this.baseUrl = trimTrailingSlash(
      options.baseUrl?.trim() || DEFAULT_NVIDIA_NIM_BASE_URL,
    );
    this.fetchFn = options.fetch ?? fetch;
    this.providerCallIdFactory = options.providerCallIdFactory ?? createUlid;
    this.systemInstruction =
      options.systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
  }

  async generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse> {
    const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: buildMessages(request, this.systemInstruction),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new ProviderError(
        mapHttpStatusToSafeCategory(response.status),
        "NVIDIA NIM request failed",
      );
    }

    const body = (await response
      .json()
      .catch(() => null)) as NvidiaNimChatCompletionResponse | null;
    if (!body) {
      throw new ProviderError(
        "invalid_response",
        "NVIDIA NIM response was invalid",
      );
    }

    const replyText = body.choices?.[0]?.message?.content;
    if (typeof replyText !== "string" || replyText.length === 0) {
      throw new ProviderError(
        "invalid_response",
        "NVIDIA NIM response was invalid",
      );
    }

    return {
      providerCallId: this.providerCallIdFactory(),
      model: typeof body.model === "string" ? body.model : request.model,
      replyText,
    };
  }

  getStatus(): ProviderRuntimeStatus {
    return {
      providerKind: this.providerKind,
      configuredProviderAccessStatus: "available",
    };
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildMessages(
  request: ProviderGenerateRequest,
  systemInstruction: string,
): NvidiaNimMessage[] {
  const messages: NvidiaNimMessage[] = [
    { role: "system", content: systemInstruction },
  ];

  for (const contextMessage of request.conversationContextMessages ?? []) {
    const role =
      contextMessage.authorRelation === "bot_self" ? "assistant" : "user";
    messages.push({
      role,
      content: `[${contextMessage.authorRelation}] ${contextMessage.content}`,
    });
  }

  if (request.attachmentMetadata && request.attachmentMetadata.length > 0) {
    messages.push({
      role: "user",
      content: buildAttachmentMetadataSummary(request.attachmentMetadata),
    });
  }

  if (messages.length === 1) {
    messages.push({
      role: "user",
      content: `Respond to the Discord ${request.triggerKind} Response Trigger. No Conversation Context content was provided.`,
    });
  }

  return messages;
}

function buildAttachmentMetadataSummary(
  attachmentMetadata: readonly AttachmentMetadataInput[],
): string {
  const counts = {
    image: 0,
    text: 0,
    other: 0,
  };
  let totalSizeBytes = 0;
  let maxSizeBytes = 0;
  for (const attachment of attachmentMetadata) {
    counts[attachment.kind] += 1;
    totalSizeBytes += attachment.sizeBytes;
    maxSizeBytes = Math.max(maxSizeBytes, attachment.sizeBytes);
  }

  const contentTypes = [
    ...new Set(
      attachmentMetadata
        .map((attachment) => attachment.contentType)
        .filter((contentType): contentType is string => Boolean(contentType)),
    ),
  ].slice(0, 10);

  return [
    "Attachment metadata only is available for this Response Trigger.",
    `counts image=${counts.image} text=${counts.text} other=${counts.other}`,
    `totalSizeBytes=${totalSizeBytes}`,
    `maxSizeBytes=${maxSizeBytes}`,
    contentTypes.length > 0 ? `contentTypes=${contentTypes.join(",")}` : null,
    "Attachment URLs, bytes, filenames, and contents were not provided.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function mapHttpStatusToSafeCategory(
  status: number,
): SafeProviderErrorCategory {
  if (status === 401 || status === 403) {
    return "authentication_failed";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 400 || status === 422) {
    return "policy_rejected";
  }
  if (status >= 500 && status <= 599) {
    return "temporary_unavailable";
  }
  return "unknown";
}
