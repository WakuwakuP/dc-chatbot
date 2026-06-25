import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { runScheduledCleanup, type Env } from "../src/worker";

const LOCAL_AUTH_BYPASS_SECRET = "local-auth-bypass-secret";
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const env: Env = {
  DC_CHATBOT_ENV: "test",
  ALLOW_LOCAL_AUTH_BYPASS: "true",
  LOCAL_AUTH_BYPASS_SECRET,
  CF_ACCESS_CLIENT_ID: "client-id",
  CF_ACCESS_CLIENT_SECRET: "client-secret",
};

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

type TestAccessJwk = JsonWebKey & {
  alg: "RS256";
  kid: string;
  use: "sig";
};

async function createAccessJwt(input: {
  aud: string;
  email: string;
  kid: string;
}): Promise<{ token: string; publicJwk: TestAccessJwk }> {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = (await crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey,
  )) as JsonWebKey;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const signingInput = [
    base64UrlEncodeJson({ alg: "RS256", kid: input.kid, typ: "JWT" }),
    base64UrlEncodeJson({
      aud: [input.aud],
      email: input.email,
      exp: nowSeconds + 300,
      nbf: nowSeconds - 60,
      sub: "cloudflare-access-user-subject",
    }),
  ].join(".");
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );

  return {
    token: `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`,
    publicJwk: {
      ...publicJwk,
      alg: "RS256",
      kid: input.kid,
      use: "sig",
    },
  };
}

class FakeD1Statement {
  private bindings: unknown[] = [];

  constructor(
    private readonly db: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): this {
    this.bindings = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    this.db.calls.push({ sql: this.sql, bindings: this.bindings });

    if (this.sql.includes("cloudflare_access_subject")) {
      const subject = this.bindings[0];
      if (subject === "regular@example.com") {
        return {
          owner_discord_user_id: "111",
          role: "regular_owner",
        } as T;
      }
      if (subject === "admin@example.com") {
        return {
          owner_discord_user_id: "999",
          role: "admin_owner",
        } as T;
      }
    }

    if (
      this.sql.includes("FROM owner_discord_users") &&
      this.sql.includes("role = 'admin_owner'")
    ) {
      return { owner_discord_user_id: "999" } as T;
    }

    if (
      this.sql.includes("FROM owner_discord_users") &&
      this.sql.includes("WHERE owner_discord_user_id = ?") &&
      typeof this.bindings[0] === "string" &&
      this.db.allowedOwnerDiscordUserIds.has(this.bindings[0])
    ) {
      return {
        owner_discord_user_id: this.bindings[0],
        role: "regular_owner",
      } as T;
    }

    if (
      this.sql.includes("FROM automated_trigger_sources") &&
      this.sql.includes("status = 'active'") &&
      typeof this.bindings[0] === "string" &&
      this.db.activeAutomatedSourceDiscordUserIds.has(this.bindings[0])
    ) {
      return {
        automated_trigger_source_id: "01HY0000000000000000000009",
        source_discord_user_id: this.bindings[0],
        source_application_id: null,
        assigned_owner_discord_user_id: "999",
        status: "active",
        reply_mode: "reply",
        cooldown_seconds: 60,
        last_triggered_at: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      } as T;
    }

    return null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    this.db.calls.push({ sql: this.sql, bindings: this.bindings });
    if (
      this.db.failRunSqlFragment &&
      this.sql.includes(this.db.failRunSqlFragment)
    ) {
      throw new Error("safe-test-d1-failure");
    }
    if (
      this.sql.includes("UPDATE owner_notifications") &&
      this.sql.includes("status = 'delivery_requested'")
    ) {
      const ownerNotificationId = this.bindings[1];
      const row = this.db.pendingOwnerNotifications.find(
        (notification) =>
          notification.owner_notification_id === ownerNotificationId &&
          notification.status === "pending_delivery",
      );
      if (!row) {
        return { meta: { changes: 0 } };
      }
      row.status = "delivery_requested";
      row.safe_error_category = null;
      row.updated_at = String(this.bindings[0]);
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 1 } };
  }

  async all<T>(): Promise<{ results: T[] }> {
    this.db.calls.push({ sql: this.sql, bindings: this.bindings });
    if (
      this.sql.includes("FROM owner_notifications") &&
      this.sql.includes("WHERE status = 'pending_delivery'")
    ) {
      const limit = Number(this.bindings[0] ?? 10);
      return {
        results: this.db.pendingOwnerNotifications
          .filter((notification) => notification.status === "pending_delivery")
          .slice(0, limit) as T[],
      };
    }
    return { results: [] };
  }
}

