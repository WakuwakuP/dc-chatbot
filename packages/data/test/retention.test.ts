import { describe, expect, it } from "vitest";
import { D1DcChatbotRepository, buildRetentionCleanupPlan } from "../src/index";

class RecordingStatement {
  private bindings: unknown[] = [];

  constructor(
    private readonly recorder: { sql: string; bindings: unknown[] }[],
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): this {
    this.bindings = values;
    return this;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    this.recorder.push({ sql: this.sql, bindings: this.bindings });
    return { meta: { changes: 1 } };
  }

  async first<T>(): Promise<T | null> {
    this.recorder.push({ sql: this.sql, bindings: this.bindings });
    return null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    this.recorder.push({ sql: this.sql, bindings: this.bindings });
    return { results: [] };
  }
}

class RecordingD1Database {
  readonly statements: { sql: string; bindings: unknown[] }[] = [];

  prepare(sql: string): RecordingStatement {
    return new RecordingStatement(this.statements, sql);
  }
}

describe("buildRetentionCleanupPlan", () => {
  it("builds forward cleanup statements for retention-owned tables", () => {
    const plan = buildRetentionCleanupPlan("2026-06-20T00:00:00.000Z");

    expect(plan.map((item) => item.tableName)).toContain(
      "request_audit_metadata",
    );
    expect(plan.map((item) => item.tableName)).toContain("owner_notifications");
    expect(
      plan.find((item) => item.tableName === "candidate_discord_users")?.sql,
    ).toContain("expires_at");
    expect(plan.map((item) => item.tableName)).not.toContain(
      "provider_settings",
    );
  });
});

