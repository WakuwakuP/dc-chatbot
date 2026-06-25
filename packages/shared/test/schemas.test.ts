import { describe, expect, it } from "vitest";
import {
  BotMessageIntakeRequestSchema,
  BotOwnerNotificationDeliveryListResponseSchema,
  BotOwnerNotificationDeliveryUpdateRequestSchema,
  OwnerSettingsResponseSchema,
  ProviderConfigMetadataSchema,
  SafeProviderErrorCategorySchema,
  UpdatePromptSettingsMetadataRequestSchema,
  parseJson,
} from "../src/index";

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
