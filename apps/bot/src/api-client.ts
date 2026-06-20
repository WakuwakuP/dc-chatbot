import {
  BotMessageIntakeResponseSchema,
  BotRespondResponseSchema,
  HealthResponseSchema,
  type BotMessageIntakeRequest,
  type BotMessageIntakeResponse,
  type BotRespondRequest,
  type BotRespondResponse,
  parseJson,
} from "@dc-chatbot/shared";

export type BotApiRetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
};

export type BotApiClientOptions = {
  apiBaseUrl: string;
  cloudflareAccessClientId: string;
  cloudflareAccessClientSecret: string;
  fetch?: typeof globalThis.fetch;
  retryPolicy?: Partial<BotApiRetryPolicy>;
};

export type BotApiClient = {
  checkHealth(): Promise<void>;
  intakeMessage(
    request: BotMessageIntakeRequest,
  ): Promise<BotMessageIntakeResponse>;
  requestResponse(request: BotRespondRequest): Promise<BotRespondResponse>;
};

type RequestMethod = "GET" | "POST";

type RequestOptions = {
  method: RequestMethod;
  body?: unknown;
};

const DEFAULT_RETRY_POLICY: BotApiRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  timeoutMs: 10_000,
};

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429]);

export class BotApiRequestError extends Error {
  readonly status: number | null;
  readonly isTransient: boolean;

  constructor(
    message: string,
    options: { status: number | null; isTransient: boolean },
  ) {
    super(message);
    this.name = "BotApiRequestError";
    this.status = options.status;
    this.isTransient = options.isTransient;
  }
}

export function isTransientBotApiError(error: unknown): boolean {
  return error instanceof BotApiRequestError && error.isTransient;
}

export function createBotApiClient(options: BotApiClientOptions): BotApiClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = options.apiBaseUrl.replace(/\/$/u, "");
  const retryPolicy: BotApiRetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    ...options.retryPolicy,
  };

  async function requestJson(
    path: string,
    request: RequestOptions,
  ): Promise<unknown> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
      try {
        const init: RequestInit = {
          method: request.method,
          headers: {
            "content-type": "application/json",
            "cf-access-client-id": options.cloudflareAccessClientId,
            "cf-access-client-secret": options.cloudflareAccessClientSecret,
          },
        };
        if (request.method === "POST") {
          init.body = JSON.stringify(request.body);
        }

        const response = await fetchWithTimeout(
          fetchImpl,
          `${baseUrl}${path}`,
          init,
          retryPolicy.timeoutMs,
        );

        if (!response.ok) {
          throw new BotApiRequestError(
            `Bot API request failed with status ${response.status}`,
            {
              status: response.status,
              isTransient: isRetryableStatus(response.status),
            },
          );
        }

        return response.json();
      } catch (error) {
        lastError = toBotApiRequestError(error);
        if (!shouldRetry(lastError, attempt, retryPolicy.maxAttempts)) {
          throw lastError;
        }
        await sleep(backoffDelayMs(attempt, retryPolicy));
      }
    }

    throw toBotApiRequestError(lastError);
  }

  return {
    async checkHealth() {
      const health = parseJson(
        HealthResponseSchema,
        await requestJson("/health", { method: "GET" }),
      );
      if (health.status !== "ok") {
        throw new BotApiRequestError("Bot API health check failed", {
          status: null,
          isTransient: true,
        });
      }
    },
    async intakeMessage(request) {
      return parseJson(
        BotMessageIntakeResponseSchema,
        await requestJson("/api/v1/bot/messages/intake", {
          method: "POST",
          body: request,
        }),
      );
    },
    async requestResponse(request) {
      return parseJson(
        BotRespondResponseSchema,
        await requestJson("/api/v1/bot/messages/respond", {
          method: "POST",
          body: request,
        }),
      );
    },
  };
}

// TODO: Add owner notification delivery endpoints here when the shared Bot/API
// contract defines delivery instructions and status update DTOs. Until then the
// Bot Worker must not invent a cross-boundary owner notification payload locally.

async function fetchWithTimeout(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new BotApiRequestError("Bot API request timed out", {
        status: null,
        isTransient: true,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || RETRYABLE_STATUS_CODES.has(status);
}

function shouldRetry(
  error: unknown,
  attempt: number,
  maxAttempts: number,
): boolean {
  return (
    attempt < maxAttempts &&
    error instanceof BotApiRequestError &&
    error.isTransient
  );
}

function toBotApiRequestError(error: unknown): BotApiRequestError {
  if (error instanceof BotApiRequestError) {
    return error;
  }

  if (isAbortError(error)) {
    return new BotApiRequestError("Bot API request timed out", {
      status: null,
      isTransient: true,
    });
  }

  return new BotApiRequestError("Bot API request failed", {
    status: null,
    isTransient: true,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function backoffDelayMs(attempt: number, policy: BotApiRetryPolicy): number {
  const exponentialDelay = policy.baseDelayMs * 2 ** (attempt - 1);
  const jitterMs = Math.floor(Math.random() * Math.max(1, policy.baseDelayMs));
  return Math.min(policy.maxDelayMs, exponentialDelay + jitterMs);
}

function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
