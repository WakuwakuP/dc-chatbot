import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, it } from "vitest";
import {
  createOwnerApiClient,
  OwnerApiProblemError,
} from "../src/api/ownerApi";
import { AppRoutes } from "../src/routes/AppRoutes";

function renderRoute(location: string) {
  return renderToString(
    <StaticRouter location={location}>
      <AppRoutes />
    </StaticRouter>,
  );
}

describe("Owner UI routes", () => {
  it("renders the management dashboard shell", () => {
    const html = renderRoute("/");

    expect(html).toContain("dc-chatbot Owner UI");
    expect(html).toContain("Owner dashboard");
    expect(html).toContain("metadata-only audit");
  });

  it("renders management routes with Japanese empty-state labels", () => {
    expect(renderRoute("/members")).toContain("Registered Members");
    expect(renderRoute("/members")).toContain("Member registration");
    expect(renderRoute("/candidates")).toContain("Candidate Discord Users");
    expect(renderRoute("/settings")).toContain("Settings");
    expect(renderRoute("/automated-trigger-sources")).toContain(
      "Automated Trigger Sources",
    );
  });
});

describe("Owner API client", () => {
  it("throws ProblemDetails for non-OK owner responses", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Not found",
          status: 404,
          code: "not_found",
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        },
      );
    const api = createOwnerApiClient(fetchImpl);

    await expect(api.getDashboardSummary()).rejects.toBeInstanceOf(
      OwnerApiProblemError,
    );

    try {
      await api.getDashboardSummary();
    } catch (error) {
      expect(error).toBeInstanceOf(OwnerApiProblemError);
      expect((error as OwnerApiProblemError).problem).toMatchObject({
        status: 404,
        code: "not_found",
      });
    }
  });

  it("keeps dashboard state to known metadata fields", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          owner: {
            ownerDiscordUserId: "123456789012345678",
            role: "admin_owner",
            managedMemberCount: 2,
            extra: "discarded-extra-field",
          },
          usage: {
            periodLabel: "直近30日",
            requestCount: 4,
            providerCallCount: 3,
            errorCount: 1,
            buckets: [{ label: "today", requestCount: 4, errorCount: 1 }],
          },
          recentErrors: [
            {
              id: "01J00000000000000000000000",
              occurredAt: "2026-06-20T00:00:00.000Z",
              surface: "owner_api",
              category: "provider_timeout",
              extra: "discarded-extra-field",
            },
          ],
          settingsWarnings: [{ code: "model_missing", title: "model 未設定" }],
          extra: "discarded-extra-field",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    const api = createOwnerApiClient(fetchImpl);

    const summary = await api.getDashboardSummary();

    expect(summary.owner.ownerDiscordUserId).toBe("123456789012345678");
    expect(summary.usage.requestCount).toBe(4);
    expect(JSON.stringify(summary)).not.toContain("discarded-extra-field");
  });
});
