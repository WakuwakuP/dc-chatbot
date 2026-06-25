import { describe, expect, it } from "vitest";
import {
  canManageOwnerSettings,
  canManageRegisteredMember,
  configuredProviderAccessStatusFromNvidiaNimApiKeyPresence,
  isConfiguredProviderAccessAvailable,
  providerKindLabel,
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

describe("Configured Provider Access", () => {
  it("treats available provider access as usable", () => {
    expect(
      isConfiguredProviderAccessAvailable({
        status: "available",
      }),
    ).toBe(true);
    expect(
      isConfiguredProviderAccessAvailable({
        status: "not_configured",
      }),
    ).toBe(false);
  });

  it("derives metadata-only status from NVIDIA NIM API Key presence", () => {
    expect(
      configuredProviderAccessStatusFromNvidiaNimApiKeyPresence(true),
    ).toBe("available");
    expect(
      configuredProviderAccessStatusFromNvidiaNimApiKeyPresence(false),
    ).toBe("not_configured");
  });

  it("labels provider kinds without credential assumptions", () => {
    expect(providerKindLabel("nvidia_nim")).toBe("NVIDIA NIM");
    expect(providerKindLabel("fake")).toBe("Fake local provider");
  });
});
