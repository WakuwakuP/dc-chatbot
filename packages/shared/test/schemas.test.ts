import { describe, expect, it } from "vitest";
import {
  AttachmentMetadataInputSchema,
  BotMessageIntakeRequestSchema,
  BotRespondRequestSchema,
  BotOwnerNotificationDeliveryListResponseSchema,
  BotOwnerNotificationDeliveryUpdateRequestSchema,
  BotRespondResponseSchema,
  OwnerDashboardSummaryResponseSchema,
  OwnerSettingsResponseSchema,
  ProviderCallStageSchema,
  ProviderConfigMetadataSchema,
  SafeProviderErrorCategorySchema,
  UpdatePromptSettingsMetadataRequestSchema,
  parseJson,
} from "../src/index";

describe("AttachmentMetadataInputSchema", () => {
  it("accepts safe bounded attachment metadata", () => {
    const parsed = parseJson(AttachmentMetadataInputSchema, {
      attachmentId: "123",
      kind: "image",
      contentType: "image/png",
      sizeBytes: 1024,
      nameLength: 8,
    });

    expect(parsed).toEqual({
      attachmentId: "123",
      kind: "image",
      contentType: "image/png",
      sizeBytes: 1024,
      nameLength: 8,
    });
  });

  it("rejects oversized attachment metadata", () => {
    expect(() =>
      parseJson(AttachmentMetadataInputSchema, {
        attachmentId: "123",
        kind: "image",
        sizeBytes: 10 * 1024 * 1024 + 1,
      }),
    ).toThrow();
  });

  it("rejects attachment URL fields", () => {
    expect(() =>
      parseJson(AttachmentMetadataInputSchema, {
        attachmentId: "123",
        kind: "image",
        sizeBytes: 1024,
        attachmentUrl: "forbidden",
      }),
    ).toThrow();
  });

  it("rejects arbitrary attachment content type text", () => {
    expect(() =>
      parseJson(AttachmentMetadataInputSchema, {
        attachmentId: "123",
        kind: "text",
        contentType: "not mime text",
        sizeBytes: 1024,
      }),
    ).toThrow();
  });
});

describe("BotMessageIntakeRequestSchema", () => {
  it("accepts metadata-only message intake", () => {
    const parsed = parseJson(BotMessageIntakeRequestSchema, {
      requestId: "01HY0000000000000000000000",
      messageId: "123",
      channelId: "456",
      authorDiscordUserId: "789",
      triggerKind: "dm",
      isAllowedUser: true,
      isAutomatedSource: false,
      attachmentCount: 0,
      observedAt: "2026-06-20T00:00:00.000Z",
    });

    expect(parsed.triggerKind).toBe("dm");
    expect("messageContent" in parsed).toBe(false);
  });
});

describe("BotRespondRequestSchema", () => {
  it("accepts bounded safe attachment metadata without attachment content", () => {
    const parsed = parseJson(BotRespondRequestSchema, {
      requestId: "01HY0000000000000000000000",
      triggerMessageId: "123",
      triggerAuthorDiscordUserId: "789",
      triggerKind: "dm",
      model: "fake-model",
      conversationContextMessageIds: [],
      attachmentMetadata: [
        {
          attachmentId: "456",
          kind: "text",
          contentType: "text/plain",
          sizeBytes: 512,
        },
      ],
    });

    expect(parsed.attachmentMetadata?.[0]?.kind).toBe("text");
    expect(JSON.stringify(parsed)).not.toContain("attachmentUrl");
    expect(JSON.stringify(parsed)).not.toContain("filename");
    expect(JSON.stringify(parsed)).not.toContain("attachmentBytes");
    expect(JSON.stringify(parsed)).not.toContain("attachmentContent");
  });

  it("rejects attachment metadata beyond the per-request bound", () => {
    expect(() =>
      parseJson(BotRespondRequestSchema, {
        requestId: "01HY0000000000000000000000",
        triggerMessageId: "123",
        triggerAuthorDiscordUserId: "789",
        triggerKind: "dm",
        model: "fake-model",
        conversationContextMessageIds: [],
        attachmentMetadata: Array.from({ length: 11 }, (_value, index) => ({
          attachmentId: String(1000 + index),
          kind: "other",
          sizeBytes: 1,
        })),
      }),
    ).toThrow();
  });
});

describe("BotOwnerNotificationDeliveryListResponseSchema", () => {
  it("accepts metadata-only Owner Notification delivery instructions", () => {
    const parsed = parseJson(BotOwnerNotificationDeliveryListResponseSchema, {
      ownerNotifications: [
        {
          ownerNotificationId: "01HY0000000000000000000000",
          notificationOwnerDiscordUserId: "123",
          candidateDiscordUserId: "456",
          requestId: "01HY0000000000000000000001",
          triggerKind: "dm",
          status: "delivery_requested",
          safeErrorCategory: null,
          createdAt: "2026-06-20T00:00:00.000Z",
          updatedAt: "2026-06-20T00:00:01.000Z",
        },
      ],
    });

    expect(parsed.ownerNotifications[0]?.candidateDiscordUserId).toBe("456");
    expect(JSON.stringify(parsed)).not.toContain("messageContent");
  });
});

