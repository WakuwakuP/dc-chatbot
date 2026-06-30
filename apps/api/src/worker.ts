import {
  D1DcChatbotRepository,
  addDaysIso,
  buildRetentionCleanupPlan,
  type AutomatedTriggerSourceRecord,
  type OwnerRecord,
} from "@dc-chatbot/data";
import { canManageOwnerSettings } from "@dc-chatbot/domain";
import {
  ProviderError,
  createLLMProvider,
  type CreateLLMProviderOptions,
  type ProviderGenerateResponse,
  type ProviderResponseDecisionResponse,
} from "@dc-chatbot/provider";
import {
  BotMessageIntakeRequestSchema,
  BotOwnerNotificationDeliveryListResponseSchema,
  BotOwnerNotificationDeliveryUpdateRequestSchema,
  BotRespondRequestSchema,
  CreateAutomatedTriggerSourceRequestSchema,
  CreateRegisteredMemberRequestSchema,
  DiscordResponseMessageMetadataRequestSchema,
  PromoteCandidateDiscordUserRequestSchema,
  UpdateAutomatedTriggerSourceRequestSchema,
  UpdateBotSettingsRequestSchema,
  UpdateModelSettingsRequestSchema,
  UpdatePromptSettingsMetadataRequestSchema,
  createUlid,
  type BotMessageIntakeResponse,
  type BotRespondRequest,
  type BotOwnerNotificationDeliveryListResponse,
  type BotRespondResponse,
  type ConfiguredProviderAccessStatus,
  type ContextFetchPlan,
  type ConversationContextMessageInput,
  type FinalResponseDecision,
  type HealthResponse,
  type OwnerDashboardSummaryResponse,
  type OwnerMeResponse,
  type OwnerNotificationListResponse,
  type OwnerRole,
  type ProviderCallStage,
  type ProblemDetails,
  type SafeProviderErrorCategory,
  parseJson,
} from "@dc-chatbot/shared";

export type Env = {
  DB?: D1Database;
  DC_CHATBOT_ENV?: string;
  ALLOW_LOCAL_AUTH_BYPASS?: string;
  LOCAL_AUTH_BYPASS_SECRET?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_BOT_ACCESS_AUD?: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  OWNER_WEB_ORIGIN?: string;
  LLM_PROVIDER?: "fake" | "nvidia_nim";
  NVIDIA_NIM_BEARER_TOKEN?: string;
  NVIDIA_NIM_BASE_URL?: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

const DEFAULT_OWNER_WEB_ORIGIN = "https://chatbot.waku.dev";
const LOCAL_OWNER_WEB_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

function problemResponse(
  status: number,
  code: string,
  title: string,
  requestId?: string,
): Response {
  const body: ProblemDetails = requestId
    ? { type: "about:blank", title, status, code, requestId }
    : { type: "about:blank", title, status, code };
  return jsonResponse(body, { status });
}

function localAuthBypassConfigured(env: Env): boolean {
  return (
    env.DC_CHATBOT_ENV !== undefined &&
    env.DC_CHATBOT_ENV !== "production" &&
    env.ALLOW_LOCAL_AUTH_BYPASS === "true" &&
    env.LOCAL_AUTH_BYPASS_SECRET !== undefined &&
    env.LOCAL_AUTH_BYPASS_SECRET.length > 0
  );
}

function hasValidLocalAuthBypass(request: Request, env: Env): boolean {
  return (
    localAuthBypassConfigured(env) &&
    request.headers.get("x-dev-auth-secret") === env.LOCAL_AUTH_BYPASS_SECRET
  );
}

function getOwnerRole(value: string | null): OwnerRole {
  return value === "regular_owner" ? "regular_owner" : "admin_owner";
}

function createRepository(env: Env): D1DcChatbotRepository | null {
  return env.DB ? new D1DcChatbotRepository(env.DB) : null;
}

function createLLMProviderOptions(env: Env): CreateLLMProviderOptions {
  if (env.LLM_PROVIDER !== "nvidia_nim") {
    return { providerKind: "fake" };
  }

  const nvidiaNim = env.NVIDIA_NIM_BASE_URL
    ? {
        bearerToken: env.NVIDIA_NIM_BEARER_TOKEN ?? "",
        baseUrl: env.NVIDIA_NIM_BASE_URL,
      }
    : {
        bearerToken: env.NVIDIA_NIM_BEARER_TOKEN ?? "",
      };
  return { providerKind: "nvidia_nim", nvidiaNim };
}

type ActiveProviderIdentity =
  | { providerKind: "fake"; providerRef: "local" }
  | { providerKind: "nvidia_nim"; providerRef: "deployment" };

function activeProviderIdentity(env: Env): ActiveProviderIdentity {
  return env.LLM_PROVIDER === "nvidia_nim"
    ? { providerKind: "nvidia_nim", providerRef: "deployment" }
    : { providerKind: "fake", providerRef: "local" };
}

function configuredProviderAccessStatus(env: Env): {
  status: ConfiguredProviderAccessStatus;
  safeErrorCategory: SafeProviderErrorCategory | null;
} {
  if (env.LLM_PROVIDER !== "nvidia_nim") {
    return { status: "available", safeErrorCategory: null };
  }

  if ((env.NVIDIA_NIM_BEARER_TOKEN ?? "").trim().length === 0) {
    return { status: "not_configured", safeErrorCategory: "not_configured" };
  }

  return { status: "available", safeErrorCategory: null };
}

function safeProviderErrorCategory(error: unknown): SafeProviderErrorCategory {
  return error instanceof ProviderError ? error.safeCategory : "unknown";
}

function providerErrorStatus(category: SafeProviderErrorCategory): number {
  switch (category) {
    case "not_configured":
    case "authentication_failed":
    case "temporary_unavailable":
      return 503;
    case "rate_limited":
      return 429;
    case "policy_rejected":
      return 422;
    default:
      return 502;
  }
}

function providerProblemCode(category: SafeProviderErrorCategory): string {
  switch (category) {
    case "not_configured":
      return "provider_not_configured";
    case "authentication_failed":
      return "provider_authentication_failed";
    default:
      return "provider_unavailable";
  }
}

function providerAccessStatusForError(
  category: SafeProviderErrorCategory,
): ConfiguredProviderAccessStatus {
  return category === "not_configured" ? "not_configured" : "unavailable";
}

const ACCESS_JWT_CLOCK_TOLERANCE_SECONDS = 60;

function decodeBase64OrBase64Url(value: string): Uint8Array | null {
  const normalized = value.trim().replaceAll("-", "+").replaceAll("_", "/");
  const paddingRemainder = normalized.length % 4;
  if (paddingRemainder === 1) {
    return null;
  }

  const padded =
    paddingRemainder === 0
      ? normalized
      : normalized.padEnd(normalized.length + 4 - paddingRemainder, "=");

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

type AccessJwtHeader = {
  alg?: unknown;
  kid?: unknown;
};

type AccessJwtPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  nbf?: unknown;
  sub?: unknown;
};

type JsonWebKeySet = {
  keys?: unknown;
};

function decodeBase64UrlToString(value: string): string | null {
  const bytes = decodeBase64OrBase64Url(value);
  if (!bytes) {
    return null;
  }

  let result = "";
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return result;
}

function parseJwtJson<T>(value: string): T | null {
  const json = decodeBase64UrlToString(value);
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function normalizeAccessTeamDomain(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname.length === 0 || hostname.length > 253) {
    return null;
  }

  const labels = hostname.split(".");
  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return null;
  }

  const validLabelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  if (!labels.every((label) => validLabelPattern.test(label))) {
    return null;
  }

  return hostname;
}

