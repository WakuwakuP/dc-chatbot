import { createUlid } from "@dc-chatbot/shared";
import type { AttachmentMetadataInput } from "@dc-chatbot/shared";
import type {
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResponse,
  ProviderResponseDecisionRequest,
  ProviderResponseDecisionResponse,
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

type ResponseDecisionJson = {
  shouldRespond?: unknown;
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
  readonly safeDiagnosticCode: string | null;

  constructor(
    safeCategory: SafeProviderErrorCategory,
    message: string,
    safeDiagnosticCode: string | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
    this.safeCategory = safeCategory;
    this.safeDiagnosticCode = safeDiagnosticCode;
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
    const fetchFn = options.fetch ?? fetch;
    this.fetchFn = (input, init) => fetchFn.call(globalThis, input, init);
    this.providerCallIdFactory = options.providerCallIdFactory ?? createUlid;
    this.systemInstruction =
      options.systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
  }

  async generateResponse(
    request: ProviderGenerateRequest,
  ): Promise<ProviderGenerateResponse> {
    return this.requestChatCompletion({
      model: request.model,
      messages: buildMessages(request, this.systemInstruction),
    });
  }

  async decideResponse(
    request: ProviderResponseDecisionRequest,
  ): Promise<ProviderResponseDecisionResponse> {
    const response = await this.requestChatCompletion({
      model: request.model,
      messages: buildResponseDecisionMessages(request),
    });

    const decision = parseResponseDecision(response.replyText, request);
    return {
      providerCallId: response.providerCallId,
      model: response.model,
      decision,
    };
  }

  getStatus(): ProviderRuntimeStatus {
    return {
      providerKind: this.providerKind,
      configuredProviderAccessStatus: "available",
    };
  }

  private async requestChatCompletion(input: {
    model: string;
    messages: readonly NvidiaNimMessage[];
  }): Promise<ProviderGenerateResponse> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.bearerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          stream: false,
        }),
      });
    } catch (error) {
      throw new ProviderError(
        "temporary_unavailable",
        "NVIDIA NIM request failed",
        safeFetchFailureDiagnosticCode(error),
      );
    }

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
      model: typeof body.model === "string" ? body.model : input.model,
      replyText,
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
    if (contextMessage.authorRelation === "bot_self") {
      messages.push({
        role: "assistant",
        content: contextMessage.content,
      });
      continue;
    }

    messages.push({
      role: "user",
      content: [
        `Context author relation: ${contextMessage.authorRelation}`,
        "Message content:",
        contextMessage.content,
      ].join("\n"),
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

function buildResponseDecisionMessages(
  request: ProviderResponseDecisionRequest,
): NvidiaNimMessage[] {
  const contextSummary = request.conversationContextMessages
    .map((message) =>
      [
        `messageId=${message.messageId}`,
        `authorRelation=${message.authorRelation}`,
        "content:",
        message.content,
      ].join("\n"),
    )
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "You decide whether this Discord Private Bot should respond to the current Response Trigger.",
        'Return only a JSON object with this exact shape: {"shouldRespond":true} or {"shouldRespond":false}.',
        "Respond true when the selected Conversation Context shows the bot is being asked or expected to answer.",
        "Respond false when the mention is only incidental, quoted, already answered, or not actionable.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `triggerKind=${request.triggerKind}`,
        `triggerMessageId=${request.triggerMessageId}`,
        `selectedContextMessageIds=${request.selectedContextMessageIds.join(",")}`,
        "Selected Conversation Context:",
        contextSummary || "(none)",
      ].join("\n"),
    },
  ];
}

function parseResponseDecision(
  replyText: string,
  request: ProviderResponseDecisionRequest,
): ProviderResponseDecisionResponse["decision"] {
  const parsed = parseJsonObject(replyText);
  if (typeof parsed.shouldRespond !== "boolean") {
    throw new ProviderError(
      "invalid_response",
      "NVIDIA NIM response decision was invalid",
    );
  }

  return {
    shouldRespond: parsed.shouldRespond,
    reason: parsed.shouldRespond
      ? responseDecisionPositiveReason(request.triggerKind)
      : "trigger_message_not_selected",
  };
}

function responseDecisionPositiveReason(
  triggerKind: ProviderResponseDecisionRequest["triggerKind"],
): ProviderResponseDecisionResponse["decision"]["reason"] {
  if (triggerKind === "automated_trigger_source") {
    return "automated_trigger_source";
  }
  if (triggerKind === "dm") {
    return "dm_allowed";
  }
  return "selected_context_available";
}

function parseJsonObject(value: string): ResponseDecisionJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new ProviderError(
      "invalid_response",
      "NVIDIA NIM response decision was invalid",
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ProviderError(
      "invalid_response",
      "NVIDIA NIM response decision was invalid",
    );
  }
  return parsed as ResponseDecisionJson;
}

function mapHttpStatusToSafeCategory(
  status: number,
): SafeProviderErrorCategory {
  if (status === 401 || status === 403) {
    return "authentication_failed";
  }
  if (status === 404) {
    return "not_configured";
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

function safeFetchFailureDiagnosticCode(error: unknown): string {
  const errorRecord = asRecord(error);
  const causeRecord = asRecord(errorRecord?.cause);
  const causeCode = causeRecord?.code;
  if (typeof causeCode === "string" && /^[A-Z0-9_]+$/u.test(causeCode)) {
    return causeCode;
  }
  const message = errorRecord?.message;
  if (typeof message === "string") {
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes("invalid url")) {
      return "invalid_url";
    }
    if (normalizedMessage.includes("fetch failed")) {
      return "fetch_failed";
    }
    if (normalizedMessage.includes("failed to fetch")) {
      return "failed_to_fetch";
    }
    if (normalizedMessage.includes("aborted")) {
      return "aborted";
    }
  }
  const errorName = errorRecord?.name;
  if (typeof errorName === "string" && /^[A-Za-z0-9_]+$/u.test(errorName)) {
    return errorName;
  }
  return "fetch_failed";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}