describe("BotOwnerNotificationDeliveryUpdateRequestSchema", () => {
  it("rejects arbitrary Owner Notification delivery error categories", () => {
    expect(() =>
      parseJson(BotOwnerNotificationDeliveryUpdateRequestSchema, {
        ownerNotificationId: "01HY0000000000000000000000",
        status: "failed",
        safeErrorCategory: "unsafe_freeform_category",
      }),
    ).toThrow();
  });
});

describe("BotRespondResponseSchema", () => {
  it("accepts metadata-only final Response Decision skip", () => {
    const parsed = parseJson(BotRespondResponseSchema, {
      requestId: "01HY0000000000000000000000",
      decision: {
        shouldRespond: false,
        reason: "trigger_message_not_selected",
      },
      replyChunks: [],
      providerCallId: null,
    });

    expect(parsed.decision?.shouldRespond).toBe(false);
    expect(parsed.replyChunks).toEqual([]);
  });
});

describe("Provider metadata schemas", () => {
  it("accepts metadata-only NVIDIA NIM provider config", () => {
    const parsed = parseJson(ProviderConfigMetadataSchema, {
      providerKind: "nvidia_nim",
      configuredProviderAccess: {
        status: "available",
        checkedAt: "2026-06-20T00:00:00.000Z",
      },
      modelSettings: {
        contextSelectionModel: "fake-context-selection",
        responseDecisionModel: "fake-response-decision",
        responseGenerationModel: "fake-response-generation",
      },
    });

    expect(parsed.providerKind).toBe("nvidia_nim");
    expect(Object.keys(parsed)).toEqual([
      "providerKind",
      "configuredProviderAccess",
      "modelSettings",
    ]);
  });

  it("accepts safe provider error categories without secret material", () => {
    const parsed = parseJson(
      SafeProviderErrorCategorySchema,
      "authentication_failed",
    );

    expect(parsed).toBe("authentication_failed");
  });

  it("accepts explicit provider call stages", () => {
    const parsed = parseJson(ProviderCallStageSchema, "response_decision");

    expect(parsed).toBe("response_decision");
  });
});

describe("Owner settings schemas", () => {
  it("accepts prompt settings metadata without prompt body", () => {
    const parsed = parseJson(UpdatePromptSettingsMetadataRequestSchema, {
      promptKey: "response_generation",
      promptBodySha256:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptBodyLength: 1024,
      label: "MVP default",
    });

    expect(parsed.promptKey).toBe("response_generation");
    expect("promptBody" in parsed).toBe(false);
  });

  it("accepts Owner dashboard settings metadata response", () => {
    const parsed = parseJson(OwnerSettingsResponseSchema, {
      botSettings: {
        notificationOwnerDiscordUserId: "123",
        automatedTriggerDefaultCooldownSeconds: 60,
        updatedAt: "2026-06-20T00:00:00.000Z",
      },
      modelSettings: {
        contextSelectionModel: "fake-context-selection",
        responseDecisionModel: "fake-response-decision",
        responseGenerationModel: "fake-response-generation",
      },
      promptSettings: [
        {
          promptSettingId: "01HY0000000000000000000000",
          promptKey: "response_generation",
          activeVersionId: "01HY0000000000000000000001",
          activePromptBodySha256:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          activePromptBodyLength: 1024,
          updatedAt: "2026-06-20T00:00:00.000Z",
        },
      ],
    });

    expect(parsed.promptSettings[0]?.activePromptBodyLength).toBe(1024);
  });
});

describe("OwnerDashboardSummaryResponseSchema", () => {
  it("accepts metadata-only usage, recent errors, and settings warnings", () => {
    const parsed = parseJson(OwnerDashboardSummaryResponseSchema, {
      owner: {
        ownerDiscordUserId: "123",
        role: "admin_owner",
      },
      registeredMemberCounts: { active: 1, disabled: 0 },
      candidateDiscordUserCount: 2,
      pendingOwnerNotificationCount: 3,
      automatedTriggerSourceCounts: { active: 4, disabled: 5 },
      usage: {
        periodStart: "2026-06-14T00:00:00.000Z",
        periodEnd: "2026-06-20T12:00:00.000Z",
        periodLabel: "Last 7 days",
        requestCount: 6,
        providerCallCount: 7,
        errorCount: 2,
        buckets: [
          {
            label: "2026-06-20",
            periodStart: "2026-06-20T00:00:00.000Z",
            periodEnd: "2026-06-21T00:00:00.000Z",
            requestCount: 1,
            providerCallCount: 2,
            errorCount: 1,
          },
        ],
      },
      recentErrors: [
        {
          id: "01HY0000000000000000000000",
          occurredAt: "2026-06-20T00:00:00.000Z",
          surface: "provider",
          category: "temporary_unavailable",
          requestId: "01HY0000000000000000000001",
        },
      ],
      settingsWarnings: [
        {
          code: "configured_provider_access_unavailable",
          title: "Configured Provider Access is unavailable",
          severity: "warning",
        },
      ],
    });

    expect(parsed.usage.providerCallCount).toBe(7);
    expect(parsed.recentErrors[0]?.category).toBe("temporary_unavailable");
    expect(JSON.stringify(parsed)).not.toContain("promptBody");
    expect(JSON.stringify(parsed)).not.toContain("responseText");
  });
});
