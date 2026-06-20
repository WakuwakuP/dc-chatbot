import type {
  OwnerMeResponse,
  OwnerRole,
  ProblemDetails,
} from "@dc-chatbot/shared";

export type OwnerConnectionStatus =
  | OwnerMeResponse["connectionStatus"]
  | "revoked";

export type DashboardSummary = {
  owner: {
    ownerDiscordUserId: string;
    role: OwnerRole;
    managedMemberCount: number | null;
  };
  connection: {
    status: OwnerConnectionStatus;
    lastCheckedAt: string | null;
    activeConnectionCount: number | null;
  };
  usage: {
    periodLabel: string;
    requestCount: number;
    providerCallCount: number;
    errorCount: number;
    buckets: UsageBucket[];
  };
  recentErrors: RecentErrorMetadata[];
  settingsWarnings: SettingsWarning[];
};

export type UsageBucket = {
  label: string;
  requestCount: number;
  errorCount: number;
};

export type RecentErrorMetadata = {
  id: string;
  occurredAt: string;
  surface: string;
  category: string;
  requestId: string | null;
};

export type SettingsWarning = {
  code: string;
  title: string;
  severity: "info" | "warning";
};

export type RegisteredMember = {
  discordUserId: string;
  displayNameSnapshot: string | null;
  status: "active" | "disabled";
  assignedOwnerDiscordUserId: string;
  updatedAt: string | null;
};

export type CandidateDiscordUser = {
  candidateDiscordUserId: string;
  displayNameSnapshot: string | null;
  observedAt: string | null;
  expiresAt: string | null;
  observedInGuildId: string | null;
};

export type OwnerSettings = {
  model: string | null;
  contextMessageLimit: number | null;
  ownerNotificationsEnabled: boolean | null;
  promptSettingsUpdatedAt: string | null;
  warnings: SettingsWarning[];
};

export type AutomatedTriggerSource = {
  id: string;
  displayNameSnapshot: string | null;
  status: "active" | "disabled";
  replyMode: "mention" | "thread" | "dm" | "none" | null;
  cooldownSeconds: number | null;
  assignedOwnerDiscordUserId: string | null;
};

export type ConnectionSummary = {
  ownerDiscordUserId: string;
  status: OwnerConnectionStatus;
  lastCheckedAt: string | null;
  needsReconnectReason: string | null;
};

export type OwnerActionResult = {
  status: "accepted" | "unavailable";
  title: string;
  redirectUrl: string | null;
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

function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readOwnerRole(value: unknown): OwnerRole {
  return value === "regular_owner" ? "regular_owner" : "admin_owner";
}

function readConnectionStatus(value: unknown): OwnerConnectionStatus {
  if (
    value === "connected" ||
    value === "needs_reconnect" ||
    value === "missing" ||
    value === "revoked"
  ) {
    return value;
  }
  return "missing";
}

function readOwnerMeConnectionStatus(
  value: unknown,
): OwnerMeResponse["connectionStatus"] {
  const status = readConnectionStatus(value);
  return status === "revoked" ? "missing" : status;
}

function readMemberStatus(value: unknown): RegisteredMember["status"] {
  return value === "disabled" ? "disabled" : "active";
}

function readSourceStatus(value: unknown): AutomatedTriggerSource["status"] {
  return value === "disabled" ? "disabled" : "active";
}

function readReplyMode(value: unknown): AutomatedTriggerSource["replyMode"] {
  if (
    value === "mention" ||
    value === "thread" ||
    value === "dm" ||
    value === "none"
  ) {
    return value;
  }
  return null;
}

function readSeverity(value: unknown): SettingsWarning["severity"] {
  return value === "warning" ? "warning" : "info";
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
  if (options.body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(options.body);
  }
  if (options.signal) {
    init.signal = options.signal;
  }

  const response = await fetchImpl(`/api/v1/owner${path}`, init);
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
    connectionStatus: readOwnerMeConnectionStatus(record.connectionStatus),
  };
}

function mapWarnings(raw: unknown): SettingsWarning[] {
  return readArray(raw).map((warning, index) => ({
    code: readString(warning, "code") ?? `warning_${index + 1}`,
    title: readString(warning, "title") ?? "設定の確認が必要です",
    severity: readSeverity(warning.severity),
  }));
}

function mapUsageBuckets(raw: unknown): UsageBucket[] {
  return readArray(raw).map((bucket, index) => ({
    label: readString(bucket, "label") ?? `${index + 1}`,
    requestCount: readNumber(bucket, "requestCount") ?? 0,
    errorCount: readNumber(bucket, "errorCount") ?? 0,
  }));
}