function jwtAudienceContains(
  audience: unknown,
  expectedAudience: string,
): boolean {
  if (typeof audience === "string") {
    return audience === expectedAudience;
  }

  return (
    Array.isArray(audience) &&
    audience.some(
      (item) => typeof item === "string" && item === expectedAudience,
    )
  );
}

function validNumericDateClaim(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateJwtTiming(payload: AccessJwtPayload): boolean {
  const nowSeconds = Date.now() / 1000;

  if (payload.exp !== undefined) {
    if (!validNumericDateClaim(payload.exp)) {
      return false;
    }
    if (payload.exp + ACCESS_JWT_CLOCK_TOLERANCE_SECONDS < nowSeconds) {
      return false;
    }
  }

  if (payload.nbf !== undefined) {
    if (!validNumericDateClaim(payload.nbf)) {
      return false;
    }
    if (payload.nbf - ACCESS_JWT_CLOCK_TOLERANCE_SECONDS > nowSeconds) {
      return false;
    }
  }

  return true;
}

function extractAccessJwtSubject(payload: AccessJwtPayload): string | null {
  if (typeof payload.email === "string" && payload.email.trim().length > 0) {
    return payload.email;
  }

  if (typeof payload.sub === "string" && payload.sub.trim().length > 0) {
    return payload.sub;
  }

  return null;
}

function isJwkWithKid(value: unknown): value is JsonWebKey & { kid: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "kid" in value &&
    typeof value.kid === "string" &&
    value.kid.length > 0
  );
}

async function fetchAccessJwk(
  teamDomain: string,
  kid: string,
): Promise<(JsonWebKey & { kid: string }) | null> {
  const response = await globalThis.fetch(
    `https://${teamDomain}/cdn-cgi/access/certs`,
  );
  if (!response.ok) {
    return null;
  }

  const jwks = (await response.json()) as JsonWebKeySet;
  if (!Array.isArray(jwks.keys)) {
    return null;
  }

  return jwks.keys.find((key) => isJwkWithKid(key) && key.kid === kid) ?? null;
}

async function verifyAccessJwtPayload(
  token: string,
  env: Env,
  expectedAudience: string | undefined,
): Promise<AccessJwtPayload | null> {
  const teamDomain = normalizeAccessTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = expectedAudience?.trim();
  if (!teamDomain || !audience) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  const header = parseJwtJson<AccessJwtHeader>(encodedHeader);
  if (
    !header ||
    header.alg !== "RS256" ||
    typeof header.kid !== "string" ||
    header.kid.length === 0
  ) {
    return null;
  }

  const payload = parseJwtJson<AccessJwtPayload>(encodedPayload);
  if (!payload) {
    return null;
  }

  if (
    !validateJwtTiming(payload) ||
    !jwtAudienceContains(payload.aud, audience)
  ) {
    return null;
  }

  try {
    const jwk = await fetchAccessJwk(teamDomain, header.kid);
    if (!jwk) {
      return null;
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = decodeBase64OrBase64Url(encodedSignature);
    if (!signature) {
      return null;
    }

    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    return verified ? payload : null;
  } catch {
    return null;
  }
}

async function verifyAccessJwt(
  token: string,
  env: Env,
): Promise<string | null> {
  const payload = await verifyAccessJwtPayload(token, env, env.CF_ACCESS_AUD);
  if (!payload) {
    return null;
  }
  return extractAccessJwtSubject(payload);
}

async function verifyBotAccessJwt(
  request: Request,
  env: Env,
): Promise<boolean> {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) {
    return false;
  }
  return (
    (await verifyAccessJwtPayload(jwt, env, env.CF_BOT_ACCESS_AUD)) !== null
  );
}

async function getAccessSubject(
  request: Request,
  env: Env,
): Promise<string | null> {
  if (hasValidLocalAuthBypass(request, env)) {
    const devAccessSubject = request.headers.get("x-dev-access-subject");
    if (devAccessSubject) {
      return devAccessSubject;
    }
  }

  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) {
    return null;
  }

  return verifyAccessJwt(jwt, env);
}

type OwnerAuth = {
  owner: OwnerMeResponse;
  record: OwnerRecord;
  repository: D1DcChatbotRepository | null;
};

type OwnerAuthWithRepository = OwnerAuth & {
  repository: D1DcChatbotRepository;
};

async function authenticateOwner(
  request: Request,
  env: Env,
): Promise<OwnerAuth | null> {
  const repository = createRepository(env);
  const accessSubject = await getAccessSubject(request, env);

  if (repository && accessSubject) {
    const record = await repository.findOwnerByAccessSubject(accessSubject);
    if (!record) {
      return null;
    }

    const owner: OwnerMeResponse = {
      ownerDiscordUserId: record.ownerDiscordUserId,
      role: record.role,
    };
    return { owner, record, repository };
  }

  const devAccessSubject = request.headers.get("x-dev-access-subject");
  const devOwnerDiscordUserId = request.headers.get(
    "x-dev-owner-discord-user-id",
  );
  if (
    hasValidLocalAuthBypass(request, env) &&
    !repository &&
    devAccessSubject &&
    devOwnerDiscordUserId
  ) {
    const record: OwnerRecord = {
      ownerDiscordUserId: devOwnerDiscordUserId,
      role: getOwnerRole(request.headers.get("x-dev-owner-role")),
    };
    return {
      record,
      repository: null,
      owner: { ...record },
    };
  }

  return null;
}

async function requireOwnerWithRepository(
  request: Request,
  env: Env,
): Promise<OwnerAuthWithRepository | Response> {
  const auth = await authenticateOwner(request, env);
  if (!auth) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }
  if (!auth.repository) {
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }
  return { ...auth, repository: auth.repository };
}

async function authenticateBotService(
  request: Request,
  env: Env,
): Promise<boolean> {
  if (
    hasValidLocalAuthBypass(request, env) &&
    request.headers.get("x-dev-bot-service") === "true"
  ) {
    return true;
  }

  const configuredClientId = env.CF_ACCESS_CLIENT_ID;
  const configuredClientSecret = env.CF_ACCESS_CLIENT_SECRET;
  if (
    configuredClientId &&
    configuredClientSecret &&
    request.headers.get("cf-access-client-id") === configuredClientId &&
    request.headers.get("cf-access-client-secret") === configuredClientSecret
  ) {
    return true;
  }

  return verifyBotAccessJwt(request, env);
}

async function parseRequestJson(request: Request): Promise<unknown> {
  return request.json();
}

function handleHealth(): Response {
  const body: HealthResponse = { status: "ok", service: "dc-chatbot-api" };
  return jsonResponse(body);
}

async function handleOwnerMe(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateOwner(request, env);
  if (!auth) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }

  return jsonResponse(auth.owner);
}

function buildContextFetchPlan(
  triggerKind:
    | "dm"
    | "guild_mention"
    | "guild_message"
    | "automated_trigger_source",
): ContextFetchPlan {
  if (triggerKind === "dm") {
    return { kind: "dm_recent", limit: 30, includeTriggerMessage: true };
  }

  if (triggerKind === "automated_trigger_source") {
    return {
      kind: "automated_trigger_only",
      limit: 1,
      includeTriggerMessage: true,
    };
  }

  return { kind: "guild_recent", limit: 20, includeTriggerMessage: true };
}