type FakeOwnerNotificationRow = {
  owner_notification_id: string;
  notification_owner_discord_user_id: string;
  candidate_discord_user_id: string | null;
  request_id: string | null;
  trigger_kind: "dm" | "guild_mention" | "automated_trigger_source" | null;
  status:
    | "pending_delivery"
    | "delivery_requested"
    | "delivered"
    | "failed"
    | "suppressed";
  safe_error_category: string | null;
  created_at: string;
  updated_at: string;
};

class FakeD1Database {
  readonly calls: { sql: string; bindings: unknown[] }[] = [];
  readonly allowedOwnerDiscordUserIds: Set<string>;
  readonly activeAutomatedSourceDiscordUserIds: Set<string>;
  readonly pendingOwnerNotifications: FakeOwnerNotificationRow[];
  failRunSqlFragment: string | null = null;

  constructor(
    allowedOwnerDiscordUserIds: readonly string[] = [],
    pendingOwnerNotifications: FakeOwnerNotificationRow[] = [],
    activeAutomatedSourceDiscordUserIds: readonly string[] = [],
  ) {
    this.allowedOwnerDiscordUserIds = new Set(allowedOwnerDiscordUserIds);
    this.activeAutomatedSourceDiscordUserIds = new Set(
      activeAutomatedSourceDiscordUserIds,
    );
    this.pendingOwnerNotifications = pendingOwnerNotifications;
  }

  prepare(sql: string): FakeD1Statement {
    return new FakeD1Statement(this, sql);
  }
}

function dbCallsContaining(
  db: FakeD1Database,
  sqlFragment: string,
): { sql: string; bindings: unknown[] }[] {
  return db.calls.filter((call) => call.sql.includes(sqlFragment));
}

function dbBindingStrings(db: FakeD1Database): string[] {
  return db.calls
    .flatMap((call) => call.bindings)
    .filter((binding): binding is string => typeof binding === "string");
}

function expectNoDbBindingString(
  db: FakeD1Database,
  forbidden: readonly string[],
): void {
  const bindings = dbBindingStrings(db);
  for (const value of forbidden) {
    expect(bindings).not.toContain(value);
  }
}