function mapDashboardSummary(raw: unknown): DashboardSummary {
  const record = isRecord(raw) ? raw : {};
  const owner = isRecord(record.owner) ? record.owner : record;
  const connection = isRecord(record.connection) ? record.connection : record;
  const usage = isRecord(record.usage) ? record.usage : {};

  return {
    owner: {
      ownerDiscordUserId: readString(owner, "ownerDiscordUserId") ?? "0",
      role: readOwnerRole(owner.role),
      managedMemberCount: readNumber(owner, "managedMemberCount"),
    },
    connection: {
      status: readConnectionStatus(
        connection.status ?? connection.connectionStatus,
      ),
      lastCheckedAt: readString(connection, "lastCheckedAt"),
      activeConnectionCount: readNumber(connection, "activeConnectionCount"),
    },
    usage: {
      periodLabel: readString(usage, "periodLabel") ?? "直近30日",
      requestCount: readNumber(usage, "requestCount") ?? 0,
      providerCallCount: readNumber(usage, "providerCallCount") ?? 0,
      errorCount: readNumber(usage, "errorCount") ?? 0,
      buckets: mapUsageBuckets(usage.buckets),
    },
    recentErrors: readArray(record.recentErrors).map((error, index) => ({
      id: readString(error, "id") ?? `error_${index + 1}`,
      occurredAt: readString(error, "occurredAt") ?? "",
      surface: readString(error, "surface") ?? "owner_api",
      category: readString(error, "category") ?? "unknown",
      requestId: readString(error, "requestId"),
    })),
    settingsWarnings: mapWarnings(record.settingsWarnings),
  };
}

export function dashboardFromOwnerMe(owner: OwnerMeResponse): DashboardSummary {
  return {
    owner: {
      ownerDiscordUserId: owner.ownerDiscordUserId,
      role: owner.role,
      managedMemberCount: null,
    },
    connection: {
      status: owner.connectionStatus,
      lastCheckedAt: null,
      activeConnectionCount: null,
    },
    usage: {
      periodLabel: "直近30日",
      requestCount: 0,
      providerCallCount: 0,
      errorCount: 0,
      buckets: [],
    },
    recentErrors: [],
    settingsWarnings: [],
  };
}

function mapRegisteredMembers(raw: unknown): RegisteredMember[] {
  const rows = isRecord(raw) && Array.isArray(raw.members) ? raw.members : raw;
  return readArray(rows).map((member) => ({
    discordUserId: readString(member, "discordUserId") ?? "0",
    displayNameSnapshot: readString(member, "displayNameSnapshot"),
    status: readMemberStatus(member.status),
    assignedOwnerDiscordUserId:
      readString(member, "assignedOwnerDiscordUserId") ?? "0",
    updatedAt: readString(member, "updatedAt"),
  }));
}

function mapCandidates(raw: unknown): CandidateDiscordUser[] {
  const rows =
    isRecord(raw) && Array.isArray(raw.candidates) ? raw.candidates : raw;
  return readArray(rows).map((candidate) => ({
    candidateDiscordUserId:
      readString(candidate, "candidateDiscordUserId") ?? "0",
    displayNameSnapshot: readString(candidate, "displayNameSnapshot"),
    observedAt: readString(candidate, "observedAt"),
    expiresAt: readString(candidate, "expiresAt"),
    observedInGuildId: readString(candidate, "observedInGuildId"),
  }));
}

function mapSettings(raw: unknown): OwnerSettings {
  const record = isRecord(raw) ? raw : {};
  return {
    model: readString(record, "model"),
    contextMessageLimit: readNumber(record, "contextMessageLimit"),
    ownerNotificationsEnabled: readBoolean(record, "ownerNotificationsEnabled"),
    promptSettingsUpdatedAt: readString(record, "promptSettingsUpdatedAt"),
    warnings: mapWarnings(record.warnings),
  };
}

function mapAutomatedTriggerSources(raw: unknown): AutomatedTriggerSource[] {
  const rows = isRecord(raw) && Array.isArray(raw.sources) ? raw.sources : raw;
  return readArray(rows).map((source, index) => ({
    id: readString(source, "id") ?? `source_${index + 1}`,
    displayNameSnapshot: readString(source, "displayNameSnapshot"),
    status: readSourceStatus(source.status),
    replyMode: readReplyMode(source.replyMode),
    cooldownSeconds: readNumber(source, "cooldownSeconds"),
    assignedOwnerDiscordUserId: readString(
      source,
      "assignedOwnerDiscordUserId",
    ),
  }));
}

function mapConnectionSummary(raw: unknown): ConnectionSummary {
  const record = isRecord(raw) ? raw : {};
  return {
    ownerDiscordUserId: readString(record, "ownerDiscordUserId") ?? "0",
    status: readConnectionStatus(record.status ?? record.connectionStatus),
    lastCheckedAt: readString(record, "lastCheckedAt"),
    needsReconnectReason: readString(record, "needsReconnectReason"),
  };
}

function mapActionResult(raw: unknown): OwnerActionResult {
  const record = isRecord(raw) ? raw : {};
  return {
    status:
      readString(record, "status") === "accepted" ? "accepted" : "unavailable",
    title: readString(record, "title") ?? "操作を受け付けました",
    redirectUrl: readString(record, "redirectUrl"),
  };
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
        { ...options, method: "POST", body: input },
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
    updateSettings: (
      input: Partial<OwnerSettings>,
      options: OwnerRequestOptions = {},
    ) =>
      requestJson(
        fetchImpl,
        "/settings",
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
    getConnection: (options: OwnerRequestOptions = {}) =>
      requestJson(fetchImpl, "/connection", options, mapConnectionSummary),
    startReconnect: (options: OwnerRequestOptions = {}) =>
      requestJson(
        fetchImpl,
        "/connection/reconnect",
        { ...options, method: "POST" },
        mapActionResult,
      ),
    revokeConnection: (options: OwnerRequestOptions = {}) =>
      requestJson(
        fetchImpl,
        "/connection/revoke",
        { ...options, method: "POST" },
        mapActionResult,
      ),
  };
}

export const ownerApi = createOwnerApiClient();