function fallbackIntakeDecision(intake: {
  requestId: string;
  isAllowedUser: boolean;
  isAutomatedSource: boolean;
  triggerKind:
    | "dm"
    | "guild_mention"
    | "guild_message"
    | "automated_trigger_source";
}): BotMessageIntakeResponse {
  if (intake.isAllowedUser) {
    return {
      requestId: intake.requestId,
      action:
        intake.triggerKind === "dm"
          ? "respond_without_context"
          : "fetch_context",
      reason:
        intake.triggerKind === "dm"
          ? "allowed_dm"
          : intake.triggerKind === "guild_message"
            ? "allowed_guild_message"
            : "allowed_guild_mention",
      contextMessageLimit: intake.triggerKind === "dm" ? 0 : 20,
      contextFetchPlan:
        intake.triggerKind === "dm"
          ? undefined
          : buildContextFetchPlan(intake.triggerKind),
    };
  }

  return {
    requestId: intake.requestId,
    action: intake.isAutomatedSource ? "ignore" : "record_candidate",
    reason: intake.isAutomatedSource
      ? "automated_source_ignored"
      : "non_allowed_user",
  };
}

function allowedReason(
  triggerKind:
    | "dm"
    | "guild_mention"
    | "guild_message"
    | "automated_trigger_source",
): BotMessageIntakeResponse["reason"] {
  if (triggerKind === "dm") {
    return "allowed_dm";
  }
  if (triggerKind === "automated_trigger_source") {
    return "allowed_automated_source";
  }
  if (triggerKind === "guild_message") {
    return "allowed_guild_message";
  }
  return "allowed_guild_mention";
}

async function recordAudit(
  repository: D1DcChatbotRepository,
  input: {
    actorType: "owner" | "bot_service" | "scheduled";
    requestId: string;
    eventType: string;
    status: "accepted" | "rejected" | "failed" | "completed";
    nowIsoUtc: string;
    errorCategory?: string | null;
    retentionDays?: number;
  },
): Promise<void> {
  await repository.insertRequestAudit({
    requestAuditId: createUlid(),
    requestId: input.requestId,
    actorType: input.actorType,
    eventType: input.eventType,
    status: input.status,
    errorCategory: input.errorCategory ?? null,
    durationMs: null,
    createdAt: input.nowIsoUtc,
    retainUntil: addDaysIso(input.nowIsoUtc, input.retentionDays ?? 365),
  });
}

async function recordDeterministicProviderStageAudit(
  repository: D1DcChatbotRepository,
  providerIdentity: ActiveProviderIdentity,
  input: {
    requestId: string;
    providerCallStage: ProviderCallStage;
    model: string;
    nowIsoUtc: string;
  },
): Promise<void> {
  await repository.insertProviderCallAudit({
    ...providerIdentity,
    providerCallId: createUlid(),
    requestId: input.requestId,
    model: input.model,
    providerCallStage: input.providerCallStage,
    status: "completed",
    safeErrorCategory: null,
    durationMs: 0,
    createdAt: input.nowIsoUtc,
    retainUntil: addDaysIso(input.nowIsoUtc, 365),
  });
}

async function modelSettingsNotConfiguredResponse(input: {
  repository: D1DcChatbotRepository;
  providerIdentity: ActiveProviderIdentity;
  requestId: string;
}): Promise<Response> {
  const failedAt = new Date().toISOString();
  await Promise.all([
    input.repository.upsertProviderConfigMetadata({
      providerKind: input.providerIdentity.providerKind,
      configuredProviderAccessStatus: "not_configured",
      checkedAt: failedAt,
      safeErrorCategory: "not_configured",
      nowIsoUtc: failedAt,
    }),
    recordAudit(input.repository, {
      actorType: "bot_service",
      requestId: input.requestId,
      eventType: "bot.message_respond.model_settings_not_configured",
      status: "failed",
      nowIsoUtc: failedAt,
      errorCategory: "model_settings_not_configured",
    }),
  ]);
  return problemResponse(
    503,
    "model_settings_not_configured",
    "Model settings are not configured",
    input.requestId,
  );
}

type ContextSelectionStageResult = {
  selectedContextMessageIds: readonly string[];
  selectedConversationContextMessages?: readonly ConversationContextMessageInput[];
};

function runDeterministicContextSelection(
  respondRequest: BotRespondRequest,
): ContextSelectionStageResult {
  const selectedContextMessageIds = uniqueStrings(
    respondRequest.conversationContextMessages
      ? respondRequest.conversationContextMessages.map(
          (message) => message.messageId,
        )
      : respondRequest.conversationContextMessageIds,
  );
  if (!respondRequest.conversationContextMessages) {
    return { selectedContextMessageIds };
  }

  const selectedIdSet = new Set(selectedContextMessageIds);
  return {
    selectedContextMessageIds,
    selectedConversationContextMessages:
      respondRequest.conversationContextMessages.filter((message) =>
        selectedIdSet.has(message.messageId),
      ),
  };
}

function runDeterministicResponseDecision(input: {
  triggerKind: BotRespondRequest["triggerKind"];
  triggerMessageId: string;
  selectedContextMessageIds: readonly string[];
}): FinalResponseDecision {
  if (input.triggerKind === "automated_trigger_source") {
    return { shouldRespond: true, reason: "automated_trigger_source" };
  }
  if (input.triggerKind === "dm") {
    return { shouldRespond: true, reason: "dm_allowed" };
  }
  if (input.selectedContextMessageIds.length === 0) {
    return { shouldRespond: false, reason: "no_selected_context" };
  }
  if (!input.selectedContextMessageIds.includes(input.triggerMessageId)) {
    return { shouldRespond: false, reason: "trigger_message_not_selected" };
  }
  return { shouldRespond: true, reason: "selected_context_available" };
}

