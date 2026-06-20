import { describe, expect, it } from "vitest";
import {
  BotMessageIntakeRequestSchema,
  OwnerSettingsResponseSchema,
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
