import { describe, expect, it } from "vitest";
import { buildRetentionCleanupPlan } from "../src/index";

describe("buildRetentionCleanupPlan", () => {
  it("builds forward cleanup statements for retention-owned tables", () => {
    const plan = buildRetentionCleanupPlan("2026-06-20T00:00:00.000Z");

    expect(plan.map((item) => item.tableName)).toContain(
      "request_audit_metadata",
    );
    expect(plan.every((item) => item.sql.includes("retain_until"))).toBe(true);
  });
});