function shouldUseProviderResponseDecision(input: {
  triggerKind: BotRespondRequest["triggerKind"];
  deterministicDecision: FinalResponseDecision;
  selectedConversationContextMessages:
    | readonly ConversationContextMessageInput[]
    | undefined;
}): boolean {
  return (
    (input.triggerKind === "guild_mention" ||
      input.triggerKind === "guild_message") &&
    input.deterministicDecision.shouldRespond &&
    input.selectedConversationContextMessages !== undefined &&
    input.selectedConversationContextMessages.length > 0
  );
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

async function recordOwnerSettingAudit(
  repository: D1DcChatbotRepository,
  auth: OwnerAuth,
  input: {
    settingCategory: string;
    eventType: string;
    beforeRef?: string | null;
    afterRef?: string | null;
    nowIsoUtc: string;
  },
): Promise<void> {
  await repository.insertSettingAudit({
    settingAuditId: createUlid(),
    actorOwnerDiscordUserId: auth.owner.ownerDiscordUserId,
    settingCategory: input.settingCategory,
    eventType: input.eventType,
    beforeRef: input.beforeRef ?? null,
    afterRef: input.afterRef ?? null,
    createdAt: input.nowIsoUtc,
    retainUntil: addDaysIso(input.nowIsoUtc, 365),
  });
}

function isCooldownSuppressed(
  source: AutomatedTriggerSourceRecord,
  nowIsoUtc: string,
): boolean {
  if (!source.lastTriggeredAt) {
    return false;
  }
  const lastTriggeredMs = new Date(source.lastTriggeredAt).getTime();
  const nowMs = new Date(nowIsoUtc).getTime();
  return nowMs - lastTriggeredMs < source.cooldownSeconds * 1000;
}

async function handleBotMessageIntake(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await authenticateBotService(request, env))) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }

  let intake;
  try {
    intake = parseJson(
      BotMessageIntakeRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }

  const repository = createRepository(env);
  if (!repository) {
    if (hasValidLocalAuthBypass(request, env)) {
      return jsonResponse(fallbackIntakeDecision(intake));
    }
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }

  const nowIsoUtc = intake.observedAt;
  const isAutomatedSource =
    intake.isAutomatedSource ||
    intake.authorIsBot === true ||
    intake.authorIsWebhook === true;

  await repository.upsertDiscordUser({
    discordUserId: intake.authorDiscordUserId,
    displayNameSnapshot: intake.authorDisplayNameSnapshot ?? null,
    observedAt: nowIsoUtc,
  });

  if (isAutomatedSource) {
    const automatedSource = await repository.findActiveAutomatedTriggerSource({
      sourceDiscordUserId: intake.authorDiscordUserId,
      sourceApplicationId: intake.authorApplicationId ?? null,
    });
    if (!automatedSource) {
      await recordAudit(repository, {
        actorType: "bot_service",
        requestId: intake.requestId,
        eventType: "bot.message_intake.automated_ignored",
        status: "rejected",
        nowIsoUtc,
        errorCategory: "automated_source_ignored",
        retentionDays: 30,
      });
      return jsonResponse({
        requestId: intake.requestId,
        action: "ignore",
        reason: "automated_source_ignored",
      } satisfies BotMessageIntakeResponse);
    }

    if (isCooldownSuppressed(automatedSource, nowIsoUtc)) {
      await recordAudit(repository, {
        actorType: "bot_service",
        requestId: intake.requestId,
        eventType: "bot.message_intake.automated_cooldown",
        status: "rejected",
        nowIsoUtc,
        errorCategory: "automated_source_cooldown",
        retentionDays: 30,
      });
      return jsonResponse({
        requestId: intake.requestId,
        action: "ignore",
        reason: "automated_source_cooldown",
      } satisfies BotMessageIntakeResponse);
    }

    await repository.markAutomatedTriggerSourceTriggered(
      automatedSource.automatedTriggerSourceId,
      nowIsoUtc,
    );
    await recordAudit(repository, {
      actorType: "bot_service",
      requestId: intake.requestId,
      eventType: "bot.message_intake.automated_allowed",
      status: "accepted",
      nowIsoUtc,
    });
    return jsonResponse({
      requestId: intake.requestId,
      action: "fetch_context",
      reason: "allowed_automated_source",
      contextMessageLimit: 1,
      contextFetchPlan: buildContextFetchPlan("automated_trigger_source"),
    } satisfies BotMessageIntakeResponse);
  }

  const allowedUser = await repository.findAllowedDiscordUser(
    intake.authorDiscordUserId,
  );

  if (!allowedUser) {
    await repository.upsertCandidate({
      candidateDiscordUserId: intake.authorDiscordUserId,
      observedInGuildId: intake.guildId ?? null,
      observedInChannelId: intake.channelId,
      observedAt: nowIsoUtc,
      expiresAt: addDaysIso(nowIsoUtc, 30),
    });
    if (intake.triggerKind === "dm") {
      const notificationOwnerDiscordUserId =
        await repository.getNotificationOwnerDiscordUserId();
      if (notificationOwnerDiscordUserId) {
        await repository.insertOwnerNotification({
          ownerNotificationId: createUlid(),
          notificationOwnerDiscordUserId,
          candidateDiscordUserId: intake.authorDiscordUserId,
          requestId: intake.requestId,
          triggerKind: intake.triggerKind,
          status: "pending_delivery",
          safeErrorCategory: null,
          createdAt: nowIsoUtc,
          retainUntil: addDaysIso(nowIsoUtc, 30),
        });
      }
    }
    await recordAudit(repository, {
      actorType: "bot_service",
      requestId: intake.requestId,
      eventType: "bot.message_intake.non_allowed",
      status: "rejected",
      nowIsoUtc,
      errorCategory: "non_allowed_user",
      retentionDays: 30,
    });
    return jsonResponse({
      requestId: intake.requestId,
      action: "record_candidate",
      reason: "non_allowed_user",
    } satisfies BotMessageIntakeResponse);
  }

  const response: BotMessageIntakeResponse = {
    requestId: intake.requestId,
    action: "fetch_context",
    reason: allowedReason(intake.triggerKind),
    contextMessageLimit: buildContextFetchPlan(intake.triggerKind).limit,
    contextFetchPlan: buildContextFetchPlan(intake.triggerKind),
  };

  await recordAudit(repository, {
    actorType: "bot_service",
    requestId: intake.requestId,
    eventType: `bot.message_intake.${allowedUser.kind}`,
    status: "accepted",
    nowIsoUtc,
  });

  return jsonResponse(response);
}