describe("D1DcChatbotRepository role-scoped mutations", () => {
  it("scopes Regular Owner member disable to assigned Owner Discord User", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    await repository.disableRegisteredMember(
      { ownerDiscordUserId: "111", role: "regular_owner" },
      "222",
      "2026-06-20T00:00:00.000Z",
    );

    const update = db.statements.find((item) =>
      item.sql.includes("UPDATE registered_members"),
    );
    expect(update?.sql).toContain("assigned_owner_discord_user_id = ?");
    expect(update?.bindings).toEqual([
      "2026-06-20T00:00:00.000Z",
      "222",
      "111",
    ]);
  });

  it("does not bind response text or prompt body in response message metadata", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    await repository.insertDiscordResponseMessage({
      responseMessageId: "01HY0000000000000000000000",
      requestId: "01HY0000000000000000000001",
      discordMessageId: "333",
      guildId: null,
      channelId: "444",
      chunkIndex: 0,
      chunkCount: 1,
      status: "posted",
      createdAt: "2026-06-20T00:00:00.000Z",
      retainUntil: "2026-07-20T00:00:00.000Z",
    });

    const boundValues = db.statements.flatMap((item) => item.bindings);
    expect(boundValues).not.toContain("forbidden-response-text-marker");
    expect(boundValues).not.toContain("forbidden-prompt-body-marker");
  });

  it("records metadata-only NVIDIA NIM provider call audit", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    await repository.insertProviderCallAudit({
      providerCallId: "01HY0000000000000000000002",
      requestId: "01HY0000000000000000000003",
      providerKind: "nvidia_nim",
      providerRef: "deployment",
      model: "meta/llama-3.1-8b-instruct",
      providerCallStage: "response_generation",
      status: "failed",
      safeErrorCategory: "authentication_failed",
      durationMs: 250,
      createdAt: "2026-06-20T00:00:00.000Z",
      retainUntil: "2027-06-20T00:00:00.000Z",
    });

    const insert = db.statements.find((item) =>
      item.sql.includes("INSERT INTO provider_call_audit_metadata"),
    );
    expect(insert?.sql).toContain("provider_kind");
    expect(insert?.sql).toContain("provider_ref");
    expect(insert?.sql).toContain("provider_call_stage");
    expect(insert?.sql).not.toContain("connection_id");
    expect(insert?.bindings).toContain("nvidia_nim");
    expect(insert?.bindings).toContain("deployment");
    expect(insert?.bindings).toContain("response_generation");
    expect(insert?.bindings).toContain("authentication_failed");
    const boundValues = db.statements.flatMap((item) => item.bindings);
    expect(boundValues).not.toContain("forbidden-provider-secret-marker");
    expect(boundValues).not.toContain("forbidden-provider-bearer-marker");
    expect(boundValues).not.toContain("forbidden-provider-raw-body-marker");
    expect(boundValues).not.toContain("forbidden-prompt-body-marker");
    expect(boundValues).not.toContain("forbidden-response-text-marker");
  });

  it("upserts metadata-only Configured Provider Access status", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    await repository.upsertProviderConfigMetadata({
      providerKind: "nvidia_nim",
      configuredProviderAccessStatus: "unavailable",
      checkedAt: "2026-06-20T00:00:00.000Z",
      safeErrorCategory: "temporary_unavailable",
      nowIsoUtc: "2026-06-20T00:00:01.000Z",
    });

    const upsert = db.statements.find((item) =>
      item.sql.includes("INSERT INTO provider_settings"),
    );
    expect(upsert?.sql).toContain("configured_provider_access_status");
    expect(upsert?.sql).toContain("safe_error_category");
    expect(upsert?.sql).not.toContain("credential");
    expect(upsert?.bindings).toEqual([
      "nvidia_nim",
      "unavailable",
      "2026-06-20T00:00:00.000Z",
      "temporary_unavailable",
      "singleton",
      "2026-06-20T00:00:01.000Z",
      "2026-06-20T00:00:01.000Z",
    ]);
  });

  it("updates cleanup run metadata by stable run ID", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    await repository.updateCleanupRunMetadata({
      cleanupRunId: "01HY0000000000000000000004",
      status: "completed",
      finishedAt: "2026-06-20T00:01:00.000Z",
      deletedRowCount: 7,
      safeErrorCategory: null,
      retainUntil: "2027-06-20T00:01:00.000Z",
    });

    const update = db.statements.find((item) =>
      item.sql.includes("UPDATE cleanup_run_metadata"),
    );
    expect(update?.sql).toContain("WHERE cleanup_run_id = ?");
    expect(update?.bindings).toEqual([
      "completed",
      "2026-06-20T00:01:00.000Z",
      7,
      null,
      "2027-06-20T00:01:00.000Z",
      "01HY0000000000000000000004",
    ]);
  });

  it("returns default provider config metadata without credential assumptions", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    const settings = await repository.getOwnerSettings(
      "2026-06-20T00:00:00.000Z",
    );

    expect(settings.providerConfig).toEqual({
      providerKind: "fake",
      configuredProviderAccess: {
        status: "available",
        checkedAt: null,
        safeErrorCategory: null,
      },
      modelSettings: {
        contextSelectionModel: "fake-context-selection",
        responseDecisionModel: "fake-response-decision",
        responseGenerationModel: "fake-response-generation",
        updatedAt: "2026-06-20T00:00:00.000Z",
      },
      updatedAt: "2026-06-20T00:00:00.000Z",
    });
    const sqlText = db.statements.map((item) => item.sql).join("\n");
    expect(sqlText).toContain("FROM provider_settings");
    expect(sqlText).not.toContain("chatgpt_subscription_connections");
  });

  it("aggregates Admin Owner dashboard usage from metadata-only audit tables", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    const summary = await repository.getDashboardSummary(
      { ownerDiscordUserId: "999", role: "admin_owner" },
      "2026-06-20T12:00:00.000Z",
    );

    expect(summary.usage.periodStart).toBe("2026-06-14T00:00:00.000Z");
    expect(summary.usage.periodEnd).toBe("2026-06-20T12:00:00.000Z");
    expect(summary.usage.buckets).toHaveLength(7);
    expect(summary.settingsWarnings.map((warning) => warning.code)).toEqual([
      "notification_owner_missing",
      "prompt_metadata_missing",
    ]);

    const sqlText = db.statements.map((item) => item.sql).join("\n");
    expect(sqlText).toContain("FROM request_audit_metadata");
    expect(sqlText).toContain("FROM provider_call_audit_metadata");
    expect(sqlText).toContain("request_audit_id AS id");
    expect(sqlText).toContain("provider_call_id AS id");
    const auditSqlText = db.statements
      .filter(
        (item) =>
          item.sql.includes("request_audit_metadata") ||
          item.sql.includes("provider_call_audit_metadata"),
      )
      .map((item) => item.sql)
      .join("\n");
    expect(auditSqlText).not.toContain("message_content");
    expect(auditSqlText).not.toContain("prompt_body");
    expect(auditSqlText).not.toContain("response_text");
    expect(auditSqlText).not.toContain("raw_request");
    expect(auditSqlText).not.toContain("raw_response");
    expect(auditSqlText).not.toContain("credential");
  });

  it("keeps Regular Owner dashboard audit usage empty when audit rows lack owner scope", async () => {
    const db = new RecordingD1Database();
    const repository = new D1DcChatbotRepository(db as unknown as D1Database);

    const summary = await repository.getDashboardSummary(
      { ownerDiscordUserId: "111", role: "regular_owner" },
      "2026-06-20T12:00:00.000Z",
    );

    expect(summary.usage.requestCount).toBe(0);
    expect(summary.usage.providerCallCount).toBe(0);
    expect(summary.usage.errorCount).toBe(0);
    expect(summary.recentErrors).toEqual([]);

    const sqlText = db.statements.map((item) => item.sql).join("\n");
    expect(sqlText).not.toContain("FROM request_audit_metadata");
    expect(sqlText).not.toContain("FROM provider_call_audit_metadata");
  });
});
