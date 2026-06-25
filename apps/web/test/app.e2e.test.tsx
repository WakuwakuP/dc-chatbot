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

  it("maps current dashboard summary metadata fields", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          owner: {
            ownerDiscordUserId: "123456789012345678",
            role: "admin_owner",
            extra: "discarded-extra-field",
          },
          registeredMemberCounts: {
            active: 2,
            disabled: 1,
          },
          candidateDiscordUserCount: 3,
          pendingOwnerNotificationCount: 4,
          automatedTriggerSourceCounts: { active: 5, disabled: 6 },
          usage: {
            periodStart: "2026-06-14T00:00:00.000Z",
            periodEnd: "2026-06-20T12:00:00.000Z",
            periodLabel: "Last 7 days",
            requestCount: 7,
            providerCallCount: 8,
            errorCount: 2,
            buckets: [
              {
                label: "2026-06-20",
                periodStart: "2026-06-20T00:00:00.000Z",
                periodEnd: "2026-06-21T00:00:00.000Z",
                requestCount: 1,
                providerCallCount: 2,
                errorCount: 1,
                extra: "discarded-extra-field",
              },
            ],
          },
          recentErrors: [
            {
              id: "01J00000000000000000000000",
              occurredAt: "2026-06-20T01:00:00.000Z",
              surface: "provider",
              category: "temporary_unavailable",
              requestId: "01J00000000000000000000001",
              extra: "discarded-extra-field",
            },
          ],
          settingsWarnings: [
            {
              code: "configured_provider_access_unavailable",
              title: "Configured Provider Access is unavailable",
              severity: "warning",
              extra: "discarded-extra-field",
            },
          ],
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
    expect(summary.registeredMemberCounts.active).toBe(2);
    expect(summary.candidateDiscordUserCount).toBe(3);
    expect(summary.automatedTriggerSourceCounts.disabled).toBe(6);
    expect(summary.usage.providerCallCount).toBe(8);
    expect(summary.usage.buckets[0]?.errorCount).toBe(1);
    expect(summary.recentErrors[0]?.category).toBe("temporary_unavailable");
    expect(summary.settingsWarnings[0]?.severity).toBe("warning");
    expect(JSON.stringify(summary)).not.toContain("discarded-extra-field");
  });

  it("maps current settings response without prompt body content", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          botSettings: {
            notificationOwnerDiscordUserId: "123456789012345678",
            automatedTriggerDefaultCooldownSeconds: 90,
            updatedAt: "2026-06-20T00:00:00.000Z",
          },
          modelSettings: {
            contextSelectionModel: "meta/llama-context",
            responseDecisionModel: "meta/llama-decision",
            responseGenerationModel: "meta/llama-generation",
          },
          promptSettings: [
            {
              promptSettingId: "01J00000000000000000000000",
              promptKey: "response_generation",
              activeVersionId: "01J00000000000000000000001",
              activePromptBodySha256:
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
              activePromptBodyLength: 120,
              updatedAt: "2026-06-20T00:00:00.000Z",
              extraMetadata: "discarded-extra-field",
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    const api = createOwnerApiClient(fetchImpl);

    const settings = await api.getSettings();

    expect(settings.modelSettings.responseGenerationModel).toBe(
      "meta/llama-generation",
    );
    expect(settings.promptSettings[0]?.activePromptBodyLength).toBe(120);
    expect(JSON.stringify(settings)).not.toContain("discarded-extra-field");
  });

  it("uses current Automated Trigger Source endpoints and fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const source = {
      automatedTriggerSourceId: "01J00000000000000000000000",
      sourceDiscordUserId: "234567890123456789",
      sourceApplicationId: null,
      assignedOwnerDiscordUserId: "123456789012345678",
      status: "active",
      replyMode: "channel_message",
      cooldownSeconds: 120,
      lastTriggeredAt: null,
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
    };
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(source), {
        status: init?.method === "POST" ? 201 : 200,
        headers: { "content-type": "application/json" },
      });
    };
    const api = createOwnerApiClient(fetchImpl);

    const created = await api.createAutomatedTriggerSource({
      sourceDiscordUserId: "234567890123456789",
      assignedOwnerDiscordUserId: "123456789012345678",
      replyMode: "channel_message",
      cooldownSeconds: 120,
    });
    const updated = await api.updateAutomatedTriggerSource(
      created.automatedTriggerSourceId,
      { status: "disabled", replyMode: "none", cooldownSeconds: 60 },
    );

    expect(calls[0]?.url).toContain(
      "/api/v1/owner/automated-trigger-sources",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[1]?.url).toContain(
      "/api/v1/owner/automated-trigger-sources/01J00000000000000000000000",
    );
    expect(calls[1]?.init?.method).toBe("PUT");
    expect(updated.replyMode).toBe("channel_message");
  });
});