async function handleBotRespond(request: Request, env: Env): Promise<Response> {
  if (!(await authenticateBotService(request, env))) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }

  let respondRequest;
  try {
    respondRequest = parseJson(
      BotRespondRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }

  const repository = createRepository(env);
  if (!repository && !hasValidLocalAuthBypass(request, env)) {
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }

  const startedAt = Date.now();
  const nowIsoUtc = new Date(startedAt).toISOString();
  const providerIdentity = activeProviderIdentity(env);
  const respondMode = respondRequest.respondMode ?? "decide_and_generate";

  if (repository) {
    if (respondRequest.triggerKind === "automated_trigger_source") {
      const automatedSource = await repository.findActiveAutomatedTriggerSource(
        {
          sourceDiscordUserId: respondRequest.triggerAuthorDiscordUserId,
          sourceApplicationId:
            respondRequest.triggerAuthorApplicationId ?? null,
        },
      );
      if (!automatedSource) {
        await recordAudit(repository, {
          actorType: "bot_service",
          requestId: respondRequest.requestId,
          eventType: "bot.message_respond.non_allowed",
          status: "rejected",
          nowIsoUtc,
          errorCategory: "non_allowed_user",
          retentionDays: 30,
        });
        return problemResponse(
          403,
          "non_allowed_user",
          "Discord User is not allowed",
          respondRequest.requestId,
        );
      }
    } else {
      const allowedUser = await repository.findAllowedDiscordUser(
        respondRequest.triggerAuthorDiscordUserId,
      );
      if (!allowedUser) {
        await recordAudit(repository, {
          actorType: "bot_service",
          requestId: respondRequest.requestId,
          eventType: "bot.message_respond.non_allowed",
          status: "rejected",
          nowIsoUtc,
          errorCategory: "non_allowed_user",
          retentionDays: 30,
        });
        return problemResponse(
          403,
          "non_allowed_user",
          "Discord User is not allowed",
          respondRequest.requestId,
        );
      }
    }
  }

  const contextSelection =
    respondRequest.triggerKind === "automated_trigger_source"
      ? {
          selectedContextMessageIds: uniqueStrings(
            respondRequest.conversationContextMessages
              ? respondRequest.conversationContextMessages.map(
                  (message) => message.messageId,
                )
              : respondRequest.conversationContextMessageIds,
          ),
          selectedConversationContextMessages:
            respondRequest.conversationContextMessages,
        }
      : runDeterministicContextSelection(respondRequest);
  const deterministicDecision =
    respondRequest.triggerKind === "automated_trigger_source"
      ? ({
          shouldRespond: true,
          reason: "automated_trigger_source",
        } satisfies FinalResponseDecision)
      : runDeterministicResponseDecision({
          triggerKind: respondRequest.triggerKind,
          triggerMessageId: respondRequest.triggerMessageId,
          selectedContextMessageIds: contextSelection.selectedContextMessageIds,
        });
  let finalDecision: FinalResponseDecision = deterministicDecision;
  const providerConfig = repository
    ? await repository.getProviderConfigMetadata(nowIsoUtc)
    : null;
  const contextSelectionModel =
    providerConfig?.modelSettings.contextSelectionModel ?? respondRequest.model;
  const responseDecisionModel =
    providerConfig?.modelSettings.responseDecisionModel ?? respondRequest.model;
  const responseGenerationModel =
    providerConfig?.modelSettings.responseGenerationModel ??
    respondRequest.model;
  if (
    repository &&
    respondRequest.triggerKind !== "automated_trigger_source" &&
    respondMode !== "generate_only"
  ) {
    await recordDeterministicProviderStageAudit(repository, providerIdentity, {
      requestId: respondRequest.requestId,
      providerCallStage: "context_selection",
      model: contextSelectionModel,
      nowIsoUtc,
    });
    if (
      shouldUseProviderResponseDecision({
        triggerKind: respondRequest.triggerKind,
        deterministicDecision,
        selectedConversationContextMessages:
          contextSelection.selectedConversationContextMessages,
      })
    ) {
      let providerDecisionResponse: ProviderResponseDecisionResponse | null =
        null;
      if (
        providerIdentity.providerKind === "nvidia_nim" &&
        !(await repository.hasModelSettings())
      ) {
        return modelSettingsNotConfiguredResponse({
          repository,
          providerIdentity,
          requestId: respondRequest.requestId,
        });
      }
      try {
        const provider = createLLMProvider(createLLMProviderOptions(env));
        providerDecisionResponse = await provider.decideResponse({
          requestId: respondRequest.requestId,
          model: responseDecisionModel,
          triggerKind: respondRequest.triggerKind,
          triggerMessageId: respondRequest.triggerMessageId,
          selectedContextMessageIds: contextSelection.selectedContextMessageIds,
          conversationContextMessages:
            contextSelection.selectedConversationContextMessages ?? [],
        });
        finalDecision = providerDecisionResponse.decision;
      } catch (error) {
        const safeErrorCategory = safeProviderErrorCategory(error);
        if (error instanceof ProviderError) {
          console.info("dc-chatbot provider request failed", {
            eventType: "provider_request_failed",
            providerKind: providerIdentity.providerKind,
            providerCallStage: "response_decision",
            safeErrorCategory,
            safeDiagnosticCode: error.safeDiagnosticCode,
          });
        }
        const failedAt = new Date().toISOString();
        await Promise.all([
          repository.insertProviderCallAudit({
            ...providerIdentity,
            providerCallId: createUlid(),
            requestId: respondRequest.requestId,
            model: responseDecisionModel,
            providerCallStage: "response_decision",
            status: "failed",
            safeErrorCategory,
            durationMs: Date.now() - startedAt,
            createdAt: failedAt,
            retainUntil: addDaysIso(failedAt, 365),
          }),
          recordAudit(repository, {
            actorType: "bot_service",
            requestId: respondRequest.requestId,
            eventType: "bot.message_respond.response_decision_provider_failed",
            status: "failed",
            nowIsoUtc: failedAt,
            errorCategory: safeErrorCategory,
          }),
        ]);
        finalDecision = deterministicDecision;
      }
      if (providerDecisionResponse) {
        const decidedAt = new Date().toISOString();
        await repository.insertProviderCallAudit({
          ...providerIdentity,
          providerCallId: providerDecisionResponse.providerCallId,
          requestId: respondRequest.requestId,
          model: providerDecisionResponse.model,
          providerCallStage: "response_decision",
          status: "completed",
          safeErrorCategory: null,
          durationMs: Date.now() - startedAt,
          createdAt: decidedAt,
          retainUntil: addDaysIso(decidedAt, 365),
        });
      }
    } else {
      await recordDeterministicProviderStageAudit(
        repository,
        providerIdentity,
        {
          requestId: respondRequest.requestId,
          providerCallStage: "response_decision",
          model: responseDecisionModel,
          nowIsoUtc,
        },
      );
    }
    if (!finalDecision.shouldRespond) {
      const finishedAt = new Date().toISOString();
      await Promise.all([
        recordAudit(repository, {
          actorType: "bot_service",
          requestId: respondRequest.requestId,
          eventType: "bot.message_respond.skipped",
          status: "completed",
          nowIsoUtc: finishedAt,
        }),
        persistSelectedContextMessageIds(
          repository,
          respondRequest.requestId,
          contextSelection.selectedContextMessageIds,
          finishedAt,
          "rule_fallback",
        ),
      ]);
      return jsonResponse({
        requestId: respondRequest.requestId,
        decision: finalDecision,
        replyChunks: [],
        providerCallId: null,
      } satisfies BotRespondResponse);
    }
  }
  if (!finalDecision.shouldRespond) {
    return jsonResponse({
      requestId: respondRequest.requestId,
      decision: finalDecision,
      replyChunks: [],
      providerCallId: null,
    } satisfies BotRespondResponse);
  }
  if (respondMode === "decision_only") {
    return jsonResponse({
      requestId: respondRequest.requestId,
      decision: finalDecision,
      replyChunks: [],
      providerCallId: null,
    } satisfies BotRespondResponse);
  }

  const configuredAccess = configuredProviderAccessStatus(env);
  if (
    repository &&
    providerIdentity.providerKind === "nvidia_nim" &&
    !(await repository.hasModelSettings())
  ) {
    return modelSettingsNotConfiguredResponse({
      repository,
      providerIdentity,
      requestId: respondRequest.requestId,
    });
  }

  if (repository) {
    await repository.upsertProviderConfigMetadata({
      providerKind: providerIdentity.providerKind,
      configuredProviderAccessStatus: configuredAccess.status,
      checkedAt: nowIsoUtc,
      safeErrorCategory: configuredAccess.safeErrorCategory,
      nowIsoUtc,
    });
  }

  if (configuredAccess.status !== "available") {
    const failedAt = new Date().toISOString();
    const safeErrorCategory =
      configuredAccess.safeErrorCategory ?? "not_configured";
    if (repository) {
      await Promise.all([
        repository.insertProviderCallAudit({
          ...providerIdentity,
          providerCallId: createUlid(),
          requestId: respondRequest.requestId,
          model: responseGenerationModel,
          providerCallStage: "response_generation",
          status: "failed",
          safeErrorCategory,
          durationMs: Date.now() - startedAt,
          createdAt: failedAt,
          retainUntil: addDaysIso(failedAt, 365),
        }),
        recordAudit(repository, {
          actorType: "bot_service",
          requestId: respondRequest.requestId,
          eventType: "bot.message_respond.provider_failed",
          status: "failed",
          nowIsoUtc: failedAt,
          errorCategory: safeErrorCategory,
        }),
      ]);
    }
    return problemResponse(
      providerErrorStatus(safeErrorCategory),
      providerProblemCode(safeErrorCategory),
      "Provider unavailable",
      respondRequest.requestId,
    );
  }

  const safeAttachmentMetadata =
    respondRequest.triggerKind === "automated_trigger_source"
      ? undefined
      : respondRequest.attachmentMetadata;
  const attachmentMetadataInput = safeAttachmentMetadata
    ? { attachmentMetadata: safeAttachmentMetadata }
    : {};
  const providerRequest = contextSelection.selectedConversationContextMessages
    ? {
        requestId: respondRequest.requestId,
        model: responseGenerationModel,
        triggerKind: respondRequest.triggerKind,
        conversationContextMessageIds:
          contextSelection.selectedContextMessageIds,
        conversationContextMessages:
          contextSelection.selectedConversationContextMessages,
        ...attachmentMetadataInput,
      }
    : {
        requestId: respondRequest.requestId,
        model: responseGenerationModel,
        triggerKind: respondRequest.triggerKind,
        conversationContextMessageIds:
          contextSelection.selectedContextMessageIds,
        ...attachmentMetadataInput,
      };
  let providerResponse: ProviderGenerateResponse;
  try {
    const provider = createLLMProvider(createLLMProviderOptions(env));
    providerResponse = await provider.generateResponse(providerRequest);
  } catch (error) {
    const safeErrorCategory = safeProviderErrorCategory(error);
    if (error instanceof ProviderError) {
      console.info("dc-chatbot provider request failed", {
        eventType: "provider_request_failed",
        providerKind: providerIdentity.providerKind,
        providerCallStage: "response_generation",
        safeErrorCategory,
        safeDiagnosticCode: error.safeDiagnosticCode,
      });
    }
    const failedAt = new Date().toISOString();
    if (repository) {
      await Promise.all([
        repository.upsertProviderConfigMetadata({
          providerKind: providerIdentity.providerKind,
          configuredProviderAccessStatus:
            providerAccessStatusForError(safeErrorCategory),
          checkedAt: failedAt,
          safeErrorCategory,
          nowIsoUtc: failedAt,
        }),
        repository.insertProviderCallAudit({
          ...providerIdentity,
          providerCallId: createUlid(),
          requestId: respondRequest.requestId,
          model: responseGenerationModel,
          providerCallStage: "response_generation",
          status: "failed",
          safeErrorCategory,
          durationMs: Date.now() - startedAt,
          createdAt: failedAt,
          retainUntil: addDaysIso(failedAt, 365),
        }),
        recordAudit(repository, {
          actorType: "bot_service",
          requestId: respondRequest.requestId,
          eventType: "bot.message_respond.provider_failed",
          status: "failed",
          nowIsoUtc: failedAt,
          errorCategory: safeErrorCategory,
        }),
      ]);
    }
    return problemResponse(
      providerErrorStatus(safeErrorCategory),
      providerProblemCode(safeErrorCategory),
      "Provider unavailable",
      respondRequest.requestId,
    );
  }

  if (repository) {
    const finishedAt = new Date().toISOString();
    await Promise.all([
      repository.upsertProviderConfigMetadata({
        providerKind: providerIdentity.providerKind,
        configuredProviderAccessStatus: "available",
        checkedAt: finishedAt,
        safeErrorCategory: null,
        nowIsoUtc: finishedAt,
      }),
      repository.insertProviderCallAudit({
        ...providerIdentity,
        providerCallId: providerResponse.providerCallId,
        requestId: respondRequest.requestId,
        model: providerResponse.model,
        providerCallStage: "response_generation",
        status: "completed",
        safeErrorCategory: null,
        durationMs: Date.now() - startedAt,
        createdAt: finishedAt,
        retainUntil: addDaysIso(finishedAt, 365),
      }),
      recordAudit(repository, {
        actorType: "bot_service",
        requestId: respondRequest.requestId,
        eventType: "bot.message_respond.completed",
        status: "completed",
        nowIsoUtc: finishedAt,
      }),
      persistSelectedContextMessageIds(
        repository,
        respondRequest.requestId,
        contextSelection.selectedContextMessageIds,
        finishedAt,
        respondRequest.triggerKind === "automated_trigger_source"
          ? "automated_trigger"
          : "dm_recent",
      ),
    ]);
  }

  const body: BotRespondResponse = {
    requestId: respondRequest.requestId,
    decision: finalDecision,
    providerCallId: providerResponse.providerCallId,
    replyChunks: [providerResponse.replyText],
  };
  return jsonResponse(body);
}

