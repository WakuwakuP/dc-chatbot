import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/worker";

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

    return null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    this.db.calls.push({ sql: this.sql, bindings: this.bindings });
    return { meta: { changes: 1 } };
  }

  async all<T>(): Promise<{ results: T[] }> {
    this.db.calls.push({ sql: this.sql, bindings: this.bindings });
    return { results: [] };
  }
}

class FakeD1Database {
  readonly calls: { sql: string; bindings: unknown[] }[] = [];
  readonly allowedOwnerDiscordUserIds: Set<string>;

  constructor(allowedOwnerDiscordUserIds: readonly string[] = []) {
    this.allowedOwnerDiscordUserIds = new Set(allowedOwnerDiscordUserIds);
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
    };
    const secondBody = (await readJson(secondResponse)) as {
      providerCallId: string;
    };
    expect(firstBody.providerCallId).toMatch(ULID_REGEX);
    expect(secondBody.providerCallId).toMatch(ULID_REGEX);
    expect(secondBody.providerCallId).not.toBe(firstBody.providerCallId);
  });

  it("records fake provider call audit metadata without response text", async () => {
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
    expect(providerAudit).toHaveLength(1);
    expect(providerAudit[0]?.bindings.slice(1, 7)).toEqual([
      "01HY0000000000000000000000",
      "fake",
      "local",
      "fake-model",
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
        ?.bindings.slice(1, 7),
    ).toEqual([
      "01HY0000000000000000000000",
      "nvidia_nim",
      "deployment",
      "meta/llama-3.1-70b-instruct",
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
        ?.bindings.slice(1, 7),
    ).toEqual([
      "01HY0000000000000000000000",
      "nvidia_nim",
      "deployment",
      "meta/llama-3.1-70b-instruct",
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
