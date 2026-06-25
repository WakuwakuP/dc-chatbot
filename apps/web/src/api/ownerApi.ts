import type {
  AutomatedTriggerSourceItem,
  CandidateDiscordUserItem,
  CreateAutomatedTriggerSourceRequest,
  ModelSettings,
  OwnerDashboardSummaryResponse,
  OwnerMeResponse,
  OwnerRole,
  OwnerSettingsResponse,
  ProblemDetails,
  PromptSettingsMetadata,
  RegisteredMemberItem,
  UpdateAutomatedTriggerSourceRequest,
  UpdateBotSettingsRequest,
  UpdateModelSettingsRequest,
  UpdatePromptSettingsMetadataRequest,
} from "@dc-chatbot/shared";

export type DashboardSummary = OwnerDashboardSummaryResponse;
export type RegisteredMember = RegisteredMemberItem;
export type CandidateDiscordUser = CandidateDiscordUserItem;
export type OwnerSettings = OwnerSettingsResponse;
export type AutomatedTriggerSource = AutomatedTriggerSourceItem;
export type CreateAutomatedTriggerSourceInput =
  CreateAutomatedTriggerSourceRequest;
export type UpdateAutomatedTriggerSourceInput =
  UpdateAutomatedTriggerSourceRequest;
export type UpdatePromptSettingsMetadataInput =
  UpdatePromptSettingsMetadataRequest;

export type SettingsWarning = {
  code: string;
  title: string;
  severity: "info" | "warning";
};

export type CreateRegisteredMemberInput = {
  discordUserId: string;
  displayNameSnapshot?: string;
  assignedOwnerDiscordUserId?: string;
};

export type PromoteCandidateInput = {
  candidateDiscordUserId: string;
  assignedOwnerDiscordUserId?: string;
};

export type OwnerRequestOptions = {
  signal?: AbortSignal;
};

type FetchLike = typeof fetch;

type RequestJsonOptions = OwnerRequestOptions & {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

function resolveOwnerApiUrl(path: string): string {
  if (import.meta.env.DEV) {
    return path;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/u, "") ?? "";
  return baseUrl ? `${baseUrl}${path}` : path;
}

function buildOwnerRequestHeaders(
  baseHeaders: Record<string, string> = {},
): Record<string, string> {
  if (!import.meta.env.DEV) {
    return baseHeaders;
  }

  const secret = import.meta.env.VITE_LOCAL_AUTH_BYPASS_SECRET;
  const accessSubject = import.meta.env.VITE_DEV_ACCESS_SUBJECT;
  const ownerDiscordUserId = import.meta.env.VITE_DEV_OWNER_DISCORD_USER_ID;
  if (!secret || !accessSubject || !ownerDiscordUserId) {
    return baseHeaders;
  }

  const headers: Record<string, string> = {
    ...baseHeaders,
    "x-dev-auth-secret": secret,
    "x-dev-access-subject": accessSubject,
    "x-dev-owner-discord-user-id": ownerDiscordUserId,
  };
  const ownerRole = import.meta.env.VITE_DEV_OWNER_ROLE;
  if (ownerRole === "admin_owner" || ownerRole === "regular_owner") {
    headers["x-dev-owner-role"] = ownerRole;
  }

  return headers;
}

export class OwnerApiProblemError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.title);
    this.name = "OwnerApiProblemError";
    this.problem = problem;
  }
}

export function isOwnerApiProblemError(
  error: unknown,
): error is OwnerApiProblemError {
  return error instanceof OwnerApiProblemError;
}