async function persistSelectedContextMessageIds(
  repository: D1DcChatbotRepository,
  requestId: string,
  messageIds: readonly string[],
  nowIsoUtc: string,
  contextSource: string,
): Promise<void> {
  const uniqueMessageIds = [...new Set(messageIds)];
  await Promise.all(
    uniqueMessageIds.map((discordMessageId) =>
      repository.insertSelectedContextMessage({
        selectedContextId: createUlid(),
        requestId,
        discordMessageId,
        contextSource,
        authorRelation: null,
        createdAt: nowIsoUtc,
        retainUntil: addDaysIso(nowIsoUtc, 30),
      }),
    ),
  );
}

async function handleOwnerDashboard(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  const summary = await auth.repository.getDashboardSummary(
    auth.record,
    new Date().toISOString(),
  );
  const body: OwnerDashboardSummaryResponse = {
    owner: auth.owner,
    ...summary,
  };
  return jsonResponse(body);
}

async function handleListMembers(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  return jsonResponse({
    members: await auth.repository.listRegisteredMembers(auth.record),
  });
}

async function handleCreateMember(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }

  let input;
  try {
    input = parseJson(
      CreateRegisteredMemberRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }

  const assignedOwnerDiscordUserId =
    auth.record.role === "admin_owner"
      ? (input.assignedOwnerDiscordUserId ?? auth.record.ownerDiscordUserId)
      : auth.record.ownerDiscordUserId;
  if (
    !(await auth.repository.findOwnerByDiscordUserId(
      assignedOwnerDiscordUserId,
    ))
  ) {
    return problemResponse(
      400,
      "invalid_owner",
      "Assigned Owner Discord User is invalid",
    );
  }

  const nowIsoUtc = new Date().toISOString();
  await auth.repository.upsertDiscordUser({
    discordUserId: input.memberDiscordUserId,
    displayNameSnapshot: input.displayNameSnapshot ?? null,
    observedAt: nowIsoUtc,
  });
  const member = await auth.repository.createRegisteredMember({
    memberDiscordUserId: input.memberDiscordUserId,
    assignedOwnerDiscordUserId,
    nowIsoUtc,
  });
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "registered_member",
    eventType: "registered_member.created",
    afterRef: member.memberDiscordUserId,
    nowIsoUtc,
  });
  return jsonResponse(member, { status: 201 });
}

async function handleDisableMember(
  request: Request,
  env: Env,
  memberDiscordUserId: string,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  const nowIsoUtc = new Date().toISOString();
  const disabled = await auth.repository.disableRegisteredMember(
    auth.record,
    memberDiscordUserId,
    nowIsoUtc,
  );
  if (!disabled) {
    return problemResponse(404, "not_found", "Registered Member not found");
  }
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "registered_member",
    eventType: "registered_member.disabled",
    afterRef: memberDiscordUserId,
    nowIsoUtc,
  });
  return jsonResponse({ memberDiscordUserId, status: "disabled" });
}

async function handleListCandidates(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
    100,
  );
  return jsonResponse({
    candidates: await auth.repository.listCandidateDiscordUsers(limit),
  });
}

async function handlePromoteCandidate(
  request: Request,
  env: Env,
  candidateDiscordUserId: string,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  let input;
  try {
    input = parseJson(
      PromoteCandidateDiscordUserRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const assignedOwnerDiscordUserId =
    auth.record.role === "admin_owner"
      ? (input.assignedOwnerDiscordUserId ?? auth.record.ownerDiscordUserId)
      : auth.record.ownerDiscordUserId;
  if (
    !(await auth.repository.findOwnerByDiscordUserId(
      assignedOwnerDiscordUserId,
    ))
  ) {
    return problemResponse(
      400,
      "invalid_owner",
      "Assigned Owner Discord User is invalid",
    );
  }
  const nowIsoUtc = new Date().toISOString();
  const member = await auth.repository.promoteCandidateDiscordUser({
    candidateDiscordUserId,
    assignedOwnerDiscordUserId,
    nowIsoUtc,
  });
  if (!member) {
    return problemResponse(
      404,
      "not_found",
      "Candidate Discord User not found",
    );
  }
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "registered_member",
    eventType: "candidate.promoted",
    afterRef: member.memberDiscordUserId,
    nowIsoUtc,
  });
  return jsonResponse(member, { status: 201 });
}

