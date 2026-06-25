import { describe, expect, it } from "vitest";
import {
  canManageOwnerSettings,
  canManageRegisteredMember,
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