export function isNotFoundProblem(error: unknown): boolean {
  return isOwnerApiProblemError(error) && error.problem.status === 404;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readOwnerRole(value: unknown): OwnerRole {
  return value === "regular_owner" ? "regular_owner" : "admin_owner";
}

function readMemberStatus(value: unknown): RegisteredMember["status"] {
  return value === "disabled" ? "disabled" : "active";
}

function readSourceStatus(value: unknown): AutomatedTriggerSource["status"] {
  return value === "disabled" ? "disabled" : "active";
}

function readReplyMode(value: unknown): AutomatedTriggerSource["replyMode"] {
  return value === "channel_message" || value === "none" ? value : "reply";
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  return readString(record, key);
}

function toProblemDetails(raw: unknown, status: number): ProblemDetails | null {
  if (!isRecord(raw)) {
    return null;
  }

  const title = readString(raw, "title");
  const code = readString(raw, "code");
  const type = readString(raw, "type") ?? "about:blank";
  const rawStatus = readNumber(raw, "status") ?? status;
  const requestId = readString(raw, "requestId");

  if (!title || !code || rawStatus < 400 || rawStatus > 599) {
    return null;
  }

  return requestId
    ? { type, title, status: rawStatus, code, requestId }
    : { type, title, status: rawStatus, code };
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function fallbackProblem(
  status: number,
  title: string,
  code: string,
): ProblemDetails {
  return { type: "about:blank", title, status, code };
}

async function requestJson<T>(
  fetchImpl: FetchLike,
  path: string,
  options: RequestJsonOptions,
  map: (raw: unknown) => T,
): Promise<T> {
  const init: RequestInit = { method: options.method ?? "GET" };
  const headers = buildOwnerRequestHeaders();
  if (options.body) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  if (Object.keys(headers).length > 0) {
    init.headers = headers;
  }
  if (options.signal) {
    init.signal = options.signal;
  }

  const response = await fetchImpl(
    resolveOwnerApiUrl(`/api/v1/owner${path}`),
    init,
  );
  const raw = response.status === 204 ? null : await readJson(response);

  if (!response.ok) {
    throw new OwnerApiProblemError(
      toProblemDetails(raw, response.status) ??
        fallbackProblem(
          response.status,
          response.statusText || "Owner API error",
          "owner_api_error",
        ),
    );
  }

  return map(raw);
}

function mapOwnerMe(raw: unknown): OwnerMeResponse {
  const record = isRecord(raw) ? raw : {};
  return {
    ownerDiscordUserId: readString(record, "ownerDiscordUserId") ?? "0",
    role: readOwnerRole(record.role),
  };
}

function mapDashboardSummary(raw: unknown): DashboardSummary {
  const record = isRecord(raw) ? raw : {};
  const registeredMemberCounts = isRecord(record.registeredMemberCounts)
    ? record.registeredMemberCounts
    : {};
  const automatedTriggerSourceCounts = isRecord(
    record.automatedTriggerSourceCounts,
  )
    ? record.automatedTriggerSourceCounts
    : {};

  return {
    owner: mapOwnerMe(record.owner),
    registeredMemberCounts: {
      active: readNumber(registeredMemberCounts, "active") ?? 0,
      disabled: readNumber(registeredMemberCounts, "disabled") ?? 0,
    },
    candidateDiscordUserCount:
      readNumber(record, "candidateDiscordUserCount") ?? 0,
    pendingOwnerNotificationCount:
      readNumber(record, "pendingOwnerNotificationCount") ?? 0,
    automatedTriggerSourceCounts: {
      active: readNumber(automatedTriggerSourceCounts, "active") ?? 0,
      disabled: readNumber(automatedTriggerSourceCounts, "disabled") ?? 0,
    },
  };
}

export function dashboardFromOwnerMe(owner: OwnerMeResponse): DashboardSummary {
  return {
    owner,
    registeredMemberCounts: { active: 0, disabled: 0 },
    candidateDiscordUserCount: 0,
    pendingOwnerNotificationCount: 0,
    automatedTriggerSourceCounts: { active: 0, disabled: 0 },
  };
}

function mapRegisteredMembers(raw: unknown): RegisteredMember[] {
  const rows = isRecord(raw) && Array.isArray(raw.members) ? raw.members : raw;
  return readArray(rows).map((member) => ({
    memberDiscordUserId: readString(member, "memberDiscordUserId") ?? "0",
    displayNameSnapshot: readNullableString(member, "displayNameSnapshot"),
    status: readMemberStatus(member.status),
    assignedOwnerDiscordUserId:
      readString(member, "assignedOwnerDiscordUserId") ?? "0",
    createdAt: readString(member, "createdAt") ?? "",
    updatedAt: readString(member, "updatedAt") ?? "",
  }));
}

function mapCandidates(raw: unknown): CandidateDiscordUser[] {
  const rows =
    isRecord(raw) && Array.isArray(raw.candidates) ? raw.candidates : raw;
  return readArray(rows).map((candidate) => ({
    candidateDiscordUserId:
      readString(candidate, "candidateDiscordUserId") ?? "0",
    displayNameSnapshot: readNullableString(candidate, "displayNameSnapshot"),
    observedInGuildId: readNullableString(candidate, "observedInGuildId"),
    observedInChannelId: readNullableString(candidate, "observedInChannelId"),
    firstObservedAt: readString(candidate, "firstObservedAt") ?? "",
    lastObservedAt: readString(candidate, "lastObservedAt") ?? "",
    expiresAt: readString(candidate, "expiresAt") ?? "",
  }));
}

function mapModelSettings(raw: unknown): ModelSettings {
  const record = isRecord(raw) ? raw : {};
  return {
    contextSelectionModel: readString(record, "contextSelectionModel") ?? "",
    responseDecisionModel: readString(record, "responseDecisionModel") ?? "",
    responseGenerationModel:
      readString(record, "responseGenerationModel") ?? "",
  };
}

function mapPromptSetting(raw: Record<string, unknown>): PromptSettingsMetadata {
  return {
    promptSettingId: readString(raw, "promptSettingId") ?? "",
    promptKey: readString(raw, "promptKey") ?? "",
    activeVersionId: readNullableString(raw, "activeVersionId"),
    activePromptBodySha256: readNullableString(
      raw,
      "activePromptBodySha256",
    ),
    activePromptBodyLength: readNumber(raw, "activePromptBodyLength"),
    updatedAt: readString(raw, "updatedAt") ?? "",
  };
}

function mapSettings(raw: unknown): OwnerSettings {
  const record = isRecord(raw) ? raw : {};
  const botSettings = isRecord(record.botSettings) ? record.botSettings : {};
  return {
    botSettings: {
      notificationOwnerDiscordUserId: readNullableString(
        botSettings,
        "notificationOwnerDiscordUserId",
      ),
      automatedTriggerDefaultCooldownSeconds:
        readNumber(botSettings, "automatedTriggerDefaultCooldownSeconds") ?? 60,
      updatedAt: readString(botSettings, "updatedAt") ?? "",
    },
    modelSettings: mapModelSettings(record.modelSettings),
    promptSettings: readArray(record.promptSettings).map(mapPromptSetting),
  };
}

function mapAutomatedTriggerSources(raw: unknown): AutomatedTriggerSource[] {
  const rows =
    isRecord(raw) && Array.isArray(raw.automatedTriggerSources)
      ? raw.automatedTriggerSources
      : raw;
  return readArray(rows).map((source, index) => ({
    automatedTriggerSourceId:
      readString(source, "automatedTriggerSourceId") ?? `source_${index + 1}`,
    sourceDiscordUserId: readNullableString(source, "sourceDiscordUserId"),
    sourceApplicationId: readNullableString(source, "sourceApplicationId"),
    assignedOwnerDiscordUserId:
      readString(source, "assignedOwnerDiscordUserId") ?? "0",
    status: readSourceStatus(source.status),
    replyMode: readReplyMode(source.replyMode),
    cooldownSeconds: readNumber(source, "cooldownSeconds") ?? 60,
    lastTriggeredAt: readNullableString(source, "lastTriggeredAt"),
    createdAt: readString(source, "createdAt") ?? "",
    updatedAt: readString(source, "updatedAt") ?? "",
  }));
}

function mapAutomatedTriggerSource(raw: unknown): AutomatedTriggerSource {
  const [source] = mapAutomatedTriggerSources([raw]);
  return (
    source ?? {
      automatedTriggerSourceId: "source_1",
      sourceDiscordUserId: null,
      sourceApplicationId: null,
      assignedOwnerDiscordUserId: "0",
      status: "active",
      replyMode: "reply",
      cooldownSeconds: 60,
      lastTriggeredAt: null,
      createdAt: "",
      updatedAt: "",
    }
  );
}

export function createOwnerApiClient(fetchImpl: FetchLike = fetch) {
  return {
    getMe: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/me", options, mapOwnerMe),
    getDashboardSummary: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/dashboard", options, mapDashboardSummary),
    listRegisteredMembers: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/members", options, mapRegisteredMembers),
    createRegisteredMember: (
      input: CreateRegisteredMemberInput,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/members",
        {
          ...options,
          method: "POST",
          body: {
            memberDiscordUserId: input.discordUserId,
            ...(input.displayNameSnapshot
              ? { displayNameSnapshot: input.displayNameSnapshot }
              : {}),
            ...(input.assignedOwnerDiscordUserId
              ? { assignedOwnerDiscordUserId: input.assignedOwnerDiscordUserId }
              : {}),
          },
        },
        () => ({ ok: true }),
      ),
    disableRegisteredMember: (
      discordUserId: string,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        `/members/${encodeURIComponent(discordUserId)}/disable`,
        { ...options, method: "POST" },
        () => ({ ok: true }),
      ),
    listCandidates: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/candidates", options, mapCandidates),
    promoteCandidate: (
      input: PromoteCandidateInput,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        `/candidates/${encodeURIComponent(input.candidateDiscordUserId)}/promote`,
        { ...options, method: "POST", body: input },
        () => ({ ok: true }),
      ),
    getSettings: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/settings", options, mapSettings),
    updateBotSettings: (
      input: UpdateBotSettingsRequest,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/settings/bot",
        { ...options, method: "PUT", body: input },
        mapSettings,
      ),
    updateModelSettings: (
      input: UpdateModelSettingsRequest,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/settings/models",
        { ...options, method: "PUT", body: input },
        mapSettings,
      ),
    updatePromptSettingsMetadata: (
      input: UpdatePromptSettingsMetadataInput,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/settings/prompts",
        { ...options, method: "PUT", body: input },
        mapSettings,
      ),
    listAutomatedTriggerSources: (options: OwnerRequestOptions = {}) =>
      requestJson(
        fetchImpl,
        "/automated-trigger-sources",
        options,
        mapAutomatedTriggerSources,
      ),
    createAutomatedTriggerSource: (
      input: CreateAutomatedTriggerSourceInput,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/automated-trigger-sources",
        { ...options, method: "POST", body: input },
        mapAutomatedTriggerSource,
      ),
    updateAutomatedTriggerSource: (
      automatedTriggerSourceId: string,
      input: UpdateAutomatedTriggerSourceRequest,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        `/automated-trigger-sources/${encodeURIComponent(automatedTriggerSourceId)}`,
        { ...options, method: "PUT", body: input },
        mapAutomatedTriggerSource,
      ),
  };
}

export const ownerApi = createOwnerApiClient();