async function handleGetSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  return jsonResponse(
    await auth.repository.getOwnerSettings(new Date().toISOString()),
  );
}

async function handleUpdateBotSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  if (!canManageOwnerSettings(auth.record)) {
    return problemResponse(403, "forbidden", "Forbidden");
  }
  let input;
  try {
    input = parseJson(
      UpdateBotSettingsRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const nowIsoUtc = new Date().toISOString();
  await auth.repository.updateBotSettings({
    notificationOwnerDiscordUserId: input.notificationOwnerDiscordUserId,
    automatedTriggerDefaultCooldownSeconds:
      input.automatedTriggerDefaultCooldownSeconds,
    nowIsoUtc,
  });
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "bot_settings",
    eventType: "bot_settings.updated",
    nowIsoUtc,
  });
  return jsonResponse(await auth.repository.getOwnerSettings(nowIsoUtc));
}

async function handleUpdateModelSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  if (!canManageOwnerSettings(auth.record)) {
    return problemResponse(403, "forbidden", "Forbidden");
  }
  let input;
  try {
    input = parseJson(
      UpdateModelSettingsRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const nowIsoUtc = new Date().toISOString();
  await auth.repository.updateModelSettings({ ...input, nowIsoUtc });
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "model_settings",
    eventType: "model_settings.updated",
    nowIsoUtc,
  });
  return jsonResponse(await auth.repository.getOwnerSettings(nowIsoUtc));
}

async function handleUpdatePromptSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  if (!canManageOwnerSettings(auth.record)) {
    return problemResponse(403, "forbidden", "Forbidden");
  }
  let input;
  try {
    input = parseJson(
      UpdatePromptSettingsMetadataRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const nowIsoUtc = new Date().toISOString();
  await auth.repository.upsertPromptSettingsMetadata({
    promptSettingId: createUlid(),
    promptSettingVersionId: createUlid(),
    promptKey: input.promptKey,
    promptBodySha256: input.promptBodySha256,
    promptBodyLength: input.promptBodyLength,
    label: input.label ?? null,
    actorOwnerDiscordUserId: auth.owner.ownerDiscordUserId,
    nowIsoUtc,
  });
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "prompt_settings",
    eventType: "prompt_settings.metadata_updated",
    afterRef: input.promptKey,
    nowIsoUtc,
  });
  return jsonResponse(await auth.repository.getOwnerSettings(nowIsoUtc));
}

async function handleListAutomatedSources(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  return jsonResponse({
    automatedTriggerSources: await auth.repository.listAutomatedTriggerSources(
      auth.record,
    ),
  });
}

async function handleCreateAutomatedSource(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  if (!canManageOwnerSettings(auth.record)) {
    return problemResponse(403, "forbidden", "Forbidden");
  }
  let input;
  try {
    input = parseJson(
      CreateAutomatedTriggerSourceRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  if (!input.sourceDiscordUserId && !input.sourceApplicationId) {
    return problemResponse(
      400,
      "invalid_request",
      "Automated Trigger Source requires a Discord user ID or application ID",
    );
  }
  if (
    !(await auth.repository.findOwnerByDiscordUserId(
      input.assignedOwnerDiscordUserId,
    ))
  ) {
    return problemResponse(
      400,
      "invalid_owner",
      "Assigned Owner Discord User is invalid",
    );
  }
  const nowIsoUtc = new Date().toISOString();
  const source = await auth.repository.createAutomatedTriggerSource({
    automatedTriggerSourceId: createUlid(),
    sourceDiscordUserId: input.sourceDiscordUserId ?? null,
    sourceApplicationId: input.sourceApplicationId ?? null,
    assignedOwnerDiscordUserId: input.assignedOwnerDiscordUserId,
    replyMode: input.replyMode ?? "reply",
    cooldownSeconds: input.cooldownSeconds ?? 60,
    nowIsoUtc,
  });
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "automated_trigger_source",
    eventType: "automated_trigger_source.created",
    afterRef: source.automatedTriggerSourceId,
    nowIsoUtc,
  });
  return jsonResponse(source, { status: 201 });
}

async function handleUpdateAutomatedSource(
  request: Request,
  env: Env,
  automatedTriggerSourceId: string,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  let input;
  try {
    input = parseJson(
      UpdateAutomatedTriggerSourceRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const nowIsoUtc = new Date().toISOString();
  const updateInput: {
    automatedTriggerSourceId: string;
    assignedOwnerDiscordUserId?: string;
    status?: "active" | "disabled";
    replyMode?: "reply" | "channel_message" | "none";
    cooldownSeconds?: number;
    nowIsoUtc: string;
  } = { automatedTriggerSourceId, nowIsoUtc };
  if (input.assignedOwnerDiscordUserId !== undefined) {
    updateInput.assignedOwnerDiscordUserId = input.assignedOwnerDiscordUserId;
  }
  if (input.status !== undefined) {
    updateInput.status = input.status;
  }
  if (input.replyMode !== undefined) {
    updateInput.replyMode = input.replyMode;
  }
  if (input.cooldownSeconds !== undefined) {
    updateInput.cooldownSeconds = input.cooldownSeconds;
  }
  const source = await auth.repository.updateAutomatedTriggerSource(
    auth.record,
    updateInput,
  );
  if (!source) {
    return problemResponse(
      404,
      "not_found",
      "Automated Trigger Source not found",
    );
  }
  await recordOwnerSettingAudit(auth.repository, auth, {
    settingCategory: "automated_trigger_source",
    eventType: "automated_trigger_source.updated",
    afterRef: source.automatedTriggerSourceId,
    nowIsoUtc,
  });
  return jsonResponse(source);
}

async function handleListOwnerNotifications(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireOwnerWithRepository(request, env);
  if (auth instanceof Response) {
    return auth;
  }
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
    100,
  );
  const body: OwnerNotificationListResponse = {
    ownerNotifications: await auth.repository.listOwnerNotifications(
      auth.record,
      limit,
    ),
  };
  return jsonResponse(body);
}

async function handleClaimPendingOwnerNotifications(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await authenticateBotService(request, env))) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }
  const repository = createRepository(env);
  if (!repository) {
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 10;
  const body: BotOwnerNotificationDeliveryListResponse = {
    ownerNotifications: await repository.claimPendingOwnerNotifications({
      limit,
      nowIsoUtc: new Date().toISOString(),
    }),
  };
  return jsonResponse(
    parseJson(BotOwnerNotificationDeliveryListResponseSchema, body),
  );
}

