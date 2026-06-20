import { buildRetentionCleanupPlan } from "@dc-chatbot/data";
import { FakeChatGPTSubscriptionProvider } from "@dc-chatbot/provider";
import {
  BotMessageIntakeRequestSchema,
  BotRespondRequestSchema,
  type BotMessageIntakeResponse,
  type BotRespondResponse,
  type HealthResponse,
  type OwnerMeResponse,
  type OwnerRole,
  parseJson,
} from "@dc-chatbot/shared";

export type Env = {
  DB?: D1Database;
  ALLOW_LOCAL_AUTH_BYPASS?: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DEFAULT_FAKE_CONNECTION_ID?: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

function localAuthBypassEnabled(env: Env): boolean {
  return env.ALLOW_LOCAL_AUTH_BYPASS === "true";
}

function getOwnerRole(value: string | null): OwnerRole {
  return value === "regular_owner" ? "regular_owner" : "admin_owner";
}

function authenticateOwner(request: Request, env: Env): OwnerMeResponse | null {
  const accessSubject = request.headers.get(
    "cf-access-authenticated-user-email",
  );
  if (accessSubject) {
    return {
      ownerDiscordUserId: request.headers.get("x-owner-discord-user-id") ?? "0",
      role: getOwnerRole(request.headers.get("x-owner-role")),
      connectionStatus: "missing",
    };
  }

  if (localAuthBypassEnabled(env)) {
    return {
      ownerDiscordUserId:
        request.headers.get("x-dev-owner-discord-user-id") ?? "1",
      role: getOwnerRole(request.headers.get("x-dev-owner-role")),
      connectionStatus: "missing",
    };
  }

  return null;
}

function authenticateBotService(request: Request, env: Env): boolean {
  if (
    localAuthBypassEnabled(env) &&
    request.headers.get("x-dev-bot-service") === "true"
  ) {
    return true;
  }

  const configuredClientId = env.CF_ACCESS_CLIENT_ID;
  const configuredClientSecret = env.CF_ACCESS_CLIENT_SECRET;
  if (!configuredClientId || !configuredClientSecret) {
    return false;
  }

  return (
    request.headers.get("cf-access-client-id") === configuredClientId &&
    request.headers.get("cf-access-client-secret") === configuredClientSecret
  );
}

async function parseRequestJson(request: Request): Promise<unknown> {
  return request.json();
}

function handleHealth(): Response {
  const body: HealthResponse = { status: "ok", service: "dc-chatbot-api" };
  return jsonResponse(body);
}

function handleOwnerMe(request: Request, env: Env): Response {
  const owner = authenticateOwner(request, env);
  if (!owner) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  return jsonResponse(owner);
}

async function handleBotMessageIntake(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!authenticateBotService(request, env)) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  let intake;
  try {
    intake = parseJson(
      BotMessageIntakeRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }

  const response: BotMessageIntakeResponse = intake.isAllowedUser
    ? {
        requestId: intake.requestId,
        action:
          intake.triggerKind === "dm"
            ? "respond_without_context"
            : "fetch_context",
        reason:
          intake.triggerKind === "dm" ? "allowed_dm" : "allowed_guild_mention",
        contextMessageLimit: intake.triggerKind === "dm" ? 0 : 20,
      }
    : {
        requestId: intake.requestId,
        action: intake.isAutomatedSource ? "ignore" : "record_candidate",
        reason: intake.isAutomatedSource
          ? "automated_source_ignored"
          : "non_allowed_user",
      };

  return jsonResponse(response);
}

async function handleBotRespond(request: Request, env: Env): Promise<Response> {
  if (!authenticateBotService(request, env)) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  let respondRequest;
  try {
    respondRequest = parseJson(
      BotRespondRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }

  const provider = new FakeChatGPTSubscriptionProvider();
  const providerResponse = await provider.generateResponse({
    requestId: respondRequest.requestId,
    effectiveConnectionId:
      env.DEFAULT_FAKE_CONNECTION_ID ?? respondRequest.effectiveConnectionId,
    model: respondRequest.model,
    triggerKind: respondRequest.triggerKind,
    conversationContextMessageIds: respondRequest.conversationContextMessageIds,
  });

  const body: BotRespondResponse = {
    requestId: respondRequest.requestId,
    providerCallId: providerResponse.providerCallId,
    replyChunks: [providerResponse.replyText],
  };
  return jsonResponse(body);
}

export async function runScheduledCleanup(
  env: Env,
  nowIsoUtc = new Date().toISOString(),
): Promise<void> {
  if (!env.DB) {
    return;
  }

  const plan = buildRetentionCleanupPlan(nowIsoUtc);
  await Promise.all(plan.map((item) => env.DB?.prepare(item.sql).run()));
}

async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return handleHealth();
  }

  if (request.method === "GET" && url.pathname === "/api/v1/owner/me") {
    return handleOwnerMe(request, env);
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/v1/bot/messages/intake"
  ) {
    return handleBotMessageIntake(request, env);
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/v1/bot/messages/respond"
  ) {
    return handleBotRespond(request, env);
  }

  return jsonResponse({ error: "not_found" }, { status: 404 });
}

export default {
  fetch,
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledCleanup(env));
  },
};