describe("API Worker routes", () => {
  it("records one cleanup run metadata row with completed final status", async () => {
    const db = new FakeD1Database();

    await runScheduledCleanup(
      { ...env, DB: db as unknown as D1Database },
      "2026-06-20T00:00:00.000Z",
    );

    const inserts = dbCallsContaining(db, "INSERT INTO cleanup_run_metadata");
    const updates = dbCallsContaining(db, "UPDATE cleanup_run_metadata");
    expect(inserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(inserts[0]?.bindings[0]).toMatch(ULID_REGEX);
    expect(inserts[0]?.bindings.slice(1)).toEqual([
      "started",
      "2026-06-20T00:00:00.000Z",
      null,
      0,
      null,
      "2027-06-20T00:00:00.000Z",
    ]);
    expect(updates[0]?.bindings).toEqual([
      "completed",
      expect.any(String),
      8,
      null,
      expect.any(String),
      inserts[0]?.bindings[0],
    ]);
    expect(dbBindingStrings(db)).not.toContain(
      "forbidden-cleanup-error-message",
    );
  });

  it("updates the same cleanup run metadata row with failed safe status", async () => {
    const db = new FakeD1Database();
    db.failRunSqlFragment = "DELETE FROM owner_notifications";

    await runScheduledCleanup(
      { ...env, DB: db as unknown as D1Database },
      "2026-06-20T00:00:00.000Z",
    );

    const inserts = dbCallsContaining(db, "INSERT INTO cleanup_run_metadata");
    const updates = dbCallsContaining(db, "UPDATE cleanup_run_metadata");
    expect(inserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.bindings).toEqual([
      "failed",
      expect.any(String),
      4,
      "cleanup_failed",
      expect.any(String),
      inserts[0]?.bindings[0],
    ]);
    expect(dbBindingStrings(db)).not.toContain("safe-test-d1-failure");
  });

  it("serves health", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/health"),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({ status: "ok" });
  });

  it("serves local owner identity behind explicit dev bypass", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "x-dev-access-subject": "owner@example.com",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-owner-discord-user-id": "123",
          "x-dev-owner-role": "regular_owner",
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      ownerDiscordUserId: "123",
      role: "regular_owner",
    });
  });

  it("rejects owner dev route without dev secret", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "x-dev-access-subject": "owner@example.com",
          "x-dev-owner-discord-user-id": "123",
          "x-dev-owner-role": "regular_owner",
        },
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("rejects production dev bypass even when explicitly enabled", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "x-dev-access-subject": "owner@example.com",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-owner-discord-user-id": "123",
          "x-dev-owner-role": "regular_owner",
        },
      }),
      { ...env, DC_CHATBOT_ENV: "production" },
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("rejects forwarded Cloudflare Access email without JWT", async () => {
    const db = new FakeD1Database();
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "cf-access-authenticated-user-email": "regular@example.com",
        },
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("rejects owner route when Access JWT config is missing", async () => {
    const db = new FakeD1Database();
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "Cf-Access-Jwt-Assertion": "invalid.jwt.token",
        },
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("rejects owner route when Access JWT is missing", async () => {
    const db = new FakeD1Database();
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me"),
      {
        ...env,
        CF_ACCESS_AUD: "owner-app-aud",
        CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
        DB: db as unknown as D1Database,
      },
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("authenticates owner route with verified Cloudflare Access JWT", async () => {
    const db = new FakeD1Database();
    const { publicJwk, token } = await createAccessJwt({
      aud: "owner-app-aud",
      email: "regular@example.com",
      kid: "test-access-key",
    });
    vi.stubGlobal("fetch", async (input: unknown) => {
      expect(String(input)).toBe(
        "https://team.cloudflareaccess.com/cdn-cgi/access/certs",
      );
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        headers: { "content-type": "application/json" },
      });
    });

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/me", {
        headers: {
          "Cf-Access-Jwt-Assertion": token,
        },
      }),
      {
        ...env,
        CF_ACCESS_AUD: "owner-app-aud",
        CF_ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
        DB: db as unknown as D1Database,
      },
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      ownerDiscordUserId: "111",
      role: "regular_owner",
    });
  });

  it("returns owner dashboard usage metadata without sensitive content fields", async () => {
    const db = new FakeD1Database();
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/dashboard", {
        headers: {
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-access-subject": "admin@example.com",
          "x-dev-owner-discord-user-id": "999",
          "x-dev-owner-role": "admin_owner",
        },
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toMatchObject({
      owner: {
        ownerDiscordUserId: "999",
        role: "admin_owner",
      },
      usage: {
        periodLabel: "Last 7 days",
        requestCount: 0,
        providerCallCount: 0,
        errorCount: 0,
      },
      recentErrors: [],
    });
    expect(JSON.stringify(body)).not.toContain("messageContent");
    expect(JSON.stringify(body)).not.toContain("promptBody");
    expect(JSON.stringify(body)).not.toContain("responseText");
    expect(JSON.stringify(body)).not.toContain("rawRequest");
    expect(JSON.stringify(body)).not.toContain("rawResponse");
    expect(JSON.stringify(body)).not.toContain("credential");
  });

  it("rejects bot route without dev secret", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          messageId: "100",
          channelId: "200",
          authorDiscordUserId: "300",
          triggerKind: "dm",
          isAllowedUser: true,
          isAutomatedSource: false,
          attachmentCount: 0,
          observedAt: "2026-06-20T00:00:00.000Z",
        }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("returns 503 for bot intake without DB outside local dev bypass", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/intake", {
        method: "POST",
        headers: {
          "cf-access-client-id": "client-id",
          "cf-access-client-secret": "client-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          messageId: "100",
          channelId: "200",
          authorDiscordUserId: "300",
          triggerKind: "dm",
          isAllowedUser: true,
          isAutomatedSource: false,
          attachmentCount: 0,
          observedAt: "2026-06-20T00:00:00.000Z",
        }),
      }),
      { ...env, DC_CHATBOT_ENV: "production" },
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      code: "database_unavailable",
    });
  });

  it("rejects pending Owner Notification claims without bot service auth", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/owner-notifications/pending"),
      env,
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ code: "unauthorized" });
  });

  it("claims metadata-only pending Owner Notifications for bot delivery", async () => {
    const db = new FakeD1Database([], [
      {
        owner_notification_id: "01HY0000000000000000000000",
        notification_owner_discord_user_id: "999",
        candidate_discord_user_id: "300",
        request_id: "01HY0000000000000000000001",
        trigger_kind: "dm",
        status: "pending_delivery",
        safe_error_category: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
    ]);

    const response = await worker.fetch(
      new Request(
        "https://api.test/api/v1/bot/owner-notifications/pending?limit=5",
        {
          headers: {
            "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
            "x-dev-bot-service": "true",
          },
        },
      ),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      ownerNotifications: [
        {
          ownerNotificationId: "01HY0000000000000000000000",
          notificationOwnerDiscordUserId: "999",
          candidateDiscordUserId: "300",
          requestId: "01HY0000000000000000000001",
          triggerKind: "dm",
          status: "delivery_requested",
          safeErrorCategory: null,
          createdAt: "2026-06-20T00:00:00.000Z",
        },
      ],
    });
    expect(
      dbCallsContaining(db, "UPDATE owner_notifications").at(-1)?.sql,
    ).toContain("AND status = 'pending_delivery'");
    expect(dbBindingStrings(db)).not.toContain(
      "SAFE_SENTINEL_OWNER_NOTIFICATION_CONTENT_001",
    );
  });

  it("rejects arbitrary Owner Notification delivery error categories", async () => {
    const response = await worker.fetch(
      new Request(
        "https://api.test/api/v1/bot/owner-notifications/delivery-status",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
            "x-dev-bot-service": "true",
          },
          body: JSON.stringify({
            ownerNotificationId: "01HY0000000000000000000000",
            status: "failed",
            safeErrorCategory: "unsafe_freeform_category",
          }),
        },
      ),
      { ...env, DB: new FakeD1Database() as unknown as D1Database },
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      code: "invalid_request",
    });
  });

  it("accepts metadata-only bot message intake", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          messageId: "100",
          channelId: "200",
          authorDiscordUserId: "300",
          triggerKind: "dm",
          isAllowedUser: true,
          isAutomatedSource: false,
          attachmentCount: 0,
          observedAt: "2026-06-20T00:00:00.000Z",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      action: "respond_without_context",
    });
  });

  it("returns 503 for bot respond without DB outside local dev bypass", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "cf-access-client-id": "client-id",
          "cf-access-client-secret": "client-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "fake-model",
          conversationContextMessageIds: [],
        }),
      }),
      { ...env, DC_CHATBOT_ENV: "production" },
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      code: "database_unavailable",
    });
  });

  it("returns safe response metadata for bot respond", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "fake-model",
          conversationContextMessageIds: [],
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toMatchObject({
      requestId: "01HY0000000000000000000000",
    });
    expect(body).toHaveProperty("replyChunks");
    expect((body as { providerCallId: unknown }).providerCallId).toMatch(
      ULID_REGEX,
    );
  });

  it("uses distinct fake provider call IDs for consecutive bot responses", async () => {
    const db = new FakeD1Database(["300"]);
    const buildRequest = (requestId: string) =>
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId,
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "fake-model",
          conversationContextMessageIds: [],
        }),
      });

    const firstResponse = await worker.fetch(
      buildRequest("01HY0000000000000000000000"),
      { ...env, DB: db as unknown as D1Database },
    );
    const secondResponse = await worker.fetch(
      buildRequest("01HY0000000000000000000002"),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    const firstBody = (await readJson(firstResponse)) as {
      providerCallId: string;
      decision: { shouldRespond: boolean };
    };
    const secondBody = (await readJson(secondResponse)) as {
      providerCallId: string;
      decision: { shouldRespond: boolean };
    };
    expect(firstBody.providerCallId).toMatch(ULID_REGEX);
    expect(secondBody.providerCallId).toMatch(ULID_REGEX);
    expect(firstBody.decision.shouldRespond).toBe(true);
    expect(secondBody.decision.shouldRespond).toBe(true);
    expect(secondBody.providerCallId).not.toBe(firstBody.providerCallId);
  });

  it("records fake provider call audit metadata without generated content", async () => {
    const db = new FakeD1Database(["300"]);
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "fake-model",
          conversationContextMessageIds: [],
        }),
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    const body = (await readJson(response)) as { replyChunks: string[] };
    const providerAudit = dbCallsContaining(
      db,
      "INSERT INTO provider_call_audit_metadata",
    );
    expect(providerAudit).toHaveLength(3);
    expect(providerAudit.map((call) => call.bindings[5])).toEqual([
      "context_selection",
      "response_decision",
      "response_generation",
    ]);
    expect(providerAudit.at(-1)?.bindings.slice(1, 8)).toEqual([
      "01HY0000000000000000000000",
      "fake",
      "local",
      "fake-model",
      "response_generation",
      "completed",
      null,
    ]);
    expect(
      dbCallsContaining(db, "INSERT INTO provider_settings").at(-1)?.bindings,
    ).toEqual([
      "fake",
      "available",
      expect.any(String),
      null,
      "singleton",
      expect.any(String),
      expect.any(String),
    ]);
    expect(dbBindingStrings(db)).not.toContain(body.replyChunks[0]);
  });

  it("skips Context Selection and Response Decision audits for Automated Trigger Sources", async () => {
    const db = new FakeD1Database([], [], ["300"]);
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "automated_trigger_source",
          model: "fake-model",
          conversationContextMessageIds: ["100"],
        }),
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    const providerAudit = dbCallsContaining(
      db,
      "INSERT INTO provider_call_audit_metadata",
    );
    expect(providerAudit).toHaveLength(1);
    expect(providerAudit[0]?.bindings[5]).toBe("response_generation");
    expect(
      dbCallsContaining(db, "INSERT INTO selected_context_message_ids").at(-1)
        ?.bindings,
    ).toContain("automated_trigger");
  });

  it("passes safe attachment metadata transiently for allowed non-automated responses", async () => {
    const db = new FakeD1Database(["300"]);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: { content: string }[];
      };
      expect(JSON.stringify(body)).toContain("Attachment metadata only");
      expect(JSON.stringify(body)).toContain("image=1");
      expect(JSON.stringify(body)).toContain("image/png");
      expect(JSON.stringify(body)).not.toContain("700");
      return new Response(
        JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "meta/llama-3.1-70b-instruct",
          conversationContextMessageIds: [],
          attachmentMetadata: [
            {
              attachmentId: "700",
              kind: "image",
              contentType: "image/png",
              sizeBytes: 1024,
            },
          ],
        }),
      }),
      {
        ...env,
        DB: db as unknown as D1Database,
        LLM_PROVIDER: "nvidia_nim",
        NVIDIA_NIM_BEARER_TOKEN: "1",
      },
    );

    expect(response.status).toBe(200);
    expectNoDbBindingString(db, ["image/png", "Attachment metadata only"]);
  });

  it("drops attachment metadata before provider calls for Automated Trigger Sources", async () => {
    const db = new FakeD1Database([], [], ["300"]);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(JSON.stringify(body)).not.toContain("Attachment metadata only");
      expect(JSON.stringify(body)).not.toContain("image/png");
      expect(JSON.stringify(body)).not.toContain("700");
      return new Response(
        JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "automated_trigger_source",
          model: "meta/llama-3.1-70b-instruct",
          conversationContextMessageIds: ["100"],
          attachmentMetadata: [
            {
              attachmentId: "700",
              kind: "image",
              contentType: "image/png",
              sizeBytes: 1024,
            },
          ],
        }),
      }),
      {
        ...env,
        DB: db as unknown as D1Database,
        LLM_PROVIDER: "nvidia_nim",
        NVIDIA_NIM_BEARER_TOKEN: "1",
      },
    );

    expect(response.status).toBe(200);
    expectNoDbBindingString(db, ["image/png", "Attachment metadata only"]);
  });

  it("returns metadata-only no-response decision before provider availability check", async () => {
    const db = new FakeD1Database(["300"]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "guild_mention",
          model: "meta/llama-3.1-70b-instruct",
          conversationContextMessageIds: [],
        }),
      }),
      {
        ...env,
        DB: db as unknown as D1Database,
        LLM_PROVIDER: "nvidia_nim",
      },
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      requestId: "01HY0000000000000000000000",
      decision: {
        shouldRespond: false,
        reason: "no_selected_context",
      },
      replyChunks: [],
      providerCallId: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const providerAudit = dbCallsContaining(
      db,
      "INSERT INTO provider_call_audit_metadata",
    );
    expect(providerAudit.map((call) => call.bindings[5])).toEqual([
      "context_selection",
      "response_decision",
    ]);
    expect(
      providerAudit.some((call) => call.bindings[5] === "response_generation"),
    ).toBe(false);
    expect(
      dbCallsContaining(db, "INSERT INTO selected_context_message_ids"),
    ).toHaveLength(0);
  });

  it("maps missing NVIDIA NIM API Key configuration to safe metadata", async () => {
    const db = new FakeD1Database(["300"]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "meta/llama-3.1-70b-instruct",
          conversationContextMessageIds: [],
        }),
      }),
      {
        ...env,
        DB: db as unknown as D1Database,
        LLM_PROVIDER: "nvidia_nim",
      },
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      code: "provider_not_configured",
      requestId: "01HY0000000000000000000000",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      dbCallsContaining(db, "INSERT INTO provider_settings").at(-1)?.bindings,
    ).toEqual([
      "nvidia_nim",
      "not_configured",
      expect.any(String),
      "not_configured",
      "singleton",
      expect.any(String),
      expect.any(String),
    ]);
    expect(
      dbCallsContaining(db, "INSERT INTO provider_call_audit_metadata").at(-1)
        ?.bindings.slice(1, 8),
    ).toEqual([
      "01HY0000000000000000000000",
      "nvidia_nim",
      "deployment",
      "meta/llama-3.1-70b-instruct",
      "response_generation",
      "failed",
      "not_configured",
    ]);
  });

  it("maps invalid NVIDIA NIM provider access to safe audit metadata", async () => {
    const db = new FakeD1Database(["300"]);
    const tokenPlaceholder = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/respond", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          triggerMessageId: "100",
          triggerAuthorDiscordUserId: "300",
          triggerKind: "dm",
          model: "meta/llama-3.1-70b-instruct",
          conversationContextMessageIds: [],
        }),
      }),
      {
        ...env,
        DB: db as unknown as D1Database,
        LLM_PROVIDER: "nvidia_nim",
        NVIDIA_NIM_BEARER_TOKEN: tokenPlaceholder,
      },
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      code: "provider_authentication_failed",
      requestId: "01HY0000000000000000000000",
    });
    expect(
      dbCallsContaining(db, "INSERT INTO provider_settings").at(-1)?.bindings,
    ).toEqual([
      "nvidia_nim",
      "unavailable",
      expect.any(String),
      "authentication_failed",
      "singleton",
      expect.any(String),
      expect.any(String),
    ]);
    expect(
      dbCallsContaining(db, "INSERT INTO provider_call_audit_metadata").at(-1)
        ?.bindings.slice(1, 8),
    ).toEqual([
      "01HY0000000000000000000000",
      "nvidia_nim",
      "deployment",
      "meta/llama-3.1-70b-instruct",
      "response_generation",
      "failed",
      "authentication_failed",
    ]);
    expectNoDbBindingString(db, [
      tokenPlaceholder,
      `Bearer ${tokenPlaceholder}`,
      "authorization",
      "chat/completions",
      "choices",
    ]);
  });

  it("rejects Regular Owner metadata settings mutation", async () => {
    const db = new FakeD1Database();
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/owner/settings/bot", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-dev-access-subject": "regular@example.com",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
        },
        body: JSON.stringify({
          automatedTriggerDefaultCooldownSeconds: 120,
        }),
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toMatchObject({ code: "forbidden" });
  });

  it("does not persist transient Discord message content from bot intake", async () => {
    const db = new FakeD1Database();
    const secretContent = "VERY_SECRET_TRANSIENT_MESSAGE_CONTENT";
    const response = await worker.fetch(
      new Request("https://api.test/api/v1/bot/messages/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-auth-secret": LOCAL_AUTH_BYPASS_SECRET,
          "x-dev-bot-service": "true",
        },
        body: JSON.stringify({
          requestId: "01HY0000000000000000000000",
          messageId: "100",
          channelId: "200",
          authorDiscordUserId: "300",
          authorDisplayNameSnapshot: "Candidate",
          triggerKind: "dm",
          isAllowedUser: false,
          isAutomatedSource: false,
          messageContent: secretContent,
          attachmentCount: 0,
          observedAt: "2026-06-20T00:00:00.000Z",
        }),
      }),
      { ...env, DB: db as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      action: "record_candidate",
    });
    expect(db.calls.flatMap((call) => call.bindings)).not.toContain(
      secretContent,
    );
    const requestAuditInsert = db.calls.find((call) =>
      call.sql.includes("INSERT INTO request_audit_metadata"),
    );
    expect(requestAuditInsert?.bindings[7]).toBe("2026-06-20T00:00:00.000Z");
    expect(requestAuditInsert?.bindings[8]).toBe("2026-07-20T00:00:00.000Z");
  });
});