async function handleOwnerNotificationDeliveryUpdate(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await authenticateBotService(request, env))) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }
  const repository = createRepository(env);
  if (!repository) {
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }
  let input;
  try {
    input = parseJson(
      BotOwnerNotificationDeliveryUpdateRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  const updatedAt = input.deliveredAt ?? new Date().toISOString();
  const updated = await repository.updateOwnerNotificationDelivery({
    ownerNotificationId: input.ownerNotificationId,
    status: input.status,
    safeErrorCategory: input.safeErrorCategory ?? null,
    updatedAt,
  });
  if (!updated) {
    return problemResponse(404, "not_found", "Owner Notification not found");
  }
  return jsonResponse({ ok: true });
}

async function handleDiscordResponseMessageMetadata(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await authenticateBotService(request, env))) {
    return problemResponse(401, "unauthorized", "Unauthorized");
  }
  const repository = createRepository(env);
  if (!repository) {
    return problemResponse(503, "database_unavailable", "Database unavailable");
  }
  let input;
  try {
    input = parseJson(
      DiscordResponseMessageMetadataRequestSchema,
      await parseRequestJson(request),
    );
  } catch {
    return problemResponse(400, "invalid_request", "Invalid request");
  }
  await repository.insertDiscordResponseMessage({
    responseMessageId: createUlid(),
    requestId: input.requestId,
    discordMessageId: input.discordMessageId,
    guildId: input.guildId ?? null,
    channelId: input.channelId,
    chunkIndex: input.chunkIndex,
    chunkCount: input.chunkCount,
    status: input.status,
    createdAt: input.createdAt,
    retainUntil: addDaysIso(input.createdAt, 30),
  });
  return jsonResponse({ ok: true }, { status: 201 });
}

export async function runScheduledCleanup(
  env: Env,
  nowIsoUtc = new Date().toISOString(),
): Promise<void> {
  if (!env.DB) {
    return;
  }

  const repository = new D1DcChatbotRepository(env.DB);
  const cleanupRunId = createUlid();
  const plan = buildRetentionCleanupPlan(nowIsoUtc);
  let deletedRowCount = 0;
  try {
    await repository.insertCleanupRunMetadata({
      cleanupRunId,
      status: "started",
      startedAt: nowIsoUtc,
      finishedAt: null,
      deletedRowCount: 0,
      safeErrorCategory: null,
      retainUntil: addDaysIso(nowIsoUtc, 365),
    });
    for (const item of plan) {
      const result = await env.DB.prepare(item.sql).run();
      deletedRowCount += result.meta.changes ?? 0;
    }
    const finishedAt = new Date().toISOString();
    await repository.updateCleanupRunMetadata({
      cleanupRunId,
      status: "completed",
      finishedAt,
      deletedRowCount,
      safeErrorCategory: null,
      retainUntil: addDaysIso(finishedAt, 365),
    });
  } catch {
    const finishedAt = new Date().toISOString();
    await repository.updateCleanupRunMetadata({
      cleanupRunId,
      status: "failed",
      finishedAt,
      deletedRowCount,
      safeErrorCategory: "cleanup_failed",
      retainUntil: addDaysIso(finishedAt, 365),
    });
  }
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function isOwnerApiPath(pathname: string): boolean {
  return pathname === "/api/v1/owner" || pathname.startsWith("/api/v1/owner/");
}

function allowedOwnerWebOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const configuredOrigin =
    env.OWNER_WEB_ORIGIN?.trim() || DEFAULT_OWNER_WEB_ORIGIN;
  if (origin === configuredOrigin || LOCAL_OWNER_WEB_ORIGINS.has(origin)) {
    return origin;
  }

  return null;
}

function ownerCorsHeaders(origin: string): HeadersInit {
  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": [
      "content-type",
      "x-dev-auth-secret",
      "x-dev-access-subject",
      "x-dev-owner-discord-user-id",
      "x-dev-owner-role",
    ].join(", "),
    "access-control-allow-methods": "GET, POST, PUT, PATCH, OPTIONS",
    "access-control-allow-origin": origin,
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function withOwnerCors(
  request: Request,
  env: Env,
  response: Response,
): Response {
  const origin = allowedOwnerWebOrigin(request, env);
  if (!origin) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(ownerCorsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function ownerCorsPreflight(request: Request, env: Env): Response {
  const origin = allowedOwnerWebOrigin(request, env);
  if (!origin) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: ownerCorsHeaders(origin) });
}

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const segments = pathSegments(url.pathname);

  if (request.method === "GET" && url.pathname === "/health") {
    return handleHealth();
  }

  if (request.method === "GET" && url.pathname === "/api/v1/owner/me") {
    return handleOwnerMe(request, env);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/owner/dashboard") {
    return handleOwnerDashboard(request, env);
  }

  if (url.pathname === "/api/v1/owner/members") {
    if (request.method === "GET") {
      return handleListMembers(request, env);
    }
    if (request.method === "POST") {
      return handleCreateMember(request, env);
    }
  }

  if (
    request.method === "POST" &&
    segments.length === 6 &&
    segments[0] === "api" &&
    segments[1] === "v1" &&
    segments[2] === "owner" &&
    segments[3] === "members" &&
    segments[5] === "disable"
  ) {
    return handleDisableMember(request, env, segments[4] ?? "");
  }

  if (url.pathname === "/api/v1/owner/candidates" && request.method === "GET") {
    return handleListCandidates(request, env);
  }

  if (
    request.method === "POST" &&
    segments.length === 6 &&
    segments[0] === "api" &&
    segments[1] === "v1" &&
    segments[2] === "owner" &&
    segments[3] === "candidates" &&
    segments[5] === "promote"
  ) {
    return handlePromoteCandidate(request, env, segments[4] ?? "");
  }

  if (url.pathname === "/api/v1/owner/settings" && request.method === "GET") {
    return handleGetSettings(request, env);
  }

  if (
    url.pathname === "/api/v1/owner/settings/bot" &&
    (request.method === "PATCH" || request.method === "PUT")
  ) {
    return handleUpdateBotSettings(request, env);
  }

  if (
    url.pathname === "/api/v1/owner/settings/models" &&
    request.method === "PUT"
  ) {
    return handleUpdateModelSettings(request, env);
  }

  if (
    url.pathname === "/api/v1/owner/settings/prompts" &&
    request.method === "POST"
  ) {
    return handleUpdatePromptSettings(request, env);
  }

  if (url.pathname === "/api/v1/owner/automated-trigger-sources") {
    if (request.method === "GET") {
      return handleListAutomatedSources(request, env);
    }
    if (request.method === "POST") {
      return handleCreateAutomatedSource(request, env);
    }
  }

  if (
    request.method === "PATCH" &&
    segments.length === 5 &&
    segments[0] === "api" &&
    segments[1] === "v1" &&
    segments[2] === "owner" &&
    segments[3] === "automated-trigger-sources"
  ) {
    return handleUpdateAutomatedSource(request, env, segments[4] ?? "");
  }

  if (
    url.pathname === "/api/v1/owner/notifications" &&
    request.method === "GET"
  ) {
    return handleListOwnerNotifications(request, env);
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

  if (
    request.method === "POST" &&
    url.pathname === "/api/v1/bot/messages/response-metadata"
  ) {
    return handleDiscordResponseMessageMetadata(request, env);
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/v1/bot/owner-notifications/pending"
  ) {
    return handleClaimPendingOwnerNotifications(request, env);
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/v1/bot/owner-notifications/delivery-status"
  ) {
    return handleOwnerNotificationDeliveryUpdate(request, env);
  }

  return problemResponse(404, "not_found", "Not found");
}

async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (isOwnerApiPath(url.pathname)) {
    if (request.method === "OPTIONS") {
      return ownerCorsPreflight(request, env);
    }
    return withOwnerCors(request, env, await routeRequest(request, env));
  }

  return routeRequest(request, env);
}

export default {
  fetch,
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledCleanup(env));
  },
};
