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
    expect(boundValues).not.toContain("SECRET_RESPONSE_TEXT");
    expect(boundValues).not.toContain("SECRET_PROMPT_BODY");
  });
});
