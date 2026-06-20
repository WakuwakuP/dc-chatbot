import { describe, expect, it } from "vitest";
import {
  canManageOwnerSettings,
  canManageRegisteredMember,
  resolveEffectiveChatGPTSubscriptionConnection,
} from "../src/index";

describe("owner role scope", () => {
  it("allows only Admin Owners to manage owner settings", () => {
    expect(
      canManageOwnerSettings({ ownerDiscordUserId: "1", role: "admin_owner" }),
    ).toBe(true);
    expect(
      canManageOwnerSettings({
        ownerDiscordUserId: "1",
        role: "regular_owner",
      }),
    ).toBe(false);
  });

  it("scopes Regular Owner member management to self-assigned members", () => {
    expect(
      canManageRegisteredMember(
        { ownerDiscordUserId: "1", role: "regular_owner" },
        "1",
      ),
    ).toBe(true);
    expect(
      canManageRegisteredMember(
        { ownerDiscordUserId: "1", role: "regular_owner" },
        "2",
      ),
    ).toBe(false);
  });
});

describe("Effective ChatGPT Subscription Connection", () => {
  it("prefers a usable direct connection over assigned Owner Discord User connection", () => {
    const resolution = resolveEffectiveChatGPTSubscriptionConnection({
      directConnection: {
        id: "direct",
        ownerDiscordUserId: "10",
        status: "active",
      },
      assignedOwnerConnection: {
        id: "owner",
        ownerDiscordUserId: "20",
        status: "active",
      },
    });

    expect(resolution.source).toBe("direct");
    expect(resolution.connection?.id).toBe("direct");
  });

  it("falls back to the assigned Owner Discord User connection", () => {
    const resolution = resolveEffectiveChatGPTSubscriptionConnection({
      directConnection: null,
      assignedOwnerConnection: {
        id: "owner",
        ownerDiscordUserId: "20",
        status: "active",
      },
    });

    expect(resolution.source).toBe("assigned_owner");
  });
});
